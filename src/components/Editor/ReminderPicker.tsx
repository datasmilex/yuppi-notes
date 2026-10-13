'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, BellOff, CalendarClock, Check } from 'lucide-react';
import { formatReminder, fromDateTimeLocal, toDateTimeLocal } from '../../utils/date';
import { ensureNotificationPermission, notificationsSupported, quickReminders } from '../../utils/reminders';

interface ReminderPickerProps {
  value: number | null | undefined;
  onChange: (at: number | null) => void;
  onDone?: () => void;
}

export const ReminderPicker: React.FC<ReminderPickerProps> = ({ value, onChange, onDone }) => {
  const options = useMemo(() => quickReminders(), []);
  const [custom, setCustom] = useState(() => toDateTimeLocal(value || options[0]?.at || Date.now() + 3600_000));
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');

  useEffect(() => {
    setPermission(notificationsSupported() ? Notification.permission : 'unsupported');
  }, []);

  const pick = async (at: number | null) => {
    onChange(at);
    // İlk hatırlatıcı kurulurken sistem bildirimi izni istenir (yalnızca kullanıcı eylemiyle istenebilir)
    if (at && permission === 'default') setPermission(await ensureNotificationPermission());
    onDone?.();
  };

  const customAt = fromDateTimeLocal(custom);
  const customInPast = customAt !== null && customAt <= Date.now();

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wide">
          <CalendarClock className="w-3.5 h-3.5" />
          Hatırlatıcı
        </span>
        {value && (
          <button
            type="button"
            onClick={() => pick(null)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg"
          >
            <BellOff className="w-3.5 h-3.5" />
            Kaldır
          </button>
        )}
      </div>

      {value && (
        <div
          className={`mb-3 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
            value <= Date.now() ? 'bg-red-50 text-red-700' : 'bg-purple-50 text-purple-800'
          }`}
        >
          <BellRing className="w-3.5 h-3.5" />
          {formatReminder(value)} {value <= Date.now() && '· zamanı geçti'}
        </div>
      )}

      <div className="grid gap-1">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => pick(o.at)}
            className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left text-sm font-semibold text-gray-800 hover:bg-purple-50 hover:text-purple-800 transition-colors"
          >
            <span>{o.label}</span>
            <span className="text-[11px] font-semibold text-gray-400">{formatReminder(o.at)}</span>
          </button>
        ))}
      </div>

      <div className="mt-2.5 pt-2.5 border-t border-gray-100">
        <label className="block text-[11px] font-bold text-gray-500 mb-1.5">Tarih ve saat seç</label>
        <div className="flex items-center gap-1.5">
          <input
            type="datetime-local"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-base sm:text-xs font-semibold text-gray-800 outline-hidden focus:border-purple-400"
          />
          <button
            type="button"
            disabled={!customAt || customInPast}
            onClick={() => customAt && pick(customAt)}
            className="p-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40"
            title="Hatırlatıcıyı kur"
            aria-label="Hatırlatıcıyı kur"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
        {customInPast && <p className="mt-1 text-[11px] font-semibold text-red-600">Geçmiş bir zaman seçildi.</p>}
      </div>

      <p className="mt-2.5 text-[11px] text-gray-500 leading-relaxed">
        {permission === 'granted'
          ? '🔔 Zamanı gelince sistem bildirimi de gösterilir.'
          : permission === 'denied'
          ? '🔕 Sistem bildirimleri kapalı; uygulama açıkken hatırlatılır.'
          : permission === 'default'
          ? '🔔 Kurduğunda bildirim izni istenecek.'
          : 'Uygulama açıkken hatırlatılır.'}
      </p>
    </div>
  );
};
