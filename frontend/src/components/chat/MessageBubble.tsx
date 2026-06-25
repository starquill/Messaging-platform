"use client";

import { Message } from "@/types";
import { formatMessageTime, getInitials } from "@/lib/utils";
import MessageStatusIcon from "./MessageStatusIcon";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  currentUserId: string;
}

export default function MessageBubble({ message, isOwn, showAvatar, currentUserId }: MessageBubbleProps) {
  if (message.type === "system") {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-bg-hover px-3 py-1 text-xs text-text-secondary">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`mb-1 flex ${isOwn ? "justify-end" : "justify-start"} ${showAvatar ? "mt-2" : ""}`}>
      {!isOwn && showAvatar && (
        <div className="mr-2 flex-shrink-0">
          {message.sender?.avatar_url ? (
            <img
              src={message.sender.avatar_url}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-signal-blue-light text-xs font-medium text-signal-blue">
              {getInitials(message.sender?.display_name || "?")}
            </div>
          )}
        </div>
      )}
      {!isOwn && !showAvatar && <div className="mr-2 w-8 flex-shrink-0" />}

      <div className={`max-w-[65%] ${isOwn ? "items-end" : "items-start"}`}>
        {!isOwn && showAvatar && message.sender && (
          <p className="mb-0.5 text-xs font-medium text-text-secondary">
            {message.sender.display_name}
          </p>
        )}

        {message.reply_to && (
          <div className={`mb-1 rounded-lg border-l-2 border-signal-blue bg-bg-hover px-2 py-1 ${isOwn ? "ml-auto" : ""}`}>
            <p className="text-xs font-medium text-signal-blue">
              {message.reply_to.sender?.display_name || "Unknown"}
            </p>
            <p className="truncate text-xs text-text-secondary">
              {message.reply_to.content}
            </p>
          </div>
        )}

        <div
          className={`inline-block rounded-2xl px-3 py-2 ${
            isOwn
              ? "bg-signal-blue text-white"
              : "bg-bubble-received text-text-primary"
          }`}
        >
          {message.content && (
            <p className="whitespace-pre-wrap break-words text-[15px]">{message.content}</p>
          )}

          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-1">
              {message.attachments.map((att) => {
                if (att.content_type.startsWith("image/")) {
                  return (
                    <img
                      key={att.id}
                      src={att.url}
                      alt={att.filename}
                      className="max-w-full rounded-lg"
                    />
                  );
                }
                return (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 text-sm underline ${isOwn ? "text-white/90" : "text-signal-blue"}`}
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
                    </svg>
                    {att.filename}
                  </a>
                );
              })}
            </div>
          )}

          <div className={`mt-0.5 flex items-center justify-end gap-1 ${isOwn ? "text-white/70" : "text-text-secondary"}`}>
            <span className="text-[11px]">{formatMessageTime(message.created_at)}</span>
            {message.is_edited && <span className="text-[10px]">edited</span>}
            {isOwn && <MessageStatusIcon status={message.status || "sent"} />}
          </div>
        </div>

        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {groupReactions(message.reactions).map(({ emoji, count, users }) => (
              <span
                key={emoji}
                className="inline-flex items-center gap-0.5 rounded-full bg-bg-hover px-2 py-0.5 text-xs"
                title={users.join(", ")}
              >
                {emoji} {count > 1 && <span className="text-text-secondary">{count}</span>}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function groupReactions(reactions: { emoji: string; user_id: string }[]) {
  const map = new Map<string, string[]>();
  for (const r of reactions) {
    const existing = map.get(r.emoji) || [];
    existing.push(r.user_id);
    map.set(r.emoji, existing);
  }
  return Array.from(map.entries()).map(([emoji, users]) => ({
    emoji,
    count: users.length,
    users,
  }));
}
