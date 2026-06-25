# Signal Clone - Implementation Plan

## Context

Build a full-stack Signal messaging clone for an SDE Fullstack assignment. The app replicates Signal's design, UX, and core messaging workflows. Users can register, manage contacts, create 1:1 and group conversations, and send/receive messages in real time — all within Signal's clean, privacy-focused interface.

**Stack**: Next.js (TypeScript) + FastAPI (Python) + SQLite + WebSockets  
**Deployment**: Render (both frontend and backend)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                            │
│         Next.js (App Router, TypeScript, Tailwind)       │
│              State: Zustand | Real-time: WS              │
└────────────────────────┬────────────────────────────────┘
                         │ REST API + WebSocket
┌────────────────────────┴────────────────────────────────┐
│                      Backend                             │
│           FastAPI (Python, async, SQLAlchemy)            │
│        WebSocketManager | JWT Auth | File Upload         │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│                     Database                             │
│          SQLite (WAL mode, persistent disk)              │
│    9 tables | Indexes | Foreign keys | Constraints       │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation

#### Step 1.1: Backend Project Scaffolding ✅
- FastAPI app with CORS, lifespan events, health check
- SQLAlchemy async + aiosqlite engine/session setup
- All ORM models (9 tables)
- Config management (Pydantic Settings, .env)
- Directory structure: `backend/app/{models,schemas,routers,services,utils,seed}`

#### Step 1.2: Backend Auth & User Endpoints
- JWT utilities (access token 15min, refresh token 7d)
- Auth endpoints: `POST /api/auth/register`, `POST /api/auth/verify-otp`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`
- User endpoints: `GET /api/users/me`, `PATCH /api/users/me`, `POST /api/users/me/avatar`, `GET /api/users/search`, `GET /api/users/{id}`
- Mocked OTP verification (accepts "123456")
- Password hashing with bcrypt

#### Step 1.3: Frontend Project Scaffolding
- Next.js with App Router, TypeScript, Tailwind CSS
- Signal color palette as CSS custom properties
- Tailwind config with Signal design tokens
- API client (fetch wrapper with JWT auto-refresh interceptor)
- Route protection middleware
- Base layout and typography

#### Step 1.4: Frontend Auth Pages
- Login page (phone/username + password)
- Register page (phone, username, password)
- OTP verification page (6-digit code input)
- Onboarding page (display name + avatar upload)
- Auth store (Zustand) with persistence
- Redirect logic (auth → main, unauth → login)

---

### Phase 2: Core Messaging

#### Step 2.1: Backend Conversations & Messages API
- `GET /api/conversations` — list sorted by last activity
- `POST /api/conversations` — create direct or group
- `GET /api/conversations/{id}` — get details
- `GET /api/conversations/{id}/messages` — paginated (cursor-based)
- `POST /api/conversations/{id}/messages` — send (REST fallback)
- `PATCH /api/messages/{id}` — edit message
- `DELETE /api/messages/{id}` — delete message
- `POST /api/conversations/{id}/read` — mark as read

#### Step 2.2: Backend WebSocket Layer
- WebSocket endpoint: `ws://<host>/ws?token=<jwt>`
- WebSocketManager singleton (connection tracking, routing)
- Client→Server events: `message.send`, `message.read`, `typing.start`, `typing.stop`
- Server→Client events: `message.new`, `message.status`, `typing.indicator`
- Message flow: receive → persist to DB → broadcast to conversation members
- Message status tracking: sent → delivered → read
- Presence updates on connect/disconnect

#### Step 2.3: Frontend Sidebar & Conversation List
- Authenticated layout: sidebar (320px) + main chat pane
- SidebarHeader (user avatar, app name, action buttons)
- ConversationList (sorted by last activity)
- ConversationItem (avatar, name, last message preview, timestamp, unread badge)
- Conversation store (Zustand)
- Search/filter conversations

#### Step 2.4: Frontend Chat View
- ChatView layout (header + messages + input)
- ChatHeader (avatar, name, online status, actions)
- MessageList (scrollable, auto-scroll to bottom)
- MessageBubble (sent: blue, received: white, timestamps)
- MessageInput (auto-resize textarea, send button)
- WebSocket hook (connect, reconnect, event dispatch)
- Optimistic message sending (instant "sending" → "sent" on ack)
- Message status icons (single ✓ → double ✓✓ → blue ✓✓)
- Typing indicator (animated dots, debounced)

---

### Phase 3: Group Chat + Contacts

