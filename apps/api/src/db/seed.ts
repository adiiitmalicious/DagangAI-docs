import bcrypt from 'bcryptjs';
import { pool } from './pool.js';

const CATEGORY_PRESETS = [
  {
    category: 'fnb',
    label: 'Kuliner, Kopi & Minuman (F&B)',
    is_priority_segment: true,
    example_description:
      'Kedai kopi dan camilan rumahan yang menyajikan kopi susu gula aren dari biji arabika lokal serta roti panggang hangat untuk teman kerja dan santai.',
    example_usps: [
      'Biji kopi arabika lokal sangrai segar setiap minggu',
      'Gula aren murni tanpa pemanis buatan',
      'Kemasan rapat anti tumpah untuk pesan antar',
    ],
    example_target_audience:
      'Pekerja muda, mahasiswa, dan keluarga usia 20–38 tahun di area perkotaan yang mencari minuman praktis dan terjangkau.',
    recommended_tones: ['friendly_casual', 'energetic_promo', 'storytelling'],
    suggested_product_categories: [
      'Kopi & Minuman',
      'Kue & Camilan',
      'Makanan Berat',
      'Paket Hemat',
    ],
  },
  {
    category: 'fashion_craft',
    label: 'Fashion, Aksesoris & Kerajinan',
    is_priority_segment: true,
    example_description:
      'Studio busana dan kerajinan tangan lokal yang memproduksi tas kanvas, outer tenun modern, dan aksesori harian berbahan ramah lingkungan.',
    example_usps: [
      'Jahitan rapi kualitas butik dengan produksi terbatas',
      'Bahan katun dan kanvas tebal nyaman dipakai seharian',
      'Desain minimalis mudah dipadukan untuk kerja maupun santai',
    ],
    example_target_audience:
      'Perempuan dan profesional muda usia 22–40 tahun yang menyukai produk lokal estetik dan fungsional.',
    recommended_tones: ['elegant', 'storytelling', 'friendly_casual'],
    suggested_product_categories: [
      'Atasan & Outer',
      'Tas & Dompet',
      'Aksesori',
      'Hampers & Kado',
    ],
  },
  {
    category: 'local_service',
    label: 'Jasa Lokal & Layanan Harian',
    is_priority_segment: true,
    example_description:
      'Layanan cuci sepatu, servis AC, dan perawatan rumah tangga panggilan dengan teknisi berpengalaman, estimasi biaya transparan, dan jadwal fleksibel.',
    example_usps: [
      'Antar-jemput atau teknisi datang langsung ke lokasi',
      'Estimasi biaya dijelaskan di awal sebelum pengerjaan',
      'Pengerjaan rapi dan tepat waktu',
    ],
    example_target_audience:
      'Pemilik rumah tangga, penghuni kos, dan pekerja sibuk usia 23–45 tahun yang butuh layanan cepat dan terpercaya.',
    recommended_tones: ['professional', 'friendly_casual', 'educational'],
    suggested_product_categories: [
      'Layanan Reguler',
      'Paket Langganan',
      'Perbaikan & Servis',
      'Konsultasi',
    ],
  },
  {
    category: 'beauty_care',
    label: 'Kecantikan & Perawatan Diri',
    is_priority_segment: false,
    example_description:
      'Brand perawatan kulit dan tubuh rumahan yang mengedepankan bahan lembut untuk rutinitas harian dan kenyamanan pemakaian.',
    example_usps: [
      'Tekstur ringan dan cepat meresap untuk penggunaan harian',
      'Kemasan travel-friendly mudah dibawa bepergian',
    ],
    example_target_audience:
      'Remaja dewasa dan pekerja muda usia 19–35 tahun yang peduli rutinitas perawatan diri.',
    recommended_tones: ['educational', 'elegant', 'friendly_casual'],
    suggested_product_categories: [
      'Perawatan Wajah',
      'Perawatan Tubuh',
      'Paket Hadiah',
    ],
  },
  {
    category: 'photo_video',
    label: 'Jasa Foto, Video & Dokumentasi',
    is_priority_segment: false,
    example_description:
      'Jasa foto produk UMKM, dokumentasi acara keluarga, dan pembuatan konten video pendek siap unggah untuk media sosial.',
    example_usps: [
      'Hasil foto jernih siap pakai untuk katalog marketplace',
      'Pengarahan gaya dan konsep dibantu tim kami',
    ],
    example_target_audience:
      'Pelaku usaha lokal, pasangan, dan penyelenggara acara di kota sekitar.',
    recommended_tones: ['professional', 'storytelling', 'elegant'],
    suggested_product_categories: [
      'Foto Produk',
      'Dokumentasi Acara',
      'Video Pendek',
    ],
  },
  {
    category: 'design_creative',
    label: 'Desain Grafis & Jasa Kreatif',
    is_priority_segment: false,
    example_description:
      'Studio kreatif yang membantu pembuatan identitas visual, kemasan produk, dan materi promosi digital bagi usaha berkembang.',
    example_usps: [
      'Desain disesuaikan karakter merek dan target pasar',
      'File siap cetak dan siap unggah media sosial',
    ],
    example_target_audience:
      'Pemilik usaha rintisan dan UMKM yang ingin tampil lebih profesional.',
    recommended_tones: ['professional', 'educational', 'friendly_casual'],
    suggested_product_categories: [
      'Identitas Merek',
      'Desain Kemasan',
      'Materi Promosi',
    ],
  },
  {
    category: 'other',
    label: 'Usaha & Kategori Lainnya',
    is_priority_segment: false,
    example_description:
      'Usaha mandiri yang menyediakan produk atau layanan pilihan bagi pelanggan lokal dengan pelayanan ramah dan respons cepat.',
    example_usps: [
      'Pelayanan ramah dan respons cepat via WhatsApp',
      'Kualitas terjaga dan proses pemesanan mudah',
    ],
    example_target_audience:
      'Pelanggan lokal dan pembeli online yang mengutamakan kemudahan komunikasi.',
    recommended_tones: ['friendly_casual', 'professional', 'energetic_promo'],
    suggested_product_categories: ['Produk Unggulan', 'Layanan Utama', 'Paket'],
  },
] as const;

