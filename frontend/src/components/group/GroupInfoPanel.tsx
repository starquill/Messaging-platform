"use client";

import { useState } from "react";
import { Conversation, ConversationMember, User } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { api } from "@/lib/api";
import { getInitials } from "@/lib/utils";
import AddMembersModal from "./AddMembersModal";

interface GroupInfoPanelProps {
  conversation: Conversation;
  onClose: () => void;
}

export default function GroupInfoPanel({ conversation, onClose }: GroupInfoPanelProps) {
  const { user } = useAuthStore();
  const { fetchConversations, setActiveConversation } = useChatStore();
  const [showAddMembers, setShowAddMembers] = useState(false);

  const members = conversation.members || [];
  const currentMember = members.find((m) => m.user_id === user?.id);
  const isAdmin = currentMember?.role === "admin";

  const handleRemoveMember = async (memberId: string) => {
    try {
      await api.delete(`/api/conversations/${conversation.id}/members/${memberId}`);
      await fetchConversations();
      const updated = await api.get<Conversation>(`/api/conversations/${conversation.id}`);
      setActiveConversation(updated);
    } catch {
      // ignore
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      await api.patch(`/api/conversations/${conversation.id}/members/${memberId}/role`, { role: newRole });
      await fetchConversations();
      const updated = await api.get<Conversation>(`/api/conversations/${conversation.id}`);
      setActiveConversation(updated);
    } catch {
      // ignore
    }
  };

  return (
    <>
      <div className="flex h-full w-80 flex-col border-l border-border-color bg-bg-primary">
        <div className="flex items-center justify-between border-b border-border-color px-4 py-3">
          <h3 className="text-sm font-semibold text-text-primary">Group Info</h3>
          <button onClick={onClose} className="rounded-full p-1 text-text-secondary hover:bg-bg-hover">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col items-center py-6">
            {conversation.avatar_url ? (
              <img src={conversation.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-signal-blue-light text-2xl font-semibold text-signal-blue">
                {getInitials(conversation.name || "G")}
              </div>
            )}
            <h2 className="mt-3 text-lg font-semibold text-text-primary">{conversation.name}</h2>
            <p className="text-sm text-text-secondary">{members.length} members</p>
          </div>

          <div className="border-t border-border-color px-4 py-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase text-text-secondary">Members</h4>
              {isAdmin && (
                <button
                  onClick={() => setShowAddMembers(true)}
                  className="rounded-full p-1 text-signal-blue hover:bg-bg-hover"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>

            <div className="mt-2 space-y-1">
              {members.map((member) => (
                <MemberItem
                  key={member.id}
                  member={member}
                  isAdmin={isAdmin}
                  isSelf={member.user_id === user?.id}
                  onRemove={() => handleRemoveMember(member.user_id)}
                  onChangeRole={(role) => handleChangeRole(member.user_id, role)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {showAddMembers && (
        <AddMembersModal
          conversationId={conversation.id}
          existingMemberIds={members.map((m) => m.user_id)}
          onClose={() => setShowAddMembers(false)}
          onAdded={async () => {
            await fetchConversations();
            const updated = await api.get<Conversation>(`/api/conversations/${conversation.id}`);
            setActiveConversation(updated);
          }}
        />
      )}
    </>
  );
}

function MemberItem({
  member,
  isAdmin,
  isSelf,
  onRemove,
  onChangeRole,
}: {
  member: ConversationMember;
  isAdmin: boolean;
  isSelf: boolean;
  onRemove: () => void;
  onChangeRole: (role: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const memberUser = member.user;

  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-bg-hover">
      {memberUser?.avatar_url ? (
        <img src={memberUser.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-signal-blue-light text-xs font-medium text-signal-blue">
          {getInitials(memberUser?.display_name || "?")}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-text-primary">
            {memberUser?.display_name || "Unknown"} {isSelf && "(You)"}
          </p>
          {member.role === "admin" && (
            <span className="rounded bg-signal-blue-light px-1.5 py-0.5 text-[10px] font-medium text-signal-blue">
              Admin
            </span>
          )}
        </div>
        <p className="truncate text-xs text-text-secondary">@{memberUser?.username}</p>
      </div>

      {isAdmin && !isSelf && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-full p-1 text-text-secondary opacity-0 hover:bg-bg-input group-hover:opacity-100"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-border-color bg-bg-primary py-1 shadow-lg">
              <button
                onClick={() => {
                  onChangeRole(member.role === "admin" ? "member" : "admin");
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-text-primary hover:bg-bg-hover"
              >
                {member.role === "admin" ? "Remove admin" : "Make admin"}
              </button>
              <button
                onClick={() => {
                  onRemove();
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-danger hover:bg-bg-hover"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
