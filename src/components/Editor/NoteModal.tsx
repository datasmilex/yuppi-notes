'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Note, NoteColor, NoteFont, NoteKind, NoteScope } from '../../types/note';
import { useNotes } from '../../context/NotesContext';
import { useUI } from '../../context/UIContext';
import { useUser } from '../../context/UserContext';
import { useToast } from '../Common/Toast';
import { RichEditor } from './RichEditor';
import { FontSelector } from './FontSelector';
import { ColorPicker } from './ColorPicker';
import { ReminderPicker } from './ReminderPicker';
import { HistoryPanel } from './HistoryPanel';
import { DrawingPad } from './DrawingPad';
import { ImageGallery } from '../Card/ImageGallery';
import { StickerPicker } from './StickerPicker';
import { NOTE_COLORS, NOTE_FONTS } from '../../utils/colors';
import { StickerItem } from '../../utils/stickers';
import { copyText, htmlToPlainText, noteToText, uid } from '../../utils/text';
import { normalizeTag } from '../../utils/notes';
import { formatFullDate, formatReminder } from '../../utils/date';
import { compressImages } from '../../utils/image';
import { checklistProgress } from '../../utils/checklist';
import { pushNoteVersion, NoteVersion } from '../../utils/history';
import { exportNote, printNote, ExportFormat } from '../../utils/export';
import { useEscape } from '../../hooks/useEscape';
import {
  ArrowLeft,
  Pin,
  Folder as FolderIcon,
  Trash2,
  Check,
  Palette,
  Type,
  X,
  Copy,
  PenTool,
  Share2,
  Hash,
  Bell,
  BellRing,
  MoreHorizontal,
  History,
  Focus,
  Volume2,
  VolumeX,
  Award,
  FileText,
  FileCode,
  FileDown,
  Printer,
  CopyPlus,
  Archive,
  ArchiveRestore,
  Zap,
} from 'lucide-react';

interface Draft {
  title: string;
  content: string;
  kind: NoteKind;
  color: NoteColor;
  font: NoteFont;
  folderId: string;
  isPinned: boolean;
  images: string[];
  stickers: string[];
  tags: string[];
  reminderAt: number | null;
}

type Popover = 'color' | 'font' | 'reminder' | 'more' | null;

const EMPTY_DRAFT: Draft = {
  title: '',
  content: '',
  kind: 'comprehensive',
  color: 'yellow',
  font: 'sans',
  folderId: 'all_local',
  isPinned: false,
  images: [],
  stickers: [],
  tags: [],
  reminderAt: null,
};

const stripTags = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');

const HEADER_BTN =
  'flex-shrink-0 p-2 rounded-xl bg-white hover:bg-gray-50 border border-black/10 text-gray-700 transition-all shadow-2xs';

