"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useContactStore } from "@/stores/contactStore";
import { useChatStore } from "@/stores/chatStore";
import { getInitials } from "@/lib/utils";
import AddContactModal from "./AddContactModal";

export default function ContactList() {
  const router = useRouter();
  const { contacts, isLoading, fetchContacts, removeContact } = useContactStore();
  const { createConversation } = useChatStore();
  const [showAddContact, setShowAddContact] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleStartChat = async (contactUserId: string) => {
    try {
      const conv = await createConversation("direct", [contactUserId]);
      router.push(`/chat/${conv.id}`);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border-color px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">Contacts</h2>
        <button
          onClick={() => setShowAddContact(true)}
          className="rounded-full p-1.5 text-signal-blue hover:bg-bg-hover"
          title="Add contact"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-signal-blue border-t-transparent" />
          </div>
        )}

        {!isLoading && contacts.length === 0 && (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <p className="text-sm text-text-secondary">No contacts yet</p>
            <button
              onClick={() => setShowAddContact(true)}
              className="mt-2 text-sm font-medium text-signal-blue hover:underline"
            >
              Add your first contact
            </button>
          </div>
        )}

        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="group flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover"
          >
            {contact.contact?.avatar_url ? (
              <img src={contact.contact.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-signal-blue-light text-sm font-medium text-signal-blue">
                {getInitials(contact.contact?.display_name || "?")}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">
                {contact.nickname || contact.contact?.display_name || "Unknown"}
              </p>
              <p className="truncate text-xs text-text-secondary">
                @{contact.contact?.username}
              </p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
              <button
                onClick={() => handleStartChat(contact.contact_id)}
                className="rounded-full p-1.5 text-signal-blue hover:bg-bg-input"
                title="Message"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
                </svg>
              </button>
              <button
                onClick={() => removeContact(contact.id)}
                className="rounded-full p-1.5 text-danger hover:bg-bg-input"
                title="Remove"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAddContact && <AddContactModal onClose={() => setShowAddContact(false)} />}
    </div>
  );
}
