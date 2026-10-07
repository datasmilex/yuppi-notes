'use client';

import React from 'react';
import { useNotes } from '../../context/NotesContext';
import { NOTE_COLORS } from '../../utils/colors';
import { NoteColor, SortMode } from '../../types/note';
import { ArrowDownUp, Hash, X } from 'lucide-react';

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'manual', label: 'Elle sıralama' },
  { id: 'updated', label: 'Son düzenlenen' },
  { id: 'created', label: 'Oluşturulma tarihi' },
  { id: 'title', label: 'Başlık (A-Z)' },
];

export const BoardToolbar: React.FC<{ resultCount: number; hasFilters: boolean }> = ({ resultCount, hasFilters }) => {
  const {
    activeColor,
    setActiveColor,
    activeTag,
    setActiveTag,
    sortMode,
    setSortMode,
    searchQuery,
    setSearchQuery,
  } = useNotes();

  const clearAll = () => {
    setActiveColor(null);
    setActiveTag(null);
    setSearchQuery('');
  };

  return (
    <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full py-1">
        <button
          type="button"
          onClick={() => setActiveColor(null)}
          className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
            activeColor === null
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-black/10 hover:bg-gray-100'
          }`}
        >
          Tüm Renkler
        </button>
        {(Object.keys(NOTE_COLORS) as NoteColor[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setActiveColor(activeColor === c ? null : c)}
            title={NOTE_COLORS[c].name}
            aria-label={`${NOTE_COLORS[c].name} renkli notlar`}
            aria-pressed={activeColor === c}
            className={`flex-shrink-0 w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
              activeColor === c ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : ''
            }`}
            style={{ backgroundColor: NOTE_COLORS[c].cardBg, borderColor: NOTE_COLORS[c].borderHex }}
          />
        ))}

        {activeTag && (
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className="flex-shrink-0 inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-purple-600 text-white text-xs font-bold"
            title="Etiket filtresini kaldır"
          >
            <Hash className="w-3 h-3" />
            {activeTag}
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-bold text-purple-700 hover:underline"
          >
            Filtreleri temizle · {resultCount} sonuç
          </button>
        )}
        <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
          <ArrowDownUp className="w-3.5 h-3.5" />
          <span className="sr-only">Sırala</span>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="bg-white border border-black/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-700 outline-hidden cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
};
