"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { User } from "@/types";
import { getInitials } from "@/lib/utils";

interface AddMembersModalProps {
  conversationId: string;
  existingMemberIds: string[];
  onClose: () => void;
  onAdded: () => void;
}

export default function AddMembersModal({ conversationId, existingMemberIds, onClose, onAdded }: AddMembersModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [adding, setAdding] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setResults([]);
      return;
    }
    try {
      const data = await api.get<{ users: User[] }>(`/api/users/search?q=${encodeURIComponent(query)}`);
      const users = data.users || (data as unknown as User[]);
      setResults(users.filter((u) => !existingMemberIds.includes(u.id)));
    } catch {
      setResults([]);
    }
  };

  const handleAdd = async (user: User) => {
    setAdding(user.id);
    try {
      await api.post(`/api/conversations/${conversationId}/members`, { user_id: user.id });
      setResults(results.filter((r) => r.id !== user.id));
      onAdded();
    } catch {
      // ignore
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-bg-primary p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Add Members</h2>
          <button onClick={onClose} className="rounded-full p-1 text-text-secondary hover:bg-bg-hover">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full rounded-lg border border-border-color bg-bg-input px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-signal-blue focus:outline-none"
          autoFocus
        />

        <div className="mt-3 max-h-60 overflow-y-auto">
          {results.length === 0 && searchQuery.length >= 2 && (
            <p className="py-4 text-center text-sm text-text-secondary">No users found</p>
          )}
          {results.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-bg-hover"
            >
              <div className="flex items-center gap-3">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-signal-blue-light text-xs font-medium text-signal-blue">
                    {getInitials(user.display_name)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-text-primary">{user.display_name}</p>
                  <p className="text-xs text-text-secondary">@{user.username}</p>
                </div>
              </div>
              <button
                onClick={() => handleAdd(user)}
                disabled={adding === user.id}
                className="rounded-lg bg-signal-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-signal-blue-dark disabled:opacity-50"
              >
                {adding === user.id ? "..." : "Add"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
