import crypto from 'node:crypto';
import { ERROR_CODES, type AiFeatureType } from '@dagangai/shared';
import type { Request, Response } from 'express';
import { pool } from '../db/pool.js';
import { AppError } from '../lib/errors.js';

export interface SystemAiConfig {
  daily_credits_limit: number;
  rate_limit_per_minute: number;
  credit_costs: Record<AiFeatureType, number>;
  circuit_breaker_open: boolean;
  circuit_breaker_message: string | null;
}

export interface QuotaSnapshot {
  daily_credits_limit: number;
  daily_credits_used: number;
  daily_credits_remaining: number;
  rate_limit_per_minute: number;
  rate_limit_remaining: number;
  reset_at: string;
}

export function getNextWibMidnightIso(): string {
  const now = new Date();
  const wibOffsetMs = 7 * 60 * 60 * 1000;
  const wibNow = new Date(now.getTime() + wibOffsetMs);
  const nextMidnightWib = Date.UTC(
    wibNow.getUTCFullYear(),
    wibNow.getUTCMonth(),
    wibNow.getUTCDate() + 1,
    0,
    0,
    0
  );
  return new Date(nextMidnightWib - wibOffsetMs).toISOString();
}

export function attachQuotaHeaders(res: Response, quota: QuotaSnapshot): void {
  const resetEpoch = Math.floor(Date.now() / 1000) + 60;
  res.setHeader('X-RateLimit-Limit', String(quota.rate_limit_per_minute));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, quota.rate_limit_remaining)));
  res.setHeader('X-RateLimit-Reset', String(resetEpoch));
  res.setHeader('X-AI-Quota-Limit', String(quota.daily_credits_limit));
  res.setHeader('X-AI-Quota-Remaining', String(Math.max(0, quota.daily_credits_remaining)));
  res.setHeader('X-AI-Quota-Reset-At', quota.reset_at);
}

export async function getSystemAiConfig(): Promise<SystemAiConfig> {
  const res = await pool.query<SystemAiConfig>(
    'SELECT daily_credits_limit, rate_limit_per_minute, credit_costs, circuit_breaker_open, circuit_breaker_message FROM system_ai_configs WHERE id = 1'
  );
  if (res.rowCount === 0) {
    return {
      daily_credits_limit: 30,
      rate_limit_per_minute: 5,
      credit_costs: {
        content_generate: 1,
        content_refine: 1,
        design_copy_assist: 1,
        planner_ideas: 2,
      },
      circuit_breaker_open: false,
      circuit_breaker_message: null,
    };
  }
  return res.rows[0];
}

export async function getUserQuotaSnapshot(userId: string): Promise<{
  config: SystemAiConfig;
  snapshot: QuotaSnapshot;
}> {
  const config = await getSystemAiConfig();

  const quotaRes = await pool.query<{ credits_used: number }>(
    `
    SELECT credits_used
    FROM user_daily_ai_quotas
    WHERE user_id = $1
      AND usage_date_wib = (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE
    `,
    [userId]
  );
  const used = quotaRes.rows[0]?.credits_used ?? 0;

  const rateRes = await pool.query<{ cnt: string }>(
    `
    SELECT COUNT(*)::text AS cnt
    FROM ai_usage_logs
    WHERE user_id = $1
      AND created_at >= NOW() - INTERVAL '1 minute'
    `,
    [userId]
  );
  const recentCount = Number(rateRes.rows[0]?.cnt ?? 0);

  return {
    config,
    snapshot: {
      daily_credits_limit: config.daily_credits_limit,
      daily_credits_used: used,
      daily_credits_remaining: Math.max(0, config.daily_credits_limit - used),
      rate_limit_per_minute: config.rate_limit_per_minute,
      rate_limit_remaining: Math.max(0, config.rate_limit_per_minute - recentCount),
      reset_at: getNextWibMidnightIso(),
    },
  };
}

export async function logFailedAiUsage(params: {
  userId: string;
  businessId: string | null;
  feature: AiFeatureType;
  status: 'failed' | 'rate_limited' | 'quota_exceeded' | 'policy_blocked' | 'circuit_open';
  errorCode: string;
  latencyMs?: number;
}): Promise<void> {
  await pool.query(
    `
    INSERT INTO ai_usage_logs (
      user_id, business_id, feature, status, credits_charged, error_code, latency_ms, usage_date_wib
    ) VALUES ($1, $2, $3, $4, 0, $5, $6, (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE)
    `,
    [
      params.userId,
      params.businessId,
      params.feature,
      params.status,
      params.errorCode,
      params.latencyMs ?? null,
    ]
  );
}

