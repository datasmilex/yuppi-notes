'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Pin,
  PinOff,
  Palette,
  FolderInput,
  Archive,
  ArchiveRestore,
  Trash2,
  RotateCcw,
  FileDown,
  CheckCheck,
} from 'lucide-react';
import { useNotes } from '../../context/NotesContext';
import { useUI } from '../../context/UIContext';
import { useToast } from '../Common/Toast';
import { useConfirm } from '../Common/Confirm';
import { NOTE_COLORS } from '../../utils/colors';
import { exportNotesMarkdown } from '../../utils/export';
import { NoteColor } from '../../types/note';
import { useEscape } from '../../hooks/useEscape';

const BAR_BTN =
  'flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold hover:bg-white/15 transition-colors disabled:opacity-40';

/** Seçim modunda alttan beliren toplu işlem çubuğu. */
export const BulkActionBar: React.FC<{ visibleIds: string[] }> = ({ visibleIds }) => {
  const { selectMode, selectedIds, setSelection, clearSelection } = useUI();
  const { notes, activeView, scopeFolders, bulkPatch, bulkTrash, bulkRestore, bulkDeleteForever } = useNotes();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [menu, setMenu] = useState<'color' | 'folder' | null>(null);

  const ids = Array.from(selectedIds);
  const count = ids.length;
  const selected = notes.filter((n) => selectedIds.has(n.id));
  const allPinned = selected.length > 0 && selected.every((n) => n.isPinned);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const isTrash = activeView === 'trash';
  const isArchive = activeView === 'archive';

  useEscape(selectMode && menu !== null, () => setMenu(null));
  useEscape(selectMode && menu === null, clearSelection);

  const trashSelected = () => {
    bulkTrash(ids);
    clearSelection();
  };

  const deleteSelectedForever = async () => {
    const ok = await confirm({
      title: `${count} not kalıcı olarak silinsin mi?`,
      message: 'Seçili notlar ve sürüm geçmişleri tamamen silinecek. Bu işlem geri alınamaz.',
      confirmLabel: 'Kalıcı Olarak Sil',
      danger: true,
    });
    if (!ok) return;
    bulkDeleteForever(ids);
    clearSelection();
    showToast(`${count} not kalıcı olarak silindi.`, 'info');
  };

  // Klavye: Ctrl+A tümünü seç, Delete çöpe taşı (yazı alanındayken ya da başka pencere açıkken değil)
  useEffect(() => {
    if (!selectMode) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (document.querySelector('[role="dialog"]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelection(visibleIds);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && count > 0) {
        e.preventDefault();
        if (isTrash) void deleteSelectedForever();
        else trashSelected();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!selectMode) return null;

  const run = (fn: () => void, message?: string) => () => {
    fn();
    setMenu(null);
    if (message) showToast(message, 'success');
  };

  return (
    // Ortalama sarmalayıcıda; animasyonlu öğede transform kullanılmaz (animasyon translate'i ezmesin)
    <div
      className="fixed inset-x-0 z-40 flex justify-center px-3 pointer-events-none"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
    >
    <div className="relative pointer-events-auto max-w-full animate-pop-in" role="toolbar" aria-label="Toplu işlemler">
      {menu && (
        <div className="absolute bottom-full mb-2 inset-x-0 mx-auto w-72 max-w-full p-2.5 bg-white rounded-2xl shadow-2xl border border-gray-100 animate-scale-in">
          {menu === 'color' && (
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(NOTE_COLORS) as NoteColor[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={run(() => bulkPatch(ids, { color: c }), `${count} notun rengi değişti.`)}
                  className="flex flex-col items-center gap-1 p-1.5 rounded-xl hover:bg-gray-50"
                >
                  <span className="w-8 h-8 rounded-full border-2" style={{ backgroundColor: NOTE_COLORS[c].cardBg, borderColor: NOTE_COLORS[c].borderHex }} />
                  <span className="text-[10px] font-bold text-gray-600 text-center leading-tight">{NOTE_COLORS[c].name}</span>
                </button>
              ))}
            </div>
          )}
          {menu === 'folder' && (
            <div className="max-h-64 overflow-y-auto">
              {scopeFolders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={run(() => bulkPatch(ids, { folderId: f.id }), `${count} not "${f.name}" klasörüne taşındı.`)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-sm font-semibold text-gray-800 hover:bg-purple-50"
                >
                  <span>{f.emoji}</span>
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-0.5 p-1.5 rounded-2xl bg-[#18181b]/95 text-white shadow-2xl backdrop-blur-md overflow-x-auto no-scrollbar border border-white/10">
        <button type="button" onClick={clearSelection} className={BAR_BTN} title="Seçimi bitir (Esc)" aria-label="Seçimi bitir">
          <X className="w-4 h-4" />
        </button>
        <span className="flex-shrink-0 px-2 text-xs font-black whitespace-nowrap">{count} seçili</span>
        <button
          type="button"
          onClick={() => (allVisibleSelected ? setSelection([]) : setSelection(visibleIds))}
          className={BAR_BTN}
          title="Ctrl + A"
        >
          <CheckCheck className="w-4 h-4" />
          <span className="hidden sm:inline">{allVisibleSelected ? 'Hiçbiri' : 'Tümü'}</span>
        </button>
        <span className="flex-shrink-0 w-px h-5 bg-white/20 mx-1" />

        {isTrash ? (
          <>
            <button
              type="button"
              disabled={!count}
              onClick={() => {
                bulkRestore(ids);
                clearSelection();
                showToast(`${count} not geri yüklendi. ♻️`, 'success');
              }}
              className={BAR_BTN}
            >
              <RotateCcw className="w-4 h-4" />
              Geri Yükle
            </button>
            <button type="button" disabled={!count} onClick={deleteSelectedForever} className={`${BAR_BTN} text-red-300 hover:bg-red-500/30`}>
              <Trash2 className="w-4 h-4" />
              Kalıcı Sil
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={!count}
              onClick={run(() => bulkPatch(ids, { isPinned: !allPinned }), allPinned ? 'Sabitleme kaldırıldı.' : `${count} not sabitlendi. 📌`)}
              className={BAR_BTN}
              title={allPinned ? 'Sabitlemeyi kaldır' : 'Sabitle'}
            >
              {allPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              <span className="hidden md:inline">{allPinned ? 'Kaldır' : 'Sabitle'}</span>
            </button>
            <button type="button" disabled={!count} onClick={() => setMenu(menu === 'color' ? null : 'color')} className={`${BAR_BTN} ${menu === 'color' ? 'bg-white/15' : ''}`} title="Renk">
              <Palette className="w-4 h-4" />
              <span className="hidden md:inline">Renk</span>
            </button>
            <button type="button" disabled={!count} onClick={() => setMenu(menu === 'folder' ? null : 'folder')} className={`${BAR_BTN} ${menu === 'folder' ? 'bg-white/15' : ''}`} title="Klasöre taşı">
              <FolderInput className="w-4 h-4" />
              <span className="hidden md:inline">Taşı</span>
            </button>
            <button
              type="button"
              disabled={!count}
              onClick={() => {
                bulkPatch(ids, isArchive ? { isArchived: false } : { isArchived: true, isPinned: false });
                clearSelection();
                showToast(isArchive ? `${count} not arşivden çıkarıldı.` : `${count} not arşivlendi. 📦`, 'success');
              }}
              className={BAR_BTN}
              title={isArchive ? 'Arşivden çıkar' : 'Arşivle'}
            >
              {isArchive ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
              <span className="hidden md:inline">{isArchive ? 'Çıkar' : 'Arşivle'}</span>
            </button>
            <button
              type="button"
              disabled={!count}
              onClick={() => {
                exportNotesMarkdown(selected, `yuppi-secili-${count}-not`);
                showToast(`${count} not Markdown olarak indirildi.`, 'success');
              }}
              className={BAR_BTN}
              title="Markdown olarak indir"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden md:inline">İndir</span>
            </button>
            <button type="button" disabled={!count} onClick={trashSelected} className={`${BAR_BTN} text-red-300 hover:bg-red-500/30`} title="Çöp kutusuna taşı (Delete)">
              <Trash2 className="w-4 h-4" />
              <span className="hidden md:inline">Sil</span>
            </button>
          </>
        )}
      </div>
    </div>
    </div>
  );
};
