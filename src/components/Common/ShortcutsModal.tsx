'use client';

import React from 'react';
import { Keyboard } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { useUI } from '../../context/UIContext';

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: 'Genel',
    items: [
      ['Ctrl + K', 'Komut paleti (not ara, komut çalıştır)'],
      ['/', 'Panodaki aramaya odaklan'],
      ['Alt + N', 'Yeni not'],
      ['?', 'Bu kısayol listesi'],
      ['Esc', 'Açık pencereyi kapat / aramayı temizle'],
    ],
  },
  {
    title: 'Pano',
    items: [
      ['Shift + Tık', 'Notu seç (toplu işlem modu)'],
      ['Ctrl + A', 'Seçim modunda tüm notları seç'],
      ['Delete', 'Seçili notları çöp kutusuna taşı'],
    ],
  },
  {
    title: 'Editör',
    items: [
      ['Ctrl + S', 'Hemen kaydet'],
      ['Esc', 'Kaydet ve panoya dön'],
      ['Ctrl + B / I / U', 'Kalın / İtalik / Altı çizili'],
      ['Ctrl + Shift + X', 'Üstü çizili'],
      ['Ctrl + K', 'Bağlantı ekle'],
      ['Ctrl + Shift + 7 / 8 / 9', 'Numaralı / Madde / Yapılacak listesi'],
      ['Tab / Shift + Tab', 'Liste maddesini içeri / dışarı al'],
      ['Ctrl + Tık', 'Bağlantıyı aç'],
    ],
  },
  {
    title: 'Markdown kısayolları (satır başında yazıp boşluk)',
    items: [
      ['#  ##  ###', 'Başlık 1 / 2 / 3'],
      ['-  veya  *', 'Madde imli liste'],
      ['1.', 'Numaralı liste'],
      ['[]', 'Yapılacaklar listesi'],
      ['>', 'Alıntı'],
      ['```', 'Kod bloğu'],
      ['---', 'Ayırıcı çizgi (Enter ile)'],
    ],
  },
];

export const ShortcutsModal: React.FC = () => {
  const { openModal, setOpenModal } = useUI();
  return (
    <ModalShell
      isOpen={openModal === 'shortcuts'}
      onClose={() => setOpenModal(null)}
      title="Klavye Kısayolları"
      subtitle="Mac'te Ctrl yerine ⌘ kullanabilirsin"
      icon={<Keyboard className="w-5 h-5" />}
      size="xl"
    >
      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2.5">{group.title}</h3>
            <dl className="space-y-2">
              {group.items.map(([keys, label]) => (
                <div key={keys} className="flex items-start justify-between gap-3">
                  <dd className="text-xs text-gray-700 leading-relaxed">{label}</dd>
                  <dt className="flex-shrink-0">
                    <kbd className="px-2 py-0.5 rounded-lg bg-gray-100 border border-gray-200 border-b-2 font-bold text-gray-700 text-[11px] whitespace-nowrap">
                      {keys}
                    </kbd>
                  </dt>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </ModalShell>
  );
};