const DEFAULT_SLOTS_SCHEMA = {
  headline: { max_chars: 45, required: true },
  subheadline: { max_chars: 90, required: false },
  price_or_badge: { max_chars: 25, required: false },
  cta: { max_chars: 35, required: false },
};

const DEFAULT_FONT_PRESETS = ['modern_clean', 'warm_artisan', 'bold_promo'];

const DESIGN_TEMPLATES = [
  {
    id: 'tpl_fnb_warm_01',
    name: 'Warm Menu Highlight',
    segment: 'fnb',
    aspect_ratio: '1:1',
    width_px: 1080,
    height_px: 1080,
    thumbnail_url: '/templates/tpl_fnb_warm_01.webp',
    default_colors: { background: '#FFF8F0', accent: '#D96B27', text: '#1C1917' },
    layout_definition: { variant: 'top_photo_bottom_card', image_ratio: 0.56 },
    sort_order: 1,
  },
  {
    id: 'tpl_fnb_story_01',
    name: 'Daily Menu Story',
    segment: 'fnb',
    aspect_ratio: '9:16',
    width_px: 1080,
    height_px: 1920,
    thumbnail_url: '/templates/tpl_fnb_story_01.webp',
    default_colors: { background: '#231914', accent: '#D96B27', text: '#FAF8F5' },
    layout_definition: { variant: 'full_bleed_gradient_bottom', overlay: 'dark_soft' },
    sort_order: 2,
  },
  {
    id: 'tpl_fnb_banner_01',
    name: 'Promo Paket Banner',
    segment: 'fnb',
    aspect_ratio: '16:9',
    width_px: 1920,
    height_px: 1080,
    thumbnail_url: '/templates/tpl_fnb_banner_01.webp',
    default_colors: { background: '#FAF8F5', accent: '#0F5C4D', text: '#1C1917' },
    layout_definition: { variant: 'split_left_text_right_photo', split: 0.5 },
    sort_order: 3,
  },
  {
    id: 'tpl_fashion_clean_01',
    name: 'Lookbook Minimal',
    segment: 'fashion_craft',
    aspect_ratio: '1:1',
    width_px: 1080,
    height_px: 1080,
    thumbnail_url: '/templates/tpl_fashion_clean_01.webp',
    default_colors: { background: '#FFFFFF', accent: '#57534E', text: '#1C1917' },
    layout_definition: { variant: 'framed_editorial', frame_padding: 64 },
    sort_order: 4,
  },
  {
    id: 'tpl_fashion_story_01',
    name: 'New Arrival Story',
    segment: 'fashion_craft',
    aspect_ratio: '9:16',
    width_px: 1080,
    height_px: 1920,
    thumbnail_url: '/templates/tpl_fashion_story_01.webp',
    default_colors: { background: '#F3EFE9', accent: '#0F5C4D', text: '#1C1917' },
    layout_definition: { variant: 'vertical_card_accent', card_radius: 32 },
    sort_order: 5,
  },
  {
    id: 'tpl_fashion_banner_01',
    name: 'Collection Header',
    segment: 'fashion_craft',
    aspect_ratio: '16:9',
    width_px: 1920,
    height_px: 1080,
    thumbnail_url: '/templates/tpl_fashion_banner_01.webp',
    default_colors: { background: '#FAF8F5', accent: '#78716C', text: '#1C1917' },
    layout_definition: { variant: 'editorial_banner_split', split: 0.45 },
    sort_order: 6,
  },
  {
    id: 'tpl_service_trust_01',
    name: 'Promo Layanan Jelas',
    segment: 'local_service',
    aspect_ratio: '1:1',
    width_px: 1080,
    height_px: 1080,
    thumbnail_url: '/templates/tpl_service_trust_01.webp',
    default_colors: { background: '#E6F2EF', accent: '#0F5C4D', text: '#1C1917' },
    layout_definition: { variant: 'trust_header_photo_cta', emphasis: 'cta' },
    sort_order: 7,
  },
  {
    id: 'tpl_service_story_01',
    name: 'Booking Story',
    segment: 'local_service',
    aspect_ratio: '9:16',
    width_px: 1080,
    height_px: 1920,
    thumbnail_url: '/templates/tpl_service_story_01.webp',
    default_colors: { background: '#FFFFFF', accent: '#0F5C4D', text: '#1C1917' },
    layout_definition: { variant: 'vertical_service_card', badge_style: 'pill' },
    sort_order: 8,
  },
  {
    id: 'tpl_service_banner_01',
    name: 'Service Info Banner',
    segment: 'local_service',
    aspect_ratio: '16:9',
    width_px: 1920,
    height_px: 1080,
    thumbnail_url: '/templates/tpl_service_banner_01.webp',
    default_colors: { background: '#0F5C4D', accent: '#D96B27', text: '#FFFFFF' },
    layout_definition: { variant: 'solid_brand_banner', split: 0.55 },
    sort_order: 9,
  },
  {
    id: 'tpl_general_promo_01',
    name: 'Promo Serbaguna',
    segment: 'general',
    aspect_ratio: '1:1',
    width_px: 1080,
    height_px: 1080,
    thumbnail_url: '/templates/tpl_general_promo_01.webp',
    default_colors: { background: '#FAF8F5', accent: '#D96B27', text: '#1C1917' },
    layout_definition: { variant: 'balanced_promo_square', badge_position: 'top_right' },
    sort_order: 10,
  },
  {
    id: 'tpl_general_story_01',
    name: 'Story Pengumuman',
    segment: 'general',
    aspect_ratio: '9:16',
    width_px: 1080,
    height_px: 1920,
    thumbnail_url: '/templates/tpl_general_story_01.webp',
    default_colors: { background: '#FDF0E6', accent: '#D96B27', text: '#1C1917' },
    layout_definition: { variant: 'announcement_story', alignment: 'center' },
    sort_order: 11,
  },
  {
    id: 'tpl_general_banner_01',
    name: 'Banner Kampanye',
    segment: 'general',
    aspect_ratio: '16:9',
    width_px: 1920,
    height_px: 1080,
    thumbnail_url: '/templates/tpl_general_banner_01.webp',
    default_colors: { background: '#FFFFFF', accent: '#0F5C4D', text: '#1C1917' },
    layout_definition: { variant: 'campaign_wide_banner', split: 0.5 },
    sort_order: 12,
  },
] as const;

