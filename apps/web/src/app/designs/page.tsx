'use client';

import type { AspectRatio, TemplateSegment } from '@dagangai/shared';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CalendarPlus,
  Download,
  Palette,
  Save,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  TemplateCanvasRenderer,
  type DesignConfig,
  type TemplateCanvasHandle,
} from '@/components/design/TemplateCanvasRenderer';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/FormFields';
import { useToast } from '@/components/ui/Toast';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { AuthGuard, useAuth } from '@/lib/auth-context';
import { COLOR_PRESETS } from '@/lib/business-constants';
import { cn } from '@/lib/cn';

interface DesignTemplate {
  id: string;
  name: string;
  segment: TemplateSegment;
  aspect_ratio: AspectRatio;
  dimensions: { width: number; height: number };
  slots: Record<string, { max_chars: number; required: boolean }>;
  font_presets: string[];
  default_colors: { background: string; accent: string; text: string };
}

interface ProductOption {
  id: string;
  name: string;
  primary_image_url: string | null;
}

interface ContentOption {
  id: string;
  title: string;
}

const DEFAULT_CONFIG: DesignConfig = {
  texts: {
    headline: 'Judul Promo Usaha Anda',
    subheadline: 'Jelaskan keunggulan produk secara singkat dan menarik.',
    price_or_badge: 'Tersedia Hari Ini',
    cta: 'Pesan Sekarang',
  },
  colors: { background: '#FFF8F0', accent: '#0F5C4D', text: '#1C1917' },
  font_preset: 'modern_clean',
  image: { url: null, crop: { zoom: 1, offset_x: 0, offset_y: 0 } },
  logo_url: null,
  show_logo: true,
  logo_position: 'top_left',
  show_badge: true,
};

