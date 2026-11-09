// Ziyaretçiye ait rastgele cihaz kimliği. Kişisel veri değildir; yalnızca
// engelleme için sunucuda özet (hash) hâlinde kullanılır.
export function getDeviceId() {
  try {
    let id = localStorage.getItem('dertles_device');
    if (!id) {
      id = crypto.randomUUID() + crypto.randomUUID();
      localStorage.setItem('dertles_device', id);
    }
    return id;
  } catch {
    return crypto.randomUUID() + crypto.randomUUID();
  }
}

const KEY = 'dertles_session';
export function saveSession(s) {
  try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}
export function loadSession() {
  try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; }
}
export function clearSession() {
  try { sessionStorage.removeItem(KEY); } catch {}
}
