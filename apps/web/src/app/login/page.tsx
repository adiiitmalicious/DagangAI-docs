'use client';

import { Eye, EyeOff, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormFields';
import { useToast } from '@/components/ui/Toast';
import { ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      showToast('Berhasil masuk ke DagangAI.', 'success');
      if (user.role === 'business_owner' && !user.has_business) {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Gagal menghubungi server. Silakan coba lagi.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] px-4 py-10">
      <div className="w-full max-w-[420px] rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-card)] md:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--brand-primary)] text-white">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="font-heading text-[22px] font-bold text-[var(--text-primary)]">
            Masuk ke DagangAI
          </h1>
          <p className="mt-1 text-[14px] text-[var(--text-secondary)]">
            Lanjutkan mengelola materi promosi dan produk usaha Anda.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded-[8px] border border-[#FECACA] bg-[var(--status-danger-bg)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--status-danger-text)]"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="nama@usahaanda.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="relative">
            <Input
              label="Kata Sandi"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-11"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              className="absolute right-1.5 bottom-1 flex h-10 w-10 items-center justify-center rounded-[6px] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-[13px] font-medium text-[var(--brand-primary)] hover:underline"
            >
              Lupa kata sandi?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={submitting}
          >
            Masuk
          </Button>
        </form>

        <p className="mt-6 text-center text-[14px] text-[var(--text-secondary)]">
          Belum punya akun?{' '}
          <Link
            href="/register"
            className="font-semibold text-[var(--brand-primary)] hover:underline"
          >
            Daftar Gratis
          </Link>
        </p>
      </div>
    </div>
  );
}
