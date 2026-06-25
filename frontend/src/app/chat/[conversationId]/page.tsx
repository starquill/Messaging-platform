"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageList from "@/components/chat/MessageList";
import MessageInput from "@/components/chat/MessageInput";

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const { user } = useAuthStore();
  const {
    activeConversation,
    conversations,
    setActiveConversation,
    fetchMessages,
    markAsRead,
  } = useChatStore();

  useEffect(() => {
    if (!activeConversation || activeConversation.id !== conversationId) {
      const conv = conversations.find((c) => c.id === conversationId);
      if (conv) {
        setActiveConversation(conv);
      }
    }
  }, [conversationId, conversations, activeConversation, setActiveConversation]);

  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId);
      markAsRead(conversationId);
    }
  }, [conversationId, fetchMessages, markAsRead]);

  if (!activeConversation) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-secondary">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-signal-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-bg-chat">
      <ChatHeader conversation={activeConversation} />
      <MessageList conversationId={conversationId} currentUserId={user?.id || ""} />
      <MessageInput conversationId={conversationId} />
    </div>
  );
}
