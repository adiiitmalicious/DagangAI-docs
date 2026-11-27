'use client';

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Package,
  Palette,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Navbar */}
      <header className="sticky top-0 z-20 border-b border-[var(--border-default)] bg-[var(--bg-surface)]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--brand-primary)] text-white">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="font-heading text-[18px] font-bold">DagangAI</span>
          </Link>

          <div className="flex items-center gap-2">
            {user ? (
              <Link href={user.role === 'platform_admin' ? '/admin' : '/dashboard'}>
                <Button variant="primary" size="sm">
                  Buka Workspace
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Masuk
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">
                    Mulai Gratis
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-12 md:px-6 lg:grid-cols-12 lg:py-20">
          <div className="space-y-5 lg:col-span-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-primary-soft)] px-3 py-1 text-[12px] font-semibold text-[var(--brand-primary)]">
              Gratis Selama Periode Kompetisi
            </span>
            <h1 className="font-heading text-[28px] leading-[1.2] font-bold text-[var(--text-primary)] md:text-[36px]">
              Ruang kerja pemasaran AI yang paham bisnis dan produk Anda
            </h1>
            <p className="text-[16px] leading-relaxed text-[var(--text-secondary)]">
              Kelola profil usaha, katalog produk, pembuatan caption AI kontekstual,
              template desain promosi ramah ponsel, hingga jadwal konten mingguan dalam satu
              meja kerja yang rapi.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/register">
                <Button
                  variant="primary"
                  size="lg"
                  leftIcon={<ArrowRight className="h-4 w-4" />}
                  className="w-full sm:w-auto"
                >
                  Mulai Gratis Sekarang
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Masuk ke Akun
                </Button>
              </Link>
            </div>
          </div>

          {/* Pratinjau Antarmuka Nyata */}
          <div className="rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-floating)] lg:col-span-6">
            <div className="mb-3 flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <span className="text-[12px] font-semibold text-[var(--brand-primary)]">
                Konteks Aktif: Kopi Senja Nusantara • Es Kopi Susu Gula Aren
              </span>
              <span className="rounded-full bg-[var(--brand-accent-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--brand-accent)]">
                Ramah &amp; Santai
              </span>
            </div>
            <div className="space-y-3 text-[13px]">
              <div className="rounded-[10px] bg-[var(--bg-canvas)] p-3.5">
                <p className="font-semibold text-[var(--text-primary)]">
                  Variasi 1 — Fokus Rasa &amp; Bahan Alami
                </p>
                <p className="mt-1.5 leading-relaxed text-[var(--text-secondary)]">
                  Sore makin santai bareng Es Kopi Susu Gula Aren dari Kopi Senja
                  Nusantara! Perpaduan arabika lokal dan gula aren murni, mulai Rp18.000.
                  Yuk pesan lewat DM atau mampir ke kedai!
                </p>
              </div>
              <div className="flex items-center justify-between rounded-[8px] bg-[var(--bg-subtle)] px-3 py-2 text-[12px] text-[var(--text-muted)]">
                <span>Periksa kembali harga &amp; klaim sebelum dipublikasikan.</span>
                <span className="font-semibold text-[var(--brand-primary)]">
                  Siap Simpan
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Alur Kerja 4 Langkah */}
        <section className="border-y border-[var(--border-default)] bg-[var(--bg-surface)] py-14">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <h2 className="text-center font-heading text-[22px] font-bold md:text-[26px]">
              Alur Kerja Terpadu dalam 4 Langkah
            </h2>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Package,
                  title: '1. Profil & Produk',
                  desc: 'Isi identitas usaha dan katalog produk satu kali saja.',
                },
                {
                  icon: Sparkles,
                  title: '2. Konten AI Kontekstual',
                  desc: 'Hasilkan 2–3 variasi teks dan poles cepat dengan Quick Refine.',
                },
                {
                  icon: Palette,
                  title: '3. Template Desain',
                  desc: 'Pasang foto produk dan teks ke poster 1:1, 9:16, atau 16:9.',
                },
                {
                  icon: CalendarDays,
                  title: '4. Marketing Planner',
                  desc: 'Atur jadwal publikasi dan pantau status konten Anda.',
                },
              ].map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-canvas)] p-5"
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-heading text-[16px] font-semibold">{step.title}</h3>
                    <p className="mt-1.5 text-[14px] text-[var(--text-secondary)]">
                      {step.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3 Segmen UMKM & Ekraf */}
        <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
          <h2 className="text-center font-heading text-[22px] font-bold md:text-[26px]">
            Dirancang untuk Pelaku UMKM &amp; Ekonomi Kreatif Indonesia
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                title: 'Kuliner & Minuman (F&B)',
                desc: 'Menu harian, paket hemat kedai kopi, hingga pesan promo WhatsApp pelanggan tetap.',
              },
              {
                title: 'Fashion & Kerajinan',
                desc: 'Cerita produk lokal, lookbook koleksi baru, dan deskripsi katalog marketplace yang rapi.',
              },
              {
                title: 'Jasa Lokal',
                desc: 'Edukasi layanan, transparansi estimasi, dan ajakan pemesanan yang jelas dan terpercaya.',
              },
            ].map((seg) => (
              <div
                key={seg.title}
                className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)]"
              >
                <h3 className="font-heading text-[16px] font-semibold text-[var(--brand-primary)]">
                  {seg.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-secondary)]">
                  {seg.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Komitmen Responsible AI */}
        <section className="border-t border-[var(--border-default)] bg-[var(--brand-primary-soft)] py-12">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 text-center md:px-6">
            <ShieldCheck className="h-9 w-9 text-[var(--brand-primary)]" />
            <h2 className="font-heading text-[20px] font-bold text-[var(--text-primary)]">
              Komitmen Responsible AI &amp; Transparansi
            </h2>
            <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
              DagangAI hanya menyusun materi berdasarkan data yang Anda masukkan. Sistem
              dilarang mengarang harga, diskon, sertifikasi Halal/BPOM, atau klaim medis
              yang tidak Anda cantumkan, dan Anda selalu meninjau hasil akhir sebelum
              dipublikasikan.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-[13px] font-medium text-[var(--brand-primary)]">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Anti-Fabrikasi Fakta
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Error AI Tidak Potong Kuota
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Kendali Penuh di Tangan Pemilik Usaha
              </span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border-default)] bg-[var(--bg-surface)] py-6 text-center text-[13px] text-[var(--text-muted)]">
        DagangAI V1.0 — Ruang Kerja Pemasaran Digital untuk UMKM Indonesia. Gratis selama
        periode kompetisi.
      </footer>
    </div>
  );
}
