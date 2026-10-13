export const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
export const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const pad = (n: number) => n.toString().padStart(2, '0');
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

export function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return 'Bilinmiyor';

  const now = Date.now();
  const diffInSeconds = Math.floor((now - timestamp) / 1000);

  if (diffInSeconds < 30) {
    return 'Az önce';
  }
  if (diffInSeconds < 60) {
    return `${diffInSeconds} sn önce`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} dk önce`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} saat önce`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return `Dün ${hhmm(new Date(timestamp))}`;
  }
  if (diffInDays < 7) {
    return `${diffInDays} gün önce`;
  }

  const d = new Date(timestamp);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/** "13 Ekim 2026, 14:05" */
export function formatFullDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${hhmm(d)}`;
}

/** Hatırlatıcılar için gün odaklı biçim: "Bugün 14:30", "Yarın 09:00", "Cuma 18:00", "3 Kas 09:00". */
export function formatReminder(timestamp: number, now = Date.now()): string {
  const d = new Date(timestamp);
  const dayDiff = Math.round((startOfDay(d) - startOfDay(new Date(now))) / DAY_MS);
  if (dayDiff === 0) return `Bugün ${hhmm(d)}`;
  if (dayDiff === 1) return `Yarın ${hhmm(d)}`;
  if (dayDiff === -1) return `Dün ${hhmm(d)}`;
  if (dayDiff > 1 && dayDiff < 7) return `${WEEKDAYS[d.getDay()]} ${hhmm(d)}`;
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${sameYear ? '' : ` ${d.getFullYear()}`} ${hhmm(d)}`;
}

/** <input type="datetime-local"> değeri (yerel saat). */
export function toDateTimeLocal(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${hhmm(d)}`;
}

export function fromDateTimeLocal(value: string): number | null {
  if (!value) return null;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : null;
}

/** Bir günün (yerel) "YYYY-MM-DD" anahtarı — istatistik ısı haritası için. */
export function dayKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
