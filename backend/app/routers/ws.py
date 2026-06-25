import json
import uuid
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.conversation import Conversation, ConversationMember
from app.models.message import Message, MessageStatus
from app.models.reaction import Reaction
from app.utils.security import decode_access_token
from app.websocket_manager import manager

router = APIRouter()


async def authenticate_ws(token: str) -> User | None:
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()


async def get_conversation_member_ids(conversation_id: str, db: AsyncSession) -> list[str]:
    result = await db.execute(
        select(ConversationMember.user_id).where(
            ConversationMember.conversation_id == conversation_id
        )
    )
    return [r[0] for r in result.all()]


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    user = await authenticate_ws(token)
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await manager.connect(websocket, user.id)

    async with AsyncSessionLocal() as db:
        user_record = await db.execute(select(User).where(User.id == user.id))
        u = user_record.scalar_one_or_none()
        if u:
            u.is_online = True
            u.last_seen = datetime.utcnow()
            await db.commit()

    # Notify contacts that user is online
    async with AsyncSessionLocal() as db:
        member_convos = await db.execute(
            select(ConversationMember.conversation_id).where(
                ConversationMember.user_id == user.id
            )
        )
        convo_ids = [r[0] for r in member_convos.all()]
        notified = set()
        for cid in convo_ids:
            members = await get_conversation_member_ids(cid, db)
            for mid in members:
                if mid != user.id and mid not in notified:
                    notified.add(mid)
                    await manager.send_to_user(mid, "presence.changed", {
                        "user_id": user.id,
                        "is_online": True,
                        "last_seen": datetime.utcnow().isoformat(),
                    })

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await manager.send_to_user(user.id, "error", {"message": "Invalid JSON"})
                continue

            event = data.get("event")
            payload = data.get("data", {})

            if event == "message.send":
                await handle_message_send(user, payload)
            elif event == "message.read":
                await handle_message_read(user, payload)
            elif event == "typing.start":
                await handle_typing(user, payload, True)
            elif event == "typing.stop":
                await handle_typing(user, payload, False)
            elif event == "reaction.add":
                await handle_reaction_add(user, payload)
            elif event == "reaction.remove":
                await handle_reaction_remove(user, payload)
            elif event == "message.delete":
                await handle_message_delete(user, payload)

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket, user.id)

        if not manager.is_online(user.id):
            async with AsyncSessionLocal() as db:
                user_record = await db.execute(select(User).where(User.id == user.id))
                u = user_record.scalar_one_or_none()
                if u:
                    u.is_online = False
                    u.last_seen = datetime.utcnow()
                    await db.commit()

                member_convos = await db.execute(
                    select(ConversationMember.conversation_id).where(
                        ConversationMember.user_id == user.id
                    )
                )
                convo_ids = [r[0] for r in member_convos.all()]
                notified = set()
                for cid in convo_ids:
                    members = await get_conversation_member_ids(cid, db)
                    for mid in members:
                        if mid != user.id and mid not in notified:
                            notified.add(mid)
                            await manager.send_to_user(mid, "presence.changed", {
                                "user_id": user.id,
                                "is_online": False,
                                "last_seen": datetime.utcnow().isoformat(),
                            })


async def handle_message_send(user: User, payload: dict):
    conversation_id = payload.get("conversation_id")
    content = payload.get("content")
    msg_type = payload.get("type", "text")
    reply_to_id = payload.get("reply_to_id")
    client_id = payload.get("client_id")

    if not conversation_id:
        return

    async with AsyncSessionLocal() as db:
        member_check = await db.execute(
            select(ConversationMember).where(
                and_(
                    ConversationMember.conversation_id == conversation_id,
                    ConversationMember.user_id == user.id,
                )
            )
        )
        if not member_check.scalar_one_or_none():
            await manager.send_to_user(user.id, "error", {"message": "Not a member"})
            return

        conv_result = await db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        conv = conv_result.scalar_one_or_none()

        expires_at = None
        if conv and conv.disappearing_duration:
            from datetime import timedelta
            expires_at = datetime.utcnow() + timedelta(seconds=conv.disappearing_duration)

        msg = Message(
            id=uuid.uuid4().hex,
            conversation_id=conversation_id,
            sender_id=user.id,
            content=content,
            type=msg_type,
            reply_to_id=reply_to_id,
            expires_at=expires_at,
        )
        db.add(msg)

        member_ids = await get_conversation_member_ids(conversation_id, db)

        for mid in member_ids:
            if mid != user.id:
                status = MessageStatus(
                    id=uuid.uuid4().hex,
                    message_id=msg.id,
                    user_id=mid,
                    status="delivered" if manager.is_online(mid) else "sent",
                )
                db.add(status)

        if conv:
            conv.updated_at = datetime.utcnow()

        await db.commit()

        sender_result = await db.execute(select(User).where(User.id == user.id))
        sender = sender_result.scalar_one_or_none()

        msg_data = {
            "id": msg.id,
            "conversation_id": msg.conversation_id,
            "sender_id": msg.sender_id,
            "content": msg.content,
            "type": msg.type,
            "reply_to_id": msg.reply_to_id,
            "is_edited": False,
            "expires_at": msg.expires_at.isoformat() if msg.expires_at else None,
            "created_at": msg.created_at.isoformat(),
            "client_id": client_id,
            "sender": {
                "id": sender.id,
                "display_name": sender.display_name,
                "avatar_url": sender.avatar_url,
                "username": sender.username,
            } if sender else None,
        }

        await manager.send_to_user(user.id, "message.sent", {
            **msg_data,
            "status": "sent",
        })

        await manager.broadcast_to_conversation(
            member_ids, "message.new", msg_data, exclude_user=user.id
        )