function DesignsContent() {
  const { refreshMe } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const canvasRef = useRef<TemplateCanvasHandle | null>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [contents, setContents] = useState<ContentOption[]>([]);
  const [ratioFilter, setRatioFilter] = useState<string>('');
  const [segmentFilter, setSegmentFilter] = useState<string>('');

  const [selectedProductId, setSelectedProductId] = useState<string>(
    searchParams.get('product_id') ?? ''
  );
  const [selectedContentId, setSelectedContentId] = useState<string>(
    searchParams.get('content_id') ?? ''
  );

  // Editor state
  const [activeDesignId, setActiveDesignId] = useState<string | null>(
    searchParams.get('design_id')
  );
  const [designTitle, setDesignTitle] = useState('Poster Promosi Baru');
  const [activeTemplate, setActiveTemplate] = useState<DesignTemplate | null>(null);
  const [config, setConfig] = useState<DesignConfig>(DEFAULT_CONFIG);
  const [editorTab, setEditorTab] = useState<'texts' | 'photo' | 'style' | 'template'>(
    'texts'
  );
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copyAssisting, setCopyAssisting] = useState(false);

  const loadGallery = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ limit: '20' });
      if (ratioFilter) qs.set('aspect_ratio', ratioFilter);
      if (segmentFilter) qs.set('segment', segmentFilter);

      const [tpls, prods, cnts] = await Promise.all([
        apiFetch<DesignTemplate[]>(`/design-templates?${qs.toString()}`),
        apiFetch<ProductOption[]>('/products?limit=50'),
        apiFetch<ContentOption[]>('/contents?limit=50'),
      ]);
      setTemplates(tpls);
      setProducts(prods);
      setContents(cnts);
    } catch {
      showToast('Gagal memuat katalog template.', 'error');
    }
  }, [ratioFilter, segmentFilter, showToast]);

  useEffect(() => {
    void loadGallery();
  }, [loadGallery]);

  // Buka proyek desain tersimpan jika ada ?design_id=...
  useEffect(() => {
    const id = searchParams.get('design_id');
    if (!id || templates.length === 0) return;
    apiFetch<{
      id: string;
      title: string;
      template_id: string;
      config: DesignConfig;
    }>(`/designs/${id}`)
      .then((d) => {
        const tpl = templates.find((t) => t.id === d.template_id) ?? templates[0];
        setActiveDesignId(d.id);
        setDesignTitle(d.title);
        setActiveTemplate(tpl);
        setConfig(d.config);
        setStep(2);
      })
      .catch(() => {});
  }, [searchParams, templates]);

  const handleChooseTemplate = async (tpl: DesignTemplate) => {
    setActiveTemplate(tpl);
    setActiveDesignId(null);
    const prodName = products.find((p) => p.id === selectedProductId)?.name;
    setDesignTitle(prodName ? `Poster — ${prodName}` : `Desain ${tpl.name}`);

    try {
      const autofill = await apiFetch<{ config: DesignConfig }>(
        '/designs/autofill-preview',
        {
          method: 'POST',
          body: {
            template_id: tpl.id,
            product_id: selectedProductId || null,
            source_content_id: selectedContentId || null,
          },
        }
      );
      setConfig(autofill.config);
      setStep(2);
    } catch {
      setConfig({
        ...DEFAULT_CONFIG,
        colors: tpl.default_colors,
      });
      setStep(2);
    }
  };

  const handleCopyAssist = async () => {
    if (!activeTemplate) return;
    setCopyAssisting(true);
    try {
      const res = await apiFetch<{
        suggestions: Array<{
          headline: string;
          subheadline: string;
          price_or_badge: string;
          cta: string;
        }>;
      }>('/ai/design/copy-assist', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: {
          template_id: activeTemplate.id,
          product_id: selectedProductId || null,
          promo_goal: 'product_intro',
        },
      });
      if (res.suggestions.length > 0) {
        const s = res.suggestions[0];
        setConfig((prev) => ({
          ...prev,
          texts: {
            headline: s.headline,
            subheadline: s.subheadline,
            price_or_badge: s.price_or_badge,
            cta: s.cta,
          },
        }));
        await refreshMe();
        showToast('Saran teks AI diterapkan ke poster!', 'success');
      }
    } catch (err) {
      showToast(
        err instanceof ApiClientError
          ? err.message
          : 'Gagal mengambil saran teks AI. Kuota tidak berkurang.',
        'error'
      );
    } finally {
      setCopyAssisting(false);
    }
  };

  const saveDesignProject = async (): Promise<string | null> => {
    if (!activeTemplate) return null;
    setSaving(true);
    try {
      const payload = {
        title: designTitle.trim() || `Desain ${activeTemplate.name}`,
        template_id: activeTemplate.id,
        aspect_ratio: activeTemplate.aspect_ratio,
        product_id: selectedProductId || null,
        source_content_id: selectedContentId || null,
        config,
      };
      if (activeDesignId) {
        await apiFetch(`/designs/${activeDesignId}`, {
          method: 'PATCH',
          body: payload,
        });
        showToast('Perubahan desain disimpan.', 'success');
        return activeDesignId;
      } else {
        const created = await apiFetch<{ id: string }>('/designs', {
          method: 'POST',
          body: payload,
        });
        setActiveDesignId(created.id);
        showToast('Proyek desain disimpan ke Pustaka Materi.', 'success');
        return created.id;
      }
    } catch (err) {
      showToast(
        err instanceof ApiClientError ? err.message : 'Gagal menyimpan desain.',
        'error'
      );
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: 'png' | 'jpg') => {
    setExporting(true);
    try {
      const id = activeDesignId ?? (await saveDesignProject());
      if (!id) return;
      const dataUrl = canvasRef.current?.exportDataUrl(format, 0.95);
      const res = await apiFetch<{ download_url: string }>(
        `/designs/${id}/export`,
        {
          method: 'POST',
          body: { format, quality: 95, image_base64: dataUrl ?? undefined },
        }
      );

      // Unduh langsung di browser dari dataUrl (atau signed URL fallback)
      const link = document.createElement('a');
      link.href = dataUrl || res.download_url;
      link.download = `${designTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`;
      link.click();
      showToast(`Poster ${format.toUpperCase()} resolusi tinggi siap diunduh!`, 'success');
    } catch {
      showToast('Gagal mengekspor desain.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const panImage = (dx: number, dy: number) => {
    setConfig((prev) => ({
      ...prev,
      image: {
        ...prev.image,
        crop: {
          zoom: prev.image?.crop?.zoom ?? 1,
          offset_x: (prev.image?.crop?.offset_x ?? 0) + dx,
          offset_y: (prev.image?.crop?.offset_y ?? 0) + dy,
        },
      },
    }));
  };

  return (
    <AuthGuard>
      <AppShell pageTitle="AI Design Studio">
        {step === 1 ? (
          <div className="space-y-5">
            {/* Smart Auto-Fill Selector */}
            <section className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-card)] md:p-5">
              <h2 className="font-heading text-[16px] font-semibold text-[var(--text-primary)]">
                1. Sumber Data Otomatis (Smart Auto-Fill)
              </h2>
              <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                Pilih produk atau materi teks tersimpan agar foto, harga, dan teks langsung
                terisi ke template pilihan Anda.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select
                  label="Produk (Opsional)"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  <option value="">Tanpa produk spesifik</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Materi Teks dari Pustaka (Opsional)"
                  value={selectedContentId}
                  onChange={(e) => setSelectedContentId(e.target.value)}
                >
                  <option value="">Isi teks default / manual</option>
                  {contents.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </Select>
              </div>
            </section>

            {/* Filter Rasio & Segmen */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { val: '', label: 'Semua Rasio' },
                { val: '1:1', label: 'Feed (1:1)' },
                { val: '9:16', label: 'Story (9:16)' },
                { val: '16:9', label: 'Banner (16:9)' },
              ].map((r) => (
                <button
                  key={r.val}
                  type="button"
                  onClick={() => setRatioFilter(r.val)}
                  className={cn(
                    'min-h-[40px] rounded-full px-3.5 text-[13px] font-medium',
                    ratioFilter === r.val
                      ? 'bg-[var(--brand-primary)] text-white'
                      : 'border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                  )}
                >
                  {r.label}
                </button>
              ))}

              <select
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value)}
                aria-label="Filter segmen template"
                className="min-h-[40px] rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 text-[13px]"
              >
                <option value="">Semua Segmen</option>
                <option value="fnb">F&amp;B</option>
                <option value="fashion_craft">Fashion &amp; Kerajinan</option>
                <option value="local_service">Jasa Lokal</option>
                <option value="general">Umum</option>
              </select>
            </div>

            {/* Galeri Template */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((tpl) => (
                <article
                  key={tpl.id}
                  className="flex flex-col justify-between rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-card)]"
                >
                  <div>
                    <div
                      className="mb-3 flex h-32 items-center justify-center rounded-[8px] border border-[var(--border-default)]"
                      style={{ backgroundColor: tpl.default_colors.background }}
                    >
                      <div className="text-center">
                        <Palette
                          className="mx-auto h-6 w-6"
                          style={{ color: tpl.default_colors.accent }}
                        />
                        <span
                          className="mt-1 block text-[12px] font-semibold"
                          style={{ color: tpl.default_colors.text }}
                        >
                          {tpl.aspect_ratio} • {tpl.dimensions.width}×{tpl.dimensions.height}
                        </span>
                      </div>
                    </div>
                    <h3 className="font-heading text-[15px] font-semibold">{tpl.name}</h3>
                    <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                      Segmen: {tpl.segment}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => void handleChooseTemplate(tpl)}
                  >
                    Pakai Template Ini
                  </Button>
                </article>
              ))}
            </div>
          </div>
        ) : (
          /* Langkah 2: Editor Ramah Mobile dengan Sticky Live Preview */
          <div className="space-y-4">
            {/* Top Bar Editor */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => setStep(1)}
              >
                Ganti Template
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={saving}
                  leftIcon={<Save className="h-4 w-4" />}
                  onClick={() => void saveDesignProject()}
                >
                  Simpan
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={exporting}
                  leftIcon={<Download className="h-4 w-4" />}
                  onClick={() => void handleExport('png')}
                >
                  Unduh PNG
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={exporting}
                  onClick={() => void handleExport('jpg')}
                >
                  JPG
                </Button>
                {activeDesignId && (
                  <Link href={`/planner?design_id=${activeDesignId}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<CalendarPlus className="h-4 w-4" />}
                    >
                      Jadwalkan
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Sticky Live Canvas Preview */}
              <div className="sticky top-[60px] z-10 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3 lg:static lg:col-span-6 lg:p-5">
                {activeTemplate && (
                  <TemplateCanvasRenderer
                    ref={canvasRef}
                    aspectRatio={activeTemplate.aspect_ratio}
                    templateId={activeTemplate.id}
                    config={config}
                  />
                )}
              </div>

              {/* 4 Tab Kontrol Sederhana */}
              <div className="space-y-4 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 lg:col-span-6">
                <Input
                  label="Judul Proyek Desain"
                  value={designTitle}
                  onChange={(e) => setDesignTitle(e.target.value.slice(0, 150))}
                />

                <div className="grid grid-cols-4 gap-1.5 rounded-[10px] bg-[var(--bg-subtle)] p-1">
                  {[
                    { id: 'texts', label: 'Teks' },
                    { id: 'photo', label: 'Foto' },
                    { id: 'style', label: 'Warna' },
                    { id: 'template', label: 'Template' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        setEditorTab(t.id as 'texts' | 'photo' | 'style' | 'template')
                      }
                      className={cn(
                        'min-h-[44px] rounded-[8px] text-[13px] font-medium transition-colors',
                        editorTab === t.id
                          ? 'bg-[var(--bg-surface)] text-[var(--brand-primary)] shadow-sm'
                          : 'text-[var(--text-secondary)]'
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {editorTab === 'texts' && (
                  <div className="space-y-3.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      isLoading={copyAssisting}
                      leftIcon={<Sparkles className="h-4 w-4 text-[var(--brand-accent)]" />}
                      onClick={() => void handleCopyAssist()}
                      className="w-full"
                    >
                      ✨ Saran Teks Otomatis AI (1 Kredit)
                    </Button>

                    <Input
                      label="Headline"
                      value={config.texts.headline}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          texts: { ...p.texts, headline: e.target.value.slice(0, 45) },
                        }))
                      }
                      charCount={{ current: config.texts.headline.length, max: 45 }}
                    />
                    <Textarea
                      label="Sub-headline"
                      value={config.texts.subheadline}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          texts: {
                            ...p.texts,
                            subheadline: e.target.value.slice(0, 90),
                          },
                        }))
                      }
                      charCount={{ current: config.texts.subheadline.length, max: 90 }}
                      rows={3}
                    />
                    <Input
                      label="Badge / Harga"
                      value={config.texts.price_or_badge}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          texts: {
                            ...p.texts,
                            price_or_badge: e.target.value.slice(0, 25),
                          },
                        }))
                      }
                      charCount={{
                        current: config.texts.price_or_badge.length,
                        max: 25,
                      }}
                    />
                    <Input
                      label="Ajakan / CTA"
                      value={config.texts.cta}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          texts: { ...p.texts, cta: e.target.value.slice(0, 35) },
                        }))
                      }
                      charCount={{ current: config.texts.cta.length, max: 35 }}
                    />
                  </div>
                )}

                {editorTab === 'photo' && (
                  <div className="space-y-4">
                    <Select
                      label="Pilih Foto dari Produk"
                      value={config.image?.url ?? ''}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          image: {
                            url: e.target.value || null,
                            crop: p.image?.crop ?? { zoom: 1, offset_x: 0, offset_y: 0 },
                          },
                        }))
                      }
                    >
                      <option value="">Tanpa foto produk</option>
                      {products
                        .filter((p) => p.primary_image_url)
                        .map((p) => (
                          <option key={p.id} value={p.primary_image_url!}>
                            Foto: {p.name}
                          </option>
                        ))}
                    </Select>

                    <div className="space-y-1.5">
                      <label className="text-[14px] font-medium">
                        Zoom Foto ({(config.image?.crop?.zoom ?? 1).toFixed(1)}x)
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="2"
                        step="0.1"
                        value={config.image?.crop?.zoom ?? 1}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            image: {
                              ...p.image,
                              crop: {
                                zoom: Number(e.target.value),
                                offset_x: p.image?.crop?.offset_x ?? 0,
                                offset_y: p.image?.crop?.offset_y ?? 0,
                              },
                            },
                          }))
                        }
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-[14px] font-medium">Geser Posisi Foto (Tap)</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => panImage(0, -2)}
                          aria-label="Geser atas"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => panImage(0, 2)}
                          aria-label="Geser bawah"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => panImage(-2, 0)}
                          aria-label="Geser kiri"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => panImage(2, 0)}
                          aria-label="Geser kanan"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {editorTab === 'style' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[14px] font-medium">Palet Warna</label>
                      <div className="flex flex-wrap gap-2">
                        {COLOR_PRESETS.map((cp) => (
                          <button
                            key={cp.name}
                            type="button"
                            onClick={() =>
                              setConfig((p) => ({
                                ...p,
                                colors: {
                                  background: '#FAF8F5',
                                  accent: cp.primary,
                                  text: '#1C1917',
                                },
                              }))
                            }
                            className="inline-flex min-h-[40px] items-center gap-2 rounded-[8px] border border-[var(--border-default)] px-3 text-[12px]"
                          >
                            <span
                              className="h-4 w-4 rounded-full"
                              style={{ backgroundColor: cp.primary }}
                            />
                            {cp.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Select
                      label="Gaya Huruf"
                      value={config.font_preset}
                      onChange={(e) =>
                        setConfig((p) => ({ ...p, font_preset: e.target.value }))
                      }
                    >
                      <option value="modern_clean">Modern Clean</option>
                      <option value="warm_artisan">Warm Artisan</option>
                      <option value="bold_promo">Bold Promo</option>
                    </Select>

                    <div className="flex flex-wrap gap-4 text-[14px]">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={config.show_badge}
                          onChange={(e) =>
                            setConfig((p) => ({ ...p, show_badge: e.target.checked }))
                          }
                          className="h-4 w-4"
                        />
                        Tampilkan Badge Harga
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={config.show_logo}
                          onChange={(e) =>
                            setConfig((p) => ({ ...p, show_logo: e.target.checked }))
                          }
                          className="h-4 w-4"
                        />
                        Tampilkan Logo
                      </label>
                    </div>
                  </div>
                )}

                {editorTab === 'template' && (
                  <div className="grid grid-cols-2 gap-2">
                    {templates.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setActiveTemplate(tpl)}
                        className={cn(
                          'min-h-[44px] rounded-[8px] border p-2.5 text-left text-[13px]',
                          activeTemplate?.id === tpl.id
                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] font-semibold'
                            : 'border-[var(--border-default)]'
                        )}
                      >
                        {tpl.name} ({tpl.aspect_ratio})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </AuthGuard>
  );
}

export default function DesignsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[14px]">Memuat AI Design Studio...</div>}>
      <DesignsContent />
    </Suspense>
  );
}
