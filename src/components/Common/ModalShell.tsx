'use client';

import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useEscape } from '../../hooks/useEscape';

const SIZES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-2xl',
  '2xl': 'sm:max-w-4xl',
} as const;

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  size?: keyof typeof SIZES;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Başlık şeridi olmadan yalnızca içerik (ör. komut paleti). */
  bare?: boolean;
  align?: 'center' | 'top';
  bodyClassName?: string;
}

/**
 * Ortak pencere kabuğu: mobilde alttan açılan sayfa, masaüstünde ortalanmış kart.
 * Esc ile kapanır, kapanınca odağı açan düğmeye geri verir.
 */
export const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = 'md',
  footer,
  children,
  bare = false,
  align = 'center',
  bodyClassName = 'p-5 sm:p-6',
}) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useEscape(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    // İçeride autoFocus'lu bir alan yoksa paneli odakla (klavye ile gezinme pencere içinde başlasın)
    const raf = requestAnimationFrame(() => {
      if (panelRef.current && !panelRef.current.contains(document.activeElement)) panelRef.current.focus();
    });
    return () => {
      cancelAnimationFrame(raf);
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[55] flex justify-center sm:p-4 animate-fade-in ${
        align === 'top' ? 'items-start pt-[12vh] px-3' : 'items-end sm:items-center'
      }`}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative w-full ${SIZES[size]} max-h-[92dvh] flex flex-col bg-white shadow-2xl border border-gray-100 outline-hidden ${
          align === 'top' ? 'rounded-3xl animate-scale-in' : 'rounded-t-3xl sm:rounded-3xl animate-slide-up sm:animate-scale-in'
        }`}
      >
        {bare ? (
          <h2 id={titleId} className="sr-only">
            {title}
          </h2>
        ) : (
          <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {icon && <span className="p-2 rounded-2xl bg-purple-100 text-purple-700 flex-shrink-0">{icon}</span>}
              <div className="min-w-0">
                <h2 id={titleId} className="text-lg font-extrabold text-gray-900 truncate">
                  {title}
                </h2>
                {subtitle && <div className="text-xs text-gray-500 truncate">{subtitle}</div>}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto ${bodyClassName}`}>{children}</div>

        {footer && (
          <div className="px-5 sm:px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4 border-t border-gray-100 flex items-center justify-end gap-2.5 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
