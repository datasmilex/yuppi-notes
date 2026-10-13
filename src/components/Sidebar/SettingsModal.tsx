'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTheme, AppTheme } from '../../context/ThemeContext';
import { useNotes } from '../../context/NotesContext';
import { useUI } from '../../context/UIContext';
import { useToast } from '../Common/Toast';
import { ModalShell } from '../Common/ModalShell';
import { usePwaInstall } from '../../utils/pwa';
import { downloadFile } from '../../utils/text';
import { exportNotesMarkdown } from '../../utils/export';
import { storageEstimate } from '../../utils/storage';
import { NOTE_COLORS, NOTE_FONTS } from '../../utils/colors';
import {
  ensureNotificationPermission,
  notificationsSupported,
  playChime,
  showSystemNotification,
} from '../../utils/reminders';
import { NoteColor } from '../../types/note';
import {
  Moon,
  Sun,
  Heart,
  Cloud,
  Monitor,
  Check,
  Download,
  Upload,
  Smartphone,
  Keyboard,
  Settings,
  FileText,
  Bell,
  HardDrive,
  LayoutGrid,
  LayoutList,
} from 'lucide-react';

const THEME_OPTIONS: {
  id: AppTheme;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colorBadge: string;
}[] = [
  { id: 'beige', title: 'Açık Bej', description: 'Doğal kağıt tonları', icon: Sun, colorBadge: 'bg-[#FBF9F5] border-[#E8E4DA] text-stone-800' },
  { id: 'dark', title: 'Koyu Gece', description: 'Düşük ışıkta rahat', icon: Moon, colorBadge: 'bg-[#18181B] border-[#3F3F46] text-zinc-100' },
  { id: 'pink', title: 'Pudra Pembe', description: 'Pastel ve yumuşak', icon: Heart, colorBadge: 'bg-[#FFF5F7] border-[#FBCFE8] text-pink-900' },
  { id: 'blue', title: 'Bebek Mavisi', description: 'Ferah gökyüzü', icon: Cloud, colorBadge: 'bg-[#F0F7FF] border-[#BAE6FD] text-sky-900' },
  { id: 'system', title: 'Sistem', description: 'Cihazı takip et', icon: Monitor, colorBadge: 'bg-gradient-to-br from-[#FBF9F5] to-[#18181B] border-gray-300 text-gray-700' },
];

const formatBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export const SettingsModal: React.FC = () => {
  const { openModal, setOpenModal, prefs, setPref } = useUI();
  const isOpen = openModal === 'settings';
  const onClose = () => setOpenModal(null);

  const { theme, setTheme } = useTheme();
  const { exportBackup, importBackup, scopeNotes, activeScope } = useNotes();
  const { showToast } = useToast();
  const { canInstall, install } = usePwaInstall();
  const fileRef = useRef<HTMLInputElement>(null);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');

  useEffect(() => {
    if (!isOpen) return;
    void storageEstimate().then(setStorage);
    setPermission(notificationsSupported() ? Notification.permission : 'unsupported');
  }, [isOpen]);

  const handleExport = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`yuppi-notes-yedek-${stamp}.json`, exportBackup(), 'application/json;charset=utf-8');
    showToast('Yedek dosyası indirildi. 💾', 'success');
  };

  const handleExportMarkdown = () => {
    const list = scopeNotes.filter((n) => !n.deletedAt);
    exportNotesMarkdown(list, `yuppi-notlar-${new Date().toISOString().slice(0, 10)}`);
    showToast(`${list.length} not Markdown olarak indirildi.`, 'success');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    try {
      const result = importBackup(await file.text());
      showToast(`${result.notes} not, ${result.folders} klasör geri yüklendi. ✅`, 'success');
    } catch {
      showToast('Geçersiz veya bozuk yedek dosyası.', 'error');
    }
  };

  const handleInstall = async () => {
    const accepted = await install();
    if (accepted) showToast('Uygulama yüklendi! 🎉', 'success');
  };

  const handlePermission = async () => {
    const result = await ensureNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      showSystemNotification('🔔 Bildirimler açık', 'Hatırlatıcıların zamanı gelince burada göreceksin.');
      showToast('Bildirimler açıldı 🔔', 'success');
    } else if (result === 'denied') {
      showToast('Bildirim izni reddedildi; tarayıcı ayarlarından açabilirsin.', 'error');
    }
  };

  const usagePct = storage && storage.quota ? Math.min(100, (storage.usage / storage.quota) * 100) : 0;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Uygulama Ayarları"
      subtitle="Görünüm, varsayılanlar, bildirimler ve yedekleme"
      icon={<Settings className="w-5 h-5" />}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={() => setOpenModal('shortcuts')}
            className="mr-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
          >
            <Keyboard className="w-4 h-4" />
            Kısayollar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-ink hover:bg-ink/85 text-on-ink font-bold text-xs shadow-md transition-colors"
          >
            Tamam
          </button>
        </>
      }
    >
      <div className="space-y-7">
        {/* Tema */}
        <Section title="Renk Teması">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {THEME_OPTIONS.map((item) => {
              const Icon = item.icon;
              const isSelected = theme === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTheme(item.id)}
                  aria-pressed={isSelected}
                  className={`relative flex items-center gap-2.5 p-2.5 rounded-2xl border-2 transition-all text-left ${
                    isSelected ? 'border-purple-500 bg-purple-50/60 shadow-xs' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-2xs flex-shrink-0 ${item.colorBadge}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-800 truncate">{item.title}</div>
                    <div className="text-[10px] text-gray-500 truncate">{item.description}</div>
                  </div>
                  {isSelected && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Pano görünümü */}
        <Section title="Pano">
          <Row label="Görünüm" hint="Notlar kart ızgarası mı, liste mi?">
            <Segmented
              value={prefs.viewMode}
              onChange={(v) => setPref('viewMode', v)}
              options={[
                { value: 'grid', label: 'Izgara', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
                { value: 'list', label: 'Liste', icon: <LayoutList className="w-3.5 h-3.5" /> },
              ]}
            />
          </Row>
          <Row label="Kart yoğunluğu" hint="Sıkışık modda kartlar daha kısa, görseller gizli">
            <Segmented
              value={prefs.density}
              onChange={(v) => setPref('density', v)}
              options={[
                { value: 'comfortable', label: 'Rahat' },
                { value: 'compact', label: 'Sıkışık' },
              ]}
            />
          </Row>
        </Section>

        {/* Yeni not varsayılanları */}
        <Section title="Yeni Not Varsayılanları">
          <Row label="Post-it rengi">
            <div className="flex flex-wrap gap-1.5 justify-end">
              {(Object.keys(NOTE_COLORS) as NoteColor[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPref('defaultColor', c)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    prefs.defaultColor === c ? 'ring-2 ring-offset-2 ring-purple-500 scale-110' : ''
                  }`}
                  style={{ backgroundColor: NOTE_COLORS[c].cardBg, borderColor: NOTE_COLORS[c].borderHex }}
                  title={NOTE_COLORS[c].name}
                  aria-label={NOTE_COLORS[c].name}
                  aria-pressed={prefs.defaultColor === c}
                />
              ))}
            </div>
          </Row>
          <Row label="Yazı tipi">
            <select
              value={prefs.defaultFont}
              onChange={(e) => setPref('defaultFont', e.target.value as typeof prefs.defaultFont)}
              className="bg-white border border-black/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-700 outline-hidden cursor-pointer"
            >
              {NOTE_FONTS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Not türü">
            <Segmented
              value={prefs.defaultKind}
              onChange={(v) => setPref('defaultKind', v)}
              options={[
                { value: 'quick', label: 'Hızlı' },
                { value: 'comprehensive', label: 'Detaylı' },
              ]}
            />
          </Row>
          <Row label="Yazım denetimi" hint="Editörde yanlış yazılan kelimelerin altını çiz">
            <Toggle checked={prefs.spellcheck} onChange={(v) => setPref('spellcheck', v)} label="Yazım denetimi" />
          </Row>
        </Section>

        {/* Hatırlatıcılar */}
        <Section title="Hatırlatıcılar">
          <Row
            label="Sistem bildirimleri"
            hint={
              permission === 'granted'
                ? 'Açık · uygulama arka plandayken de bildirilir'
                : permission === 'denied'
                ? 'Kapalı · tarayıcı/site ayarlarından açılabilir'
                : permission === 'unsupported'
                ? 'Bu tarayıcı desteklemiyor; uygulama içinde hatırlatılır'
                : 'Henüz izin verilmedi'
            }
          >
            {permission === 'default' ? (
              <button
                type="button"
                onClick={handlePermission}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
              >
                <Bell className="w-3.5 h-3.5" />
                İzin ver
              </button>
            ) : (
              <span className={`text-xs font-bold ${permission === 'granted' ? 'text-emerald-600' : 'text-gray-400'}`}>
                {permission === 'granted' ? '✓ Açık' : permission === 'denied' ? 'Kapalı' : '—'}
              </span>
            )}
          </Row>
          <Row label="Bildirim sesi" hint="Hatırlatıcı çalınca kısa bir 'ding'">
            <div className="flex items-center gap-2">
              <button type="button" onClick={playChime} className="text-[11px] font-bold text-purple-700 hover:underline">
                Dinle
              </button>
              <Toggle checked={prefs.reminderSound} onChange={(v) => setPref('reminderSound', v)} label="Bildirim sesi" />
            </div>
          </Row>
        </Section>

        {/* Yedekleme */}
        <Section title={`Veri & Yedekleme (${activeScope === 'local' ? 'Yerel' : 'Ortak'} notlar)`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <ActionTile icon={<Download className="w-4 h-4 text-purple-600" />} label="Yedek İndir" hint=".json" onClick={handleExport} />
            <ActionTile icon={<Upload className="w-4 h-4 text-purple-600" />} label="Yedekten Yükle" hint=".json" onClick={() => fileRef.current?.click()} />
            <ActionTile icon={<FileText className="w-4 h-4 text-purple-600" />} label="Markdown İndir" hint="tüm notlar" onClick={handleExportMarkdown} />
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImport} className="hidden" />
          </div>
          {storage && storage.quota > 0 && (
            <div className="mt-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="flex items-center justify-between text-[11px] font-bold text-gray-600 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5" /> Depolama
                </span>
                <span>
                  {formatBytes(storage.usage)} / {formatBytes(storage.quota)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-purple-100 overflow-hidden" role="meter" aria-valuenow={Math.round(usagePct)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-purple-600" style={{ width: `${Math.max(1, usagePct)}%` }} />
              </div>
            </div>
          )}
          <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">
            Yerel notlar yalnızca bu tarayıcıda saklanır. Cihaz değiştirirken veya tarayıcı verilerini temizlemeden önce yedek alın.
          </p>
        </Section>

        {canInstall && (
          <button
            type="button"
            onClick={handleInstall}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold shadow-md hover:opacity-95 transition-opacity"
          >
            <Smartphone className="w-4 h-4" />
            Uygulamayı Cihaza Yükle
          </button>
        )}

        <p className="text-center text-[11px] font-semibold text-gray-400">YuPPi Notes 2.0 · Sevgiyle yapıldı 💛</p>
      </div>
    </ModalShell>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section>
    <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2.5 px-1">{title}</h3>
    <div className="space-y-1">{children}</div>
  </section>
);

const Row: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div className="flex items-center justify-between gap-4 px-1 py-2">
    <div className="min-w-0">
      <div className="text-sm font-bold text-gray-800">{label}</div>
      {hint && <div className="text-[11px] text-gray-500 leading-snug">{hint}</div>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
}) {
  return (
    <div className="flex items-center p-0.5 rounded-xl bg-gray-100 border border-black/5" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
            value === o.value ? 'bg-white text-purple-800 shadow-xs' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-purple-600' : 'bg-gray-300'}`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[#ffffff] shadow-sm transition-transform ${checked ? 'translate-x-4' : ''}`}
    />
  </button>
);

const ActionTile: React.FC<{ icon: React.ReactNode; label: string; hint: string; onClick: () => void }> = ({ icon, label, hint, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center sm:flex-col sm:items-start gap-2 sm:gap-1 p-3 rounded-2xl border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 text-left transition-all"
  >
    {icon}
    <span className="text-xs font-bold text-gray-700">{label}</span>
    <span className="text-[10px] font-semibold text-gray-400 ml-auto sm:ml-0">{hint}</span>
  </button>
);
