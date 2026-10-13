'use client';

import React from 'react';
import { STICKER_LIST, StickerItem } from '../../utils/stickers';
import { Sparkles } from 'lucide-react';
import { ModalShell } from '../Common/ModalShell';

interface StickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSticker: (sticker: StickerItem) => void;
  title?: string;
}

export const StickerPicker: React.FC<StickerPickerProps> = ({
  isOpen,
  onClose,
  onSelectSticker,
  title = 'Sticker Yapıştır',
}) => {
  const emojis = STICKER_LIST.filter((s) => s.category === 'emoji');
  const badges = STICKER_LIST.filter((s) => s.category === 'badge');

  const pick = (sticker: StickerItem) => {
    onSelectSticker(sticker);
    onClose();
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title={title} icon={<Sparkles className="w-4 h-4" />} size="sm">
      {/* Badges / Rozetler */}
      <div className="mb-5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Etiket & Rozet Stickerları</div>
        <div className="flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => pick(b)}
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
        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">İfade Stickerları</div>
        <div className="grid grid-cols-6 gap-2 p-1">
          {emojis.map((em) => (
            <button
              key={em.id}
              type="button"
              onClick={() => pick(em)}
              className="w-10 h-10 rounded-2xl bg-gray-50 hover:bg-purple-100/70 text-2xl flex items-center justify-center hover:scale-125 transition-transform active:scale-95 shadow-2xs"
              title={em.name}
              aria-label={em.name}
            >
              {em.content}
            </button>
          ))}
        </div>
      </div>
    </ModalShell>
  );
};
