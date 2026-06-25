"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useChatStore } from "@/stores/chatStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Message } from "@/types";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import MessageContextMenu from "./MessageContextMenu";
import EmojiPicker from "./EmojiPicker";

interface MessageListProps {
  conversationId: string;
  currentUserId: string;
  onReply: (message: Message) => void;
}

export default function MessageList({ conversationId, currentUserId, onReply }: MessageListProps) {
  const { messages, isLoadingMessages, hasMore, fetchMessages, typingUsers, deleteMessage } = useChatStore();
  const { send } = useWebSocket();
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(0);

  const [contextMenu, setContextMenu] = useState<{
    message: Message;
    position: { x: number; y: number };
  } | null>(null);
  const [emojiPicker, setEmojiPicker] = useState<{
    messageId: string;
    position: { x: number; y: number };
  } | null>(null);

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

  const handleContextMenu = useCallback((e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    setContextMenu({ message, position: { x: e.clientX, y: e.clientY } });
  }, []);

  const handleReactionClick = useCallback(
    (emoji: string, messageId: string) => {
      const msg = convMessages.find((m) => m.id === messageId);
      const hasReaction = msg?.reactions?.some(
        (r) => r.user_id === currentUserId && r.emoji === emoji
      );
      if (hasReaction) {
        send("reaction.remove", { message_id: messageId, emoji });
      } else {
        send("reaction.add", { message_id: messageId, emoji });
      }
    },
    [convMessages, currentUserId, send]
  );

  const handleDelete = useCallback(
    (messageId: string) => {
      send("message.delete", { message_id: messageId });
      deleteMessage(conversationId, messageId);
      setContextMenu(null);
    },
    [send, deleteMessage, conversationId]
  );

  const handleCopy = useCallback((message: Message) => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
    }
    setContextMenu(null);
  }, []);

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
            onContextMenu={handleContextMenu}
            onReactionClick={handleReactionClick}
          />
        );
      })}

      {typing.length > 0 && <TypingIndicator users={typing} />}
      <div ref={bottomRef} />

      {contextMenu && (
        <MessageContextMenu
          message={contextMenu.message}
          isOwn={contextMenu.message.sender_id === currentUserId}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onReply={() => {
            onReply(contextMenu.message);
            setContextMenu(null);
          }}
          onReact={() => {
            setEmojiPicker({
              messageId: contextMenu.message.id,
              position: contextMenu.position,
            });
            setContextMenu(null);
          }}
          onDelete={() => handleDelete(contextMenu.message.id)}
          onCopy={() => handleCopy(contextMenu.message)}
        />
      )}

      {emojiPicker && (
        <EmojiPicker
          position={emojiPicker.position}
          onSelect={(emoji) => handleReactionClick(emoji, emojiPicker.messageId)}
          onClose={() => setEmojiPicker(null)}
        />
      )}
    </div>
  );
}
