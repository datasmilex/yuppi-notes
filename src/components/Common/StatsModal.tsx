'use client';

import React, { useMemo, useState } from 'react';
import { BarChart3, Flame, Hash } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { useNotes } from '../../context/NotesContext';
import { useUI } from '../../context/UIContext';
import { NOTE_COLORS } from '../../utils/colors';
import { checklistProgress } from '../../utils/checklist';
import { dayKey, MONTHS_SHORT, WEEKDAYS } from '../../utils/date';
import { NoteColor } from '../../types/note';

const WEEKS = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

// Sıralı (tek renk tonu) ölçek: temanın vurgu rampası, az -> çok koyulaşır
const HEAT_STEPS = ['bg-gray-100', 'bg-purple-200', 'bg-purple-300', 'bg-purple-500', 'bg-purple-700'];
const ROW_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const stripTags = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
const countWords = (html: string) => {
  const plain = stripTags(html).trim();
  return plain ? plain.split(/\s+/).length : 0;
};
const fmt = (n: number) => n.toLocaleString('tr-TR');

interface Cell {
  key: string;
  date: Date;
  count: number;
  future: boolean;
}

export const StatsModal: React.FC = () => {
  const { openModal, setOpenModal } = useUI();
  const { scopeNotes, scopeFolders, activeScope } = useNotes();
  const isOpen = openModal === 'stats';
  const [hover, setHover] = useState<{ cell: Cell; x: number; y: number } | null>(null);

  const stats = useMemo(() => {
    if (!isOpen) return null;
    const live = scopeNotes.filter((n) => !n.deletedAt);
    const now = Date.now();

    let words = 0;
    let done = 0;
    let total = 0;
    let longest = { title: '', words: 0 };
    const byColor = new Map<NoteColor, number>();
    const byFolder = new Map<string, number>();
    const byTag = new Map<string, number>();
    const activity = new Map<string, number>();

    live.forEach((n) => {
      const w = countWords(n.content);
      words += w;
      if (w > longest.words) longest = { title: n.title, words: w };
      const p = checklistProgress(n.content);
      done += p.done;
      total += p.total;
      byColor.set(n.color, (byColor.get(n.color) || 0) + 1);
      if (!n.folderId.startsWith('all_')) byFolder.set(n.folderId, (byFolder.get(n.folderId) || 0) + 1);
      (n.tags || []).forEach((t) => byTag.set(t, (byTag.get(t) || 0) + 1));
      const created = dayKey(n.createdAt);
      activity.set(created, (activity.get(created) || 0) + 1);
      const updated = dayKey(n.updatedAt);
      if (updated !== created) activity.set(updated, (activity.get(updated) || 0) + 1);
    });

    // Isı haritası: son WEEKS hafta, sütun = hafta (Pazartesi başlangıçlı), satır = gün
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const mondayOffset = (today.getDay() + 6) % 7;
    const start = new Date(today.getTime() - (mondayOffset + (WEEKS - 1) * 7) * DAY_MS);
    const columns: Cell[][] = [];
    let max = 0;
    for (let w = 0; w < WEEKS; w += 1) {
      const col: Cell[] = [];
      for (let d = 0; d < 7; d += 1) {
        const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
        const key = dayKey(date.getTime());
        const count = activity.get(key) || 0;
        max = Math.max(max, count);
        col.push({ key, date, count, future: date.getTime() > today.getTime() });
      }
      columns.push(col);
    }

    // Seri: bugünden (bugün boşsa dünden) geriye kesintisiz etkin gün sayısı
    let streak = 0;
    let cursor = new Date(today);
    if (!activity.get(dayKey(cursor.getTime()))) cursor = new Date(cursor.getTime() - DAY_MS);
    while (activity.get(dayKey(cursor.getTime()))) {
      streak += 1;
      cursor = new Date(cursor.getTime() - DAY_MS);
    }

    const weekAgo = now - 7 * DAY_MS;
    return {
      total: live.length,
      archived: live.filter((n) => n.isArchived).length,
      trashed: scopeNotes.length - live.length,
      reminders: live.filter((n) => n.reminderAt && n.reminderAt > now).length,
      thisWeek: live.filter((n) => n.updatedAt >= weekAgo).length,
      quick: live.filter((n) => n.kind === 'quick').length,
      words,
      done,
      tasks: total,
      longest,
      streak,
      columns,
      max,
      colors: (Object.keys(NOTE_COLORS) as NoteColor[])
        .map((c) => ({ color: c, count: byColor.get(c) || 0 }))
        .filter((x) => x.count > 0)
        .sort((a, b) => b.count - a.count),
      folders: Array.from(byFolder, ([id, count]) => ({ folder: scopeFolders.find((f) => f.id === id), count }))
        .filter((x) => x.folder)
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
      tags: Array.from(byTag, ([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12),
    };
  }, [isOpen, scopeNotes, scopeFolders]);

  const level = (count: number, max: number) => {
    if (count === 0 || max === 0) return 0;
    return Math.min(4, Math.max(1, Math.ceil((count / max) * 4)));
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => setOpenModal(null)}
      title="İstatistikler"
      subtitle={activeScope === 'local' ? 'Yerel çalışma alanı' : 'Ortak oda'}
      icon={<BarChart3 className="w-5 h-5" />}
      size="2xl"
    >
      {stats && (
        <div className="space-y-7">
          {/* KPI satırı */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile label="Toplam not" value={fmt(stats.total)} sub={`${stats.archived} arşivde · ${stats.trashed} çöpte`} />
            <StatTile label="Yazılan kelime" value={fmt(stats.words)} sub={`~${Math.max(1, Math.ceil(stats.words / 200))} dk okuma`} />
            <StatTile label="Bu hafta düzenlenen" value={fmt(stats.thisWeek)} sub={`${stats.reminders} yaklaşan hatırlatıcı`} />
            <StatTile
              label="Üretkenlik serisi"
              value={`${stats.streak} gün`}
              sub={stats.streak > 0 ? 'Harika gidiyorsun!' : 'Bugün bir not yaz 🌱'}
              icon={<Flame className={`w-4 h-4 ${stats.streak > 0 ? 'text-orange-500' : 'text-gray-400'}`} />}
            />
          </div>

          {/* Etkinlik ısı haritası */}
          <section>
            <SectionTitle title="Etkinlik" note={`Son ${WEEKS} hafta · oluşturulan ve düzenlenen notlar`} />
            <div className="relative overflow-x-auto no-scrollbar pb-1">
              <div className="inline-flex gap-[3px]" onPointerLeave={() => setHover(null)}>
                <div className="flex flex-col gap-[3px] pr-1.5" aria-hidden="true">
                  <span className="h-[15px]" />
                  {ROW_LABELS.map((label, d) => (
                    <span key={d} className="h-[14px] text-[10px] font-semibold text-gray-400 leading-[14px]">
                      {d % 2 === 0 ? label : ''}
                    </span>
                  ))}
                </div>
                {stats.columns.map((col, ci) => {
                  const first = col[0].date;
                  const showMonth = ci === 0 || first.getDate() <= 7;
                  return (
                    <div key={ci} className="flex flex-col gap-[3px]">
                      <span className="h-[15px] text-[10px] font-semibold text-gray-400 whitespace-nowrap">
                        {showMonth ? MONTHS_SHORT[first.getMonth()] : ''}
                      </span>
                      {col.map((cell) => (
                        <button
                          key={cell.key}
                          type="button"
                          disabled={cell.future}
                          aria-label={`${cell.date.getDate()} ${MONTHS_SHORT[cell.date.getMonth()]}: ${cell.count} etkinlik`}
                          onPointerEnter={(e) => {
                            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setHover({ cell, x: r.left + r.width / 2, y: r.top });
                          }}
                          onFocus={(e) => {
                            const r = e.currentTarget.getBoundingClientRect();
                            setHover({ cell, x: r.left + r.width / 2, y: r.top });
                          }}
                          onBlur={() => setHover(null)}
                          className={`w-[14px] h-[14px] rounded-[3px] transition-transform ${
                            cell.future ? 'opacity-0' : `${HEAT_STEPS[level(cell.count, stats.max)]} hover:scale-125 focus:scale-125 focus:outline-hidden focus:ring-2 focus:ring-purple-400`
                          }`}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-end gap-1.5 mt-2 text-[10px] font-semibold text-gray-400">
              <span>Az</span>
              {HEAT_STEPS.map((cls) => (
                <span key={cls} className={`w-[11px] h-[11px] rounded-[3px] ${cls}`} />
              ))}
              <span>Çok</span>
            </div>
            {hover && (
              <div
                className="fixed z-[70] -translate-x-1/2 -translate-y-full -mt-2 px-2.5 py-1.5 rounded-lg bg-ink text-on-ink text-[11px] shadow-lg pointer-events-none whitespace-nowrap"
                style={{ left: hover.x, top: hover.y - 6 }}
                role="tooltip"
              >
                <strong className="font-extrabold">{hover.cell.count} etkinlik</strong>{' '}
                <span className="opacity-75">
                  · {hover.cell.date.getDate()} {MONTHS_SHORT[hover.cell.date.getMonth()]} {WEEKDAYS[hover.cell.date.getDay()]}
                </span>
              </div>
            )}
          </section>

          <div className="grid md:grid-cols-2 gap-7">
            {/* Görevler */}
            <section>
              <SectionTitle title="Yapılacaklar" note={stats.tasks ? `${stats.done} / ${stats.tasks} görev tamamlandı` : 'Henüz yapılacak listesi yok'} />
              <Meter value={stats.tasks ? stats.done / stats.tasks : 0} label={stats.tasks ? `%${Math.round((stats.done / stats.tasks) * 100)}` : '—'} />
              <SectionTitle title="Not türleri" note={`${stats.total - stats.quick} detaylı · ${stats.quick} hızlı`} className="mt-6" />
              <Meter value={stats.total ? (stats.total - stats.quick) / stats.total : 0} label={stats.total ? `%${Math.round(((stats.total - stats.quick) / stats.total) * 100)} detaylı` : '—'} />
              {stats.longest.words > 0 && (
                <p className="mt-6 text-xs text-gray-500 leading-relaxed">
                  📜 En uzun not: <strong className="text-gray-800">{stats.longest.title || 'Başlıksız Not'}</strong> ({fmt(stats.longest.words)} kelime)
                </p>
              )}
            </section>

            {/* Renk dağılımı (her satır notların kendi rengini taşır, adı ve sayısı yazılıdır) */}
            <section>
              <SectionTitle title="Renklere göre" note="Notların post-it renkleri" />
              {stats.colors.length === 0 ? (
                <Empty />
              ) : (
                <BarList
                  rows={stats.colors.map((c) => ({
                    key: c.color,
                    label: NOTE_COLORS[c.color].name,
                    value: c.count,
                    swatch: NOTE_COLORS[c.color].accent,
                  }))}
                />
              )}
            </section>

            <section>
              <SectionTitle title="Klasörler" note="En çok not içeren klasörler" />
              {stats.folders.length === 0 ? (
                <Empty text="Notlar henüz klasörlere ayrılmamış" />
              ) : (
                <BarList
                  rows={stats.folders.map((f) => ({
                    key: f.folder!.id,
                    label: `${f.folder!.emoji} ${f.folder!.name}`,
                    value: f.count,
                  }))}
                />
              )}
            </section>

            <section>
              <SectionTitle title="Etiketler" note="En sık kullanılanlar" />
              {stats.tags.length === 0 ? (
                <Empty text="Henüz etiket eklenmemiş" />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {stats.tags.map((t) => (
                    <span key={t.tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                      <Hash className="w-3 h-3 text-purple-600" />
                      {t.tag}
                      <span className="text-gray-400 font-semibold">{t.count}</span>
                    </span>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </ModalShell>
  );
};

const SectionTitle: React.FC<{ title: string; note?: string; className?: string }> = ({ title, note, className = '' }) => (
  <div className={`flex items-baseline justify-between gap-3 mb-3 ${className}`}>
    <h3 className="text-sm font-extrabold text-gray-900">{title}</h3>
    {note && <span className="text-[11px] font-semibold text-gray-400 truncate">{note}</span>}
  </div>
);

const StatTile: React.FC<{ label: string; value: string; sub?: string; icon?: React.ReactNode }> = ({ label, value, sub, icon }) => (
  <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
    <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
      {label}
      {icon}
    </div>
    <div className="mt-1 text-2xl font-black text-gray-900 tracking-tight">{value}</div>
    {sub && <div className="mt-0.5 text-[11px] font-medium text-gray-500 truncate">{sub}</div>}
  </div>
);

const Meter: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="flex items-center gap-3">
    <div className="flex-1 h-2.5 rounded-full bg-purple-100 overflow-hidden" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <div className="h-full rounded-full bg-purple-600 transition-all duration-500" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
    <span className="text-xs font-bold text-gray-700 min-w-[3.5rem] text-right">{label}</span>
  </div>
);

const BarList: React.FC<{ rows: { key: string; label: string; value: number; swatch?: string }[] }> = ({ rows }) => {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-2.5" title={`${r.label}: ${r.value} not`}>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 truncate">
            {r.swatch && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.swatch }} />}
            <span className="truncate">{r.label}</span>
          </span>
          <span className="h-2.5">
            <span
              className={`block h-full rounded-r-[4px] ${r.swatch ? '' : 'bg-purple-500'}`}
              style={{ width: `${Math.max(4, (r.value / max) * 100)}%`, backgroundColor: r.swatch }}
            />
          </span>
          <span className="text-xs font-bold text-gray-600 min-w-[1.5rem] text-right">{r.value}</span>
        </li>
      ))}
    </ul>
  );
};

const Empty: React.FC<{ text?: string }> = ({ text = 'Gösterilecek veri yok' }) => (
  <p className="text-xs text-gray-400 py-3">{text}</p>
);
