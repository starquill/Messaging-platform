"use client";

import { useEffect } from "react";

interface ShortcutHandlers {
  onNewChat?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts({ onNewChat, onEscape }: ShortcutHandlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (e.key === "Escape" && onEscape) {
        onEscape();
        return;
      }

      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        onNewChat?.();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onNewChat, onEscape]);
}
