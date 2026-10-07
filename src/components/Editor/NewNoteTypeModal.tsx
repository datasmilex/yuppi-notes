'use client';

import React from 'react';
import { Copy, PenTool, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { NoteKind } from '../../types/note';

interface NewNoteTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (kind: NoteKind) => void;
}

export const NewNoteTypeModal: React.FC<NewNoteTypeModalProps> = ({
  isOpen,
  onClose,
  onSelectType,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-100 animate-scale-in"
      >
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Yeni Not Oluştur</h3>
              <p className="text-xs text-gray-500">Oluşturmak istediğiniz not türünü seçin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Option 1: Kopyalanabilir Pratik Not */}
          <button
            type="button"
            onClick={() => onSelectType('quick')}
            className="group flex flex-col items-start p-5 rounded-2xl border-2 border-amber-200/80 bg-amber-50/50 hover:bg-amber-100/70 hover:border-amber-400 hover:scale-[1.02] active:scale-[0.98] transition-all text-left shadow-xs hover:shadow-md"
          >
            <div className="p-3 rounded-2xl bg-amber-400 text-amber-950 mb-3 shadow-sm group-hover:rotate-6 transition-transform">
              <Copy className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-base text-gray-900 mb-1">
              Kopyalanabilir Not
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">
              Yalnızca metin, kalın, italik ve listeleme içeren; tek tıkla kopyalanabilen pratik post-it kartı.
            </p>
            <span className="mt-auto text-[11px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
              ⚡ Hızlı & Pratik
            </span>
          </button>

          {/* Option 2: Detaylı Not (Tam Sayfa) */}
          <button
            type="button"
            onClick={() => onSelectType('comprehensive')}
            className="group flex flex-col items-start p-5 rounded-2xl border-2 border-purple-200/80 bg-purple-50/50 hover:bg-purple-100/70 hover:border-purple-400 hover:scale-[1.02] active:scale-[0.98] transition-all text-left shadow-xs hover:shadow-md"
          >
            <div className="p-3 rounded-2xl bg-purple-600 text-white mb-3 shadow-sm group-hover:rotate-6 transition-transform">
              <PenTool className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-base text-gray-900 mb-1">
              Detaylı Not (Tam Sayfa)
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">
              Geniş çalışma alanı; zengin metin biçimlendirme, fosforlu vurgu, fotoğraflar ve çıkartmalar.
            </p>
            <span className="mt-auto text-[11px] font-bold text-purple-800 bg-purple-200/80 px-2 py-0.5 rounded-full">
              📝 Tam Sayfa & Zengin Editör
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
