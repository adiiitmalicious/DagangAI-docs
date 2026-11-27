'use client';

import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

const TOAST_STYLES: Record<ToastType, { container: string; icon: ReactNode }> = {
  success: {
    container:
      'border-[#BBF7D0] bg-[var(--status-published-bg)] text-[var(--status-published-text)]',
    icon: <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  info: {
    container:
      'border-[var(--border-default)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]',
    icon: <Info className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  warning: {
    container:
      'border-[#FDE68A] bg-[var(--status-planned-bg)] text-[var(--status-planned-text)]',
    icon: <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  error: {
    container:
      'border-[#FECACA] bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]',
    icon: <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
      const duration = type === 'error' ? 6000 : 4000;
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-20 left-4 z-50 flex flex-col gap-2 md:top-4 md:right-4 md:bottom-auto md:left-auto md:w-[360px]"
      >
        {toasts.map((toast) => {
          const style = TOAST_STYLES[toast.type];
          return (
            <div
              key={toast.id}
              role="status"
              className={cn(
                'pointer-events-auto flex items-start gap-2.5 rounded-[12px] border px-3.5 py-3 text-[13px] font-medium shadow-[var(--shadow-floating)]',
                style.container
              )}
            >
              <span className="mt-0.5">{style.icon}</span>
              <p className="flex-1 leading-snug">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Tutup notifikasi"
                className="rounded p-0.5 opacity-75 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
