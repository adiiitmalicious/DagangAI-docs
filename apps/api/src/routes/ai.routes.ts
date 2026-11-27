import {
  BRAND_TONES,
  CONTENT_TYPES,
  ERROR_CODES,
  LANGUAGE_PREFERENCES,
  MARKETING_CHANNELS,
  PROMO_GOALS,
  REFINE_PRESETS,
  type BrandTone,
  type LanguagePreference,
} from '@dagangai/shared';
import { Router } from 'express';
import { z } from 'zod';
import {
  buildGeneratePrompts,
  buildRefinePrompts,
  type ProductContextRow,
} from '../ai/contextBuilder.js';
import {
  assertSafeUserInput,
  countTextStats,
  detectPlaceholders,
  findViolatedAvoidedWords,
  HUMAN_REVIEW_NOTICE,
} from '../ai/guardrails.js';
import { getLlmProvider } from '../ai/provider.js';
import {
  attachQuotaHeaders,
  executeWithAiQuota,
  getUserQuotaSnapshot,
} from '../ai/quotaService.js';
import { pool } from '../db/pool.js';
import type { BusinessRow } from '../lib/businessCompleteness.js';
import { AppError } from '../lib/errors.js';
import { sendSuccess } from '../lib/response.js';
import { authenticate, requireBusiness, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

export const aiRouter = Router();
aiRouter.use(authenticate, requireRole('business_owner'));

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const generateSchema = z.object({
  content_type: z.enum(CONTENT_TYPES),
  product_id: z.string().uuid().nullable().optional(),
  channel: z.enum(MARKETING_CHANNELS),
  promo_goal: z.enum(PROMO_GOALS),
  brand_tone: z.enum(BRAND_TONES).optional(),
  language: z.enum(LANGUAGE_PREFERENCES).optional(),
  variants_count: z.number().int().min(2).max(3).default(3),
  additional_instructions: z.string().trim().max(300).nullable().optional(),
  temporary_context: z.string().trim().max(300).nullable().optional(),
});

const refineSchema = z
  .object({
    generation_id: z.string().uuid().nullable().optional(),
    product_id: z.string().uuid().nullable().optional(),
    content_type: z.enum(CONTENT_TYPES).default('social_caption'),
    channel: z.enum(MARKETING_CHANNELS).default('general'),
    source_text: z.string().trim().min(10, 'Teks awal minimal 10 karakter.').max(3000),
    refine_preset: z.enum(REFINE_PRESETS).optional(),
    custom_instruction: z.string().trim().max(200).optional(),
  })
  .refine((v) => Boolean(v.refine_preset) || Boolean(v.custom_instruction?.trim()), {
    message: 'Pilih preset atau tulis instruksi revisi singkat.',
  });

const feedbackSchema = z
  .object({
    generation_id: z.string().uuid().nullable().optional(),
    content_id: z.string().uuid().nullable().optional(),
    rating: z.number().int().min(1).max(5).nullable().optional(),
    is_helpful: z.boolean().nullable().optional(),
    is_factual_issue: z.boolean().default(false),
    issue_categories: z
      .array(
        z.enum([
          'fabricated_claim',
          'wrong_price',
          'wrong_tone',
          'generic_output',
          'other',
        ])
      )
      .optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .refine((v) => Boolean(v.generation_id) || Boolean(v.content_id), {
    message: 'Minimal salah satu generation_id atau content_id wajib diisi.',
  });

aiRouter.get('/quota', async (req, res, next) => {
  try {
    const { config, snapshot } = await getUserQuotaSnapshot(req.auth!.userId);
    attachQuotaHeaders(res, snapshot);
    sendSuccess(req, res, {
      daily_credits_limit: snapshot.daily_credits_limit,
      daily_credits_used: snapshot.daily_credits_used,
      daily_credits_remaining: snapshot.daily_credits_remaining,
      credit_costs: config.credit_costs,
      rate_limit_per_minute: config.rate_limit_per_minute,
      reset_at: snapshot.reset_at,
      reset_timezone: 'Asia/Jakarta (WIB)',
      service_available: !config.circuit_breaker_open,
    });
  } catch (err) {
    next(err);
  }
});

aiRouter.post(
  '/content/generate',
  requireBusiness,
  validateBody(generateSchema),
  async (req, res, next) => {
    try {
      const userId = req.auth!.userId;
      const businessId = req.auth!.businessId!;
      const body = req.body as z.infer<typeof generateSchema>;

      assertSafeUserInput([body.additional_instructions, body.temporary_context]);

      const bizRes = await pool.query<BusinessRow>(
        'SELECT * FROM businesses WHERE id = $1',
        [businessId]
      );
      if (bizRes.rowCount === 0) {
        throw new AppError(404, ERROR_CODES.BUSINESS_NOT_FOUND, 'Profil bisnis tidak ditemukan.');
      }
      const biz = bizRes.rows[0];

      let product: ProductContextRow | null = null;
      if (body.product_id) {
        if (!UUID_REGEX.test(body.product_id)) {
          throw new AppError(404, ERROR_CODES.PRODUCT_NOT_FOUND, 'Produk tidak ditemukan.');
        }
        const prodRes = await pool.query<ProductContextRow>(
          'SELECT * FROM products WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL',
          [body.product_id, businessId]
        );
        if (prodRes.rowCount === 0) {
          throw new AppError(404, ERROR_CODES.PRODUCT_NOT_FOUND, 'Produk tidak ditemukan.');
        }
        product = prodRes.rows[0];
      }

      const brandTone = (body.brand_tone ?? biz.brand_tone) as BrandTone;
      const language = (body.language ?? biz.language_preference) as LanguagePreference;

      const prompts = buildGeneratePrompts({
        biz,
        product,
        contentType: body.content_type,
        channel: body.channel,
        promoGoal: body.promo_goal,
        brandTone,
        language,
        variantsCount: body.variants_count,
        additionalInstructions: body.additional_instructions,
        temporaryContext: body.temporary_context,
      });

      const outcome = await executeWithAiQuota({
        req,
        res,
        userId,
        businessId,
        feature: 'content_generate',
        endpoint: '/api/v1/ai/content/generate',
        requestPayload: body,
        runLlm: async () => {
          const llmRes = await getLlmProvider().generateJson<{
            variants?: Array<{
              variant_index?: number;
              angle?: string;
              headline?: string;
              body?: string;
              cta?: string;
              hashtags?: string[];
            }>;
          }>({
            systemPrompt: prompts.systemPrompt,
            userPrompt: prompts.userPrompt,
          });

          const rawVariants = Array.isArray(llmRes.data?.variants)
            ? llmRes.data.variants.slice(0, body.variants_count)
            : [];
          if (rawVariants.length === 0) {
            throw new AppError(
              502,
              ERROR_CODES.AI_PROVIDER_ERROR,
              'Layanan AI tidak mengembalikan variasi materi. Kuota harian Anda tidak berkurang.'
            );
          }

          const extraWarnings = [...prompts.warnings];
          const variants = rawVariants.map((v, idx) => {
            const bodyText = String(v.body ?? '').trim();
            const headlineText = String(v.headline ?? '').trim();
            const ctaText = String(v.cta ?? '').trim();
            const combined = [headlineText, bodyText, ctaText].filter(Boolean).join('\n');
            const stats = countTextStats(bodyText || combined);
            const placeholders = detectPlaceholders(combined);
            const violated = findViolatedAvoidedWords(combined, biz.avoided_words ?? []);
            if (violated.length > 0) {
              extraWarnings.push({
                code: 'AVOIDED_WORD_DETECTED',
                message: `Periksa variasi ${idx + 1}: terdeteksi kata yang sebaiknya dihindari (${violated.join(', ')}).`,
              });
            }

            return {
              variant_index: idx + 1,
              angle: String(v.angle ?? `Variasi ${idx + 1}`),
              headline: headlineText,
              body: bodyText,
              cta: ctaText,
              hashtags: Array.isArray(v.hashtags)
                ? v.hashtags.map((t) => String(t)).slice(0, 8)
                : [],
              placeholders_detected: placeholders,
              ...stats,
            };
          });

          const resultPayload = {
            content_type: body.content_type,
            channel: body.channel,
            context_summary: prompts.contextSummary,
            warnings: extraWarnings,
            review_notice: HUMAN_REVIEW_NOTICE,
            variants,
          };

          return {
            result: resultPayload,
            generationInsert: {
              productId: product?.id ?? null,
              contentType: body.content_type,
              channel: body.channel,
              promoGoal: body.promo_goal,
              inputSnapshot: body,
              contextSummary: prompts.contextSummary,
              outputPayload: { variants },
              warnings: extraWarnings,
            },
            providerName: llmRes.providerName,
            modelName: llmRes.modelName,
            estimatedInputTokens: llmRes.estimatedInputTokens,
            estimatedOutputTokens: llmRes.estimatedOutputTokens,
            latencyMs: llmRes.latencyMs,
          };
        },
      });

      sendSuccess(req, res, outcome.data, outcome.statusCode);
    } catch (err) {
      next(err);
    }
  }
);

aiRouter.post(
  '/content/refine',
  requireBusiness,
  validateBody(refineSchema),
  async (req, res, next) => {
    try {
      const userId = req.auth!.userId;
      const businessId = req.auth!.businessId!;
      const body = req.body as z.infer<typeof refineSchema>;

      assertSafeUserInput([body.source_text, body.custom_instruction]);

      const bizRes = await pool.query<BusinessRow>(
        'SELECT * FROM businesses WHERE id = $1',
        [businessId]
      );
      if (bizRes.rowCount === 0) {
        throw new AppError(404, ERROR_CODES.BUSINESS_NOT_FOUND, 'Profil bisnis tidak ditemukan.');
      }
      const biz = bizRes.rows[0];

      let product: ProductContextRow | null = null;
      if (body.product_id) {
        const prodRes = await pool.query<ProductContextRow>(
          'SELECT * FROM products WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL',
          [body.product_id, businessId]
        );
        product = prodRes.rows[0] ?? null;
      }

      const prompts = buildRefinePrompts({
        biz,
        product,
        contentType: body.content_type,
        channel: body.channel,
        sourceText: body.source_text,
        refinePreset: body.refine_preset,
        customInstruction: body.custom_instruction,
      });

      const outcome = await executeWithAiQuota({
        req,
        res,
        userId,
        businessId,
        feature: 'content_refine',
        endpoint: '/api/v1/ai/content/refine',
        requestPayload: body,
        runLlm: async () => {
          const llmRes = await getLlmProvider().generateJson<{ refined_text?: string }>({
            systemPrompt: prompts.systemPrompt,
            userPrompt: prompts.userPrompt,
          });
          const refinedText = String(llmRes.data?.refined_text ?? '').trim();
          if (!refinedText) {
            throw new AppError(
              502,
              ERROR_CODES.AI_PROVIDER_ERROR,
              'Layanan AI gagal menyempurnakan teks. Kuota harian Anda tidak berkurang.'
            );
          }

          const stats = countTextStats(refinedText);
          const placeholders = detectPlaceholders(refinedText);

          return {
            result: {
              parent_generation_id: body.generation_id ?? null,
              refined_text: refinedText,
              ...stats,
              placeholders_detected: placeholders,
              review_notice: HUMAN_REVIEW_NOTICE,
            },
            generationInsert: {
              parentGenerationId: body.generation_id ?? null,
              productId: product?.id ?? null,
              contentType: body.content_type,
              channel: body.channel,
              inputSnapshot: body,
              contextSummary: {
                business_name: biz.name,
                product_name: product?.name ?? null,
              },
              outputPayload: { refined_text: refinedText },
              warnings: [],
            },
            providerName: llmRes.providerName,
            modelName: llmRes.modelName,
            estimatedInputTokens: llmRes.estimatedInputTokens,
            estimatedOutputTokens: llmRes.estimatedOutputTokens,
            latencyMs: llmRes.latencyMs,
          };
        },
      });

      sendSuccess(req, res, outcome.data, outcome.statusCode);
    } catch (err) {
      next(err);
    }
  }
);

aiRouter.post(
  '/feedback',
  requireBusiness,
  validateBody(feedbackSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof feedbackSchema>;
      const inserted = await pool.query<{ id: string }>(
        `
        INSERT INTO ai_feedbacks (
          business_id, user_id, generation_id, content_item_id,
          rating, is_helpful, is_factual_issue, issue_categories, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
        RETURNING id
        `,
        [
          req.auth!.businessId!,
          req.auth!.userId,
          body.generation_id ?? null,
          body.content_id ?? null,
          body.rating ?? null,
          body.is_helpful ?? null,
          body.is_factual_issue,
          JSON.stringify(body.issue_categories ?? []),
          body.notes ?? null,
        ]
      );

      sendSuccess(
        req,
        res,
        {
          feedback_id: inserted.rows[0].id,
          recorded: true,
        },
        201
      );
    } catch (err) {
      next(err);
    }
  }
);

const designCopyAssistSchema = z.object({
  template_id: z.string().trim().min(1),
  product_id: z.string().uuid().nullable().optional(),
  promo_goal: z.enum(PROMO_GOALS).default('product_intro'),
  additional_instructions: z.string().trim().max(200).nullable().optional(),
});

aiRouter.post(
  '/design/copy-assist',
  requireBusiness,
  validateBody(designCopyAssistSchema),
  async (req, res, next) => {
    try {
      const userId = req.auth!.userId;
      const businessId = req.auth!.businessId!;
      const body = req.body as z.infer<typeof designCopyAssistSchema>;
      assertSafeUserInput([body.additional_instructions]);

      const [bizRes, tplRes] = await Promise.all([
        pool.query<BusinessRow>('SELECT * FROM businesses WHERE id = $1', [businessId]),
        pool.query<{
          id: string;
          name: string;
          slots_schema: Record<string, { max_chars: number }>;
        }>('SELECT id, name, slots_schema FROM design_templates WHERE id = $1', [
          body.template_id,
        ]),
      ]);
      if (bizRes.rowCount === 0) {
        throw new AppError(404, ERROR_CODES.BUSINESS_NOT_FOUND, 'Profil bisnis tidak ditemukan.');
      }
      if (tplRes.rowCount === 0) {
        throw AppError.notFound('Template desain tidak ditemukan.');
      }
      const biz = bizRes.rows[0];
      const tpl = tplRes.rows[0];

      let product: ProductContextRow | null = null;
      if (body.product_id) {
        const pr = await pool.query<ProductContextRow>(
          'SELECT * FROM products WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL',
          [body.product_id, businessId]
        );
        product = pr.rows[0] ?? null;
      }

      const basePrompt = buildGeneratePrompts({
        biz,
        product,
        contentType: 'slogan_headline',
        channel: 'instagram',
        promoGoal: body.promo_goal,
        brandTone: biz.brand_tone as BrandTone,
        language: biz.language_preference as LanguagePreference,
        variantsCount: 2,
        additionalInstructions: body.additional_instructions,
      });

      const userPrompt = `${basePrompt.userPrompt}

KHUSUS SLOT POSTER TEMPLATE (${tpl.name}):
Patuhi batas karakter MAKSIMAL per slot:
- headline: maks ${tpl.slots_schema.headline?.max_chars ?? 45} karakter
- subheadline: maks ${tpl.slots_schema.subheadline?.max_chars ?? 90} karakter
- price_or_badge: maks ${tpl.slots_schema.price_or_badge?.max_chars ?? 25} karakter
- cta: maks ${tpl.slots_schema.cta?.max_chars ?? 35} karakter

Kembalikan JSON PERSIS:
{
  "suggestions": [
    { "headline": "...", "subheadline": "...", "price_or_badge": "...", "cta": "..." },
    { "headline": "...", "subheadline": "...", "price_or_badge": "...", "cta": "..." }
  ]
}`;

      const outcome = await executeWithAiQuota({
        req,
        res,
        userId,
        businessId,
        feature: 'design_copy_assist',
        endpoint: '/api/v1/ai/design/copy-assist',
        requestPayload: body,
        runLlm: async () => {
          const llmRes = await getLlmProvider().generateJson<{
            suggestions?: Array<Record<string, string>>;
          }>({ systemPrompt: basePrompt.systemPrompt, userPrompt });

          const suggestions = (llmRes.data?.suggestions ?? []).slice(0, 2).map((s) => ({
            headline: String(s.headline ?? '').slice(
              0,
              tpl.slots_schema.headline?.max_chars ?? 45
            ),
            subheadline: String(s.subheadline ?? '').slice(
              0,
              tpl.slots_schema.subheadline?.max_chars ?? 90
            ),
            price_or_badge: String(s.price_or_badge ?? '').slice(
              0,
              tpl.slots_schema.price_or_badge?.max_chars ?? 25
            ),
            cta: String(s.cta ?? '').slice(0, tpl.slots_schema.cta?.max_chars ?? 35),
          }));

          return {
            result: {
              suggestions,
              review_notice: 'Periksa kembali harga dan teks sebelum mengunduh desain.',
            },
            generationInsert: {
              productId: product?.id ?? null,
              inputSnapshot: body,
              contextSummary: basePrompt.contextSummary,
              outputPayload: { suggestions },
              warnings: [],
            },
            providerName: llmRes.providerName,
            modelName: llmRes.modelName,
            estimatedInputTokens: llmRes.estimatedInputTokens,
            estimatedOutputTokens: llmRes.estimatedOutputTokens,
            latencyMs: llmRes.latencyMs,
          };
        },
      });

      sendSuccess(req, res, outcome.data, outcome.statusCode);
    } catch (err) {
      next(err);
    }
  }
);

const plannerIdeasSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days_count: z.number().int().min(3).max(14).default(7),
  ideas_count: z.number().int().min(5).max(7).default(5),
  campaign_theme: z.string().trim().max(150).nullable().optional(),
  product_ids: z.array(z.string().uuid()).max(5).optional(),
  channels: z.array(z.enum(MARKETING_CHANNELS)).min(1).default(['instagram', 'whatsapp']),
});

