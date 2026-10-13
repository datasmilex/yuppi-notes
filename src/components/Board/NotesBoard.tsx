'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useNotes } from '../../context/NotesContext';
import { useUI } from '../../context/UIContext';
import { useToast } from '../Common/Toast';
import { useConfirm } from '../Common/Confirm';
import { SortableNoteCard } from './SortableNoteCard';
import { NoteCard } from '../Card/NoteCard';
import { NoteListRow } from '../Card/NoteListRow';
import { QuickStickyCreator } from './QuickStickyCreator';
import { BoardToolbar } from './BoardToolbar';
import { BulkActionBar } from './BulkActionBar';
import { Note } from '../../types/note';
import { NOTE_TEMPLATES } from '../../utils/templates';
import { TRASH_RETENTION_DAYS } from '../../utils/notes';
import {
  Pin,
  Layers,
  SearchX,
  FileEdit,
  StickyNote,
  FilterX,
  Bell,
  Archive,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

const GRID = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-5 grid-flow-dense items-start';
const LIST = 'flex flex-col gap-2.5';
const DAY = 24 * 60 * 60 * 1000;

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  tone: string;
  notes: Note[];
  withSticky?: boolean;
}

export const NotesBoard: React.FC = () => {
  const {
    hydrated,
    scopeNotes,
    pinnedNotes,
    unpinnedNotes,
    filteredNotes,
    reorderNotes,
    searchQuery,
    setSearchQuery,
    activeColor,
    setActiveColor,
    activeTag,
    setActiveTag,
    activeFolderId,
    scopeFolders,
    activeScope,
    activeView,
    viewCounts,
    sortMode,
    emptyTrash,
    startNewNote,
    setIsTypeSelectorOpen,
  } = useNotes();
  const { prefs, selectMode, clearSelection } = useUI();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [activeDragNote, setActiveDragNote] = useState<Note | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Hatırlatıcı grupları ve "x dk önce" ifadeleri dakikada bir tazelensin
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Görünüm/klasör/kapsam değişince seçim temizlenir (görünmeyen notlar yanlışlıkla işlenmesin)
  useEffect(() => {
    clearSelection();
  }, [activeView, activeFolderId, activeScope, clearSelection]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const isList = prefs.viewMode === 'list';
  const canReorder = sortMode === 'manual' && (activeView === 'notes' || activeView === 'archive') && !selectMode;

  const sections = useMemo<Section[]>(() => {
    if (activeView === 'reminders') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const t0 = start.getTime();
      const buckets: Section[] = [
        { id: 'overdue', title: 'Zamanı Geçenler', icon: <AlertTriangle className="w-4 h-4" />, tone: 'bg-red-100 text-red-700', notes: [] },
        { id: 'today', title: 'Bugün', icon: <Bell className="w-4 h-4" />, tone: 'bg-amber-100 text-amber-700', notes: [] },
        { id: 'tomorrow', title: 'Yarın', icon: <Bell className="w-4 h-4" />, tone: 'bg-purple-100 text-purple-700', notes: [] },
        { id: 'week', title: 'Bu Hafta', icon: <Bell className="w-4 h-4" />, tone: 'bg-sky-100 text-sky-700', notes: [] },
        { id: 'later', title: 'Daha Sonra', icon: <Bell className="w-4 h-4" />, tone: 'bg-gray-100 text-gray-600', notes: [] },
      ];
      filteredNotes.forEach((n) => {
        const at = n.reminderAt || 0;
        const i = at <= now ? 0 : at < t0 + DAY ? 1 : at < t0 + 2 * DAY ? 2 : at < t0 + 7 * DAY ? 3 : 4;
        buckets[i].notes.push(n);
      });
      return buckets.filter((b) => b.notes.length > 0);
    }

    if (activeView === 'notes') {
      const currentFolder = scopeFolders.find((f) => f.id === activeFolderId);
      const inFolder = Boolean(activeFolderId && !activeFolderId.startsWith('all_'));
      const list: Section[] = [];
      if (pinnedNotes.length) {
        list.push({ id: 'pinned', title: 'Sabitlenen Notlar', icon: <Pin className="w-4 h-4 fill-current" />, tone: 'bg-amber-100 text-amber-700', notes: pinnedNotes });
      }
      list.push({
        id: 'rest',
        title: inFolder ? `${currentFolder?.emoji ?? ''} ${currentFolder?.name ?? 'Klasör'}` : pinnedNotes.length ? 'Notlar' : 'Tüm Notlar',
        icon: <Layers className="w-4 h-4" />,
        tone: 'bg-purple-100 text-purple-700',
        notes: unpinnedNotes,
        withSticky: true,
      });
      return list;
    }

    return [{ id: activeView, title: '', icon: null, tone: '', notes: filteredNotes }];
  }, [activeView, filteredNotes, pinnedNotes, unpinnedNotes, scopeFolders, activeFolderId, now]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragNote(filteredNotes.find((n) => n.id === event.active.id) || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragNote(null);
    if (!over || active.id === over.id) return;
    reorderNotes(String(active.id), String(over.id));
  };

  const handleEmptyTrash = async () => {
    const ok = await confirm({
      title: 'Çöp kutusu boşaltılsın mı?',
      message: `${viewCounts.trash} not kalıcı olarak silinecek. Bu işlem geri alınamaz.`,
      confirmLabel: 'Çöpü Boşalt',
      danger: true,
    });
    if (ok) showToast(`${emptyTrash()} not kalıcı olarak silindi.`, 'info');
  };

  if (!hydrated) return <BoardSkeleton />;

  const hasFilters = Boolean(searchQuery.trim() || activeColor || activeTag);
  const clearFilters = () => {
    setSearchQuery('');
    setActiveColor(null);
    setActiveTag(null);
  };

  const viewHeader = <ViewHeader onEmptyTrash={handleEmptyTrash} />;

  if (filteredNotes.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto w-full p-4 md:p-8">
          {viewHeader}
          {(hasFilters || activeView !== 'notes') && <BoardToolbar resultCount={0} hasFilters={hasFilters} />}
          <EmptyState
            filteredOut={hasFilters && scopeNotes.length > 0}
            onClearFilters={clearFilters}
            onNewNote={() => startNewNote({ kind: 'comprehensive' })}
            onPickTemplate={(i) => startNewNote(NOTE_TEMPLATES[i].build())}
            onOpenTypes={() => setIsTypeSelectorOpen(true)}
          />
        </div>
      </div>
    );
  }

  const renderCollection = (section: Section) => (
    <SortableContext items={section.notes.map((n) => n.id)} strategy={isList ? verticalListSortingStrategy : rectSortingStrategy}>
      <div className={isList ? LIST : GRID}>
        {section.withSticky && !isList && <QuickStickyCreator />}
        {section.notes.map((note) => (
          <SortableNoteCard key={note.id} note={note} disabled={!canReorder} variant={prefs.viewMode} />
        ))}
      </div>
    </SortableContext>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDragNote(null)}
    >
      <div className="flex-1 overflow-y-auto">
        <div className={`max-w-[1600px] mx-auto w-full p-4 md:p-8 ${selectMode ? 'pb-32' : 'pb-28 md:pb-8'}`}>
          {viewHeader}
          <BoardToolbar resultCount={filteredNotes.length} hasFilters={hasFilters} />

          {isList && activeView === 'notes' && (
            <div className="mb-4 max-w-xl">
              <QuickStickyCreator />
            </div>
          )}

          {sections.map((section) => (
            <section key={section.id} className="mb-8 last:mb-0">
              {section.title && (
                <div className="flex items-center gap-2 mb-4">
                  <span className={`p-1.5 rounded-xl shadow-2xs ${section.tone}`}>{section.icon}</span>
                  <h2 className="text-xs font-black uppercase tracking-wider text-gray-600">{section.title}</h2>
                  <span className={`ml-1 text-xs font-bold px-2 py-0.5 rounded-full ${section.tone}`}>{section.notes.length}</span>
                </div>
              )}
              {renderCollection(section)}
            </section>
          ))}
        </div>
      </div>

      <BulkActionBar visibleIds={filteredNotes.map((n) => n.id)} />

      <DragOverlay dropAnimation={null}>
        {activeDragNote ? (
          isList ? (
            <div className="shadow-2xl pointer-events-none opacity-95 rotate-1">
              <NoteListRow note={activeDragNote} />
            </div>
          ) : (
            <div className="w-72 rotate-2 scale-105 shadow-2xl pointer-events-none opacity-90">
              <NoteCard note={activeDragNote} dragHandleProps={{}} resizable={false} />
            </div>
          )
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

/** Akıllı görünümlerin başlığı ve açıklaması (Hatırlatıcılar, Arşiv, Çöp Kutusu). */
const ViewHeader: React.FC<{ onEmptyTrash: () => void }> = ({ onEmptyTrash }) => {
  const { activeView, viewCounts } = useNotes();
  if (activeView === 'notes') return null;

  const config = {
    reminders: {
      icon: <Bell className="w-5 h-5" />,
      tone: 'bg-purple-100 text-purple-700',
      title: 'Hatırlatıcılar',
      text: 'Zamanı gelen notlar bildirimle hatırlatılır. Bir notu açıp ⏰ simgesine dokunarak hatırlatıcı kurabilirsin.',
    },
    archive: {
      icon: <Archive className="w-5 h-5" />,
      tone: 'bg-gray-200 text-gray-700',
      title: 'Arşiv',
      text: 'Arşivlenen notlar panoyu kalabalıklaştırmaz; aramada ve komut paletinde bulunur, istediğin an geri çıkarabilirsin.',
    },
    trash: {
      icon: <Trash2 className="w-5 h-5" />,
      tone: 'bg-red-100 text-red-700',
      title: 'Çöp Kutusu',
      text: `Silinen notlar ${TRASH_RETENTION_DAYS} gün burada bekler, sonra kalıcı olarak silinir. Geri yüklemek için karttaki düğmeyi kullan.`,
    },
  }[activeView];

  return (
    <div className="flex items-start gap-3 mb-6 p-4 rounded-3xl bg-white border border-black/5 shadow-2xs">
      <span className={`p-2.5 rounded-2xl ${config.tone} flex-shrink-0`}>{config.icon}</span>
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
          {config.title}
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{viewCounts[activeView]}</span>
        </h1>
        <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{config.text}</p>
      </div>
      {activeView === 'trash' && viewCounts.trash > 0 && (
        <button
          type="button"
          onClick={onEmptyTrash}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Çöpü Boşalt</span>
        </button>
      )}
    </div>
  );
};

const EmptyState: React.FC<{
  filteredOut: boolean;
  onClearFilters: () => void;
  onNewNote: () => void;
  onPickTemplate: (index: number) => void;
  onOpenTypes: () => void;
}> = ({ filteredOut, onClearFilters, onNewNote, onPickTemplate, onOpenTypes }) => {
  const { activeView, activeScope, activeFolderId, scopeFolders, searchQuery } = useNotes();
  const currentFolder = scopeFolders.find((f) => f.id === activeFolderId);
  const inSpecificFolder = Boolean(activeFolderId && !activeFolderId.startsWith('all_'));

  let icon: React.ReactNode = <StickyNote className="w-8 h-8 text-amber-700 animate-bounce" />;
  let title = 'Henüz hiç not eklenmedi';
  let text = 'Boş bir sayfa açarak yazmaya başlayabilir, hazır bir şablon seçebilir veya hızlı bir yapışkan post-it iliştirebilirsin.';

  if (filteredOut) {
    icon = <SearchX className="w-8 h-8 text-amber-700" />;
    title = searchQuery.trim() ? `"${searchQuery}" ile eşleşen not bulunamadı` : 'Bu filtreye uyan not yok';
    text = 'Arama terimini veya filtreleri değiştirebilir ya da yeni bir not açabilirsin.';
  } else if (activeView === 'reminders') {
    icon = <Bell className="w-8 h-8 text-purple-700" />;
    title = 'Yaklaşan hatırlatıcı yok';
    text = 'Bir notu açıp üstteki ⏰ simgesine dokunarak "Yarın sabah", "Bu akşam" gibi hızlı hatırlatıcılar kurabilirsin.';
  } else if (activeView === 'archive') {
    icon = <Archive className="w-8 h-8 text-gray-600" />;
    title = 'Arşiv boş';
    text = 'Artık panoda görmek istemediğin ama silmek de istemediğin notları arşivleyebilirsin.';
  } else if (activeView === 'trash') {
    icon = <Trash2 className="w-8 h-8 text-gray-500" />;
    title = 'Çöp kutusu tertemiz ✨';
    text = `Sildiğin notlar ${TRASH_RETENTION_DAYS} gün boyunca burada bekler; yanlışlıkla silersen geri getirebilirsin.`;
  } else if (inSpecificFolder) {
    title = `${currentFolder?.emoji ?? '📁'} Bu klasörde henüz not yok`;
    text = 'Bu klasördeyken oluşturduğun notlar otomatik olarak buraya eklenir.';
  } else if (activeScope === 'shared') {
    title = 'Ortak panoda henüz not yok';
    text = 'Bu ortak panoya eklediğin tüm notlar davet bağlantısıyla katılan kişilerle anında canlı eşitlenir.';
  }

  const showCreate = !filteredOut && (activeView === 'notes' || activeView === 'reminders');

  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center min-h-[50vh] max-w-xl mx-auto">
      <div className="w-20 h-20 mb-5 rounded-3xl bg-amber-100/90 border-2 border-dashed border-amber-300 flex items-center justify-center shadow-inner">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-6 leading-relaxed">{text}</p>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
        {filteredOut && (
          <button
            onClick={onClearFilters}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white border border-black/10 text-gray-800 font-bold text-xs sm:text-sm shadow-xs hover:bg-gray-50 transition-all"
          >
            <FilterX className="w-4 h-4" />
            Filtreleri Temizle
          </button>
        )}
        {(showCreate || filteredOut) && (
          <button
            onClick={activeView === 'reminders' ? onOpenTypes : onNewNote}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs sm:text-sm shadow-md hover:scale-102 active:scale-98 transition-all"
          >
            <FileEdit className="w-4 h-4" />
            {activeView === 'reminders' ? 'Yeni Not Oluştur' : 'Boş Tam Sayfa Notu Aç'}
          </button>
        )}
      </div>

      {showCreate && activeView === 'notes' && (
        <>
          <div className="w-full mt-8">
            <div className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2.5">Ya da bir şablonla başla</div>
            <div className="flex flex-wrap justify-center gap-2">
              {NOTE_TEMPLATES.slice(0, 6).map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onPickTemplate(i)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white border border-black/10 text-xs font-bold text-gray-700 hover:border-purple-300 hover:bg-purple-50 hover:-translate-y-0.5 transition-all shadow-2xs"
                >
                  <span className="text-base">{t.emoji}</span>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full mt-6 text-left">
            <QuickStickyCreator />
          </div>
        </>
      )}
    </div>
  );
};

const BoardSkeleton: React.FC = () => (
  <div className="flex-1 overflow-hidden" aria-busy="true" aria-label="Notlar yükleniyor">
    <div className="max-w-[1600px] mx-auto w-full p-4 md:p-8">
      <div className="h-8 w-72 max-w-full rounded-full bg-gray-200/70 animate-pulse mb-6" />
      <div className={GRID}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl bg-white/70 border-2 border-gray-100 p-5 animate-pulse"
            style={{ height: [180, 230, 200, 260, 190, 240, 210, 180][i], animationDelay: `${i * 80}ms` }}
          >
            <div className="h-4 w-2/3 rounded-full bg-gray-200 mb-4" />
            <div className="h-3 w-full rounded-full bg-gray-100 mb-2" />
            <div className="h-3 w-5/6 rounded-full bg-gray-100 mb-2" />
            <div className="h-3 w-1/2 rounded-full bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  </div>
);
