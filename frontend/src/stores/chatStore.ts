import { create } from "zustand";
import { api } from "@/lib/api";
import { Conversation, Message } from "@/types";

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Record<string, Message[]>;
  hasMore: Record<string, boolean>;
  cursors: Record<string, string | null>;
  typingUsers: Record<string, { user_id: string; display_name: string }[]>;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;

  fetchConversations: () => Promise<void>;
  setActiveConversation: (conv: Conversation | null) => void;
  fetchMessages: (conversationId: string, loadMore?: boolean) => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessageStatus: (conversationId: string, messageId: string, status: string) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  updateConversation: (conversation: Conversation) => void;
  setTyping: (conversationId: string, userId: string, displayName: string, isTyping: boolean) => void;
  createConversation: (type: string, memberIds: string[], name?: string) => Promise<Conversation>;
  markAsRead: (conversationId: string) => void;
  addReaction: (conversationId: string, messageId: string, reaction: { id: string; user_id: string; emoji: string; created_at: string; message_id?: string }) => void;
  removeReaction: (conversationId: string, messageId: string, userId: string, emoji: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: {},
  hasMore: {},
  cursors: {},
  typingUsers: {},
  isLoadingConversations: false,
  isLoadingMessages: false,

  fetchConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const conversations = await api.get<Conversation[]>("/api/conversations");
      set({ conversations, isLoadingConversations: false });
    } catch {
      set({ isLoadingConversations: false });
    }
  },

  setActiveConversation: (conv) => {
    set({ activeConversation: conv });
  },

  fetchMessages: async (conversationId, loadMore = false) => {
    const { cursors, messages } = get();
    if (!loadMore) {
      set({ isLoadingMessages: true });
    }

    const cursor = loadMore ? cursors[conversationId] : null;
    const params = cursor ? `?cursor=${cursor}&limit=50` : "?limit=50";

    try {
      const data = await api.get<{ messages: Message[]; has_more: boolean; next_cursor: string | null }>(
        `/api/conversations/${conversationId}/messages${params}`
      );

      const existing = loadMore ? (messages[conversationId] || []) : [];
      const newMessages = loadMore ? [...data.messages, ...existing] : data.messages;

      set({
        messages: { ...get().messages, [conversationId]: newMessages },
        hasMore: { ...get().hasMore, [conversationId]: data.has_more },
        cursors: { ...get().cursors, [conversationId]: data.next_cursor },
        isLoadingMessages: false,
      });
    } catch {
      set({ isLoadingMessages: false });
    }
  },

  addMessage: (message) => {
    const { messages, conversations, activeConversation } = get();
    const convId = message.conversation_id;

    const existing = messages[convId] || [];
    const alreadyExists = existing.some((m) => m.id === message.id);
    if (alreadyExists) return;

    set({
      messages: { ...messages, [convId]: [...existing, message] },
    });

    const updatedConversations = conversations.map((c) => {
      if (c.id === convId) {
        return {
          ...c,
          last_message: message,
          updated_at: message.created_at,
          unread_count:
            activeConversation?.id === convId
              ? c.unread_count
              : (c.unread_count || 0) + 1,
        };
      }
      return c;
    });

    updatedConversations.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    set({ conversations: updatedConversations });
  },

  updateMessageStatus: (conversationId, messageId, status) => {
    const { messages } = get();
    const convMessages = messages[conversationId] || [];
    set({
      messages: {
        ...messages,
        [conversationId]: convMessages.map((m) =>
          m.id === messageId ? { ...m, status: status as Message["status"] } : m
        ),
      },
    });
  },

  deleteMessage: (conversationId, messageId) => {
    const { messages } = get();
    const convMessages = messages[conversationId] || [];
    set({
      messages: {
        ...messages,
        [conversationId]: convMessages.filter((m) => m.id !== messageId),
      },
    });
  },

  updateConversation: (conversation) => {
    const { conversations } = get();
    const exists = conversations.find((c) => c.id === conversation.id);
    if (exists) {
      set({
        conversations: conversations.map((c) =>
          c.id === conversation.id ? { ...c, ...conversation } : c
        ),
      });
    } else {
      set({ conversations: [conversation, ...conversations] });
    }
  },

  setTyping: (conversationId, userId, displayName, isTyping) => {
    const { typingUsers } = get();
    const current = typingUsers[conversationId] || [];
    if (isTyping) {
      if (!current.find((u) => u.user_id === userId)) {
        set({
          typingUsers: {
            ...typingUsers,
            [conversationId]: [...current, { user_id: userId, display_name: displayName }],
          },
        });
      }
    } else {
      set({
        typingUsers: {
          ...typingUsers,
          [conversationId]: current.filter((u) => u.user_id !== userId),
        },
      });
    }
  },

  createConversation: async (type, memberIds, name) => {
    const conversation = await api.post<Conversation>("/api/conversations", {
      type,
      member_ids: memberIds,
      name,
    });
    const { conversations } = get();
    set({ conversations: [conversation, ...conversations], activeConversation: conversation });
    return conversation;
  },

  markAsRead: (conversationId) => {
    const { conversations } = get();
    set({
      conversations: conversations.map((c) =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      ),
    });
  },

  addReaction: (conversationId, messageId, reaction) => {
    const { messages } = get();
    const convMessages = messages[conversationId] || [];
    const fullReaction = { ...reaction, message_id: reaction.message_id || messageId };
    set({
      messages: {
        ...messages,
        [conversationId]: convMessages.map((m) =>
          m.id === messageId
            ? { ...m, reactions: [...(m.reactions || []), fullReaction] }
            : m
        ),
      },
    });
  },

  removeReaction: (conversationId, messageId, userId, emoji) => {
    const { messages } = get();
    const convMessages = messages[conversationId] || [];
    set({
      messages: {
        ...messages,
        [conversationId]: convMessages.map((m) =>
          m.id === messageId
            ? {
                ...m,
                reactions: (m.reactions || []).filter(
                  (r) => !(r.user_id === userId && r.emoji === emoji)
                ),
              }
            : m
        ),
      },
    });
  },
}));
