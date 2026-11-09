export const DAYS = [
  { key: '1', label: 'Pazartesi', short: 'Pzt' },
  { key: '2', label: 'Salı', short: 'Sal' },
  { key: '3', label: 'Çarşamba', short: 'Çar' },
  { key: '4', label: 'Perşembe', short: 'Per' },
  { key: '5', label: 'Cuma', short: 'Cum' },
  { key: '6', label: 'Cumartesi', short: 'Cmt' },
  { key: '7', label: 'Pazar', short: 'Paz' },
];

// Türkiye saatine göre bugünün ISO gün numarası (1=Pzt … 7=Paz)
export function todayKey() {
  const wd = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Europe/Istanbul' }).format(new Date());
  return String(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(wd) + 1);
}

export function hoursText(slot) {
  if (!slot || !slot.start || !slot.end) return 'Kapalı';
  return `${slot.start}–${slot.end}`;
}

export function todayText(schedule) {
  return `Bugün ${hoursText((schedule || {})[todayKey()])}`;
}
