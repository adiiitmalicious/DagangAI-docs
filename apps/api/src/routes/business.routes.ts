import {
  BRAND_TONES,
  BUSINESS_CATEGORIES,
  ERROR_CODES,
  LANGUAGE_PREFERENCES,
} from '@dagangai/shared';
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import {
  calculateBusinessCompleteness,
  formatBusinessResponse,
  type BusinessRow,
} from '../lib/businessCompleteness.js';
import { AppError } from '../lib/errors.js';
import { sendSuccess } from '../lib/response.js';
import { authenticate, requireBusiness, requireRole } from '../middleware/auth.js';
import { singleImageUpload } from '../middleware/upload.js';
import { validateBody } from '../middleware/validate.js';
import { buildStorageKey, getStorageAdapter } from '../storage/adapter.js';
import { validateImageBuffer } from '../storage/validation.js';

export const businessRouter = Router();
businessRouter.use(authenticate, requireRole('business_owner'));

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Format warna harus hex #RRGGBB.')
  .nullable()
  .optional();

const createBusinessSchema = z.object({
  name: z
    .string({ required_error: 'Nama bisnis wajib diisi.' })
    .trim()
    .min(2, 'Nama bisnis minimal 2 karakter.')
    .max(100, 'Nama bisnis maksimal 100 karakter.'),
  category: z.enum(BUSINESS_CATEGORIES, {
    errorMap: () => ({ message: 'Kategori bisnis tidak valid.' }),
  }),
  description: z
    .string({ required_error: 'Deskripsi bisnis wajib diisi.' })
    .trim()
    .min(10, 'Deskripsi bisnis minimal 10 karakter.')
    .max(500, 'Deskripsi bisnis maksimal 500 karakter.'),
  location: z.string().trim().max(120).nullable().optional(),
  unique_selling_points: z
    .array(z.string().trim().min(1).max(120))
    .max(5, 'Maksimal 5 keunggulan utama.')
    .optional(),
  target_audience: z
    .object({
      age_range: z.string().trim().max(60).nullable().optional(),
      description: z.string().trim().max(300).nullable().optional(),
    })
    .optional(),
  brand_identity: z
    .object({
      language_preference: z.enum(LANGUAGE_PREFERENCES).optional(),
      brand_tone: z.enum(BRAND_TONES).optional(),
      avoided_words: z
        .array(z.string().trim().min(1).max(60))
        .max(15, 'Maksimal 15 kata yang dihindari.')
        .optional(),
      primary_color: hexColorSchema,
      secondary_color: hexColorSchema,
    })
    .optional(),
});

const updateBusinessSchema = createBusinessSchema.partial();

businessRouter.get('/presets', async (req, res, next) => {
  try {
    const category =
      typeof req.query.category === 'string' ? req.query.category.trim() : '';

    if (category) {
      if (!BUSINESS_CATEGORIES.includes(category as (typeof BUSINESS_CATEGORIES)[number])) {
        throw AppError.validation('Kategori bisnis tidak valid.');
      }
      const result = await pool.query(
        'SELECT * FROM business_category_presets WHERE category = $1',
        [category]
      );
      if (result.rowCount === 0) {
        throw AppError.notFound('Preset kategori tidak ditemukan.');
      }
      sendSuccess(req, res, result.rows[0]);
      return;
    }

    const showAll = req.query.all === 'true';
    const result = await pool.query(
      showAll
        ? 'SELECT * FROM business_category_presets ORDER BY is_priority_segment DESC, category ASC'
        : 'SELECT * FROM business_category_presets WHERE is_priority_segment = TRUE ORDER BY category ASC'
    );
    sendSuccess(req, res, result.rows);
  } catch (err) {
    next(err);
  }
});

businessRouter.post(
  '/',
  validateBody(createBusinessSchema),
  async (req, res, next) => {
    try {
      const userId = req.auth!.userId;
      const existing = await pool.query<{ id: string }>(
        'SELECT id FROM businesses WHERE owner_user_id = $1',
        [userId]
      );
      if (existing.rowCount && existing.rowCount > 0) {
        throw AppError.conflict(
          ERROR_CODES.BUSINESS_ALREADY_EXISTS,
          'Setiap akun hanya dapat mengelola 1 profil bisnis.'
        );
      }

      const body = req.body as z.infer<typeof createBusinessSchema>;
      const inserted = await pool.query<BusinessRow>(
        `
        INSERT INTO businesses (
          owner_user_id, name, category, description, location,
          unique_selling_points, target_audience_age_range, target_audience_description,
          language_preference, brand_tone, avoided_words, primary_color, secondary_color
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11::jsonb, $12, $13)
        RETURNING *
        `,
        [
          userId,
          body.name,
          body.category,
          body.description,
          body.location ?? null,
          JSON.stringify(body.unique_selling_points ?? []),
          body.target_audience?.age_range ?? null,
          body.target_audience?.description ?? null,
          body.brand_identity?.language_preference ?? 'id',
          body.brand_identity?.brand_tone ?? 'friendly_casual',
          JSON.stringify(body.brand_identity?.avoided_words ?? []),
          body.brand_identity?.primary_color ?? null,
          body.brand_identity?.secondary_color ?? null,
        ]
      );

      sendSuccess(req, res, formatBusinessResponse(inserted.rows[0]), 201);
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '23505') {
        next(
          AppError.conflict(
            ERROR_CODES.BUSINESS_ALREADY_EXISTS,
            'Setiap akun hanya dapat mengelola 1 profil bisnis.'
          )
        );
        return;
      }
      next(err);
    }
  }
);

