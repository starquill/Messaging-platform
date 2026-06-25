"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";

interface SidebarHeaderProps {
  onNewChat: () => void;
  onNewGroup: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function SidebarHeader({ onNewChat, onNewGroup, searchQuery, onSearchChange }: SidebarHeaderProps) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="flex flex-col gap-3 border-b border-border-color px-4 py-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">Signal</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewChat}
            className="rounded-full p-2 text-text-secondary hover:bg-bg-hover"
            title="New chat"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={onNewGroup}
            className="rounded-full p-2 text-text-secondary hover:bg-bg-hover"
            title="New group"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-full p-2 text-text-secondary hover:bg-bg-hover"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-border-color bg-bg-primary py-1 shadow-lg">
                <div className="border-b border-border-color px-4 py-2">
                  <p className="text-sm font-medium text-text-primary">{user?.display_name}</p>
                  <p className="text-xs text-text-secondary">@{user?.username}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-bg-hover"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg bg-bg-input py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
        />
      </div>
    </div>
  );
}
