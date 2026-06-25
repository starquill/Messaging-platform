import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.conversation import ConversationMember
from app.models.message import Message
from app.models.attachment import Attachment
from app.config import settings
from app.schemas.message import AttachmentResponse

router = APIRouter(prefix="/api/attachments", tags=["attachments"])

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB


@router.post("", response_model=AttachmentResponse, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    file: UploadFile = File(...),
    message_id: str = Form(...),
    conversation_id: str = Form(...),
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
    if not member_check.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this conversation")

    msg_check = await db.execute(
        select(Message).where(
            and_(
                Message.id == message_id,
                Message.conversation_id == conversation_id,
                Message.sender_id == current_user.id,
            )
        )
    )
    if not msg_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Message not found")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 25MB)")

    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "bin"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, "attachments", filename)

    with open(filepath, "wb") as f:
        f.write(content)

    content_type = file.content_type or "application/octet-stream"

    attachment = Attachment(
        id=uuid.uuid4().hex,
        message_id=message_id,
        filename=file.filename or filename,
        url=f"/uploads/attachments/{filename}",
        content_type=content_type,
        size=len(content),
    )
    db.add(attachment)
    await db.commit()

    return AttachmentResponse(
        id=attachment.id,
        message_id=attachment.message_id,
        filename=attachment.filename,
        url=attachment.url,
        content_type=attachment.content_type,
        size=attachment.size,
        created_at=attachment.created_at,
    )
