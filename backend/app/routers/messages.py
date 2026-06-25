import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.conversation import Conversation, ConversationMember
from app.models.message import Message, MessageStatus
from app.models.reaction import Reaction
from app.models.attachment import Attachment
from app.schemas.message import (
    SendMessageRequest,
    EditMessageRequest,
    MessageResponse,
    MessageListResponse,
    ReactionRequest,
    ReactionResponse,
    AttachmentResponse,
    MarkReadRequest,
)
from app.schemas.user import UserResponse

router = APIRouter(prefix="/api/conversations/{conversation_id}/messages", tags=["messages"])


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


async def verify_membership(conversation_id: str, user_id: str, db: AsyncSession) -> ConversationMember:
    result = await db.execute(
        select(ConversationMember).where(
            and_(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
            )
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")
    return member


async def build_message_response(msg: Message, db: AsyncSession) -> MessageResponse:
    sender_result = await db.execute(select(User).where(User.id == msg.sender_id))
    sender = sender_result.scalar_one_or_none()

    reactions_result = await db.execute(
        select(Reaction).where(Reaction.message_id == msg.id)
    )
    reactions = [
        ReactionResponse(
            id=r.id,
            message_id=r.message_id,
            user_id=r.user_id,
            emoji=r.emoji,
            created_at=r.created_at,
        )
        for r in reactions_result.scalars().all()
    ]

    attachments_result = await db.execute(
        select(Attachment).where(Attachment.message_id == msg.id)
    )
    attachments = [
        AttachmentResponse(
            id=a.id,
            message_id=a.message_id,
            filename=a.filename,
            url=a.url,
            content_type=a.content_type,
            size=a.size,
            created_at=a.created_at,
        )
        for a in attachments_result.scalars().all()
    ]

    reply_to = None
    if msg.reply_to_id:
        reply_result = await db.execute(
            select(Message).where(Message.id == msg.reply_to_id)
        )
        reply_msg = reply_result.scalar_one_or_none()
        if reply_msg:
            reply_sender_result = await db.execute(
                select(User).where(User.id == reply_msg.sender_id)
            )
            reply_sender = reply_sender_result.scalar_one_or_none()
            reply_to = MessageResponse(
                id=reply_msg.id,
                conversation_id=reply_msg.conversation_id,
                sender_id=reply_msg.sender_id,
                content=reply_msg.content,
                type=reply_msg.type,
                reply_to_id=None,
                is_edited=reply_msg.is_edited,
                expires_at=reply_msg.expires_at,
                created_at=reply_msg.created_at,
                sender=user_to_response(reply_sender) if reply_sender else None,
                reactions=[],
                attachments=[],
            )

    statuses_result = await db.execute(
        select(MessageStatus).where(MessageStatus.message_id == msg.id)
    )
    statuses = statuses_result.scalars().all()
    worst_status = "sent"
    if statuses:
        all_read = all(s.status == "read" for s in statuses)
        all_delivered = all(s.status in ("delivered", "read") for s in statuses)
        if all_read:
            worst_status = "read"
        elif all_delivered:
            worst_status = "delivered"

    return MessageResponse(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        content=msg.content,
        type=msg.type,
        reply_to_id=msg.reply_to_id,
        is_edited=msg.is_edited,
        expires_at=msg.expires_at,
        created_at=msg.created_at,
        sender=user_to_response(sender) if sender else None,
        reply_to=reply_to,
        reactions=reactions,
        attachments=attachments,
        status=worst_status,
    )


@router.get("", response_model=MessageListResponse)
async def list_messages(
    conversation_id: str,
    cursor: str | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_membership(conversation_id, current_user.id, db)

    query = select(Message).where(Message.conversation_id == conversation_id)

    if cursor:
        cursor_msg_result = await db.execute(
            select(Message).where(Message.id == cursor)
        )
        cursor_msg = cursor_msg_result.scalar_one_or_none()
        if cursor_msg:
            query = query.where(Message.created_at < cursor_msg.created_at)

    query = query.order_by(desc(Message.created_at)).limit(limit + 1)
    result = await db.execute(query)
    messages = result.scalars().all()

    has_more = len(messages) > limit
    if has_more:
        messages = messages[:limit]

    message_responses = []
    for msg in messages:
        message_responses.append(await build_message_response(msg, db))

    next_cursor = messages[-1].id if has_more and messages else None

    return MessageListResponse(
        messages=list(reversed(message_responses)),
        has_more=has_more,
        next_cursor=next_cursor,
    )


@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: str,
    request: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_membership(conversation_id, current_user.id, db)

    conv_result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conv = conv_result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    expires_at = None
    if conv.disappearing_duration:
        from datetime import timedelta
        expires_at = datetime.utcnow() + timedelta(seconds=conv.disappearing_duration)

    msg = Message(
        id=uuid.uuid4().hex,
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=request.content,
        type=request.type,
        reply_to_id=request.reply_to_id,
        expires_at=expires_at,
    )
    db.add(msg)

    members_result = await db.execute(
        select(ConversationMember).where(
            and_(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id != current_user.id,
            )
        )
    )
    for member in members_result.scalars().all():
        msg_status = MessageStatus(
            id=uuid.uuid4().hex,
            message_id=msg.id,
            user_id=member.user_id,
            status="sent",
        )
        db.add(msg_status)

    conv.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(msg)

    return await build_message_response(msg, db)


@router.patch("/{message_id}", response_model=MessageResponse)
async def edit_message(
    conversation_id: str,
    message_id: str,
    request: EditMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_membership(conversation_id, current_user.id, db)

    result = await db.execute(
        select(Message).where(
            and_(Message.id == message_id, Message.conversation_id == conversation_id)
        )
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only edit your own messages")

    msg.content = request.content
    msg.is_edited = True
    await db.commit()

    return await build_message_response(msg, db)


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    conversation_id: str,
    message_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_membership(conversation_id, current_user.id, db)

    result = await db.execute(
        select(Message).where(
            and_(Message.id == message_id, Message.conversation_id == conversation_id)
        )
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only delete your own messages")

    await db.delete(msg)
    await db.commit()


@router.post("/{message_id}/reactions", response_model=ReactionResponse, status_code=status.HTTP_201_CREATED)
async def add_reaction(
    conversation_id: str,
    message_id: str,
    request: ReactionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_membership(conversation_id, current_user.id, db)

    msg_result = await db.execute(
        select(Message).where(
            and_(Message.id == message_id, Message.conversation_id == conversation_id)
        )
    )
    if not msg_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Message not found")

    existing = await db.execute(
        select(Reaction).where(
            and_(
                Reaction.message_id == message_id,
                Reaction.user_id == current_user.id,
                Reaction.emoji == request.emoji,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Reaction already exists")

    reaction = Reaction(
        id=uuid.uuid4().hex,
        message_id=message_id,
        user_id=current_user.id,
        emoji=request.emoji,
    )
    db.add(reaction)
    await db.commit()

    return ReactionResponse(
        id=reaction.id,
        message_id=reaction.message_id,
        user_id=reaction.user_id,
        emoji=reaction.emoji,
        created_at=reaction.created_at,
    )


@router.delete("/{message_id}/reactions/{emoji}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_reaction(
    conversation_id: str,
    message_id: str,
    emoji: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_membership(conversation_id, current_user.id, db)

    result = await db.execute(
        select(Reaction).where(
            and_(
                Reaction.message_id == message_id,
                Reaction.user_id == current_user.id,
                Reaction.emoji == emoji,
            )
        )
    )
    reaction = result.scalar_one_or_none()
    if not reaction:
        raise HTTPException(status_code=404, detail="Reaction not found")

    await db.delete(reaction)
    await db.commit()


@router.get("/search", response_model=MessageListResponse)
async def search_messages(
    conversation_id: str,
    q: str = Query("", min_length=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_membership(conversation_id, current_user.id, db)

    result = await db.execute(
        select(Message)
        .where(
            Message.conversation_id == conversation_id,
            Message.content.ilike(f"%{q}%"),
            Message.type != "system",
        )
        .order_by(desc(Message.created_at))
        .limit(limit)
    )
    messages = result.scalars().all()

    message_responses = []
    for msg in messages:
        message_responses.append(await build_message_response(msg, db))

    return MessageListResponse(
        messages=list(reversed(message_responses)),
        has_more=False,
        next_cursor=None,
    )


@router.post("/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_messages_read(
    conversation_id: str,
    request: MarkReadRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    member = await verify_membership(conversation_id, current_user.id, db)

    member.last_read_message_id = request.message_id
    member.last_read_at = datetime.utcnow()

    statuses_result = await db.execute(
        select(MessageStatus).where(
            and_(
                MessageStatus.user_id == current_user.id,
                MessageStatus.status != "read",
            )
        )
    )
    for msg_status in statuses_result.scalars().all():
        msg_result = await db.execute(
            select(Message).where(
                and_(
                    Message.id == msg_status.message_id,
                    Message.conversation_id == conversation_id,
                )
            )
        )
        if msg_result.scalar_one_or_none():
            msg_status.status = "read"
            msg_status.updated_at = datetime.utcnow()

    await db.commit()
