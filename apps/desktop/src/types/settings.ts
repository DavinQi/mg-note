export type AccentKey = 'indigo' | 'emerald' | 'rose' | 'orange' | 'sky' | 'violet';
export type Appearance = 'classic' | 'paper' | 'mist';
export type AvatarShape = 'circle' | 'squircle' | 'blob';
export type AvatarId =
  | 'cat'
  | 'fox'
  | 'bunny'
  | 'panda'
  | 'girl'
  | 'boy'
  | 'cactus'
  | 'monstera'
  | 'sunflower'
  | 'succulent'
  | 'custom';

export interface Illustration {
  id: string;
  name: string;
  src: string;
  slogan: string;
  custom?: boolean;
}

export interface Settings {
  accent: AccentKey;
  appearance: Appearance;
  handFont: boolean;
  avatar: AvatarId;
  avatarShape: AvatarShape;
  nickname: string;
  loginArt: string;
  loginArts: { id: string; name?: string; slogan?: string }[] | null;
  carousel: 'auto' | 'off' | 'pin';
  interval: number;
  artOrder: 'seq' | 'random';
  darkMode?: boolean;
}

export const PRESET_AVATARS: { id: AvatarId; name: string }[] = [
  { id: 'cat', name: '橘猫' },
  { id: 'fox', name: '小狐狸' },
  { id: 'bunny', name: '兔兔' },
  { id: 'panda', name: '熊猫' },
  { id: 'girl', name: '动漫少女' },
  { id: 'boy', name: '动漫少年' },
  { id: 'cactus', name: '仙人掌' },
  { id: 'monstera', name: '龟背竹' },
  { id: 'sunflower', name: '向日葵' },
  { id: 'succulent', name: '多肉' },
];

export const ACCENTS: Record<AccentKey, [string, string[]]> = {
  indigo: [
    '靛蓝',
    ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'],
  ],
  emerald: [
    '薄荷',
    ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'],
  ],
  rose: [
    '樱粉',
    ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337'],
  ],
  orange: [
    '橘子',
    ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'],
  ],
  sky: [
    '天空',
    ['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e'],
  ],
  violet: [
    '葡萄',
    ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'],
  ],
};

export const APPEARANCES: Record<Appearance, [string, string]> = {
  classic: ['经典', '冷灰白'],
  paper: ['暖纸', '手账纸张'],
  mist: ['薄雾', '青灰清新'],
};

export const SHAPES: Record<AvatarShape, [string, string]> = {
  circle: ['圆形', '50%'],
  squircle: ['圆角', '28%'],
  blob: ['云朵', '58% 42% 55% 45% / 48% 58% 42% 52%'],
};

export const DEFAULT_ARTS: [string, string, string, string][] = [
  ['anime', '少女与植物', '/assets/login/login-anime.jpg', '把每一个念头，种进你的笔记花园'],
  ['cat', '猫与龟背竹', '/assets/login/login-cat.jpg', '写下今天，晒晒太阳，慢慢生长'],
  ['plants', '窗边花园', '/assets/login/login-plants.jpg', '笔记像植物，需要时间和照料'],
];

export const DEFAULT_SETTINGS: Settings = {
  accent: 'emerald',
  appearance: 'paper',
  handFont: false,
  avatar: 'cat',
  avatarShape: 'circle',
  nickname: 'Alex',
  loginArt: 'anime',
  loginArts: null,
  carousel: 'auto',
  interval: 6,
  artOrder: 'seq',
  darkMode: false,
};
