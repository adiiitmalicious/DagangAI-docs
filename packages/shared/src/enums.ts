export const USER_ROLES = ['business_owner', 'platform_admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['active', 'suspended'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const BUSINESS_CATEGORIES = [
  'fnb',
  'fashion_craft',
  'beauty_care',
  'photo_video',
  'design_creative',
  'local_service',
  'other',
] as const;
export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

export const BRAND_TONES = [
  'friendly_casual',
  'professional',
  'elegant',
  'energetic_promo',
  'educational',
  'storytelling',
] as const;
export type BrandTone = (typeof BRAND_TONES)[number];

export const LANGUAGE_PREFERENCES = ['id', 'en', 'id_casual_mix'] as const;
export type LanguagePreference = (typeof LANGUAGE_PREFERENCES)[number];

export const PRODUCT_TYPES = ['product', 'service'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const AVAILABILITY_STATUSES = ['available', 'preorder', 'unavailable'] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export const CONTENT_TYPES = [
  'social_caption',
  'product_description',
  'slogan_headline',
  'cta',
  'content_idea',
  'promo_message',
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const MARKETING_CHANNELS = [
  'instagram',
  'tiktok',
  'whatsapp',
  'marketplace_catalog',
  'general',
] as const;
export type MarketingChannel = (typeof MARKETING_CHANNELS)[number];

export const PROMO_GOALS = [
  'product_intro',
  'promo_discount',
  'education_benefit',
  'trust_testimonial',
  'seasonal_reminder',
] as const;
export type PromoGoal = (typeof PROMO_GOALS)[number];

export const REFINE_PRESETS = [
  'shorter',
  'more_casual',
  'more_persuasive',
  'add_clear_cta',
  'more_professional',
] as const;
export type RefinePreset = (typeof REFINE_PRESETS)[number];

export const CONTENT_STATUSES = ['draft', 'planned', 'published'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const CONTENT_SOURCES = ['ai_generated', 'manual'] as const;
export type ContentSource = (typeof CONTENT_SOURCES)[number];

export const ASPECT_RATIOS = ['1:1', '9:16', '16:9'] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const EXPORT_FORMATS = ['png', 'jpg'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const TEMPLATE_SEGMENTS = [
  'fnb',
  'fashion_craft',
  'local_service',
  'general',
] as const;
export type TemplateSegment = (typeof TEMPLATE_SEGMENTS)[number];

export const AI_FEATURE_TYPES = [
  'content_generate',
  'content_refine',
  'design_copy_assist',
  'planner_ideas',
] as const;
export type AiFeatureType = (typeof AI_FEATURE_TYPES)[number];

export const AI_USAGE_STATUSES = [
  'success',
  'failed',
  'rate_limited',
  'quota_exceeded',
  'policy_blocked',
  'circuit_open',
] as const;
export type AiUsageStatus = (typeof AI_USAGE_STATUSES)[number];
