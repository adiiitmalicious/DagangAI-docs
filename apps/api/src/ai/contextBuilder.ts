import type {
  BrandTone,
  ContentType,
  LanguagePreference,
  MarketingChannel,
  PromoGoal,
  RefinePreset,
} from '@dagangai/shared';
import {
  calculateBusinessCompleteness,
  type BusinessRow,
} from '../lib/businessCompleteness.js';

export interface ProductContextRow {
  id: string;
  name: string;
  type: string;
  category: string | null;
  description: string;
  currency: string;
  price_min: string | null;
  price_max: string | null;
  key_benefits: string[];
  availability_status: string;
}

export interface ContextWarning {
  code: string;
  message: string;
}

const SYSTEM_GUARDRAILS = `Kamu adalah asisten copywriting pemasaran digital untuk pelaku UMKM dan ekonomi kreatif Indonesia di platform DagangAI.
ATURAN RESPONSIBLE AI WAJIB (TIDAK BOLEH DILANGGAR):
1. ANTI-FABRIKASI FAKTA: Gunakan HANYA fakta yang tertulis eksplisit pada Profil Bisnis, Konteks Produk, dan Instruksi Pengguna di bawah ini.
2. DILARANG KERAS mengarang angka harga, persentase diskon, batas waktu promo, jumlah stok, alamat/nomor WhatsApp, testimoni, sertifikasi (Halal, BPOM, SNI, P-IRT, 100% organik), atau klaim medis ("terbukti menyembuhkan", "bebas efek samping") apabila TIDAK tercantum pada konteks.
3. Jika harga, kontak, atau detail promo dibutuhkan tetapi tidak ada di konteks, gunakan placeholder eksplisit dalam kurung siku seperti [isi harga] atau [isi nomor WhatsApp].
4. Patuhi daftar "Kata yang Dihindari" — kata-kata tersebut TIDAK BOLEH muncul dalam output.
5. Jangan membuat klaim jaminan peningkatan penjualan atau omzet.
6. Selalu kembalikan JSON valid sesuai skema yang diminta tanpa teks tambahan di luar JSON.`;

function formatPriceContext(p: ProductContextRow): string {
  const min = p.price_min !== null ? Number(p.price_min) : null;
  const max = p.price_max !== null ? Number(p.price_max) : null;
  if (min !== null && max !== null) {
    return min === max
      ? `Rp${min.toLocaleString('id-ID')}`
      : `Rp${min.toLocaleString('id-ID')} - Rp${max.toLocaleString('id-ID')}`;
  }
  if (min !== null) return `Mulai Rp${min.toLocaleString('id-ID')}`;
  return 'TIDAK TERSEDIA (jangan mengarang angka harga; pakai placeholder [isi harga] bila perlu)';
}

export function buildBusinessAndProductBlock(
  biz: BusinessRow,
  product: ProductContextRow | null
): {
  contextBlock: string;
  contextSummary: Record<string, unknown>;
  warnings: ContextWarning[];
} {
  const completeness = calculateBusinessCompleteness(biz);
  const warnings: ContextWarning[] = [];

  if (completeness.score < 50) {
    warnings.push({
      code: 'INCOMPLETE_BUSINESS_CONTEXT',
      message:
        'Profil bisnis masih singkat. Hasil AI tetap bisa dibuat, namun akan jauh lebih relevan jika profil dilengkapi.',
    });
  }
  if (product && product.description.trim().length < 20) {
    warnings.push({
      code: 'SHORT_PRODUCT_DESCRIPTION',
      message:
        'Deskripsi produk masih sangat singkat. Tambahkan detail atau keunggulan produk agar hasil lebih spesifik.',
    });
  }

  const lines: string[] = [
    '=== PROFIL BISNIS TERVERIFIKASI ===',
    `Nama Bisnis: ${biz.name}`,
    `Kategori: ${biz.category}`,
    `Deskripsi: ${biz.description}`,
    `Lokasi: ${biz.location || 'Tidak dicantumkan'}`,
    `Keunggulan Utama: ${
      biz.unique_selling_points?.length
        ? biz.unique_selling_points.join('; ')
        : 'Tidak dicantumkan'
    }`,
    `Target Pelanggan: ${
      biz.target_audience_description || biz.target_audience_age_range || 'Umum'
    }`,
    `Kata yang Dihindari (DILARANG MUNCUL): ${
      biz.avoided_words?.length ? biz.avoided_words.join(', ') : 'Tidak ada'
    }`,
  ];

  if (product) {
    lines.push(
      '',
      '=== KONTEKS PRODUK / LAYANAN TERPILIH ===',
      `Nama: ${product.name}`,
      `Tipe: ${product.type}`,
      `Kategori: ${product.category || 'Umum'}`,
      `Deskripsi: ${product.description}`,
      `Harga: ${formatPriceContext(product)}`,
      `Ketersediaan: ${product.availability_status}`,
      `Keunggulan Produk: ${
        product.key_benefits?.length ? product.key_benefits.join('; ') : 'Tidak dicantumkan'
      }`
    );
  } else {
    lines.push('', '=== MODE: PROMOSI BISNIS UMUM (Tanpa produk spesifik) ===');
  }

  return {
    contextBlock: lines.join('\n'),
    contextSummary: {
      business_name: biz.name,
      product_name: product?.name ?? null,
      brand_tone: biz.brand_tone,
      language: biz.language_preference,
      used_business_profile: true,
      used_product_context: Boolean(product),
    },
    warnings,
  };
}

