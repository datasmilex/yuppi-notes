'use client';
import { useCallback, useEffect, useState } from 'react';
import AgentSheet from '@/components/AgentSheet';
import VisitorSession from '@/components/VisitorSession';
import { loadSession, saveSession } from '@/lib/device';

const FAQ = [
  ['Mesajlarım kaydediliyor mu?', 'Hayır. Mesajlar yalnızca iki tarayıcı arasında anlık olarak iletilir, hiçbir sunucuda ya da veritabanında saklanmaz. Sohbet bitince ya da sayfayı kapatınca tamamen kaybolur.'],
  ['Kimliğimi vermem gerekiyor mu?', 'Hayır. Hesap, isim, telefon ya da e-posta istemiyoruz. Tamamen anonimsin.'],
  ['Temsilciler kim?', 'Temsilcilerimiz seni yargılamadan dinlemek için burada olan gönüllülerdir. Psikolog ya da terapist değillerdir; profesyonel desteğin yerini tutmazlar.'],
  ['Neden beklemem gerekiyor?', 'Her temsilci aynı anda yalnızca bir kişiyle konuşur ki tüm dikkati sende olsun. Sıran gelince temsilci isteğini kabul eder ve sohbet başlar.'],
  ['+18 rozeti ne demek?', '+18 rozetli temsilcilerle yapılan sohbetlerde argo ve küfürlü dil serbesttir. Bağlanmadan önce 18 yaşından büyük olduğunu beyan edip kuralları onaylaman istenir. Cinsel içerik, tehdit ve nefret söylemi bu sohbetlerde de yasaktır.'],
  ['Sohbeti nasıl bitiririm?', 'Sohbet ekranındaki “Sohbeti bitir” butonuna dokunman yeterli. Dilersen sonrasında görüşmeyi puanlayabilirsin.'],
];

const RULES = [
  'Karşındakine saygılı ol; hakaret, taciz ve nefret söylemi yasaktır.',
  'Kişisel bilgilerini (adres, telefon, şifre) paylaşma.',
  'Temsilciler kurallara uymayan ziyaretçileri engelleyebilir.',
  'Burası bir acil yardım hattı değildir.',
];

export default function Home() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => { setSession(loadSession()); setReady(true); }, []);

  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const start = useCallback((s) => { saveSession(s); setSession(s); setSheetOpen(false); }, []);

  if (ready && session) return <VisitorSession session={session} onExit={() => setSession(null)} />;

  return (
    <main className="home">
      <header className="topbar">
        <div className="brand"><img src="/icon.svg" alt="" width={32} height={32} /> Dertleş</div>
      </header>

      <section className="hero">
        <h1>İçini dökmek istediğinde, <span>biri seni dinliyor.</span></h1>
        <p>Dertleş; yargılanmadan, kimliğini söylemeden konuşabileceğin sakin bir köşe. Bir temsilci seç, sıranı bekle ve anlat.</p>
      </section>

      <section className="card privacy">
        <div className="card-icon">🔒</div>
        <div>
          <h2>Mesajların kaydedilmez</h2>
          <p>Konuştukların hiçbir yerde saklanmaz. Hesap yok, isim yok, iz yok. Sohbet bitince her şey silinir.</p>
        </div>
      </section>

      <section className="steps">
        <h2 className="section-title">Nasıl çalışır?</h2>
        <ol>
          <li><b>1</b><div><strong>Dertleş’e dokun</strong><span>Aşağıdaki butondan temsilcileri gör.</span></div></li>
          <li><b>2</b><div><strong>Birini seç</strong><span>Sana en iyi gelecek temsilciyi seç.</span></div></li>
          <li><b>3</b><div><strong>Sıranı bekle</strong><span>Tahmini bekleme süreni anlık olarak görürsün.</span></div></li>
          <li><b>4</b><div><strong>Anlat</strong><span>Temsilci kabul edince sohbet başlar.</span></div></li>
        </ol>
      </section>

      <section className="card emergency">
        <div className="card-icon">🆘</div>
        <div>
          <h2>Acil bir durumdaysan</h2>
          <p>Kendine ya da başkasına zarar verme düşüncen varsa lütfen beklemeden profesyonel yardım al.</p>
          <div className="emergency-actions">
            <a className="btn btn-danger" href="tel:112">112 Acil Çağrı</a>
            <a className="btn btn-ghost" href="tel:183">ALO 183 Sosyal Destek</a>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">Kurallar</h2>
        <ul className="rules">{RULES.map((r) => <li key={r}>{r}</li>)}</ul>
      </section>

      <section>
        <h2 className="section-title">Sık sorulanlar</h2>
        <div className="faq">
          {FAQ.map(([q, a]) => (
            <details key={q}><summary>{q}</summary><p>{a}</p></details>
          ))}
        </div>
      </section>

      <footer className="footer">
        <span>© {new Date().getFullYear()} Dertleş</span>
        <a href="/gizlilik">Gizlilik ve KVKK</a>
        <a href="/panel">Temsilci girişi</a>
      </footer>

      <div className="bottom-bar">
        <button className="btn btn-primary btn-big" onClick={() => setSheetOpen(true)}>
          <span aria-hidden>💬</span> Dertleş
        </button>
      </div>

      <AgentSheet open={sheetOpen} onClose={closeSheet} onStarted={start} />
    </main>
  );
}
