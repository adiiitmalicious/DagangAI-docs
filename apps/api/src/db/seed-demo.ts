import bcrypt from 'bcryptjs';
import { pool } from './pool.js';

// PNG 1x1 transparan/hangat minimal valid untuk demo seed foto produk
const DEMO_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function seedDemo(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const demoEmail = 'rina@kopisenja.id';
    const demoPass = process.env.DEMO_USER_PASSWORD ?? 'DemoKopiSenja123!';
    const hash = await bcrypt.hash(demoPass, 12);

    const userRes = await client.query<{ id: string }>(
      `
      INSERT INTO users (full_name, email, password_hash, role, status)
      VALUES ('Rina Wulandari', $1, $2, 'business_owner', 'active')
      ON CONFLICT ((LOWER(email))) DO UPDATE SET full_name = EXCLUDED.full_name
      RETURNING id
      `,
      [demoEmail, hash]
    );
    const userId = userRes.rows[0].id;

    const bizRes = await client.query<{ id: string }>(
      `
      INSERT INTO businesses (
        owner_user_id, name, category, description, location,
        unique_selling_points, target_audience_age_range, target_audience_description,
        language_preference, brand_tone, avoided_words, primary_color, secondary_color
      ) VALUES (
        $1,
        'Kopi Senja Nusantara',
        'fnb',
        'Kedai kopi rumahan di Bandung yang menyajikan kopi susu gula aren dari biji arabika lokal pilihan dan camilan hangat.',
        'Bandung, Jawa Barat',
        $2::jsonb,
        '18-35 tahun',
        'Mahasiswa, pekerja remote, dan pecinta kopi harian yang mencari rasa konsisten dengan harga ramah.',
        'id',
        'friendly_casual',
        $3::jsonb,
        '#5C3A21',
        '#E6B87D'
      )
      ON CONFLICT (owner_user_id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description
      RETURNING id
      `,
      [
        userId,
        JSON.stringify([
          'Biji arabika lokal sangrai segar tiap minggu',
          'Gula aren murni tanpa pemanis buatan',
          'Kemasan rapat anti tumpah untuk pesan antar',
        ]),
        JSON.stringify(['murahan', 'paling enak sedunia']),
      ]
    );
    const businessId = bizRes.rows[0].id;

    const demoProducts = [
      {
        name: 'Es Kopi Susu Gula Aren',
        category: 'Kopi',
        description: 'Perpaduan espresso arabika lokal, susu segar, dan gula aren murni 250ml.',
        price_min: 18000,
        price_max: 22000,
        key_benefits: ['Gula aren murni tanpa pemanis buatan', 'Bisa pilih level es dan manis'],
      },
      {
        name: 'Matcha Latte Oat',
        category: 'Non-Kopi',
        description: 'Bubuk matcha pilihan dipadukan dengan susu oat lembut yang creamy.',
        price_min: 24000,
        price_max: 24000,
        key_benefits: ['Menggunakan susu oat', 'Cocok untuk teman kerja sore'],
      },
      {
        name: 'Roti Bakar Keju Cokelat',
        category: 'Kue & Camilan',
        description: 'Roti tebal panggang hangat dengan olesan cokelat lumer dan taburan keju melimpah.',
        price_min: 15000,
        price_max: 18000,
        key_benefits: ['Dipanggang segar saat dipesan', 'Porsi pas untuk berbagi'],
      },
    ];

    const productIds: string[] = [];
    for (const p of demoProducts) {
      const existingProd = await client.query<{ id: string }>(
        'SELECT id FROM products WHERE business_id = $1 AND name = $2 AND deleted_at IS NULL',
        [businessId, p.name]
      );
      let prodId: string;
      if (existingProd.rowCount && existingProd.rowCount > 0) {
        prodId = existingProd.rows[0].id;
      } else {
        const ins = await client.query<{ id: string }>(
          `
          INSERT INTO products (
            business_id, name, type, category, description,
            price_min, price_max, key_benefits, availability_status
          ) VALUES ($1, $2, 'product', $3, $4, $5, $6, $7::jsonb, 'available')
          RETURNING id
          `,
          [
            businessId,
            p.name,
            p.category,
            p.description,
            p.price_min,
            p.price_max,
            JSON.stringify(p.key_benefits),
          ]
        );
        prodId = ins.rows[0].id;

        await client.query(
          `
          INSERT INTO product_images (
            product_id, business_id, storage_key, url, mime_type, file_size_bytes, is_primary, sort_order
          ) VALUES ($1, $2, $3, $4, 'image/png', 68, TRUE, 0)
          `,
          [
            prodId,
            businessId,
            `businesses/${businessId}/products/${prodId}/demo.png`,
            `data:image/png;base64,${DEMO_PNG_BASE64}`,
          ]
        );
      }
      productIds.push(prodId);
    }

    // 2 Materi tersimpan (Produk ke-2 sengaja dibiarkan belum dipromosikan untuk demo Dashboard US-08!)
    const existingContents = await client.query<{ cnt: string }>(
      'SELECT COUNT(*)::text AS cnt FROM content_items WHERE business_id = $1 AND deleted_at IS NULL',
      [businessId]
    );
    if (Number(existingContents.rows[0]?.cnt ?? 0) === 0) {
      const cnt1 = await client.query<{ id: string }>(
        `
        INSERT INTO content_items (
          business_id, product_id, product_name_snapshot, title, content_type,
          channel, status, headline, body, cta, hashtags, brand_tone, source
        ) VALUES (
          $1, $2, 'Es Kopi Susu Gula Aren',
          'Caption Sore — Es Kopi Susu Gula Aren',
          'social_caption', 'instagram', 'planned',
          'Sore makin santai bareng Es Kopi Susu Gula Aren!',
          'Butuh teman lanjut kerja sore ini? Es Kopi Susu Gula Aren dari Kopi Senja Nusantara siap nemenin dengan espresso arabika lokal dan gula aren murni. Mulai Rp18.000 aja!',
          'Kirim DM sekarang atau mampir ke kedai kami di Bandung!',
          '["#KopiSenjaNusantara","#KopiSusuGulaAren"]'::jsonb,
          'friendly_casual', 'ai_generated'
        ) RETURNING id
        `,
        [businessId, productIds[0]]
      );

      await client.query(
        `
        INSERT INTO content_items (
          business_id, product_id, product_name_snapshot, title, content_type,
          channel, status, headline, body, cta, hashtags, brand_tone, source
        ) VALUES (
          $1, $2, 'Roti Bakar Keju Cokelat',
          'Pesan WA Paket Sore — Roti Bakar',
          'promo_message', 'whatsapp', 'draft',
          'Teman Ngopi Hangat Sore Ini',
          'Halo Kak! Roti Bakar Keju Cokelat siap dipanggang hangat sore ini mulai Rp15.000. Cocok buat nemenin kerja atau santai bareng teman.',
          'Balas pesan ini untuk pre-order ya!',
          '["#RotiBakar","#KopiSenja"]'::jsonb,
          'friendly_casual', 'ai_generated'
        )
        `,
        [businessId, productIds[2]]
      );

      const des1 = await client.query<{ id: string }>(
        `
        INSERT INTO design_assets (
          business_id, template_id, product_id, product_name_snapshot,
          source_content_id, title, aspect_ratio, config
        ) VALUES (
          $1, 'tpl_fnb_warm_01', $2, 'Es Kopi Susu Gula Aren', $3,
          'Poster Feed Es Kopi Susu', '1:1',
          '{"texts":{"headline":"Es Kopi Susu Gula Aren","subheadline":"Arabika lokal & gula aren murni","price_or_badge":"Mulai Rp18.000","cta":"Pesan via DM Sekarang"},"colors":{"background":"#FFF8F0","accent":"#5C3A21","text":"#1C1917"},"font_preset":"warm_artisan","show_logo":true,"logo_position":"top_left","show_badge":true}'::jsonb
        ) RETURNING id
        `,
        [businessId, productIds[0], cnt1.rows[0].id]
      );

      await client.query(
        `
        INSERT INTO marketing_plan_items (
          business_id, product_id, product_name_snapshot, content_item_id, content_title_snapshot,
          design_asset_id, design_title_snapshot, title, campaign_name, channel, scheduled_date, status
        ) VALUES (
          $1, $2, 'Es Kopi Susu Gula Aren', $3, 'Caption Sore — Es Kopi Susu Gula Aren',
          $4, 'Poster Feed Es Kopi Susu', 'Posting Feed Sore — Es Kopi Susu Gula Aren',
          'Kampanye Kopi Harian', 'instagram', (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE + 1, 'planned'
        )
        `,
        [businessId, productIds[0], cnt1.rows[0].id, des1.rows[0].id]
      );
    }

    await client.query('COMMIT');
    console.log(`[Demo Seed] Akun demo siap: ${demoEmail} / ${demoPass}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDemo().catch((err) => {
  console.error('[Demo Seed] Gagal:', err);
  process.exit(1);
});
