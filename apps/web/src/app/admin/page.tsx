'use client';

import { LogOut, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/FormFields';
import { ModalOrSheet } from '@/components/ui/ModalOrSheet';
import { useToast } from '@/components/ui/Toast';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/cn';

interface AdminOverview {
  date: string;
  users: {
    total_registered: number;
    active_today: number;
    suspended_count: number;
  };
  ai_operations: {
    total_requests_today: number;
    success_count: number;
    failed_count: number;
    rate_limited_count: number;
    success_rate_percent: number;
    avg_latency_ms: number;
    estimated_tokens_today: number;
    factual_issue_reports_today: number;
    circuit_breaker_open: boolean;
  };
}

interface AdminAiConfig {
  daily_credits_limit: number;
  rate_limit_per_minute: number;
  circuit_breaker_open: boolean;
  circuit_breaker_message: string | null;
}

interface AiLogItem {
  id: string;
  user_id: string;
  feature: string;
  status: string;
  credits_charged: number;
  latency_ms: number | null;
  error_code: string | null;
  created_at: string;
}

interface AdminUserItem {
  id: string;
  full_name: string;
  email: string;
  status: 'active' | 'suspended';
  suspended_reason: string | null;
}

export default function AdminPage() {
  const { user, isLoading, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [logs, setLogs] = useState<AiLogItem[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [logStatusFilter, setLogStatusFilter] = useState('');

  // AI Runtime Config
  const [dailyLimit, setDailyLimit] = useState(30);
  const [rateLimit, setRateLimit] = useState(5);
  const [circuitOpen, setCircuitOpen] = useState(false);
  const [circuitMessage, setCircuitMessage] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [circuitConfirmOpen, setCircuitConfirmOpen] = useState(false);

  // User Moderation
  const [suspendTarget, setSuspendTarget] = useState<AdminUserItem | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [moderating, setModerating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [ov, cfg, logList, userList] = await Promise.all([
        apiFetch<AdminOverview>('/admin/overview'),
        apiFetch<AdminAiConfig>('/admin/ai-config'),
        apiFetch<AiLogItem[]>(
          `/admin/ai-logs?limit=20${logStatusFilter ? `&status=${logStatusFilter}` : ''}`
        ),
        apiFetch<AdminUserItem[]>('/admin/users?limit=20'),
      ]);
      setOverview(ov);
      setDailyLimit(cfg.daily_credits_limit);
      setRateLimit(cfg.rate_limit_per_minute);
      setCircuitOpen(cfg.circuit_breaker_open);
      setCircuitMessage(cfg.circuit_breaker_message ?? '');
      setLogs(logList);
      setUsers(userList);
    } catch {
      showToast('Gagal memuat data operasional admin.', 'error');
    }
  }, [logStatusFilter, showToast]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'platform_admin') {
      router.replace('/dashboard');
      return;
    }
    void loadData();
  }, [isLoading, user, router, loadData]);

  const handleSaveConfig = async (e: FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await apiFetch('/admin/ai-config', {
        method: 'PATCH',
        body: {
          daily_credits_limit: Number(dailyLimit),
          rate_limit_per_minute: Number(rateLimit),
          circuit_breaker_message: circuitMessage.trim() || null,
        },
      });
      showToast('Konfigurasi runtime AI diperbarui.', 'success');
      void loadData();
    } catch (err) {
      showToast(
        err instanceof ApiClientError ? err.message : 'Gagal menyimpan konfigurasi.',
        'error'
      );
    } finally {
      setSavingConfig(false);
    }
  };

  const handleToggleCircuitBreaker = async () => {
    setSavingConfig(true);
    try {
      const nextState = !circuitOpen;
      await apiFetch('/admin/ai-config', {
        method: 'PATCH',
        body: {
          circuit_breaker_open: nextState,
          circuit_breaker_message:
            circuitMessage.trim() ||
            'Layanan AI sedang dalam pemeliharaan singkat. Fitur kelola produk dan pustaka tetap dapat digunakan.',
        },
      });
      setCircuitOpen(nextState);
      setCircuitConfirmOpen(false);
      showToast(
        nextState
          ? 'Global Circuit Breaker DIAKTIFKAN.'
          : 'Global Circuit Breaker DINONAKTIFKAN. Layanan AI aktif kembali.',
        nextState ? 'warning' : 'success'
      );
      void loadData();
    } catch {
      showToast('Gagal mengubah status Circuit Breaker.', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSuspendUser = async () => {
    if (!suspendTarget) return;
    setModerating(true);
    try {
      await apiFetch(`/admin/users/${suspendTarget.id}/status`, {
        method: 'PATCH',
        body: { status: 'suspended', reason: suspendReason.trim() },
      });
      showToast(`Akun ${suspendTarget.email} ditangguhkan.`, 'info');
      setSuspendTarget(null);
      setSuspendReason('');
      void loadData();
    } catch (err) {
      showToast(
        err instanceof ApiClientError ? err.message : 'Gagal menangguhkan akun.',
        'error'
      );
    } finally {
      setModerating(false);
    }
  };

  const handleActivateUser = async (target: AdminUserItem) => {
    try {
      await apiFetch(`/admin/users/${target.id}/status`, {
        method: 'PATCH',
        body: { status: 'active' },
      });
      showToast(`Akun ${target.email} diaktifkan kembali.`, 'success');
      void loadData();
    } catch {
      showToast('Gagal mengaktifkan akun.', 'error');
    }
  };

  if (isLoading || !user || user.role !== 'platform_admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3.5 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--brand-primary)] text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-heading text-[18px] font-bold">
                DagangAI Platform Admin
              </h1>
              <p className="text-[12px] text-[var(--text-muted)]">
                Kontrol Operasional, Kuota AI &amp; Moderasi Akun
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<LogOut className="h-4 w-4" />}
            onClick={logout}
          >
            Keluar
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8">
        {/* 4 Kartu KPI */}
        {overview && (
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
              <p className="tabular-nums font-heading text-[24px] font-bold">
                {overview.users.total_registered} / {overview.users.active_today}
              </p>
              <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                Terdaftar / Aktif Hari Ini
              </p>
            </div>
            <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
              <p className="tabular-nums font-heading text-[24px] font-bold">
                {overview.ai_operations.total_requests_today}
              </p>
              <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                Permintaan AI Hari Ini
              </p>
            </div>
            <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
              <p className="tabular-nums font-heading text-[24px] font-bold text-[var(--brand-primary)]">
                {overview.ai_operations.success_rate_percent}%
              </p>
              <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                Tingkat Keberhasilan AI
              </p>
            </div>
            <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
              <p className="tabular-nums font-heading text-[24px] font-bold">
                {overview.ai_operations.estimated_tokens_today.toLocaleString('id-ID')}
              </p>
              <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                Estimasi Token Hari Ini
              </p>
            </div>
          </section>
        )}

        {/* Kontrol Runtime AI & Global Circuit Breaker */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <form
            onSubmit={handleSaveConfig}
            className="space-y-4 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5"
          >
            <h2 className="font-heading text-[16px] font-semibold">
              Konfigurasi Kuota &amp; Rate Limit
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Kuota Kredit Harian (WIB)"
                type="number"
                min={0}
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
              />
              <Input
                label="Rate Limit / Menit / Akun"
                type="number"
                min={1}
                value={rateLimit}
                onChange={(e) => setRateLimit(Number(e.target.value))}
              />
            </div>
            <Textarea
              label="Pesan Pemeliharaan Circuit Breaker"
              value={circuitMessage}
              onChange={(e) => setCircuitMessage(e.target.value.slice(0, 300))}
            />
            <Button type="submit" variant="primary" isLoading={savingConfig}>
              Simpan Konfigurasi
            </Button>
          </form>

          <div className="flex flex-col justify-between rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-[16px] font-semibold">
                  Global Circuit Breaker
                </h2>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-[12px] font-semibold',
                    circuitOpen
                      ? 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]'
                      : 'bg-[var(--status-published-bg)] text-[var(--status-published-text)]'
                  )}
                >
                  {circuitOpen ? 'AKTIF (AI Dimatikan)' : 'NONAKTIF (AI Normal)'}
                </span>
              </div>
              <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                Aktifkan sakelar darurat ini untuk menghentikan sementara seluruh panggilan
                LLM eksternal jika terjadi lonjakan biaya atau gangguan penyedia AI. Fitur
                non-AI tetap berjalan normal.
              </p>
            </div>
            <div className="pt-4">
              <Button
                variant={circuitOpen ? 'primary' : 'danger'}
                leftIcon={
                  circuitOpen ? (
                    <ShieldCheck className="h-4 w-4" />
                  ) : (
                    <ShieldAlert className="h-4 w-4" />
                  )
                }
                onClick={() => setCircuitConfirmOpen(true)}
              >
                {circuitOpen
                  ? 'Matikan Circuit Breaker (Aktifkan AI)'
                  : 'Aktifkan Global Circuit Breaker'}
              </Button>
            </div>
          </div>
        </section>

        {/* Tabel Log AI */}
        <section className="space-y-3 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-heading text-[16px] font-semibold">
              Log Pemakaian AI Terbaru
            </h2>
            <select
              value={logStatusFilter}
              onChange={(e) => setLogStatusFilter(e.target.value)}
              className="min-h-[40px] rounded-[8px] border border-[var(--border-strong)] px-3 text-[14px]"
            >
              <option value="">Semua Status</option>
              <option value="success">success</option>
              <option value="failed">failed</option>
              <option value="rate_limited">rate_limited</option>
              <option value="quota_exceeded">quota_exceeded</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-[var(--border-default)] text-[var(--text-muted)]">
                <tr>
                  <th className="py-2 pr-3">Waktu</th>
                  <th className="py-2 pr-3">Fitur</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Kredit</th>
                  <th className="py-2">Latensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="tabular-nums py-2 pr-3">
                      {new Date(log.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="py-2 pr-3">{log.feature}</td>
                    <td className="py-2 pr-3 font-medium">{log.status}</td>
                    <td className="tabular-nums py-2 pr-3">{log.credits_charged}</td>
                    <td className="tabular-nums py-2">
                      {log.latency_ms ? `${log.latency_ms} ms` : '-'}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-[var(--text-muted)]">
                      Belum ada log pemakaian AI.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Moderasi Akun */}
        <section className="space-y-3 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
          <h2 className="font-heading text-[16px] font-semibold">
            Moderasi Akun Pengguna
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-[var(--border-default)] text-[var(--text-muted)]">
                <tr>
                  <th className="py-2 pr-3">Nama</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2.5 pr-3 font-medium">{u.full_name}</td>
                    <td className="py-2.5 pr-3">{u.email}</td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                          u.status === 'active'
                            ? 'bg-[var(--status-published-bg)] text-[var(--status-published-text)]'
                            : 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]'
                        )}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-2.5">
                      {u.status === 'active' ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setSuspendTarget(u)}
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void handleActivateUser(u)}
                        >
                          Aktifkan
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Dialog Konfirmasi Circuit Breaker */}
      <ModalOrSheet
        open={circuitConfirmOpen}
        onClose={() => setCircuitConfirmOpen(false)}
        title="Konfirmasi Global Circuit Breaker"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCircuitConfirmOpen(false)}>
              Batal
            </Button>
            <Button
              variant={circuitOpen ? 'primary' : 'danger'}
              isLoading={savingConfig}
              onClick={() => void handleToggleCircuitBreaker()}
            >
              Ya, Lanjutkan
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-[var(--text-secondary)]">
          {circuitOpen
            ? 'Aktifkan kembali layanan AI untuk seluruh pengguna?'
            : 'Yakin ingin memutus sementara seluruh layanan AI (Global Circuit Breaker)? Pengguna tetap dapat mengakses fitur non-AI.'}
        </p>
      </ModalOrSheet>

      {/* Dialog Suspend Akun */}
      <ModalOrSheet
        open={Boolean(suspendTarget)}
        onClose={() => setSuspendTarget(null)}
        title="Tangguhkan Akun Pengguna"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSuspendTarget(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              isLoading={moderating}
              disabled={suspendReason.trim().length < 5}
              onClick={() => void handleSuspendUser()}
            >
              Tangguhkan Akun
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-[13px] text-[var(--text-secondary)]">
            Akun <strong>{suspendTarget?.email}</strong> tidak akan dapat mengakses
            layanan hingga diaktifkan kembali.
          </p>
          <Textarea
            label="Alasan Penangguhan (Wajib, min. 5 karakter)"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value.slice(0, 300))}
            required
          />
        </div>
      </ModalOrSheet>
    </div>
  );
}
