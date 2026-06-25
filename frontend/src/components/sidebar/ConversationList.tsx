"use client";

import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";
import ConversationItem from "./ConversationItem";

interface ConversationListProps {
  searchQuery: string;
}

export default function ConversationList({ searchQuery }: ConversationListProps) {
  const { conversations, activeConversation, isLoadingConversations } = useChatStore();
  const { user } = useAuthStore();

  const filtered = searchQuery
    ? conversations.filter((c) => {
        const name = c.type === "direct" ? c.other_user?.display_name : c.name;
        return name?.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : conversations;

  if (isLoadingConversations) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-signal-blue border-t-transparent" />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <p className="text-sm text-text-secondary">
          {searchQuery ? "No conversations found" : "No conversations yet"}
        </p>
        {!searchQuery && (
          <p className="mt-1 text-xs text-text-secondary">
            Start a new chat to get going
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {filtered.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isActive={activeConversation?.id === conversation.id}
          currentUserId={user?.id || ""}
        />
      ))}
    </div>
  );
}
