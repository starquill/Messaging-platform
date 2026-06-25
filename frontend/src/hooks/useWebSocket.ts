"use client";

import { useEffect, useRef, useCallback } from "react";
import { WS_URL } from "@/lib/constants";
import { api } from "@/lib/api";
import { useChatStore } from "@/stores/chatStore";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const {
    addMessage,
    updateMessageStatus,
    deleteMessage,
    setTyping,
    addReaction,
    removeReaction,
  } = useChatStore();

  const connect = useCallback(() => {
    const token = api.getAccessToken();
    if (!token) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const { event: eventType, data } = JSON.parse(event.data);
        handleEvent(eventType, data);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = (event) => {
      wsRef.current = null;
      if (event.code !== 4001) {
        const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
        reconnectAttempts.current++;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  const handleEvent = useCallback(
    (eventType: string, data: Record<string, unknown>) => {
      switch (eventType) {
        case "message.new":
        case "message.sent":
          addMessage(data as never);
          break;
        case "message.status":
          updateMessageStatus(
            data.conversation_id as string,
            data.message_id as string,
            data.status as string
          );
          break;
        case "message.deleted":
          deleteMessage(data.conversation_id as string, data.message_id as string);
          break;
        case "typing.indicator":
          setTyping(
            data.conversation_id as string,
            data.user_id as string,
            data.display_name as string,
            data.is_typing as boolean
          );
          break;
        case "reaction.updated":
          if (data.action === "add") {
            addReaction(
              data.conversation_id as string,
              data.message_id as string,
              data.reaction as { id: string; user_id: string; emoji: string; created_at: string }
            );
          } else {
            const reaction = data.reaction as { user_id: string; emoji: string };
            removeReaction(
              data.conversation_id as string,
              data.message_id as string,
              reaction.user_id,
              reaction.emoji
            );
          }
          break;
      }
    },
    [addMessage, updateMessageStatus, deleteMessage, setTyping, addReaction, removeReaction]
  );

  const send = useCallback((event: string, data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, data }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { send, disconnect, connect };
}
