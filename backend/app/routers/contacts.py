import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.contact import Contact
from app.schemas.user import UserResponse

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


class ContactResponse:
    pass


from pydantic import BaseModel


class ContactCreate(BaseModel):
    contact_id: str
    nickname: str | None = None


class ContactUpdate(BaseModel):
    nickname: str | None = None
    is_blocked: bool | None = None


class ContactResponseModel(BaseModel):
    id: str
    user_id: str
    contact_id: str
    nickname: str | None
    is_blocked: bool
    created_at: str
    contact: UserResponse | None = None

    class Config:
        from_attributes = True


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


@router.get("", response_model=list[ContactResponseModel])
async def list_contacts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Contact).where(Contact.user_id == current_user.id)
    )
    contacts = result.scalars().all()

    response = []
    for c in contacts:
        user_result = await db.execute(select(User).where(User.id == c.contact_id))
        contact_user = user_result.scalar_one_or_none()
        response.append(
            ContactResponseModel(
                id=c.id,
                user_id=c.user_id,
                contact_id=c.contact_id,
                nickname=c.nickname,
                is_blocked=c.is_blocked,
                created_at=c.created_at.isoformat(),
                contact=user_to_response(contact_user) if contact_user else None,
            )
        )

    return response


@router.post("", response_model=ContactResponseModel, status_code=status.HTTP_201_CREATED)
async def add_contact(
    request: ContactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if request.contact_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself as a contact")

    user_result = await db.execute(select(User).where(User.id == request.contact_id))
    contact_user = user_result.scalar_one_or_none()
    if not contact_user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = await db.execute(
        select(Contact).where(
            and_(
                Contact.user_id == current_user.id,
                Contact.contact_id == request.contact_id,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Contact already exists")

    contact = Contact(
        id=uuid.uuid4().hex,
        user_id=current_user.id,
        contact_id=request.contact_id,
        nickname=request.nickname,
    )
    db.add(contact)
    await db.commit()

    return ContactResponseModel(
        id=contact.id,
        user_id=contact.user_id,
        contact_id=contact.contact_id,
        nickname=contact.nickname,
        is_blocked=contact.is_blocked,
        created_at=contact.created_at.isoformat(),
        contact=user_to_response(contact_user),
    )


@router.patch("/{contact_id}", response_model=ContactResponseModel)
async def update_contact(
    contact_id: str,
    request: ContactUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Contact).where(
            and_(Contact.id == contact_id, Contact.user_id == current_user.id)
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    if request.nickname is not None:
        contact.nickname = request.nickname
    if request.is_blocked is not None:
        contact.is_blocked = request.is_blocked

    await db.commit()

    user_result = await db.execute(select(User).where(User.id == contact.contact_id))
    contact_user = user_result.scalar_one_or_none()

    return ContactResponseModel(
        id=contact.id,
        user_id=contact.user_id,
        contact_id=contact.contact_id,
        nickname=contact.nickname,
        is_blocked=contact.is_blocked,
        created_at=contact.created_at.isoformat(),
        contact=user_to_response(contact_user) if contact_user else None,
    )


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Contact).where(
            and_(Contact.id == contact_id, Contact.user_id == current_user.id)
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    await db.delete(contact)
    await db.commit()
