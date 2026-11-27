'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  apiFetch,
  clearStoredTokens,
  getStoredTokens,
  setStoredTokens,
} from './api-client';

export interface MeData {
  id: string;
  full_name: string;
  email: string;
  role: 'business_owner' | 'platform_admin';
  status: 'active' | 'suspended';
  has_business: boolean;
  business_summary: {
    id: string;
    name: string;
    category: string;
    completeness_score: number;
  } | null;
  ai_quota: {
    daily_credits_limit: number;
    daily_credits_used: number;
    daily_credits_remaining: number;
    reset_at: string;
  };
}

interface AuthResponsePayload {
  user: {
    id: string;
    full_name: string;
    email: string;
    role: 'business_owner' | 'platform_admin';
    status: 'active' | 'suspended';
    has_business: boolean;
  };
  tokens: {
    access_token: string;
    refresh_token: string;
  };
}

interface AuthContextValue {
  user: MeData | null;
  isLoading: boolean;
  refreshMe: () => Promise<MeData | null>;
  login: (email: string, password: string) => Promise<AuthResponsePayload['user']>;
  register: (
    full_name: string,
    email: string,
    password: string
  ) => Promise<AuthResponsePayload['user']>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshMe = useCallback(async (): Promise<MeData | null> => {
    const { accessToken } = getStoredTokens();
    if (!accessToken) {
      setUser(null);
      setIsLoading(false);
      return null;
    }
    try {
      const me = await apiFetch<MeData>('/me');
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<AuthResponsePayload>('/auth/login', {
        method: 'POST',
        skipAuth: true,
        body: { email, password },
      });
      setStoredTokens(data.tokens.access_token, data.tokens.refresh_token);
      await refreshMe();
      return data.user;
    },
    [refreshMe]
  );

  const register = useCallback(
    async (full_name: string, email: string, password: string) => {
      const data = await apiFetch<AuthResponsePayload>('/auth/register', {
        method: 'POST',
        skipAuth: true,
        body: { full_name, email, password },
      });
      setStoredTokens(data.tokens.access_token, data.tokens.refresh_token);
      await refreshMe();
      return data.user;
    },
    [refreshMe]
  );

  const logout = useCallback(async () => {
    const { refreshToken } = getStoredTokens();
    try {
      await apiFetch('/auth/logout', {
        method: 'POST',
        body: { refresh_token: refreshToken },
      });
    } catch {
      // Abaikan error saat logout agar klien tetap bersih
    } finally {
      clearStoredTokens();
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  const value = useMemo(
    () => ({ user, isLoading, refreshMe, login, register, logout }),
    [user, isLoading, refreshMe, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Guard halaman terautentikasi:
 * - Belum login -> /login
 * - Belum punya bisnis (requireBusiness=true) -> /onboarding
 */
export function AuthGuard({
  children,
  requireBusiness = true,
}: {
  children: ReactNode;
  requireBusiness?: boolean;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (
      requireBusiness &&
      user.role === 'business_owner' &&
      !user.has_business &&
      pathname !== '/onboarding'
    ) {
      router.replace('/onboarding');
    }
  }, [isLoading, user, requireBusiness, router, pathname]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] px-4">
        <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-5 text-[14px] text-[var(--text-secondary)]">
          Memuat ruang kerja DagangAI...
        </div>
      </div>
    );
  }

  if (requireBusiness && user.role === 'business_owner' && !user.has_business) {
    return null;
  }

  return <>{children}</>;
}
