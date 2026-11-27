'use client';

import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormFields';
import { apiFetch, ApiClientError } from '@/lib/api-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submittedMsg, setSubmittedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmittedMsg(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        skipAuth: true,
        body: { email: email.trim() },
      });
      setSubmittedMsg(res.message);
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : 'Gagal mengirim permintaan reset kata sandi.'
      );
    } finally {
      setLoading(false);
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
            Lupa Kata Sandi
          </h1>
          <p className="mt-1 text-[14px] text-[var(--text-secondary)]">
            Masukkan email terdaftar untuk menerima tautan pemulihan kata sandi.
          </p>
        </div>

        {submittedMsg && (
          <div className="mb-4 rounded-[8px] border border-[#BBF7D0] bg-[var(--status-published-bg)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--status-published-text)]">
            {submittedMsg}
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 rounded-[8px] border border-[#FECACA] bg-[var(--status-danger-bg)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--status-danger-text)]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="nama@usahaanda.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" variant="primary" className="w-full" isLoading={loading}>
            Kirim Tautan Reset
          </Button>
        </form>

        <p className="mt-6 text-center text-[14px] text-[var(--text-secondary)]">
          <Link href="/login" className="font-semibold text-[var(--brand-primary)] hover:underline">
            Kembali ke halaman Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
