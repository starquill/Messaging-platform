"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  addToast: (message, type = "info") => {
    const id = crypto.randomUUID();
    set({ toasts: [...get().toasts, { id, message, type }] });
    setTimeout(() => get().removeToast(id), 3000);
  },
  removeToast: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setShow(true));
    const timer = setTimeout(() => setShow(false), 2700);
    return () => clearTimeout(timer);
  }, []);

  const colors = {
    success: "bg-online-green text-white",
    error: "bg-danger text-white",
    info: "bg-bg-primary text-text-primary border border-border-color",
  };

  return (
    <div
      onClick={onDismiss}
      className={`cursor-pointer rounded-xl px-4 py-3 shadow-lg transition-all duration-300 ${colors[toast.type]} ${
        show ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
      }`}
    >
      <p className="text-sm font-medium">{toast.message}</p>
    </div>
  );
}
