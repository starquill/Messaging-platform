import uuid
import asyncio
from datetime import datetime, timedelta

import bcrypt

from app.database import AsyncSessionLocal, init_db
from app.models.user import User
from app.models.contact import Contact
from app.models.conversation import Conversation, ConversationMember
from app.models.message import Message, MessageStatus

USERS = [
    {"phone": "+1234567001", "username": "alice", "display_name": "Alice Johnson", "status_text": "Available"},
    {"phone": "+1234567002", "username": "bob", "display_name": "Bob Smith", "status_text": "At work"},
    {"phone": "+1234567003", "username": "charlie", "display_name": "Charlie Davis", "status_text": "On vacation"},
    {"phone": "+1234567004", "username": "diana", "display_name": "Diana Wilson", "status_text": "Busy"},
    {"phone": "+1234567005", "username": "evan", "display_name": "Evan Brown", "status_text": "In a meeting"},
    {"phone": "+1234567006", "username": "fiona", "display_name": "Fiona Garcia", "status_text": ""},
    {"phone": "+1234567007", "username": "george", "display_name": "George Martinez", "status_text": "Working from home"},
    {"phone": "+1234567008", "username": "hannah", "display_name": "Hannah Lee", "status_text": "Do not disturb"},
]

DIRECT_CONVERSATIONS = [
    (0, 1),  # alice-bob
    (0, 2),  # alice-charlie
    (1, 3),  # bob-diana
]

GROUP_CONVERSATIONS = [
    {"name": "Team Signal", "members": [0, 1, 2, 3], "creator": 0},
    {"name": "Weekend Plans", "members": [0, 4, 5, 6], "creator": 4},
    {"name": "Book Club", "members": [1, 2, 5, 7], "creator": 5},
]

MESSAGES_PER_DIRECT = [
    [
        (0, "Hey Bob! How's it going?"),
        (1, "Hey Alice! Pretty good, just finishing up some code."),
        (0, "Nice! Working on anything interesting?"),
        (1, "Building a real-time chat app actually 😄"),
        (0, "That's cool! What stack are you using?"),
        (1, "FastAPI + Next.js + WebSockets"),
        (0, "Solid choice. I've been meaning to try FastAPI."),
        (1, "It's great for async stuff. Super fast."),
        (0, "Maybe we can pair program sometime?"),
        (1, "Absolutely! Let's set something up this week."),
        (0, "Perfect! How about Thursday afternoon?"),
        (1, "Thursday works for me. 3pm?"),
        (0, "Sounds good! Talk to you then 👋"),
        (1, "See ya! 🎉"),
    ],
    [
        (0, "Charlie! When are you back from vacation?"),
        (2, "Hey Alice! Coming back next Monday."),
        (0, "How's the weather there?"),
        (2, "Absolutely beautiful. 28°C and sunny ☀️"),
        (0, "So jealous! It's been raining here all week."),
        (2, "Send me some of that rain, it's too hot here 😅"),
        (0, "Haha deal! Enjoy the rest of your trip!"),
        (2, "Thanks! See you Monday!"),
    ],
    [
        (1, "Diana, did you get a chance to review the PR?"),
        (3, "Yes! Left some comments. Overall looks good."),
        (1, "Great, I'll address those today."),
        (3, "The test coverage could be better in the auth module."),
        (1, "Good point. I'll add more edge cases."),
        (3, "Perfect. Let me know when it's ready for re-review."),
        (1, "Will do! Thanks for the thorough review 🙏"),
        (3, "Of course! That's what code reviews are for."),
        (1, "Updated the PR. Ready for another look when you have time."),
        (3, "On it! Give me 30 minutes."),
    ],
]

MESSAGES_GROUP_1 = [
    (0, "Welcome to Team Signal everyone! 🎉"),
    (1, "Excited to be here!"),
    (2, "Hey team!"),
    (3, "Hello all 👋"),
    (0, "Let's use this for project updates and quick questions."),
    (1, "Sounds good. I'll share my progress here daily."),
    (3, "Same. Should we do a standup format?"),
    (0, "Great idea Diana! Let's do: yesterday, today, blockers."),
    (2, "Love it. I'll start tomorrow when I'm back."),
    (1, "Quick update: finished the WebSocket implementation today."),
    (3, "Nice work Bob! I'll integrate it with the frontend tomorrow."),
    (0, "Amazing progress team! We're ahead of schedule."),
    (1, "Should we add file sharing next or focus on the group features?"),
    (0, "Let's do group features first, then file sharing."),
    (3, "Agreed. Group management is higher priority for the demo."),
    (2, "I can take the group member management when I'm back."),
    (0, "Perfect! Charlie you're on group management, Bob continues backend, Diana does frontend integration."),
    (1, "Roger that! 🫡"),
]

MESSAGES_GROUP_2 = [
    (4, "Hey everyone! Any plans for the weekend?"),
    (0, "Thinking about hiking if the weather holds up."),
    (5, "I'm down for a hike! Where are you thinking?"),
    (6, "Count me in too!"),
    (4, "How about that trail near the lake?"),
    (0, "The one with the waterfall? That's a great one!"),
    (5, "Perfect. Saturday morning work for everyone?"),
    (6, "Saturday 8am? Beat the crowds."),
    (4, "8am is early but I'm in 💪"),
    (0, "Let's do it! I'll bring coffee for the drive."),
    (5, "I'll pack snacks!"),
    (6, "I'll drive. My car fits everyone."),
    (4, "Best team ever 🏔️"),
]

