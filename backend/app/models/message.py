import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, Boolean, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    conversation_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    sender_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[str] = mapped_column(String(10), default="text")  # 'text', 'image', 'file', 'system'
    reply_to_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_edited: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MessageStatus(Base):
    __tablename__ = "message_status"
    __table_args__ = (UniqueConstraint("message_id", "user_id"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    message_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(10), default="sent")  # 'sent', 'delivered', 'read'
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
