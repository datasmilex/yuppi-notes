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
  RemoveFormatting,
  Sparkles,
  Eraser,
  Undo2,
  Redo2,
} from 'lucide-react';
import { StickerPicker } from './StickerPicker';
import { StickerItem } from '../../utils/stickers';
import { sanitizeHtml } from '../../utils/sanitize';
import { plainTextToHtml, escapeHtml } from '../../utils/text';

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  fontClass?: string;
  placeholder?: string;
  fullHeight?: boolean;
}

const TOOL_BTN =
  'flex-shrink-0 p-1.5 rounded-xl text-gray-700 hover:bg-white hover:text-black transition-colors';
const DIVIDER = 'flex-shrink-0 w-[1px] h-4 bg-black/15 mx-1';

const HIGHLIGHTS = [
  { color: '#FEF08A', label: 'Sarı Fosforlu', cls: 'bg-yellow-300 border-yellow-400' },
  { color: '#A7F3D0', label: 'Yeşil Fosforlu', cls: 'bg-emerald-300 border-emerald-400' },
  { color: '#FBCFE8', label: 'Pembe Fosforlu', cls: 'bg-pink-300 border-pink-400' },
];

function closestElement(node: Node | null, selector: string, root: HTMLElement): HTMLElement | null {
  let el: Node | null = node;
  while (el && el !== root) {
    if (el.nodeType === Node.ELEMENT_NODE && (el as HTMLElement).matches(selector)) return el as HTMLElement;
    el = el.parentNode;
  }
  return null;
}

