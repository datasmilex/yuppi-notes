'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  List,
  ListOrdered,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  RemoveFormatting,
  Sparkles,
  Undo2,
  Redo2,
  Quote,
  SquareCode,
  Minus,
  Link as LinkIcon,
  Unlink,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Baseline,
  ImagePlus,
  Brush,
  Mic,
  MicOff,
  Check,
  X,
} from 'lucide-react';
import { StickerPicker } from './StickerPicker';
import { StickerItem } from '../../utils/stickers';
import { sanitizeHtml } from '../../utils/sanitize';
import { plainTextToHtml, escapeHtml } from '../../utils/text';
import { imageFilesFrom } from '../../utils/image';
import { useToast } from '../Common/Toast';
import { useEscape } from '../../hooks/useEscape';

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  fontClass?: string;
  placeholder?: string;
  fullHeight?: boolean;
  spellCheck?: boolean;
  hideToolbar?: boolean;
  /** Yapıştırılan / sürüklenen görseller (not galerisine eklenir). */
  onImageFiles?: (files: File[]) => void;
  onRequestImage?: () => void;
  onRequestDrawing?: () => void;
}

const TOOL_BTN =
  'flex-shrink-0 p-1.5 rounded-xl text-gray-700 hover:bg-white hover:text-black transition-colors disabled:opacity-40';
const TOOL_ACTIVE = 'bg-white text-purple-700 shadow-2xs ring-1 ring-purple-200';
const DIVIDER = 'flex-shrink-0 w-[1px] h-4 bg-black/15 mx-1';

const HIGHLIGHTS = [
  { color: '#FEF08A', label: 'Sarı' },
  { color: '#A7F3D0', label: 'Yeşil' },
  { color: '#FBCFE8', label: 'Pembe' },
  { color: '#BAE6FD', label: 'Mavi' },
  { color: '#FED7AA', label: 'Turuncu' },
];

const TEXT_COLORS = [
  { color: '#DC2626', label: 'Kırmızı' },
  { color: '#EA580C', label: 'Turuncu' },
  { color: '#CA8A04', label: 'Hardal' },
  { color: '#16A34A', label: 'Yeşil' },
  { color: '#0891B2', label: 'Turkuaz' },
  { color: '#2563EB', label: 'Mavi' },
  { color: '#9333EA', label: 'Mor' },
  { color: '#DB2777', label: 'Pembe' },
  { color: '#6B7280', label: 'Gri' },
];

const BLOCK_SELECTOR = 'p,div,h1,h2,h3,blockquote,pre,li';
const URL_RE = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/g;

interface ActiveState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  block: string;
  list: 'ul' | 'ol' | 'check' | null;
  align: 'left' | 'center' | 'right';
  link: boolean;
}

const EMPTY_ACTIVE: ActiveState = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  block: 'p',
  list: null,
  align: 'left',
  link: false,
};

// Tarayıcı ses tanıma API'si (Chrome/Edge: webkit önekli) için asgari tipler
interface SpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechCtor = new () => SpeechRecognitionLike;

function closestElement(node: Node | null, selector: string, root: HTMLElement): HTMLElement | null {
  let el: Node | null = node;
  while (el && el !== root) {
    if (el.nodeType === Node.ELEMENT_NODE && (el as HTMLElement).matches(selector)) return el as HTMLElement;
    el = el.parentNode;
  }
  return null;
}

function linkify(escapedHtml: string): string {
  return escapedHtml.replace(URL_RE, (url) => `<a href="${url}">${url}</a>`);
}

function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(value)) return `https://${value}`;
  return null;
}

