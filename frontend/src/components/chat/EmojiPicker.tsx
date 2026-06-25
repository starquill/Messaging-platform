"use client";

import { useEffect, useRef } from "react";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉", "👎", "💯"];

interface EmojiPickerProps {
  position: { x: number; y: number };
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ position, onSelect, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        ref.current.style.left = `${position.x - rect.width}px`;
      }
      if (rect.bottom > window.innerHeight) {
        ref.current.style.top = `${position.y - rect.height}px`;
      }
    }
  }, [position]);

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded-xl border border-border-color bg-bg-primary p-2 shadow-xl"
      style={{ top: position.y, left: position.x }}
    >
      <div className="flex gap-1">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg hover:bg-bg-hover transition-transform hover:scale-125"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
