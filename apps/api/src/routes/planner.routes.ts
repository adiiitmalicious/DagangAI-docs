import {
  CONTENT_STATUSES,
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

export const plannerRouter = Router();
plannerRouter.use(authenticate, requireRole('business_owner'), requireBusiness);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(id: string | string[]): string {
  const val = Array.isArray(id) ? id[0] : id;
  if (!val || !UUID_REGEX.test(val)) {
    throw AppError.notFound('Item rencana pemasaran tidak ditemukan.');
  }
  return val;
}

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD.');

const createPlanSchema = z
  .object({
    title: z.string().trim().min(2).max(150),
    campaign_name: z.string().trim().max(120).nullable().optional(),
    channel: z.enum(MARKETING_CHANNELS).default('general'),
    scheduled_date: dateStringSchema.nullable().optional(),
    status: z.enum(CONTENT_STATUSES).default('draft'),
    product_id: z.string().uuid().nullable().optional(),
    content_id: z.string().uuid().nullable().optional(),
    design_id: z.string().uuid().nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((v) => v.status !== 'planned' || Boolean(v.scheduled_date), {
    message: 'Status Terjadwal wajib memiliki tanggal publikasi (BR-09).',
  });

const updatePlanSchema = z.object({
  title: z.string().trim().min(2).max(150).optional(),
  campaign_name: z.string().trim().max(120).nullable().optional(),
  channel: z.enum(MARKETING_CHANNELS).optional(),
  scheduled_date: dateStringSchema.nullable().optional(),
  product_id: z.string().uuid().nullable().optional(),
  content_id: z.string().uuid().nullable().optional(),
  design_id: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const updatePlanStatusSchema = z.object({
  status: z.enum(CONTENT_STATUSES),
  scheduled_date: dateStringSchema.nullable().optional(),
});

const bulkCreateSchema = z.object({
  campaign_name: z.string().trim().max(120).nullable().optional(),
  default_status: z.enum(['draft', 'planned']).default('planned'),
  items: z
    .array(
      z.object({
        title: z.string().trim().min(2).max(150),
        channel: z.enum(MARKETING_CHANNELS).default('general'),
        scheduled_date: dateStringSchema.nullable().optional(),
        product_id: z.string().uuid().nullable().optional(),
        notes: z.string().trim().max(2000).nullable().optional(),
      })
    )
    .min(1)
    .max(10),
});

interface PlanJoinedRow {
  id: string;
  business_id: string;
  product_id: string | null;
  product_name_snapshot: string | null;
  active_product_name: string | null;
  product_deleted_at: Date | null;
  content_item_id: string | null;
  content_title_snapshot: string | null;
  active_content_title: string | null;
  active_content_type: string | null;
  design_asset_id: string | null;
  design_title_snapshot: string | null;
  active_design_title: string | null;
  active_design_ratio: string | null;
  active_design_preview: string | null;
  title: string;
  campaign_name: string | null;
  channel: string;
  scheduled_date: string | null;
  status: string;
  published_at: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

function formatPlanItem(row: PlanJoinedRow) {
  const hasProd = Boolean(row.product_id || row.product_name_snapshot);
  const isProdDeleted =
    Boolean(row.product_deleted_at) ||
    (row.product_id === null && Boolean(row.product_name_snapshot));

  return {
    id: row.id,
    title: row.title,
    campaign_name: row.campaign_name,
    channel: row.channel,
    scheduled_date: row.scheduled_date,
    status: row.status,
    published_at: row.published_at ? row.published_at.toISOString() : null,
    notes: row.notes,
    product: hasProd
      ? {
          id: row.product_id,
          name: row.active_product_name ?? row.product_name_snapshot ?? 'Produk historis',
          is_deleted: isProdDeleted,
        }
      : null,
    linked_content:
      row.content_item_id || row.content_title_snapshot
        ? {
            id: row.content_item_id,
            title: row.active_content_title ?? row.content_title_snapshot,
            content_type: row.active_content_type,
          }
        : null,
    linked_design:
      row.design_asset_id || row.design_title_snapshot
        ? {
            id: row.design_asset_id,
            title: row.active_design_title ?? row.design_title_snapshot,
            aspect_ratio: row.active_design_ratio,
            preview_url: row.active_design_preview,
          }
        : null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

async function resolveSnapshots(
  businessId: string,
  ids: { product_id?: string | null; content_id?: string | null; design_id?: string | null }
) {
  let productName: string | null = null;
  let contentTitle: string | null = null;
  let designTitle: string | null = null;

  if (ids.product_id) {
    const r = await pool.query<{ name: string }>(
      'SELECT name FROM products WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL',
      [ids.product_id, businessId]
    );
    if (r.rowCount === 0) {
      throw new AppError(404, ERROR_CODES.PRODUCT_NOT_FOUND, 'Produk tidak ditemukan.');
    }
    productName = r.rows[0].name;
  }

  if (ids.content_id) {
    const r = await pool.query<{ title: string }>(
      'SELECT title FROM content_items WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL',
      [ids.content_id, businessId]
    );
    if (r.rowCount === 0) {
      throw AppError.notFound('Materi konten tidak ditemukan.');
    }
    contentTitle = r.rows[0].title;
  }

  if (ids.design_id) {
    const r = await pool.query<{ title: string }>(
      'SELECT title FROM design_assets WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL',
      [ids.design_id, businessId]
    );
    if (r.rowCount === 0) {
      throw AppError.notFound('Proyek desain tidak ditemukan.');
    }
    designTitle = r.rows[0].title;
  }

  return { productName, contentTitle, designTitle };
}

const PLAN_SELECT_JOIN = `
  SELECT mp.*,
         mp.scheduled_date::text AS scheduled_date,
         p.name AS active_product_name,
         p.deleted_at AS product_deleted_at,
         ci.title AS active_content_title,
         ci.content_type AS active_content_type,
         da.title AS active_design_title,
         da.aspect_ratio AS active_design_ratio,
         da.preview_url AS active_design_preview
  FROM marketing_plan_items mp
  LEFT JOIN products p ON p.id = mp.product_id
  LEFT JOIN content_items ci ON ci.id = mp.content_item_id AND ci.deleted_at IS NULL
  LEFT JOIN design_assets da ON da.id = mp.design_asset_id AND da.deleted_at IS NULL
`;

plannerRouter.get('/items', async (req, res, next) => {
  try {
    const businessId = req.auth!.businessId!;
    const { page, limit, offset, search } = parsePagination(req);
    const conditions: string[] = ['mp.business_id = $1', 'mp.deleted_at IS NULL'];
    const params: unknown[] = [businessId];
    let idx = 2;

    const from = typeof req.query.from === 'string' ? req.query.from.trim() : '';
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
      conditions.push(`mp.scheduled_date >= $${idx}::DATE`);
      params.push(from);
      idx++;
    }

    const to = typeof req.query.to === 'string' ? req.query.to.trim() : '';
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
      conditions.push(`mp.scheduled_date <= $${idx}::DATE`);
      params.push(to);
      idx++;
    }

    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    if (status && CONTENT_STATUSES.includes(status as (typeof CONTENT_STATUSES)[number])) {
      conditions.push(`mp.status = $${idx}`);
      params.push(status);
      idx++;
    }

    const channel = typeof req.query.channel === 'string' ? req.query.channel.trim() : '';
    if (
      channel &&
      MARKETING_CHANNELS.includes(channel as (typeof MARKETING_CHANNELS)[number])
    ) {
      conditions.push(`mp.channel = $${idx}`);
      params.push(channel);
      idx++;
    }

    if (search) {
      conditions.push(`(mp.title ILIKE $${idx} OR COALESCE(mp.campaign_name, '') ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.join(' AND ');
    const countRes = await pool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM marketing_plan_items mp WHERE ${whereClause}`,
      params
    );
    const totalItems = Number(countRes.rows[0]?.total ?? 0);

    const listRes = await pool.query<PlanJoinedRow>(
      `
      ${PLAN_SELECT_JOIN}
      WHERE ${whereClause}
      ORDER BY mp.scheduled_date ASC NULLS LAST, mp.updated_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
      `,
      [...params, limit, offset]
    );

    sendSuccess(
      req,
      res,
      listRes.rows.map(formatPlanItem),
      200,
      buildPaginationMeta(page, limit, totalItems)
    );
  } catch (err) {
    next(err);
  }
});

plannerRouter.post('/items', validateBody(createPlanSchema), async (req, res, next) => {
  try {
    const businessId = req.auth!.businessId!;
    const body = req.body as z.infer<typeof createPlanSchema>;
    const snaps = await resolveSnapshots(businessId, body);
    const publishedAt = body.status === 'published' ? new Date() : null;

    const inserted = await pool.query<{ id: string }>(
      `
      INSERT INTO marketing_plan_items (
        business_id, product_id, product_name_snapshot,
        content_item_id, content_title_snapshot,
        design_asset_id, design_title_snapshot,
        title, campaign_name, channel, scheduled_date, status, published_at, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::DATE, $12, $13, $14)
      RETURNING id
      `,
      [
        businessId,
        body.product_id ?? null,
        snaps.productName,
        body.content_id ?? null,
        snaps.contentTitle,
        body.design_id ?? null,
        snaps.designTitle,
        body.title,
        body.campaign_name ?? null,
        body.channel,
        body.scheduled_date ?? null,
        body.status,
        publishedAt,
        body.notes ?? null,
      ]
    );

    const full = await pool.query<PlanJoinedRow>(
      `${PLAN_SELECT_JOIN} WHERE mp.id = $1`,
      [inserted.rows[0].id]
    );
    sendSuccess(req, res, formatPlanItem(full.rows[0]), 201);
  } catch (err) {
    next(err);
  }
});

plannerRouter.post(
  '/items/bulk',
  validateBody(bulkCreateSchema),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      const businessId = req.auth!.businessId!;
      const body = req.body as z.infer<typeof bulkCreateSchema>;

      await client.query('BEGIN');
      const createdIds: string[] = [];

      for (const item of body.items) {
        const status =
          body.default_status === 'planned' && item.scheduled_date ? 'planned' : 'draft';
        let productName: string | null = null;
        if (item.product_id) {
          const pr = await client.query<{ name: string }>(
            'SELECT name FROM products WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL',
            [item.product_id, businessId]
          );
          productName = pr.rows[0]?.name ?? null;
        }

        const ins = await client.query<{ id: string }>(
          `
          INSERT INTO marketing_plan_items (
            business_id, product_id, product_name_snapshot,
            title, campaign_name, channel, scheduled_date, status, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7::DATE, $8, $9)
          RETURNING id
          `,
          [
            businessId,
            item.product_id ?? null,
            productName,
            item.title,
            body.campaign_name ?? null,
            item.channel,
            item.scheduled_date ?? null,
            status,
            item.notes ?? null,
          ]
        );
        createdIds.push(ins.rows[0].id);
      }

      await client.query('COMMIT');
      const full = await pool.query<PlanJoinedRow>(
        `${PLAN_SELECT_JOIN} WHERE mp.id = ANY($1::uuid[])`,
        [createdIds]
      );
      sendSuccess(
        req,
        res,
        {
          created_count: createdIds.length,
          items: full.rows.map(formatPlanItem),
        },
        201
      );
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      next(err);
    } finally {
      client.release();
    }
  }
);

plannerRouter.patch(
  '/items/:planItemId',
  validateBody(updatePlanSchema),
  async (req, res, next) => {
    try {
      const planItemId = assertUuid(req.params.planItemId);
      const businessId = req.auth!.businessId!;

      const existingRes = await pool.query<{
        id: string;
        status: string;
        scheduled_date: string | null;
        title: string;
        campaign_name: string | null;
        channel: string;
        notes: string | null;
      }>(
        'SELECT id, status, scheduled_date::text, title, campaign_name, channel, notes FROM marketing_plan_items WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL',
        [planItemId, businessId]
      );
      if (existingRes.rowCount === 0) {
        throw AppError.notFound('Item rencana pemasaran tidak ditemukan.');
      }
      const cur = existingRes.rows[0];
      const patch = req.body as z.infer<typeof updatePlanSchema>;

      const nextDate =
        patch.scheduled_date !== undefined ? patch.scheduled_date : cur.scheduled_date;
      if (cur.status === 'planned' && !nextDate) {
        throw AppError.validation(
          'Status Terjadwal wajib memiliki tanggal publikasi (BR-09).'
        );
      }

      await pool.query(
        `
        UPDATE marketing_plan_items SET
          title = $1,
          campaign_name = $2,
          channel = $3,
          scheduled_date = $4::DATE,
          notes = $5,
          updated_at = NOW()
        WHERE id = $6 AND business_id = $7
        `,
        [
          patch.title ?? cur.title,
          patch.campaign_name !== undefined ? patch.campaign_name : cur.campaign_name,
          patch.channel ?? cur.channel,
          nextDate,
          patch.notes !== undefined ? patch.notes : cur.notes,
          planItemId,
          businessId,
        ]
      );

      const full = await pool.query<PlanJoinedRow>(
        `${PLAN_SELECT_JOIN} WHERE mp.id = $1`,
        [planItemId]
      );
      sendSuccess(req, res, formatPlanItem(full.rows[0]));
    } catch (err) {
      next(err);
    }
  }
);

plannerRouter.patch(
  '/items/:planItemId/status',
  validateBody(updatePlanStatusSchema),
  async (req, res, next) => {
    try {
      const planItemId = assertUuid(req.params.planItemId);
      const businessId = req.auth!.businessId!;
      const body = req.body as z.infer<typeof updatePlanStatusSchema>;

      const curRes = await pool.query<{
        scheduled_date: string | null;
      }>(
        'SELECT scheduled_date::text FROM marketing_plan_items WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL',
        [planItemId, businessId]
      );
      if (curRes.rowCount === 0) {
        throw AppError.notFound('Item rencana pemasaran tidak ditemukan.');
      }

      const nextDate =
        body.scheduled_date !== undefined
          ? body.scheduled_date
          : curRes.rows[0].scheduled_date;

      if (body.status === 'planned' && !nextDate) {
        throw AppError.validation(
          'Status Terjadwal wajib memiliki tanggal target publikasi (BR-09).'
        );
      }

      await pool.query(
        `
        UPDATE marketing_plan_items SET
          status = $1,
          scheduled_date = $2::DATE,
          published_at = CASE WHEN $1 = 'published' THEN NOW() ELSE NULL END,
          updated_at = NOW()
        WHERE id = $3 AND business_id = $4
        `,
        [body.status, nextDate, planItemId, businessId]
      );

      const full = await pool.query<PlanJoinedRow>(
        `${PLAN_SELECT_JOIN} WHERE mp.id = $1`,
        [planItemId]
      );
      sendSuccess(req, res, formatPlanItem(full.rows[0]));
    } catch (err) {
      next(err);
    }
  }
);

plannerRouter.delete('/items/:planItemId', async (req, res, next) => {
  try {
    const planItemId = assertUuid(req.params.planItemId);
    const del = await pool.query<{ id: string }>(
      'UPDATE marketing_plan_items SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL RETURNING id',
      [planItemId, req.auth!.businessId]
    );
    if (del.rowCount === 0) {
      throw AppError.notFound('Item rencana pemasaran tidak ditemukan.');
    }
    sendSuccess(req, res, { deleted: true, id: planItemId });
  } catch (err) {
    next(err);
  }
});
