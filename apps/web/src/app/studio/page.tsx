'use client';

import type {
  BrandTone,
  ContentType,
  MarketingChannel,
  PromoGoal,
  RefinePreset,
} from '@dagangai/shared';
import {
  AlertTriangle,
  BookmarkPlus,
  Copy,
  Palette,
  RefreshCw,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/FormFields';
import { ModalOrSheet } from '@/components/ui/ModalOrSheet';
import { useToast } from '@/components/ui/Toast';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { AuthGuard, useAuth } from '@/lib/auth-context';
import { BRAND_TONE_OPTIONS } from '@/lib/business-constants';
import { cn } from '@/lib/cn';
import {
  CHANNEL_OPTIONS,
  CONTENT_TYPE_OPTIONS,
  PROMO_GOAL_OPTIONS,
  REFINE_PRESET_OPTIONS,
} from '@/lib/content-constants';

interface ProductOption {
  id: string;
  name: string;
}

interface GeneratedVariant {
  variant_index: number;
  angle: string;
  headline: string;
  body: string;
  cta: string;
  hashtags: string[];
  placeholders_detected: string[];
  char_count: number;
  word_count: number;
}

interface GenerateResponse {
  generation_id: string;
  content_type: ContentType;
  channel: MarketingChannel;
  context_summary: {
    business_name: string;
    product_name: string | null;
    brand_tone: string;
  };
  warnings: Array<{ code: string; message: string }>;
  review_notice: string;
  variants: GeneratedVariant[];
  quota: {
    credits_charged: number;
    daily_credits_remaining: number;
    reset_at: string;
  };
}

interface RefineResponse {
  generation_id: string;
  refined_text: string;
  placeholders_detected: string[];
  review_notice: string;
  quota: {
    daily_credits_remaining: number;
  };
}

function extractPlaceholdersClient(text: string): string[] {
  const m = text.match(/\[[^\]\n]{2,50}\]/g);
  return m ? [...new Set(m)] : [];
}

