'use client';

import type { ContentStatus } from '@dagangai/shared';
import {
  CalendarDays,
  Info,
  Package,
  Palette,
  Plus,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api-client';
import { AuthGuard, useAuth } from '@/lib/auth-context';
import { CHANNEL_LABELS } from '@/lib/content-constants';

interface AnalyticsSummary {
  period: '7d' | '30d' | 'all';
  disclaimer: string;
  metrics: {
    ai_generations_count: number;
    contents_saved_count: number;
    designs_created_count: number;
    planner_status_breakdown: {
      draft: number;
      planned: number;
      published: number;
    };
  };
  product_coverage: {
    most_promoted: Array<{ product_id: string; name: string; materials_count: number }>;
    unpromoted_products: Array<{ product_id: string; name: string; materials_count: number }>;
  };
  upcoming_plans: Array<{
    id: string;
    title: string;
    channel: string;
    scheduled_date: string;
    status: ContentStatus;
  }>;
  recent_activities: Array<{
    type: string;
    entity_id: string;
    title: string;
    occurred_at: string;
  }>;
  business_completeness_score: number;
  ai_quota: {
    daily_credits_limit: number;
    daily_credits_used: number;
    daily_credits_remaining: number;
    reset_at: string;
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('30d');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiFetch<AnalyticsSummary>(`/analytics/summary?period=${period}`)
      .then((data) => {
        if (active) setSummary(data);
      })
      .catch(() => {
        if (active) showToast('Gagal memuat ringkasan aktivitas.', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period, showToast]);

  const score =
    summary?.business_completeness_score ??
    user?.business_summary?.completeness_score ??
    0;

  return (
    <AuthGuard>
      <AppShell pageTitle="Beranda">
        <div className="space-y-6">
          {/* Greeting & Kelengkapan Profil */}
          <section className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-heading text-[18px] font-bold text-[var(--text-primary)]">
              Halo, {user?.full_name} — {user?.business_summary?.name}
            </h2>
            {score < 80 && (
              <div className="mt-3 flex flex-col gap-2 rounded-[10px] border border-[#FDE68A] bg-[var(--status-planned-bg)] px-4 py-3 text-[13px] text-[var(--status-planned-text)] sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Kelengkapan Profil Bisnis Anda <strong>{score}%</strong>. Lengkapi
                  profil agar hasil materi AI semakin relevan.
                </span>
                <Link href="/business" className="font-semibold underline">
                  Lengkapi Profil
                </Link>
              </div>
            )}
          </section>

          {/* 3 Aksi Cepat */}
          <section className="space-y-2.5">
            <h3 className="font-heading text-[15px] font-semibold text-[var(--text-primary)]">
              Aksi Cepat
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Link href="/studio">
                <Button
                  variant="primary"
                  leftIcon={<Sparkles className="h-4 w-4" />}
                  className="w-full justify-start"
                >
                  + Buat Konten AI
                </Button>
              </Link>
              <Link href="/designs">
                <Button
                  variant="secondary"
                  leftIcon={<Palette className="h-4 w-4" />}
                  className="w-full justify-start"
                >
                  + Buat Desain Promo
                </Button>
              </Link>
              <Link href="/products">
                <Button
                  variant="secondary"
                  leftIcon={<Plus className="h-4 w-4" />}
                  className="w-full justify-start"
                >
                  + Tambah Produk
                </Button>
              </Link>
            </div>
          </section>

          {/* Ringkasan Aktivitas Internal (BR-08) */}
          <section className="space-y-4 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-heading text-[16px] font-semibold text-[var(--text-primary)]">
                Ringkasan Aktivitas
              </h3>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as '7d' | '30d' | 'all')}
                aria-label="Pilih periode ringkasan"
                className="min-h-[40px] rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-[14px]"
              >
                <option value="7d">7 Hari Terakhir</option>
                <option value="30d">30 Hari Terakhir</option>
                <option value="all">Semua Waktu</option>
              </select>
            </div>

            {loading || !summary ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-24 animate-pulse rounded-[10px] bg-[var(--bg-subtle)]"
                  />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] p-4">
                    <p className="tabular-nums font-heading text-[24px] font-bold text-[var(--text-primary)]">
                      {summary.metrics.ai_generations_count}
                    </p>
                    <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                      Generasi AI
                    </p>
                  </div>
                  <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] p-4">
                    <p className="tabular-nums font-heading text-[24px] font-bold text-[var(--text-primary)]">
                      {summary.metrics.contents_saved_count}
                    </p>
                    <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                      Materi Tersimpan
                    </p>
                  </div>
                  <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] p-4">
                    <p className="tabular-nums font-heading text-[24px] font-bold text-[var(--text-primary)]">
                      {summary.metrics.designs_created_count}
                    </p>
                    <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                      Desain Dibuat
                    </p>
                  </div>
                  <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] p-4">
                    <p className="tabular-nums font-heading text-[24px] font-bold text-[var(--brand-primary)]">
                      {summary.ai_quota.daily_credits_remaining}/
                      {summary.ai_quota.daily_credits_limit}
                    </p>
                    <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                      Sisa Kuota AI
                    </p>
                  </div>
                </div>

                {/* Status Planner Breakdown */}
                <div className="flex flex-wrap items-center gap-3 text-[13px]">
                  <span className="font-medium text-[var(--text-secondary)]">
                    Status Planner:
                  </span>
                  <span className="tabular-nums rounded-full bg-[var(--status-draft-bg)] px-3 py-1 font-medium text-[var(--status-draft-text)]">
                    Draf: {summary.metrics.planner_status_breakdown.draft}
                  </span>
                  <span className="tabular-nums rounded-full bg-[var(--status-planned-bg)] px-3 py-1 font-medium text-[var(--status-planned-text)]">
                    Terjadwal: {summary.metrics.planner_status_breakdown.planned}
                  </span>
                  <span className="tabular-nums rounded-full bg-[var(--status-published-bg)] px-3 py-1 font-medium text-[var(--status-published-text)]">
                    Dipublikasikan: {summary.metrics.planner_status_breakdown.published}
                  </span>
                </div>

                {/* Disclaimer Aktivitas Internal Terlihat Langsung (BR-08 & design.md §4.3) */}
                <div className="flex items-start gap-2 rounded-[8px] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-[12px] text-[var(--text-secondary)]">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
                  <p>{summary.disclaimer}</p>
                </div>
              </>
            )}
          </section>

          {/* Seksi Bawah: Jadwal Terdekat & Produk Belum Dipromosikan */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <section className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)]">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-heading text-[16px] font-semibold text-[var(--text-primary)]">
                  <CalendarDays className="h-4 w-4 text-[var(--brand-primary)]" />
                  Jadwal Terdekat
                </h3>
                <Link
                  href="/planner"
                  className="text-[13px] font-medium text-[var(--brand-primary)] hover:underline"
                >
                  Lihat Planner
                </Link>
              </div>
              {summary?.upcoming_plans.length ? (
                <ul className="divide-y divide-[var(--border-default)]">
                  {summary.upcoming_plans.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 py-2.5 text-[13px]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--text-primary)]">
                          {item.title}
                        </p>
                        <p className="tabular-nums text-[12px] text-[var(--text-muted)]">
                          {item.scheduled_date} •{' '}
                          {CHANNEL_LABELS[item.channel] ?? item.channel}
                        </p>
                      </div>
                      <StatusBadge status={item.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-[var(--text-muted)]">
                  Belum ada jadwal publikasi terdekat.
                </p>
              )}
            </section>

            <section className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)]">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-heading text-[16px] font-semibold text-[var(--text-primary)]">
                  <Package className="h-4 w-4 text-[var(--brand-accent)]" />
                  Produk Belum Dipromosikan
                </h3>
                <Link
                  href="/products"
                  className="text-[13px] font-medium text-[var(--brand-primary)] hover:underline"
                >
                  Lihat Produk
                </Link>
              </div>
              {summary?.product_coverage.unpromoted_products.length ? (
                <ul className="divide-y divide-[var(--border-default)]">
                  {summary.product_coverage.unpromoted_products.map((prod) => (
                    <li
                      key={prod.product_id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <span className="truncate text-[14px] font-medium text-[var(--text-primary)]">
                        {prod.name}
                      </span>
                      <Link href={`/studio?product_id=${prod.product_id}`}>
                        <Button variant="secondary" size="sm">
                          Buat Konten
                        </Button>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-[var(--text-muted)]">
                  Semua produk aktif Anda sudah memiliki materi promosi!
                </p>
              )}
            </section>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
