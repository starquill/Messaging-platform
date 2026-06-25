"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";
import { Message } from "@/types";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageList from "@/components/chat/MessageList";
import MessageInput from "@/components/chat/MessageInput";
import GroupInfoPanel from "@/components/group/GroupInfoPanel";

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
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

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

  useEffect(() => {
    setReplyTo(null);
  }, [conversationId]);

  if (!activeConversation) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-secondary">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-signal-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col bg-bg-chat">
        <ChatHeader
          conversation={activeConversation}
          onInfoClick={activeConversation.type === "group" ? () => setShowGroupInfo(!showGroupInfo) : undefined}
        />
        <MessageList
          conversationId={conversationId}
          currentUserId={user?.id || ""}
          onReply={setReplyTo}
        />
        <MessageInput
          conversationId={conversationId}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>
      {showGroupInfo && activeConversation.type === "group" && (
        <GroupInfoPanel conversation={activeConversation} onClose={() => setShowGroupInfo(false)} />
      )}
    </div>
  );
}
