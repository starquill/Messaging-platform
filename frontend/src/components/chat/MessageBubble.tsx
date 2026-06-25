"use client";

import { Message } from "@/types";
import { formatMessageTime, getInitials } from "@/lib/utils";
import { API_URL } from "@/lib/constants";
import MessageStatusIcon from "./MessageStatusIcon";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  currentUserId: string;
  onContextMenu: (e: React.MouseEvent, message: Message) => void;
  onReactionClick: (emoji: string, messageId: string) => void;
}

export default function MessageBubble({
  message,
  isOwn,
  showAvatar,
  currentUserId,
  onContextMenu,
  onReactionClick,
}: MessageBubbleProps) {
  if (message.type === "system") {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-bg-hover px-3 py-1 text-xs text-text-secondary">
          {message.content}
        </span>
      </div>
    );
  }

  const resolveUrl = (url: string) => {
    if (url.startsWith("blob:") || url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  return (
    <div
      className={`mb-1 flex ${isOwn ? "justify-end" : "justify-start"} ${showAvatar ? "mt-2" : ""}`}
      onContextMenu={(e) => onContextMenu(e, message)}
    >
      {!isOwn && showAvatar && (
        <div className="mr-2 flex-shrink-0">
          {message.sender?.avatar_url ? (
            <img
              src={resolveUrl(message.sender.avatar_url)}
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
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-1">
              {message.attachments.map((att) => {
                if (att.content_type.startsWith("image/")) {
                  return (
                    <img
                      key={att.id}
                      src={resolveUrl(att.url)}
                      alt={att.filename}
                      className="max-h-[300px] max-w-full rounded-lg cursor-pointer"
                      onClick={() => window.open(resolveUrl(att.url), "_blank")}
                    />
                  );
                }
                return (
                  <a
                    key={att.id}
                    href={resolveUrl(att.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 rounded-lg p-2 text-sm ${
                      isOwn ? "bg-white/10 text-white" : "bg-bg-hover text-signal-blue"
                    }`}
                  >
                    <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{att.filename}</p>
                      <p className={`text-xs ${isOwn ? "text-white/60" : "text-text-secondary"}`}>
                        {formatFileSize(att.size)}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          {message.content && (
            <p className="whitespace-pre-wrap break-words text-[15px]">{message.content}</p>
          )}

          <div className={`mt-0.5 flex items-center justify-end gap-1 ${isOwn ? "text-white/70" : "text-text-secondary"}`}>
            {message.expires_at && (
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z" />
              </svg>
            )}
            <span className="text-[11px]">{formatMessageTime(message.created_at)}</span>
            {message.is_edited && <span className="text-[10px]">edited</span>}
            {isOwn && <MessageStatusIcon status={message.status || "sent"} />}
          </div>
        </div>

        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {groupReactions(message.reactions, currentUserId).map(({ emoji, count, hasOwn }) => (
              <button
                key={emoji}
                onClick={() => onReactionClick(emoji, message.id)}
                className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs transition-colors ${
                  hasOwn
                    ? "bg-signal-blue/20 border border-signal-blue/40"
                    : "bg-bg-hover hover:bg-bg-input"
                }`}
              >
                {emoji} {count > 1 && <span className="text-text-secondary">{count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function groupReactions(reactions: { emoji: string; user_id: string }[], currentUserId: string) {
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
    hasOwn: users.includes(currentUserId),
  }));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
