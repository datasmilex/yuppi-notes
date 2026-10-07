import { NoteColor, NoteFont, ColorDefinition, Folder } from '../types/note';

export const NOTE_COLORS: Record<NoteColor, ColorDefinition> = {
  yellow: {
    id: 'yellow',
    name: 'Pastel Sarı',
    bgClass: 'bg-[#FEF9C3]',
    borderClass: 'border-[#FDE047]',
    cardBg: '#FEF9C3',
    accent: '#EAB308',
    borderHex: '#FDE047',
    badgeHex: '#FEF08A',
    textClass: 'text-amber-950',
  },
  lavender: {
    id: 'lavender',
    name: 'Lavanta',
    bgClass: 'bg-[#F3E8FF]',
    borderClass: 'border-[#D8B4FE]',
    cardBg: '#F3E8FF',
    accent: '#A855F7',
    borderHex: '#D8B4FE',
    badgeHex: '#E9D5FF',
    textClass: 'text-purple-950',
  },
  pink: {
    id: 'pink',
    name: 'Pudra Pembe',
    bgClass: 'bg-[#FCE7F3]',
    borderClass: 'border-[#F472B6]',
    cardBg: '#FCE7F3',
    accent: '#EC4899',
    borderHex: '#F472B6',
    badgeHex: '#FBCFE8',
    textClass: 'text-pink-950',
  },
  mint: {
    id: 'mint',
    name: 'Nane Yeşili',
    bgClass: 'bg-[#D1FAE5]',
    borderClass: 'border-[#6EE7B7]',
    cardBg: '#D1FAE5',
    accent: '#10B981',
    borderHex: '#6EE7B7',
    badgeHex: '#A7F3D0',
    textClass: 'text-emerald-950',
  },
  blue: {
    id: 'blue',
    name: 'Bebek Mavisi',
    bgClass: 'bg-[#E0F2FE]',
    borderClass: 'border-[#7DD3FC]',
    cardBg: '#E0F2FE',
    accent: '#0EA5E9',
    borderHex: '#7DD3FC',
    badgeHex: '#BAE6FD',
    textClass: 'text-sky-950',
  },
  peach: {
    id: 'peach',
    name: 'Şeftali',
    bgClass: 'bg-[#FFEDD5]',
    borderClass: 'border-[#FDBA74]',
    cardBg: '#FFEDD5',
    accent: '#F97316',
    borderHex: '#FDBA74',
    badgeHex: '#FED7AA',
    textClass: 'text-orange-950',
  },
  coral: {
    id: 'coral',
    name: 'Mercan Pembesi',
    bgClass: 'bg-[#FFE4E6]',
    borderClass: 'border-[#FDA4AF]',
    cardBg: '#FFE4E6',
    accent: '#F43F5E',
    borderHex: '#FDA4AF',
    badgeHex: '#FECDD3',
    textClass: 'text-rose-950',
  },
  neutral: {
    id: 'neutral',
    name: 'Kar Beyazı',
    bgClass: 'bg-[#FFFFFF]',
    borderClass: 'border-slate-200',
    cardBg: '#FFFFFF',
    accent: '#64748B',
    borderHex: '#E2E8F0',
    badgeHex: '#F1F5F9',
    textClass: 'text-slate-900',
  },
};

export interface FontOption {
  id: NoteFont;
  name: string;
  cssClass: string;
  sample: string;
  description: string;
}

export const NOTE_FONTS: FontOption[] = [
  {
    id: 'sans',
    name: 'Modern Sans',
    cssClass: 'font-sans',
    sample: 'AaBbCc 123',
    description: 'Temiz, modern ve okunaklı',
  },
  {
    id: 'handwriting',
    name: 'El Yazısı',
    cssClass: 'font-handwriting text-lg',
    sample: 'Merhaba Sevgili Günlük...',
    description: 'Doğal, samimi el yazısı stili',
  },
  {
    id: 'mono',
    name: 'Daktilo / Mono',
    cssClass: 'font-mono tracking-tight',
    sample: 'const idea = 42;',
    description: 'Retro daktilo ve kod formatı',
  },
  {
    id: 'serif',
    name: 'Zarif Roman',
    cssClass: 'font-serif',
    sample: 'Klasik ve şık tasarım',
    description: 'Estetik edebi kitap havası',
  },
];

export const DEFAULT_LOCAL_FOLDERS: Folder[] = [
  { id: 'all_local', name: 'Tüm Notlar', emoji: '📁', color: '#6366F1', isSystem: true, scope: 'local' },
  { id: 'personal', name: 'Kişisel', emoji: '🔒', color: '#EC4899', scope: 'local' },
  { id: 'ideas', name: 'Fikirler', emoji: '💡', color: '#F59E0B', scope: 'local' },
];

export const DEFAULT_SHARED_FOLDERS: Folder[] = [
  { id: 'all_shared', name: 'Ortak Notlar', emoji: '👥', color: '#8B5CF6', isSystem: true, scope: 'shared' },
  { id: 'team_projects', name: 'Projeler', emoji: '🚀', color: '#10B981', scope: 'shared' },
  { id: 'shared_plans', name: 'Ortak Planlar', emoji: '🏖️', color: '#06B6D4', scope: 'shared' },
];

export const DEFAULT_FOLDERS: Folder[] = [
  ...DEFAULT_LOCAL_FOLDERS,
  ...DEFAULT_SHARED_FOLDERS,
];
