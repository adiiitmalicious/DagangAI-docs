'use client';

import type { ContentStatus, ContentType, MarketingChannel } from '@dagangai/shared';
import {
  CalendarPlus,
  Copy,
  CopyPlus,
  FolderOpen,
  Palette,
  Pencil,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { Input, Select, Textarea } from '@/components/ui/FormFields';
import { ModalOrSheet } from '@/components/ui/ModalOrSheet';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { AuthGuard } from '@/lib/auth-context';
import { cn } from '@/lib/cn';
import {
  CHANNEL_LABELS,
  CHANNEL_OPTIONS,
  CONTENT_TYPE_LABELS,
} from '@/lib/content-constants';

interface ContentItem {
  id: string;
  title: string;
  content_type: ContentType;
  channel: MarketingChannel;
  status: ContentStatus;
  headline: string | null;
  body: string;
  cta: string | null;
  hashtags: string[];
  source: string;
  product: {
    id: string | null;
    name: string;
    is_deleted: boolean;
  } | null;
  updated_at: string;
}

export default function LibraryPage() {
  const { showToast } = useToast();

  const [tab, setTab] = useState<'all' | 'text' | 'design'>('all');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [designs, setDesigns] = useState<
    Array<{ id: string; title: string; aspect_ratio: string; updated_at: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');

  // Modal Edit
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editStatus, setEditStatus] = useState<ContentStatus>('draft');
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal Hapus
  const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchContents = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'design') {
        const dList = await apiFetch<
          Array<{ id: string; title: string; aspect_ratio: string; updated_at: string }>
        >('/designs');
        setDesigns(dList);
        return;
      }
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('search', search.trim());
      if (statusFilter) qs.set('status', statusFilter);
      if (channelFilter) qs.set('channel', channelFilter);
      const data = await apiFetch<ContentItem[]>(`/contents?${qs.toString()}`);
      setItems(data);
    } catch {
      showToast('Gagal memuat Pustaka Materi.', 'error');
    } finally {
      setLoading(false);
    }
  }, [tab, search, statusFilter, channelFilter, showToast]);

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchContents();
    }, 200);
    return () => clearTimeout(t);
  }, [fetchContents]);

  const handleCopy = async (item: ContentItem) => {
    await navigator.clipboard.writeText(item.body);
    showToast('Teks disalin! Siap ditempel ke Instagram atau WhatsApp Anda.', 'success');
  };

  const handleDuplicate = async (item: ContentItem) => {
    try {
      await apiFetch(`/contents/${item.id}/duplicate`, { method: 'POST' });
      showToast('Materi berhasil diduplikasi sebagai Draf.', 'success');
      void fetchContents();
    } catch {
      showToast('Gagal menduplikasi materi.', 'error');
    }
  };

  const openEdit = (item: ContentItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditBody(item.body);
    setEditStatus(item.status);
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setSavingEdit(true);
    try {
      await apiFetch(`/contents/${editingItem.id}`, {
        method: 'PATCH',
        body: {
          title: editTitle.trim(),
          body: editBody.trim(),
          status: editStatus,
        },
      });
      showToast('Materi berhasil diperbarui.', 'success');
      setEditingItem(null);
      void fetchContents();
    } catch (err) {
      showToast(
        err instanceof ApiClientError ? err.message : 'Gagal memperbarui materi.',
        'error'
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/contents/${deleteTarget.id}`, { method: 'DELETE' });
      showToast('Materi dihapus dari Pustaka Materi.', 'info');
      setDeleteTarget(null);
      void fetchContents();
    } catch {
      showToast('Gagal menghapus materi.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AuthGuard>
      <AppShell pageTitle="Pustaka Materi">
        <div className="space-y-5">
          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-[var(--border-default)] pb-3">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'text', label: 'Materi Teks' },
              { id: 'design', label: 'Desain Visual' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as 'all' | 'text' | 'design')}
                className={cn(
                  'min-h-[40px] rounded-full px-4 text-[13px] font-medium transition-colors',
                  tab === t.id
                    ? 'bg-[var(--brand-primary)] text-white'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'design' ? (
            designs.length === 0 ? (
              <EmptyStateCard
                icon={<FolderOpen className="h-6 w-6" />}
                title="Belum ada desain tersimpan"
                description="Buat poster promosi pertama Anda di AI Design Studio lalu simpan."
                actionLabel="Buka Design Studio"
                onAction={() => {
                  window.location.href = '/designs';
                }}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {designs.map((d) => (
                  <article
                    key={d.id}
                    className="flex flex-col justify-between rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-card)]"
                  >
                    <div>
                      <span className="rounded bg-[var(--brand-accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-accent)]">
                        Desain {d.aspect_ratio}
                      </span>
                      <h2 className="mt-2 font-heading text-[16px] font-semibold">
                        {d.title}
                      </h2>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border-default)] pt-3">
                      <Link href={`/designs?design_id=${d.id}`}>
                        <Button variant="secondary" size="sm">
                          Buka di Editor
                        </Button>
                      </Link>
                      <Link href={`/planner?design_id=${d.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<CalendarPlus className="h-3.5 w-3.5" />}
                        >
                          Jadwalkan
                        </Button>
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : (
            <>
              {/* Filter Bar */}
              <div className="flex flex-col gap-2.5 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-card)] sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari judul atau isi materi..."
                    className="min-h-[44px] w-full rounded-[8px] border border-[var(--border-strong)] pr-3 pl-9 text-[16px] md:min-h-[40px] md:text-[14px]"
                  />
                </div>
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="min-h-[44px] rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-[16px] md:min-h-[40px] md:text-[14px]"
                >
                  <option value="">Semua Kanal</option>
                  {CHANNEL_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="min-h-[44px] rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-[16px] md:min-h-[40px] md:text-[14px]"
                >
                  <option value="">Semua Status</option>
                  <option value="draft">Draf</option>
                  <option value="planned">Terjadwal</option>
                  <option value="published">Dipublikasikan</option>
                </select>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[1, 2].map((n) => (
                    <div
                      key={n}
                      className="h-44 animate-pulse rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)]"
                    />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <EmptyStateCard
                  icon={<Sparkles className="h-6 w-6" />}
                  title="Pustaka Materi masih kosong"
                  description="Buat materi promosi pertama Anda di AI Content Studio lalu simpan agar tersusun rapi di sini."
                  actionLabel="Buka AI Content Studio"
                  onAction={() => {
                    window.location.href = '/studio';
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {items.map((item) => (
                    <article
                      key={item.id}
                      className="flex flex-col justify-between rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-card)]"
                    >
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded bg-[var(--brand-primary-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-primary)]">
                            {CONTENT_TYPE_LABELS[item.content_type] ?? item.content_type} •{' '}
                            {CHANNEL_LABELS[item.channel] ?? item.channel}
                          </span>
                          <StatusBadge status={item.status} />
                        </div>

                        <h2 className="font-heading text-[16px] font-semibold text-[var(--text-primary)]">
                          {item.title}
                        </h2>

                        {item.product && (
                          <p className="text-[12px] text-[var(--text-muted)]">
                            Produk: <strong>{item.product.name}</strong>
                            {item.product.is_deleted && (
                              <span className="ml-1.5 rounded bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[11px] text-[var(--text-secondary)]">
                                (Produk dihapus)
                              </span>
                            )}
                          </p>
                        )}

                        <p className="line-clamp-3 whitespace-pre-line text-[13px] leading-relaxed text-[var(--text-secondary)]">
                          {item.body}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border-default)] pt-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Copy className="h-3.5 w-3.5" />}
                          onClick={() => void handleCopy(item)}
                        >
                          Salin
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Pencil className="h-3.5 w-3.5" />}
                          onClick={() => openEdit(item)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<CopyPlus className="h-3.5 w-3.5" />}
                          onClick={() => void handleDuplicate(item)}
                        >
                          Duplikasi
                        </Button>
                        <Link href={`/designs?content_id=${item.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Palette className="h-3.5 w-3.5" />}
                          >
                            Desain
                          </Button>
                        </Link>
                        <Link href={`/planner?content_id=${item.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<CalendarPlus className="h-3.5 w-3.5" />}
                          >
                            Jadwalkan
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(item)}
                          aria-label={`Hapus ${item.title}`}
                        >
                          <Trash2 className="h-4 w-4 text-[var(--status-danger-text)]" />
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Edit Materi */}
        <ModalOrSheet
          open={Boolean(editingItem)}
          onClose={() => setEditingItem(null)}
          title="Edit Materi Konten"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <Input
              label="Judul Materi"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value.slice(0, 150))}
              required
            />
            <Select
              label="Status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as ContentStatus)}
            >
              <option value="draft">Draf</option>
              <option value="planned">Terjadwal</option>
              <option value="published">Dipublikasikan</option>
            </Select>
            <Textarea
              label="Isi Materi"
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={7}
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditingItem(null)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" isLoading={savingEdit}>
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </ModalOrSheet>

        {/* Modal Konfirmasi Hapus */}
        <ModalOrSheet
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title="Hapus Materi"
          footer={
            <>
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
                Batal
              </Button>
              <Button
                variant="danger"
                isLoading={deleting}
                onClick={() => void handleDelete()}
              >
                Ya, Hapus Materi
              </Button>
            </>
          }
        >
          <p className="text-[14px] text-[var(--text-secondary)]">
            Hapus materi <strong>{deleteTarget?.title}</strong> dari Pustaka Materi?
          </p>
        </ModalOrSheet>
      </AppShell>
    </AuthGuard>
  );
}
