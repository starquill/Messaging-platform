"use client";

import { useState } from "react";
import ConversationList from "./ConversationList";
import SidebarHeader from "./SidebarHeader";
import NewChatModal from "./NewChatModal";
import CreateGroupModal from "@/components/group/CreateGroupModal";
import ContactList from "@/components/contacts/ContactList";

interface SidebarProps {
  wsSend: (event: string, data: Record<string, unknown>) => void;
}

export default function Sidebar({ wsSend }: SidebarProps) {
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"chats" | "contacts">("chats");

  return (
    <aside className="flex h-full w-full flex-col border-r border-border-color bg-bg-sidebar">
      <SidebarHeader
        onNewChat={() => setShowNewChat(true)}
        onNewGroup={() => setShowCreateGroup(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="flex border-b border-border-color">
        <button
          onClick={() => setActiveTab("chats")}
          className={`flex-1 py-2 text-center text-xs font-medium transition-colors ${
            activeTab === "chats"
              ? "border-b-2 border-signal-blue text-signal-blue"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Chats
        </button>
        <button
          onClick={() => setActiveTab("contacts")}
          className={`flex-1 py-2 text-center text-xs font-medium transition-colors ${
            activeTab === "contacts"
              ? "border-b-2 border-signal-blue text-signal-blue"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Contacts
        </button>
      </div>

      {activeTab === "chats" ? (
        <ConversationList searchQuery={searchQuery} />
      ) : (
        <ContactList />
      )}

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
      {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} />}
    </aside>
  );
}
