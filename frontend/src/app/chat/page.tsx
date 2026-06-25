"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

export default function ChatPage() {
  const router = useRouter();
  const { isAuthenticated, fetchUser, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!user) {
      fetchUser();
    }
  }, [isAuthenticated, user, fetchUser, router]);

  return (
    <div className="flex h-full items-center justify-center bg-bg-secondary">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-signal-blue-light">
          <svg className="h-10 w-10 text-signal-blue" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-text-primary">Signal</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Select a conversation to start messaging
        </p>
      </div>
    </div>
  );
}