#### Step 3.1: Backend Group Management
- Group creation with name, avatar, multiple members
- Member management: add/remove members (admin only)
- Role changes: promote/demote (admin only)
- System messages ("Alice added Bob", "Charlie left the group")
- `GET /api/conversations/{id}/members`
- `POST /api/conversations/{id}/members`
- `DELETE /api/conversations/{id}/members/{uid}`
- `PATCH /api/conversations/{id}/members/{uid}`

#### Step 3.2: Backend Contacts API
- `GET /api/contacts` — list user's contacts
- `POST /api/contacts` — add a contact (by username/phone)
- `PATCH /api/contacts/{id}` — update (nickname, block)
- `DELETE /api/contacts/{id}` — remove contact

#### Step 3.3: Frontend Group UI
- CreateGroupModal (name input, avatar upload, member selection with search)
- GroupInfoPanel (slide-out drawer: group name, avatar, member list, settings)
- MemberList (role badges, admin actions)
- AddMembersModal (search users, multi-select)
- Leave group / delete group actions

#### Step 3.4: Frontend Contacts & New Chat UI
- ContactList view (all contacts with online indicators)
- AddContactModal (search by username/phone, send request)
- NewChatModal (select contact → start 1:1 conversation)
- Unread count badges in sidebar
- Online/last-seen indicators

---

### Phase 4: Rich Features

#### Step 4.1: Backend File Upload & Attachments
- `POST /api/attachments/upload` — multipart file upload
- `GET /api/attachments/{id}` — download/serve file
- Store files locally in `uploads/attachments/`
- Avatar upload for users and groups
- Link attachments to messages
- File size limits and type validation

#### Step 4.2: Backend Reactions, Reply-to, Disappearing Messages
- `POST /api/messages/{id}/reactions` — add reaction (emoji)
- `DELETE /api/messages/{id}/reactions/{emoji}` — remove reaction
- Reply-to: messages reference `reply_to_id` with parent message data
- Disappearing messages: `expires_at` field, background task to purge expired
- WebSocket events: `reaction.updated`, `message.deleted`

#### Step 4.3: Frontend Attachments UI
- Attachment button in MessageInput (file picker)
- Drag-and-drop file upload on chat area
- Preview before sending (image thumbnail, file name/size)
- Image messages: inline display with lightbox on click
- File messages: icon + filename + size + download button
- Upload progress indicator

#### Step 4.4: Frontend Reactions, Reply-to, Context Menu
- Right-click context menu on messages (Reply, React, Copy, Delete)
- ReactionPicker (emoji grid, quick reactions bar)
- Reactions display under message bubbles (emoji + count)
- Reply-to: quote preview in input area when replying
- Quoted message block inside MessageBubble
- Disappearing messages timer setting (per conversation)
- Timer icon on disappearing messages

---

### Phase 5: Polish + UX

#### Step 5.1: Backend Seed Data & Presence
- 8 demo users with distinct profiles and avatars
- 6 conversations (3 direct + 3 group) with 100+ messages
- Varied message states (sent, delivered, read, unread)
- Some messages with reactions, replies, attachments
- Presence system: track online/offline via WebSocket lifecycle
- Update `last_seen` on disconnect
- Message search endpoint within conversation

#### Step 5.2: Frontend Dark Mode & Responsive Design
- Dark mode with Signal's exact dark palette
- Theme toggle (persisted in localStorage)
- CSS variables swap for light/dark
- Responsive breakpoints:
  - Mobile (<768px): full-screen panels, back navigation
  - Tablet (768-1024px): collapsible sidebar
  - Desktop (>1024px): side-by-side layout
- Touch-friendly tap targets on mobile

#### Step 5.3: Frontend Animations, Shortcuts, Toasts
- Message appear animation: `fadeInUp` 150ms
- Typing dots: staggered bounce (3 dots, 150ms delay each)
- Modal transitions: fade backdrop + scale content
- Toast notifications (new message when not in chat)
- Keyboard shortcuts:
  - `Ctrl/Cmd + N` — new chat
  - `Ctrl/Cmd + Shift + N` — new group
  - `Escape` — close modal / deselect
  - `Enter` — send message
  - `Shift + Enter` — new line in message

#### Step 5.4: Frontend Search, Empty States, Performance
- Search within conversations (filter by query)
- Search messages within a chat
- Empty states: "No conversations yet", "Select a chat", "No messages"
- Virtualized message list for performance (1000+ messages)
- Lazy loading for images
- Connection status indicator (connecting, connected, disconnected)

---

### Phase 6: Deployment

