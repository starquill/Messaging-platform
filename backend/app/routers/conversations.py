import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.conversation import Conversation, ConversationMember
from app.models.message import Message, MessageStatus
from app.schemas.conversation import (
    CreateConversationRequest,
    ConversationResponse,
    ConversationMemberResponse,
    MessageBrief,
    UpdateConversationRequest,
)
from app.schemas.user import UserResponse

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


def user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        phone=user.phone,
        username=user.username,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        status_text=user.status_text,
        is_online=user.is_online,
        last_seen=user.last_seen,
        created_at=user.created_at,
    )


@router.get("", response_model=list[ConversationResponse])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    member_q = select(ConversationMember.conversation_id).where(
        ConversationMember.user_id == current_user.id
    )
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id.in_(member_q))
        .order_by(desc(Conversation.updated_at))
    )
    conversations = result.scalars().all()

    response = []
    for conv in conversations:
        members_result = await db.execute(
            select(ConversationMember).where(
                ConversationMember.conversation_id == conv.id
            )
        )
        members = members_result.scalars().all()

        member_responses = []
        other_user = None
        current_member = None
        for m in members:
            user_result = await db.execute(select(User).where(User.id == m.user_id))
            u = user_result.scalar_one_or_none()
            member_responses.append(
                ConversationMemberResponse(
                    id=m.id,
                    conversation_id=m.conversation_id,
                    user_id=m.user_id,
                    role=m.role,
                    joined_at=m.joined_at,
                    last_read_message_id=m.last_read_message_id,
                    last_read_at=m.last_read_at,
                    user=user_to_response(u) if u else None,
                )
            )
            if m.user_id == current_user.id:
                current_member = m
            elif conv.type == "direct" and u:
                other_user = user_to_response(u)

        last_msg_result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(desc(Message.created_at))
            .limit(1)
        )
        last_msg = last_msg_result.scalar_one_or_none()
        last_message = None
        if last_msg:
            last_message = MessageBrief(
                id=last_msg.id,
                sender_id=last_msg.sender_id,
                content=last_msg.content,
                type=last_msg.type,
                created_at=last_msg.created_at,
            )

        unread_count = 0
        if current_member and current_member.last_read_at:
            unread_result = await db.execute(
                select(func.count(Message.id)).where(
                    and_(
                        Message.conversation_id == conv.id,
                        Message.created_at > current_member.last_read_at,
                        Message.sender_id != current_user.id,
                    )
                )
            )
            unread_count = unread_result.scalar() or 0
        elif current_member:
            unread_result = await db.execute(
                select(func.count(Message.id)).where(
                    and_(
                        Message.conversation_id == conv.id,
                        Message.sender_id != current_user.id,
                    )
                )
            )
            unread_count = unread_result.scalar() or 0

        response.append(
            ConversationResponse(
                id=conv.id,
                type=conv.type,
                name=conv.name,
                avatar_url=conv.avatar_url,
                created_by=conv.created_by,
                disappearing_duration=conv.disappearing_duration,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
                members=member_responses,
                last_message=last_message,
                unread_count=unread_count,
                other_user=other_user,
            )
        )

    return response


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    request: CreateConversationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if request.type not in ("direct", "group"):
        raise HTTPException(status_code=400, detail="Type must be 'direct' or 'group'")

    if request.type == "direct":
        if len(request.member_ids) != 1:
            raise HTTPException(status_code=400, detail="Direct conversation requires exactly one other member")
        other_id = request.member_ids[0]
        existing = await db.execute(
            select(Conversation)
            .join(ConversationMember, ConversationMember.conversation_id == Conversation.id)
            .where(
                and_(
                    Conversation.type == "direct",
                    ConversationMember.user_id == current_user.id,
                )
            )
        )
        existing_convs = existing.scalars().all()
        for conv in existing_convs:
            members_result = await db.execute(
                select(ConversationMember.user_id).where(
                    ConversationMember.conversation_id == conv.id
                )
            )
            member_ids = [r[0] for r in members_result.all()]
            if other_id in member_ids:
                return await get_conversation(conv.id, current_user, db)

    conv = Conversation(
        id=uuid.uuid4().hex,
        type=request.type,
        name=request.name if request.type == "group" else None,
        created_by=current_user.id,
    )
    db.add(conv)

    creator_member = ConversationMember(
        id=uuid.uuid4().hex,
        conversation_id=conv.id,
        user_id=current_user.id,
        role="admin",
    )
    db.add(creator_member)

    for member_id in request.member_ids:
        if member_id == current_user.id:
            continue
        user_result = await db.execute(select(User).where(User.id == member_id))
        if not user_result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"User {member_id} not found")
        member = ConversationMember(
            id=uuid.uuid4().hex,
            conversation_id=conv.id,
            user_id=member_id,
            role="member",
        )
        db.add(member)

    if request.type == "group":
        system_msg = Message(
            id=uuid.uuid4().hex,
            conversation_id=conv.id,
            sender_id=current_user.id,
            content=f"{current_user.display_name} created the group",
            type="system",
        )
        db.add(system_msg)

    await db.commit()
    return await get_conversation(conv.id, current_user, db)


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    member_check = await db.execute(
        select(ConversationMember).where(
            and_(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == current_user.id,
            )
        )
    )
    current_member = member_check.scalar_one_or_none()
    if not current_member:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")

    members_result = await db.execute(
        select(ConversationMember).where(
            ConversationMember.conversation_id == conversation_id
        )
    )
    members = members_result.scalars().all()

    member_responses = []
    other_user = None
    for m in members:
        user_result = await db.execute(select(User).where(User.id == m.user_id))
        u = user_result.scalar_one_or_none()
        member_responses.append(
            ConversationMemberResponse(
                id=m.id,
                conversation_id=m.conversation_id,
                user_id=m.user_id,
                role=m.role,
                joined_at=m.joined_at,
                last_read_message_id=m.last_read_message_id,
                last_read_at=m.last_read_at,
                user=user_to_response(u) if u else None,
            )
        )
        if conv.type == "direct" and m.user_id != current_user.id and u:
            other_user = user_to_response(u)

    last_msg_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conv.id)
        .order_by(desc(Message.created_at))
        .limit(1)
    )
    last_msg = last_msg_result.scalar_one_or_none()
    last_message = None
    if last_msg:
        last_message = MessageBrief(
            id=last_msg.id,
            sender_id=last_msg.sender_id,
            content=last_msg.content,
            type=last_msg.type,
            created_at=last_msg.created_at,
        )

    unread_count = 0
    if current_member.last_read_at:
        unread_result = await db.execute(
            select(func.count(Message.id)).where(
                and_(
                    Message.conversation_id == conv.id,
                    Message.created_at > current_member.last_read_at,
                    Message.sender_id != current_user.id,
                )
            )
        )
        unread_count = unread_result.scalar() or 0
    else:
        unread_result = await db.execute(
            select(func.count(Message.id)).where(
                and_(
                    Message.conversation_id == conv.id,
                    Message.sender_id != current_user.id,
                )
            )
        )
        unread_count = unread_result.scalar() or 0

    return ConversationResponse(
        id=conv.id,
        type=conv.type,
        name=conv.name,
        avatar_url=conv.avatar_url,
        created_by=conv.created_by,
        disappearing_duration=conv.disappearing_duration,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        members=member_responses,
        last_message=last_message,
        unread_count=unread_count,
        other_user=other_user,
    )


@router.patch("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: str,
    request: UpdateConversationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    member_check = await db.execute(
        select(ConversationMember).where(
            and_(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == current_user.id,
            )
        )
    )
    member = member_check.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member")

    if conv.type == "group" and member.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update group settings")

    if request.name is not None:
        conv.name = request.name
    if request.avatar_url is not None:
        conv.avatar_url = request.avatar_url
    if request.disappearing_duration is not None:
        conv.disappearing_duration = request.disappearing_duration

    conv.updated_at = datetime.utcnow()
    await db.commit()
    return await get_conversation(conversation_id, current_user, db)


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    member_check = await db.execute(
        select(ConversationMember).where(
            and_(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == current_user.id,
            )
        )
    )
    member = member_check.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member")

    await db.delete(member)
    await db.commit()
