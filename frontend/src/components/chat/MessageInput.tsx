"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";
import { useWebSocket } from "@/hooks/useWebSocket";

interface MessageInputProps {
  conversationId: string;
}

export default function MessageInput({ conversationId }: MessageInputProps) {
  const [content, setContent] = useState("");
  const { addMessage } = useChatStore();
  const { user } = useAuthStore();
  const { send } = useWebSocket();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sendTypingStart = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      send("typing.start", { conversation_id: conversationId });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      send("typing.stop", { conversation_id: conversationId });
    }, 3000);
  }, [conversationId, send]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    sendTypingStart();

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  };

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const clientId = crypto.randomUUID();
    const now = new Date().toISOString();

    addMessage({
      id: clientId,
      conversation_id: conversationId,
      sender_id: user?.id || "",
      content: trimmed,
      type: "text",
      reply_to_id: null,
      is_edited: false,
      expires_at: null,
      created_at: now,
      sender: user || undefined,
      status: "sending",
      reactions: [],
      attachments: [],
    });

    send("message.send", {
      conversation_id: conversationId,
      content: trimmed,
      type: "text",
      client_id: clientId,
    });

    setContent("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    if (isTypingRef.current) {
      isTypingRef.current = false;
      send("typing.stop", { conversation_id: conversationId });
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="border-t border-border-color bg-bg-primary px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Message"
          rows={1}
          className="max-h-[120px] min-h-[40px] flex-1 resize-none rounded-2xl bg-bg-input px-4 py-2.5 text-[15px] text-text-primary placeholder:text-text-secondary focus:outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!content.trim()}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-signal-blue text-white transition-colors hover:bg-signal-blue-dark disabled:opacity-40"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
