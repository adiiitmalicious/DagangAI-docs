import {
  AI_FEATURE_TYPES,
  AI_USAGE_STATUSES,
  ERROR_CODES,
} from '@dagangai/shared';
import { Router } from 'express';
import { z } from 'zod';
import { getSystemAiConfig } from '../ai/quotaService.js';
import { pool } from '../db/pool.js';
import { AppError } from '../lib/errors.js';
import { buildPaginationMeta, parsePagination } from '../lib/pagination.js';
import { sendSuccess } from '../lib/response.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

export const adminRouter = Router();
adminRouter.use(authenticate, requireRole('platform_admin'));

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const updateAiConfigSchema = z.object({
  daily_credits_limit: z.number().int().min(0).max(1000).optional(),
  rate_limit_per_minute: z.number().int().min(1).max(100).optional(),
  circuit_breaker_open: z.boolean().optional(),
  circuit_breaker_message: z.string().trim().max(300).nullable().optional(),
});

const updateUserStatusSchema = z
  .object({
    status: z.enum(['active', 'suspended']),
    reason: z.string().trim().max(300).nullable().optional(),
  })
  .refine(
    (v) => v.status !== 'suspended' || (v.reason && v.reason.trim().length >= 5),
    {
      message: 'Alasan penangguhan wajib diisi minimal 5 karakter saat status suspended.',
    }
  );

