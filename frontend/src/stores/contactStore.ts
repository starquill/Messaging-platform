import { create } from "zustand";
import { api } from "@/lib/api";
import { Contact } from "@/types";

interface ContactState {
  contacts: Contact[];
  isLoading: boolean;
  fetchContacts: () => Promise<void>;
  addContact: (contactId: string, nickname?: string) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  updateContact: (id: string, data: { nickname?: string; is_blocked?: boolean }) => Promise<void>;
}

export const useContactStore = create<ContactState>((set, get) => ({
  contacts: [],
  isLoading: false,

  fetchContacts: async () => {
    set({ isLoading: true });
    try {
      const contacts = await api.get<Contact[]>("/api/contacts");
      set({ contacts, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addContact: async (contactId, nickname) => {
    const contact = await api.post<Contact>("/api/contacts", { contact_id: contactId, nickname });
    set({ contacts: [...get().contacts, contact] });
  },

  removeContact: async (id) => {
    await api.delete(`/api/contacts/${id}`);
    set({ contacts: get().contacts.filter((c) => c.id !== id) });
  },

  updateContact: async (id, data) => {
    const updated = await api.patch<Contact>(`/api/contacts/${id}`, data);
    set({ contacts: get().contacts.map((c) => (c.id === id ? updated : c)) });
  },
}));