function StudioContent() {
  const { user, refreshMe } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [contentType, setContentType] = useState<ContentType>('social_caption');
  const [productId, setProductId] = useState<string>(
    searchParams.get('product_id') ?? ''
  );
  const [channel, setChannel] = useState<MarketingChannel>('instagram');
  const [promoGoal, setPromoGoal] = useState<PromoGoal>('product_intro');
  const [brandTone, setBrandTone] = useState<BrandTone>('friendly_casual');
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // State Hasil & Edge States
  const [generating, setGenerating] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);
  const [editedText, setEditedText] = useState('');
  const [previousText, setPreviousText] = useState<string | null>(null);

  // Quick Refine
  const [customRefine, setCustomRefine] = useState('');
  const [refining, setRefining] = useState(false);

  // Save & Feedback
  const [saving, setSaving] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<'up' | 'down' | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportNotes, setReportNotes] = useState('');
  const [isFactualIssue, setIsFactualIssue] = useState(true);

  const quotaRemaining = user?.ai_quota?.daily_credits_remaining ?? 30;
  const completenessScore = user?.business_summary?.completeness_score ?? 100;

  useEffect(() => {
    apiFetch<ProductOption[]>('/products?limit=100')
      .then((list) => setProducts(list))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const paramProductId = searchParams.get('product_id');
    if (paramProductId) {
      setProductId(paramProductId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!generating) return;
    setLoadingStage(0);
    const t = setTimeout(() => setLoadingStage(1), 1600);
    return () => clearTimeout(t);
  }, [generating]);

  const selectVariant = (variant: GeneratedVariant, idx: number) => {
    setActiveVariantIdx(idx);
    const fullText = [
      variant.headline ? `${variant.headline}\n\n` : '',
      variant.body,
      variant.cta ? `\n\n${variant.cta}` : '',
      variant.hashtags?.length ? `\n\n${variant.hashtags.join(' ')}` : '',
    ]
      .join('')
      .trim();
    setEditedText(fullText);
    setPreviousText(null);
  };

  const handleGenerate = async (e?: FormEvent) => {
    e?.preventDefault();
    if (quotaRemaining <= 0) return;

    setGenerating(true);
    setProviderError(null);
    setFeedbackSent(null);

    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await apiFetch<GenerateResponse>('/ai/content/generate', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: {
          content_type: contentType,
          product_id: productId || null,
          channel,
          promo_goal: promoGoal,
          brand_tone: brandTone,
          variants_count: 3,
          additional_instructions: additionalInstructions.trim() || null,
        },
      });
      setResult(res);
      if (res.variants.length > 0) {
        selectVariant(res.variants[0], 0);
      }
      await refreshMe();
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      if (err instanceof ApiClientError) {
        if ([502, 503, 504].includes(err.status)) {
          setProviderError(err.message);
        } else {
          showToast(err.message, 'error');
        }
      } else {
        setProviderError(
          'Layanan AI sedang sibuk atau lambat merespons. Kuota AI Anda tidak berkurang. Silakan coba lagi.'
        );
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleQuickRefine = async (preset?: RefinePreset) => {
    if (!editedText.trim() || quotaRemaining <= 0) return;
    if (!preset && !customRefine.trim()) return;

    setRefining(true);
    const before = editedText;
    try {
      const res = await apiFetch<RefineResponse>('/ai/content/refine', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: {
          generation_id: result?.generation_id ?? null,
          product_id: productId || null,
          content_type: contentType,
          channel,
          source_text: editedText,
          refine_preset: preset,
          custom_instruction: preset ? undefined : customRefine.trim(),
        },
      });
      setPreviousText(before);
      setEditedText(res.refined_text);
      if (!preset) setCustomRefine('');
      await refreshMe();
      showToast('Materi berhasil disempurnakan.', 'success');
    } catch (err) {
      showToast(
        err instanceof ApiClientError
          ? err.message
          : 'Gagal menyempurnakan teks. Kuota harian Anda tidak berkurang.',
        'error'
      );
    } finally {
      setRefining(false);
    }
  };

  const handleCopy = async () => {
    if (!editedText.trim()) return;
    await navigator.clipboard.writeText(editedText);
    showToast('Teks disalin! Siap ditempel ke Instagram atau WhatsApp Anda.', 'success');
  };

  const handleSaveToLibrary = async () => {
    if (!editedText.trim()) return;
    setSaving(true);
    try {
      const selectedProd = products.find((p) => p.id === productId);
      const activeVariant = result?.variants[activeVariantIdx];
      const titleBase = selectedProd?.name
        ? `${selectedProd.name} — ${activeVariant?.angle ?? 'Materi AI'}`
        : `Materi Bisnis — ${activeVariant?.angle ?? 'Materi AI'}`;

      await apiFetch('/contents', {
        method: 'POST',
        body: {
          title: titleBase.slice(0, 150),
          content_type: contentType,
          channel,
          product_id: productId || null,
          headline: activeVariant?.headline || null,
          body: editedText,
          cta: activeVariant?.cta || null,
          hashtags: activeVariant?.hashtags ?? [],
          brand_tone: brandTone,
          source: 'ai_generated',
          generation_id: result?.generation_id ?? null,
        },
      });
      showToast('Materi tersimpan ke Pustaka Materi!', 'success');
    } catch (err) {
      showToast(
        err instanceof ApiClientError ? err.message : 'Gagal menyimpan materi.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePositiveFeedback = async () => {
    if (!result?.generation_id) return;
    try {
      await apiFetch('/ai/feedback', {
        method: 'POST',
        body: {
          generation_id: result.generation_id,
          rating: 5,
          is_helpful: true,
          is_factual_issue: false,
        },
      });
      setFeedbackSent('up');
      showToast('Terima kasih atas masukan Anda!', 'success');
    } catch {
      showToast('Gagal mengirim masukan.', 'error');
    }
  };

  const handleSubmitNegativeFeedback = async () => {
    if (!result?.generation_id) return;
    try {
      await apiFetch('/ai/feedback', {
        method: 'POST',
        body: {
          generation_id: result.generation_id,
          rating: 2,
          is_helpful: false,
          is_factual_issue: isFactualIssue,
          issue_categories: isFactualIssue ? ['fabricated_claim'] : ['generic_output'],
          notes: reportNotes.trim() || null,
        },
      });
      setFeedbackSent('down');
      setReportModalOpen(false);
      setReportNotes('');
      showToast('Laporan diterima. Terima kasih membantu kami menjaga kualitas AI.', 'info');
    } catch {
      showToast('Gagal mengirim laporan.', 'error');
    }
  };

  const activeProduct = products.find((p) => p.id === productId);
  const detectedPlaceholders = extractPlaceholdersClient(editedText);
  const charCount = editedText.trim().length;
  const wordCount = editedText.trim() ? editedText.trim().split(/\s+/).length : 0;

  return (
    <AuthGuard>
      <AppShell pageTitle="AI Content Studio">
        <div className="space-y-4">
          {/* Strip Transparansi Konteks Aktif (BR-03 & design.md §6) */}
          <div className="flex flex-col gap-2 rounded-[12px] border border-[var(--border-default)] bg-[var(--brand-primary-soft)] px-4 py-3 text-[13px] text-[var(--brand-primary)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="font-medium">Konteks Aktif:</span>
              <span className="font-semibold">
                {user?.business_summary?.name ?? 'Usaha Anda'}
              </span>
              <span>•</span>
              <span>{activeProduct ? activeProduct.name : 'Promosi Bisnis Umum'}</span>
              <span>•</span>
              <span>
                {BRAND_TONE_OPTIONS.find((t) => t.value === brandTone)?.label ?? brandTone}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[12px] font-semibold">
              <Link href="/business" className="underline">
                Ubah Profil
              </Link>
              <button
                type="button"
                onClick={() =>
                  document.getElementById('studio-product-select')?.focus()
                }
                className="underline"
              >
                Ganti Produk
              </button>
            </div>
          </div>

          {/* Peringatan Konteks Minim */}
          {completenessScore < 50 && (
            <div className="flex items-start gap-2.5 rounded-[10px] border border-[#FDE68A] bg-[var(--status-planned-bg)] px-4 py-3 text-[13px] text-[var(--status-planned-text)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Profil bisnis masih singkat ({completenessScore}%). Hasil AI tetap bisa
                dibuat, namun akan jauh lebih relevan jika{' '}
                <Link href="/business" className="font-semibold underline">
                  profil dilengkapi
                </Link>
                .
              </span>
            </div>
          )}

          {/* Kuota Habis (0) Banner */}
          {quotaRemaining <= 0 && (
            <div className="rounded-[12px] border border-[#FECACA] bg-[var(--status-danger-bg)] px-4 py-3 text-[13px] text-[var(--status-danger-text)]">
              <strong>Kuota AI harian Anda sudah habis</strong> dan akan diisi ulang pukul
              00.00 WIB. Anda tetap bisa mengedit materi di Pustaka Materi, memakai template
              desain manual, dan mengatur jadwal.
            </div>
          )}

          {/* Desktop 2-Pane Split (42% Kiri / 58% Kanan) */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Pane Kiri: Form Parameter */}
            <form
              onSubmit={handleGenerate}
              className="space-y-4 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-card)] md:p-5 lg:col-span-5"
            >
              <div className="space-y-2">
                <label className="text-[14px] font-medium text-[var(--text-primary)]">
                  1. Jenis Materi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CONTENT_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setContentType(opt.value)}
                      className={cn(
                        'min-h-[44px] rounded-[8px] border px-2.5 py-2 text-left text-[13px] font-medium transition-colors',
                        contentType === opt.value
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]'
                          : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <Select
                id="studio-product-select"
                label="2. Produk / Layanan"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value="">Promosi Bisnis Umum (Tanpa produk spesifik)</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select
                  label="3. Kanal Target"
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
                  label="Tujuan Promosi"
                  value={promoGoal}
                  onChange={(e) => setPromoGoal(e.target.value as PromoGoal)}
                >
                  {PROMO_GOAL_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </Select>
              </div>

              <Select
                label="Gaya Bahasa"
                value={brandTone}
                onChange={(e) => setBrandTone(e.target.value as BrandTone)}
              >
                {BRAND_TONE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>

              <Textarea
                label="4. Info Tambahan (Opsional)"
                placeholder="Contoh: Fokuskan untuk menemani kerja sore dan ajak pesan lewat DM."
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value.slice(0, 300))}
                charCount={{ current: additionalInstructions.length, max: 300 }}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={generating}
                disabled={quotaRemaining <= 0}
                leftIcon={<Sparkles className="h-4 w-4" />}
                className="w-full"
              >
                Buat Variasi Konten
              </Button>
            </form>

            {/* Pane Kanan: Panel Hasil */}
            <div
              ref={resultsRef}
              className="space-y-4 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-card)] md:p-5 lg:col-span-7"
            >
              {generating ? (
                <div className="space-y-4 py-6">
                  <div className="flex items-center gap-2 text-[14px] font-medium text-[var(--brand-primary)]">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    <span>
                      {loadingStage === 0
                        ? 'Membaca konteks bisnis Anda...'
                        : 'Menyusun variasi materi...'}
                    </span>
                  </div>
                  <div className="h-8 w-2/3 animate-pulse rounded bg-[var(--bg-subtle)]" />
                  <div className="h-44 w-full animate-pulse rounded-[10px] bg-[var(--bg-subtle)]" />
                  <div className="h-10 w-full animate-pulse rounded bg-[var(--bg-subtle)]" />
                </div>
              ) : providerError ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-3 rounded-full bg-[var(--status-danger-bg)] p-3 text-[var(--status-danger-text)]">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <h2 className="font-heading text-[16px] font-semibold text-[var(--text-primary)]">
                    Layanan AI Sedang Sibuk
                  </h2>
                  <p className="mt-1.5 max-w-md text-[14px] text-[var(--text-secondary)]">
                    {providerError}
                  </p>
                  <Button
                    variant="primary"
                    className="mt-4"
                    leftIcon={<RefreshCw className="h-4 w-4" />}
                    onClick={() => void handleGenerate()}
                  >
                    Coba Lagi
                  </Button>
                </div>
              ) : !result ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]">
                    <Wand2 className="h-6 w-6" />
                  </div>
                  <h2 className="font-heading text-[16px] font-semibold text-[var(--text-primary)]">
                    Siap Menyusun Materi Promosi
                  </h2>
                  <p className="mt-1 max-w-sm text-[14px] text-[var(--text-secondary)]">
                    Pilih jenis materi, produk, dan kanal tujuan lalu ketuk{' '}
                    <strong>Buat Variasi Konten</strong>.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Tab Variasi */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-default)] pb-3">
                    <div className="flex flex-wrap gap-2">
                      {result.variants.map((v, idx) => (
                        <button
                          key={v.variant_index}
                          type="button"
                          onClick={() => selectVariant(v, idx)}
                          className={cn(
                            'min-h-[40px] rounded-full px-3.5 text-[13px] font-medium transition-colors',
                            activeVariantIdx === idx
                              ? 'bg-[var(--brand-primary)] text-white'
                              : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          )}
                        >
                          Variasi {v.variant_index}
                        </button>
                      ))}
                    </div>

                    {previousText && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditedText(previousText);
                          setPreviousText(null);
                          showToast('Dikembalikan ke versi sebelumnya.', 'info');
                        }}
                        className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-accent-soft)] px-3 py-1 text-[12px] font-medium text-[var(--brand-accent)]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Lihat versi sebelumnya
                      </button>
                    )}
                  </div>

                  {result.variants[activeVariantIdx] && (
                    <p className="text-[12px] font-medium text-[var(--brand-accent)]">
                      Sudut Pandang: {result.variants[activeVariantIdx].angle}
                    </p>
                  )}

                  {result.warnings.map((w, i) => (
                    <div
                      key={i}
                      className="rounded-[8px] bg-[var(--status-planned-bg)] px-3 py-2 text-[12px] text-[var(--status-planned-text)]"
                    >
                      {w.message}
                    </div>
                  ))}

                  {/* Sorotan Placeholder (BR-04) */}
                  {detectedPlaceholders.length > 0 && (
                    <div className="rounded-[8px] border border-[#FDE68A] bg-[var(--status-planned-bg)] px-3 py-2 text-[12px] text-[var(--status-planned-text)]">
                      <strong>Lengkapi bagian ini sebelum dipublikasikan:</strong>{' '}
                      {detectedPlaceholders.join(', ')}
                    </div>
                  )}

                  {/* Inline Editor */}
                  <div>
                    <textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      rows={8}
                      aria-label="Editor hasil materi"
                      className="w-full rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-canvas)] p-3.5 text-[16px] leading-relaxed text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] md:text-[15px]"
                    />
                    <p className="tabular-nums mt-1 text-right text-[12px] text-[var(--text-muted)]">
                      {charCount} karakter • {wordCount} kata
                    </p>
                  </div>

                  {/* Quick Refine (1 Kredit) */}
                  <div className="space-y-2.5 rounded-[10px] bg-[var(--bg-subtle)] p-3.5">
                    <p className="text-[12px] font-semibold tracking-wide text-[var(--text-secondary)] uppercase">
                      Quick Refine (1 Kredit AI)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {REFINE_PRESET_OPTIONS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          disabled={refining || quotaRemaining <= 0}
                          onClick={() => void handleQuickRefine(preset.value)}
                          className="min-h-[44px] rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--brand-primary-soft)] disabled:opacity-50 md:min-h-[36px]"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customRefine}
                        onChange={(e) => setCustomRefine(e.target.value.slice(0, 200))}
                        placeholder="Instruksi revisi singkat... (maks 200 karakter)"
                        className="min-h-[40px] flex-1 rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-[16px] md:text-[13px]"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        isLoading={refining}
                        disabled={!customRefine.trim() || quotaRemaining <= 0}
                        onClick={() => void handleQuickRefine()}
                      >
                        Ubah
                      </Button>
                    </div>
                  </div>

                  {/* Aksi Simpan / Salin / Lanjut */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Copy className="h-4 w-4" />}
                      onClick={() => void handleCopy()}
                    >
                      Salin
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={saving}
                      leftIcon={<BookmarkPlus className="h-4 w-4" />}
                      onClick={() => void handleSaveToLibrary()}
                    >
                      Simpan ke Pustaka
                    </Button>
                    <Link href={productId ? `/designs?product_id=${productId}` : '/designs'}>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Palette className="h-4 w-4" />}
                      >
                        Gunakan di Desain
                      </Button>
                    </Link>
                    <Link href={productId ? `/planner?product_id=${productId}` : '/planner'}>
                      <Button variant="ghost" size="sm">
                        Jadwalkan di Planner
                      </Button>
                    </Link>
                  </div>

                  {/* Human Review Notice (BR-05) & Feedback Widget (FR-19) */}
                  <div className="flex flex-col gap-2 border-t border-[var(--border-default)] pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[12px] text-[var(--text-muted)]">
                      {result.review_notice}
                    </p>
                    <div className="flex shrink-0 items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                      <span>Apakah sesuai?</span>
                      <button
                        type="button"
                        onClick={() => void handlePositiveFeedback()}
                        disabled={feedbackSent !== null}
                        aria-label="Hasil sesuai"
                        className={cn(
                          'flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-default)] md:h-9 md:w-9',
                          feedbackSent === 'up' &&
                            'bg-[var(--status-published-bg)] text-[var(--status-published-text)]'
                        )}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportModalOpen(true)}
                        disabled={feedbackSent !== null}
                        aria-label="Laporkan hasil kurang tepat"
                        className={cn(
                          'flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-default)] md:h-9 md:w-9',
                          feedbackSent === 'down' &&
                            'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]'
                        )}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Lapor Fakta / Feedback Negatif */}
        <ModalOrSheet
          open={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          title="Beri Masukan Kualitas AI"
          footer={
            <>
              <Button variant="ghost" onClick={() => setReportModalOpen(false)}>
                Batal
              </Button>
              <Button variant="primary" onClick={() => void handleSubmitNegativeFeedback()}>
                Kirim Masukan
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-[14px]">
            <label className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={isFactualIssue}
                onChange={(e) => setIsFactualIssue(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                Mengandung harga, sertifikasi, atau klaim yang tidak saya berikan
              </span>
            </label>
            <Textarea
              label="Catatan Tambahan (Opsional)"
              placeholder="Jelaskan bagian mana yang kurang sesuai..."
              value={reportNotes}
              onChange={(e) => setReportNotes(e.target.value.slice(0, 500))}
            />
          </div>
        </ModalOrSheet>
      </AppShell>
    </AuthGuard>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[14px]">Memuat AI Content Studio...</div>}>
      <StudioContent />
    </Suspense>
  );
}
