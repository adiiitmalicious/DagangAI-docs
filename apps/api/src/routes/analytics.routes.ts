import { ERROR_CODES } from '@dagangai/shared';
import { Router } from 'express';
import { getUserQuotaSnapshot } from '../ai/quotaService.js';
import { pool } from '../db/pool.js';
import {
  calculateBusinessCompleteness,
  type BusinessRow,
} from '../lib/businessCompleteness.js';
import { AppError } from '../lib/errors.js';
import { sendSuccess } from '../lib/response.js';
import { authenticate, requireBusiness, requireRole } from '../middleware/auth.js';

export const analyticsRouter = Router();
analyticsRouter.use(authenticate, requireRole('business_owner'), requireBusiness);

const DISCLAIMER_TEXT =
  'Ringkasan ini merupakan catatan aktivitas internal Anda di DagangAI, bukan metrik jangkauan media sosial, interaksi audiens, atau hasil penjualan aktual.';

analyticsRouter.get('/summary', async (req, res, next) => {
  try {
    const businessId = req.auth!.businessId!;
    const userId = req.auth!.userId;
    const rawPeriod = typeof req.query.period === 'string' ? req.query.period : '30d';
    const period: '7d' | '30d' | 'all' =
      rawPeriod === '7d' || rawPeriod === 'all' ? rawPeriod : '30d';

    const intervalClause =
      period === '7d'
        ? "AND created_at >= NOW() - INTERVAL '7 days'"
        : period === '30d'
          ? "AND created_at >= NOW() - INTERVAL '30 days'"
          : '';

    const [
      bizRes,
      genCountRes,
      contentCountRes,
      designCountRes,
      plannerBreakdownRes,
      mostPromotedRes,
      unpromotedRes,
      upcomingRes,
      recentRes,
      quotaRes,
    ] = await Promise.all([
      pool.query<BusinessRow>('SELECT * FROM businesses WHERE id = $1', [businessId]),
      pool.query<{ cnt: string }>(
        `SELECT COUNT(*)::text AS cnt FROM ai_generations WHERE business_id = $1 ${intervalClause}`,
        [businessId]
      ),
      pool.query<{ cnt: string }>(
        `SELECT COUNT(*)::text AS cnt FROM content_items WHERE business_id = $1 AND deleted_at IS NULL ${intervalClause}`,
        [businessId]
      ),
      pool.query<{ cnt: string }>(
        `SELECT COUNT(*)::text AS cnt FROM design_assets WHERE business_id = $1 AND deleted_at IS NULL ${intervalClause}`,
        [businessId]
      ),
      pool.query<{ status: string; cnt: string }>(
        `SELECT status, COUNT(*)::text AS cnt FROM marketing_plan_items WHERE business_id = $1 AND deleted_at IS NULL GROUP BY status`,
        [businessId]
      ),
      pool.query<{ product_id: string; name: string; materials_count: string }>(
        `
        SELECT p.id AS product_id, p.name,
               (
                 (SELECT COUNT(*) FROM content_items ci WHERE ci.product_id = p.id AND ci.deleted_at IS NULL) +
                 (SELECT COUNT(*) FROM design_assets da WHERE da.product_id = p.id AND da.deleted_at IS NULL)
               )::text AS materials_count
        FROM products p
        WHERE p.business_id = $1 AND p.deleted_at IS NULL
        ORDER BY (
          (SELECT COUNT(*) FROM content_items ci WHERE ci.product_id = p.id AND ci.deleted_at IS NULL) +
          (SELECT COUNT(*) FROM design_assets da WHERE da.product_id = p.id AND da.deleted_at IS NULL)
        ) DESC, p.created_at DESC
        LIMIT 5
        `,
        [businessId]
      ),
      pool.query<{ product_id: string; name: string }>(
        `
        SELECT p.id AS product_id, p.name
        FROM products p
        WHERE p.business_id = $1
          AND p.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM content_items ci WHERE ci.product_id = p.id AND ci.deleted_at IS NULL
          )
          AND NOT EXISTS (
            SELECT 1 FROM design_assets da WHERE da.product_id = p.id AND da.deleted_at IS NULL
          )
        ORDER BY p.created_at DESC
        LIMIT 5
        `,
        [businessId]
      ),
      pool.query<{
        id: string;
        title: string;
        channel: string;
        scheduled_date: string;
        status: string;
      }>(
        `
        SELECT id, title, channel, scheduled_date::text, status
        FROM marketing_plan_items
        WHERE business_id = $1
          AND deleted_at IS NULL
          AND status = 'planned'
          AND scheduled_date >= (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE
        ORDER BY scheduled_date ASC
        LIMIT 5
        `,
        [businessId]
      ),
      pool.query<{
        type: string;
        entity_id: string;
        title: string;
        occurred_at: Date;
      }>(
        `
        SELECT * FROM (
          SELECT 'content_saved' AS type, id AS entity_id, title, created_at AS occurred_at
          FROM content_items
          WHERE business_id = $1 AND deleted_at IS NULL
          UNION ALL
          SELECT 'design_created' AS type, id AS entity_id, title, created_at AS occurred_at
          FROM design_assets
          WHERE business_id = $1 AND deleted_at IS NULL
        ) t
        ORDER BY occurred_at DESC
        LIMIT 5
        `,
        [businessId]
      ),
      getUserQuotaSnapshot(userId),
    ]);

    if (bizRes.rowCount === 0) {
      throw new AppError(404, ERROR_CODES.BUSINESS_NOT_FOUND, 'Profil bisnis tidak ditemukan.');
    }

    const breakdown = { draft: 0, planned: 0, published: 0 };
    for (const row of plannerBreakdownRes.rows) {
      if (row.status === 'draft' || row.status === 'planned' || row.status === 'published') {
        breakdown[row.status] = Number(row.cnt);
      }
    }

    sendSuccess(req, res, {
      period,
      disclaimer: DISCLAIMER_TEXT,
      metrics: {
        ai_generations_count: Number(genCountRes.rows[0]?.cnt ?? 0),
        contents_saved_count: Number(contentCountRes.rows[0]?.cnt ?? 0),
        designs_created_count: Number(designCountRes.rows[0]?.cnt ?? 0),
        planner_status_breakdown: breakdown,
      },
      product_coverage: {
        most_promoted: mostPromotedRes.rows
          .filter((r) => Number(r.materials_count) > 0)
          .map((r) => ({
            product_id: r.product_id,
            name: r.name,
            materials_count: Number(r.materials_count),
          })),
        unpromoted_products: unpromotedRes.rows.map((r) => ({
          product_id: r.product_id,
          name: r.name,
          materials_count: 0,
        })),
      },
      upcoming_plans: upcomingRes.rows,
      recent_activities: recentRes.rows.map((r) => ({
        type: r.type,
        entity_id: r.entity_id,
        title: r.title,
        occurred_at: r.occurred_at.toISOString(),
      })),
      business_completeness_score: calculateBusinessCompleteness(bizRes.rows[0]).score,
      ai_quota: {
        daily_credits_limit: quotaRes.snapshot.daily_credits_limit,
        daily_credits_used: quotaRes.snapshot.daily_credits_used,
        daily_credits_remaining: quotaRes.snapshot.daily_credits_remaining,
        reset_at: quotaRes.snapshot.reset_at,
      },
    });
  } catch (err) {
    next(err);
  }
});
