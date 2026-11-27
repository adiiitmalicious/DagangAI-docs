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

export default function RegisterPage() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);
    setSubmitting(true);

    try {
      await register(fullName.trim(), email.trim(), password);
      showToast('Akun berhasil dibuat! Mari lengkapi profil usaha Anda.', 'success');
      router.push('/onboarding');
    } catch (err) {
      if (err instanceof ApiClientError) {
        const nextFields: Record<string, string> = {};
        err.details?.forEach((d) => {
          if (d.field) nextFields[d.field] = d.message;
        });
        setFieldErrors(nextFields);
        setGeneralError(err.message);
      } else {
        setGeneralError('Gagal mendaftarkan akun. Silakan coba lagi.');
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
            Buat Akun DagangAI
          </h1>
          <p className="mt-1 text-[14px] text-[var(--text-secondary)]">
            Gratis selama periode kompetisi untuk membantu promosi UMKM Anda.
          </p>
        </div>

        {generalError && (
          <div
            role="alert"
            className="mb-4 rounded-[8px] border border-[#FECACA] bg-[var(--status-danger-bg)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--status-danger-text)]"
          >
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nama Lengkap"
            placeholder="Contoh: Rina Wulandari"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={fieldErrors.full_name}
            required
          />

          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="rina@kopisenja.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            required
          />

          <div className="relative">
            <Input
              label="Kata Sandi"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Minimal 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
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

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={submitting}
          >
            Daftar Gratis
          </Button>
        </form>

        <p className="mt-6 text-center text-[14px] text-[var(--text-secondary)]">
          Sudah punya akun?{' '}
          <Link
            href="/login"
            className="font-semibold text-[var(--brand-primary)] hover:underline"
          >
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
