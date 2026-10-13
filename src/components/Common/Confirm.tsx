'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { ModalShell } from './ModalShell';

interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

/** window.confirm yerine uygulamanın görünümüne uyan, Promise döndüren onay penceresi. */
export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    resolverRef.current?.(false);
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ModalShell
        isOpen={options !== null}
        onClose={() => settle(false)}
        title={options?.title ?? ''}
        size="sm"
        icon={options?.danger ? <AlertTriangle className="w-5 h-5 text-red-600" /> : <HelpCircle className="w-5 h-5" />}
        footer={
          <>
            <button
              type="button"
              onClick={() => settle(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {options?.cancelLabel ?? 'Vazgeç'}
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => settle(true)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-transform active:scale-95 ${
                options?.danger ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-ink hover:bg-ink/85 text-on-ink'
              }`}
            >
              {options?.confirmLabel ?? 'Onayla'}
            </button>
          </>
        }
      >
        {options?.message && <div className="text-sm text-gray-600 leading-relaxed">{options.message}</div>}
      </ModalShell>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
