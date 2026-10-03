"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";

export interface ToastData {
  message: string;
  type: "success" | "error";
}

interface GameToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
}

export default function GameToast({ toast, onDismiss }: GameToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 200);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div
      className={`fixed top-20 left-1/2 z-50 pointer-events-none ${
        visible ? "animate-toast-in" : "animate-toast-out"
      }`}
    >
      <div
        className={`glass-card rounded-2xl px-4 py-3 shadow-xl flex items-center gap-2.5 min-w-[200px] ${
          toast.type === "success"
            ? "border-green-500/30"
            : "border-red-500/30"
        }`}
      >
        {toast.type === "success" ? (
          <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
        )}
        <span className="text-sm font-medium text-white">{toast.message}</span>
      </div>
    </div>
  );
}
