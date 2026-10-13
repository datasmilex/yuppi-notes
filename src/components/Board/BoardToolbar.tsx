'use client';

import React from 'react';
import { useNotes } from '../../context/NotesContext';
import { useUI } from '../../context/UIContext';
import { NOTE_COLORS } from '../../utils/colors';
import { NoteColor, SortMode } from '../../types/note';
import { ArrowDownUp, Hash, X, LayoutGrid, LayoutList, CheckSquare } from 'lucide-react';

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
    setSearchQuery,
    activeView,
  } = useNotes();
  const { prefs, setPref, selectMode, setSelectMode } = useUI();

  const clearAll = () => {
    setActiveColor(null);
    setActiveTag(null);
    setSearchQuery('');
  };

  // Hatırlatıcı ve çöp görünümleri kendi sıralamasını kullanır (zamana göre)
  const showSort = activeView === 'notes' || activeView === 'archive';

  return (
    <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full py-1">
        <button
          type="button"
          onClick={() => setActiveColor(null)}
          className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
            activeColor === null
              ? 'bg-ink text-on-ink border-ink'
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
              activeColor === c ? 'ring-2 ring-offset-2 ring-offset-app ring-gray-900 scale-110' : ''
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

      <div className="flex items-center gap-2 ml-auto">
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-bold text-purple-700 hover:underline whitespace-nowrap"
          >
            Filtreleri temizle · {resultCount} sonuç
          </button>
        )}

        {showSort && (
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
        )}

        <button
          type="button"
          onClick={() => setSelectMode(!selectMode)}
          className={`p-2 rounded-xl border transition-colors ${
            selectMode ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-black/10 hover:bg-gray-100'
          }`}
          title={selectMode ? 'Seçimi bitir' : 'Not seç (toplu işlem)'}
          aria-pressed={selectMode}
        >
          <CheckSquare className="w-4 h-4" />
        </button>

        <div className="flex items-center p-0.5 rounded-xl bg-white border border-black/10" role="radiogroup" aria-label="Görünüm">
          <button
            type="button"
            role="radio"
            aria-checked={prefs.viewMode === 'grid'}
            onClick={() => setPref('viewMode', 'grid')}
            className={`p-1.5 rounded-lg transition-colors ${prefs.viewMode === 'grid' ? 'bg-purple-100 text-purple-800' : 'text-gray-500 hover:text-gray-800'}`}
            title="Izgara görünümü"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={prefs.viewMode === 'list'}
            onClick={() => setPref('viewMode', 'list')}
            className={`p-1.5 rounded-lg transition-colors ${prefs.viewMode === 'list' ? 'bg-purple-100 text-purple-800' : 'text-gray-500 hover:text-gray-800'}`}
            title="Liste görünümü"
          >
            <LayoutList className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
