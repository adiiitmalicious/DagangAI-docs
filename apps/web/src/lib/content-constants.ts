import type {
  ContentType,
  MarketingChannel,
  PromoGoal,
  RefinePreset,
} from '@dagangai/shared';

export const CONTENT_TYPE_OPTIONS: Array<{ value: ContentType; label: string }> = [
  { value: 'social_caption', label: 'Caption IG/TikTok' },
  { value: 'product_description', label: 'Deskripsi Produk' },
  { value: 'slogan_headline', label: 'Slogan & Headline' },
  { value: 'cta', label: 'Ajakan (CTA)' },
  { value: 'content_idea', label: 'Ide Konten' },
  { value: 'promo_message', label: 'Pesan Promo WA' },
];

export const CHANNEL_OPTIONS: Array<{ value: MarketingChannel; label: string }> = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'marketplace_catalog', label: 'Katalog Marketplace' },
  { value: 'general', label: 'Umum' },
];

export const PROMO_GOAL_OPTIONS: Array<{ value: PromoGoal; label: string }> = [
  { value: 'product_intro', label: 'Perkenalan Produk' },
  { value: 'promo_discount', label: 'Promo & Penawaran' },
  { value: 'education_benefit', label: 'Edukasi Manfaat' },
  { value: 'trust_testimonial', label: 'Kepercayaan Pelanggan' },
  { value: 'seasonal_reminder', label: 'Momen / Musiman' },
];

export const REFINE_PRESET_OPTIONS: Array<{ value: RefinePreset; label: string }> = [
  { value: 'shorter', label: 'Lebih singkat' },
  { value: 'more_casual', label: 'Lebih santai' },
  { value: 'more_persuasive', label: 'Lebih persuasif' },
  { value: 'add_clear_cta', label: '+ CTA Jelas' },
  { value: 'more_professional', label: 'Lebih profesional' },
];

export const CONTENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  CONTENT_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

export const CHANNEL_LABELS: Record<string, string> = Object.fromEntries(
  CHANNEL_OPTIONS.map((o) => [o.value, o.label])
);