businessRouter.get('/', async (req, res, next) => {
  try {
    const result = await pool.query<BusinessRow>(
      'SELECT * FROM businesses WHERE owner_user_id = $1',
      [req.auth!.userId]
    );
    if (result.rowCount === 0) {
      throw new AppError(
        404,
        ERROR_CODES.BUSINESS_NOT_FOUND,
        'Profil bisnis belum dibuat. Silakan selesaikan onboarding.'
      );
    }
    sendSuccess(req, res, formatBusinessResponse(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

businessRouter.patch(
  '/',
  requireBusiness,
  validateBody(updateBusinessSchema),
  async (req, res, next) => {
    try {
      const currentRes = await pool.query<BusinessRow>(
        'SELECT * FROM businesses WHERE id = $1 AND owner_user_id = $2',
        [req.auth!.businessId, req.auth!.userId]
      );
      if (currentRes.rowCount === 0) {
        throw new AppError(
          404,
          ERROR_CODES.BUSINESS_NOT_FOUND,
          'Profil bisnis tidak ditemukan.'
        );
      }

      const current = currentRes.rows[0];
      const patch = req.body as z.infer<typeof updateBusinessSchema>;

      const updated = await pool.query<BusinessRow>(
        `
        UPDATE businesses SET
          name = $1,
          category = $2,
          description = $3,
          location = $4,
          unique_selling_points = $5::jsonb,
          target_audience_age_range = $6,
          target_audience_description = $7,
          language_preference = $8,
          brand_tone = $9,
          avoided_words = $10::jsonb,
          primary_color = $11,
          secondary_color = $12,
          updated_at = NOW()
        WHERE id = $13
        RETURNING *
        `,
        [
          patch.name ?? current.name,
          patch.category ?? current.category,
          patch.description ?? current.description,
          patch.location !== undefined ? patch.location : current.location,
          JSON.stringify(
            patch.unique_selling_points ?? current.unique_selling_points ?? []
          ),
          patch.target_audience?.age_range !== undefined
            ? patch.target_audience.age_range
            : current.target_audience_age_range,
          patch.target_audience?.description !== undefined
            ? patch.target_audience.description
            : current.target_audience_description,
          patch.brand_identity?.language_preference ?? current.language_preference,
          patch.brand_identity?.brand_tone ?? current.brand_tone,
          JSON.stringify(
            patch.brand_identity?.avoided_words ?? current.avoided_words ?? []
          ),
          patch.brand_identity?.primary_color !== undefined
            ? patch.brand_identity.primary_color
            : current.primary_color,
          patch.brand_identity?.secondary_color !== undefined
            ? patch.brand_identity.secondary_color
            : current.secondary_color,
          current.id,
        ]
      );

      sendSuccess(req, res, formatBusinessResponse(updated.rows[0]));
    } catch (err) {
      next(err);
    }
  }
);

businessRouter.post(
  '/logo',
  requireBusiness,
  singleImageUpload('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw AppError.validation('Berkas logo wajib diunggah.');
      }

      const validated = validateImageBuffer(req.file.buffer);
      const businessId = req.auth!.businessId!;

      const existingRes = await pool.query<{ logo_storage_key: string | null }>(
        'SELECT logo_storage_key FROM businesses WHERE id = $1',
        [businessId]
      );
      const oldKey = existingRes.rows[0]?.logo_storage_key;

      const storage = getStorageAdapter();
      const newKey = buildStorageKey({
        kind: 'logo',
        businessId,
        ext: validated.extension,
      });
      const stored = await storage.putObject(newKey, req.file.buffer, validated.mimeType);

      const updated = await pool.query<BusinessRow>(
        `
        UPDATE businesses
        SET logo_storage_key = $1, logo_url = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *
        `,
        [stored.storageKey, stored.publicUrl, businessId]
      );

      if (oldKey) {
        await storage.deleteObject(oldKey).catch(() => {});
      }

      sendSuccess(req, res, {
        logo_url: stored.publicUrl,
        completeness_score: calculateBusinessCompleteness(updated.rows[0]).score,
      });
    } catch (err) {
      next(err);
    }
  }
);

businessRouter.delete('/logo', requireBusiness, async (req, res, next) => {
  try {
    const businessId = req.auth!.businessId!;
    const existingRes = await pool.query<{ logo_storage_key: string | null }>(
      'SELECT logo_storage_key FROM businesses WHERE id = $1',
      [businessId]
    );
    const oldKey = existingRes.rows[0]?.logo_storage_key;

    const updated = await pool.query<BusinessRow>(
      `
      UPDATE businesses
      SET logo_storage_key = NULL, logo_url = NULL, updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [businessId]
    );

    if (oldKey) {
      await getStorageAdapter().deleteObject(oldKey).catch(() => {});
    }

    sendSuccess(req, res, {
      logo_url: null,
      completeness_score: calculateBusinessCompleteness(updated.rows[0]).score,
    });
  } catch (err) {
    next(err);
  }
});
