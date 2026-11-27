'use client';

import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormFields';
import { useToast } from '@/components/ui/Toast';
import { apiFetch, ApiClientError } from '@/lib/api-client';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        skipAuth: true,
        body: { token: token.trim(), new_password: newPassword },
      });
      showToast('Kata sandi berhasil diperbarui. Silakan masuk kembali.', 'success');
      router.push('/login');
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : 'Gagal mereset kata sandi.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && (
        <div className="rounded-[8px] border border-[#FECACA] bg-[var(--status-danger-bg)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--status-danger-text)]">
          {errorMsg}
        </div>
      )}
      <Input
        label="Token Reset"
        placeholder="Tempel token reset kata sandi"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        required
      />
      <Input
        label="Kata Sandi Baru"
        type="password"
        placeholder="Minimal 8 karakter"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
      />
      <Button type="submit" variant="primary" className="w-full" isLoading={loading}>
        Simpan Kata Sandi Baru
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] px-4 py-10">
      <div className="w-full max-w-[420px] rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-card)] md:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--brand-primary)] text-white">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="font-heading text-[22px] font-bold text-[var(--text-primary)]">
            Atur Kata Sandi Baru
          </h1>
        </div>

        <Suspense fallback={<p className="text-[14px] text-[var(--text-muted)]">Memuat...</p>}>
          <ResetPasswordForm />
        </Suspense>

        <p className="mt-6 text-center text-[14px] text-[var(--text-secondary)]">
          <Link href="/login" className="font-semibold text-[var(--brand-primary)] hover:underline">
            Kembali ke halaman Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
