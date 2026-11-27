'use client';

import type { BrandTone, BusinessCategory, LanguagePreference } from '@dagangai/shared';
import { ArrowLeft, ArrowRight, Check, Lightbulb, Plus, Sparkles, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/FormFields';
import { ModalOrSheet } from '@/components/ui/ModalOrSheet';
import { useToast } from '@/components/ui/Toast';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { AuthGuard, useAuth } from '@/lib/auth-context';
import {
  BRAND_TONE_OPTIONS,
  BUSINESS_CATEGORY_OPTIONS,
  COLOR_PRESETS,
  LANGUAGE_OPTIONS,
} from '@/lib/business-constants';
import { cn } from '@/lib/cn';

interface CategoryPreset {
  category: BusinessCategory;
  label: string;
  example_description: string;
  example_usps: string[];
  example_target_audience: string;
  recommended_tones: BrandTone[];
}

export default function OnboardingPage() {
  const { user, refreshMe } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<BusinessCategory>('fnb');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  // Step 2 (Opsional)
  const [usps, setUsps] = useState<string[]>([]);
  const [uspDraft, setUspDraft] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [audienceDesc, setAudienceDesc] = useState('');
  const [languagePref, setLanguagePref] = useState<LanguagePreference>('id');
  const [brandTone, setBrandTone] = useState<BrandTone>('friendly_casual');
  const [primaryColor, setPrimaryColor] = useState('#0F5C4D');
  const [secondaryColor, setSecondaryColor] = useState('#D96B27');

  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<CategoryPreset | null>(null);
  const [loadingPreset, setLoadingPreset] = useState(false);

  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // FR-04: Akun yang sudah punya bisnis diarahkan ke edit profil
  useEffect(() => {
    if (user?.has_business) {
      router.replace('/business');
    }
  }, [user?.has_business, router]);

  const handleViewPreset = async () => {
    setLoadingPreset(true);
    try {
      const preset = await apiFetch<CategoryPreset>(
        `/business/presets?category=${encodeURIComponent(category)}`
      );
      setActivePreset(preset);
      setPresetModalOpen(true);
    } catch {
      showToast('Gagal memuat contoh pengisian kategori.', 'error');
    } finally {
      setLoadingPreset(false);
    }
  };

  const applyPresetNonDestructive = () => {
    if (!activePreset) return;
    if (!description.trim()) setDescription(activePreset.example_description);
    if (usps.length === 0) setUsps(activePreset.example_usps.slice(0, 5));
    if (!audienceDesc.trim()) setAudienceDesc(activePreset.example_target_audience);
    if (activePreset.recommended_tones.length > 0) {
      setBrandTone(activePreset.recommended_tones[0]);
    }
    setPresetModalOpen(false);
    showToast('Contoh pengisian diterapkan pada kolom yang masih kosong.', 'success');
  };

  const handleNextStep = () => {
    setStep1Error(null);
    if (name.trim().length < 2) {
      setStep1Error('Nama bisnis minimal 2 karakter.');
      return;
    }
    if (description.trim().length < 10) {
      setStep1Error('Deskripsi singkat minimal 10 karakter agar AI memahami usaha Anda.');
      return;
    }
    setStep(2);
  };

  const addUsp = () => {
    const trimmed = uspDraft.trim();
    if (!trimmed || usps.length >= 5) return;
    setUsps((prev) => [...prev, trimmed.slice(0, 120)]);
    setUspDraft('');
  };

  const submitBusiness = async (skipOptional: boolean) => {
    setSubmitting(true);
    try {
      await apiFetch('/business', {
        method: 'POST',
        body: {
          name: name.trim(),
          category,
          description: description.trim(),
          location: location.trim() || null,
          ...(skipOptional
            ? {}
            : {
                unique_selling_points: usps,
                target_audience: {
                  age_range: ageRange.trim() || null,
                  description: audienceDesc.trim() || null,
                },
                brand_identity: {
                  language_preference: languagePref,
                  brand_tone: brandTone,
                  primary_color: primaryColor,
                  secondary_color: secondaryColor,
                },
              }),
        },
      });
      await refreshMe();
      showToast('Profil bisnis tersimpan! Selamat datang di ruang kerja DagangAI.', 'success');
      router.push(skipOptional ? '/products' : '/dashboard');
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'BUSINESS_ALREADY_EXISTS') {
        await refreshMe();
        router.replace('/business');
        return;
      }
      showToast(
        err instanceof ApiClientError ? err.message : 'Gagal menyimpan profil bisnis.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard requireBusiness={false}>
      <div className="min-h-screen bg-[var(--bg-canvas)] px-4 py-8 md:py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--brand-primary)] text-white">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="font-heading text-[16px] font-bold text-[var(--text-primary)]">
                  DagangAI
                </p>
                <p className="text-[12px] text-[var(--text-muted)]">
                  Pengaturan Awal Profil Usaha (Langkah {step} dari 2)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'h-2 w-8 rounded-full',
                  step >= 1 ? 'bg-[var(--brand-primary)]' : 'bg-[var(--border-default)]'
                )}
              />
              <span
                className={cn(
                  'h-2 w-8 rounded-full',
                  step >= 2 ? 'bg-[var(--brand-primary)]' : 'bg-[var(--border-default)]'
                )}
              />
            </div>
          </div>

          <div className="rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)] md:p-8">
            {step === 1 ? (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h1 className="font-heading text-[20px] font-bold text-[var(--text-primary)]">
                      1. Identitas Usaha Anda
                    </h1>
                    <p className="mt-1 text-[14px] text-[var(--text-secondary)]">
                      Cukup isi sekali. AI akan memakai profil ini agar seluruh materi promosi
                      terasa pas dengan usaha Anda.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Lightbulb className="h-4 w-4 text-[var(--brand-accent)]" />}
                    onClick={handleViewPreset}
                    isLoading={loadingPreset}
                    className="shrink-0"
                  >
                    Lihat Contoh Pengisian
                  </Button>
                </div>

                {step1Error && (
                  <div
                    role="alert"
                    className="rounded-[8px] border border-[#FECACA] bg-[var(--status-danger-bg)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--status-danger-text)]"
                  >
                    {step1Error}
                  </div>
                )}

                <Input
                  label="Nama Bisnis / Merek"
                  placeholder="Contoh: Kopi Senja Nusantara"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 100))}
                  charCount={{ current: name.length, max: 100 }}
                  required
                />

                <Select
                  label="Kategori Usaha"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as BusinessCategory)}
                  helperText="Kategori F&B, Fashion/Kerajinan, dan Jasa Lokal memiliki preset contoh khusus."
                  required
                >
                  {BUSINESS_CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                      {opt.isPriority ? ' ★' : ''}
                    </option>
                  ))}
                </Select>

                <Textarea
                  label="Deskripsi Singkat Usaha"
                  placeholder="Jelaskan apa yang Anda jual, bahan/keunggulan utama, dan ciri khas usaha Anda."
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  charCount={{ current: description.length, max: 500 }}
                  required
                />

                <Input
                  label="Lokasi / Area Layanan (Opsional)"
                  placeholder="Contoh: Bandung, Jawa Barat atau Melayani Jabodetabek"
                  value={location}
                  onChange={(e) => setLocation(e.target.value.slice(0, 120))}
                />

                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="primary"
                    onClick={handleNextStep}
                    leftIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Lanjut ke Karakter Merek
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h1 className="font-heading text-[20px] font-bold text-[var(--text-primary)]">
                    2. Karakter Merek &amp; Pelanggan (Opsional)
                  </h1>
                  <p className="mt-1 text-[14px] text-[var(--text-secondary)]">
                    Boleh diisi sekarang atau dilengkapi nanti di halaman Profil Bisnis.
                  </p>
                </div>

                {/* Keunggulan Utama */}
                <div className="space-y-2">
                  <label className="text-[14px] font-medium text-[var(--text-primary)]">
                    Keunggulan Utama (Maks. 5)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={uspDraft}
                      onChange={(e) => setUspDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addUsp();
                        }
                      }}
                      placeholder="Contoh: Gula aren murni tanpa pemanis buatan"
                      className="min-h-[44px] flex-1 rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-[16px] md:min-h-[40px] md:text-[14px]"
                    />
                    <Button
                      variant="secondary"
                      onClick={addUsp}
                      disabled={usps.length >= 5 || !uspDraft.trim()}
                      leftIcon={<Plus className="h-4 w-4" />}
                    >
                      Tambah
                    </Button>
                  </div>
                  {usps.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {usps.map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-primary-soft)] px-3 py-1 text-[13px] font-medium text-[var(--brand-primary)]"
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() => setUsps((p) => p.filter((_, i) => i !== idx))}
                            aria-label="Hapus keunggulan"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Target Pelanggan */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Rentang Usia Pelanggan"
                    placeholder="Contoh: 18–35 tahun"
                    value={ageRange}
                    onChange={(e) => setAgeRange(e.target.value.slice(0, 60))}
                  />
                  <Select
                    label="Bahasa Utama Konten"
                    value={languagePref}
                    onChange={(e) => setLanguagePref(e.target.value as LanguagePreference)}
                  >
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <Textarea
                  label="Deskripsi Target Pelanggan"
                  placeholder="Contoh: Pekerja muda dan mahasiswa yang mencari kopi harian terjangkau."
                  value={audienceDesc}
                  onChange={(e) => setAudienceDesc(e.target.value.slice(0, 300))}
                  charCount={{ current: audienceDesc.length, max: 300 }}
                />

                {/* Gaya Komunikasi */}
                <div className="space-y-2">
                  <label className="text-[14px] font-medium text-[var(--text-primary)]">
                    Gaya Komunikasi Merek
                  </label>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {BRAND_TONE_OPTIONS.map((tone) => {
                      const selected = brandTone === tone.value;
                      return (
                        <button
                          key={tone.value}
                          type="button"
                          onClick={() => setBrandTone(tone.value)}
                          className={cn(
                            'flex flex-col items-start rounded-[10px] border p-3 text-left transition-colors',
                            selected
                              ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)]'
                              : 'border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)]'
                          )}
                        >
                          <span className="text-[14px] font-semibold text-[var(--text-primary)]">
                            {tone.label}
                          </span>
                          <span className="mt-1 text-[12px] text-[var(--text-secondary)]">
                            {tone.example}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Palet Warna */}
                <div className="space-y-2">
                  <label className="text-[14px] font-medium text-[var(--text-primary)]">
                    Warna Merek (Untuk Template Desain)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setPrimaryColor(preset.primary);
                          setSecondaryColor(preset.secondary);
                        }}
                        className="inline-flex min-h-[40px] items-center gap-2 rounded-[8px] border border-[var(--border-default)] px-3 text-[13px] hover:bg-[var(--bg-subtle)]"
                      >
                        <span
                          className="h-4 w-4 rounded-full border border-black/10"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <span
                          className="h-4 w-4 rounded-full border border-black/10"
                          style={{ backgroundColor: preset.secondary }}
                        />
                        <span>{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t border-[var(--border-default)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    variant="ghost"
                    leftIcon={<ArrowLeft className="h-4 w-4" />}
                    onClick={() => setStep(1)}
                  >
                    Kembali
                  </Button>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <Button
                      variant="secondary"
                      onClick={() => submitBusiness(true)}
                      disabled={submitting}
                    >
                      Lengkapi Nanti
                    </Button>
                    <Button
                      variant="primary"
                      isLoading={submitting}
                      leftIcon={<Check className="h-4 w-4" />}
                      onClick={() => submitBusiness(false)}
                    >
                      Simpan &amp; Masuk Workspace
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <ModalOrSheet
          open={presetModalOpen}
          onClose={() => setPresetModalOpen(false)}
          title={activePreset ? `Contoh Pengisian: ${activePreset.label}` : 'Contoh Pengisian'}
          footer={
            <>
              <Button variant="ghost" onClick={() => setPresetModalOpen(false)}>
                Tutup
              </Button>
              <Button variant="primary" onClick={applyPresetNonDestructive}>
                Isi ke Kolom Kosong
              </Button>
            </>
          }
        >
          {activePreset && (
            <div className="space-y-4 text-[14px]">
              <div>
                <p className="font-semibold text-[var(--text-primary)]">Contoh Deskripsi:</p>
                <p className="mt-1 rounded-[8px] bg-[var(--bg-subtle)] p-3 text-[var(--text-secondary)]">
                  {activePreset.example_description}
                </p>
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">Contoh Keunggulan:</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-[var(--text-secondary)]">
                  {activePreset.example_usps.map((u, i) => (
                    <li key={i}>{u}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">Contoh Target Pelanggan:</p>
                <p className="mt-1 text-[var(--text-secondary)]">
                  {activePreset.example_target_audience}
                </p>
              </div>
            </div>
          )}
        </ModalOrSheet>
      </div>
    </AuthGuard>
  );
}
