import type { BrandTone, BusinessCategory, LanguagePreference } from '@dagangai/shared';

export const BUSINESS_CATEGORY_OPTIONS: Array<{
  value: BusinessCategory;
  label: string;
  isPriority: boolean;
}> = [
  { value: 'fnb', label: 'Kuliner, Kopi & Minuman (F&B)', isPriority: true },
  { value: 'fashion_craft', label: 'Fashion, Aksesoris & Kerajinan', isPriority: true },
  { value: 'local_service', label: 'Jasa Lokal & Layanan Harian', isPriority: true },
  { value: 'beauty_care', label: 'Kecantikan & Perawatan Diri', isPriority: false },
  { value: 'photo_video', label: 'Jasa Foto, Video & Dokumentasi', isPriority: false },
  { value: 'design_creative', label: 'Desain Grafis & Jasa Kreatif', isPriority: false },
  { value: 'other', label: 'Usaha & Kategori Lainnya', isPriority: false },
];

export const BRAND_TONE_OPTIONS: Array<{
  value: BrandTone;
  label: string;
  example: string;
}> = [
  {
    value: 'friendly_casual',
    label: 'Ramah & Santai',
    example: '"Halo Kak! Lagi cari kopi susu yang pas buat nemenin kerja sore ini?"',
  },
  {
    value: 'professional',
    label: 'Profesional & Terpercaya',
    example: '"Layanan tepat waktu dengan estimasi biaya transparan sejak awal."',
  },
  {
    value: 'elegant',
    label: 'Elegan & Rapi',
    example: '"Sentuhan detail minimalis untuk melengkapi gaya harian Anda."',
  },
  {
    value: 'energetic_promo',
    label: 'Antusias & Promotif',
    example: '"Siap-siap nikmati paket hemat spesial akhir pekan ini!"',
  },
  {
    value: 'educational',
    label: 'Informatif & Edukatif',
    example: '"Tahukah Anda? Pemilihan bahan segar menjaga cita rasa tetap konsisten."',
  },
  {
    value: 'storytelling',
    label: 'Bercerita (Storytelling)',
    example: '"Berawal dari dapur rumahan, setiap sajian kami racik dengan penuh perhatian."',
  },
];

export const LANGUAGE_OPTIONS: Array<{ value: LanguagePreference; label: string }> = [
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'id_casual_mix', label: 'Indonesia + Istilah Santai' },
  { value: 'en', label: 'Bahasa Inggris' },
];

export const COLOR_PRESETS: Array<{ name: string; primary: string; secondary: string }> = [
  { name: 'Kopi & Kayu', primary: '#5C3A21', secondary: '#E6B87D' },
  { name: 'Hijau Craft', primary: '#0F5C4D', secondary: '#D96B27' },
  { name: 'Terracotta', primary: '#C2410C', secondary: '#FDBA74' },
  { name: 'Biru Jasa', primary: '#1D4ED8', secondary: '#93C5FD' },
  { name: 'Netral Elegan', primary: '#1C1917', secondary: '#A8A29E' },
];
