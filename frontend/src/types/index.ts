export interface User {
  id: string;
  phone: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  status_text: string;
  is_online: boolean;
  last_seen: string;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  contact_id: string;
  nickname: string | null;
  is_blocked: boolean;
  created_at: string;
  contact?: User;
}

export interface Conversation {
  id: string;
  type: "direct" | "group";
  name: string | null;
  avatar_url: string | null;
  created_by: string | null;
  disappearing_duration: number | null;
  created_at: string;
  updated_at: string;
  members?: ConversationMember[];
  last_message?: Message | null;
  unread_count?: number;
  other_user?: User;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  last_read_message_id: string | null;
  last_read_at: string | null;
  user?: User;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  type: "text" | "image" | "file" | "system";
  reply_to_id: string | null;
  is_edited: boolean;
  expires_at: string | null;
  created_at: string;
  sender?: User;
  reply_to?: Message | null;
  reactions?: Reaction[];
  attachments?: Attachment[];
  status?: MessageStatusType;
}

export type MessageStatusType = "sending" | "sent" | "delivered" | "read";

export interface MessageStatus {
  id: string;
  message_id: string;
  user_id: string;
  status: "sent" | "delivered" | "read";
  updated_at: string;
}

export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  message_id: string;
  filename: string;
  url: string;
  content_type: string;
  size: number;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface WSEvent {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}
