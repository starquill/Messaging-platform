"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useChatStore } from "@/stores/chatStore";
import { User } from "@/types";
import { getInitials } from "@/lib/utils";

interface CreateGroupModalProps {
  onClose: () => void;
}

export default function CreateGroupModal({ onClose }: CreateGroupModalProps) {
  const router = useRouter();
  const { createConversation } = useChatStore();
  const [step, setStep] = useState<"details" | "members">("details");
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setResults([]);
      return;
    }
    try {
      const data = await api.get<{ users: User[] }>(`/api/users/search?q=${encodeURIComponent(query)}`);
      const users = data.users || (data as unknown as User[]);
      setResults(users.filter((u) => !selectedMembers.find((s) => s.id === u.id)));
    } catch {
      setResults([]);
    }
  };

  const toggleMember = (user: User) => {
    if (selectedMembers.find((m) => m.id === user.id)) {
      setSelectedMembers(selectedMembers.filter((m) => m.id !== user.id));
    } else {
      setSelectedMembers([...selectedMembers, user]);
      setResults(results.filter((r) => r.id !== user.id));
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    setLoading(true);
    try {
      const conv = await createConversation(
        "group",
        selectedMembers.map((m) => m.id),
        groupName.trim()
      );
      onClose();
      router.push(`/chat/${conv.id}`);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-bg-primary p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">
            {step === "details" ? "New Group" : "Add Members"}
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-text-secondary hover:bg-bg-hover">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === "details" ? (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full rounded-lg border border-border-color bg-bg-input px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-signal-blue focus:outline-none"
              autoFocus
            />
            <button
              onClick={() => setStep("members")}
              disabled={!groupName.trim()}
              className="w-full rounded-lg bg-signal-blue py-2.5 text-sm font-medium text-white hover:bg-signal-blue-dark disabled:opacity-50"
            >
              Next
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1 rounded-full bg-signal-blue-light px-2.5 py-1 text-xs text-signal-blue"
                  >
                    {m.display_name}
                    <button onClick={() => toggleMember(m)} className="ml-0.5 hover:text-signal-blue-dark">
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}

            <input
              type="text"
              placeholder="Search users to add..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-lg border border-border-color bg-bg-input px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-signal-blue focus:outline-none"
              autoFocus
            />

            <div className="max-h-48 overflow-y-auto">
              {results.map((user) => (
                <button
                  key={user.id}
                  onClick={() => toggleMember(user)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-bg-hover"
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-signal-blue-light text-xs font-medium text-signal-blue">
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

            <div className="flex gap-2">
              <button
                onClick={() => setStep("details")}
                className="flex-1 rounded-lg border border-border-color py-2.5 text-sm text-text-primary hover:bg-bg-hover"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || selectedMembers.length === 0}
                className="flex-1 rounded-lg bg-signal-blue py-2.5 text-sm font-medium text-white hover:bg-signal-blue-dark disabled:opacity-50"
              >
                {loading ? "Creating..." : `Create (${selectedMembers.length})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
