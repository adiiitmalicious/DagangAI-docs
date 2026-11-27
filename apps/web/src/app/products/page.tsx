'use client';

import type { AvailabilityStatus, ProductType } from '@dagangai/shared';
import {
  ImagePlus,
  Package,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { Input, Select, Textarea } from '@/components/ui/FormFields';
import { ModalOrSheet } from '@/components/ui/ModalOrSheet';
import { useToast } from '@/components/ui/Toast';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { AuthGuard } from '@/lib/auth-context';
import { cn } from '@/lib/cn';

interface ProductImage {
  id: string;
  url: string;
  is_primary: boolean;
}

interface ProductListItem {
  id: string;
  name: string;
  type: ProductType;
  category: string | null;
  description: string;
  pricing: {
    currency: string;
    price_min: number | null;
    price_max: number | null;
    display_label: string | null;
  };
  key_benefits: string[];
  availability_status: AvailabilityStatus;
  primary_image_url: string | null;
  images_count: number;
  contents_count: number;
}

interface ProductDetail extends Omit<ProductListItem, 'primary_image_url' | 'images_count' | 'contents_count'> {
  images: ProductImage[];
}

const AVAILABILITY_BADGE: Record<
  AvailabilityStatus,
  { label: string; className: string }
> = {
  available: {
    label: 'Tersedia',
    className: 'bg-[var(--status-published-bg)] text-[var(--status-published-text)]',
  },
  preorder: {
    label: 'Pre-Order',
    className: 'bg-[var(--status-planned-bg)] text-[var(--status-planned-text)]',
  },
  unavailable: {
    label: 'Tidak Tersedia',
    className: 'bg-[var(--status-draft-bg)] text-[var(--status-draft-text)]',
  },
};

export default function ProductsPage() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modal Tambah / Edit Produk
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState<ProductType>('product');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [benefits, setBenefits] = useState<string[]>([]);
  const [benefitDraft, setBenefitDraft] = useState('');
  const [availability, setAvailability] = useState<AvailabilityStatus>('available');

  // Foto produk: saat tambah baru disimpan sementara di pendingFiles, saat edit langsung ke API
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingImg, setUploadingImg] = useState(false);

  // Modal Konfirmasi Hapus
  const [deleteTarget, setDeleteTarget] = useState<ProductListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('search', search.trim());
      if (typeFilter) qs.set('type', typeFilter);
      if (statusFilter) qs.set('availability_status', statusFilter);
      const data = await apiFetch<ProductListItem[]>(`/products?${qs.toString()}`);
      setProducts(data);
    } catch {
      showToast('Gagal memuat daftar produk.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter, showToast]);

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchProducts();
    }, 200);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setType('product');
    setCategory('');
    setDescription('');
    setPriceMin('');
    setPriceMax('');
    setBenefits([]);
    setBenefitDraft('');
    setAvailability('available');
    setExistingImages([]);
    setPendingFiles([]);
  };

  const openCreateModal = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEditModal = async (item: ProductListItem) => {
    resetForm();
    setEditingId(item.id);
    setFormOpen(true);
    try {
      const detail = await apiFetch<ProductDetail>(`/products/${item.id}`);
      setName(detail.name);
      setType(detail.type);
      setCategory(detail.category ?? '');
      setDescription(detail.description);
      setPriceMin(
        detail.pricing.price_min !== null ? String(detail.pricing.price_min) : ''
      );
      setPriceMax(
        detail.pricing.price_max !== null ? String(detail.pricing.price_max) : ''
      );
      setBenefits(detail.key_benefits ?? []);
      setAvailability(detail.availability_status);
      setExistingImages(detail.images ?? []);
    } catch {
      showToast('Gagal memuat detail produk.', 'error');
      setFormOpen(false);
    }
  };

  const handleSelectImage = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Format foto harus JPG, PNG, atau WebP.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran foto melebihi batas maksimal 5 MB.', 'error');
      return;
    }

    const totalCount = existingImages.length + pendingFiles.length;
    if (totalCount >= 3) {
      showToast('Maksimal 3 foto per produk.', 'warning');
      return;
    }

    if (editingId) {
      setUploadingImg(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const uploaded = await apiFetch<ProductImage>(`/products/${editingId}/images`, {
          method: 'POST',
          body: fd,
        });
        setExistingImages((prev) => [...prev, uploaded]);
        showToast('Foto produk berhasil diunggah.', 'success');
        void fetchProducts();
      } catch (err) {
        showToast(
          err instanceof ApiClientError ? err.message : 'Gagal mengunggah foto.',
          'error'
        );
      } finally {
        setUploadingImg(false);
      }
    } else {
      setPendingFiles((prev) => [...prev, file]);
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    if (!editingId) return;
    try {
      await apiFetch(`/products/${editingId}/images/${imageId}/primary`, {
        method: 'PATCH',
      });
      setExistingImages((prev) =>
        prev.map((img) => ({ ...img, is_primary: img.id === imageId }))
      );
      void fetchProducts();
      showToast('Foto utama diperbarui.', 'success');
    } catch {
      showToast('Gagal mengubah foto utama.', 'error');
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!editingId) return;
    try {
      await apiFetch(`/products/${editingId}/images/${imageId}`, {
        method: 'DELETE',
      });
      const detail = await apiFetch<ProductDetail>(`/products/${editingId}`);
      setExistingImages(detail.images ?? []);
      void fetchProducts();
      showToast('Foto dihapus.', 'info');
    } catch {
      showToast('Gagal menghapus foto.', 'error');
    }
  };

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const minVal = priceMin.trim() ? Number(priceMin) : null;
      const maxVal = priceMax.trim() ? Number(priceMax) : null;

      const payload = {
        name: name.trim(),
        type,
        category: category.trim() || null,
        description: description.trim(),
        pricing: {
          price_min: minVal,
          price_max: maxVal,
        },
        key_benefits: benefits,
        availability_status: availability,
      };

      if (editingId) {
        await apiFetch(`/products/${editingId}`, {
          method: 'PATCH',
          body: payload,
        });
        showToast('Produk berhasil diperbarui.', 'success');
      } else {
        const created = await apiFetch<{ id: string }>('/products', {
          method: 'POST',
          body: payload,
        });
        for (const file of pendingFiles) {
          const fd = new FormData();
          fd.append('file', file);
          await apiFetch(`/products/${created.id}/images`, {
            method: 'POST',
            body: fd,
          });
        }
        showToast('Produk baru berhasil ditambahkan.', 'success');
      }

      setFormOpen(false);
      resetForm();
      void fetchProducts();
    } catch (err) {
      showToast(
        err instanceof ApiClientError ? err.message : 'Gagal menyimpan produk.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/products/${deleteTarget.id}`, { method: 'DELETE' });
      showToast('Produk dihapus dari katalog aktif.', 'info');
      setDeleteTarget(null);
      void fetchProducts();
    } catch {
      showToast('Gagal menghapus produk.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AuthGuard>
      <AppShell pageTitle="Produk & Layanan">
        <div className="space-y-5">
          {/* Top Bar Search & Filter */}
          <div className="flex flex-col gap-3 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-card)] md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-2.5 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama atau kategori produk..."
                  className="min-h-[44px] w-full rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-surface)] pr-3 pl-9 text-[16px] md:min-h-[40px] md:text-[14px]"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter tipe"
                className="min-h-[44px] rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-[16px] md:min-h-[40px] md:text-[14px]"
              >
                <option value="">Semua Tipe</option>
                <option value="product">Produk</option>
                <option value="service">Layanan</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter status ketersediaan"
                className="min-h-[44px] rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-[16px] md:min-h-[40px] md:text-[14px]"
              >
                <option value="">Semua Status</option>
                <option value="available">Tersedia</option>
                <option value="preorder">Pre-Order</option>
                <option value="unavailable">Tidak Tersedia</option>
              </select>
            </div>

            <Button
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={openCreateModal}
              className="shrink-0"
            >
              Tambah Produk
            </Button>
          </div>

          {/* List Produk */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-64 animate-pulse rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)]"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <EmptyStateCard
              icon={<Package className="h-6 w-6" />}
              title="Belum ada produk atau layanan"
              description="Tambahkan produk atau layanan pertama Anda lengkap dengan harga dan foto agar siap dibuatkan materi promosi AI."
              actionLabel="Tambah Produk Pertama"
              onAction={openCreateModal}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((item) => {
                const badge = AVAILABILITY_BADGE[item.availability_status];
                return (
                  <article
                    key={item.id}
                    className="flex flex-col overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-card)]"
                  >
                    <div className="relative aspect-[4/3] w-full bg-[var(--bg-subtle)]">
                      {item.primary_image_url ? (
                        <img
                          src={item.primary_image_url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                          <ImagePlus className="h-8 w-8" aria-hidden="true" />
                        </div>
                      )}
                      <span
                        className={cn(
                          'absolute top-2.5 left-2.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                          badge.className
                        )}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="font-heading text-[16px] font-semibold text-[var(--text-primary)] line-clamp-1">
                          {item.name}
                        </h2>
                        <span className="shrink-0 rounded bg-[var(--bg-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
                          {item.type === 'service' ? 'Layanan' : 'Produk'}
                        </span>
                      </div>

                      <p className="tabular-nums mt-1 text-[14px] font-semibold text-[var(--brand-primary)]">
                        {item.pricing.display_label ?? (
                          <span className="font-normal text-[var(--text-muted)]">
                            Harga belum diatur
                          </span>
                        )}
                      </p>

                      <p className="mt-2 line-clamp-2 flex-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                        {item.description}
                      </p>

                      <p className="tabular-nums mt-2 text-[12px] text-[var(--text-muted)]">
                        {item.images_count} foto • {item.contents_count} materi tersimpan
                      </p>

                      <div className="mt-4 flex items-center gap-2 border-t border-[var(--border-default)] pt-3">
                        <Link
                          href={`/studio?product_id=${item.id}`}
                          className="flex-1"
                        >
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                            className="w-full"
                          >
                            Buat Konten
                          </Button>
                        </Link>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void openEditModal(item)}
                          aria-label={`Ubah ${item.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(item)}
                          aria-label={`Hapus ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4 text-[var(--status-danger-text)]" />
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Form Tambah / Ubah Produk */}
        <ModalOrSheet
          open={formOpen}
          onClose={() => setFormOpen(false)}
          title={editingId ? 'Ubah Produk / Layanan' : 'Tambah Produk / Layanan'}
          className="md:max-w-2xl"
        >
          <form onSubmit={handleSaveProduct} className="space-y-4">
            <Input
              label="Nama Produk / Layanan"
              placeholder="Contoh: Es Kopi Susu Gula Aren"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 120))}
              required
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select
                label="Tipe"
                value={type}
                onChange={(e) => setType(e.target.value as ProductType)}
              >
                <option value="product">Produk</option>
                <option value="service">Layanan</option>
              </Select>
              <Input
                label="Kategori (Opsional)"
                placeholder="Contoh: Kopi"
                value={category}
                onChange={(e) => setCategory(e.target.value.slice(0, 80))}
              />
              <Select
                label="Ketersediaan"
                value={availability}
                onChange={(e) => setAvailability(e.target.value as AvailabilityStatus)}
              >
                <option value="available">Tersedia</option>
                <option value="preorder">Pre-Order</option>
                <option value="unavailable">Tidak Tersedia</option>
              </Select>
            </div>

            <Textarea
              label="Deskripsi Produk"
              placeholder="Jelaskan bahan, ukuran, atau detail layanan Anda."
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              charCount={{ current: description.length, max: 500 }}
              required
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Harga Minimal (Rp, Opsional)"
                type="number"
                min={0}
                placeholder="18000"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
              />
              <Input
                label="Harga Maksimal (Rp, Opsional)"
                type="number"
                min={0}
                placeholder="22000"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
              />
            </div>

            {/* Keunggulan */}
            <div className="space-y-2">
              <label className="text-[14px] font-medium text-[var(--text-primary)]">
                Keunggulan Utama (Maks. 5)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={benefitDraft}
                  onChange={(e) => setBenefitDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (benefitDraft.trim() && benefits.length < 5) {
                        setBenefits((p) => [...p, benefitDraft.trim().slice(0, 120)]);
                        setBenefitDraft('');
                      }
                    }
                  }}
                  placeholder="Contoh: Gula aren murni tanpa pemanis buatan"
                  className="min-h-[44px] flex-1 rounded-[8px] border border-[var(--border-strong)] px-3 text-[16px] md:min-h-[40px] md:text-[14px]"
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (benefitDraft.trim() && benefits.length < 5) {
                      setBenefits((p) => [...p, benefitDraft.trim().slice(0, 120)]);
                      setBenefitDraft('');
                    }
                  }}
                  disabled={benefits.length >= 5 || !benefitDraft.trim()}
                >
                  Tambah
                </Button>
              </div>
              {benefits.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {benefits.map((b, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-primary-soft)] px-3 py-1 text-[12px] font-medium text-[var(--brand-primary)]"
                    >
                      {b}
                      <button
                        type="button"
                        onClick={() => setBenefits((p) => p.filter((_, idx) => idx !== i))}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Foto Produk (Maks. 3, <= 5 MB) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[14px] font-medium text-[var(--text-primary)]">
                  Foto Produk (Maks. 3, JPG/PNG/WebP ≤ 5 MB)
                </label>
                <span className="tabular-nums text-[12px] text-[var(--text-muted)]">
                  {existingImages.length + pendingFiles.length}/3
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleSelectImage(f);
                  e.target.value = '';
                }}
              />

              <div className="grid grid-cols-3 gap-2.5">
                {existingImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative overflow-hidden rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-subtle)]"
                  >
                    <img
                      src={img.url}
                      alt="Foto produk"
                      className="aspect-square w-full object-cover"
                    />
                    <div className="flex items-center justify-between gap-1 bg-white/95 px-1.5 py-1">
                      <button
                        type="button"
                        onClick={() => void handleSetPrimary(img.id)}
                        className={cn(
                          'inline-flex items-center gap-1 text-[11px] font-medium',
                          img.is_primary
                            ? 'text-[var(--brand-primary)]'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        )}
                      >
                        <Star
                          className={cn('h-3.5 w-3.5', img.is_primary && 'fill-current')}
                        />
                        {img.is_primary ? 'Utama' : 'Jadikan'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteImage(img.id)}
                        aria-label="Hapus foto"
                        className="text-[var(--status-danger-text)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {pendingFiles.map((f, idx) => (
                  <div
                    key={idx}
                    className="relative flex aspect-square flex-col items-center justify-center rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-subtle)] p-2 text-center"
                  >
                    <span className="line-clamp-2 text-[11px] font-medium text-[var(--text-primary)]">
                      {f.name}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPendingFiles((p) => p.filter((_, i) => i !== idx))
                      }
                      className="mt-1 text-[11px] text-[var(--status-danger-text)] underline"
                    >
                      Batal
                    </button>
                  </div>
                ))}

                {existingImages.length + pendingFiles.length < 3 && (
                  <button
                    type="button"
                    disabled={uploadingImg}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[8px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-canvas)] text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                  >
                    <ImagePlus className="h-5 w-5" />
                    <span>{uploadingImg ? 'Mengunggah...' : 'Tambah Foto'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[var(--border-default)] pt-4">
              <Button variant="ghost" onClick={() => setFormOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" isLoading={saving}>
                {editingId ? 'Simpan Perubahan' : 'Simpan Produk'}
              </Button>
            </div>
          </form>
        </ModalOrSheet>

        {/* Modal Konfirmasi Hapus Produk (BR-10 & design.md §8) */}
        <ModalOrSheet
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title="Hapus Produk"
          footer={
            <>
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
                Batal
              </Button>
              <Button
                variant="danger"
                isLoading={deleting}
                onClick={handleConfirmDelete}
              >
                Ya, Hapus Produk
              </Button>
            </>
          }
        >
          <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
            Hapus produk <strong>{deleteTarget?.name}</strong> dari katalog? Materi promosi
            dan jadwal yang pernah Anda buat tetap tersimpan aman.
          </p>
        </ModalOrSheet>
      </AppShell>
    </AuthGuard>
  );
}
