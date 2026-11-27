'use client';

import type { ContentStatus, MarketingChannel } from '@dagangai/shared';
import {
  CalendarDays,
  List,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState, type FormEvent } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { Input, Select, Textarea } from '@/components/ui/FormFields';
import { ModalOrSheet } from '@/components/ui/ModalOrSheet';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { AuthGuard, useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/cn';
import { CHANNEL_LABELS, CHANNEL_OPTIONS } from '@/lib/content-constants';

interface PlanItem {
  id: string;
  title: string;
  campaign_name: string | null;
  channel: MarketingChannel;
  scheduled_date: string | null;
  status: ContentStatus;
  notes: string | null;
  product: { id: string | null; name: string; is_deleted: boolean } | null;
  linked_content: { id: string | null; title: string | null } | null;
  linked_design: { id: string | null; title: string | null } | null;
}

interface SimpleOption {
  id: string;
  name?: string;
  title?: string;
}

interface AiIdea {
  temp_id: string;
  suggested_date: string;
  title: string;
  channel: MarketingChannel;
  product_id: string | null;
  angle: string;
}

function PlannerContent() {
  const { refreshMe } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [items, setItems] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<SimpleOption[]>([]);
  const [contents, setContents] = useState<SimpleOption[]>([]);
  const [designs, setDesigns] = useState<SimpleOption[]>([]);

  // Modal Tambah/Edit Rencana
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [channel, setChannel] = useState<MarketingChannel>('instagram');
  const [scheduledDate, setScheduledDate] = useState('');
  const [status, setStatus] = useState<ContentStatus>('planned');
  const [productId, setProductId] = useState('');
  const [contentId, setContentId] = useState('');
  const [designId, setDesignId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal Saran Ide AI
  const [ideasModalOpen, setIdeasModalOpen] = useState(false);
  const [ideaStartDate, setIdeaStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [ideaTheme, setIdeaTheme] = useState('');
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [ideas, setIdeas] = useState<AiIdea[]>([]);
  const [selectedIdeaIds, setSelectedIdeaIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingBulk, setSavingBulk] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setViewMode('calendar');
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [planRes, prodRes, cntRes, dsnRes] = await Promise.all([
        apiFetch<PlanItem[]>('/planner/items?limit=100'),
        apiFetch<SimpleOption[]>('/products?limit=50'),
        apiFetch<SimpleOption[]>('/contents?limit=50'),
        apiFetch<SimpleOption[]>('/designs?limit=50'),
      ]);
      setItems(planRes);
      setProducts(prodRes);
      setContents(cntRes);
      setDesigns(dsnRes);
    } catch {
      showToast('Gagal memuat Marketing Planner.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Pre-fill jika datang dari "Jadwalkan di Planner" (FR-20)
  useEffect(() => {
    const qContent = searchParams.get('content_id');
    const qDesign = searchParams.get('design_id');
    const qProduct = searchParams.get('product_id');
    if (qContent || qDesign || qProduct) {
      if (qContent) setContentId(qContent);
      if (qDesign) setDesignId(qDesign);
      if (qProduct) setProductId(qProduct);
      setScheduledDate(new Date().toISOString().slice(0, 10));
      setFormOpen(true);
    }
  }, [searchParams]);

  const handleCreateItem = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/planner/items', {
        method: 'POST',
        body: {
          title: title.trim(),
          campaign_name: campaignName.trim() || null,
          channel,
          scheduled_date: scheduledDate || null,
          status,
          product_id: productId || null,
          content_id: contentId || null,
          design_id: designId || null,
          notes: notes.trim() || null,
        },
      });
      showToast('Rencana konten ditambahkan!', 'success');
      setFormOpen(false);
      setTitle('');
      setNotes('');
      void loadAll();
    } catch (err) {
      showToast(
        err instanceof ApiClientError ? err.message : 'Gagal menyimpan jadwal.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCycleStatus = async (item: PlanItem) => {
    const next: ContentStatus =
      item.status === 'draft'
        ? 'planned'
        : item.status === 'planned'
          ? 'published'
          : 'draft';

    const fallbackDate =
      item.scheduled_date ?? new Date().toISOString().slice(0, 10);

    try {
      await apiFetch(`/planner/items/${item.id}/status`, {
        method: 'PATCH',
        body: {
          status: next,
          scheduled_date: next === 'planned' ? fallbackDate : item.scheduled_date,
        },
      });
      showToast(`Status diubah ke ${next === 'published' ? 'Dipublikasikan' : next === 'planned' ? 'Terjadwal' : 'Draf'}.`, 'success');
      void loadAll();
    } catch (err) {
      showToast(
        err instanceof ApiClientError ? err.message : 'Gagal mengubah status.',
        'error'
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/planner/items/${id}`, { method: 'DELETE' });
      showToast('Item rencana dihapus.', 'info');
      void loadAll();
    } catch {
      showToast('Gagal menghapus item rencana.', 'error');
    }
  };

  const handleGenerateIdeas = async () => {
    setGeneratingIdeas(true);
    try {
      const res = await apiFetch<{
        recommendation_notice: string;
        ideas: AiIdea[];
      }>('/ai/planner/ideas', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: {
          start_date: ideaStartDate,
          days_count: 7,
          ideas_count: 5,
          campaign_theme: ideaTheme.trim() || null,
          product_ids: productId ? [productId] : undefined,
        },
      });
      setIdeas(res.ideas);
      setNotice(res.recommendation_notice);
      setSelectedIdeaIds(res.ideas.map((i) => i.temp_id));
      await refreshMe();
    } catch (err) {
      showToast(
        err instanceof ApiClientError
          ? err.message
          : 'Gagal membuat ide mingguan AI. Kuota tidak berkurang.',
        'error'
      );
    } finally {
      setGeneratingIdeas(false);
    }
  };

  const handleSaveBulkIdeas = async () => {
    const picked = ideas.filter((i) => selectedIdeaIds.includes(i.temp_id));
    if (picked.length === 0) return;
    setSavingBulk(true);
    try {
      await apiFetch('/planner/items/bulk', {
        method: 'POST',
        body: {
          campaign_name: ideaTheme.trim() || 'Rencana Mingguan AI',
          default_status: 'planned',
          items: picked.map((i) => ({
            title: i.title,
            channel: i.channel,
            scheduled_date: i.suggested_date,
            product_id: i.product_id,
            notes: i.angle,
          })),
        },
      });
      showToast(`${picked.length} ide disimpan ke Marketing Planner!`, 'success');
      setIdeasModalOpen(false);
      setIdeas([]);
      void loadAll();
    } catch {
      showToast('Gagal menyimpan ide terpilih.', 'error');
    } finally {
      setSavingBulk(false);
    }
  };

  // Grouping by scheduled_date for Calendar/List
  const groupedByDate = items.reduce<Record<string, PlanItem[]>>((acc, item) => {
    const key = item.scheduled_date ?? 'Belum Dijadwalkan';
    acc[key] = acc[key] ? [...acc[key], item] : [item];
    return acc;
  }, {});

  return (
    <AuthGuard>
      <AppShell pageTitle="Marketing Planner">
        <div className="space-y-5">
          {/* Header Bar */}
          <div className="flex flex-col gap-3 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'inline-flex min-h-[40px] items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-medium',
                  viewMode === 'list'
                    ? 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                )}
              >
                <List className="h-4 w-4" />
                Daftar
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={cn(
                  'inline-flex min-h-[40px] items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-medium',
                  viewMode === 'calendar'
                    ? 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                )}
              >
                <CalendarDays className="h-4 w-4" />
                Kalender
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Sparkles className="h-4 w-4 text-[var(--brand-accent)]" />}
                onClick={() => setIdeasModalOpen(true)}
              >
                ✨ Saran Ide Mingguan AI
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setFormOpen(true)}
              >
                + Tambah Rencana
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="h-44 animate-pulse rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)]" />
          ) : items.length === 0 ? (
            <EmptyStateCard
              icon={<CalendarDays className="h-6 w-6" />}
              title="Belum ada jadwal konten"
              description="Tambahkan rencana publikasi secara manual atau minta rekomendasi ide mingguan dari AI."
              actionLabel="Tambah Rencana Pertama"
              onAction={() => setFormOpen(true)}
            />
          ) : viewMode === 'calendar' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(groupedByDate).map(([dateKey, group]) => (
                <section
                  key={dateKey}
                  className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-card)]"
                >
                  <h2 className="tabular-nums border-b border-[var(--border-default)] pb-2 font-heading text-[14px] font-bold text-[var(--brand-primary)]">
                    {dateKey}
                  </h2>
                  <div className="mt-3 space-y-2.5">
                    {group.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-canvas)] p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                            {item.title}
                          </p>
                          <button
                            type="button"
                            onClick={() => void handleDelete(item.id)}
                            aria-label="Hapus item"
                            className="text-[var(--text-muted)] hover:text-[var(--status-danger-text)]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                          {CHANNEL_LABELS[item.channel] ?? item.channel}
                          {item.product && ` • ${item.product.name}`}
                        </p>
                        <div className="mt-2.5">
                          <button
                            type="button"
                            onClick={() => void handleCycleStatus(item)}
                            title="Ketuk untuk mengubah status"
                          >
                            <StatusBadge status={item.status} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col justify-between gap-3 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--text-muted)]">
                      <span className="tabular-nums font-semibold text-[var(--brand-primary)]">
                        {item.scheduled_date ?? 'Belum Dijadwalkan'}
                      </span>
                      <span>•</span>
                      <span>{CHANNEL_LABELS[item.channel] ?? item.channel}</span>
                      {item.product && (
                        <>
                          <span>•</span>
                          <span>{item.product.name}</span>
                        </>
                      )}
                    </div>
                    <h2 className="font-heading text-[15px] font-semibold text-[var(--text-primary)]">
                      {item.title}
                    </h2>
                    {(item.linked_content || item.linked_design) && (
                      <p className="text-[12px] text-[var(--text-secondary)]">
                        Tertaut:{' '}
                        {[item.linked_content?.title, item.linked_design?.title]
                          .filter(Boolean)
                          .join(' + ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCycleStatus(item)}
                      className="min-h-[44px] px-1"
                    >
                      <StatusBadge status={item.status} />
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleDelete(item.id)}
                      aria-label="Hapus rencana"
                    >
                      <Trash2 className="h-4 w-4 text-[var(--status-danger-text)]" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Modal Tambah Rencana */}
        <ModalOrSheet
          open={formOpen}
          onClose={() => setFormOpen(false)}
          title="Tambah Rencana Konten"
        >
          <form onSubmit={handleCreateItem} className="space-y-4">
            <Input
              label="Judul Rencana"
              placeholder="Contoh: Posting Feed Sore — Es Kopi Susu"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 150))}
              required
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                label="Kanal"
                value={channel}
                onChange={(e) => setChannel(e.target.value as MarketingChannel)}
              >
                {CHANNEL_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
              <Select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ContentStatus)}
              >
                <option value="draft">Draf</option>
                <option value="planned">Terjadwal</option>
                <option value="published">Dipublikasikan</option>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Tanggal Target Publikasi"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required={status === 'planned'}
              />
              <Input
                label="Nama Kampanye (Opsional)"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value.slice(0, 120))}
              />
            </div>
            <Select
              label="Tautkan Produk (Opsional)"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">Tidak ada</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Select
              label="Tautkan Materi Teks (Opsional)"
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
            >
              <option value="">Tidak ada</option>
              {contents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
            <Select
              label="Tautkan Desain Visual (Opsional)"
              value={designId}
              onChange={(e) => setDesignId(e.target.value)}
            >
              <option value="">Tidak ada</option>
              {designs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </Select>
            <Textarea
              label="Catatan (Opsional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setFormOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" isLoading={saving}>
                Simpan Rencana
              </Button>
            </div>
          </form>
        </ModalOrSheet>

        {/* Modal Saran Ide Mingguan AI */}
        <ModalOrSheet
          open={ideasModalOpen}
          onClose={() => setIdeasModalOpen(false)}
          title="Saran Ide Mingguan AI (2 Kredit)"
          className="md:max-w-2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Tanggal Mulai"
                type="date"
                value={ideaStartDate}
                onChange={(e) => setIdeaStartDate(e.target.value)}
              />
              <Input
                label="Tema Kampanye (Opsional)"
                placeholder="Contoh: Menu Harian & Edukasi"
                value={ideaTheme}
                onChange={(e) => setIdeaTheme(e.target.value.slice(0, 150))}
              />
            </div>

            <Button
              variant="primary"
              isLoading={generatingIdeas}
              leftIcon={<Sparkles className="h-4 w-4" />}
              onClick={() => void handleGenerateIdeas()}
              className="w-full"
            >
              Buat 5 Rekomendasi Ide Mingguan
            </Button>

            {notice && (
              <p className="rounded-[8px] bg-[var(--bg-subtle)] px-3 py-2 text-[12px] text-[var(--text-secondary)]">
                {notice}
              </p>
            )}

            {ideas.length > 0 && (
              <div className="space-y-2.5">
                {ideas.map((idea) => {
                  const checked = selectedIdeaIds.includes(idea.temp_id);
                  return (
                    <label
                      key={idea.temp_id}
                      className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-[var(--border-default)] p-3 hover:bg-[var(--bg-canvas)]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedIdeaIds((prev) =>
                            checked
                              ? prev.filter((id) => id !== idea.temp_id)
                              : [...prev, idea.temp_id]
                          )
                        }
                        className="mt-1 h-4 w-4"
                      />
                      <div className="text-[13px]">
                        <p className="font-semibold text-[var(--text-primary)]">
                          {idea.suggested_date} • {idea.title}
                        </p>
                        <p className="mt-0.5 text-[var(--text-secondary)]">{idea.angle}</p>
                      </div>
                    </label>
                  );
                })}

                <Button
                  variant="primary"
                  isLoading={savingBulk}
                  disabled={selectedIdeaIds.length === 0}
                  onClick={() => void handleSaveBulkIdeas()}
                  className="w-full"
                >
                  Simpan {selectedIdeaIds.length} Ide Terpilih ke Planner
                </Button>
              </div>
            )}
          </div>
        </ModalOrSheet>
      </AppShell>
    </AuthGuard>
  );
}

export default function PlannerPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[14px]">Memuat Marketing Planner...</div>}>
      <PlannerContent />
    </Suspense>
  );
}
