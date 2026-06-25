"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useChatStore } from "@/stores/chatStore";
import { User } from "@/types";
import { getInitials } from "@/lib/utils";

interface NewChatModalProps {
  onClose: () => void;
}

export default function NewChatModal({ onClose }: NewChatModalProps) {
  const router = useRouter();
  const { createConversation } = useChatStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await api.get<{ users: User[] }>(`/api/users/search?q=${encodeURIComponent(query)}`);
      setResults(data.users || data as unknown as User[]);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = async (user: User) => {
    try {
      const conv = await createConversation("direct", [user.id]);
      onClose();
      router.push(`/chat/${conv.id}`);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-bg-primary p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">New Conversation</h2>
          <button onClick={onClose} className="rounded-full p-1 text-text-secondary hover:bg-bg-hover">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <input
          type="text"
          placeholder="Search by username or name..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full rounded-lg border border-border-color bg-bg-input px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-signal-blue focus:outline-none"
          autoFocus
        />

        <div className="mt-3 max-h-72 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-signal-blue border-t-transparent" />
            </div>
          )}
          {!loading && results.length === 0 && searchQuery.length >= 2 && (
            <p className="py-4 text-center text-sm text-text-secondary">No users found</p>
          )}
          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-bg-hover"
            >
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-signal-blue-light text-sm font-medium text-signal-blue">
                  {getInitials(user.display_name)}
                </div>
              )}
              <div className="text-left">
                <p className="text-sm font-medium text-text-primary">{user.display_name}</p>
                <p className="text-xs text-text-secondary">@{user.username}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
