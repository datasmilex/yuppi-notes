const MAP = {
  agent_offline: 'Bu temsilci şu an çevrimdışı.',
  blocked: 'Şu an bağlantı kurulamıyor. Lütfen daha sonra tekrar dene.',
  already_in_chat: 'Önce mevcut sohbeti bitirmelisin.',
  not_waiting: 'Bu istek artık beklemede değil.',
  not_found: 'Görüşme bulunamadı.',
  consent_missing: 'Bu ziyaretçi +18 kurallarını onaylamadı. +18 modundayken kabul edemezsin.',
  adult_consent_required: 'Bu temsilciye bağlanmak için +18 kurallarını onaylaman gerekiyor.',
  privacy_consent_required: 'Devam etmek için Aydınlatma Metni ve açık rıza onayı gerekiyor.',
  invalid_device: 'Tarayıcın desteklenmiyor olabilir.',
};
export function friendlyError(err) {
  const msg = err?.message || String(err || '');
  for (const k of Object.keys(MAP)) if (msg.includes(k)) return MAP[k];
  if (msg.includes('Invalid login')) return 'E-posta ya da şifre hatalı.';
  return 'Bir şeyler ters gitti. Lütfen tekrar dene.';
}
