'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const AUTO_DISMISS_MS = 4000;

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={18} className="text-emerald-400" aria-hidden="true" />,
  error: <AlertTriangle size={18} className="text-red-400" aria-hidden="true" />,
  info: <Info size={18} className="text-amber-400" aria-hidden="true" />,
};

const ACCENTS: Record<ToastType, string> = {
  success: 'border-emerald-500/30 shadow-[0_0_25px_-10px_rgba(16,185,129,0.6)]',
  error: 'border-red-500/30 shadow-[0_0_25px_-10px_rgba(239,68,68,0.6)]',
  info: 'border-amber-500/30 shadow-[0_0_25px_-10px_rgba(245,158,11,0.6)]',
};

/**
 * Accessible toast queue. Messages are announced through a polite live region
 * so screen reader users hear "Product added to bag" without losing focus.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, description }: Omit<ToastMessage, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((current) => [...current.slice(-2), { id, type, title, description }]);
      window.setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);
    },
    [dismissToast]
  );

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 top-3 z-[80] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto w-full max-w-sm animate-slideUp rounded-2xl border bg-surface/95 p-3.5 backdrop-blur-xl ${ACCENTS[toast.type]}`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex-shrink-0">{ICONS[toast.type]}</span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-snug text-white">{toast.title}</p>
                {toast.description && (
                  <p className="mt-0.5 text-xs leading-relaxed text-neutral-300">{toast.description}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="-m-1 rounded-lg p-1.5 text-neutral-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-orangeMoney"
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
