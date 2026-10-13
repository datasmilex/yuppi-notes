'use client';

import React from 'react';
import { Copy, PenTool, Sparkles, LayoutTemplate } from 'lucide-react';
import { NoteKind, NoteSeed } from '../../types/note';
import { ModalShell } from '../Common/ModalShell';
import { NOTE_TEMPLATES } from '../../utils/templates';
import { NOTE_COLORS } from '../../utils/colors';

interface NewNoteTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (kind: NoteKind) => void;
  onSelectTemplate: (seed: NoteSeed) => void;
}

export const NewNoteTypeModal: React.FC<NewNoteTypeModalProps> = ({
  isOpen,
  onClose,
  onSelectType,
  onSelectTemplate,
}) => {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Yeni Not Oluştur"
      subtitle="Boş bir not aç ya da hazır bir şablonla başla"
      icon={<Sparkles className="w-5 h-5" />}
      size="xl"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Option 1: Kopyalanabilir Pratik Not */}
        <button
          type="button"
          onClick={() => onSelectType('quick')}
          className="paper-scope group flex flex-col items-start p-5 rounded-2xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 hover:scale-[1.02] active:scale-[0.98] transition-all text-left shadow-xs hover:shadow-md"
        >
          <div className="p-3 rounded-2xl bg-amber-400 text-amber-950 mb-3 shadow-sm group-hover:rotate-6 transition-transform">
            <Copy className="w-6 h-6" />
          </div>
          <h4 className="font-extrabold text-base text-gray-900 mb-1">Kopyalanabilir Not</h4>
          <p className="text-xs text-gray-600 leading-relaxed mb-3">
            Tek tıkla kopyalanabilen pratik post-it kartı. Adresler, şifre ipuçları, sık kullanılan metinler için.
          </p>
          <span className="mt-auto text-[11px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
            ⚡ Hızlı & Pratik
          </span>
        </button>

        {/* Option 2: Detaylı Not (Tam Sayfa) */}
        <button
          type="button"
          onClick={() => onSelectType('comprehensive')}
          className="paper-scope group flex flex-col items-start p-5 rounded-2xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-400 hover:scale-[1.02] active:scale-[0.98] transition-all text-left shadow-xs hover:shadow-md"
        >
          <div className="p-3 rounded-2xl bg-purple-600 text-white mb-3 shadow-sm group-hover:rotate-6 transition-transform">
            <PenTool className="w-6 h-6" />
          </div>
          <h4 className="font-extrabold text-base text-gray-900 mb-1">Detaylı Not (Tam Sayfa)</h4>
          <p className="text-xs text-gray-600 leading-relaxed mb-3">
            Zengin biçimlendirme, yapılacaklar, bağlantılar, fotoğraf, çizim, sesle yazma ve hatırlatıcılar.
          </p>
          <span className="mt-auto text-[11px] font-bold text-purple-800 bg-purple-200/80 px-2 py-0.5 rounded-full">
            📝 Tam Sayfa & Zengin Editör
          </span>
        </button>
      </div>

      <div className="mt-7">
        <div className="flex items-center gap-2 mb-3">
          <LayoutTemplate className="w-4 h-4 text-gray-400" />
          <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">Şablondan başla</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {NOTE_TEMPLATES.map((t) => {
            const seed = t.build();
            const color = NOTE_COLORS[seed.color || 'yellow'];
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTemplate(seed)}
                className="paper-scope group flex items-start gap-2.5 p-3 rounded-2xl border-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                style={{ backgroundColor: color.cardBg, borderColor: color.borderHex }}
              >
                <span className="text-2xl leading-none group-hover:scale-110 transition-transform">{t.emoji}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold text-gray-900 truncate">{t.name}</span>
                  <span className="block text-[11px] text-gray-600 leading-snug line-clamp-2">{t.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
};
