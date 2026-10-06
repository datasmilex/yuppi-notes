export interface StickerItem {
  id: string;
  name: string;
  content: string; // HTML or emoji string
  category: 'emoji' | 'badge';
  bg?: string;
  color?: string;
}

export const STICKER_LIST: StickerItem[] = [
  // Emojis
  { id: 'st-star', name: 'Yıldız', content: '⭐', category: 'emoji' },
  { id: 'st-heart', name: 'Kalp', content: '💖', category: 'emoji' },
  { id: 'st-fire', name: 'Alev', content: '🔥', category: 'emoji' },
  { id: 'st-sparkle', name: 'Işıltı', content: '✨', category: 'emoji' },
  { id: 'st-rocket', name: 'Roket', content: '🚀', category: 'emoji' },
  { id: 'st-idea', name: 'Ampul', content: '💡', category: 'emoji' },
  { id: 'st-flower', name: 'Çiçek', content: '🌸', category: 'emoji' },
  { id: 'st-coffee', name: 'Kahve', content: '☕', category: 'emoji' },
  { id: 'st-cat', name: 'Kedi', content: '🐱', category: 'emoji' },
  { id: 'st-crown', name: 'Taç', content: '👑', category: 'emoji' },
  { id: 'st-rainbow', name: 'Gökkuşağı', content: '🌈', category: 'emoji' },
  { id: 'st-pizza', name: 'Pizza', content: '🍕', category: 'emoji' },
  { id: 'st-party', name: 'Parti', content: '🎉', category: 'emoji' },
  { id: 'st-check', name: 'Onay', content: '✅', category: 'emoji' },
  { id: 'st-pin', name: 'İğne', content: '📌', category: 'emoji' },
  { id: 'st-warn', name: 'Uyarı', content: '⚠️', category: 'emoji' },

  // Badges
  {
    id: 'st-badge-important',
    name: 'Önemli!',
    content: '📌 ÖNEMLİ!',
    category: 'badge',
    bg: '#FEE2E2',
    color: '#991B1B',
  },
  {
    id: 'st-badge-done',
    name: 'Tamamlandı',
    content: '✅ YAPILDI',
    category: 'badge',
    bg: '#D1FAE5',
    color: '#065F46',
  },
  {
    id: 'st-badge-urgent',
    name: 'Acil!',
    content: '🚨 ACİL',
    category: 'badge',
    bg: '#FEF3C7',
    color: '#92400E',
  },
  {
    id: 'st-badge-idea',
    name: 'Harika Fikir',
    content: '💡 FİKİR',
    category: 'badge',
    bg: '#E0E7FF',
    color: '#3730A3',
  },
  {
    id: 'st-badge-target',
    name: 'Hedef',
    content: '🎯 HEDEF',
    category: 'badge',
    bg: '#FCE7F3',
    color: '#831843',
  },
  {
    id: 'st-badge-plan',
    name: 'Plan',
    content: '🏖️ PLAN',
    category: 'badge',
    bg: '#E0F2FE',
    color: '#075985',
  },
  {
    id: 'st-badge-secret',
    name: 'Gizli',
    content: '🔒 GİZLİ',
    category: 'badge',
    bg: '#F3E8FF',
    color: '#581C87',
  },
];
