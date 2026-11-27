import type { PaginationMeta } from '@dagangai/shared';
import type { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
  search?: string;
  sortOrder: 'asc' | 'desc';
}

export function parsePagination(req: Request): PaginationParams {
  const rawPage = Number(req.query.page ?? 1);
  const rawLimit = Number(req.query.limit ?? 20);

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(100, Math.floor(rawLimit)) : 20;
  const offset = (page - 1) * limit;

  const rawSearch = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const search = rawSearch.length > 0 ? rawSearch.slice(0, 100) : undefined;

  const sortOrder = req.query.sort_order === 'asc' ? 'asc' : 'desc';

  return { page, limit, offset, search, sortOrder };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  totalItems: number
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  return {
    page,
    limit,
    total_items: totalItems,
    total_pages: totalPages,
    has_next: page < totalPages,
    has_prev: page > 1,
  };
}
