'use client';

import type { BrandTone, BusinessCategory, LanguagePreference } from '@dagangai/shared';
import { ImagePlus, Plus, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/FormFields';
import { useToast } from '@/components/ui/Toast';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { AuthGuard, useAuth } from '@/lib/auth-context';
import {
  BRAND_TONE_OPTIONS,
  BUSINESS_CATEGORY_OPTIONS,
  LANGUAGE_OPTIONS,
} from '@/lib/business-constants';
import { cn } from '@/lib/cn';

interface BusinessData {
  id: string;
  name: string;
  category: BusinessCategory;
  description: string;
  location: string | null;
  unique_selling_points: string[];
  target_audience: {
    age_range: string | null;
    description: string | null;
  };
  brand_identity: {
    language_preference: LanguagePreference;
    brand_tone: BrandTone;
    avoided_words: string[];
    primary_color: string | null;
    secondary_color: string | null;
    logo_url: string | null;
  };
  completeness: {
    score: number;
    level: 'low' | 'medium' | 'good';
    missing_fields: string[];
    context_impact_note: string;
  };
}

const MISSING_LABELS: Record<string, string> = {
  location: 'Lokasi Usaha',
  unique_selling_points: 'Keunggulan Utama',
  target_audience: 'Target Pelanggan',
  logo: 'Logo Usaha',
};

export default function BusinessProfilePage() {
  const { refreshMe } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<BusinessCategory>('fnb');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [usps, setUsps] = useState<string[]>([]);
  const [uspDraft, setUspDraft] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [audienceDesc, setAudienceDesc] = useState('');
  const [languagePref, setLanguagePref] = useState<LanguagePreference>('id');
  const [brandTone, setBrandTone] = useState<BrandTone>('friendly_casual');
  const [avoidedWords, setAvoidedWords] = useState<string[]>([]);
  const [avoidedDraft, setAvoidedDraft] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0F5C4D');
  const [secondaryColor, setSecondaryColor] = useState('#D96B27');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [completeness, setCompleteness] = useState<BusinessData['completeness'] | null>(null);

  const hydrate = (biz: BusinessData) => {
    setName(biz.name);
    setCategory(biz.category);
    setDescription(biz.description);
    setLocation(biz.location ?? '');
    setUsps(biz.unique_selling_points ?? []);
    setAgeRange(biz.target_audience.age_range ?? '');
    setAudienceDesc(biz.target_audience.description ?? '');
    setLanguagePref(biz.brand_identity.language_preference);
    setBrandTone(biz.brand_identity.brand_tone);
    setAvoidedWords(biz.brand_identity.avoided_words ?? []);
    setPrimaryColor(biz.brand_identity.primary_color ?? '#0F5C4D');
    setSecondaryColor(biz.brand_identity.secondary_color ?? '#D96B27');
    setLogoUrl(biz.brand_identity.logo_url);
    setCompleteness(biz.completeness);
  };

  useEffect(() => {
    let active = true;
    apiFetch<BusinessData>('/business')
      .then((data) => {
        if (active) hydrate(data);
      })
      .catch(() => {
        if (active) showToast('Gagal memuat profil bisnis.', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showToast]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await apiFetch<BusinessData>('/business', {
        method: 'PATCH',
        body: {
          name: name.trim(),
          category,
          description: description.trim(),
          location: location.trim() || null,
          unique_selling_points: usps,
          target_audience: {
            age_range: ageRange.trim() || null,
            description: audienceDesc.trim() || null,
          },
          brand_identity: {
            language_preference: languagePref,
            brand_tone: brandTone,
            avoided_words: avoidedWords,
            primary_color: primaryColor,
            secondary_color: secondaryColor,
          },
        },
      });
      hydrate(updated);
      await refreshMe();
      showToast('Profil bisnis berhasil disimpan.', 'success');
    } catch (err) {
      showToast(
        err instanceof ApiClientError ? err.message : 'Gagal menyimpan profil bisnis.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Format logo harus JPG, PNG, atau WebP.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran logo maksimal 5 MB.', 'error');
      return;
    }

    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiFetch<{ logo_url: string; completeness_score: number }>(
        '/business/logo',
        { method: 'POST', body: fd }
      );
      setLogoUrl(res.logo_url);
      setCompleteness((prev) =>
        prev
          ? {
              ...prev,
              score: res.completeness_score,
              missing_fields: prev.missing_fields.filter((f) => f !== 'logo'),
            }
          : prev
      );
      showToast('Logo usaha berhasil diunggah.', 'success');
    } catch (err) {
      showToast(
        err instanceof ApiClientError ? err.message : 'Gagal mengunggah logo.',
        'error'
      );
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteLogo = async () => {
    setUploadingLogo(true);
    try {
      const res = await apiFetch<{ logo_url: null; completeness_score: number }>(
        '/business/logo',
        { method: 'DELETE' }
      );
      setLogoUrl(null);
      setCompleteness((prev) =>
        prev
          ? {
              ...prev,
              score: res.completeness_score,
              missing_fields: [...new Set([...prev.missing_fields, 'logo'])],
            }
          : prev
      );
      showToast('Logo usaha dihapus.', 'info');
    } catch {
      showToast('Gagal menghapus logo.', 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <AuthGuard>
      <AppShell pageTitle="Profil Bisnis">
        {loading ? (
          <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-[14px] text-[var(--text-secondary)]">
            Memuat profil bisnis...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Progress Kelengkapan Konteks */}
            {completeness && (
              <section className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-heading text-[16px] font-semibold text-[var(--text-primary)]">
                      Kelengkapan Konteks AI
                    </h2>
                    <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">
                      {completeness.context_impact_note}
                    </p>
                  </div>
                  <span className="tabular-nums shrink-0 rounded-full bg-[var(--brand-primary-soft)] px-3 py-1 text-[13px] font-semibold text-[var(--brand-primary)]">
                    {completeness.score}% Lengkap
                  </span>
                </div>
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                  <div
                    className="h-full rounded-full bg-[var(--brand-primary)] transition-all"
                    style={{ width: `${completeness.score}%` }}
                  />
                </div>
                {completeness.missing_fields.length > 0 && (
                  <p className="mt-2.5 text-[12px] text-[var(--text-muted)]">
                    Belum diisi:{' '}
                    {completeness.missing_fields
                      .map((f) => MISSING_LABELS[f] ?? f)
                      .join(', ')}
                  </p>
                )}
              </section>
            )}

            {/* Seksi 1: Informasi Dasar */}
            <section className="space-y-4 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)]">
              <h2 className="font-heading text-[17px] font-semibold text-[var(--text-primary)]">
                Informasi Dasar
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Nama Bisnis"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 100))}
                  required
                />
                <Select
                  label="Kategori Bisnis"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as BusinessCategory)}
                  required
                >
                  {BUSINESS_CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
              <Textarea
                label="Deskripsi Singkat"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                charCount={{ current: description.length, max: 500 }}
                required
              />
              <Input
                label="Lokasi / Area Layanan"
                placeholder="Contoh: Bandung, Jawa Barat"
                value={location}
                onChange={(e) => setLocation(e.target.value.slice(0, 120))}
              />
            </section>

            {/* Seksi 2: Target Pelanggan & Keunggulan */}
            <section className="space-y-4 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)]">
              <h2 className="font-heading text-[17px] font-semibold text-[var(--text-primary)]">
                Target Pelanggan &amp; Keunggulan
              </h2>
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
                        if (uspDraft.trim() && usps.length < 5) {
                          setUsps((p) => [...p, uspDraft.trim().slice(0, 120)]);
                          setUspDraft('');
                        }
                      }
                    }}
                    placeholder="Tambah keunggulan usaha..."
                    className="min-h-[44px] flex-1 rounded-[8px] border border-[var(--border-strong)] px-3 text-[16px] md:min-h-[40px] md:text-[14px]"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (uspDraft.trim() && usps.length < 5) {
                        setUsps((p) => [...p, uspDraft.trim().slice(0, 120)]);
                        setUspDraft('');
                      }
                    }}
                    disabled={usps.length >= 5 || !uspDraft.trim()}
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    Tambah
                  </Button>
                </div>
                {usps.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {usps.map((u, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-primary-soft)] px-3 py-1 text-[13px] font-medium text-[var(--brand-primary)]"
                      >
                        {u}
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

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Rentang Usia Pelanggan"
                  placeholder="Contoh: 18-35 tahun"
                  value={ageRange}
                  onChange={(e) => setAgeRange(e.target.value.slice(0, 60))}
                />
                <Select
                  label="Preferensi Bahasa"
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
                value={audienceDesc}
                onChange={(e) => setAudienceDesc(e.target.value.slice(0, 300))}
                charCount={{ current: audienceDesc.length, max: 300 }}
              />
            </section>

            {/* Seksi 3: Identitas & Gaya Komunikasi */}
            <section className="space-y-5 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)]">
              <h2 className="font-heading text-[17px] font-semibold text-[var(--text-primary)]">
                Identitas &amp; Gaya Komunikasi Merek
              </h2>

              <div className="space-y-2">
                <label className="text-[14px] font-medium text-[var(--text-primary)]">
                  Gaya Komunikasi
                </label>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {BRAND_TONE_OPTIONS.map((tone) => (
                    <button
                      key={tone.value}
                      type="button"
                      onClick={() => setBrandTone(tone.value)}
                      className={cn(
                        'flex flex-col items-start rounded-[10px] border p-3 text-left transition-colors',
                        brandTone === tone.value
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)]'
                          : 'border-[var(--border-default)] hover:bg-[var(--bg-subtle)]'
                      )}
                    >
                      <span className="text-[14px] font-semibold text-[var(--text-primary)]">
                        {tone.label}
                      </span>
                      <span className="mt-1 text-[12px] text-[var(--text-secondary)]">
                        {tone.example}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Kata yang Dihindari */}
              <div className="space-y-2">
                <label className="text-[14px] font-medium text-[var(--text-primary)]">
                  Kata yang Dihindari AI (Maks. 15)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={avoidedDraft}
                    onChange={(e) => setAvoidedDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (avoidedDraft.trim() && avoidedWords.length < 15) {
                          setAvoidedWords((p) => [...p, avoidedDraft.trim().slice(0, 60)]);
                          setAvoidedDraft('');
                        }
                      }
                    }}
                    placeholder="Contoh: murahan, nomor 1 sedunia"
                    className="min-h-[44px] flex-1 rounded-[8px] border border-[var(--border-strong)] px-3 text-[16px] md:min-h-[40px] md:text-[14px]"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (avoidedDraft.trim() && avoidedWords.length < 15) {
                        setAvoidedWords((p) => [...p, avoidedDraft.trim().slice(0, 60)]);
                        setAvoidedDraft('');
                      }
                    }}
                    disabled={avoidedWords.length >= 15 || !avoidedDraft.trim()}
                  >
                    Tambah
                  </Button>
                </div>
                {avoidedWords.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {avoidedWords.map((w, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--status-danger-bg)] px-3 py-1 text-[13px] font-medium text-[var(--status-danger-text)]"
                      >
                        {w}
                        <button
                          type="button"
                          onClick={() =>
                            setAvoidedWords((p) => p.filter((_, i) => i !== idx))
                          }
                          aria-label="Hapus kata yang dihindari"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Warna & Logo */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-3">
                  <label className="text-[14px] font-medium text-[var(--text-primary)]">
                    Warna Merek
                  </label>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-10 w-12 cursor-pointer rounded border border-[var(--border-strong)] bg-white p-1"
                      />
                      <span>Utama ({primaryColor})</span>
                    </label>
                    <label className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="h-10 w-12 cursor-pointer rounded border border-[var(--border-strong)] bg-white p-1"
                      />
                      <span>Aksen ({secondaryColor})</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[14px] font-medium text-[var(--text-primary)]">
                    Logo Usaha (JPG/PNG/WebP, maks. 5 MB)
                  </label>
                  <div className="flex items-center gap-3">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo usaha"
                        className="h-16 w-16 rounded-[10px] border border-[var(--border-default)] object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-[10px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                        <ImagePlus className="h-6 w-6" />
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleLogoUpload(f);
                        e.target.value = '';
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        isLoading={uploadingLogo}
                        leftIcon={<Upload className="h-4 w-4" />}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {logoUrl ? 'Ganti Logo' : 'Unggah Logo'}
                      </Button>
                      {logoUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={uploadingLogo}
                          leftIcon={<Trash2 className="h-4 w-4 text-[var(--status-danger-text)]" />}
                          onClick={handleDeleteLogo}
                        >
                          Hapus
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="lg" isLoading={saving}>
                Simpan Profil Bisnis
              </Button>
            </div>
          </form>
        )}
      </AppShell>
    </AuthGuard>
  );
}
