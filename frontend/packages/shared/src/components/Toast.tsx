import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 pointer-events-none max-w-[calc(100vw-2rem)]"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(toast.duration ?? 4500);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    const duration = toast.duration ?? 4500;
    if (duration <= 0 || paused) return;

    startRef.current = Date.now();
    const timer = window.setTimeout(() => {
      onRemove(toast.id);
    }, remainingRef.current);

    return () => {
      window.clearTimeout(timer);
      const elapsed = Date.now() - startRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    };
  }, [toast.id, toast.duration, paused, onRemove]);

  const styles = {
    success: {
      container: 'border-[var(--bh-emerald-border)] bg-[var(--surface)]',
      iconWrap: 'bg-[var(--bh-emerald-soft)] text-[var(--bh-emerald)]',
      icon: <CheckCircle className="w-4 h-4" />,
    },
    error: {
      container: 'border-[#F4C6C6] bg-[var(--surface)]',
      iconWrap: 'bg-[var(--danger-soft)] text-[var(--danger)]',
      icon: <AlertCircle className="w-4 h-4" />,
    },
    warning: {
      container: 'border-[var(--bh-buttercup-border)] bg-[var(--surface)]',
      iconWrap: 'bg-[var(--bh-buttercup-soft)] text-[#7D5B00]',
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    info: {
      container: 'border-[#C6DCE5] bg-[var(--surface)]',
      iconWrap: 'bg-[var(--bh-nile-soft)] text-[var(--bh-nile)]',
      icon: <Info className="w-4 h-4" />,
    },
  }[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 40, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-[var(--elev-raised)] max-w-md ${styles.container}`}
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <div className={`shrink-0 p-1.5 rounded-lg mt-0.5 ${styles.iconWrap}`}>{styles.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[var(--fg)] leading-snug">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">{toast.message}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className="shrink-0 p-1 text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-subtle)] rounded-lg transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
