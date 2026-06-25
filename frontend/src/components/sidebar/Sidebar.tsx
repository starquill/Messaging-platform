"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import ConversationList from "./ConversationList";
import SidebarHeader from "./SidebarHeader";
import NewChatModal from "./NewChatModal";
import CreateGroupModal from "@/components/group/CreateGroupModal";

interface SidebarProps {
  wsSend: (event: string, data: Record<string, unknown>) => void;
}

export default function Sidebar({ wsSend }: SidebarProps) {
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <aside className="flex h-full w-80 flex-col border-r border-border-color bg-bg-sidebar">
      <SidebarHeader
        onNewChat={() => setShowNewChat(true)}
        onNewGroup={() => setShowCreateGroup(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <ConversationList searchQuery={searchQuery} />
      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
      {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} />}
    </aside>
  );
}
