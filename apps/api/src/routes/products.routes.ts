import {
  AVAILABILITY_STATUSES,
  ERROR_CODES,
  PRODUCT_TYPES,
} from '@dagangai/shared';
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { AppError } from '../lib/errors.js';
import { buildPaginationMeta, parsePagination } from '../lib/pagination.js';
import { sendSuccess } from '../lib/response.js';
import { authenticate, requireBusiness, requireRole } from '../middleware/auth.js';
import { singleImageUpload } from '../middleware/upload.js';
import { validateBody } from '../middleware/validate.js';
import { buildStorageKey, getStorageAdapter } from '../storage/adapter.js';
import { validateImageBuffer } from '../storage/validation.js';

export const productsRouter = Router();
productsRouter.use(authenticate, requireRole('business_owner'), requireBusiness);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(id: string | string[]): string {
  const val = Array.isArray(id) ? id[0] : id;
  if (!val || !UUID_REGEX.test(val)) {
    throw new AppError(404, ERROR_CODES.PRODUCT_NOT_FOUND, 'Produk tidak ditemukan.');
  }
  return val;
}

function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString('id-ID')}`;
}

function formatPricing(
  currency: string,
  priceMin: string | number | null,
  priceMax: string | number | null
) {
  const min = priceMin !== null && priceMin !== undefined ? Number(priceMin) : null;
  const max = priceMax !== null && priceMax !== undefined ? Number(priceMax) : null;

  let displayLabel: string | null = null;
  if (min !== null && max !== null) {
    displayLabel =
      min === max ? formatRupiah(min) : `${formatRupiah(min)} - ${formatRupiah(max)}`;
  } else if (min !== null) {
    displayLabel = `Mulai ${formatRupiah(min)}`;
  } else if (max !== null) {
    displayLabel = `Hingga ${formatRupiah(max)}`;
  }

  return {
    currency,
    price_min: min,
    price_max: max,
    display_label: displayLabel,
  };
}

const pricingSchema = z
  .object({
    price_min: z.number().int().min(0, 'Harga minimal tidak boleh negatif.').nullable().optional(),
    price_max: z.number().int().min(0, 'Harga maksimal tidak boleh negatif.').nullable().optional(),
  })
  .refine(
    (val) =>
      val.price_min === null ||
      val.price_min === undefined ||
      val.price_max === null ||
      val.price_max === undefined ||
      val.price_max >= val.price_min,
    { message: 'Harga maksimal harus lebih besar atau sama dengan harga minimal.' }
  );

const createProductSchema = z.object({
  name: z
    .string({ required_error: 'Nama produk wajib diisi.' })
    .trim()
    .min(2, 'Nama produk minimal 2 karakter.')
    .max(120, 'Nama produk maksimal 120 karakter.'),
  type: z.enum(PRODUCT_TYPES).default('product'),
  category: z.string().trim().max(80).nullable().optional(),
  description: z
    .string({ required_error: 'Deskripsi produk wajib diisi.' })
    .trim()
    .min(10, 'Deskripsi produk minimal 10 karakter.')
    .max(500, 'Deskripsi produk maksimal 500 karakter.'),
  pricing: pricingSchema.optional(),
  key_benefits: z
    .array(z.string().trim().min(1).max(120))
    .max(5, 'Maksimal 5 keunggulan produk.')
    .optional(),
  availability_status: z.enum(AVAILABILITY_STATUSES).default('available'),
});

const updateProductSchema = createProductSchema.partial();

interface ProductRow {
  id: string;
  business_id: string;
  name: string;
  type: string;
  category: string | null;
  description: string;
  currency: string;
  price_min: string | null;
  price_max: string | null;
  key_benefits: string[];
  availability_status: string;
  created_at: Date;
  updated_at: Date;
}

productsRouter.get('/', async (req, res, next) => {
  try {
    const businessId = req.auth!.businessId!;
    const { page, limit, offset, search, sortOrder } = parsePagination(req);

    const conditions: string[] = ['p.business_id = $1', 'p.deleted_at IS NULL'];
    const params: unknown[] = [businessId];
    let idx = 2;

    if (search) {
      conditions.push(
        `(p.name ILIKE $${idx} OR COALESCE(p.category, '') ILIKE $${idx} OR p.description ILIKE $${idx})`
      );
      params.push(`%${search}%`);
      idx++;
    }

    const typeFilter = typeof req.query.type === 'string' ? req.query.type.trim() : '';
    if (typeFilter && PRODUCT_TYPES.includes(typeFilter as (typeof PRODUCT_TYPES)[number])) {
      conditions.push(`p.type = $${idx}`);
      params.push(typeFilter);
      idx++;
    }

    const statusFilter =
      typeof req.query.availability_status === 'string'
        ? req.query.availability_status.trim()
        : '';
    if (
      statusFilter &&
      AVAILABILITY_STATUSES.includes(statusFilter as (typeof AVAILABILITY_STATUSES)[number])
    ) {
      conditions.push(`p.availability_status = $${idx}`);
      params.push(statusFilter);
      idx++;
    }

    const catFilter = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    if (catFilter) {
      conditions.push(`p.category = $${idx}`);
      params.push(catFilter);
      idx++;
    }

    const allowedSort: Record<string, string> = {
      created_at: 'p.created_at',
      updated_at: 'p.updated_at',
      name: 'p.name',
      price_min: 'p.price_min',
    };
    const sortBy =
      typeof req.query.sort_by === 'string' && allowedSort[req.query.sort_by]
        ? allowedSort[req.query.sort_by]
        : 'p.created_at';
    const orderDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM products p WHERE ${whereClause}`,
      params
    );
    const totalItems = Number(countRes.rows[0]?.total ?? 0);

    const listRes = await pool.query<
      ProductRow & {
        primary_image_url: string | null;
        images_count: string;
        contents_count: string;
      }
    >(
      `
      SELECT p.*,
             (
               SELECT pi.url
               FROM product_images pi
               WHERE pi.product_id = p.id
               ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.created_at ASC
               LIMIT 1
             ) AS primary_image_url,
             (SELECT COUNT(*)::text FROM product_images pi WHERE pi.product_id = p.id) AS images_count,
             (SELECT COUNT(*)::text FROM content_items ci WHERE ci.product_id = p.id AND ci.deleted_at IS NULL) AS contents_count
      FROM products p
      WHERE ${whereClause}
      ORDER BY ${sortBy} ${orderDir} NULLS LAST
      LIMIT $${idx} OFFSET $${idx + 1}
      `,
      [...params, limit, offset]
    );

    const data = listRes.rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      category: row.category,
      description: row.description,
      pricing: formatPricing(row.currency, row.price_min, row.price_max),
      key_benefits: row.key_benefits ?? [],
      availability_status: row.availability_status,
      primary_image_url: row.primary_image_url,
      images_count: Number(row.images_count),
      contents_count: Number(row.contents_count),
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    }));

    sendSuccess(req, res, data, 200, buildPaginationMeta(page, limit, totalItems));
  } catch (err) {
    next(err);
  }
});