export function buildGeneratePrompts(params: {
  biz: BusinessRow;
  product: ProductContextRow | null;
  contentType: ContentType;
  channel: MarketingChannel;
  promoGoal: PromoGoal;
  brandTone: BrandTone;
  language: LanguagePreference;
  variantsCount: number;
  additionalInstructions?: string | null;
  temporaryContext?: string | null;
}) {
  const { contextBlock, contextSummary, warnings } = buildBusinessAndProductBlock(
    params.biz,
    params.product
  );
  contextSummary.brand_tone = params.brandTone;
  contextSummary.language = params.language;

  const userPrompt = `${contextBlock}

=== PARAMETER TUGAS ===
- Jenis Materi: ${params.contentType}
- Kanal Target: ${params.channel}
- Tujuan Promosi: ${params.promoGoal}
- Gaya Bahasa: ${params.brandTone}
- Bahasa Output: ${params.language}
- Jumlah Variasi: ${params.variantsCount}
- Instruksi Tambahan Pengguna: ${params.additionalInstructions || 'Tidak ada'}
- Konteks Sementara: ${params.temporaryContext || 'Tidak ada'}

Buat tepat ${params.variantsCount} variasi dengan sudut pandang berbeda.
Kembalikan JSON dengan struktur PERSIS berikut:
{
  "variants": [
    {
      "variant_index": 1,
      "angle": "Nama sudut pandang singkat",
      "headline": "Headline singkat menarik",
      "body": "Isi materi utama siap pakai",
      "cta": "Ajakan bertindak singkat",
      "hashtags": ["#Tag1", "#Tag2", "#Tag3"]
    }
  ]
}`;

  return {
    systemPrompt: SYSTEM_GUARDRAILS,
    userPrompt,
    contextSummary,
    warnings,
  };
}

const REFINE_PRESET_INSTRUCTIONS: Record<RefinePreset, string> = {
  shorter: 'Ringkas teks agar lebih padat, langsung ke inti, dan mudah dibaca di ponsel.',
  more_casual: 'Ubah gaya bahasa menjadi lebih santai, akrab, dan hangat seperti menyapa teman.',
  more_persuasive: 'Perkuat daya tarik manfaat produk secara jujur tanpa klaim berlebihan.',
  add_clear_cta: 'Tambahkan atau perjelas ajakan bertindak (CTA) yang konkret di akhir teks.',
  more_professional: 'Ubah gaya bahasa menjadi lebih rapi, meyakinkan, dan profesional.',
};

export function buildRefinePrompts(params: {
  biz: BusinessRow;
  product: ProductContextRow | null;
  contentType: ContentType;
  channel: MarketingChannel;
  sourceText: string;
  refinePreset?: RefinePreset;
  customInstruction?: string;
}) {
  const { contextBlock } = buildBusinessAndProductBlock(params.biz, params.product);
  const presetText = params.refinePreset
    ? REFINE_PRESET_INSTRUCTIONS[params.refinePreset]
    : '';

  const userPrompt = `${contextBlock}

=== TUGAS PENYEMPURNAAN (QUICK REFINE) ===
- Jenis Materi: ${params.contentType}
- Kanal: ${params.channel}
- Teks Awal:
"""
${params.sourceText}
"""
- Instruksi Preset: ${presetText || 'Tidak ada'}
- Instruksi Kustom Pengguna: ${params.customInstruction || 'Tidak ada'}

Revisi teks awal sesuai instruksi di atas dengan tetap mematuhi seluruh fakta konteks dan aturan anti-fabrikasi.
Kembalikan JSON dengan struktur PERSIS berikut:
{
  "refined_text": "Hasil teks yang sudah disempurnakan"
}`;

  return {
    systemPrompt: SYSTEM_GUARDRAILS,
    userPrompt,
  };
}
