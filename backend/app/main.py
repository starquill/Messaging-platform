import os
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, and_

from app.config import settings
from app.database import init_db, AsyncSessionLocal
from app.models.message import Message
from app.routers import auth, users, conversations, messages, contacts, ws
from app.routers import attachments


async def cleanup_expired_messages():
    while True:
        await asyncio.sleep(30)
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(Message).where(
                        and_(
                            Message.expires_at.isnot(None),
                            Message.expires_at <= datetime.utcnow(),
                        )
                    )
                )
                expired = result.scalars().all()
                for msg in expired:
                    await db.delete(msg)
                if expired:
                    await db.commit()
        except Exception:
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs("data", exist_ok=True)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "avatars"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "attachments"), exist_ok=True)
    await init_db()
    task = asyncio.create_task(cleanup_expired_messages())
    yield
    task.cancel()


app = FastAPI(
    title="Signal Clone API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(conversations.router)
app.include_router(messages.router)
app.include_router(contacts.router)
app.include_router(attachments.router)
app.include_router(ws.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
