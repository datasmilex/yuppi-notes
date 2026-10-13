'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import { ModalShell } from '../Common/ModalShell';
import { getNoteHistory, NoteVersion } from '../../utils/history';
import { formatFullDate, formatRelativeTime } from '../../utils/date';
import { sanitizeHtml } from '../../utils/sanitize';

interface HistoryPanelProps {
  isOpen: boolean;
  noteId: string;
  onClose: () => void;
  onRestore: (version: NoteVersion) => void;
}

const stripTags = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** Notun önceki halleri: soldan seç, sağda önizle, tek tıkla geri yükle. */
export const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, noteId, onClose, onRestore }) => {
  const [versions, setVersions] = useState<NoteVersion[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setVersions(null);
    getNoteHistory(noteId).then((list) => {
      if (cancelled) return;
      setVersions(list);
      setSelectedId(list[0]?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, noteId]);

  const selected = versions?.find((v) => v.id === selectedId) || null;
  const preview = useMemo(() => (selected ? sanitizeHtml(selected.content) : ''), [selected]);

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Sürüm Geçmişi"
      subtitle="Her düzenleme oturumundan önceki hal saklanır (son 30 sürüm)"
      icon={<History className="w-5 h-5" />}
      size="2xl"
      bodyClassName="p-0"
      footer={
        selected && (
          <>
            <span className="mr-auto text-[11px] font-semibold text-gray-500 hidden sm:inline">
              Geri yüklemeden önce mevcut hal de geçmişe eklenir.
            </span>
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100">
              Kapat
            </button>
            <button
              type="button"
              onClick={() => {
                onRestore(selected);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md"
            >
              <RotateCcw className="w-4 h-4" />
              Bu Sürümü Geri Yükle
            </button>
          </>
        )
      }
    >
      {versions === null ? (
        <div className="p-10 text-center text-sm text-gray-400">Yükleniyor…</div>
      ) : versions.length === 0 ? (
        <div className="p-10 text-center">
          <span className="text-3xl block mb-2">🕰️</span>
          <p className="text-sm font-bold text-gray-800">Henüz kayıtlı bir sürüm yok</p>
          <p className="text-xs text-gray-500 mt-1">Notu düzenleyip kapattığında önceki hali burada görünecek.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-[240px_1fr] min-h-[50vh]">
          <ul className="border-b sm:border-b-0 sm:border-r border-gray-100 p-2 max-h-48 sm:max-h-[60vh] overflow-y-auto">
            {versions.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(v.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${
                    v.id === selectedId ? 'bg-purple-600 text-white' : 'hover:bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="text-xs font-bold">{formatRelativeTime(v.at)}</div>
                  <div className={`text-[11px] truncate ${v.id === selectedId ? 'text-white/80' : 'text-gray-500'}`}>
                    {v.by} · {stripTags(v.content).slice(0, 40) || v.title || '—'}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div className="p-5 sm:p-6 overflow-y-auto max-h-[60vh]">
            {selected && (
              <>
                <div className="text-[11px] font-semibold text-gray-400 mb-1">{formatFullDate(selected.at)}</div>
                <h3 className="text-xl font-extrabold text-gray-900 mb-3">{selected.title || 'Başlıksız Not'}</h3>
                <div
                  className="rich-content text-sm leading-relaxed text-gray-800"
                  dangerouslySetInnerHTML={{ __html: preview || '<p style="opacity:.5">(boş içerik)</p>' }}
                />
              </>
            )}
          </div>
        </div>
      )}
    </ModalShell>
  );
};