MESSAGES_GROUP_3 = [
    (5, "So what did everyone think of the book?"),
    (1, "I loved it! The twist at the end was wild."),
    (7, "I'm only halfway through, no spoilers please!"),
    (2, "Oops sorry Hannah! It's really good though."),
    (5, "Let's discuss the first half then. What did you think of the main character?"),
    (1, "Really well developed. The backstory in chapter 3 was brilliant."),
    (7, "Yes! That chapter changed everything for me."),
    (2, "Same here. The writing style is so engaging."),
    (5, "Should we read another by the same author next?"),
    (1, "Definitely! They have a new one coming out next month."),
    (7, "I'll pre-order it!"),
]

GROUP_MESSAGES = [MESSAGES_GROUP_1, MESSAGES_GROUP_2, MESSAGES_GROUP_3]


async def seed():
    import os
    os.makedirs("data", exist_ok=True)

    await init_db()

    async with AsyncSessionLocal() as db:
        existing = await db.execute(
            __import__("sqlalchemy").select(User).limit(1)
        )
        if existing.scalar_one_or_none():
            print("Database already has data, skipping seed.")
            return

        password_hash = bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode()
        user_ids = []

        for u in USERS:
            user = User(
                id=uuid.uuid4().hex,
                phone=u["phone"],
                username=u["username"],
                display_name=u["display_name"],
                status_text=u["status_text"],
                password_hash=password_hash,
            )
            db.add(user)
            user_ids.append(user.id)

        # Contacts: everyone is contacts with everyone
        for i in range(len(USERS)):
            for j in range(i + 1, len(USERS)):
                db.add(Contact(id=uuid.uuid4().hex, user_id=user_ids[i], contact_id=user_ids[j]))
                db.add(Contact(id=uuid.uuid4().hex, user_id=user_ids[j], contact_id=user_ids[i]))

        base_time = datetime.utcnow() - timedelta(days=2)
        conv_count = 0

        # Direct conversations
        for idx, (u1, u2) in enumerate(DIRECT_CONVERSATIONS):
            conv = Conversation(
                id=uuid.uuid4().hex,
                type="direct",
                created_by=user_ids[u1],
                created_at=base_time,
                updated_at=base_time,
            )
            db.add(conv)

            db.add(ConversationMember(id=uuid.uuid4().hex, conversation_id=conv.id, user_id=user_ids[u1], role="admin", joined_at=base_time))
            db.add(ConversationMember(id=uuid.uuid4().hex, conversation_id=conv.id, user_id=user_ids[u2], role="member", joined_at=base_time))

            messages = MESSAGES_PER_DIRECT[idx]
            for mi, (sender_idx, content) in enumerate(messages):
                msg_time = base_time + timedelta(minutes=mi * 3 + conv_count * 60)
                msg = Message(
                    id=uuid.uuid4().hex,
                    conversation_id=conv.id,
                    sender_id=user_ids[sender_idx],
                    content=content,
                    type="text",
                    created_at=msg_time,
                )
                db.add(msg)

                other = u2 if sender_idx == u1 else u1
                db.add(MessageStatus(
                    id=uuid.uuid4().hex,
                    message_id=msg.id,
                    user_id=user_ids[other],
                    status="read",
                    updated_at=msg_time + timedelta(seconds=30),
                ))

                conv.updated_at = msg_time

            conv_count += 1

        # Group conversations
        for idx, group in enumerate(GROUP_CONVERSATIONS):
            conv = Conversation(
                id=uuid.uuid4().hex,
                type="group",
                name=group["name"],
                created_by=user_ids[group["creator"]],
                created_at=base_time,
                updated_at=base_time,
            )
            db.add(conv)

            for member_idx in group["members"]:
                role = "admin" if member_idx == group["creator"] else "member"
                db.add(ConversationMember(
                    id=uuid.uuid4().hex,
                    conversation_id=conv.id,
                    user_id=user_ids[member_idx],
                    role=role,
                    joined_at=base_time,
                ))

            messages = GROUP_MESSAGES[idx]
            for mi, (sender_idx, content) in enumerate(messages):
                msg_time = base_time + timedelta(minutes=mi * 5 + (conv_count + idx) * 60)
                msg = Message(
                    id=uuid.uuid4().hex,
                    conversation_id=conv.id,
                    sender_id=user_ids[sender_idx],
                    content=content,
                    type="text",
                    created_at=msg_time,
                )
                db.add(msg)

                for member_idx in group["members"]:
                    if member_idx != sender_idx:
                        db.add(MessageStatus(
                            id=uuid.uuid4().hex,
                            message_id=msg.id,
                            user_id=user_ids[member_idx],
                            status="read" if mi < len(messages) - 3 else "delivered",
                            updated_at=msg_time + timedelta(seconds=60),
                        ))

                conv.updated_at = msg_time

        await db.commit()
        print(f"Seeded {len(USERS)} users, {len(DIRECT_CONVERSATIONS)} direct convos, {len(GROUP_CONVERSATIONS)} group convos")
        print(f"All users have password: password123")
        print(f"Usernames: {', '.join(u['username'] for u in USERS)}")


if __name__ == "__main__":
    asyncio.run(seed())
