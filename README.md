# Signal Clone — Secure Messaging Platform

A full-stack real-time messaging application that replicates Signal's design and core functionality.

## Tech Stack

- **Frontend**: Next.js 16 (App Router, TypeScript, Tailwind CSS v4, Zustand)
- **Backend**: Python FastAPI (async, SQLAlchemy, aiosqlite)
- **Database**: SQLite with WAL mode
- **Real-time**: WebSocket (multiplexed events)
- **Deployment**: Render (Docker)

## Features

- Phone + OTP authentication (mocked with code `123456`)
- 1:1 and group conversations
- Real-time messaging with WebSocket
- Message status tracking (sent → delivered → read)
- Typing indicators
- Online presence
- File attachments (images + files, drag-and-drop)
- Emoji reactions
- Reply-to messages
- Disappearing messages (configurable timer)
- Contact management
- Group management (add/remove members, role changes)
- Dark mode
- Responsive design (mobile + desktop)
- Message search
- Keyboard shortcuts (Ctrl+N new chat, Escape close)

## Architecture

```
frontend/          Next.js App Router + Tailwind + Zustand
    ↕              REST API + WebSocket
backend/           FastAPI + async SQLAlchemy
    ↕              SQLite (WAL mode)
data/signal.db     Persistent storage
uploads/           Avatars + attachments
```

## Database Schema

9 tables: `users`, `refresh_tokens`, `contacts`, `conversations`, `conversation_members`, `messages`, `message_status`, `reactions`, `attachments`

## API Endpoints (32 total)

| Group         | Count | Endpoints                                    |
|---------------|-------|----------------------------------------------|
| Auth          | 5     | register, verify-otp, login, refresh, logout |
| Users         | 5     | me, update, avatar, search, get by id        |
| Contacts      | 4     | list, add, update, delete                    |
| Conversations | 9     | list, create, get, update, delete, members+  |
| Messages      | 8     | list, send, edit, delete, reactions+, search |
| Attachments   | 1     | upload                                       |
| WebSocket     | 1     | /ws (multiplexed events)                     |

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Seed demo data (optional)
python -m app.seed.seed_data

# Start server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at http://localhost:3000

### Demo Accounts (after seeding)

All accounts use password `password123`:

| Username | Name             |
|----------|------------------|
| alice    | Alice Johnson    |
| bob      | Bob Smith        |
| charlie  | Charlie Davis    |
| diana    | Diana Wilson     |
| evan     | Evan Brown       |
| fiona    | Fiona Garcia     |
| george   | George Martinez  |
| hannah   | Hannah Lee       |

## Deploy to Render

1. Push this repo to GitHub
2. Create a new Blueprint on Render
3. Connect your repo and select `render.yaml`
4. Deploy

The blueprint provisions:
- Backend web service with persistent disk for SQLite
- Frontend web service with environment variables

## WebSocket Protocol

Connect: `ws://host/ws?token=<jwt>`

Events (client → server): `message.send`, `message.read`, `message.delete`, `typing.start`, `typing.stop`, `reaction.add`, `reaction.remove`

Events (server → client): `message.new`, `message.sent`, `message.status`, `message.deleted`, `typing.indicator`, `presence.changed`, `reaction.updated`

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── routers/         # API endpoints
│   │   ├── schemas/         # Pydantic request/response models
│   │   ├── seed/            # Demo data seeder
│   │   ├── utils/           # JWT, password hashing
│   │   ├── config.py        # Settings
│   │   ├── database.py      # Async engine + session
│   │   ├── main.py          # FastAPI app
│   │   └── websocket_manager.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js pages
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # API client, utils
│   │   ├── stores/          # Zustand stores
│   │   └── types/           # TypeScript types
│   ├── Dockerfile
│   └── package.json
├── render.yaml              # Render deployment blueprint
└── README.md
```
