from datetime import datetime
from pydantic import BaseModel

from app.schemas.user import UserResponse


class CreateConversationRequest(BaseModel):
    type: str  # 'direct' or 'group'
    name: str | None = None
    member_ids: list[str]


class ConversationMemberResponse(BaseModel):
    id: str
    conversation_id: str
    user_id: str
    role: str
    joined_at: datetime
    last_read_message_id: str | None
    last_read_at: datetime | None
    user: UserResponse | None = None

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    id: str
    type: str
    name: str | None
    avatar_url: str | None
    created_by: str | None
    disappearing_duration: int | None
    created_at: datetime
    updated_at: datetime
    members: list[ConversationMemberResponse] = []
    last_message: "MessageBrief | None" = None
    unread_count: int = 0
    other_user: UserResponse | None = None

    class Config:
        from_attributes = True


class MessageBrief(BaseModel):
    id: str
    sender_id: str
    content: str | None
    type: str
    created_at: datetime

    class Config:
        from_attributes = True


class UpdateConversationRequest(BaseModel):
    name: str | None = None
    avatar_url: str | None = None
    disappearing_duration: int | None = None


ConversationResponse.model_rebuild()
