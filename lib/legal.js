// KVKK metinlerinde kullanılan bilgiler. Yayına almadan önce yer tutucuları doldurun.
export const CONTROLLER_NAME = '[Veri sorumlusunun adı / unvanı]';
export const CONTROLLER_CONTACT = '[iletişim e-posta adresi]';
export const PRIVACY_VERSION = '2026-11-10';
export const PRIVACY_UPDATED = '10 Kasım 2026';

const KEY = 'dertles_privacy_consent';

export function hasPrivacyConsent() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    return v?.version === PRIVACY_VERSION;
  } catch { return false; }
}

export function savePrivacyConsent() {
  try { localStorage.setItem(KEY, JSON.stringify({ version: PRIVACY_VERSION, at: Date.now() })); } catch {}
}

export function withdrawPrivacyConsent() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem('dertles_device');
    sessionStorage.removeItem('dertles_session');
  } catch {}
}
