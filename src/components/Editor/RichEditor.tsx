'use client';

import React, { useRef, useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Highlighter,
  List,
  ListOrdered,
  CheckSquare,
  Heading1,
  Heading2,
  RemoveFormatting,
  Sparkles,
} from 'lucide-react';
import { StickerPicker } from './StickerPicker';
import { StickerItem } from '../../utils/stickers';

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  fontClass?: string;
  placeholder?: string;
  fullHeight?: boolean;
}

export const RichEditor: React.FC<RichEditorProps> = ({
  value,
  onChange,
  fontClass = 'font-sans',
  placeholder = 'Buraya düşüncelerini, listelerini veya notlarını yaz...',
  fullHeight = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef<boolean>(false);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);

  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isUpdatingRef.current = true;
      onChange(editorRef.current.innerHTML);
      isUpdatingRef.current = false;
    }
  };

  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    handleInput();
  };

  const applyHighlight = (color: string) => {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      document.execCommand('hiliteColor', false, color);
    } else {
      const range = selection.getRangeAt(0);
      const span = document.createElement('mark');
      span.style.backgroundColor = color;
      span.style.padding = '0.15rem 0.35rem';
      span.style.borderRadius = '0.35rem';
      span.appendChild(range.extractContents());
      range.insertNode(span);
    }
    handleInput();
  };

  const insertChecklistItem = () => {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const checklistHtml = `<p>⬜ Görev girin...</p>`;
      const tempEl = document.createElement('div');
      tempEl.innerHTML = checklistHtml;
      const node = tempEl.firstChild;
      if (node) {
        range.insertNode(node);
      }
    } else {
      document.execCommand('insertHTML', false, '<p>⬜ Görev girin...</p>');
    }
    handleInput();
  };

  const handleInsertSticker = (sticker: StickerItem) => {
    editorRef.current?.focus();
    let stickerHtml = '';
    if (sticker.category === 'badge') {
      stickerHtml = ` <span style="display:inline-block; padding:0.15rem 0.55rem; background:${sticker.bg}; color:${sticker.color}; border-radius:0.5rem; font-weight:800; font-size:0.75rem; vertical-align:middle; margin:0 0.2rem; user-select:none; border:1px solid rgba(0,0,0,0.06);">${sticker.content}</span> `;
    } else {
      stickerHtml = ` <span style="display:inline-block; font-size:1.4rem; vertical-align:middle; margin:0 0.2rem; user-select:none;">${sticker.content}</span> `;
    }

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const el = document.createElement('div');
      el.innerHTML = stickerHtml;
      const frag = document.createDocumentFragment();
      let node;
      while ((node = el.firstChild)) {
        frag.appendChild(node);
      }
      range.insertNode(frag);
    } else {
      document.execCommand('insertHTML', false, stickerHtml);
    }
    handleInput();
  };

  return (
    <div className="flex flex-col border border-black/8 rounded-3xl overflow-hidden bg-white shadow-xs focus-within:border-purple-400 focus-within:shadow-lg transition-all flex-1">
      {/* Editor Toolbar */}
      <div className="flex items-center gap-1.5 p-2 border-b border-black/6 bg-black/3 flex-wrap">
        {/* Bold */}
        <button
          type="button"
          onClick={() => executeCommand('bold')}
          className="p-1.5 rounded-xl text-gray-700 hover:bg-white hover:text-black transition-colors"
          title="Kalın (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={() => executeCommand('italic')}
          className="p-1.5 rounded-xl text-gray-700 hover:bg-white hover:text-black transition-colors"
          title="İtalik (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        {/* Strikethrough */}
        <button
          type="button"
          onClick={() => executeCommand('strikeThrough')}
          className="p-1.5 rounded-xl text-gray-700 hover:bg-white hover:text-black transition-colors"
          title="Üstü Çizili"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-black/15 mx-1" />

        {/* Highlighters */}
        <div className="flex items-center gap-1" title="Fosforlu Vurgu (Highlight)">
          <button
            type="button"
            onClick={() => applyHighlight('#FEF08A')}
            className="w-6 h-6 rounded-lg bg-yellow-300 border border-yellow-400 hover:scale-110 transition-transform flex items-center justify-center text-xs shadow-2xs"
            title="Sarı Fosforlu"
          >
            <Highlighter className="w-3 h-3 text-yellow-900" />
          </button>
          <button
            type="button"
            onClick={() => applyHighlight('#A7F3D0')}
            className="w-6 h-6 rounded-lg bg-emerald-300 border border-emerald-400 hover:scale-110 transition-transform flex items-center justify-center text-xs shadow-2xs"
            title="Yeşil Fosforlu"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-700" />
          </button>
          <button
            type="button"
            onClick={() => applyHighlight('#FBCFE8')}
            className="w-6 h-6 rounded-lg bg-pink-300 border border-pink-400 hover:scale-110 transition-transform flex items-center justify-center text-xs shadow-2xs"
            title="Pembe Fosforlu"
          >
            <span className="w-2 h-2 rounded-full bg-pink-700" />
          </button>
        </div>

        <div className="w-[1px] h-4 bg-black/15 mx-1" />

        {/* Headings */}
        <button
          type="button"
          onClick={() => executeCommand('formatBlock', '<h1>')}
          className="p-1.5 rounded-xl text-gray-700 hover:bg-white hover:text-black transition-colors"
          title="Büyük Başlık"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('formatBlock', '<h2>')}
          className="p-1.5 rounded-xl text-gray-700 hover:bg-white hover:text-black transition-colors"
          title="Alt Başlık"
        >
          <Heading2 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-black/15 mx-1" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => executeCommand('insertUnorderedList')}
          className="p-1.5 rounded-xl text-gray-700 hover:bg-white hover:text-black transition-colors"
          title="Madde İmleri"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => executeCommand('insertOrderedList')}
          className="p-1.5 rounded-xl text-gray-700 hover:bg-white hover:text-black transition-colors"
          title="Numaralı Liste"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        {/* Checklist */}
        <button
          type="button"
          onClick={insertChecklistItem}
          className="p-1.5 rounded-xl text-gray-700 hover:bg-white hover:text-black transition-colors flex items-center gap-1"
          title="Yapılacaklar Kutusu"
        >
          <CheckSquare className="w-4 h-4 text-purple-700" />
        </button>

        <div className="w-[1px] h-4 bg-black/15 mx-1" />

        {/* Sticker Insert Button */}
        <button
          type="button"
          onClick={() => setIsStickerPickerOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-xs hover:scale-105 active:scale-95 transition-all"
          title="Sticker Yapıştır"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Sticker Yapıştır</span>
        </button>

        <div className="w-[1px] h-4 bg-black/15 mx-1" />

        {/* Clear formatting */}
        <button
          type="button"
          onClick={() => executeCommand('removeFormat')}
          className="p-1.5 rounded-xl text-gray-700 hover:bg-white hover:text-black transition-colors"
          title="Formatı Temizle"
        >
          <RemoveFormatting className="w-4 h-4" />
        </button>
      </div>

      {/* ContentEditable writing area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className={`p-6 sm:p-8 outline-hidden text-base sm:text-lg leading-relaxed text-gray-900 prose prose-lg max-w-none ${fontClass} ${
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
