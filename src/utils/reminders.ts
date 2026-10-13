// Hatırlatıcı yardımcıları: hızlı seçenekler, sistem bildirimleri ve "çalındı" kaydı.

export interface QuickReminder {
  id: string;
  label: string;
  at: number;
}

const at = (base: Date, dayOffset: number, hours: number, minutes = 0) =>
  new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset, hours, minutes).getTime();

export function quickReminders(now = new Date()): QuickReminder[] {
  const options: QuickReminder[] = [];

  // Bir saat sonrası, en yakın 5 dakikaya yuvarlanır
  const inAnHour = new Date(now.getTime() + 60 * 60 * 1000);
  inAnHour.setMinutes(Math.ceil(inAnHour.getMinutes() / 5) * 5, 0, 0);
  options.push({ id: 'hour', label: '1 saat sonra', at: inAnHour.getTime() });

  if (now.getHours() < 19) options.push({ id: 'evening', label: 'Bu akşam', at: at(now, 0, 20) });
  options.push({ id: 'tomorrow', label: 'Yarın sabah', at: at(now, 1, 9) });

  const day = now.getDay(); // 0 Pazar ... 6 Cumartesi
  if (day >= 1 && day <= 5) options.push({ id: 'weekend', label: 'Hafta sonu', at: at(now, 6 - day, 10) });
  const toMonday = ((8 - day) % 7) || 7;
  options.push({ id: 'next-week', label: 'Gelecek hafta', at: at(now, toMonday, 9) });

  // Pazar günü "yarın sabah" ile "gelecek hafta" aynı ana denk gelir
  return options.filter((o, i) => options.findIndex((x) => x.at === o.at) === i);
}

// ---------- Sistem bildirimleri ----------

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function ensureNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function showSystemNotification(title: string, body: string, onClick?: () => void): boolean {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false;
  try {
    const n = new Notification(title, { body, icon: '/icon-192.png', tag: `yuppi-${title}` });
    n.onclick = () => {
      window.focus();
      onClick?.();
      n.close();
    };
    return true;
  } catch {
    // Bazı mobil tarayıcılar yalnızca service worker üzerinden bildirime izin verir
    return false;
  }
}

/** Kısa, yumuşak bir "ding" (ses dosyası gerektirmez). */
export function playChime(): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.65);
    });
    setTimeout(() => void ctx.close(), 1200);
  } catch {
    // ses çalınamazsa sessiz devam
  }
}

// ---------- Çalınan hatırlatıcılar (aynı hatırlatıcı iki kez bildirilmesin) ----------

const FIRED_KEY = 'yuppi_fired_reminders';

export function readFiredReminders(): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(FIRED_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeFiredReminders(map: Record<string, number>): void {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify(map));
  } catch {
    // yoksay
  }
}
