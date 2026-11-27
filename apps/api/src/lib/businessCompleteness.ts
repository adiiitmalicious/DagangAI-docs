export interface BusinessRow {
  id: string;
  owner_user_id: string;
  name: string;
  category: string;
  description: string;
  location: string | null;
  unique_selling_points: string[];
  target_audience_age_range: string | null;
  target_audience_description: string | null;
  language_preference: string;
  brand_tone: string;
  avoided_words: string[];
  primary_color: string | null;
  secondary_color: string | null;
  logo_storage_key: string | null;
  logo_url: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface BusinessCompleteness {
  score: number;
  level: 'low' | 'medium' | 'good';
  missing_fields: string[];
  context_impact_note: string;
}

export function calculateBusinessCompleteness(biz: BusinessRow): BusinessCompleteness {
  let score = 35; // name, category, description (wajib)
  const missing: string[] = [];

  if (biz.location && biz.location.trim().length > 0) {
    score += 10;
  } else {
    missing.push('location');
  }

  if (Array.isArray(biz.unique_selling_points) && biz.unique_selling_points.length > 0) {
    score += 20;
  } else {
    missing.push('unique_selling_points');
  }

  if (
    (biz.target_audience_description && biz.target_audience_description.trim().length > 0) ||
    (biz.target_audience_age_range && biz.target_audience_age_range.trim().length > 0)
  ) {
    score += 10;
  } else {
    missing.push('target_audience');
  }

  if (biz.brand_tone && biz.language_preference) {
    score += 10;
  }

  if (biz.logo_url && biz.logo_url.trim().length > 0) {
    score += 15;
  } else {
    missing.push('logo');
  }

  const level: 'low' | 'medium' | 'good' =
    score >= 80 ? 'good' : score >= 50 ? 'medium' : 'low';

  let context_impact_note =
    'Profil bisnis Anda sudah lengkap! AI dan Design Studio memiliki konteks optimal.';
  if (score < 50) {
    context_impact_note =
      'Profil bisnis masih singkat. Lengkapi keunggulan produk dan target pelanggan agar hasil AI lebih relevan.';
  } else if (score < 80) {
    context_impact_note =
      'Profil bisnis cukup baik. Menambahkan keunggulan usaha dan target pelanggan akan meningkatkan relevansi materi AI.';
  } else if (missing.includes('logo')) {
    context_impact_note =
      'Profil bisnis Anda sudah baik untuk menghasilkan materi AI yang kontekstual. Tambahkan logo untuk melengkapi template Design Studio.';
  }

  return {
    score,
    level,
    missing_fields: missing,
    context_impact_note,
  };
}

export function formatBusinessResponse(biz: BusinessRow) {
  return {
    id: biz.id,
    name: biz.name,
    category: biz.category,
    description: biz.description,
    location: biz.location,
    unique_selling_points: biz.unique_selling_points ?? [],
    target_audience: {
      age_range: biz.target_audience_age_range,
      description: biz.target_audience_description,
    },
    brand_identity: {
      language_preference: biz.language_preference,
      brand_tone: biz.brand_tone,
      avoided_words: biz.avoided_words ?? [],
      primary_color: biz.primary_color,
      secondary_color: biz.secondary_color,
      logo_url: biz.logo_url,
    },
    completeness: calculateBusinessCompleteness(biz),
    created_at: new Date(biz.created_at).toISOString(),
    updated_at: new Date(biz.updated_at).toISOString(),
  };
}
