"use client";

import { MessageStatusType } from "@/types";

interface MessageStatusIconProps {
  status: MessageStatusType;
}

export default function MessageStatusIcon({ status }: MessageStatusIconProps) {
  if (status === "sending") {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      </svg>
    );
  }

  if (status === "sent") {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="5 12 10 17 19 8" />
      </svg>
    );
  }

  if (status === "delivered") {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="2 12 7 17 13 8" />
        <polyline points="9 12 14 17 20 8" />
      </svg>
    );
  }

  // read
  return (
    <svg className="h-3.5 w-3.5 text-blue-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="2 12 7 17 13 8" />
      <polyline points="9 12 14 17 20 8" />
    </svg>
  );
}
