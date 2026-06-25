"use client";

import { useRouter } from "next/navigation";
import { Conversation } from "@/types";
import { useChatStore } from "@/stores/chatStore";
import { getInitials, formatLastSeen } from "@/lib/utils";

interface ChatHeaderProps {
  conversation: Conversation;
}

export default function ChatHeader({ conversation }: ChatHeaderProps) {
  const router = useRouter();
  const { typingUsers } = useChatStore();

  const name =
    conversation.type === "direct"
      ? conversation.other_user?.display_name || "Unknown"
      : conversation.name || "Group";

  const avatar =
    conversation.type === "direct"
      ? conversation.other_user?.avatar_url
      : conversation.avatar_url;

  const typing = typingUsers[conversation.id] || [];
  const isTyping = typing.length > 0;

  let subtitle = "";
  if (isTyping) {
    subtitle = typing.map((t) => t.display_name).join(", ") + " typing...";
  } else if (conversation.type === "direct" && conversation.other_user) {
    subtitle = conversation.other_user.is_online
      ? "online"
      : `last seen ${formatLastSeen(conversation.other_user.last_seen)}`;
  } else if (conversation.type === "group" && conversation.members) {
    subtitle = `${conversation.members.length} members`;
  }

  return (
    <div className="flex items-center gap-3 border-b border-border-color bg-bg-primary px-4 py-3">
      <button
        onClick={() => router.push("/chat")}
        className="rounded-full p-1 text-text-secondary hover:bg-bg-hover md:hidden"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {avatar ? (
        <img src={avatar} alt={name} className="h-10 w-10 rounded-full object-cover" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-signal-blue-light text-sm font-semibold text-signal-blue">
          {getInitials(name)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold text-text-primary">{name}</h2>
        <p className={`truncate text-xs ${isTyping ? "text-signal-blue" : "text-text-secondary"}`}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}
