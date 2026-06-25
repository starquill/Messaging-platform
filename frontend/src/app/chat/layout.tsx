"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import Sidebar from "@/components/sidebar/Sidebar";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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

  const isInConversation = pathname !== "/chat";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-primary">
      <div className={`${isInConversation ? "hidden md:flex" : "flex"} h-full w-full md:w-80 flex-shrink-0`}>
        <Sidebar wsSend={send} />
      </div>
      <main className={`${isInConversation ? "flex" : "hidden md:flex"} flex-1 flex-col overflow-hidden`}>
        {children}
      </main>
    </div>
  );
}
