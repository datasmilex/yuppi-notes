'use client';
import { useState } from 'react';
import { CONTROLLER_NAME, CONTROLLER_CONTACT, PRIVACY_UPDATED, withdrawPrivacyConsent } from '@/lib/legal';

export default function PrivacyPage() {
  const [withdrawn, setWithdrawn] = useState(false);

  return (
    <main className="legal">
      <a href="/" className="btn btn-ghost btn-sm">← Ana sayfa</a>
      <h1>Kişisel Verilerin Korunması</h1>
      <p className="muted small">Son güncelleme: {PRIVACY_UPDATED}</p>

      <section id="aydinlatma">
        <h2>Aydınlatma Metni</h2>
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca, Dertleş (yuppinotes.tr) olarak
          kişisel verilerinizi aşağıda açıklanan şekilde işliyoruz.
        </p>

        <h3>1. Veri sorumlusu</h3>
        <p>{CONTROLLER_NAME} — İletişim: {CONTROLLER_CONTACT}</p>

        <h3>2. İşlemediğimiz veriler</h3>
        <p>
          <b>Mesaj içerikleri hiçbir şekilde kaydedilmez.</b> Mesajlar yalnızca iletim anında sunucudan geçer ve
          saklanmaz. Ziyaretçilerden ad, e-posta, telefon gibi kimlik veya iletişim bilgisi istenmez.
        </p>

        <h3>3. İşlediğimiz veriler</h3>
        <ul>
          <li><b>Cihaz özeti:</b> Tarayıcınızda oluşturulan rastgele kimliğin geri döndürülemez özeti (SHA-256). Sıra yönetimi ve kurallara aykırı davranan cihazların engellenmesi için kullanılır.</li>
          <li><b>İşlem güvenliği verileri:</b> IP adresi, tarayıcı bilgisi ve istek zamanı. Bunlar barındırma hizmet sağlayıcılarımızın sunucu kayıtlarında teknik olarak zorunlu şekilde oluşur.</li>
          <li><b>Görüşme bilgileri:</b> Görüşmenin başlangıç/bitiş zamanı, durumu, verilen puanlar, +18 ve gizlilik onaylarının zamanı.</li>
          <li><b>Temsilciler için:</b> E-posta adresi, şifre özeti, profil bilgileri (ad, fotoğraf, biyografi, çalışma saatleri).</li>
        </ul>

        <h3>4. İşleme amaçları</h3>
        <ul>
          <li>Sohbet hizmetinin sunulması, sıranın ve tahmini bekleme süresinin hesaplanması</li>
          <li>Kötüye kullanımın önlenmesi ve kurallara aykırı davranan cihazların engellenmesi</li>
          <li>Bilgi güvenliğinin sağlanması</li>
          <li>Hizmet kalitesinin ölçülmesi (puanlar)</li>
          <li>Yetkili kurumların talepleri ve hukuki yükümlülüklerin yerine getirilmesi</li>
        </ul>

        <h3>5. Hukuki sebepler</h3>
        <p>
          Verileriniz KVKK md. 5/2 kapsamında; hizmetin sunulması için gerekli olması (c), hukuki yükümlülüklerimizin
          yerine getirilmesi (ç) ve hizmet güvenliğine ilişkin meşru menfaatimiz (f) hukuki sebeplerine dayanılarak
          işlenir. Yurt dışına aktarım için KVKK md. 9 kapsamındaki şartlara ve aşağıdaki açık rızanıza dayanılır.
        </p>

        <h3>6. Aktarım</h3>
        <p>Verileriniz, hizmetin çalışabilmesi için barındırma hizmeti aldığımız şu sağlayıcılara aktarılır:</p>
        <ul>
          <li><b>Supabase Inc.</b> — veritabanı ve anlık mesaj iletimi (veri merkezi: Frankfurt, Almanya; şirket merkezi: ABD)</li>
          <li><b>Vercel Inc.</b> — web sitesinin barındırılması (ABD ve küresel dağıtım ağı)</li>
        </ul>
        <p>Kanunen yetkili kamu kurum ve kuruluşlarının talebi halinde, elimizde bulunan veriler bu kurumlarla paylaşılabilir.</p>

        <h3>7. Saklama süreleri</h3>
        <ul>
          <li>Cihaz özeti: görüşme bittikten <b>24 saat</b> sonra silinir (engellenen cihazlar için engelleme süresi boyunca).</li>
          <li>Görüşme bilgileri (zamanlar, puanlar): <b>1 yıl</b> sonra otomatik silinir.</li>
          <li>Sunucu kayıtları (IP adresi vb.): hizmet sağlayıcıların kendi saklama sürelerine ve mevzuattaki saklama yükümlülüklerine tabidir.</li>
        </ul>

        <h3>8. Haklarınız (KVKK md. 11)</h3>
        <p>
          Kişisel verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, işleme amacını öğrenme, aktarıldığı
          üçüncü kişileri bilme, eksik/yanlış işlenmişse düzeltilmesini, silinmesini veya yok edilmesini isteme,
          otomatik analiz sonucu aleyhinize bir sonuç çıkmasına itiraz etme ve kanuna aykırı işleme nedeniyle zararın
          giderilmesini talep etme haklarına sahipsiniz. Başvurularınızı {CONTROLLER_CONTACT} adresine iletebilirsiniz.
          Ziyaretçilerden kimlik bilgisi alınmadığı için başvurunuzda görüşmenin yaklaşık tarih ve saatini belirtmeniz
          gerekebilir.
        </p>
      </section>

      <section id="acik-riza">
        <h2>Açık Rıza Metni</h2>
        <p>
          Aydınlatma Metni’ni okudum. IP adresim, cihaz özetim ve görüşme zaman bilgilerimin sohbet hizmetinin
          sunulması amacıyla yurt dışında bulunan sunucularda (Supabase — Almanya/ABD, Vercel — ABD) işlenmesine ve
          bu ülkelere aktarılmasına <b>açık rızam ile onay veriyorum.</b>
        </p>
        <p>
          Açık rızanızı dilediğiniz zaman aşağıdaki butonla geri alabilirsiniz. Rıza geri alındığında tarayıcınızdaki
          cihaz kimliği silinir. Mesajlar yurt dışındaki sunucular üzerinden iletildiği için rıza olmadan sohbet
          hizmeti kullanılamaz; geri alma, geçmişte yapılan işlemlerin hukuka uygunluğunu etkilemez.
        </p>
        {withdrawn ? (
          <p className="form-msg ok">Rızanız geri alındı ve bu tarayıcıdaki cihaz kimliği silindi.</p>
        ) : (
          <button className="btn btn-ghost" onClick={() => { withdrawPrivacyConsent(); setWithdrawn(true); }}>
            Açık rızamı geri al
          </button>
        )}
      </section>
    </main>
  );
}