async function seed(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. system_ai_configs (singleton id = 1)
    await client.query(`
      INSERT INTO system_ai_configs (
        id, daily_credits_limit, rate_limit_per_minute, credit_costs, circuit_breaker_open
      ) VALUES (
        1,
        30,
        5,
        '{"content_generate":1,"content_refine":1,"design_copy_assist":1,"planner_ideas":2}'::jsonb,
        FALSE
      )
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('[Seed] system_ai_configs (id=1) ensured.');

    // 2. 7 business_category_presets
    for (const preset of CATEGORY_PRESETS) {
      await client.query(
        `
        INSERT INTO business_category_presets (
          category, label, is_priority_segment, example_description,
          example_usps, example_target_audience, recommended_tones, suggested_product_categories
        ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8::jsonb)
        ON CONFLICT (category) DO UPDATE SET
          label = EXCLUDED.label,
          is_priority_segment = EXCLUDED.is_priority_segment,
          example_description = EXCLUDED.example_description,
          example_usps = EXCLUDED.example_usps,
          example_target_audience = EXCLUDED.example_target_audience,
          recommended_tones = EXCLUDED.recommended_tones,
          suggested_product_categories = EXCLUDED.suggested_product_categories,
          updated_at = NOW();
        `,
        [
          preset.category,
          preset.label,
          preset.is_priority_segment,
          preset.example_description,
          JSON.stringify(preset.example_usps),
          preset.example_target_audience,
          JSON.stringify(preset.recommended_tones),
          JSON.stringify(preset.suggested_product_categories),
        ]
      );
    }
    console.log(`[Seed] ${CATEGORY_PRESETS.length} business_category_presets upserted.`);

    // 3. 12 design_templates
    for (const tpl of DESIGN_TEMPLATES) {
      await client.query(
        `
        INSERT INTO design_templates (
          id, name, segment, aspect_ratio, width_px, height_px, thumbnail_url,
          supports_logo, supports_badge, slots_schema, font_presets,
          default_colors, layout_definition, is_active, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, TRUE, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, TRUE, $12)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          segment = EXCLUDED.segment,
          aspect_ratio = EXCLUDED.aspect_ratio,
          width_px = EXCLUDED.width_px,
          height_px = EXCLUDED.height_px,
          thumbnail_url = EXCLUDED.thumbnail_url,
          slots_schema = EXCLUDED.slots_schema,
          font_presets = EXCLUDED.font_presets,
          default_colors = EXCLUDED.default_colors,
          layout_definition = EXCLUDED.layout_definition,
          sort_order = EXCLUDED.sort_order,
          updated_at = NOW();
        `,
        [
          tpl.id,
          tpl.name,
          tpl.segment,
          tpl.aspect_ratio,
          tpl.width_px,
          tpl.height_px,
          tpl.thumbnail_url,
          JSON.stringify(DEFAULT_SLOTS_SCHEMA),
          JSON.stringify(DEFAULT_FONT_PRESETS),
          JSON.stringify(tpl.default_colors),
          JSON.stringify(tpl.layout_definition),
          tpl.sort_order,
        ]
      );
    }
    console.log(`[Seed] ${DESIGN_TEMPLATES.length} design_templates upserted.`);

    // 4. Platform Admin bootstrap from environment variables
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminFullName = process.env.ADMIN_FULL_NAME?.trim() || 'Platform Admin DagangAI';

    if (adminEmail && adminPassword) {
      const existingAdmin = await client.query<{ id: string }>(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
        [adminEmail]
      );
      if (existingAdmin.rowCount === 0) {
        const passwordHash = await bcrypt.hash(adminPassword, 12);
        await client.query(
          `
          INSERT INTO users (full_name, email, password_hash, role, status)
          VALUES ($1, $2, $3, 'platform_admin', 'active');
          `,
          [adminFullName, adminEmail, passwordHash]
        );
        console.log(`[Seed] Bootstrap platform_admin created: ${adminEmail}`);
      } else {
        console.log(`[Seed] Platform admin already exists: ${adminEmail}`);
      }
    } else {
      console.warn(
        '[Seed] ADMIN_EMAIL or ADMIN_PASSWORD not set; skipping platform_admin bootstrap.'
      );
    }

    await client.query('COMMIT');
    console.log('[Seed] All seed operations completed cleanly.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('[Seed] Failed:', err);
  process.exit(1);
});
