'use client';
import { useState } from 'react';

// İlk bağlantıdan önce gösterilen Aydınlatma Metni bildirimi ve Açık Rıza onayı
export default function PrivacyConsent({ onAccept, onCancel }) {
  const [ok, setOk] = useState(false);

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
      <div className="modal">
        <h3 id="privacy-title">🔒 Başlamadan önce</h3>
        <p className="muted small">
          Mesajların <b>kaydedilmez</b> ve senden kimlik bilgisi istemiyoruz. Hizmetin çalışması için yalnızca şunlar işlenir:
        </p>
        <ul className="rules small">
          <li>Tarayıcındaki rastgele kimliğin geri döndürülemez özeti (sıra ve engelleme için, 24 saatte silinir)</li>
          <li>IP adresi ve tarayıcı bilgisi (sunucu kayıtlarında teknik olarak oluşur)</li>
          <li>Görüşmenin başlangıç/bitiş zamanı ve puanlar (1 yıl sonra silinir)</li>
        </ul>
        <p className="muted small">
          Sunucularımız yurt dışında (Supabase — Almanya/ABD, Vercel — ABD) bulunur.
          Ayrıntılar: <a href="/gizlilik" target="_blank" rel="noopener">Aydınlatma Metni</a>
        </p>
        <label className="consent">
          <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
          <span>
            <a href="/gizlilik#aydinlatma" target="_blank" rel="noopener">Aydınlatma Metni</a>’ni okudum; verilerimin
            yurt dışındaki sunucularda işlenmesine ve aktarılmasına <a href="/gizlilik#acik-riza" target="_blank" rel="noopener">açık rıza</a> veriyorum.
          </span>
        </label>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Vazgeç</button>
          <button className="btn btn-primary" disabled={!ok} onClick={onAccept}>Onayla</button>
        </div>
      </div>
    </div>
  );
}
