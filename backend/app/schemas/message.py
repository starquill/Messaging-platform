from datetime import datetime
from pydantic import BaseModel

from app.schemas.user import UserResponse


class SendMessageRequest(BaseModel):
    content: str | None = None
    type: str = "text"
    reply_to_id: str | None = None


class EditMessageRequest(BaseModel):
    content: str


class ReactionRequest(BaseModel):
    emoji: str


class AttachmentResponse(BaseModel):
    id: str
    message_id: str
    filename: str
    url: str
    content_type: str
    size: int
    created_at: datetime

    class Config:
        from_attributes = True


class ReactionResponse(BaseModel):
    id: str
    message_id: str
    user_id: str
    emoji: str
    created_at: datetime

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    content: str | None
    type: str
    reply_to_id: str | None
    is_edited: bool
    expires_at: datetime | None
    created_at: datetime
    sender: UserResponse | None = None
    reply_to: "MessageResponse | None" = None
    reactions: list[ReactionResponse] = []
    attachments: list[AttachmentResponse] = []
    status: str | None = None

    class Config:
        from_attributes = True


class MessageListResponse(BaseModel):
    messages: list[MessageResponse]
    has_more: bool
    next_cursor: str | None = None


class MarkReadRequest(BaseModel):
    message_id: str


MessageResponse.model_rebuild()
