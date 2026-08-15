"use client";

import { useEffect } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error";
  message: string;
}

interface MediaToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function MediaToast({ toasts, onDismiss }: MediaToastProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  useEffect(() => {
    if (toast.type === "success") {
      const timer = setTimeout(() => onDismiss(toast.id), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.type, onDismiss]);

  const bgClass = toast.type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200";
  const iconClass = toast.type === "success" ? "text-green-500" : "text-red-500";
  const textClass = toast.type === "success" ? "text-green-800" : "text-red-800";

  return (
    <div className={`${bgClass} border rounded-lg p-3 shadow-lg flex items-start gap-2 animate-in slide-in-from-right`}>
      {toast.type === "success" ? (
        <CheckCircle className={`h-4 w-4 mt-0.5 shrink-0 ${iconClass}`} />
      ) : (
        <XCircle className={`h-4 w-4 mt-0.5 shrink-0 ${iconClass}`} />
      )}
      <p className={`text-sm flex-1 ${textClass}`}>{toast.message}</p>
      <button onClick={() => onDismiss(toast.id)} className="shrink-0 text-gray-400 hover:text-gray-600">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function createToast(type: "success" | "error", message: string): ToastMessage {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, type, message };
}