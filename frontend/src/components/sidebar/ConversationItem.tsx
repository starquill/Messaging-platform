"use client";

import { useRouter } from "next/navigation";
import { Conversation } from "@/types";
import { useChatStore } from "@/stores/chatStore";
import { formatTime, getInitials } from "@/lib/utils";

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  currentUserId: string;
}

export default function ConversationItem({ conversation, isActive, currentUserId }: ConversationItemProps) {
  const router = useRouter();
  const { setActiveConversation, typingUsers } = useChatStore();

  const name =
    conversation.type === "direct"
      ? conversation.other_user?.display_name || "Unknown"
      : conversation.name || "Group";

  const avatar =
    conversation.type === "direct"
      ? conversation.other_user?.avatar_url
      : conversation.avatar_url;

  const isOnline = conversation.type === "direct" && conversation.other_user?.is_online;

  const typing = typingUsers[conversation.id] || [];
  const isTyping = typing.length > 0;

  const lastMessage = conversation.last_message;
  let preview = "";
  if (isTyping) {
    preview = typing.length === 1 ? "typing..." : `${typing.length} people typing...`;
  } else if (lastMessage) {
    if (lastMessage.type === "system") {
      preview = lastMessage.content || "";
    } else if (lastMessage.sender_id === currentUserId) {
      preview = `You: ${lastMessage.content || ""}`;
    } else {
      preview = lastMessage.content || "";
    }
  }

  const handleClick = () => {
    setActiveConversation(conversation);
    router.push(`/chat/${conversation.id}`);
  };

  return (
    <button
      onClick={handleClick}
      className={`flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-hover ${
        isActive ? "bg-bg-active" : ""
      }`}
    >
      <div className="relative flex-shrink-0">
        {avatar ? (
          <img src={avatar} alt={name} className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-signal-blue-light text-sm font-semibold text-signal-blue">
            {getInitials(name)}
          </div>
        )}
        {isOnline && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-bg-sidebar bg-green-500" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start">
        <div className="flex w-full items-center justify-between">
          <span className="truncate text-sm font-medium text-text-primary">{name}</span>
          {lastMessage && (
            <span className="ml-2 flex-shrink-0 text-xs text-text-secondary">
              {formatTime(lastMessage.created_at)}
            </span>
          )}
        </div>
        <div className="flex w-full items-center justify-between">
          <span
            className={`truncate text-xs ${
              isTyping ? "text-signal-blue" : "text-text-secondary"
            }`}
          >
            {preview || "No messages yet"}
          </span>
          {(conversation.unread_count || 0) > 0 && (
            <span className="ml-2 flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full bg-signal-blue px-1.5 text-xs font-medium text-white">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
