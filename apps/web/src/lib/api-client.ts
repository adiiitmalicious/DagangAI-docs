import type { ApiResponse, ErrorDetail } from '@dagangai/shared';

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1'
).replace(/\/+$/, '');

const ACCESS_TOKEN_KEY = 'dagangai_access_token';
const REFRESH_TOKEN_KEY = 'dagangai_refresh_token';

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: ErrorDetail[];

  constructor(status: number, code: string, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getStoredTokens(): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  if (typeof window === 'undefined') {
    return { accessToken: null, refreshToken: null };
  }
  return {
    accessToken: window.localStorage.getItem(ACCESS_TOKEN_KEY),
    refreshToken: window.localStorage.getItem(REFRESH_TOKEN_KEY),
  };
}

export function setStoredTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearStoredTokens(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

let inFlightRefresh: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = (async () => {
    const { refreshToken } = getStoredTokens();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        clearStoredTokens();
        return null;
      }

      const json = (await res.json()) as ApiResponse<{
        tokens: { access_token: string; refresh_token: string };
      }>;
      if (!json.success) {
        clearStoredTokens();
        return null;
      }

      setStoredTokens(json.data.tokens.access_token, json.data.tokens.refresh_token);
      return json.data.tokens.access_token;
    } catch {
      clearStoredTokens();
      return null;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
}

export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { body, skipAuth = false, headers: customHeaders, ...rest } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const buildHeaders = (token: string | null): HeadersInit => {
    const h: Record<string, string> = {};
    if (!isFormData) {
      h['Content-Type'] = 'application/json';
    }
    if (!skipAuth && token) {
      h['Authorization'] = `Bearer ${token}`;
    }
    if (customHeaders) {
      Object.assign(h, customHeaders);
    }
    return h;
  };

  const { accessToken } = getStoredTokens();
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const serializedBody =
    body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body);

  let response = await fetch(url, {
    ...rest,
    headers: buildHeaders(accessToken),
    body: serializedBody,
  });

  if (response.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await fetch(url, {
        ...rest,
        headers: buildHeaders(newToken),
        body: serializedBody,
      });
    } else if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (!['/login', '/register', '/forgot-password', '/reset-password'].includes(currentPath)) {
        window.location.href = '/login';
      }
    }
  }

  const json = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !json.success) {
    const err = !json.success
      ? json.error
      : { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan pada server.' };
    throw new ApiClientError(response.status, err.code, err.message, err.details);
  }

  return json.data;
}