/**
 * Pola Transaksi 2-Tahap Non-Blocking LLM Call (database-design.md §7 & BR-07):
 * 1. Cek Idempotency-Key (TTL 5 menit)
 * 2. Cek Circuit Breaker, Rate Limit, dan Sisa Kuota WIB
 * 3. Panggil LLM di luar transaksi DB
 * 4. Jika sukses, simpan ai_generations + potong kuota + log + idempotency dalam 1 transaksi DB
 */
export async function executeWithAiQuota<TResult extends Record<string, unknown>>(params: {
  req: Request;
  res: Response;
  userId: string;
  businessId: string;
  feature: AiFeatureType;
  endpoint: string;
  requestPayload: unknown;
  runLlm: () => Promise<{
    result: TResult;
    generationInsert: {
      parentGenerationId?: string | null;
      productId?: string | null;
      contentType?: string | null;
      channel?: string | null;
      promoGoal?: string | null;
      inputSnapshot: unknown;
      contextSummary: unknown;
      outputPayload: unknown;
      warnings: unknown;
    };
    providerName: string;
    modelName: string;
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
    latencyMs: number;
  }>;
}): Promise<{ statusCode: number; data: TResult }> {
  const { req, res, userId, businessId, feature, endpoint, requestPayload } = params;
  const idempotencyKey = req.header('idempotency-key')?.trim().slice(0, 128) || null;
  const requestHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(requestPayload ?? {}))
    .digest('hex');

  // 1. Cek Idempotency-Key
  if (idempotencyKey) {
    const cached = await pool.query<{
      request_hash: string;
      response_status: number;
      response_body: TResult;
    }>(
      `
      SELECT request_hash, response_status, response_body
      FROM ai_idempotency_keys
      WHERE user_id = $1 AND idempotency_key = $2 AND expires_at > NOW()
      `,
      [userId, idempotencyKey]
    );
    if (cached.rowCount && cached.rowCount > 0) {
      const row = cached.rows[0];
      if (row.request_hash !== requestHash) {
        throw AppError.validation(
          'Idempotency-Key sudah digunakan dengan isi permintaan yang berbeda.'
        );
      }
      const { snapshot } = await getUserQuotaSnapshot(userId);
      attachQuotaHeaders(res, snapshot);
      return { statusCode: row.response_status, data: row.response_body };
    }
  }

  // 2. Cek Circuit Breaker, Rate Limit, Kuota Harian WIB
  const { config, snapshot } = await getUserQuotaSnapshot(userId);
  const cost = config.credit_costs[feature] ?? 1;
  attachQuotaHeaders(res, snapshot);

  if (config.circuit_breaker_open) {
    await logFailedAiUsage({
      userId,
      businessId,
      feature,
      status: 'circuit_open',
      errorCode: ERROR_CODES.AI_SERVICE_CIRCUIT_OPEN,
    });
    throw new AppError(
      503,
      ERROR_CODES.AI_SERVICE_CIRCUIT_OPEN,
      config.circuit_breaker_message ||
        'Layanan AI sedang dalam pemeliharaan sementara. Fitur non-AI tetap dapat digunakan.'
    );
  }

  if (snapshot.rate_limit_remaining <= 0) {
    await logFailedAiUsage({
      userId,
      businessId,
      feature,
      status: 'rate_limited',
      errorCode: ERROR_CODES.RATE_LIMITED,
    });
    res.setHeader('Retry-After', '60');
    throw new AppError(
      429,
      ERROR_CODES.RATE_LIMITED,
      'Permintaan AI terlalu cepat. Silakan tunggu sebentar sebelum mencoba lagi.'
    );
  }

  if (snapshot.daily_credits_remaining < cost) {
    await logFailedAiUsage({
      userId,
      businessId,
      feature,
      status: 'quota_exceeded',
      errorCode: ERROR_CODES.AI_DAILY_QUOTA_EXCEEDED,
    });
    throw new AppError(
      429,
      ERROR_CODES.AI_DAILY_QUOTA_EXCEEDED,
      'Kuota AI harian Anda sudah habis dan akan diisi ulang pukul 00.00 WIB. Anda tetap bisa mengedit materi, memakai template desain manual, dan mengatur jadwal.'
    );
  }

  // 3. Panggil LLM di luar transaksi DB (BR-07)
  let llmOutput;
  try {
    llmOutput = await params.runLlm();
  } catch (err) {
    const appErr = err instanceof AppError ? err : null;
    await logFailedAiUsage({
      userId,
      businessId,
      feature,
      status:
        appErr?.code === ERROR_CODES.CONTENT_POLICY_VIOLATION
          ? 'policy_blocked'
          : 'failed',
      errorCode: appErr?.code ?? ERROR_CODES.AI_PROVIDER_ERROR,
    }).catch(() => {});
    throw err;
  }

  // 4. DB Transaction Tunggal: potong kuota + simpan generasi + log + idempotency
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const genRes = await client.query<{ id: string }>(
      `
      INSERT INTO ai_generations (
        business_id, user_id, parent_generation_id, feature, product_id,
        content_type, channel, promo_goal, input_snapshot, context_summary,
        output_payload, warnings
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb)
      RETURNING id
      `,
      [
        businessId,
        userId,
        llmOutput.generationInsert.parentGenerationId ?? null,
        feature,
        llmOutput.generationInsert.productId ?? null,
        llmOutput.generationInsert.contentType ?? null,
        llmOutput.generationInsert.channel ?? null,
        llmOutput.generationInsert.promoGoal ?? null,
        JSON.stringify(llmOutput.generationInsert.inputSnapshot),
        JSON.stringify(llmOutput.generationInsert.contextSummary),
        JSON.stringify(llmOutput.generationInsert.outputPayload),
        JSON.stringify(llmOutput.generationInsert.warnings),
      ]
    );
    const generationId = genRes.rows[0].id;

    const quotaUpdateRes = await client.query<{ credits_used: number }>(
      `
      INSERT INTO user_daily_ai_quotas (user_id, usage_date_wib, credits_used)
      VALUES ($1, (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE, $2)
      ON CONFLICT (user_id, usage_date_wib)
      DO UPDATE SET
        credits_used = user_daily_ai_quotas.credits_used + EXCLUDED.credits_used,
        updated_at = NOW()
      RETURNING credits_used
      `,
      [userId, cost]
    );
    const newUsed = quotaUpdateRes.rows[0].credits_used;
    const newRemaining = Math.max(0, config.daily_credits_limit - newUsed);

    await client.query(
      `
      INSERT INTO ai_usage_logs (
        user_id, business_id, generation_id, feature, status, credits_charged,
        provider_name, model_name, estimated_input_tokens, estimated_output_tokens,
        latency_ms, usage_date_wib
      ) VALUES ($1, $2, $3, $4, 'success', $5, $6, $7, $8, $9, $10, (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE)
      `,
      [
        userId,
        businessId,
        generationId,
        feature,
        cost,
        llmOutput.providerName,
        llmOutput.modelName,
        llmOutput.estimatedInputTokens,
        llmOutput.estimatedOutputTokens,
        llmOutput.latencyMs,
      ]
    );

    const responseData = {
      ...llmOutput.result,
      generation_id: generationId,
      quota: {
        credits_charged: cost,
        daily_credits_remaining: newRemaining,
        reset_at: snapshot.reset_at,
      },
    } as TResult;

    if (idempotencyKey) {
      await client.query(
        `
        INSERT INTO ai_idempotency_keys (
          user_id, idempotency_key, endpoint, request_hash, response_status, response_body, expires_at
        ) VALUES ($1, $2, $3, $4, 200, $5::jsonb, NOW() + INTERVAL '5 minutes')
        ON CONFLICT (user_id, idempotency_key) DO NOTHING
        `,
        [userId, idempotencyKey, endpoint, requestHash, JSON.stringify(responseData)]
      );
    }

    await client.query('COMMIT');

    attachQuotaHeaders(res, {
      ...snapshot,
      daily_credits_used: newUsed,
      daily_credits_remaining: newRemaining,
      rate_limit_remaining: Math.max(0, snapshot.rate_limit_remaining - 1),
    });

    return { statusCode: 200, data: responseData };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
