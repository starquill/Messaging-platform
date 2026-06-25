"use client";

interface TypingIndicatorProps {
  users: { user_id: string; display_name: string }[];
}

export default function TypingIndicator({ users }: TypingIndicatorProps) {
  const names = users.map((u) => u.display_name);
  let text = "";
  if (names.length === 1) {
    text = `${names[0]} is typing`;
  } else if (names.length === 2) {
    text = `${names[0]} and ${names[1]} are typing`;
  } else {
    text = `${names.length} people are typing`;
  }

  return (
    <div className="mb-1 flex items-center gap-2">
      <div className="flex gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-text-secondary [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-text-secondary [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-text-secondary [animation-delay:300ms]" />
      </div>
      <span className="text-xs text-text-secondary">{text}</span>
    </div>
  );
}