async def handle_message_read(user: User, payload: dict):
    conversation_id = payload.get("conversation_id")
    message_id = payload.get("message_id")

    if not conversation_id or not message_id:
        return

    async with AsyncSessionLocal() as db:
        member = await db.execute(
            select(ConversationMember).where(
                and_(
                    ConversationMember.conversation_id == conversation_id,
                    ConversationMember.user_id == user.id,
                )
            )
        )
        member_record = member.scalar_one_or_none()
        if not member_record:
            return

        member_record.last_read_message_id = message_id
        member_record.last_read_at = datetime.utcnow()

        statuses = await db.execute(
            select(MessageStatus).where(
                and_(
                    MessageStatus.user_id == user.id,
                    MessageStatus.status != "read",
                )
            )
        )
        for s in statuses.scalars().all():
            msg_check = await db.execute(
                select(Message).where(
                    and_(
                        Message.id == s.message_id,
                        Message.conversation_id == conversation_id,
                    )
                )
            )
            if msg_check.scalar_one_or_none():
                s.status = "read"
                s.updated_at = datetime.utcnow()

        await db.commit()

        member_ids = await get_conversation_member_ids(conversation_id, db)
        await manager.broadcast_to_conversation(
            member_ids, "message.status", {
                "conversation_id": conversation_id,
                "message_id": message_id,
                "user_id": user.id,
                "status": "read",
            }, exclude_user=user.id
        )


async def handle_typing(user: User, payload: dict, is_typing: bool):
    conversation_id = payload.get("conversation_id")
    if not conversation_id:
        return

    async with AsyncSessionLocal() as db:
        member_ids = await get_conversation_member_ids(conversation_id, db)

    await manager.broadcast_to_conversation(
        member_ids, "typing.indicator", {
            "conversation_id": conversation_id,
            "user_id": user.id,
            "display_name": user.display_name,
            "is_typing": is_typing,
        }, exclude_user=user.id
    )


async def handle_reaction_add(user: User, payload: dict):
    message_id = payload.get("message_id")
    emoji = payload.get("emoji")

    if not message_id or not emoji:
        return

    async with AsyncSessionLocal() as db:
        msg_result = await db.execute(select(Message).where(Message.id == message_id))
        msg = msg_result.scalar_one_or_none()
        if not msg:
            return

        existing = await db.execute(
            select(Reaction).where(
                and_(
                    Reaction.message_id == message_id,
                    Reaction.user_id == user.id,
                    Reaction.emoji == emoji,
                )
            )
        )
        if existing.scalar_one_or_none():
            return

        reaction = Reaction(
            id=uuid.uuid4().hex,
            message_id=message_id,
            user_id=user.id,
            emoji=emoji,
        )
        db.add(reaction)
        await db.commit()

        member_ids = await get_conversation_member_ids(msg.conversation_id, db)
        await manager.broadcast_to_conversation(
            member_ids, "reaction.updated", {
                "message_id": message_id,
                "conversation_id": msg.conversation_id,
                "reaction": {
                    "id": reaction.id,
                    "user_id": user.id,
                    "emoji": emoji,
                    "created_at": reaction.created_at.isoformat(),
                },
                "action": "add",
            }
        )


async def handle_reaction_remove(user: User, payload: dict):
    message_id = payload.get("message_id")
    emoji = payload.get("emoji")

    if not message_id or not emoji:
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Reaction).where(
                and_(
                    Reaction.message_id == message_id,
                    Reaction.user_id == user.id,
                    Reaction.emoji == emoji,
                )
            )
        )
        reaction = result.scalar_one_or_none()
        if not reaction:
            return

        msg_result = await db.execute(select(Message).where(Message.id == message_id))
        msg = msg_result.scalar_one_or_none()

        await db.delete(reaction)
        await db.commit()

        if msg:
            member_ids = await get_conversation_member_ids(msg.conversation_id, db)
            await manager.broadcast_to_conversation(
                member_ids, "reaction.updated", {
                    "message_id": message_id,
                    "conversation_id": msg.conversation_id,
                    "reaction": {
                        "id": reaction.id,
                        "user_id": user.id,
                        "emoji": emoji,
                    },
                    "action": "remove",
                }
            )


async def handle_message_delete(user: User, payload: dict):
    message_id = payload.get("message_id")
    if not message_id:
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Message).where(
                and_(Message.id == message_id, Message.sender_id == user.id)
            )
        )
        msg = result.scalar_one_or_none()
        if not msg:
            return

        conversation_id = msg.conversation_id
        await db.delete(msg)
        await db.commit()

        member_ids = await get_conversation_member_ids(conversation_id, db)
        await manager.broadcast_to_conversation(
            member_ids, "message.deleted", {
                "message_id": message_id,
                "conversation_id": conversation_id,
            }
        )
