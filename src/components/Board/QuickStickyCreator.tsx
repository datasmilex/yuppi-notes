'use client';

import React, { useState } from 'react';
import { useNotes } from '../../context/NotesContext';
import { useToast } from '../Common/Toast';
import { NoteColor } from '../../types/note';
import { NOTE_COLORS } from '../../utils/colors';
import { plainTextToHtml } from '../../utils/text';
import { StickyNote, Check } from 'lucide-react';

export const QuickStickyCreator: React.FC = () => {
  const { createNote, activeFolderId, activeScope } = useNotes();
  const { showToast } = useToast();

  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState<NoteColor>('yellow');

  const handlePost = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = content.trim();
    if (!text) return;

    // İlk satır başlık olur, kalanı içerik
    const [firstLine, ...rest] = text.split(/\r?\n/);
    createNote({
      title: firstLine.trim().slice(0, 80),
      content: plainTextToHtml(rest.join('\n').trim()),
      color: selectedColor,
      font: 'handwriting',
      folderId: activeFolderId,
      isPinned: false,
      isSticky: true,
      scope: activeScope,
      images: [],
      stickers: ['📌'],
    });

    setContent('');
    setIsExpanded(false);
    showToast('Yapışkan not panoya iliştirildi! 📌', 'success');
  };

  const colorConfig = NOTE_COLORS[selectedColor];

  if (!isExpanded) {
    return (
      <div>
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full py-4 px-5 rounded-3xl border-2 border-dashed border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center justify-center gap-2.5 font-bold text-xs sm:text-sm transition-all hover:scale-[1.01] active:scale-[0.99] shadow-2xs group"
        >
          <span className="p-1.5 rounded-xl bg-amber-200 text-amber-900 group-hover:rotate-12 transition-transform">
            <StickyNote className="w-4 h-4" />
          </span>
          <span>+ Araya Yapışkan Not Ekle</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`paper-scope rounded-3xl p-5 border-2 transition-all shadow-postit ${colorConfig.bgClass} ${colorConfig.borderClass}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
          <StickyNote className="w-3.5 h-3.5" />
          Hızlı Post-it Notu
        </span>
        <button onClick={() => setIsExpanded(false)} className="text-xs text-gray-500 hover:text-gray-800">
          Vazgeç
        </button>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handlePost();
          if (e.key === 'Escape') setIsExpanded(false);
        }}
        placeholder="Aklına gelen hızlı bir not yaz... (Ctrl+Enter ile iliştir)"
        className="w-full bg-transparent font-medium text-gray-900 placeholder-black/35 outline-hidden resize-none min-h-[90px] font-handwriting text-lg"
        autoFocus
      />

      <div className="flex items-center justify-between pt-2 border-t border-black/8 mt-2">
        <div className="flex items-center gap-1.5">
          {(['yellow', 'pink', 'blue', 'mint', 'peach'] as NoteColor[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedColor(c)}
              aria-label={NOTE_COLORS[c].name}
              className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 ${
                selectedColor === c ? 'ring-2 ring-black/40 scale-110' : ''
              }`}
              style={{ backgroundColor: NOTE_COLORS[c].cardBg, borderColor: NOTE_COLORS[c].borderHex }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => handlePost()}
          disabled={!content.trim()}
          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-gray-950 text-white text-xs font-bold shadow-md hover:bg-black disabled:opacity-40 transition-all"
        >
          <Check className="w-3.5 h-3.5" />
          İliştir
        </button>
      </div>
    </div>
  );
};
