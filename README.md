# DagangAI (V1.0 — Competition MVP)

**DagangAI** adalah *AI-powered digital marketing workspace* yang dirancang khusus untuk pelaku UMKM dan ekonomi kreatif Indonesia. Pengguna cukup mengisi profil usaha dan katalog produk satu kali untuk menghasilkan materi promosi kontekstual, membuat desain poster ramah ponsel, dan menjadwalkan konten dalam satu ruang kerja terpadu.

---

## Daftar Isi

1. [Arsitektur & Tech Stack](#1-arsitektur--tech-stack)
2. [Struktur Proyek](#2-struktur-proyek)
3. [Panduan Instalasi & Menjalankan Lokal](#3-panduan-instalasi--menjalankan-lokal)
4. [Peran Pengguna (Roles) & Fungsinya](#4-peran-pengguna-roles--fungsinya)
5. [Fitur-Fitur Utama & Aturan Responsible AI](#5-fitur-fitur-utama--aturan-responsible-ai)
6. [Akun Uji Coba & Pengujian Otomatis](#6-akun-uji-coba--pengujian-otomatis)

---

## 1. Arsitektur & Tech Stack

- **Frontend (`apps/web`):** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Lucide Icons
- **Backend (`apps/api`):** Node.js, Express, TypeScript, Zod, `pg` (node-postgres)
- **Shared Package (`packages/shared`):** Tipe TypeScript, 17 domain enum, katalog kode error, dan response envelope
- **Database:** PostgreSQL 16 (`docker-compose.yml`, 18 tabel, 17 enum, ekstensi `pgcrypto` & `pg_trgm`)
- **LLM Provider:** Google Gemini API via adapter modular *provider-agnostic* (`apps/api/src/ai/provider.ts`)
- **Object Storage:** `LocalStorageAdapter` dengan isolasi path per `business_id` dan *signed URL* (siap swap ke S3/R2)

---

## 2. Struktur Proyek

```text
DagangAI/
├── apps/
│   ├── api/                 # Backend REST API (/api/v1, port 8000)
│   └── web/                 # Frontend Web Responsif (360px+ & desktop, port 3000)
├── packages/
│   └── shared/              # Tipe, enum, dan error code bersama
├── infra/                   # Salinan konfigurasi Docker Compose
├── docker-compose.yml       # Container PostgreSQL 16 (port host 5433)
├── .env.example             # Template environment variables
├── PRD.md                   # Product Requirements Document
├── API-spec.md              # Kontrak REST API /api/v1
├── database-design.md       # Desain skema PostgreSQL & DDL migrasi
├── design.md                # Design System Warm Craft Workspace
└── task.md                  # Checklist implementasi (T-001 s.d. T-050)
```

---

## 3. Panduan Instalasi & Menjalankan Lokal

### Prasyarat
- **Node.js** `>= 20`
- **pnpm** `>= 9`
- **Docker Desktop** (untuk menjalankan PostgreSQL 16)
- **Gemini API Key** dari Google AI Studio (untuk fitur AI)

### Langkah Instalasi

1. **Instal seluruh dependensi workspace:**
   ```powershell
   pnpm install
   ```

2. **Siapkan file `.env`:**
   Salin `.env.example` menjadi `.env` di root proyek:
   ```powershell
   Copy-Item .env.example .env
   ```
   Buka `.env` dan pastikan variabel berikut terisi:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5433/dagangai
   GEMINI_API_KEY=ISI_API_KEY_GEMINI_ANDA
   GEMINI_MODEL=gemini-flash-lite-latest
   ```
   *(Port host Docker disetel ke `5433` agar tidak bentrok jika PostgreSQL lokal memakai port `5432`.)*

3. **Jalankan container PostgreSQL 16:**
   ```powershell
   docker compose up -d --wait
   ```

4. **Jalankan migrasi database dan seed data awal:**
   ```powershell
   pnpm db:setup
   ```
   Perintah ini menjalankan:
   - `0001_initial_schema.sql` (18 tabel, 17 enum, indeks trigram & partial index)
   - Seed `system_ai_configs`, 7 `business_category_presets`, 12 `design_templates`, dan akun bootstrap `platform_admin`

5. **(Opsional) Muat akun demo *Kopi Senja Nusantara*:**
   ```powershell
   pnpm --filter @dagangai/api db:seed:demo
   ```

6. **Jalankan Backend dan Frontend bersamaan:**
   ```powershell
   pnpm dev
   ```
   - **Frontend:** `http://localhost:3000`
   - **Backend Healthcheck:** `http://localhost:8000/api/v1/health`

---

## 4. Peran Pengguna (Roles) & Fungsinya

Sistem menerapkan *Role-Based Access Control* (RBAC) dengan tiga tingkat akses:

### 1. `guest` (Pengunjung Publik)
Pengguna yang belum masuk ke sistem.
- **Landing Page (`/`):** Mempelajari alur kerja 4 langkah DagangAI, segmen UMKM prioritas, dan komitmen Responsible AI.
- **Registrasi (`/register`):** Mendaftar akun baru sebagai pemilik usaha (`business_owner`).
- **Login (`/login`):** Masuk ke workspace dengan *access token* dan rotasi *refresh token*.
- **Pemulihan Kata Sandi (`/forgot-password`, `/reset-password`):** Meminta tautan reset dan menetapkan kata sandi baru secara aman.

### 2. `business_owner` (Pemilik Usaha UMKM / Ekraf)
Peran utama pengguna DagangAI. Setiap akun memiliki **tepat 1 profil bisnis** (`BR-01`) dengan isolasi data ketat berdasarkan `business_id` dari JWT (`BR-02`).
- **Onboarding Wizard (`/onboarding`):** Mengisi identitas usaha 2 langkah saat pertama kali masuk, lengkap dengan tombol *"Lihat Contoh Pengisian"* per kategori.
- **Dashboard (`/dashboard`):** Melihat ringkasan aktivitas internal, sisa kuota AI, jadwal terdekat, serta daftar produk yang belum pernah dipromosikan.
- **Profil Bisnis (`/business`):** Mengelola informasi usaha, *progress bar* kelengkapan konteks, gaya komunikasi (*brand tone*), daftar kata yang dihindari AI, warna merek, dan logo usaha.
- **Produk & Layanan (`/products`):** Mengelola katalog produk/jasa, harga, keunggulan, ketersediaan, unggah hingga 3 foto (maks. 5 MB), serta tombol pintas **"Buat Konten"**.
- **AI Content Studio (`/studio`):** Menghasilkan 2–3 variasi materi promosi berbasis konteks usaha & produk, menyunting langsung, dan menyempurnakan dengan *Quick Refine*.
- **Pustaka Materi (`/library`):** Menyimpan, mencari, menyalin, mengedit, menduplikasi, dan menghapus materi teks maupun desain visual tersimpan.
- **AI Design Studio (`/designs`):** Membuat poster promosi (`1:1`, `9:16`, `16:9`) dengan *Smart Auto-Fill*, editor ramah ponsel (tanpa *drag-and-drop* wajib), *AI Copy Assist*, serta ekspor PNG/JPG `>= 1080px`.
- **Marketing Planner (`/planner`):** Menyusun jadwal konten dalam *List View* (mobile) atau *Calendar View* (desktop), mengubah status (`Draf` → `Terjadwal` → `Dipublikasikan`), dan meminta *Saran Ide Mingguan AI*.
- **Pengaturan Akun (`/account`):** Memperbarui nama lengkap, mengubah kata sandi, dan keluar dari sesi.

### 3. `platform_admin` (Admin Operasional Platform)
Peran pengelola untuk menjaga keandalan layanan, biaya AI, dan keamanan platform selama periode kompetisi.
- **Dashboard Operasional (`/admin`):** Memantau 4 KPI harian (pengguna terdaftar/aktif, total permintaan AI, tingkat keberhasilan AI, dan estimasi token harian).
- **Kontrol Runtime AI:** Mengubah batas kredit harian WIB, *rate limit* per menit, dan mengaktifkan/mematikan **Global Circuit Breaker** saat terjadi gangguan atau lonjakan biaya (dengan dialog konfirmasi).
- **Audit Log Pemakaian AI:** Memantau riwayat permintaan AI terfilter berdasarkan status dan fitur.
- **Moderasi Akun:** Menangguhkan (*suspend* dengan alasan wajib) atau mengaktifkan kembali akun `business_owner` yang terindikasi penyalahgunaan; setiap aksi tercatat otomatis di `admin_audit_logs`.

---

## 5. Fitur-Fitur Utama & Aturan Responsible AI

| Modul | Fitur Utama | Aturan & Perlindungan Sistem |
|---|---|---|
| **M1–M3 Fondasi** | Auth JWT + Refresh Token, Profil Bisnis 1:1, Katalog Produk & Foto | `BR-01` (1 akun = 1 bisnis), `BR-10` (*soft delete* produk menjaga materi historis), `BR-12` (validasi *magic bytes* JPG/PNG/WebP ≤ 5 MB dengan *row lock*). |
| **M4 AI Content Studio** | 6 jenis materi, Strip Konteks Aktif, 3 variasi, Quick Refine + *Undo*, Rating & Lapor Fakta | `BR-03` & `BR-04` (anti-fabrikasi harga, diskon, Halal/BPOM, klaim medis; gunakan placeholder `[...]`), `BR-05` (*Human Review Notice*), `BR-07` (error/timeout tidak potong kuota WIB). |
| **M5 Content Library** | Tab Semua / Teks / Desain, pencarian trigram, duplikasi, edit status | Penanda `"(Produk dihapus)"` bila produk terkait telah dihapus dari katalog aktif. |
| **M6 AI Design Studio** | 12 template (`1:1`, `9:16`, `16:9`), *Smart Auto-Fill*, *AI Copy Assist*, Ekspor PNG/JPG | Kontrol tap/slider penuh (*zoom* & tombol pan arah), tanpa *drag-and-drop* wajib (`360px+`). |
| **M7 Marketing Planner** | *List* & *Calendar View*, ubah status cepat, *Saran Ide Mingguan AI* + *bulk save* | `BR-09` (status `planned` wajib tanggal target; `published` mencatat `published_at`). |
| **M8 Dashboard** | Metrik periode `7d`/`30d`/`all`, *product coverage*, jadwal terdekat | `BR-08` (disclaimer bahwa seluruh metrik adalah aktivitas internal DagangAI, bukan metrik penjualan/medsos eksternal). |
| **M9 Admin & Landing** | KPI operasional, *Circuit Breaker*, moderasi user, Landing Page publik | `BR-11` (tanpa klaim jaminan peningkatan omzet atau penjualan). |

---

## 6. Akun Uji Coba & Pengujian Otomatis

### Kredensial Siap Pakai (Setelah `db:setup` & `db:seed:demo`)
- **Pemilik Usaha (Demo *Kopi Senja Nusantara*):**
  - Email: `rina@kopisenja.id`
  - Password: `DemoKopiSenja123!`
- **Platform Admin (`/admin`):**
  - Email: `admin@dagangai.app` *(sesuai `ADMIN_EMAIL` di `.env`)*
  - Password: `ChangeMeAdmin123!` *(sesuai `ADMIN_PASSWORD` di `.env`)*

### Menjalankan Pengujian & Build
```powershell
# Jalankan suite uji keamanan, integritas data & 12 skenario Responsible AI
pnpm --filter @dagangai/api test

# Cek tipe TypeScript seluruh workspace
pnpm typecheck

# Build produksi API & Web
pnpm build
```
