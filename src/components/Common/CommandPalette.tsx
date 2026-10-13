'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ArrowRight,
  BarChart3,
  Bell,
  CheckSquare,
  CornerDownLeft,
  Download,
  FilePlus,
  FileText,
  FolderOpen,
  Home,
  Keyboard,
  LayoutGrid,
  LayoutList,
  Monitor,
  Moon,
  Palette,
  PenTool,
  Search,
  Settings,
  StickyNote,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useNotes } from '../../context/NotesContext';
import { useUI } from '../../context/UIContext';
import { useTheme, AppTheme } from '../../context/ThemeContext';
import { useToast } from './Toast';
import { ModalShell } from './ModalShell';
import { NOTE_COLORS } from '../../utils/colors';
import { NOTE_TEMPLATES } from '../../utils/templates';
import { exportNotesMarkdown } from '../../utils/export';
import { downloadFile, htmlToPlainText } from '../../utils/text';
import { formatRelativeTime } from '../../utils/date';
import { Note } from '../../types/note';

interface PaletteItem {
  id: string;
  group: 'Notlar' | 'Oluştur' | 'Git' | 'Görünüm' | 'Araçlar';
  label: string;
  hint?: string;
  icon: React.ReactNode;
  keywords?: string;
  run: () => void;
}

const norm = (s: string) => s.toLocaleLowerCase('tr-TR');

const THEMES: { id: AppTheme; label: string }[] = [
  { id: 'beige', label: 'Açık Bej' },
  { id: 'dark', label: 'Koyu Gece' },
  { id: 'pink', label: 'Pudra Pembe' },
  { id: 'blue', label: 'Bebek Mavisi' },
  { id: 'system', label: 'Sistem (otomatik)' },
];

