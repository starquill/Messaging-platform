"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import Sidebar from "@/components/sidebar/Sidebar";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user, fetchUser } = useAuthStore();
  const { fetchConversations } = useChatStore();
  const { send } = useWebSocket();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!user) {
      fetchUser();
    }
    fetchConversations();
  }, [isAuthenticated, user, fetchUser, fetchConversations, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-primary">
      <Sidebar wsSend={send} />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