#### Step 6.1: Dockerfiles & Render Config
- `backend/Dockerfile` (Python, uvicorn, single worker)
- `frontend/Dockerfile` (Node, Next.js build + start)
- `render.yaml` blueprint:
  - Backend web service with persistent disk (1GB for SQLite + uploads)
  - Frontend web service
  - Environment variables
  - Health check path: `/api/health`

#### Step 6.2: README Documentation
- Setup instructions (prerequisites, install, run)
- Architecture overview with diagram
- Database schema (ER diagram or table descriptions)
- API overview (all endpoints grouped by domain)
- WebSocket protocol reference
- Tech stack justification
- Assumptions and design decisions

#### Step 6.3: Deploy & Verify
- Deploy backend to Render (auto-deploy from main)
- Deploy frontend to Render
- Configure environment variables (JWT_SECRET, CORS, API URLs)
- Run seed data on deployed instance
- End-to-end testing:
  - Register two users
  - Send real-time messages
  - Create group, add members
  - Test all features on production

---

## Database Schema

### Tables (9 total)

| Table | Purpose |
|-------|---------|
| `users` | User accounts (phone, username, display_name, avatar, status, online/last_seen) |
| `refresh_tokens` | JWT refresh tokens (revocable, with expiry) |
| `contacts` | User-to-user contact relationships (nickname, block) |
| `conversations` | Chat containers (type: direct/group, name, avatar, disappearing timer) |
| `conversation_members` | M:N link between users and conversations (role, last_read) |
| `messages` | All messages (text/image/file/system, reply_to, expires_at) |
| `message_status` | Per-user delivery state per message (sent/delivered/read) |
| `reactions` | Emoji reactions on messages (unique per user+message+emoji) |
| `attachments` | File metadata linked to messages (filename, url, type, size) |

### Key Relationships
```
Users ←→ Contacts (self-referencing M:N)
Users ←→ Conversations (via conversation_members, with role)
Messages → Conversations (belongs to)
Messages → Users (sender)
Messages → Messages (reply_to, self-referencing)
MessageStatus → Messages + Users (per-user per-message state)
Reactions → Messages + Users
Attachments → Messages
```

---

## WebSocket Protocol

### Connection
```
ws://<host>/ws?token=<jwt_access_token>
```

### Event Envelope
```json
{
  "event": "event.name",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Client → Server Events
| Event | Purpose |
|-------|---------|
| `message.send` | Send a new message |
| `message.read` | Mark messages as read |
| `typing.start` | User started typing |
| `typing.stop` | User stopped typing |
| `presence.update` | Update online status |
| `reaction.add` | Add emoji reaction |
| `reaction.remove` | Remove emoji reaction |

### Server → Client Events
| Event | Purpose |
|-------|---------|
| `message.new` | New message received |
| `message.status` | Delivery/read receipt |
| `message.deleted` | Message was deleted |
| `message.edited` | Message was edited |
| `typing.indicator` | Someone is typing |
| `presence.changed` | User online/offline |
| `reaction.updated` | Reaction state changed |
| `conversation.updated` | Conversation metadata changed |
| `conversation.new` | Added to new conversation |
| `member.joined` | New member in group |
| `member.left` | Member left/removed |

---

## API Endpoints (31 total)

### Auth (5)
```
POST   /api/auth/register      Register new user
POST   /api/auth/verify-otp    Verify OTP (mocked: "123456")
POST   /api/auth/login         Login (phone/username + password)
POST   /api/auth/refresh       Refresh access token
POST   /api/auth/logout        Invalidate refresh token
```

### Users (5)
```
GET    /api/users/me           Get current user profile
PATCH  /api/users/me           Update profile
POST   /api/users/me/avatar    Upload avatar
GET    /api/users/search       Search users by username/phone
GET    /api/users/{id}         Get user public profile
```

### Contacts (4)
```
GET    /api/contacts           List contacts
POST   /api/contacts           Add contact
PATCH  /api/contacts/{id}      Update contact (nickname, block)
DELETE /api/contacts/{id}      Remove contact
```

### Conversations (9)
```
GET    /api/conversations                          List conversations
POST   /api/conversations                          Create conversation
GET    /api/conversations/{id}                     Get conversation
PATCH  /api/conversations/{id}                     Update conversation
DELETE /api/conversations/{id}                     Leave/delete
GET    /api/conversations/{id}/members             List members
POST   /api/conversations/{id}/members             Add members
DELETE /api/conversations/{id}/members/{uid}        Remove member
PATCH  /api/conversations/{id}/members/{uid}        Change role
```

### Messages (7)
```
GET    /api/conversations/{id}/messages            List messages (paginated)
POST   /api/conversations/{id}/messages            Send message
PATCH  /api/messages/{id}                          Edit message
DELETE /api/messages/{id}                          Delete message
POST   /api/messages/{id}/reactions                Add reaction
DELETE /api/messages/{id}/reactions/{emoji}         Remove reaction
POST   /api/conversations/{id}/read                Mark as read
```

### Attachments (2)
```
POST   /api/attachments/upload     Upload file
GET    /api/attachments/{id}       Download file
```

---

## Signal UI Design Tokens

### Colors (Light Mode)
| Token | Value | Usage |
|-------|-------|-------|
| `--signal-blue` | `#2C6BED` | Sent bubbles, primary buttons, links |
| `--signal-blue-dark` | `#1A54D4` | Hover states |
| `--bubble-incoming` | `#FFFFFF` | Received message bubbles |
| `--bg-primary` | `#FFFFFF` | Main background |
| `--bg-sidebar` | `#F6F6F6` | Sidebar background |
| `--bg-input` | `#F0F0F0` | Input fields |
| `--text-primary` | `#000000` | Primary text |
| `--text-secondary` | `#5E5E5E` | Timestamps, metadata |
| `--border` | `#E5E5E5` | Dividers |
| `--online-green` | `#4CAF50` | Online indicator |

