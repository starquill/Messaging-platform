from datetime import datetime

from pydantic import BaseModel, Field


class UserResponse(BaseModel):
    id: str
    phone: str
    username: str
    display_name: str
    avatar_url: str | None
    status_text: str
    is_online: bool
    last_seen: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    display_name: str | None = Field(None, min_length=1, max_length=100)
    status_text: str | None = Field(None, max_length=200)


class UserSearchResponse(BaseModel):
    users: list[UserResponse]