productsRouter.post('/', validateBody(createProductSchema), async (req, res, next) => {
  try {
    const businessId = req.auth!.businessId!;
    const body = req.body as z.infer<typeof createProductSchema>;

    const inserted = await pool.query<ProductRow>(
      `
      INSERT INTO products (
        business_id, name, type, category, description,
        price_min, price_max, key_benefits, availability_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
      RETURNING *
      `,
      [
        businessId,
        body.name,
        body.type,
        body.category ?? null,
        body.description,
        body.pricing?.price_min ?? null,
        body.pricing?.price_max ?? null,
        JSON.stringify(body.key_benefits ?? []),
        body.availability_status,
      ]
    );

    const row = inserted.rows[0];
    sendSuccess(
      req,
      res,
      {
        id: row.id,
        name: row.name,
        type: row.type,
        category: row.category,
        description: row.description,
        pricing: formatPricing(row.currency, row.price_min, row.price_max),
        key_benefits: row.key_benefits ?? [],
        availability_status: row.availability_status,
        images: [],
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString(),
      },
      201
    );
  } catch (err) {
    next(err);
  }
});

productsRouter.get('/:productId', async (req, res, next) => {
  try {
    const productId = assertUuid(req.params.productId);

    const prodRes = await pool.query<ProductRow>(
      'SELECT * FROM products WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL',
      [productId, req.auth!.businessId]
    );
    if (prodRes.rowCount === 0) {
      throw new AppError(404, ERROR_CODES.PRODUCT_NOT_FOUND, 'Produk tidak ditemukan.');
    }

    const imgRes = await pool.query<{
      id: string;
      url: string;
      mime_type: string;
      file_size_bytes: number;
      is_primary: boolean;
      sort_order: number;
      created_at: Date;
    }>(
      `
      SELECT id, url, mime_type, file_size_bytes, is_primary, sort_order, created_at
      FROM product_images
      WHERE product_id = $1 AND business_id = $2
      ORDER BY is_primary DESC, sort_order ASC, created_at ASC
      `,
      [productId, req.auth!.businessId]
    );

    const row = prodRes.rows[0];
    sendSuccess(req, res, {
      id: row.id,
      name: row.name,
      type: row.type,
      category: row.category,
      description: row.description,
      pricing: formatPricing(row.currency, row.price_min, row.price_max),
      key_benefits: row.key_benefits ?? [],
      availability_status: row.availability_status,
      images: imgRes.rows.map((img) => ({
        ...img,
        created_at: img.created_at.toISOString(),
      })),
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

productsRouter.patch(
  '/:productId',
  validateBody(updateProductSchema),
  async (req, res, next) => {
    try {
      const productId = assertUuid(req.params.productId);

      const currentRes = await pool.query<ProductRow>(
        'SELECT * FROM products WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL',
        [productId, req.auth!.businessId]
      );
      if (currentRes.rowCount === 0) {
        throw new AppError(404, ERROR_CODES.PRODUCT_NOT_FOUND, 'Produk tidak ditemukan.');
      }

      const current = currentRes.rows[0];
      const patch = req.body as z.infer<typeof updateProductSchema>;

      const nextMin =
        patch.pricing?.price_min !== undefined
          ? patch.pricing.price_min
          : current.price_min !== null
            ? Number(current.price_min)
            : null;
      const nextMax =
        patch.pricing?.price_max !== undefined
          ? patch.pricing.price_max
          : current.price_max !== null
            ? Number(current.price_max)
            : null;

      if (nextMin !== null && nextMax !== null && nextMax < nextMin) {
        throw AppError.validation(
          'Harga maksimal harus lebih besar atau sama dengan harga minimal.'
        );
      }

      const updated = await pool.query<ProductRow>(
        `
        UPDATE products SET
          name = $1,
          type = $2,
          category = $3,
          description = $4,
          price_min = $5,
          price_max = $6,
          key_benefits = $7::jsonb,
          availability_status = $8,
          updated_at = NOW()
        WHERE id = $9 AND business_id = $10
        RETURNING *
        `,
        [
          patch.name ?? current.name,
          patch.type ?? current.type,
          patch.category !== undefined ? patch.category : current.category,
          patch.description ?? current.description,
          nextMin,
          nextMax,
          JSON.stringify(patch.key_benefits ?? current.key_benefits ?? []),
          patch.availability_status ?? current.availability_status,
          productId,
          req.auth!.businessId,
        ]
      );

      const row = updated.rows[0];
      sendSuccess(req, res, {
        id: row.id,
        name: row.name,
        type: row.type,
        category: row.category,
        description: row.description,
        pricing: formatPricing(row.currency, row.price_min, row.price_max),
        key_benefits: row.key_benefits ?? [],
        availability_status: row.availability_status,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
);

productsRouter.delete('/:productId', async (req, res, next) => {
  try {
    const productId = assertUuid(req.params.productId);

    const result = await pool.query<{ id: string }>(
      `
      UPDATE products
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL
      RETURNING id
      `,
      [productId, req.auth!.businessId]
    );

    if (result.rowCount === 0) {
      throw new AppError(404, ERROR_CODES.PRODUCT_NOT_FOUND, 'Produk tidak ditemukan.');
    }

    sendSuccess(req, res, { deleted: true, id: productId });
  } catch (err) {
    next(err);
  }
});

productsRouter.post(
  '/:productId/images',
  singleImageUpload('file'),
  async (req, res, next) => {
    const client = await pool.connect();
    let uploadedKey: string | null = null;
    try {
      const productId = assertUuid(req.params.productId);

      if (!req.file) {
        throw AppError.validation('Berkas foto produk wajib diunggah.');
      }

      const validated = validateImageBuffer(req.file.buffer);
      const businessId = req.auth!.businessId!;

      await client.query('BEGIN');

      // Row-lock produk untuk mencegah race condition batas maks 3 foto (database-design.md §4.2)
      const prodRes = await client.query<{ id: string }>(
        `
        SELECT id
        FROM products
        WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL
        FOR UPDATE
        `,
        [productId, businessId]
      );
      if (prodRes.rowCount === 0) {
        await client.query('ROLLBACK');
        throw new AppError(404, ERROR_CODES.PRODUCT_NOT_FOUND, 'Produk tidak ditemukan.');
      }

      const countRes = await client.query<{ total: string }>(
        'SELECT COUNT(*)::text AS total FROM product_images WHERE product_id = $1',
        [productId]
      );
      const currentCount = Number(countRes.rows[0]?.total ?? 0);
      if (currentCount >= 3) {
        await client.query('ROLLBACK');
        throw new AppError(
          400,
          ERROR_CODES.PRODUCT_IMAGE_LIMIT_EXCEEDED,
          'Maksimal 3 foto per produk. Hapus 1 foto terlebih dahulu.'
        );
      }

      const wantsPrimary =
        currentCount === 0 || req.body?.is_primary === 'true' || req.body?.is_primary === true;

      if (wantsPrimary && currentCount > 0) {
        await client.query(
          'UPDATE product_images SET is_primary = FALSE WHERE product_id = $1',
          [productId]
        );
      }

      const storage = getStorageAdapter();
      const key = buildStorageKey({
        kind: 'product_image',
        businessId,
        productId,
        ext: validated.extension,
      });
      const stored = await storage.putObject(key, req.file.buffer, validated.mimeType);
      uploadedKey = stored.storageKey;

      const inserted = await client.query<{
        id: string;
        url: string;
        is_primary: boolean;
        sort_order: number;
        created_at: Date;
      }>(
        `
        INSERT INTO product_images (
          product_id, business_id, storage_key, url, mime_type,
          file_size_bytes, is_primary, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, url, is_primary, sort_order, created_at
        `,
        [
          productId,
          businessId,
          stored.storageKey,
          stored.publicUrl,
          validated.mimeType,
          validated.sizeBytes,
          wantsPrimary,
          currentCount,
        ]
      );

      await client.query('COMMIT');
      const img = inserted.rows[0];
      sendSuccess(
        req,
        res,
        {
          id: img.id,
          url: img.url,
          is_primary: img.is_primary,
          sort_order: img.sort_order,
          created_at: img.created_at.toISOString(),
        },
        201
      );
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      if (uploadedKey) {
        await getStorageAdapter().deleteObject(uploadedKey).catch(() => {});
      }
      next(err);
    } finally {
      client.release();
    }
  }
);

productsRouter.patch('/:productId/images/:imageId/primary', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const productId = assertUuid(req.params.productId);
    const imageId = assertUuid(req.params.imageId);

    const businessId = req.auth!.businessId!;
    await client.query('BEGIN');

    const imgRes = await client.query<{ id: string }>(
      `
      SELECT pi.id
      FROM product_images pi
      JOIN products p ON p.id = pi.product_id
      WHERE pi.id = $1 AND pi.product_id = $2 AND p.business_id = $3 AND p.deleted_at IS NULL
      FOR UPDATE
      `,
      [imageId, productId, businessId]
    );
    if (imgRes.rowCount === 0) {
      await client.query('ROLLBACK');
      throw AppError.notFound('Foto produk tidak ditemukan.');
    }

    await client.query(
      'UPDATE product_images SET is_primary = FALSE WHERE product_id = $1',
      [productId]
    );
    await client.query(
      'UPDATE product_images SET is_primary = TRUE WHERE id = $1',
      [imageId]
    );

    await client.query('COMMIT');
    sendSuccess(req, res, { id: imageId, is_primary: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

productsRouter.delete('/:productId/images/:imageId', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const productId = assertUuid(req.params.productId);
    const imageId = assertUuid(req.params.imageId);

    const businessId = req.auth!.businessId!;
    await client.query('BEGIN');

    const imgRes = await client.query<{
      id: string;
      storage_key: string;
      is_primary: boolean;
    }>(
      `
      SELECT pi.id, pi.storage_key, pi.is_primary
      FROM product_images pi
      JOIN products p ON p.id = pi.product_id
      WHERE pi.id = $1 AND pi.product_id = $2 AND p.business_id = $3 AND p.deleted_at IS NULL
      FOR UPDATE
      `,
      [imageId, productId, businessId]
    );
    if (imgRes.rowCount === 0) {
      await client.query('ROLLBACK');
      throw AppError.notFound('Foto produk tidak ditemukan.');
    }

    const target = imgRes.rows[0];
    await client.query('DELETE FROM product_images WHERE id = $1', [imageId]);

    if (target.is_primary) {
      await client.query(
        `
        UPDATE product_images
        SET is_primary = TRUE
        WHERE id = (
          SELECT id FROM product_images
          WHERE product_id = $1
          ORDER BY sort_order ASC, created_at ASC
          LIMIT 1
        )
        `,
        [productId]
      );
    }

    await client.query('COMMIT');
    await getStorageAdapter().deleteObject(target.storage_key).catch(() => {});
    sendSuccess(req, res, { deleted: true, id: imageId });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});