### Colors (Dark Mode)
| Token | Value | Usage |
|-------|-------|-------|
| `--signal-blue` | `#2C6BED` | Same blue |
| `--bubble-incoming` | `#2B2D31` | Received bubbles |
| `--bg-primary` | `#1B1C1F` | Main background |
| `--bg-sidebar` | `#1B1C1F` | Sidebar |
| `--bg-input` | `#2B2D31` | Input fields |
| `--text-primary` | `#E9E9E9` | Primary text |
| `--text-secondary` | `#8B8B8B` | Metadata |
| `--border` | `#3A3C40` | Dividers |

### Typography
- Font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Conversation name: 16px / 600 weight
- Message text: 15px / 400 weight
- Timestamp: 11px / 400 weight
- Sidebar preview: 14px / 400 weight, ellipsis overflow

### Spacing & Layout
- Sidebar width: 320px
- Bubble max-width: 65%
- Bubble padding: 8px 12px
- Bubble border-radius: 18px
- Avatar: 40px (sidebar), 36px (header), 80px (profile)
- Same-sender gap: 2px
- Different-sender gap: 8px

---

## Key Architectural Decisions

| Decision | Reasoning |
|----------|-----------|
| SQLite + WAL mode | Simple, no external DB service, sufficient for demo load |
| Async everywhere | aiosqlite + async SQLAlchemy for WebSocket performance |
| Zustand | Lightweight state, no Redux boilerplate |
| Optimistic updates | Instant UX for message sending |
| Cursor-based pagination | Stable pagination as new messages arrive |
| Single WebSocket | Multiplexed events for all conversations |
| JWT access (15min) + refresh (7d) | Secure, auto-refresh transparent to user |
| Single uvicorn worker | SQLite write concurrency constraint |
| Tailwind CSS | Rapid UI development, easy to match Signal's design |
| Next.js App Router | Modern React with server components, layouts, middleware |

---

## Progress Tracker

- [x] Phase 1.1: Backend scaffolding
- [ ] Phase 1.2: Backend auth & user endpoints
- [ ] Phase 1.3: Frontend scaffolding
- [ ] Phase 1.4: Frontend auth pages
- [ ] Phase 2.1: Backend conversations & messages API
- [ ] Phase 2.2: Backend WebSocket layer
- [ ] Phase 2.3: Frontend sidebar & conversation list
- [ ] Phase 2.4: Frontend chat view
- [ ] Phase 3.1: Backend group management
- [ ] Phase 3.2: Backend contacts API
- [ ] Phase 3.3: Frontend group UI
- [ ] Phase 3.4: Frontend contacts & new chat UI
- [ ] Phase 4.1: Backend file upload
- [ ] Phase 4.2: Backend reactions, reply-to, disappearing
- [ ] Phase 4.3: Frontend attachments UI
- [ ] Phase 4.4: Frontend reactions, reply-to, context menu
- [ ] Phase 5.1: Backend seed data & presence
- [ ] Phase 5.2: Frontend dark mode & responsive
- [ ] Phase 5.3: Frontend polish (animations, shortcuts, toasts)
- [ ] Phase 5.4: Frontend search, empty states, performance
- [ ] Phase 6.1: Dockerfiles & render.yaml
- [ ] Phase 6.2: README documentation
- [ ] Phase 6.3: Deploy & verify
