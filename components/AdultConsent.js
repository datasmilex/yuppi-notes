'use client';
import { useState } from 'react';

// +18 temsilciye bağlanmadan önce gösterilen yaş beyanı ve kural onayı
export const ADULT_RULES = [
  'Bu sohbette argo ve küfürlü dil kullanılabilir; bundan rahatsız olmayacağımı kabul ediyorum.',
  'Cinsel/müstehcen içerik, tehdit, nefret söylemi ve üçüncü kişileri hedef alan paylaşımlar +18 sohbette de yasaktır.',
  'İstediğim an sohbeti bitirebilirim; temsilci de kurallara aykırı davranışta sohbeti bitirip beni engelleyebilir.',
  'Mesajlar kaydedilmez; bu yüzden sonradan bir içerik talep edemem.',
];

export default function AdultConsent({ agentName, onAccept, onCancel }) {
  const [age, setAge] = useState(false);
  const [rules, setRules] = useState(false);

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-labelledby="adult-title">
      <div className="modal">
        <h3 id="adult-title"><span className="adult-badge">+18</span> {agentName} ile sohbet</h3>
        <p className="muted small">{agentName} +18 modunda. Devam etmeden önce aşağıdakileri onaylaman gerekiyor.</p>
        <ul className="rules small">
          {ADULT_RULES.map((r) => <li key={r}>{r}</li>)}
        </ul>
        <label className="consent">
          <input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} />
          <span><b>18 yaşından büyük olduğumu</b> beyan ederim.</span>
        </label>
        <label className="consent">
          <input type="checkbox" checked={rules} onChange={(e) => setRules(e.target.checked)} />
          <span>Yukarıdaki kuralları okudum ve kabul ediyorum.</span>
        </label>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Vazgeç</button>
          <button className="btn btn-primary" disabled={!age || !rules} onClick={onAccept}>Onayla ve bağlan</button>
        </div>
      </div>
    </div>
  );
}
