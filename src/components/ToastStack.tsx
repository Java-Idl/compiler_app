import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type ToastType = "success" | "info" | "warning" | "error";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export function useToastQueue() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  function showToast(message: string, type: ToastType = "info") {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
  }

  function removeToast(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  return { toasts, showToast, removeToast };
}

function ToastCard({ toast, onRemove }: { toast: ToastItem; onRemove: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onRemove, 3000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  const bgColor = {
    success: "bg-emerald-50 border-emerald-200",
    info: "bg-blue-50 border-blue-200",
    warning: "bg-amber-50 border-amber-200",
    error: "bg-red-50 border-red-200",
  }[toast.type];

  const textColor = {
    success: "text-emerald-700",
    info: "text-blue-700",
    warning: "text-amber-700",
    error: "text-red-700",
  }[toast.type];

  const iconColor = {
    success: "text-emerald-600",
    info: "text-blue-600",
    warning: "text-amber-600",
    error: "text-red-600",
  }[toast.type];

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return (
          <svg className={`w-4 h-4 ${iconColor}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="13.78 4.22a.75.75 0 0 1 1.06 1.06l-7.5 7.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06L7.5 10.94z" />
          </svg>
        );
      case "error":
        return (
          <svg className={`w-4 h-4 ${iconColor}`} viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <line x1="8" y1="4" x2="8" y2="9" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="8" cy="12" r="0.5" fill="currentColor" />
          </svg>
        );
      case "warning":
        return (
          <svg className={`w-4 h-4 ${iconColor}`} viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1L1 14h14L8 1z" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <line x1="8" y1="5" x2="8" y2="10" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="8" cy="12" r="0.4" fill="currentColor" />
          </svg>
        );
      case "info":
      default:
        return (
          <svg className={`w-4 h-4 ${iconColor}`} viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="8" cy="5" r="0.4" fill="currentColor" />
            <line x1="8" y1="7" x2="8" y2="11" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      className={`border rounded-lg px-3 py-2 text-[11px] font-black uppercase tracking-widest ${bgColor} ${textColor} flex items-center gap-2 min-w-max pointer-events-auto shadow-sm`}
    >
      {getIcon()}
      <span>{toast.message}</span>
    </motion.div>
  );
}

export function ToastStack({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: string) => void }) {
  return (
    <AnimatePresence initial={false}>
      <div className="fixed bottom-4 left-4 flex flex-col gap-2 pointer-events-auto z-50">
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <ToastCard toast={toast} onRemove={() => onRemove(toast.id)} />
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
}
