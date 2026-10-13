import { NoteSeed } from '../types/note';
import { MONTHS, WEEKDAYS } from './date';

export interface NoteTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  build: () => NoteSeed;
}

// Boş maddeler <br> ile tutulur; aksi halde tarayıcı boş <li>'yi düzenlenemez şekilde daraltır
const item = (text: string) => text || '<br>';
const todo = (...items: string[]) =>
  `<ul data-checklist="true">${items.map((i) => `<li data-checked="false">${item(i)}</li>`).join('')}</ul>`;
const bullets = (...items: string[]) => `<ul>${items.map((i) => `<li>${item(i)}</li>`).join('')}</ul>`;
const numbered = (...items: string[]) => `<ol>${items.map((i) => `<li>${item(i)}</li>`).join('')}</ol>`;

const today = () => {
  const d = new Date();
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const weekdayToday = () => WEEKDAYS[new Date().getDay()];

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'todo',
    name: 'Yapılacaklar',
    emoji: '✅',
    description: 'Tıklanabilir kutularla günlük görev listesi',
    build: () => ({
      title: `Yapılacaklar · ${weekdayToday()}`,
      kind: 'quick',
      color: 'yellow',
      font: 'sans',
      tags: ['görev'],
      content: `<h3>🔥 Öncelikli</h3>${todo('En önemli iş', 'İkinci önemli iş')}<h3>📌 Diğer</h3>${todo('Küçük işler', 'Aramalar & e-postalar')}`,
    }),
  },
  {
    id: 'meeting',
    name: 'Toplantı Notu',
    emoji: '🤝',
    description: 'Gündem, kararlar ve aksiyon maddeleri',
    build: () => ({
      title: `Toplantı · ${today()}`,
      kind: 'comprehensive',
      color: 'blue',
      font: 'sans',
      tags: ['toplantı'],
      content:
        `<p><b>📅 Tarih:</b> ${today()}</p><p><b>👥 Katılımcılar:</b> </p>` +
        `<h2>Gündem</h2>${numbered('Konu 1', 'Konu 2', 'Konu 3')}` +
        `<h2>Notlar</h2><p>Önemli noktalar...</p>` +
        `<h2>Alınan Kararlar</h2>${bullets('Karar')}` +
        `<h2>Aksiyonlar</h2>${todo('Kim — Ne — Ne zaman')}`,
    }),
  },
  {
    id: 'journal',
    name: 'Günlük',
    emoji: '📔',
    description: 'Duygular, şükran listesi ve yarının niyeti',
    build: () => ({
      title: `Sevgili Günlük · ${today()}`,
      kind: 'comprehensive',
      color: 'peach',
      font: 'handwriting',
      tags: ['günlük'],
      content:
        `<h3>Bugün nasıl hissediyorum?</h3><p>☀️ </p>` +
        `<h3>Minnettar olduğum 3 şey</h3>${numbered('', '', '')}` +
        `<h3>Günün en güzel anı</h3><p></p>` +
        `<h3>Yarın için niyetim</h3><blockquote>...</blockquote>`,
    }),
  },
  {
    id: 'shopping',
    name: 'Alışveriş Listesi',
    emoji: '🛒',
    description: 'Reyonlara göre ayrılmış işaretlenebilir liste',
    build: () => ({
      title: 'Alışveriş Listesi',
      kind: 'quick',
      color: 'mint',
      font: 'sans',
      tags: ['alışveriş'],
      content:
        `<h3>🥦 Manav</h3>${todo('Domates', 'Muz')}` +
        `<h3>🧀 Kahvaltılık</h3>${todo('Peynir', 'Yumurta')}` +
        `<h3>🧴 Temizlik</h3>${todo('Deterjan')}`,
    }),
  },
  {
    id: 'weekly',
    name: 'Haftalık Plan',
    emoji: '🗓️',
    description: 'Haftanın hedefleri ve gün gün plan',
    build: () => ({
      title: `Haftalık Plan · ${today()}`,
      kind: 'comprehensive',
      color: 'lavender',
      font: 'sans',
      tags: ['plan'],
      content:
        `<h2>🎯 Haftanın Hedefleri</h2>${todo('Hedef 1', 'Hedef 2', 'Hedef 3')}` +
        ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Hafta Sonu']
          .map((day) => `<h3>${day}</h3>${todo('')}`)
          .join(''),
    }),
  },
  {
    id: 'idea',
    name: 'Proje Fikri',
    emoji: '💡',
    description: 'Problem, çözüm, hedef kitle ve sonraki adımlar',
    build: () => ({
      title: 'Yeni Proje Fikri',
      kind: 'comprehensive',
      color: 'coral',
      font: 'sans',
      tags: ['fikir'],
      stickers: ['💡 FİKİR'],
      content:
        `<h2>🧩 Problem</h2><p>Hangi sorunu çözüyor?</p>` +
        `<h2>✨ Çözüm</h2><p>Fikrin özü tek cümlede...</p>` +
        `<h2>👥 Hedef Kitle</h2>${bullets('Kimler kullanır?')}` +
        `<h2>🚀 Özellikler</h2>${bullets('Olmazsa olmaz', 'Olsa güzel olur')}` +
        `<h2>➡️ Sonraki Adımlar</h2>${todo('Araştırma yap', 'Taslak çiz', 'Geri bildirim al')}`,
    }),
  },
  {
    id: 'recipe',
    name: 'Tarif',
    emoji: '🍳',
    description: 'Malzemeler, adım adım yapılış ve püf noktası',
    build: () => ({
      title: 'Tarif Adı',
      kind: 'comprehensive',
      color: 'peach',
      font: 'serif',
      tags: ['tarif'],
      content:
        `<p><b>⏱️ Süre:</b> 30 dk · <b>🍽️ Porsiyon:</b> 4 kişilik</p>` +
        `<h2>Malzemeler</h2>${todo('2 su bardağı un', '1 tatlı kaşığı tuz')}` +
        `<h2>Hazırlanışı</h2>${numbered('İlk adım', 'İkinci adım', 'Servis')}` +
        `<blockquote>💡 Püf noktası: ...</blockquote>`,
    }),
  },
  {
    id: 'book',
    name: 'Kitap Notu',
    emoji: '📚',
    description: 'Özet, altı çizili cümleler ve düşünceler',
    build: () => ({
      title: 'Kitap Adı',
      kind: 'comprehensive',
      color: 'neutral',
      font: 'serif',
      tags: ['kitap'],
      content:
        `<p><b>✍️ Yazar:</b> </p><p><b>⭐ Puan:</b> ★★★★☆</p>` +
        `<h2>Kısa Özet</h2><p>...</p>` +
        `<h2>Altını Çizdiklerim</h2><blockquote>"..."</blockquote>` +
        `<h2>Düşüncelerim</h2><p>...</p>`,
    }),
  },
  {
    id: 'travel',
    name: 'Seyahat Planı',
    emoji: '✈️',
    description: 'Rota, bavul listesi, gezilecek yerler ve bütçe',
    build: () => ({
      title: 'Seyahat Planı',
      kind: 'comprehensive',
      color: 'blue',
      font: 'sans',
      tags: ['seyahat'],
      stickers: ['🏖️ PLAN'],
      content:
        `<p><b>📍 Rota:</b> </p><p><b>📅 Tarihler:</b> </p>` +
        `<h2>🧳 Bavul Listesi</h2>${todo('Kimlik / Pasaport', 'Şarj aleti', 'Rahat ayakkabı')}` +
        `<h2>🗺️ Gezilecek Yerler</h2>${bullets('Yer 1', 'Yer 2')}` +
        `<h2>💰 Bütçe</h2>${bullets('Ulaşım: ', 'Konaklama: ', 'Yemek: ')}`,
    }),
  },
  {
    id: 'goal',
    name: 'Hedef Takibi',
    emoji: '🎯',
    description: 'Neden, kilometre taşları ve son tarih',
    build: () => ({
      title: 'Hedefim',
      kind: 'comprehensive',
      color: 'pink',
      font: 'sans',
      tags: ['hedef'],
      stickers: ['🎯 HEDEF'],
      content:
        `<h2>Neden önemli?</h2><p>...</p>` +
        `<h2>Kilometre Taşları</h2>${todo('1. adım', '2. adım', '3. adım')}` +
        `<p><b>🏁 Son tarih:</b> </p>`,
    }),
  },
];
