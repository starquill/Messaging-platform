"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Message, Attachment } from "@/types";
import { api } from "@/lib/api";
import { API_URL } from "@/lib/constants";

interface MessageInputProps {
  conversationId: string;
  replyTo: Message | null;
  onCancelReply: () => void;
}

export default function MessageInput({ conversationId, replyTo, onCancelReply }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const { addMessage } = useChatStore();
  const { user } = useAuthStore();
  const { send } = useWebSocket();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed && files.length === 0) return;

    const clientId = crypto.randomUUID();
    const now = new Date().toISOString();
    const msgType = files.length > 0 && files.some((f) => f.type.startsWith("image/")) ? "image" : files.length > 0 ? "file" : "text";

    addMessage({
      id: clientId,
      conversation_id: conversationId,
      sender_id: user?.id || "",
      content: trimmed || null,
      type: msgType,
      reply_to_id: replyTo?.id || null,
      is_edited: false,
      expires_at: null,
      created_at: now,
      sender: user || undefined,
      reply_to: replyTo || undefined,
      status: "sending",
      reactions: [],
      attachments: files.map((f) => ({
        id: crypto.randomUUID(),
        message_id: clientId,
        filename: f.name,
        url: URL.createObjectURL(f),
        content_type: f.type,
        size: f.size,
        created_at: now,
      })),
    });

    send("message.send", {
      conversation_id: conversationId,
      content: trimmed || null,
      type: msgType,
      client_id: clientId,
      reply_to_id: replyTo?.id || null,
    });

    if (files.length > 0) {
      setUploading(true);
      setTimeout(async () => {
        try {
          const res = await api.get<{ messages: Message[] }>(
            `/api/conversations/${conversationId}/messages?limit=1`
          );
          const serverMsg = res.messages?.[res.messages.length - 1];
          if (serverMsg) {
            for (const file of files) {
              const formData = new FormData();
              formData.append("file", file);
              formData.append("message_id", serverMsg.id);
              formData.append("conversation_id", conversationId);
              await api.uploadForm<Attachment>("/api/attachments", formData);
            }
          }
        } catch {
          // ignore upload errors
        } finally {
          setUploading(false);
        }
      }, 500);
    }

    setContent("");
    setFiles([]);
    onCancelReply();
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...dropped]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  useEffect(() => {
    if (replyTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyTo]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="border-t border-border-color bg-bg-primary px-4 py-3"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border-l-2 border-signal-blue bg-bg-hover px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-signal-blue">
              {replyTo.sender?.display_name || "Unknown"}
            </p>
            <p className="truncate text-xs text-text-secondary">{replyTo.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="flex-shrink-0 rounded-full p-1 text-text-secondary hover:bg-bg-input"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((file, i) => (
            <div key={i} className="relative">
              {file.type.startsWith("image/") ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-16 items-center gap-2 rounded-lg bg-bg-hover px-3">
                  <svg className="h-5 w-5 text-text-secondary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
                  </svg>
                  <span className="max-w-[100px] truncate text-xs text-text-primary">{file.name}</span>
                </div>
              )}
              <button
                onClick={() => removeFile(i)}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white text-xs"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-bg-hover"
          title="Attach file"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
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
          disabled={(!content.trim() && files.length === 0) || uploading}
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