export const NoteModal: React.FC = () => {
  const {
    notes,
    activeNoteForEdit,
    setActiveNoteForEdit,
    getNote,
    isCreateModalOpen,
    setIsCreateModalOpen,
    newNoteRequest,
    createNote,
    updateNote,
    deleteNote,
    setArchived,
    duplicateNote,
    scopeFolders,
    activeFolderId,
    activeScope,
    allTags,
  } = useNotes();
  const { prefs } = useUI();
  const { currentUser } = useUser();
  const { showToast } = useToast();

  const sessionKey = activeNoteForEdit
    ? activeNoteForEdit.id
    : isCreateModalOpen
    ? `new-${newNoteRequest?.id ?? 0}`
    : null;
  const isOpen = sessionKey !== null;

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [persisted, setPersisted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [copied, setCopied] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [popover, setPopover] = useState<Popover>(null);
  const [showBadgePicker, setShowBadgePicker] = useState(false);
  const [showDrawing, setShowDrawing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Oturum boyunca değişmeyen / en güncel tutulan değerler
  const draftRef = useRef<Draft>(EMPTY_DRAFT);
  const dirtyRef = useRef(false);
  const idRef = useRef('');
  const createdRef = useRef(false);
  const scopeRef = useRef<NoteScope>('local');
  const originalRef = useRef<{ title: string; content: string; at: number; by: string } | null>(null);

  const currentNote = notes.find((n) => n.id === idRef.current) || null;

  const saveNow = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!dirtyRef.current) return;
    const d = draftRef.current;

    const isEmpty =
      !d.title.trim() && !stripTags(d.content).trim() && d.images.length === 0 && d.stickers.length === 0;
    if (isEmpty && !createdRef.current) return; // boş yeni notu kaydetme

    dirtyRef.current = false;
    const fields = { ...d };

    if (createdRef.current) {
      const existing = getNote(idRef.current);
      if (existing) updateNote({ ...existing, ...fields });
    } else {
      createNote({ ...fields, id: idRef.current, scope: scopeRef.current });
      createdRef.current = true;
      setPersisted(true);
    }
    setSaveStatus('saved');
  };
  const saveNowRef = useRef(saveNow);
  saveNowRef.current = saveNow;

  /** Oturum kapanırken: bekleyen kaydı yaz, içerik değiştiyse önceki hali sürüm geçmişine ekle. */
  const finishSession = () => {
    saveNowRef.current();
    const original = originalRef.current;
    const d = draftRef.current;
    if (original && createdRef.current && (original.title !== d.title || original.content !== d.content)) {
      void pushNoteVersion(idRef.current, original);
    }
    originalRef.current = null;
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
  };
  const finishSessionRef = useRef(finishSession);
  finishSessionRef.current = finishSession;

  // Not açıldığında (veya yeni not başlatıldığında) taslağı yükle
  useEffect(() => {
    if (sessionKey === null) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    let next: Draft;
    let seeded = false;
    if (activeNoteForEdit) {
      // Kartın tıklandığı andaki nesne bayat olabilir (ör. editör kapanırken yazılan son kayıt henüz
      // panoya yansımadan hemen yeniden açıldıysa); her zaman deponun en güncel hali yüklenir.
      const source = getNote(activeNoteForEdit.id) || activeNoteForEdit;
      idRef.current = source.id;
      createdRef.current = true;
      scopeRef.current = source.scope;
      next = {
        title: source.title,
        content: source.content,
        kind: source.kind || 'comprehensive',
        color: source.color,
        font: source.font,
        folderId: source.folderId,
        isPinned: source.isPinned,
        images: source.images || [],
        stickers: source.stickers || [],
        tags: source.tags || [],
        reminderAt: source.reminderAt ?? null,
      };
      originalRef.current = {
        title: source.title,
        content: source.content,
        at: source.updatedAt,
        by: source.lastEditedBy?.userName || 'Anonim',
      };
    } else {
      const seed = newNoteRequest?.seed || {};
      idRef.current = uid();
      createdRef.current = false;
      scopeRef.current = activeScope;
      originalRef.current = null;
      next = {
        ...EMPTY_DRAFT,
        kind: prefs.defaultKind,
        color: prefs.defaultColor,
        font: prefs.defaultFont,
        folderId:
          activeFolderId && !activeFolderId.startsWith('all_')
            ? activeFolderId
            : activeScope === 'local'
            ? 'all_local'
            : 'all_shared',
        ...Object.fromEntries(Object.entries(seed).filter(([, v]) => v !== undefined)),
      } as Draft;
      // Şablondan açılan not, kullanıcı hiçbir şey yazmasa da kaydedilir
      seeded = Boolean(seed.title || seed.content);
    }

    draftRef.current = next;
    dirtyRef.current = seeded;
    setDraft(next);
    setPersisted(createdRef.current);
    setSaveStatus(seeded ? 'saving' : 'saved');
    setTagInput('');
    setPopover(null);
    setFocusMode(false);
    setSpeaking(false);
    if (seeded) saveTimerRef.current = setTimeout(() => saveNowRef.current(), 300);

    return () => finishSessionRef.current();
    // Yalnızca not oturumu değiştiğinde çalışmalı; aksi halde uzaktan gelen güncellemeler yazılanı sıfırlar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);

  const update = (patch: Partial<Draft>) => {
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    dirtyRef.current = true;
    setDraft(next);
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNowRef.current(), 300);
  };
  const updateRef = useRef(update);
  updateRef.current = update;

  const closeEditor = () => {
    setPopover(null);
    setActiveNoteForEdit(null);
    setIsCreateModalOpen(false);
  };

  // Esc: önce açık menü, sonra editörün kendisi (iç pencereler kendi Esc kayıtlarıyla önce kapanır)
  useEscape(isOpen, closeEditor);
  useEscape(isOpen && popover !== null, () => setPopover(null));

  // Ctrl+S: anında kaydet (tarayıcının "sayfayı kaydet" penceresi açılmasın)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveNowRef.current();
        if (createdRef.current) showToast('Kaydedildi ✓', 'success', { duration: 1400 });
        else showToast('Boş not kaydedilmez; bir şeyler yaz ✍️', 'info', { duration: 2000 });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, showToast]);

  // Sekme kapanırken/arka plana giderken bekleyen kaydı yaz
  useEffect(() => {
    if (!isOpen) return;
    const flush = () => saveNowRef.current();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isOpen]);

  // Yapışkan araç çubuğu üst şeridin hemen altında dursun
  useEffect(() => {
    if (!isOpen) return;
    const header = headerRef.current;
    const root = rootRef.current;
    if (!header || !root) return;
    const sync = () => root.style.setProperty('--note-header-h', `${header.offsetHeight}px`);
    sync();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(sync);
    ro.observe(header);
    return () => ro.disconnect();
  }, [isOpen, focusMode]);

  const stats = useMemo(() => {
    const plain = stripTags(draft.content).trim();
    const words = plain ? plain.split(/\s+/).length : 0;
    return {
      words,
      chars: plain.replace(/\s/g, '').length,
      minutes: Math.max(1, Math.ceil(words / 200)),
      tasks: checklistProgress(draft.content),
    };
  }, [draft.content]);

  if (!isOpen) return null;

  const colorConfig = NOTE_COLORS[draft.color] || NOTE_COLORS.yellow;
  const fontConfig = NOTE_FONTS.find((f) => f.id === draft.font) || NOTE_FONTS[0];
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const timestamp = currentNote?.updatedAt || activeNoteForEdit?.updatedAt || Date.now();
  const isArchived = Boolean(currentNote?.isArchived);
  const reminderOverdue = draft.reminderAt !== null && draft.reminderAt <= Date.now();

  /** Menülerden yapılan işlemler en güncel taslakla çalışsın. */
  const snapshotNote = (): Note => {
    const base = currentNote || activeNoteForEdit;
    return {
      ...(base as Note),
      ...draftRef.current,
      id: idRef.current,
      scope: scopeRef.current,
      updatedAt: base?.updatedAt || Date.now(),
      lastEditedBy: base?.lastEditedBy || {
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        userColor: currentUser.color,
        timestamp: Date.now(),
      },
      createdAt: base?.createdAt || Date.now(),
      order: base?.order || 0,
    };
  };

  const handleCopyNote = async () => {
    const ok = await copyText(noteToText(draft.title, draft.content));
    if (ok) {
      setCopied(true);
      showToast('Not panoya kopyalandı! 📋', 'success');
      setTimeout(() => setCopied(false), 2000);
    } else {
      showToast('Kopyalama başarısız oldu.', 'error');
    }
  };

  const handleShare = async () => {
    setPopover(null);
    try {
      await navigator.share({ title: draft.title || 'YuPPi Notu', text: noteToText(draft.title, draft.content) });
    } catch {
      // kullanıcı paylaşımı iptal etti
    }
  };

  const addImages = async (files: File[]) => {
    if (files.length === 0) return;
    const { images, failed } = await compressImages(files);
    if (images.length > 0) {
      updateRef.current({ images: [...draftRef.current.images, ...images] });
      showToast(images.length === 1 ? 'Görsel eklendi 📷' : `${images.length} görsel eklendi 📷`, 'success');
    }
    if (failed > 0) showToast('Bazı görseller eklenemedi.', 'error');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    if (fileInputRef.current) fileInputRef.current.value = '';
    await addImages(files);
  };

  const handleAddBadge = (sticker: StickerItem) => {
    update({ stickers: [...draftRef.current.stickers, sticker.content] });
    showToast(`Rozet eklendi: ${sticker.content}`, 'success');
  };

  const commitTag = (raw: string) => {
    const tag = normalizeTag(raw);
    setTagInput('');
    if (tag && !draftRef.current.tags.includes(tag)) update({ tags: [...draftRef.current.tags, tag] });
  };

  const handleDelete = () => {
    const id = idRef.current;
    setPopover(null);
    if (!createdRef.current) {
      dirtyRef.current = false;
      closeEditor();
      return;
    }
    saveNowRef.current();
    closeEditor();
    deleteNote(id);
  };

  const handleArchive = () => {
    setPopover(null);
    if (!createdRef.current) return; // henüz kaydedilmemiş taslak arşivlenemez
    const id = idRef.current;
    saveNowRef.current();
    const archive = !isArchived;
    if (archive) closeEditor();
    setArchived(id, archive);
  };

  const handleExport = (format: ExportFormat) => {
    setPopover(null);
    exportNote(snapshotNote(), format);
    showToast(`Not .${format} olarak indirildi.`, 'success');
  };

  const handlePrint = () => {
    setPopover(null);
    printNote(snapshotNote());
  };

  const handleDuplicate = () => {
    setPopover(null);
    saveNowRef.current();
    duplicateNote(snapshotNote());
    showToast('Notun kopyası oluşturuldu! 📋', 'success');
  };

  const toggleSpeak = () => {
    setPopover(null);
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const text = [draft.title, htmlToPlainText(draft.content).replace(/[☐☑•]/g, '')].filter(Boolean).join('. ');
    if (!text.trim()) {
      showToast('Okunacak bir metin yok.', 'info');
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'tr-TR';
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('tr'));
    if (voice) utter.voice = voice;
    utter.rate = 1;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(utter);
    setSpeaking(true);
  };

  const handleRestoreVersion = (version: NoteVersion) => {
    const d = draftRef.current;
    void pushNoteVersion(idRef.current, { at: Date.now(), title: d.title, content: d.content, by: currentUser.name });
    update({ title: version.title, content: version.content });
    showToast('Önceki sürüm geri yüklendi. 🕰️', 'success');
  };

  const togglePopover = (p: Exclude<Popover, null>) => setPopover((cur) => (cur === p ? null : p));

  return (
    <div
      ref={rootRef}
      className={`fixed inset-0 z-50 flex flex-col overflow-y-auto animate-fade-in bg-white ${focusMode ? 'focus-mode' : ''}`}
      style={{ borderTop: `6px solid ${colorConfig.borderHex}` }}
      role="dialog"
      aria-modal="true"
      aria-label={draft.title || 'Yeni not'}
    >
      {/* Notun rengiyle hafif bir üst ışıltı */}
      <div
        className="note-glow pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{ background: `linear-gradient(to bottom, ${colorConfig.cardBg}, transparent)` }}
        aria-hidden="true"
      />

      <div
        ref={headerRef}
        className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-black/8 px-3 sm:px-8 py-2.5 flex items-center justify-between gap-2 shadow-xs"
      >
        {/* Left: Back & Live Save Status */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={closeEditor}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white hover:bg-gray-100 border border-black/10 text-xs sm:text-sm font-bold text-gray-800 shadow-2xs hover:scale-102 active:scale-98 transition-all"
            title="Kaydet ve panoya dön (Esc)"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Panoya Dön</span>
          </button>

          <div
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-black/5 shadow-2xs"
            aria-live="polite"
          >
            {saveStatus === 'saving' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span className="text-amber-800 hidden xs:inline">Kaydediliyor...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 hidden xs:inline">{persisted ? 'Kaydedildi' : 'Taslak'}</span>
              </>
            )}
          </div>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2 justify-end overflow-x-auto no-scrollbar">
          {focusMode ? (
            <button
              type="button"
              onClick={() => setFocusMode(false)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold"
            >
              <Focus className="w-3.5 h-3.5" />
              Odak modundan çık
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCopyNote}
                className={`flex-shrink-0 flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                  copied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                }`}
                title="Tüm Not İçeriğini Panoya Kopyala"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? 'Kopyalandı!' : 'Kopyala'}</span>
              </button>

              <button
                type="button"
                onClick={() => update({ isPinned: !draft.isPinned })}
                className={`flex-shrink-0 p-2 rounded-xl border transition-all ${
                  draft.isPinned
                    ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-sm'
                    : 'bg-white hover:bg-gray-50 border-black/10 text-gray-700 shadow-2xs'
                }`}
                title={draft.isPinned ? 'Sabitlemeyi Kaldır' : 'Başa Sabitle'}
                aria-pressed={draft.isPinned}
              >
                <Pin className={`w-4 h-4 ${draft.isPinned ? 'fill-current' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => togglePopover('reminder')}
                className={`flex-shrink-0 p-2 rounded-xl border transition-all ${
                  draft.reminderAt
                    ? reminderOverdue
                      ? 'bg-red-100 text-red-700 border-red-300'
                      : 'bg-purple-100 text-purple-800 border-purple-300'
                    : 'bg-white hover:bg-gray-50 border-black/10 text-gray-700 shadow-2xs'
                }`}
                title={draft.reminderAt ? `Hatırlatıcı: ${formatReminder(draft.reminderAt)}` : 'Hatırlatıcı Kur'}
                aria-expanded={popover === 'reminder'}
              >
                {draft.reminderAt ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              </button>

              <button type="button" onClick={() => togglePopover('color')} className={HEADER_BTN} title="Post-it Rengini Değiştir" aria-expanded={popover === 'color'}>
                <Palette className="w-4 h-4" />
              </button>

              <button type="button" onClick={() => togglePopover('font')} className={HEADER_BTN} title="Yazı Tipini Değiştir" aria-expanded={popover === 'font'}>
                <Type className="w-4 h-4" />
              </button>

              <button type="button" onClick={() => togglePopover('more')} className={HEADER_BTN} title="Diğer işlemler" aria-expanded={popover === 'more'}>
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={closeEditor}
            className="flex-shrink-0 px-4 py-2 rounded-xl bg-ink hover:bg-ink/85 text-on-ink text-xs font-bold shadow-md transition-transform hover:scale-102"
          >
            Bitti
          </button>
        </div>
      </div>

      {/* Üst şerit açılır pencereleri (kaydırılabilir şeridin dışında; kırpılmasın) */}
      {popover && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setPopover(null)} aria-hidden="true" />
          <div
            className="fixed right-3 sm:right-8 z-40 w-[min(22rem,calc(100vw-1.5rem))] max-h-[70vh] overflow-y-auto p-3 bg-white rounded-2xl shadow-xl border border-gray-100 animate-scale-in"
            style={{ top: 'calc(var(--note-header-h, 56px) + 0.5rem)' }}
          >
            {popover === 'color' && (
              <ColorPicker
                selectedColor={draft.color}
                onSelectColor={(c) => {
                  update({ color: c });
                  setPopover(null);
                }}
              />
            )}
            {popover === 'font' && (
              <FontSelector
                selectedFont={draft.font}
                onSelectFont={(f) => {
                  update({ font: f });
                  setPopover(null);
                }}
              />
            )}
            {popover === 'reminder' && (
              <ReminderPicker
                value={draft.reminderAt}
                onChange={(at) => {
                  update({ reminderAt: at });
                  showToast(at ? `Hatırlatıcı kuruldu: ${formatReminder(at)} ⏰` : 'Hatırlatıcı kaldırıldı.', at ? 'success' : 'info');
                }}
                onDone={() => setPopover(null)}
              />
            )}
            {popover === 'more' && (
              <div className="text-sm font-semibold text-gray-700 -m-1">
                <MenuRow icon={<Focus className="w-4 h-4" />} label="Odak modu" hint="Dikkat dağıtıcıları gizle" onClick={() => { setFocusMode(true); setPopover(null); }} />
                {canSpeak && (
                  <MenuRow
                    icon={speaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    label={speaking ? 'Okumayı durdur' : 'Sesli oku'}
                    onClick={toggleSpeak}
                  />
                )}
                <MenuRow
                  icon={<History className="w-4 h-4" />}
                  label="Sürüm geçmişi"
                  disabled={!persisted}
                  onClick={() => {
                    setPopover(null);
                    saveNowRef.current();
                    setShowHistory(true);
                  }}
                />
                <MenuRow icon={<Award className="w-4 h-4" />} label="Karta rozet ekle" onClick={() => { setPopover(null); setShowBadgePicker(true); }} />
                <MenuDivider />
                {canShare && <MenuRow icon={<Share2 className="w-4 h-4" />} label="Paylaş" onClick={handleShare} />}
                <MenuRow icon={<FileText className="w-4 h-4" />} label="Markdown olarak indir" hint=".md" onClick={() => handleExport('md')} />
                <MenuRow icon={<FileCode className="w-4 h-4" />} label="Web sayfası olarak indir" hint=".html" onClick={() => handleExport('html')} />
                <MenuRow icon={<FileDown className="w-4 h-4" />} label="Düz metin olarak indir" hint=".txt" onClick={() => handleExport('txt')} />
                <MenuRow icon={<Printer className="w-4 h-4" />} label="Yazdır / PDF kaydet" onClick={handlePrint} />
                <MenuDivider />
                <MenuRow icon={<CopyPlus className="w-4 h-4" />} label="Kopyasını oluştur" disabled={!persisted} onClick={handleDuplicate} />
                <MenuRow
                  icon={isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                  label={isArchived ? 'Arşivden çıkar' : 'Arşivle'}
                  disabled={!persisted}
                  onClick={handleArchive}
                />
                <MenuRow icon={<Trash2 className="w-4 h-4" />} label={persisted ? 'Çöp kutusuna taşı' : 'Taslağı at'} danger onClick={handleDelete} />
              </div>
            )}
          </div>
        </>
      )}

      {/* Main Full-Screen Writing Canvas */}
      <div className={`relative flex-1 w-full mx-auto p-3 sm:p-10 flex flex-col ${focusMode ? 'max-w-3xl' : 'max-w-5xl'}`}>
        {!focusMode && (
          <div className="flex items-center gap-2 flex-wrap pb-3 mb-4 border-b border-black/6">
            {/* Klasör */}
            <label className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-black/10 text-xs font-bold text-gray-700 shadow-2xs cursor-pointer">
              <FolderIcon className="w-3.5 h-3.5 text-purple-600" />
              <select
                value={draft.folderId}
                onChange={(e) => update({ folderId: e.target.value })}
                className="bg-transparent outline-hidden cursor-pointer max-w-[140px] truncate"
                aria-label="Klasör"
              >
                {scopeFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.emoji} {f.name}
                  </option>
                ))}
              </select>
            </label>

            {/* Not türü */}
            <div className="flex items-center p-1 bg-gray-100/90 rounded-xl border border-black/5 gap-1" role="radiogroup" aria-label="Not türü">
              <button
                type="button"
                role="radio"
                aria-checked={draft.kind === 'quick'}
                onClick={() => update({ kind: 'quick' })}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  draft.kind === 'quick' ? 'bg-amber-400 text-amber-950 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Hızlı
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={draft.kind === 'comprehensive'}
                onClick={() => update({ kind: 'comprehensive' })}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  draft.kind === 'comprehensive' ? 'bg-purple-600 text-white shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                Detaylı
              </button>
            </div>

            {draft.reminderAt && (
              <button
                type="button"
                onClick={() => togglePopover('reminder')}
                className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11px] font-bold ${
                  reminderOverdue ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-800'
                }`}
              >
                <BellRing className="w-3.5 h-3.5" />
                {formatReminder(draft.reminderAt)}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    update({ reminderAt: null });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                      update({ reminderAt: null });
                    }
                  }}
                  className="p-0.5 rounded-full hover:bg-black/10"
                  aria-label="Hatırlatıcıyı kaldır"
                >
                  <X className="w-3 h-3" />
                </span>
              </button>
            )}

            {isArchived && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-200 text-gray-700 text-[11px] font-bold">
                <Archive className="w-3.5 h-3.5" /> Arşivde
              </span>
            )}

            <span className="ml-auto text-[11px] font-semibold text-gray-500">{formatFullDate(timestamp)}</span>
          </div>
        )}

        {/* Rozetler (kartın üstünde görünür) */}
        {!focusMode && draft.stickers.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {draft.stickers.map((stk, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white shadow-xs text-sm font-bold border border-black/5 animate-scale-in"
              >
                <span>{stk}</span>
                <button
                  type="button"
                  onClick={() => update({ stickers: draft.stickers.filter((_, idx) => idx !== i) })}
                  className="text-gray-400 hover:text-red-500 p-0.5 rounded-full"
                  aria-label="Rozeti kaldır"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setShowBadgePicker(true)}
              className="px-2.5 py-1 rounded-xl border border-dashed border-black/15 text-xs font-bold text-gray-500 hover:text-gray-800 hover:bg-white"
            >
              + Rozet
            </button>
          </div>
        )}

        {/* Photos Preview Frame */}
        {!focusMode && draft.images.length > 0 && (
          <div className="mb-6">
            <ImageGallery
              images={draft.images}
              noteTitle={draft.title}
              isEditable={true}
              onRemoveImage={(index) => update({ images: draft.images.filter((_, idx) => idx !== index) })}
            />
          </div>
        )}

        <input
          type="text"
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
          onKeyDown={(e) => {
            // Başlıkta Enter: doğrudan metne geç
            if (e.key === 'Enter') {
              e.preventDefault();
              (rootRef.current?.querySelector('.rich-content') as HTMLElement | null)?.focus();
            }
          }}
          placeholder="Not Başlığı..."
          className={`w-full bg-transparent text-2xl sm:text-4xl font-extrabold text-gray-900 placeholder-black/30 outline-hidden mb-3 ${fontConfig.cssClass}`}
          autoFocus={!activeNoteForEdit && !draft.title}
          aria-label="Not başlığı"
        />

        {/* Tags */}
        {!focusMode && (
          <div className="flex items-center gap-1.5 flex-wrap mb-4">
            <Hash className="w-4 h-4 text-gray-400" />
            {draft.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => update({ tags: draft.tags.filter((t) => t !== tag) })}
                  className="p-0.5 rounded-full hover:bg-purple-200"
                  aria-label={`#${tag} etiketini kaldır`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              list="yuppi-tag-suggestions"
              onChange={(e) => {
                const v = e.target.value;
                if (v.endsWith(',') || v.endsWith(' ')) commitTag(v);
                else setTagInput(v);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitTag(tagInput);
                } else if (e.key === 'Backspace' && !tagInput && draft.tags.length > 0) {
                  update({ tags: draft.tags.slice(0, -1) });
                }
              }}
              onBlur={() => tagInput && commitTag(tagInput)}
              placeholder={draft.tags.length ? 'etiket ekle' : 'Etiket ekle (Enter)'}
              className="min-w-[110px] flex-1 bg-transparent text-base sm:text-xs font-semibold text-gray-700 placeholder-black/30 outline-hidden"
              maxLength={30}
              aria-label="Etiket ekle"
            />
            <datalist id="yuppi-tag-suggestions">
              {allTags
                .filter((t) => !draft.tags.includes(t.tag))
                .map((t) => (
                  <option key={t.tag} value={t.tag} />
                ))}
            </datalist>
          </div>
        )}

        {/* Rich Text Editor */}
        <div className="flex-1 flex flex-col">
          <RichEditor
            value={draft.content}
            onChange={(html) => update({ content: html })}
            fontClass={fontConfig.cssClass}
            spellCheck={prefs.spellcheck}
            hideToolbar={focusMode}
            onImageFiles={addImages}
            onRequestImage={() => fileInputRef.current?.click()}
            onRequestDrawing={() => setShowDrawing(true)}
            placeholder={
              draft.kind === 'comprehensive'
                ? 'Yazmaya başla… İpucu: "# " başlık, "- " liste, "[] " yapılacak kutusu oluşturur.'
                : 'Kopyalanabilir notunun içeriğini buraya yaz…'
            }
            fullHeight={true}
          />
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
        </div>

        <div className="mt-4 pt-3 border-t border-gray-200 flex items-center gap-x-4 gap-y-1 flex-wrap text-[11px] font-semibold text-gray-500 pb-[env(safe-area-inset-bottom)]">
          <span>{stats.words} kelime</span>
          <span>{stats.chars} karakter</span>
          <span>~{stats.minutes} dk okuma</span>
          {stats.tasks.total > 0 && (
            <span className="text-emerald-700">
              ✓ {stats.tasks.done}/{stats.tasks.total} görev
            </span>
          )}
          <span className="ml-auto hidden sm:inline">Ctrl+S kaydet · Esc kaydet ve kapat</span>
        </div>
      </div>

      <StickerPicker
        isOpen={showBadgePicker}
        onClose={() => setShowBadgePicker(false)}
        onSelectSticker={handleAddBadge}
        title="Karta Rozet Ekle"
      />
      <DrawingPad
        isOpen={showDrawing}
        onClose={() => setShowDrawing(false)}
        onSave={(dataUrl) => {
          update({ images: [...draftRef.current.images, dataUrl] });
          showToast('Çizim nota eklendi 🎨', 'success');
        }}
      />
      <HistoryPanel
        isOpen={showHistory}
        noteId={idRef.current}
        onClose={() => setShowHistory(false)}
        onRestore={handleRestoreVersion}
      />
    </div>
  );
};

const MenuRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}> = ({ icon, label, hint, onClick, danger, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors disabled:opacity-40 disabled:pointer-events-none ${
      danger ? 'text-red-600 hover:bg-red-50' : 'hover:bg-purple-50 hover:text-purple-800'
    }`}
  >
    {icon}
    <span className="flex-1">{label}</span>
    {hint && <span className="text-[11px] font-semibold text-gray-400">{hint}</span>}
  </button>
);

const MenuDivider = () => <div className="my-1 border-t border-gray-100" />;