export const RichEditor: React.FC<RichEditorProps> = ({
  value,
  onChange,
  fontClass = 'font-sans',
  placeholder = 'Buraya düşüncelerini, listelerini veya notlarını yaz...',
  fullHeight = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.innerHTML !== value) {
      editor.innerHTML = sanitizeHtml(value || '');
    }
  }, [value]);

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
    editor.focus();
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

  const exec = (command: string, arg?: string) => {
    restoreSelection();
    document.execCommand(command, false, arg);
    emitChange();
    rememberSelection();
  };

  const applyHighlight = (color: string) => {
    restoreSelection();
    document.execCommand('styleWithCSS', false, 'true');
    if (!document.execCommand('hiliteColor', false, color)) {
      document.execCommand('backColor', false, color);
    }
    document.execCommand('styleWithCSS', false, 'false');
    emitChange();
    rememberSelection();
  };

  const toggleChecklist = () => {
    const editor = editorRef.current;
    if (!editor) return;
    restoreSelection();
    const sel = window.getSelection();
    const currentList = closestElement(sel?.anchorNode || null, 'ul', editor);

    const markAsChecklist = (ul: HTMLElement) => {
      ul.setAttribute('data-checklist', 'true');
      ul.querySelectorAll(':scope > li').forEach((li) => {
        if (!li.hasAttribute('data-checked')) li.setAttribute('data-checked', 'false');
      });
    };

    if (currentList && !currentList.hasAttribute('data-checklist')) {
      markAsChecklist(currentList);
    } else if (currentList) {
      document.execCommand('insertUnorderedList');
    } else {
      document.execCommand('insertUnorderedList');
      const created = closestElement(window.getSelection()?.anchorNode || null, 'ul', editor);
      if (created) markAsChecklist(created);
    }
    emitChange();
    rememberSelection();
  };

  const handleInsertSticker = (sticker: StickerItem) => {
    restoreSelection();
    const content = escapeHtml(sticker.content);
    const html =
      sticker.category === 'badge'
        ? `&nbsp;<span style="display:inline-block; padding:0.15rem 0.55rem; background:${sticker.bg}; color:${sticker.color}; border-radius:0.5rem; font-weight:800; font-size:0.75rem; vertical-align:middle; margin:0 0.2rem; user-select:none; border:1px solid rgba(0,0,0,0.06);">${content}</span>&nbsp;`
        : `&nbsp;<span style="display:inline-block; font-size:1.4rem; vertical-align:middle; margin:0 0.2rem; user-select:none;">${content}</span>&nbsp;`;
    document.execCommand('insertHTML', false, html);
    emitChange();
    rememberSelection();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    if (!html && !text) return;
    e.preventDefault();
    const clean = html ? sanitizeHtml(html, { stripStyles: true }) : plainTextToHtml(text);
    document.execCommand('insertHTML', false, clean);
    emitChange();
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const editor = editorRef.current;
    if (!editor) return;
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
    if (e.key === 'Enter' && !e.shiftKey) {
      // Yeni satır tarayıcı tarafından önceki maddenin durumuyla oluşturulur; yeni madde işaretsiz olmalı
      setTimeout(() => {
        const li = closestElement(window.getSelection()?.anchorNode || null, 'ul[data-checklist] > li', editor);
        if (li && li.getAttribute('data-checked') === 'true') {
          li.setAttribute('data-checked', 'false');
          emitChange();
        }
      }, 0);
    }
  };

  // Araç çubuğu düğmeleri odağı/seçimi çalmasın
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="flex flex-col border border-black/8 rounded-3xl overflow-hidden bg-white shadow-xs focus-within:border-purple-400 focus-within:shadow-lg transition-all flex-1">
      {/* Editor Toolbar */}
      <div
        className="flex items-center gap-1.5 p-2 border-b border-black/6 bg-black/3 overflow-x-auto no-scrollbar"
        onMouseDown={keepFocus}
        role="toolbar"
        aria-label="Biçimlendirme"
      >
        <button type="button" onClick={() => exec('undo')} className={TOOL_BTN} title="Geri Al (Ctrl+Z)">
          <Undo2 className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => exec('redo')} className={TOOL_BTN} title="Yinele (Ctrl+Y)">
          <Redo2 className="w-4 h-4" />
        </button>

        <div className={DIVIDER} />

        <button type="button" onClick={() => exec('bold')} className={TOOL_BTN} title="Kalın (Ctrl+B)">
          <Bold className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => exec('italic')} className={TOOL_BTN} title="İtalik (Ctrl+I)">
          <Italic className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => exec('underline')} className={TOOL_BTN} title="Altı Çizili (Ctrl+U)">
          <Underline className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => exec('strikeThrough')} className={TOOL_BTN} title="Üstü Çizili">
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className={DIVIDER} />

        <div className="flex flex-shrink-0 items-center gap-1" title="Fosforlu Vurgu (Highlight)">
          {HIGHLIGHTS.map((h, i) => (
            <button
              key={h.color}
              type="button"
              onClick={() => applyHighlight(h.color)}
              className={`w-6 h-6 rounded-lg border hover:scale-110 transition-transform flex items-center justify-center shadow-2xs ${h.cls}`}
              title={h.label}
            >
              {i === 0 ? <Highlighter className="w-3 h-3 text-yellow-900" /> : <span className="w-2 h-2 rounded-full bg-black/40" />}
            </button>
          ))}
          <button
            type="button"
            onClick={() => applyHighlight('transparent')}
            className="w-6 h-6 rounded-lg border border-black/15 hover:scale-110 transition-transform flex items-center justify-center text-gray-600"
            title="Vurguyu Kaldır"
          >
            <Eraser className="w-3 h-3" />
          </button>
        </div>

        <div className={DIVIDER} />

        <button type="button" onClick={() => exec('formatBlock', '<h1>')} className={TOOL_BTN} title="Büyük Başlık">
          <Heading1 className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => exec('formatBlock', '<h2>')} className={TOOL_BTN} title="Alt Başlık">
          <Heading2 className="w-4 h-4" />
        </button>

        <div className={DIVIDER} />

        <button type="button" onClick={() => exec('insertUnorderedList')} className={TOOL_BTN} title="Madde İmleri">
          <List className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => exec('insertOrderedList')} className={TOOL_BTN} title="Numaralı Liste">
          <ListOrdered className="w-4 h-4" />
        </button>
        <button type="button" onClick={toggleChecklist} className={TOOL_BTN} title="Yapılacaklar Listesi (tıklanabilir kutular)">
          <CheckSquare className="w-4 h-4 text-purple-700" />
        </button>

        <div className={DIVIDER} />

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

        <button type="button" onClick={() => exec('removeFormat')} className={TOOL_BTN} title="Formatı Temizle">
          <RemoveFormatting className="w-4 h-4" />
        </button>
      </div>

      {/* ContentEditable writing area */}
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        onInput={emitChange}
        onPaste={handlePaste}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onKeyUp={rememberSelection}
        onBlur={rememberSelection}
        className={`rich-content p-5 sm:p-8 outline-hidden text-base sm:text-lg leading-relaxed text-gray-900 max-w-none ${fontClass} ${
          fullHeight ? 'min-h-[50vh] flex-1' : 'min-h-[220px]'
        }`}
        data-placeholder={placeholder}
      />

      <StickerPicker
        isOpen={isStickerPickerOpen}
        onClose={() => setIsStickerPickerOpen(false)}
        onSelectSticker={handleInsertSticker}
      />
    </div>
  );
};