export const CommandPalette: React.FC = () => {
  const notesCtx = useNotes();
  const {
    scopeNotes,
    scopeFolders,
    activeScope,
    setActiveScope,
    setActiveView,
    setActiveFolderId,
    openNoteById,
    startNewNote,
    setIsTypeSelectorOpen,
    exportBackup,
    setSearchQuery,
    setActiveColor,
    setActiveTag,
  } = notesCtx;
  const { openModal, setOpenModal, setPref, prefs, setSelectMode } = useUI();
  const { setTheme } = useTheme();
  const { showToast } = useToast();

  const isOpen = openModal === 'palette';
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setCursor(0);
    }
  }, [isOpen]);

  const close = () => setOpenModal(null);
  const run = (fn: () => void) => () => {
    close();
    // Pencere kapandıktan sonra çalışsın (ör. yeni bir pencere açılacaksa odak karışmasın)
    setTimeout(fn, 0);
  };

  const actions = useMemo<PaletteItem[]>(() => {
    const list: PaletteItem[] = [
      { id: 'new', group: 'Oluştur', label: 'Yeni not…', hint: 'Alt+N', icon: <FilePlus className="w-4 h-4" />, run: () => setIsTypeSelectorOpen(true) },
      { id: 'new-full', group: 'Oluştur', label: 'Boş detaylı not', icon: <PenTool className="w-4 h-4" />, keywords: 'tam sayfa', run: () => startNewNote({ kind: 'comprehensive' }) },
      { id: 'new-quick', group: 'Oluştur', label: 'Hızlı kopyalanabilir not', icon: <Zap className="w-4 h-4" />, keywords: 'pratik', run: () => startNewNote({ kind: 'quick' }) },
      ...NOTE_TEMPLATES.map<PaletteItem>((t) => ({
        id: `tpl-${t.id}`,
        group: 'Oluştur',
        label: `Şablon: ${t.name}`,
        hint: t.emoji,
        icon: <StickyNote className="w-4 h-4" />,
        keywords: t.description,
        run: () => startNewNote(t.build()),
      })),
      { id: 'go-all', group: 'Git', label: 'Tüm notlar', icon: <FileText className="w-4 h-4" />, run: () => setActiveFolderId(activeScope === 'local' ? 'all_local' : 'all_shared') },
      { id: 'go-reminders', group: 'Git', label: 'Hatırlatıcılar', icon: <Bell className="w-4 h-4" />, run: () => setActiveView('reminders') },
      { id: 'go-archive', group: 'Git', label: 'Arşiv', icon: <Archive className="w-4 h-4" />, run: () => setActiveView('archive') },
      { id: 'go-trash', group: 'Git', label: 'Çöp kutusu', icon: <Trash2 className="w-4 h-4" />, run: () => setActiveView('trash') },
      ...scopeFolders
        .filter((f) => !f.isSystem)
        .map<PaletteItem>((f) => ({
          id: `folder-${f.id}`,
          group: 'Git',
          label: `Klasör: ${f.name}`,
          hint: f.emoji,
          icon: <FolderOpen className="w-4 h-4" />,
          run: () => setActiveFolderId(f.id),
        })),
      activeScope === 'local'
        ? { id: 'scope-shared', group: 'Git', label: 'Ortak panoya geç', icon: <Users className="w-4 h-4" />, keywords: 'canlı oda paylaşım', run: () => setActiveScope('shared') }
        : { id: 'scope-local', group: 'Git', label: 'Yerel notlara geç', icon: <Home className="w-4 h-4" />, run: () => setActiveScope('local') },
      {
        id: 'view-toggle',
        group: 'Görünüm',
        label: prefs.viewMode === 'grid' ? 'Liste görünümüne geç' : 'Izgara görünümüne geç',
        icon: prefs.viewMode === 'grid' ? <LayoutList className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />,
        run: () => setPref('viewMode', prefs.viewMode === 'grid' ? 'list' : 'grid'),
      },
      {
        id: 'density',
        group: 'Görünüm',
        label: prefs.density === 'compact' ? 'Rahat kart yoğunluğu' : 'Sıkışık kart yoğunluğu',
        icon: <LayoutGrid className="w-4 h-4" />,
        run: () => setPref('density', prefs.density === 'compact' ? 'comfortable' : 'compact'),
      },
      ...THEMES.map<PaletteItem>((t) => ({
        id: `theme-${t.id}`,
        group: 'Görünüm',
        label: `Tema: ${t.label}`,
        icon: t.id === 'dark' ? <Moon className="w-4 h-4" /> : t.id === 'system' ? <Monitor className="w-4 h-4" /> : <Palette className="w-4 h-4" />,
        run: () => setTheme(t.id),
      })),
      ...(Object.keys(NOTE_COLORS) as (keyof typeof NOTE_COLORS)[]).map<PaletteItem>((c) => ({
        id: `color-${c}`,
        group: 'Görünüm',
        label: `Renge göre süz: ${NOTE_COLORS[c].name}`,
        icon: <span className="w-3.5 h-3.5 rounded-full border border-black/15" style={{ backgroundColor: NOTE_COLORS[c].accent }} />,
        run: () => setActiveColor(c),
      })),
      { id: 'clear-filters', group: 'Görünüm', label: 'Arama ve filtreleri temizle', icon: <X className="w-4 h-4" />, run: () => { setSearchQuery(''); setActiveColor(null); setActiveTag(null); } },
      { id: 'select', group: 'Araçlar', label: 'Not seçme modu (toplu işlem)', icon: <CheckSquare className="w-4 h-4" />, run: () => setSelectMode(true) },
      { id: 'stats', group: 'Araçlar', label: 'İstatistikler', icon: <BarChart3 className="w-4 h-4" />, run: () => setOpenModal('stats') },
      { id: 'settings', group: 'Araçlar', label: 'Ayarlar', icon: <Settings className="w-4 h-4" />, run: () => setOpenModal('settings') },
      { id: 'shortcuts', group: 'Araçlar', label: 'Klavye kısayolları', hint: '?', icon: <Keyboard className="w-4 h-4" />, run: () => setOpenModal('shortcuts') },
      {
        id: 'backup',
        group: 'Araçlar',
        label: 'Yedek indir (.json)',
        icon: <Download className="w-4 h-4" />,
        run: () => {
          downloadFile(`yuppi-notes-yedek-${new Date().toISOString().slice(0, 10)}.json`, exportBackup(), 'application/json;charset=utf-8');
          showToast('Yedek dosyası indirildi. 💾', 'success');
        },
      },
      {
        id: 'export-md',
        group: 'Araçlar',
        label: 'Tüm notları Markdown olarak indir',
        icon: <FileText className="w-4 h-4" />,
        run: () => {
          const list = scopeNotes.filter((n) => !n.deletedAt);
          exportNotesMarkdown(list, `yuppi-notlar-${new Date().toISOString().slice(0, 10)}`);
          showToast(`${list.length} not Markdown olarak indirildi.`, 'success');
        },
      },
    ];
    return list;
  }, [
    activeScope, scopeFolders, scopeNotes, prefs.viewMode, prefs.density, setActiveFolderId, setActiveView, setActiveScope,
    startNewNote, setIsTypeSelectorOpen, setPref, setTheme, setActiveColor, setSearchQuery, setActiveTag, setSelectMode,
    setOpenModal, exportBackup, showToast,
  ]);

  const items = useMemo<PaletteItem[]>(() => {
    const q = norm(query.trim());
    const live = scopeNotes.filter((n) => !n.deletedAt);

    let noteMatches: Note[];
    if (!q) {
      noteMatches = [...live].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);
    } else {
      noteMatches = live
        .map((n) => {
          const title = norm(n.title);
          const score = title.startsWith(q) ? 3 : title.includes(q) ? 2 : norm(htmlToPlainText(n.content)).includes(q) || (n.tags || []).some((t) => t.includes(q)) ? 1 : 0;
          return { n, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || b.n.updatedAt - a.n.updatedAt)
        .slice(0, 8)
        .map((x) => x.n);
    }

    const noteItems = noteMatches.map<PaletteItem>((n) => ({
      id: `note-${n.id}`,
      group: 'Notlar',
      label: n.title || 'Başlıksız Not',
      hint: `${n.isArchived ? '📦 Arşiv · ' : ''}${formatRelativeTime(n.updatedAt)}`,
      icon: <span className="w-3.5 h-3.5 rounded-md border border-black/10" style={{ backgroundColor: NOTE_COLORS[n.color]?.cardBg }} />,
      run: () => openNoteById(n.id),
    }));

    const actionItems = q
      ? actions.filter((a) => norm(`${a.label} ${a.keywords || ''}`).includes(q))
      : actions.filter((a) => ['new', 'new-full', 'new-quick', 'go-reminders', 'go-archive', 'go-trash', 'view-toggle', 'stats', 'settings', 'shortcuts'].includes(a.id));

    return [...noteItems, ...actionItems];
  }, [query, scopeNotes, actions, openNoteById]);

  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(0, items.length - 1)));
  }, [items.length]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => (items.length ? (c + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => (items.length ? (c - 1 + items.length) % items.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[cursor];
      if (item) run(item.run)();
    }
  };

  let lastGroup = '';

  return (
    <ModalShell isOpen={isOpen} onClose={close} title="Komut paleti" bare align="top" size="lg" bodyClassName="p-0">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
        <Search className="w-5 h-5 text-purple-600 flex-shrink-0" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Not ara veya bir komut yaz…"
          aria-label="Komut veya not ara"
          className="flex-1 bg-transparent text-base font-semibold text-gray-900 placeholder-gray-400 outline-hidden"
        />
        <kbd className="hidden sm:inline px-2 py-0.5 rounded-lg bg-gray-100 border border-gray-200 text-[11px] font-bold text-gray-500">Esc</kbd>
      </div>

      <div ref={listRef} className="max-h-[55vh] overflow-y-auto p-2" role="listbox" aria-label="Sonuçlar">
        {items.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-500">
            <span className="text-2xl block mb-2">🔍</span>
            &quot;{query}&quot; için sonuç yok
          </div>
        )}
        {items.map((item, index) => {
          const header = item.group !== lastGroup ? item.group : null;
          lastGroup = item.group;
          const active = index === cursor;
          return (
            <React.Fragment key={item.id}>
              {header && (
                <div className="px-3 pt-3 pb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                  {header === 'Notlar' && !query.trim() ? 'Son düzenlenenler' : header}
                </div>
              )}
              <button
                type="button"
                data-index={index}
                role="option"
                aria-selected={active}
                onMouseMove={() => setCursor(index)}
                onClick={run(item.run)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  active ? 'bg-purple-600 text-white' : 'text-gray-800 hover:bg-gray-100'
                }`}
              >
                <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${active ? 'bg-white/20' : 'bg-gray-100 text-gray-600'}`}>
                  {item.icon}
                </span>
                <span className="flex-1 min-w-0 truncate text-sm font-semibold">{item.label}</span>
                {item.hint && (
                  <span className={`flex-shrink-0 text-[11px] font-semibold ${active ? 'text-white/80' : 'text-gray-400'}`}>{item.hint}</span>
                )}
                {active && <CornerDownLeft className="w-3.5 h-3.5 flex-shrink-0 text-white/80" />}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      <div className="hidden sm:flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 text-[11px] font-semibold text-gray-400">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 rounded bg-gray-100 border border-gray-200">↑</kbd>
          <kbd className="px-1.5 rounded bg-gray-100 border border-gray-200">↓</kbd> gezin
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 rounded bg-gray-100 border border-gray-200">Enter</kbd> seç
        </span>
        <span className="ml-auto flex items-center gap-1">
          <ArrowRight className="w-3 h-3" /> {notesCtx.activeScope === 'local' ? 'Yerel çalışma alanı' : `Ortak oda: ${notesCtx.currentRoomId}`}
        </span>
      </div>
    </ModalShell>
  );
};
