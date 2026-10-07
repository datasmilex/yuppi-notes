'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  icon?: string;
  action?: ToastAction;
}

interface ToastOptions {
  icon?: string;
  action?: ToastAction;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, iconOrOptions?: string | ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success', iconOrOptions?: string | ToastOptions) => {
      const options: ToastOptions = typeof iconOrOptions === 'string' ? { icon: iconOrOptions } : iconOrOptions || {};
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev.slice(-3), { id, message, type, icon: options.icon, action: options.action }]);
      timers.current.set(
        id,
        setTimeout(() => removeToast(id), options.duration ?? (options.action ? 6000 : 3200))
      );
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed right-0 z-[60] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4"
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-2 p-3.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 animate-slide-up ${
              toast.type === 'error'
                ? 'bg-red-50/95 border-red-200 text-red-900'
                : toast.type === 'info'
                ? 'bg-blue-50/95 border-blue-200 text-blue-900'
                : 'bg-emerald-50/95 border-emerald-200 text-emerald-950'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {toast.icon ? (
                <span className="text-xl">{toast.icon}</span>
              ) : toast.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              ) : toast.type === 'info' ? (
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              )}
              <span className="text-sm font-semibold tracking-wide">{toast.message}</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action?.onClick();
                    removeToast(toast.id);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-black/10 hover:bg-black/20 transition-colors"
                >
                  {toast.action.label}
                </button>
              )}
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition-colors"
                aria-label="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
