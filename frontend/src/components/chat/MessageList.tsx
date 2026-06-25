"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/stores/chatStore";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";

interface MessageListProps {
  conversationId: string;
  currentUserId: string;
}

export default function MessageList({ conversationId, currentUserId }: MessageListProps) {
  const { messages, isLoadingMessages, hasMore, fetchMessages, typingUsers } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(0);

  const convMessages = messages[conversationId] || [];
  const typing = typingUsers[conversationId] || [];

  useEffect(() => {
    if (convMessages.length > prevMessageCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCount.current = convMessages.length;
  }, [convMessages.length]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    if (containerRef.current.scrollTop === 0 && hasMore[conversationId]) {
      fetchMessages(conversationId, true);
    }
  };

  if (isLoadingMessages && convMessages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-signal-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex flex-1 flex-col overflow-y-auto px-4 py-3"
    >
      {hasMore[conversationId] && (
        <div className="mb-2 flex justify-center">
          <button
            onClick={() => fetchMessages(conversationId, true)}
            className="rounded-full bg-bg-hover px-3 py-1 text-xs text-text-secondary hover:bg-border-color"
          >
            Load older messages
          </button>
        </div>
      )}

      {convMessages.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-text-secondary">No messages yet. Say hello!</p>
        </div>
      )}

      {convMessages.map((message, index) => {
        const prevMessage = index > 0 ? convMessages[index - 1] : null;
        const showAvatar = !prevMessage || prevMessage.sender_id !== message.sender_id;
        const isOwn = message.sender_id === currentUserId;

        return (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={isOwn}
            showAvatar={showAvatar}
            currentUserId={currentUserId}
          />
        );
      })}

      {typing.length > 0 && <TypingIndicator users={typing} />}
      <div ref={bottomRef} />
    </div>
  );
}
