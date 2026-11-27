import type { ApiErrorPayload } from './errors.js';

export interface PaginationMeta {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ResponseMeta {
  request_id: string;
  timestamp: string;
  pagination?: PaginationMeta;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorPayload;
  meta: ResponseMeta;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
