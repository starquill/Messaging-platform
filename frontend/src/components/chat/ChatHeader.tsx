"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Conversation, Message } from "@/types";
import { useChatStore } from "@/stores/chatStore";
import { getInitials, formatLastSeen } from "@/lib/utils";
import { api } from "@/lib/api";
import { API_URL } from "@/lib/constants";

interface ChatHeaderProps {
  conversation: Conversation;
  onInfoClick?: () => void;
}

const DISAPPEARING_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "30s", value: 30 },
  { label: "5m", value: 300 },
  { label: "1h", value: 3600 },
  { label: "24h", value: 86400 },
];

export default function ChatHeader({ conversation, onInfoClick }: ChatHeaderProps) {
  const router = useRouter();
  const { typingUsers, updateConversation } = useChatStore();
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);

  const name =
    conversation.type === "direct"
      ? conversation.other_user?.display_name || "Unknown"
      : conversation.name || "Group";

  const avatarUrl =
    conversation.type === "direct"
      ? conversation.other_user?.avatar_url
      : conversation.avatar_url;

  const resolveUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

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

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const data = await api.get<{ messages: Message[] }>(
        `/api/conversations/${conversation.id}/messages/search?q=${encodeURIComponent(query)}`
      );
      setSearchResults(data.messages || []);
    } catch {
      setSearchResults([]);
    }
  }, [conversation.id]);

  const handleTimerChange = async (duration: number) => {
    setShowTimerMenu(false);
    try {
      const updated = await api.patch<Conversation>(
        `/api/conversations/${conversation.id}`,
        { disappearing_duration: duration || null }
      );
      updateConversation(updated);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative flex items-center gap-3 border-b border-border-color bg-bg-primary px-4 py-3">
      <button
        onClick={() => router.push("/chat")}
        className="rounded-full p-1 text-text-secondary hover:bg-bg-hover md:hidden"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {avatarUrl ? (
        <img src={resolveUrl(avatarUrl)!} alt={name} className="h-10 w-10 rounded-full object-cover" />
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

      <button
        onClick={() => setShowSearch(!showSearch)}
        className="rounded-full p-2 text-text-secondary hover:bg-bg-hover"
        title="Search messages"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>

      <div className="relative">
        <button
          onClick={() => setShowTimerMenu(!showTimerMenu)}
          className={`rounded-full p-2 hover:bg-bg-hover ${
            conversation.disappearing_duration ? "text-signal-blue" : "text-text-secondary"
          }`}
          title="Disappearing messages"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z" />
          </svg>
        </button>
        {showTimerMenu && (
          <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-border-color bg-bg-primary py-1 shadow-lg">
            <p className="px-3 py-1.5 text-xs font-medium text-text-secondary">Disappear after</p>
            {DISAPPEARING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleTimerChange(opt.value)}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-sm hover:bg-bg-hover ${
                  (conversation.disappearing_duration || 0) === opt.value
                    ? "text-signal-blue font-medium"
                    : "text-text-primary"
                }`}
              >
                {opt.label}
                {(conversation.disappearing_duration || 0) === opt.value && (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {onInfoClick && (
        <button
          onClick={onInfoClick}
          className="rounded-full p-2 text-text-secondary hover:bg-bg-hover"
          title="Group info"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      )}

      {showSearch && (
        <div className="absolute left-0 top-full z-40 w-full border-b border-border-color bg-bg-primary px-4 py-2 shadow-sm animate-fade-in-up">
          <input
            type="text"
            placeholder="Search in conversation..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-lg bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
            autoFocus
          />
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto">
              {searchResults.map((msg) => (
                <div key={msg.id} className="rounded-lg px-3 py-2 hover:bg-bg-hover">
                  <p className="text-xs text-text-secondary">{msg.sender?.display_name}</p>
                  <p className="truncate text-sm text-text-primary">{msg.content}</p>
                </div>
              ))}
            </div>
          )}
          {searchQuery.length >= 2 && searchResults.length === 0 && (
            <p className="mt-2 text-center text-xs text-text-secondary">No results</p>
          )}
        </div>
      )}
    </div>
  );
}
