import {
  BRAND_TONES,
  CONTENT_SOURCES,
  CONTENT_STATUSES,
  CONTENT_TYPES,
  ERROR_CODES,
  MARKETING_CHANNELS,
} from '@dagangai/shared';
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { AppError } from '../lib/errors.js';
import { buildPaginationMeta, parsePagination } from '../lib/pagination.js';
import { sendSuccess } from '../lib/response.js';
import { authenticate, requireBusiness, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

export const contentsRouter = Router();
contentsRouter.use(authenticate, requireRole('business_owner'), requireBusiness);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(id: string | string[]): string {
  const val = Array.isArray(id) ? id[0] : id;
  if (!val || !UUID_REGEX.test(val)) {
    throw AppError.notFound('Materi konten tidak ditemukan.');
  }
  return val;
}

const createContentSchema = z.object({
  title: z
    .string({ required_error: 'Judul materi wajib diisi.' })
    .trim()
    .min(2, 'Judul minimal 2 karakter.')
    .max(150, 'Judul maksimal 150 karakter.'),
  content_type: z.enum(CONTENT_TYPES),
  channel: z.enum(MARKETING_CHANNELS).default('general'),
  product_id: z.string().uuid().nullable().optional(),
  headline: z.string().trim().max(300).nullable().optional(),
  body: z
    .string({ required_error: 'Isi materi wajib diisi.' })
    .trim()
    .min(1, 'Isi materi tidak boleh kosong.')
    .max(5000, 'Isi materi maksimal 5000 karakter.'),
  cta: z.string().trim().max(300).nullable().optional(),
  hashtags: z.array(z.string().trim().max(60)).max(20).optional(),
  brand_tone: z.enum(BRAND_TONES).nullable().optional(),
  source: z.enum(CONTENT_SOURCES).default('manual'),
  generation_id: z.string().uuid().nullable().optional(),
});

const updateContentSchema = createContentSchema.partial().extend({
  status: z.enum(CONTENT_STATUSES).optional(),
});

interface ContentJoinedRow {
  id: string;
  business_id: string;
  product_id: string | null;
  product_name_snapshot: string | null;
  active_product_name: string | null;
  product_deleted_at: Date | null;
  generation_id: string | null;
  title: string;
  content_type: string;
  channel: string;
  status: string;
  headline: string | null;
  body: string;
  cta: string | null;
  hashtags: string[];
  brand_tone: string | null;
  source: string;
  created_at: Date;
  updated_at: Date;
}

function formatContent(row: ContentJoinedRow) {
  const hasProductRef = Boolean(row.product_id || row.product_name_snapshot);
  const productName = row.active_product_name ?? row.product_name_snapshot;
  const isProductDeleted =
    Boolean(row.product_deleted_at) ||
    (row.product_id === null && Boolean(row.product_name_snapshot));

  return {
    id: row.id,
    title: row.title,
    content_type: row.content_type,
    channel: row.channel,
    status: row.status,
    headline: row.headline,
    body: row.body,
    cta: row.cta,
    hashtags: row.hashtags ?? [],
    brand_tone: row.brand_tone,
    source: row.source,
    generation_id: row.generation_id,
    product: hasProductRef
      ? {
          id: row.product_id,
          name: productName ?? 'Produk historis',
          is_deleted: isProductDeleted,
        }
      : null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

contentsRouter.get('/', async (req, res, next) => {
  try {
    const businessId = req.auth!.businessId!;
    const { page, limit, offset, search, sortOrder } = parsePagination(req);

    const conditions: string[] = ['ci.business_id = $1', 'ci.deleted_at IS NULL'];
    const params: unknown[] = [businessId];
    let idx = 2;

    if (search) {
      conditions.push(`(ci.title || ' ' || ci.body) ILIKE $${idx}`);
      params.push(`%${search}%`);
      idx++;
    }

    const contentType =
      typeof req.query.content_type === 'string' ? req.query.content_type.trim() : '';
    if (
      contentType &&
      CONTENT_TYPES.includes(contentType as (typeof CONTENT_TYPES)[number])
    ) {
      conditions.push(`ci.content_type = $${idx}`);
      params.push(contentType);
      idx++;
    }

    const channel = typeof req.query.channel === 'string' ? req.query.channel.trim() : '';
    if (
      channel &&
      MARKETING_CHANNELS.includes(channel as (typeof MARKETING_CHANNELS)[number])
    ) {
      conditions.push(`ci.channel = $${idx}`);
      params.push(channel);
      idx++;
    }

    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    if (status && CONTENT_STATUSES.includes(status as (typeof CONTENT_STATUSES)[number])) {
      conditions.push(`ci.status = $${idx}`);
      params.push(status);
      idx++;
    }

    const productId =
      typeof req.query.product_id === 'string' ? req.query.product_id.trim() : '';
    if (productId && UUID_REGEX.test(productId)) {
      conditions.push(`ci.product_id = $${idx}`);
      params.push(productId);
      idx++;
    }

    const allowedSort: Record<string, string> = {
      created_at: 'ci.created_at',
      updated_at: 'ci.updated_at',
      title: 'ci.title',
    };
    const sortBy =
      typeof req.query.sort_by === 'string' && allowedSort[req.query.sort_by]
        ? allowedSort[req.query.sort_by]
        : 'ci.updated_at';
    const orderDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const whereClause = conditions.join(' AND ');

    const countRes = await pool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM content_items ci WHERE ${whereClause}`,
      params
    );
    const totalItems = Number(countRes.rows[0]?.total ?? 0);

    const listRes = await pool.query<ContentJoinedRow>(
      `
      SELECT ci.*,
             p.name AS active_product_name,
             p.deleted_at AS product_deleted_at
      FROM content_items ci
      LEFT JOIN products p ON p.id = ci.product_id
      WHERE ${whereClause}
      ORDER BY ${sortBy} ${orderDir}
      LIMIT $${idx} OFFSET $${idx + 1}
      `,
      [...params, limit, offset]
    );

    sendSuccess(
      req,
      res,
      listRes.rows.map(formatContent),
      200,
      buildPaginationMeta(page, limit, totalItems)
    );
  } catch (err) {
    next(err);
  }
});

contentsRouter.post('/', validateBody(createContentSchema), async (req, res, next) => {
  try {
    const businessId = req.auth!.businessId!;
    const body = req.body as z.infer<typeof createContentSchema>;

    let productNameSnapshot: string | null = null;
    if (body.product_id) {
      const prodRes = await pool.query<{ name: string }>(
        'SELECT name FROM products WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL',
        [body.product_id, businessId]
      );
      if (prodRes.rowCount === 0) {
        throw new AppError(404, ERROR_CODES.PRODUCT_NOT_FOUND, 'Produk tidak ditemukan.');
      }
      productNameSnapshot = prodRes.rows[0].name;
    }

    const inserted = await pool.query<ContentJoinedRow>(
      `
      WITH ins AS (
        INSERT INTO content_items (
          business_id, product_id, product_name_snapshot, generation_id,
          title, content_type, channel, status, headline, body, cta,
          hashtags, brand_tone, source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9, $10, $11::jsonb, $12, $13)
        RETURNING *
      )
      SELECT ins.*, p.name AS active_product_name, p.deleted_at AS product_deleted_at
      FROM ins
      LEFT JOIN products p ON p.id = ins.product_id
      `,
      [
        businessId,
        body.product_id ?? null,
        productNameSnapshot,
        body.generation_id ?? null,
        body.title,
        body.content_type,
        body.channel,
        body.headline ?? null,
        body.body,
        body.cta ?? null,
        JSON.stringify(body.hashtags ?? []),
        body.brand_tone ?? null,
        body.source,
      ]
    );

    sendSuccess(req, res, formatContent(inserted.rows[0]), 201);
  } catch (err) {
    next(err);
  }
});

contentsRouter.get('/:contentId', async (req, res, next) => {
  try {
    const contentId = assertUuid(req.params.contentId);
    const resRow = await pool.query<ContentJoinedRow>(
      `
      SELECT ci.*, p.name AS active_product_name, p.deleted_at AS product_deleted_at
      FROM content_items ci
      LEFT JOIN products p ON p.id = ci.product_id
      WHERE ci.id = $1 AND ci.business_id = $2 AND ci.deleted_at IS NULL
      `,
      [contentId, req.auth!.businessId]
    );
    if (resRow.rowCount === 0) {
      throw AppError.notFound('Materi konten tidak ditemukan.');
    }
    sendSuccess(req, res, formatContent(resRow.rows[0]));
  } catch (err) {
    next(err);
  }
});

contentsRouter.patch(
  '/:contentId',
  validateBody(updateContentSchema),
  async (req, res, next) => {
    try {
      const contentId = assertUuid(req.params.contentId);
      const businessId = req.auth!.businessId!;

      const existingRes = await pool.query<ContentJoinedRow>(
        'SELECT * FROM content_items WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL',
        [contentId, businessId]
      );
      if (existingRes.rowCount === 0) {
        throw AppError.notFound('Materi konten tidak ditemukan.');
      }
      const cur = existingRes.rows[0];
      const patch = req.body as z.infer<typeof updateContentSchema>;

      let nextProductId = cur.product_id;
      let nextSnapshot = cur.product_name_snapshot;
      if (patch.product_id !== undefined) {
        if (patch.product_id === null) {
          nextProductId = null;
          nextSnapshot = null;
        } else {
          const prodRes = await pool.query<{ name: string }>(
            'SELECT name FROM products WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL',
            [patch.product_id, businessId]
          );
          if (prodRes.rowCount === 0) {
            throw new AppError(404, ERROR_CODES.PRODUCT_NOT_FOUND, 'Produk tidak ditemukan.');
          }
          nextProductId = patch.product_id;
          nextSnapshot = prodRes.rows[0].name;
        }
      }

      const updated = await pool.query<ContentJoinedRow>(
        `
        WITH upd AS (
          UPDATE content_items SET
            product_id = $1,
            product_name_snapshot = $2,
            title = $3,
            content_type = $4,
            channel = $5,
            status = $6,
            headline = $7,
            body = $8,
            cta = $9,
            hashtags = $10::jsonb,
            brand_tone = $11,
            updated_at = NOW()
          WHERE id = $12 AND business_id = $13
          RETURNING *
        )
        SELECT upd.*, p.name AS active_product_name, p.deleted_at AS product_deleted_at
        FROM upd
        LEFT JOIN products p ON p.id = upd.product_id
        `,
        [
          nextProductId,
          nextSnapshot,
          patch.title ?? cur.title,
          patch.content_type ?? cur.content_type,
          patch.channel ?? cur.channel,
          patch.status ?? cur.status,
          patch.headline !== undefined ? patch.headline : cur.headline,
          patch.body ?? cur.body,
          patch.cta !== undefined ? patch.cta : cur.cta,
          JSON.stringify(patch.hashtags ?? cur.hashtags ?? []),
          patch.brand_tone !== undefined ? patch.brand_tone : cur.brand_tone,
          contentId,
          businessId,
        ]
      );

      sendSuccess(req, res, formatContent(updated.rows[0]));
    } catch (err) {
      next(err);
    }
  }
);

contentsRouter.post('/:contentId/duplicate', async (req, res, next) => {
  try {
    const contentId = assertUuid(req.params.contentId);
    const businessId = req.auth!.businessId!;

    const origRes = await pool.query<ContentJoinedRow>(
      'SELECT * FROM content_items WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL',
      [contentId, businessId]
    );
    if (origRes.rowCount === 0) {
      throw AppError.notFound('Materi konten tidak ditemukan.');
    }
    const orig = origRes.rows[0];
    const copyTitle = `${orig.title} (Salinan)`.slice(0, 150);

    const inserted = await pool.query<ContentJoinedRow>(
      `
      WITH ins AS (
        INSERT INTO content_items (
          business_id, product_id, product_name_snapshot, generation_id,
          title, content_type, channel, status, headline, body, cta,
          hashtags, brand_tone, source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9, $10, $11::jsonb, $12, $13)
        RETURNING *
      )
      SELECT ins.*, p.name AS active_product_name, p.deleted_at AS product_deleted_at
      FROM ins
      LEFT JOIN products p ON p.id = ins.product_id
      `,
      [
        businessId,
        orig.product_id,
        orig.product_name_snapshot,
        orig.generation_id,
        copyTitle,
        orig.content_type,
        orig.channel,
        orig.headline,
        orig.body,
        orig.cta,
        JSON.stringify(orig.hashtags ?? []),
        orig.brand_tone,
        orig.source,
      ]
    );

    sendSuccess(req, res, formatContent(inserted.rows[0]), 201);
  } catch (err) {
    next(err);
  }
});

contentsRouter.delete('/:contentId', async (req, res, next) => {
  try {
    const contentId = assertUuid(req.params.contentId);
    const businessId = req.auth!.businessId!;

    const deleted = await pool.query<{ id: string }>(
      `
      UPDATE content_items
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL
      RETURNING id
      `,
      [contentId, businessId]
    );
    if (deleted.rowCount === 0) {
      throw AppError.notFound('Materi konten tidak ditemukan.');
    }

    // Lepaskan tautan di marketing_plan_items dengan tetap menjaga content_title_snapshot
    await pool.query(
      'UPDATE marketing_plan_items SET content_item_id = NULL WHERE content_item_id = $1 AND business_id = $2',
      [contentId, businessId]
    );

    sendSuccess(req, res, { deleted: true, id: contentId });
  } catch (err) {
    next(err);
  }
});