adminRouter.get('/overview', async (req, res, next) => {
  try {
    const rawDate =
      typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
        ? req.query.date
        : null;

    const targetDateSql = rawDate
      ? '$1::DATE'
      : "(NOW() AT TIME ZONE 'Asia/Jakarta')::DATE";
    const dateParams = rawDate ? [rawDate] : [];

    const [usersRes, activeTodayRes, logsAggRes, factualRes, config, resolvedDateRes] =
      await Promise.all([
        pool.query<{ total: string; suspended: string }>(
          `
          SELECT COUNT(*)::text AS total,
                 COUNT(*) FILTER (WHERE status = 'suspended')::text AS suspended
          FROM users
          `
        ),
        pool.query<{ cnt: string }>(
          `
          SELECT COUNT(DISTINCT user_id)::text AS cnt
          FROM ai_usage_logs
          WHERE usage_date_wib = ${targetDateSql}
          `,
          dateParams
        ),
        pool.query<{
          total_requests: string;
          success_count: string;
          failed_count: string;
          rate_limited_count: string;
          avg_latency: string | null;
          total_tokens: string;
        }>(
          `
          SELECT COUNT(*)::text AS total_requests,
                 COUNT(*) FILTER (WHERE status = 'success')::text AS success_count,
                 COUNT(*) FILTER (WHERE status = 'failed')::text AS failed_count,
                 COUNT(*) FILTER (WHERE status = 'rate_limited')::text AS rate_limited_count,
                 ROUND(AVG(latency_ms))::text AS avg_latency,
                 COALESCE(SUM(COALESCE(estimated_input_tokens, 0) + COALESCE(estimated_output_tokens, 0)), 0)::text AS total_tokens
          FROM ai_usage_logs
          WHERE usage_date_wib = ${targetDateSql}
          `,
          dateParams
        ),
        pool.query<{ cnt: string }>(
          `
          SELECT COUNT(*)::text AS cnt
          FROM ai_feedbacks
          WHERE is_factual_issue = TRUE
            AND (created_at AT TIME ZONE 'Asia/Jakarta')::DATE = ${targetDateSql}
          `,
          dateParams
        ),
        getSystemAiConfig(),
        pool.query<{ d: string }>(`SELECT (${targetDateSql})::text AS d`, dateParams),
      ]);

    const totalReq = Number(logsAggRes.rows[0]?.total_requests ?? 0);
    const successCnt = Number(logsAggRes.rows[0]?.success_count ?? 0);
    const successRate =
      totalReq > 0 ? Math.round((successCnt / totalReq) * 1000) / 10 : 100;

    sendSuccess(req, res, {
      date: resolvedDateRes.rows[0].d,
      users: {
        total_registered: Number(usersRes.rows[0]?.total ?? 0),
        active_today: Number(activeTodayRes.rows[0]?.cnt ?? 0),
        suspended_count: Number(usersRes.rows[0]?.suspended ?? 0),
      },
      ai_operations: {
        total_requests_today: totalReq,
        success_count: successCnt,
        failed_count: Number(logsAggRes.rows[0]?.failed_count ?? 0),
        rate_limited_count: Number(logsAggRes.rows[0]?.rate_limited_count ?? 0),
        success_rate_percent: successRate,
        avg_latency_ms: Number(logsAggRes.rows[0]?.avg_latency ?? 0),
        estimated_tokens_today: Number(logsAggRes.rows[0]?.total_tokens ?? 0),
        factual_issue_reports_today: Number(factualRes.rows[0]?.cnt ?? 0),
        circuit_breaker_open: config.circuit_breaker_open,
      },
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/ai-logs', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let idx = 1;

    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    if (
      status &&
      AI_USAGE_STATUSES.includes(status as (typeof AI_USAGE_STATUSES)[number])
    ) {
      conditions.push(`status = $${idx}`);
      params.push(status);
      idx++;
    }

    const feature = typeof req.query.feature === 'string' ? req.query.feature.trim() : '';
    if (
      feature &&
      AI_FEATURE_TYPES.includes(feature as (typeof AI_FEATURE_TYPES)[number])
    ) {
      conditions.push(`feature = $${idx}`);
      params.push(feature);
      idx++;
    }

    const userId = typeof req.query.user_id === 'string' ? req.query.user_id.trim() : '';
    if (userId && UUID_REGEX.test(userId)) {
      conditions.push(`user_id = $${idx}`);
      params.push(userId);
      idx++;
    }

    const from = typeof req.query.from === 'string' ? req.query.from.trim() : '';
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
      conditions.push(`usage_date_wib >= $${idx}::DATE`);
      params.push(from);
      idx++;
    }

    const to = typeof req.query.to === 'string' ? req.query.to.trim() : '';
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
      conditions.push(`usage_date_wib <= $${idx}::DATE`);
      params.push(to);
      idx++;
    }

    const whereClause = conditions.join(' AND ');
    const countRes = await pool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM ai_usage_logs WHERE ${whereClause}`,
      params
    );
    const totalItems = Number(countRes.rows[0]?.total ?? 0);

    const logsRes = await pool.query<{
      id: string;
      user_id: string;
      feature: string;
      status: string;
      credits_charged: number;
      estimated_input_tokens: number | null;
      estimated_output_tokens: number | null;
      latency_ms: number | null;
      error_code: string | null;
      created_at: Date;
    }>(
      `
      SELECT id, user_id, feature, status, credits_charged,
             estimated_input_tokens, estimated_output_tokens, latency_ms, error_code, created_at
      FROM ai_usage_logs
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
      `,
      [...params, limit, offset]
    );

    sendSuccess(
      req,
      res,
      logsRes.rows.map((r) => ({
        ...r,
        created_at: r.created_at.toISOString(),
      })),
      200,
      buildPaginationMeta(page, limit, totalItems)
    );
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/ai-config', async (req, res, next) => {
  try {
    const resRow = await pool.query(
      'SELECT daily_credits_limit, rate_limit_per_minute, credit_costs, circuit_breaker_open, circuit_breaker_message, updated_by, updated_at FROM system_ai_configs WHERE id = 1'
    );
    sendSuccess(req, res, resRow.rows[0]);
  } catch (err) {
    next(err);
  }
});

adminRouter.patch(
  '/ai-config',
  validateBody(updateAiConfigSchema),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      const patch = req.body as z.infer<typeof updateAiConfigSchema>;
      await client.query('BEGIN');

      const curRes = await client.query<{
        daily_credits_limit: number;
        rate_limit_per_minute: number;
        circuit_breaker_open: boolean;
        circuit_breaker_message: string | null;
      }>(
        'SELECT daily_credits_limit, rate_limit_per_minute, circuit_breaker_open, circuit_breaker_message FROM system_ai_configs WHERE id = 1 FOR UPDATE'
      );
      const cur = curRes.rows[0];

      const updated = await client.query(
        `
        UPDATE system_ai_configs SET
          daily_credits_limit = $1,
          rate_limit_per_minute = $2,
          circuit_breaker_open = $3,
          circuit_breaker_message = $4,
          updated_by = $5,
          updated_at = NOW()
        WHERE id = 1
        RETURNING daily_credits_limit, rate_limit_per_minute, credit_costs,
                  circuit_breaker_open, circuit_breaker_message, updated_by, updated_at
        `,
        [
          patch.daily_credits_limit ?? cur.daily_credits_limit,
          patch.rate_limit_per_minute ?? cur.rate_limit_per_minute,
          patch.circuit_breaker_open ?? cur.circuit_breaker_open,
          patch.circuit_breaker_message !== undefined
            ? patch.circuit_breaker_message
            : cur.circuit_breaker_message,
          req.auth!.userId,
        ]
      );

      await client.query(
        `
        INSERT INTO admin_audit_logs (admin_user_id, action, target_type, target_id, changes)
        VALUES ($1, 'UPDATE_AI_CONFIG', 'system_ai_configs', '1', $2::jsonb)
        `,
        [req.auth!.userId, JSON.stringify(patch)]
      );

      await client.query('COMMIT');
      sendSuccess(req, res, updated.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      next(err);
    } finally {
      client.release();
    }
  }
);

adminRouter.get('/users', async (req, res, next) => {
  try {
    const { page, limit, offset, search } = parsePagination(req);
    const conditions: string[] = ["role = 'business_owner'"];
    const params: unknown[] = [];
    let idx = 1;

    if (search) {
      conditions.push(`(full_name ILIKE $${idx} OR email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.join(' AND ');
    const countRes = await pool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM users WHERE ${whereClause}`,
      params
    );
    const totalItems = Number(countRes.rows[0]?.total ?? 0);

    const listRes = await pool.query<{
      id: string;
      full_name: string;
      email: string;
      status: string;
      suspended_reason: string | null;
      created_at: Date;
    }>(
      `
      SELECT id, full_name, email, status, suspended_reason, created_at
      FROM users
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
      `,
      [...params, limit, offset]
    );

    sendSuccess(
      req,
      res,
      listRes.rows.map((u) => ({ ...u, created_at: u.created_at.toISOString() })),
      200,
      buildPaginationMeta(page, limit, totalItems)
    );
  } catch (err) {
    next(err);
  }
});

adminRouter.patch(
  '/users/:userId/status',
  validateBody(updateUserStatusSchema),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      const rawUserId = req.params.userId;
      const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
      if (!userId || !UUID_REGEX.test(userId)) {
        throw AppError.notFound('Pengguna tidak ditemukan.');
      }
      if (userId === req.auth!.userId) {
        throw AppError.validation('Admin tidak dapat menangguhkan akunnya sendiri.');
      }

      const body = req.body as z.infer<typeof updateUserStatusSchema>;
      await client.query('BEGIN');

      const updated = await client.query<{
        id: string;
        status: string;
        updated_at: Date;
      }>(
        `
        UPDATE users SET
          status = $1,
          suspended_reason = $2,
          suspended_at = CASE WHEN $1 = 'suspended' THEN NOW() ELSE NULL END,
          updated_at = NOW()
        WHERE id = $3 AND role = 'business_owner'
        RETURNING id, status, updated_at
        `,
        [
          body.status,
          body.status === 'suspended' ? body.reason!.trim() : null,
          userId,
        ]
      );

      if (updated.rowCount === 0) {
        await client.query('ROLLBACK');
        throw new AppError(404, ERROR_CODES.RESOURCE_NOT_FOUND, 'Pengguna tidak ditemukan.');
      }

      if (body.status === 'suspended') {
        await client.query(
          'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
          [userId]
        );
      }

      await client.query(
        `
        INSERT INTO admin_audit_logs (admin_user_id, action, target_type, target_id, reason, changes)
        VALUES ($1, $2, 'user', $3, $4, $5::jsonb)
        `,
        [
          req.auth!.userId,
          body.status === 'suspended' ? 'SUSPEND_USER' : 'ACTIVATE_USER',
          userId,
          body.reason ?? null,
          JSON.stringify({ status: body.status }),
        ]
      );

      await client.query('COMMIT');
      sendSuccess(req, res, {
        user_id: updated.rows[0].id,
        status: updated.rows[0].status,
        updated_at: updated.rows[0].updated_at.toISOString(),
      });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      next(err);
    } finally {
      client.release();
    }
  }
);