export const RichEditor: React.FC<RichEditorProps> = ({
  value,
  onChange,
  fontClass = 'font-sans',
  placeholder = 'Buraya düşüncelerini, listelerini veya notlarını yaz...',
  fullHeight = false,
  spellCheck = true,
  hideToolbar = false,
  onImageFiles,
  onRequestImage,
  onRequestDrawing,
}) => {
  const { showToast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [popover, setPopover] = useState<'color' | 'highlight' | 'link' | null>(null);
  const [linkInput, setLinkInput] = useState('');
  const [active, setActive] = useState<ActiveState>(EMPTY_ACTIVE);
  const [listening, setListening] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEscape(popover !== null, () => setPopover(null));

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.innerHTML !== value) {
      editor.innerHTML = sanitizeHtml(value || '');
    }
  }, [value]);

  // Sesle yazma açıkken editör kapanırsa mikrofonu bırak
  useEffect(() => () => recognitionRef.current?.stop(), []);

  const emitChange = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    // Her şey silindiğinde tarayıcının bıraktığı <br> yüzünden yer tutucu kaybolmasın
    if (!editor.textContent?.trim() && !editor.querySelector('img,li,hr')) {
      editor.innerHTML = '';
    }
    onChange(editor.innerHTML);
  }, [onChange]);

  const rememberSelection = useCallback(() => {
    const editor = editorRef.current;
    const sel = window.getSelection();
    if (editor && sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus({ preventScroll: true });
    const sel = window.getSelection();
    if (!sel) return;
    if (savedRange.current && editor.contains(savedRange.current.startContainer)) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    } else if (!editor.contains(sel.anchorNode)) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, []);

  // Araç çubuğundaki düğmelerin "etkin" görünümü imlecin bulunduğu biçimi yansıtır
  const refreshActive = useCallback(() => {
    const editor = editorRef.current;
    const sel = window.getSelection();
    if (!editor || !sel || !sel.anchorNode || !editor.contains(sel.anchorNode)) return;
    const node = sel.anchorNode;
    const blockEl = closestElement(node, 'h1,h2,h3,blockquote,pre', editor);
    const listEl = closestElement(node, 'ul,ol', editor);
    const alignEl = closestElement(node, BLOCK_SELECTOR, editor);
    const align = alignEl ? getComputedStyle(alignEl).textAlign : 'left';
    setActive({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strike: document.queryCommandState('strikeThrough'),
      block: blockEl ? blockEl.tagName.toLowerCase() : 'p',
      list: listEl ? (listEl.hasAttribute('data-checklist') ? 'check' : listEl.tagName === 'OL' ? 'ol' : 'ul') : null,
      align: align === 'center' ? 'center' : align === 'right' || align === 'end' ? 'right' : 'left',
      link: Boolean(closestElement(node, 'a', editor)),
    });
  }, []);

  useEffect(() => {
    const onSelection = () => {
      rememberSelection();
      refreshActive();
    };
    document.addEventListener('selectionchange', onSelection);
    return () => document.removeEventListener('selectionchange', onSelection);
  }, [rememberSelection, refreshActive]);

  const after = () => {
    emitChange();
    rememberSelection();
    refreshActive();
  };

  const exec = (command: string, arg?: string) => {
    restoreSelection();
    document.execCommand(command, false, arg);
    after();
  };

  /** Seçimle kesişen satır içi stilleri (renk / vurgu) temizler. */
  const clearInlineStyle = (prop: 'color' | 'background-color') => {
    const editor = editorRef.current;
    const sel = window.getSelection();
    if (!editor || !sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    editor.querySelectorAll<HTMLElement>('span[style], font').forEach((el) => {
      if (!range.intersectsNode(el)) return;
      if (el.tagName === 'FONT') el.removeAttribute(prop === 'color' ? 'color' : 'style');
      el.style.removeProperty(prop);
      if (prop === 'background-color') el.style.removeProperty('background');
      if (!el.getAttribute('style')?.trim() && el.tagName === 'SPAN') {
        while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
        el.remove();
      }
    });
  };

  const applyInlineColor = (kind: 'color' | 'highlight', color: string | null) => {
    restoreSelection();
    if (color === null) {
      clearInlineStyle(kind === 'color' ? 'color' : 'background-color');
    } else {
      document.execCommand('styleWithCSS', false, 'true');
      if (kind === 'color') document.execCommand('foreColor', false, color);
      else if (!document.execCommand('hiliteColor', false, color)) document.execCommand('backColor', false, color);
      document.execCommand('styleWithCSS', false, 'false');
    }
    setPopover(null);
    after();
  };

  /** Aynı blok biçimine tekrar basılırsa normal paragrafa döner. */
  const toggleBlock = (tag: 'h1' | 'h2' | 'h3' | 'blockquote' | 'pre') => {
    restoreSelection();
    document.execCommand('formatBlock', false, active.block === tag ? '<p>' : `<${tag}>`);
    after();
  };

  const markAsChecklist = (ul: HTMLElement) => {
    ul.setAttribute('data-checklist', 'true');
    ul.querySelectorAll(':scope > li').forEach((li) => {
      if (!li.hasAttribute('data-checked')) li.setAttribute('data-checked', 'false');
    });
  };

  const toggleChecklistRaw = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const sel = window.getSelection();
    const currentList = closestElement(sel?.anchorNode || null, 'ul,ol', editor);

    if (currentList && currentList.tagName === 'UL' && !currentList.hasAttribute('data-checklist')) {
      markAsChecklist(currentList);
    } else if (currentList && currentList.hasAttribute('data-checklist')) {
      document.execCommand('insertUnorderedList');
    } else {
      if (currentList) document.execCommand('insertOrderedList'); // numaralı listeden çık
      document.execCommand('insertUnorderedList');
      const created = closestElement(window.getSelection()?.anchorNode || null, 'ul', editor);
      if (created) markAsChecklist(created);
    }
  };

  const toggleChecklist = () => {
    restoreSelection();
    toggleChecklistRaw();
    after();
  };

  const insertHtmlAtCursor = (html: string) => {
    restoreSelection();
    document.execCommand('insertHTML', false, html);
    after();
  };

  // ---------- Bağlantılar ----------
  const openLinkPopover = () => {
    const editor = editorRef.current;
    restoreSelection();
    const anchor = editor ? closestElement(window.getSelection()?.anchorNode || null, 'a', editor) : null;
    setLinkInput(anchor?.getAttribute('href') || '');
    rememberSelection();
    setPopover('link');
  };

  const applyLink = (e?: React.FormEvent) => {
    e?.preventDefault();
    const url = normalizeUrl(linkInput);
    if (!url) {
      showToast('Geçerli bir bağlantı girin (ör. https://ornek.com).', 'error');
      return;
    }
    const editor = editorRef.current;
    restoreSelection();
    const sel = window.getSelection();
    const anchor = editor ? closestElement(sel?.anchorNode || null, 'a', editor) : null;
    if (anchor) {
      anchor.setAttribute('href', url);
    } else if (sel && !sel.isCollapsed) {
      document.execCommand('createLink', false, url);
    } else {
      const text = escapeHtml(url.replace(/^mailto:/, ''));
      document.execCommand('insertHTML', false, `<a href="${escapeHtml(url)}">${text}</a>&nbsp;`);
    }
    setPopover(null);
    after();
  };

  const removeLink = () => {
    const editor = editorRef.current;
    restoreSelection();
    const anchor = editor ? closestElement(window.getSelection()?.anchorNode || null, 'a', editor) : null;
    if (anchor) {
      const range = document.createRange();
      range.selectNodeContents(anchor);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    document.execCommand('unlink');
    setPopover(null);
    after();
  };

  // ---------- Çıkartma ----------
  const handleInsertSticker = (sticker: StickerItem) => {
    const content = escapeHtml(sticker.content);
    const html =
      sticker.category === 'badge'
        ? `&nbsp;<span style="display:inline-block; padding:0.15rem 0.55rem; background:${sticker.bg}; color:${sticker.color}; border-radius:0.5rem; font-weight:800; font-size:0.75rem; vertical-align:middle; margin:0 0.2rem; user-select:none; border:1px solid rgba(0,0,0,0.06);">${content}</span>&nbsp;`
        : `&nbsp;<span style="display:inline-block; font-size:1.4rem; vertical-align:middle; margin:0 0.2rem; user-select:none;">${content}</span>&nbsp;`;
    insertHtmlAtCursor(html);
  };

  // ---------- Sesle yazma ----------
  const insertSpokenText = (text: string) => {
    if (!text) return;
    restoreSelection();
    const sel = window.getSelection();
    let prefix = '';
    if (sel && sel.anchorNode && sel.anchorNode.nodeType === Node.TEXT_NODE) {
      const prev = (sel.anchorNode.textContent || '').slice(0, sel.anchorOffset);
      if (prev && !/\s$/.test(prev)) prefix = ' ';
    }
    document.execCommand('insertText', false, prefix + text);
    after();
  };

  const toggleDictation = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      showToast('Sesle yazma bu tarayıcıda desteklenmiyor. Chrome veya Edge deneyin.', 'error');
      return;
    }
    const rec = new Ctor();
    rec.lang = 'tr-TR';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i];
        if (r.isFinal) insertSpokenText(r[0].transcript.trim());
      }
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        showToast('Mikrofon izni verilmedi.', 'error');
      } else if (e.error === 'network') {
        showToast('Ses tanıma için internet bağlantısı gerekli.', 'error');
      } else if (e.error !== 'aborted' && e.error !== 'no-speech') {
        showToast('Ses tanıma durdu. Tekrar deneyin.', 'error');
      }
    };
    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    try {
      rememberSelection();
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
      showToast('Dinliyorum… Konuşmaya başla 🎤', 'info');
    } catch {
      showToast('Mikrofon başlatılamadı.', 'error');
    }
  };

  // ---------- Markdown kısayolları ----------
  /** Satır başına yazılan işareti (#, -, 1., [], >, ```) biçime çevirir. */
  const tryMarkdown = (trigger: 'space' | 'enter'): boolean => {
    const editor = editorRef.current;
    const sel = window.getSelection();
    if (!editor || !sel || !sel.isCollapsed || !sel.anchorNode) return false;
    const anchor = sel.anchorNode;
    if (anchor.nodeType !== Node.TEXT_NODE) return false;
    const block = closestElement(anchor, BLOCK_SELECTOR, editor) || editor;
    if (block.tagName === 'LI' || block.tagName === 'PRE') return false;

    const range = document.createRange();
    range.setStart(block, 0);
    range.setEnd(anchor, sel.anchorOffset);
    const marker = range.toString();

    let action: (() => void) | null = null;
    if (trigger === 'enter') {
      if (marker === '---' || marker === '***') action = () => document.execCommand('insertHorizontalRule');
    } else {
      const map: Record<string, () => void> = {
        '#': () => document.execCommand('formatBlock', false, '<h1>'),
        '##': () => document.execCommand('formatBlock', false, '<h2>'),
        '###': () => document.execCommand('formatBlock', false, '<h3>'),
        '>': () => document.execCommand('formatBlock', false, '<blockquote>'),
        '```': () => document.execCommand('formatBlock', false, '<pre>'),
        '-': () => document.execCommand('insertUnorderedList'),
        '*': () => document.execCommand('insertUnorderedList'),
        '1.': () => document.execCommand('insertOrderedList'),
        '[]': toggleChecklistRaw,
        '[ ]': toggleChecklistRaw,
      };
      action = map[marker] || null;
    }
    if (!action) return false;

    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('delete');
    action();
    after();
    return true;
  };

  // ---------- Olaylar ----------
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const images = imageFilesFrom(e.clipboardData.items);
    if (images.length && onImageFiles) {
      e.preventDefault();
      onImageFiles(images);
      return;
    }
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    if (!html && !text) return;
    e.preventDefault();

    // Seçili metnin üzerine yalnızca bir bağlantı yapıştırılırsa metin bağlantıya dönüşür
    const sel = window.getSelection();
    const pastedUrl = !html && normalizeUrl(text) && /^\S+$/.test(text.trim()) ? normalizeUrl(text) : null;
    if (pastedUrl && sel && !sel.isCollapsed) {
      document.execCommand('createLink', false, pastedUrl);
      after();
      return;
    }

    const clean = html ? sanitizeHtml(html, { stripStyles: true }) : linkify(plainTextToHtml(text));
    document.execCommand('insertHTML', false, clean);
    after();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    setDragOver(false);
    const images = imageFilesFrom(e.dataTransfer.files);
    if (images.length && onImageFiles) {
      e.preventDefault();
      onImageFiles(images);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const editor = editorRef.current;
    if (!editor) return;
    const anchor = closestElement(e.target as Node, 'a', editor);
    if (anchor && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      window.open(anchor.getAttribute('href') || '', '_blank', 'noopener,noreferrer');
      return;
    }
    const li = closestElement(e.target as Node, 'ul[data-checklist] > li', editor);
    if (li) {
      const fontSize = parseFloat(getComputedStyle(li).fontSize) || 16;
      const offsetX = e.clientX - li.getBoundingClientRect().left;
      if (offsetX <= fontSize * 1.6) {
        e.preventDefault();
        li.setAttribute('data-checked', li.getAttribute('data-checked') === 'true' ? 'false' : 'true');
        emitChange();
        return;
      }
    }
    rememberSelection();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const editor = editorRef.current;
    if (!editor) return;
    const mod = e.ctrlKey || e.metaKey;

    if (e.key === ' ' && !mod && tryMarkdown('space')) {
      e.preventDefault();
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      if (tryMarkdown('enter')) {
        e.preventDefault();
        return;
      }
      // Yeni satır tarayıcı tarafından önceki maddenin durumuyla oluşturulur; yeni madde işaretsiz olmalı
      setTimeout(() => {
        const li = closestElement(window.getSelection()?.anchorNode || null, 'ul[data-checklist] > li', editor);
        if (li && li.getAttribute('data-checked') === 'true') {
          li.setAttribute('data-checked', 'false');
          emitChange();
        }
      }, 0);
    }

    if (e.key === 'Tab') {
      const node = window.getSelection()?.anchorNode || null;
      if (closestElement(node, 'li', editor)) {
        e.preventDefault();
        document.execCommand(e.shiftKey ? 'outdent' : 'indent');
        after();
      } else if (closestElement(node, 'pre', editor) && !e.shiftKey) {
        e.preventDefault();
        document.execCommand('insertText', false, '  ');
        after();
      }
      return;
    }

    if (!mod) return;
    const key = e.key.toLowerCase();
    if (key === 'k') {
      e.preventDefault();
      openLinkPopover();
    } else if (e.shiftKey && key === 'x') {
      e.preventDefault();
      exec('strikeThrough');
    } else if (e.shiftKey && (e.code === 'Digit7' || e.code === 'Digit8' || e.code === 'Digit9')) {
      e.preventDefault();
      if (e.code === 'Digit7') exec('insertOrderedList');
      else if (e.code === 'Digit8') exec('insertUnorderedList');
      else toggleChecklist();
    }
  };

  // Araç çubuğu düğmeleri odağı/seçimi çalmasın
  const keepFocus = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('input')) return;
    e.preventDefault();
  };

  const btn = (isActive: boolean) => `${TOOL_BTN} ${isActive ? TOOL_ACTIVE : ''}`;
  // Electron'da API görünür ama Google ses hizmeti anahtarı olmadığı için çalışmaz; orada düğme gizlenir
  const dictationSupported =
    typeof window !== 'undefined' &&
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) &&
    !('electronAPI' in window);

  return (
    <div
      className={`relative flex flex-col border rounded-3xl bg-white shadow-xs focus-within:shadow-lg transition-all flex-1 ${
        dragOver ? 'border-purple-500 ring-4 ring-purple-200' : 'border-black/8 focus-within:border-purple-400'
      }`}
    >
      {/* Editor Toolbar (uzun notlarda üstte yapışık kalır) */}
      {!hideToolbar && (
        <div
          className="sticky z-20 rounded-t-3xl bg-white"
          style={{ top: 'var(--note-header-h, 0px)' }}
        >
          <div
            className="flex items-center gap-1 p-2 border-b border-black/6 bg-black/3 rounded-t-3xl overflow-x-auto no-scrollbar"
            onMouseDown={keepFocus}
            role="toolbar"
            aria-label="Biçimlendirme"
          >
            <button type="button" onClick={() => exec('undo')} className={TOOL_BTN} title="Geri Al (Ctrl+Z)" aria-label="Geri al">
              <Undo2 className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => exec('redo')} className={TOOL_BTN} title="Yinele (Ctrl+Y)" aria-label="Yinele">
              <Redo2 className="w-4 h-4" />
            </button>

            <div className={DIVIDER} />

            <button type="button" onClick={() => exec('bold')} className={btn(active.bold)} title="Kalın (Ctrl+B)" aria-pressed={active.bold}>
              <Bold className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => exec('italic')} className={btn(active.italic)} title="İtalik (Ctrl+I)" aria-pressed={active.italic}>
              <Italic className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => exec('underline')} className={btn(active.underline)} title="Altı Çizili (Ctrl+U)" aria-pressed={active.underline}>
              <Underline className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => exec('strikeThrough')} className={btn(active.strike)} title="Üstü Çizili (Ctrl+Shift+X)" aria-pressed={active.strike}>
              <Strikethrough className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPopover(popover === 'color' ? null : 'color')}
              className={btn(popover === 'color')}
              title="Yazı Rengi"
              aria-expanded={popover === 'color'}
            >
              <Baseline className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPopover(popover === 'highlight' ? null : 'highlight')}
              className={btn(popover === 'highlight')}
              title="Fosforlu Vurgu"
              aria-expanded={popover === 'highlight'}
            >
              <Highlighter className="w-4 h-4 text-amber-600" />
            </button>

            <div className={DIVIDER} />

            <button type="button" onClick={() => toggleBlock('h1')} className={btn(active.block === 'h1')} title="Büyük Başlık (# + boşluk)">
              <Heading1 className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => toggleBlock('h2')} className={btn(active.block === 'h2')} title="Alt Başlık (## + boşluk)">
              <Heading2 className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => toggleBlock('h3')} className={btn(active.block === 'h3')} title="Küçük Başlık (### + boşluk)">
              <Heading3 className="w-4 h-4" />
            </button>

            <div className={DIVIDER} />

            <button type="button" onClick={() => exec('insertUnorderedList')} className={btn(active.list === 'ul')} title="Madde İmleri (- + boşluk)">
              <List className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => exec('insertOrderedList')} className={btn(active.list === 'ol')} title="Numaralı Liste (1. + boşluk)">
              <ListOrdered className="w-4 h-4" />
            </button>
            <button type="button" onClick={toggleChecklist} className={btn(active.list === 'check')} title="Yapılacaklar Listesi ([] + boşluk)">
              <CheckSquare className="w-4 h-4 text-purple-700" />
            </button>

            <div className={DIVIDER} />

            <button type="button" onClick={() => toggleBlock('blockquote')} className={btn(active.block === 'blockquote')} title="Alıntı (> + boşluk)">
              <Quote className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => toggleBlock('pre')} className={btn(active.block === 'pre')} title="Kod Bloğu (``` + boşluk)">
              <SquareCode className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => exec('insertHorizontalRule')} className={TOOL_BTN} title="Ayırıcı Çizgi (--- + Enter)">
              <Minus className="w-4 h-4" />
            </button>
            <button type="button" onClick={openLinkPopover} className={btn(active.link || popover === 'link')} title="Bağlantı (Ctrl+K)">
              <LinkIcon className="w-4 h-4" />
            </button>

            <div className={DIVIDER} />

            <button type="button" onClick={() => exec('justifyLeft')} className={btn(active.align === 'left')} title="Sola Hizala">
              <AlignLeft className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => exec('justifyCenter')} className={btn(active.align === 'center')} title="Ortala">
              <AlignCenter className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => exec('justifyRight')} className={btn(active.align === 'right')} title="Sağa Hizala">
              <AlignRight className="w-4 h-4" />
            </button>

            <div className={DIVIDER} />

            {onRequestImage && (
              <button type="button" onClick={onRequestImage} className={TOOL_BTN} title="Fotoğraf Ekle (yapıştır / sürükle de olur)">
                <ImagePlus className="w-4 h-4 text-purple-700" />
              </button>
            )}
            {onRequestDrawing && (
              <button type="button" onClick={onRequestDrawing} className={TOOL_BTN} title="Çizim Yap">
                <Brush className="w-4 h-4 text-pink-600" />
              </button>
            )}
            {dictationSupported && (
              <button
                type="button"
                onClick={toggleDictation}
                className={`${TOOL_BTN} ${listening ? 'bg-red-500 text-white hover:bg-red-600 hover:text-white animate-pulse' : ''}`}
                title={listening ? 'Dinlemeyi Durdur' : 'Sesle Yaz (Türkçe)'}
                aria-pressed={listening}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                rememberSelection();
                setIsStickerPickerOpen(true);
              }}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-xs hover:scale-105 active:scale-95 transition-all"
              title="Sticker Yapıştır"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sticker</span>
            </button>

            <div className={DIVIDER} />

            <button type="button" onClick={() => exec('removeFormat')} className={TOOL_BTN} title="Biçimi Temizle">
              <RemoveFormatting className="w-4 h-4" />
            </button>
          </div>

          {/* Açılır paneller: araç çubuğunun altında, tam genişlikte (mobilde taşmasın) */}
          {popover && (
            <div
              className="absolute left-2 right-2 sm:right-auto sm:min-w-[340px] top-full mt-1 z-30 p-3 bg-white rounded-2xl shadow-xl border border-gray-100 animate-scale-in"
              onMouseDown={keepFocus}
            >
              {popover === 'color' && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Yazı Rengi</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => applyInlineColor('color', null)}
                      className="h-8 px-2.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-700 hover:bg-gray-50"
                    >
                      Otomatik
                    </button>
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c.color}
                        type="button"
                        onClick={() => applyInlineColor('color', c.color)}
                        className="w-8 h-8 rounded-lg border border-black/10 flex items-center justify-center font-black text-sm hover:scale-110 transition-transform bg-white"
                        style={{ color: c.color }}
                        title={c.label}
                        aria-label={`${c.label} yazı rengi`}
                      >
                        A
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {popover === 'highlight' && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Fosforlu Vurgu</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => applyInlineColor('highlight', null)}
                      className="h-8 px-2.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-700 hover:bg-gray-50"
                    >
                      Kaldır
                    </button>
                    {HIGHLIGHTS.map((h) => (
                      <button
                        key={h.color}
                        type="button"
                        onClick={() => applyInlineColor('highlight', h.color)}
                        className="w-8 h-8 rounded-lg border border-black/10 hover:scale-110 transition-transform"
                        style={{ backgroundColor: h.color }}
                        title={`${h.label} fosforlu`}
                        aria-label={`${h.label} fosforlu`}
                      />
                    ))}
                  </div>
                </div>
              )}
              {popover === 'link' && (
                <form onSubmit={applyLink} className="flex items-center gap-1.5">
                  <LinkIcon className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <input
                    autoFocus
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="https://… veya e-posta"
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-base sm:text-xs font-semibold text-gray-800 outline-hidden focus:border-purple-400"
                    aria-label="Bağlantı adresi"
                  />
                  <button type="submit" className="p-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700" title="Uygula">
                    <Check className="w-4 h-4" />
                  </button>
                  {active.link && (
                    <button type="button" onClick={removeLink} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50" title="Bağlantıyı Kaldır">
                      <Unlink className="w-4 h-4" />
                    </button>
                  )}
                  <button type="button" onClick={() => setPopover(null)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" title="Vazgeç">
                    <X className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* ContentEditable writing area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Not içeriği"
        spellCheck={spellCheck}
        onInput={emitChange}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(e) => {
          if (onImageFiles && Array.from(e.dataTransfer.types).includes('Files')) {
            e.preventDefault();
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`rich-content p-5 sm:p-8 outline-hidden text-base sm:text-lg leading-relaxed text-gray-900 max-w-none ${fontClass} ${
          fullHeight ? 'min-h-[50vh] flex-1' : 'min-h-[220px]'
        }`}
        data-placeholder={placeholder}
      />

      {dragOver && (
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-purple-500/10 flex items-center justify-center">
          <span className="px-4 py-2 rounded-2xl bg-white shadow-lg text-sm font-bold text-purple-700">📷 Görseli buraya bırak</span>
        </div>
      )}

      <StickerPicker
        isOpen={isStickerPickerOpen}
        onClose={() => setIsStickerPickerOpen(false)}
        onSelectSticker={handleInsertSticker}
      />
    </div>
  );
};
