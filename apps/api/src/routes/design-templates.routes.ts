import { ASPECT_RATIOS, TEMPLATE_SEGMENTS } from '@dagangai/shared';
import { Router } from 'express';
import { pool } from '../db/pool.js';
import { AppError } from '../lib/errors.js';
import { buildPaginationMeta, parsePagination } from '../lib/pagination.js';
import { sendSuccess } from '../lib/response.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const designTemplatesRouter = Router();
designTemplatesRouter.use(authenticate, requireRole('business_owner'));

interface DesignTemplateRow {
  id: string;
  name: string;
  segment: string;
  aspect_ratio: string;
  width_px: number;
  height_px: number;
  thumbnail_url: string;
  supports_logo: boolean;
  supports_badge: boolean;
  slots_schema: Record<string, { max_chars: number; required: boolean }>;
  font_presets: string[];
  default_colors: { background: string; accent: string; text: string };
  layout_definition: Record<string, unknown>;
}

function formatTemplate(row: DesignTemplateRow) {
  return {
    id: row.id,
    name: row.name,
    segment: row.segment,
    aspect_ratio: row.aspect_ratio,
    dimensions: { width: row.width_px, height: row.height_px },
    thumbnail_url: row.thumbnail_url,
    supports_logo: row.supports_logo,
    supports_badge: row.supports_badge,
    slots: row.slots_schema,
    font_presets: row.font_presets,
    default_colors: row.default_colors,
    layout_definition: row.layout_definition,
  };
}

designTemplatesRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const conditions: string[] = ['is_active = TRUE'];
    const params: unknown[] = [];
    let idx = 1;

    const aspectRatio =
      typeof req.query.aspect_ratio === 'string' ? req.query.aspect_ratio.trim() : '';
    if (
      aspectRatio &&
      ASPECT_RATIOS.includes(aspectRatio as (typeof ASPECT_RATIOS)[number])
    ) {
      conditions.push(`aspect_ratio = $${idx}`);
      params.push(aspectRatio);
      idx++;
    }

    const segment =
      typeof req.query.segment === 'string' ? req.query.segment.trim() : '';
    if (
      segment &&
      TEMPLATE_SEGMENTS.includes(segment as (typeof TEMPLATE_SEGMENTS)[number])
    ) {
      conditions.push(`segment = $${idx}`);
      params.push(segment);
      idx++;
    }

    const whereClause = conditions.join(' AND ');
    const countRes = await pool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM design_templates WHERE ${whereClause}`,
      params
    );
    const totalItems = Number(countRes.rows[0]?.total ?? 0);

    const listRes = await pool.query<DesignTemplateRow>(
      `
      SELECT *
      FROM design_templates
      WHERE ${whereClause}
      ORDER BY sort_order ASC, id ASC
      LIMIT $${idx} OFFSET $${idx + 1}
      `,
      [...params, limit, offset]
    );

    sendSuccess(
      req,
      res,
      listRes.rows.map(formatTemplate),
      200,
      buildPaginationMeta(page, limit, totalItems)
    );
  } catch (err) {
    next(err);
  }
});

designTemplatesRouter.get('/:templateId', async (req, res, next) => {
  try {
    const rawId = req.params.templateId;
    const templateId = Array.isArray(rawId) ? rawId[0] : rawId;
    const result = await pool.query<DesignTemplateRow>(
      'SELECT * FROM design_templates WHERE id = $1 AND is_active = TRUE',
      [templateId]
    );
    if (result.rowCount === 0) {
      throw AppError.notFound('Template desain tidak ditemukan.');
    }
    sendSuccess(req, res, formatTemplate(result.rows[0]));
  } catch (err) {
    next(err);
  }
});