aiRouter.post(
  '/planner/ideas',
  requireBusiness,
  validateBody(plannerIdeasSchema),
  async (req, res, next) => {
    try {
      const userId = req.auth!.userId;
      const businessId = req.auth!.businessId!;
      const body = req.body as z.infer<typeof plannerIdeasSchema>;
      assertSafeUserInput([body.campaign_theme]);

      const bizRes = await pool.query<BusinessRow>(
        'SELECT * FROM businesses WHERE id = $1',
        [businessId]
      );
      if (bizRes.rowCount === 0) {
        throw new AppError(404, ERROR_CODES.BUSINESS_NOT_FOUND, 'Profil bisnis tidak ditemukan.');
      }
      const biz = bizRes.rows[0];

      let firstProduct: ProductContextRow | null = null;
      if (body.product_ids?.length) {
        const pr = await pool.query<ProductContextRow>(
          'SELECT * FROM products WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL',
          [body.product_ids[0], businessId]
        );
        firstProduct = pr.rows[0] ?? null;
      }

      const base = buildGeneratePrompts({
        biz,
        product: firstProduct,
        contentType: 'content_idea',
        channel: body.channels[0],
        promoGoal: 'product_intro',
        brandTone: biz.brand_tone as BrandTone,
        language: biz.language_preference as LanguagePreference,
        variantsCount: 3,
        additionalInstructions: body.campaign_theme,
      });

      const userPrompt = `${base.userPrompt}

TUGAS KHUSUS RENCANA KONTEN MINGGUAN:
Buat tepat ${body.ideas_count} rekomendasi ide konten mulai tanggal ${body.start_date} selama ${body.days_count} hari untuk kanal: ${body.channels.join(', ')}.
Tema kampanye: ${body.campaign_theme || 'Promosi harian usaha'}

Kembalikan JSON PERSIS:
{
  "ideas": [
    {
      "temp_id": "idea_1",
      "suggested_date": "${body.start_date}",
      "title": "Judul rencana singkat",
      "channel": "${body.channels[0]}",
      "recommended_content_type": "social_caption",
      "angle": "Penjelasan singkat sudut pandang konten"
    }
  ]
}`;

      const outcome = await executeWithAiQuota({
        req,
        res,
        userId,
        businessId,
        feature: 'planner_ideas',
        endpoint: '/api/v1/ai/planner/ideas',
        requestPayload: body,
        runLlm: async () => {
          const llmRes = await getLlmProvider().generateJson<{
            ideas?: Array<Record<string, string>>;
          }>({ systemPrompt: base.systemPrompt, userPrompt });

          const ideas = (llmRes.data?.ideas ?? []).slice(0, body.ideas_count).map((item, i) => ({
            temp_id: item.temp_id || `idea_${i + 1}`,
            suggested_date: item.suggested_date || body.start_date,
            title: String(item.title ?? `Ide Konten ${i + 1}`).slice(0, 150),
            channel: MARKETING_CHANNELS.includes(
              item.channel as (typeof MARKETING_CHANNELS)[number]
            )
              ? item.channel
              : body.channels[0],
            recommended_content_type: CONTENT_TYPES.includes(
              item.recommended_content_type as (typeof CONTENT_TYPES)[number]
            )
              ? item.recommended_content_type
              : 'social_caption',
            product_id: firstProduct?.id ?? null,
            angle: String(item.angle ?? ''),
          }));

          return {
            result: {
              recommendation_notice:
                'Daftar berikut merupakan saran ide konten berbasis konteks bisnis Anda, bukan jaminan performa media sosial.',
              ideas,
            },
            generationInsert: {
              productId: firstProduct?.id ?? null,
              inputSnapshot: body,
              contextSummary: base.contextSummary,
              outputPayload: { ideas },
              warnings: [],
            },
            providerName: llmRes.providerName,
            modelName: llmRes.modelName,
            estimatedInputTokens: llmRes.estimatedInputTokens,
            estimatedOutputTokens: llmRes.estimatedOutputTokens,
            latencyMs: llmRes.latencyMs,
          };
        },
      });

      sendSuccess(req, res, outcome.data, outcome.statusCode);
    } catch (err) {
      next(err);
    }
  }
);
