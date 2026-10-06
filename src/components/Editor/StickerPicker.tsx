'use client';

import React from 'react';
import { STICKER_LIST, StickerItem } from '../../utils/stickers';
import { Smile, X, Sparkles } from 'lucide-react';

interface StickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSticker: (sticker: StickerItem) => void;
}

export const StickerPicker: React.FC<StickerPickerProps> = ({
  isOpen,
  onClose,
  onSelectSticker,
}) => {
  if (!isOpen) return null;

  const emojis = STICKER_LIST.filter((s) => s.category === 'emoji');
  const badges = STICKER_LIST.filter((s) => s.category === 'badge');

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-gray-100 animate-scale-in"
      >
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-purple-100 text-purple-700">
              <Sparkles className="w-4 h-4" />
            </span>
            <h4 className="text-sm font-bold text-gray-900">Sticker Yapıştır</h4>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Badges / Rozetler */}
        <div className="mb-4">
          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
            Etiket & Rozet Stickerları
          </label>
          <div className="flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  onSelectSticker(b);
                  onClose();
                }}
                className="px-2.5 py-1 rounded-xl text-xs font-black shadow-xs hover:scale-105 active:scale-95 transition-transform border border-black/5"
                style={{ backgroundColor: b.bg, color: b.color }}
              >
                {b.content}
              </button>
            ))}
          </div>
        </div>

        {/* Emojis */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
            İfade Stickerları
          </label>
          <div className="grid grid-cols-6 gap-2 p-1">
            {emojis.map((em) => (
              <button
                key={em.id}
                type="button"
                onClick={() => {
                  onSelectSticker(em);
                  onClose();
                }}
                className="w-10 h-10 rounded-2xl bg-gray-50 hover:bg-purple-100/70 text-2xl flex items-center justify-center hover:scale-125 transition-transform active:scale-95 shadow-2xs"
                title={em.name}
              >
                {em.content}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
