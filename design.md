# UI/UX & Design System Specification — DagangAI

> **Status:** Draft v1.0 (Ready for Design & Frontend Implementation)  
> **Document Type:** UI/UX & Design System Specification  
> **Product:** DagangAI  
> **Release Target:** V1.0 — Competition MVP  
> **Platform Target:** Web Responsif (Mobile `360px+` & Desktop `1024px+`)  
> **Version:** 1.0.0  
> **Last Updated:** 27 November 2026  
> **Source Documents:** [PRD.md](./PRD.md) (v1.0.0), [API-spec.md](./API-spec.md) (v1.0.0), [database-design.md](./database-design.md) (v1.0.0)  
> **Document Purpose:** Menetapkan arah visual, *design tokens*, sistem tata letak responsif, arsitektur navigasi, *wireframe* layar utama, spesifikasi template Design Studio, pola interaksi AI & Responsible AI, serta panduan *microcopy* Bahasa Indonesia sebagai acuan tunggal bagi tim UI/UX dan Frontend.

---

## Daftar Isi

1. [Arah Desain dan Karakter Visual](#1-arah-desain-dan-karakter-visual)
2. [Design System & Design Tokens](#2-design-system--design-tokens)
3. [Tata Letak Responsif dan Arsitektur Navigasi](#3-tata-letak-responsif-dan-arsitektur-navigasi)
4. [Spesifikasi Layar Utama & Wireframe](#4-spesifikasi-layar-utama--wireframe)
5. [Spesifikasi Editor & Katalog Template Design Studio](#5-spesifikasi-editor--katalog-template-design-studio)
6. [Pola Interaksi AI, Kuota, dan Responsible AI](#6-pola-interaksi-ai-kuota-dan-responsible-ai)
7. [Katalog Komponen UI Inti dan State Sistem](#7-katalog-komponen-ui-inti-dan-state-sistem)
8. [Panduan Microcopy & UX Writing (Bahasa Indonesia)](#8-panduan-microcopy--ux-writing-bahasa-indonesia)
9. [Standar Aksesibilitas dan Checklist Verifikasi UI](#9-standar-aksesibilitas-dan-checklist-verifikasi-ui)

---

# 1. Arah Desain dan Karakter Visual

## 1.1 Konsep Visual: *Warm Craft Workspace*

DagangAI dirancang bukan sebagai *chatbot* teknologi yang dingin atau serba gelap, melainkan sebagai **meja kerja digital yang hangat, teratur, dan membumi** bagi pelaku UMKM serta ekonomi kreatif Indonesia.

| Dimensi | Keputusan Desain | Alasan UX |
|---|---|---|
| **Suasana (Mood)** | Hangat, bersih, profesional, ramah pemula | Mengurangi rasa terintimidasi pada pelaku usaha yang baru pertama kali memakai alat pemasaran berbasis AI. |
| **Tema Warna V1.0** | **Light Mode** dengan kanvas hangat (`#FAF8F5`) dan kartu putih bersih (`#FFFFFF`) | Keterbacaan tinggi saat digunakan di luar ruangan/kedai lewat ponsel serta menampilkan warna produk & template promosi secara akurat. |
| **Kepadatan Informasi** | Lapang dan terstruktur (*progressive disclosure*) | Field opsional tidak membebani pandangan awal; pengguna fokus pada satu aksi utama per layar. |
| **Prinsip Interaksi** | **Tap-First & Form-First** (tanpa drag-and-drop wajib) | Memastikan seluruh alur inti nyaman di layar sentuh `360px` sekaligus cepat di desktop (`NFR-01`, `NFR-02`). |

## 1.2 Prinsip Visual yang Dihindari (*Anti-Patterns*)

- Tidak menggunakan gradien ungu-biru neon generik ala template AI.
- Tidak menyembunyikan aksi penting hanya di balik *hover* atau klik kanan.
- Tidak menampilkan metrik palsu/simulasi penjualan atau klaim "Omzet naik 10x" (`BR-08`, `BR-11`).
- Tidak memaksa pengguna menulis *prompt* kosong panjang untuk memulai pekerjaan.

---

# 2. Design System & Design Tokens

## 2.1 Palet Warna (WCAG 2.1 AA Compliant)

### Permukaan & Garis (*Neutral Warm Scale*)
| Token | Hex | Penggunaan |
|---|---|---|
| `--bg-canvas` | `#FAF8F5` | Latar belakang utama halaman workspace |
| `--bg-surface` | `#FFFFFF` | Kartu konten, panel formulir, modal, sidebar |
| `--bg-subtle` | `#F3EFE9` | Latar input non-aktif, chip kategori, baris hover |
| `--border-default` | `#E5DFD6` | Garis pemisah halus antar kartu dan seksi |
| `--border-strong` | `#CFC6B8` | Border input aktif, divider penegas |

### Warna Merek & Aksen
| Token | Hex | Kontras vs Putih | Penggunaan |
|---|---|---|---|
| `--brand-primary` | `#0F5C4D` | `7.9:1` (AAA) | Tombol aksi utama (*Generate*, *Simpan*), tautan aktif, ikon fokus |
| `--brand-primary-hover` | `#0B463B` | `10.5:1` | State hover/pressed tombol utama |
| `--brand-primary-soft` | `#E6F2EF` | — | Latar tab aktif, strip konteks AI, badge informasi |
| `--brand-accent` | `#D96B27` | `3.5:1` (Large/UI) | Highlight aksen kreatif, penanda fitur unggulan, indikator progres |
| `--brand-accent-soft` | `#FDF0E6` | — | Latar highlight hangat dan ikon aksen |

### Tipografi & Warna Semantik
| Token | Hex | Penggunaan |
|---|---|---|
| `--text-primary` | `#1C1917` | Judul, isi utama, teks tombol sekunder |
| `--text-secondary` | `#57534E` | Subjudul, label form, deskripsi kartu (`6.7:1` vs `#FFF`) |
| `--text-muted` | `#78716C` | Helper text, timestamp, placeholder (`4.7:1` vs `#FFF`) |
| `--status-draft-bg` / `text` | `#F3F4F6` / `#374151` | Badge status `draft` |
| `--status-planned-bg` / `text` | `#FEF3C7` / `#92400E` | Badge status `planned`, peringatan konteks/kuota menipis |
| `--status-published-bg` / `text` | `#DCFCE7` / `#166534` | Badge status `published`, toast sukses |
| `--status-danger-bg` / `text` | `#FEE2E2` / `#991B1B` | Validasi error, konfirmasi hapus, kuota habis (`0`) |

## 2.2 Sistem Tipografi

- **Font Heading:** `Plus Jakarta Sans` (Weight `600`, `700`)
- **Font Body & UI:** `Inter` (Weight `400`, `500`, `600`) — gunakan `font-variant-numeric: tabular-nums` pada angka harga, kuota AI, penghitung karakter, dan tanggal kalender.

| Level | Desktop | Mobile | Line Height | Weight | Penggunaan |
|---|---|---|---|---|---|
| `Display / Hero` | `36px` | `28px` | `1.2` | `700` | Headline landing page |
| `H1 / Page Title` | `24px` | `20px` | `1.3` | `700` | Judul halaman workspace |
| `H2 / Section` | `18px` | `17px` | `1.35` | `600` | Judul kartu utama / seksi form |
| `H3 / Card Title` | `16px` | `15px` | `1.4` | `600` | Nama produk, judul materi |
| `Body` | `15px` | `15px` | `1.55` | `400` | Isi deskripsi, pratinjau hasil AI |
| `Label / UI` | `14px` | `14px` | `1.4` | `500` | Label form, tombol, item navigasi |
| `Caption / Meta` | `12px` | `12px` | `1.4` | `400/500` | Badge status, timestamp, helper text |

> **Aturan Mobile Input:** Seluruh `<input>`, `<textarea>`, dan `<select>` menggunakan ukuran minimal `16px` pada viewport mobile untuk mencegah *auto-zoom* pada Safari iOS.

## 2.3 Spasi, Radius, dan Elevasi

- **Skala Spasi (kelipatan 4px):** `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`, `48`, `64`.
- **Border Radius:**
  - `8px`: Tombol, input form, dropdown, item menu.
  - `12px`: Kartu konten, kartu produk, panel hasil AI.
  - `16px`: Modal dialog, *bottom sheet* mobile, banner onboarding.
  - `9999px`: Pill status, chip *Quick Refine*, indikator kuota AI.
- **Elevasi:** Mengutamakan `1px solid var(--border-default)` + bayangan sangat halus:
  - `--shadow-card`: `0 1px 2px rgba(28, 25, 23, 0.05)`
  - `--shadow-floating`: `0 8px 24px rgba(28, 25, 23, 0.10)` (dropdown, modal, bottom sheet)

---

# 3. Tata Letak Responsif dan Arsitektur Navigasi

## 3.1 Breakpoints & Grid (`NFR-01`)

| Breakpoint | Rentang Lebar | Grid & Margin | Pola Navigasi |
|---|---|---|---|
| **Mobile** | `360px – 767px` | 4 kolom, margin `16px`, gutter `12px` | Top Bar (`56px`) + **Bottom Nav (`64px`)** + Bottom Sheet "Lainnya" |
| **Tablet** | `768px – 1023px` | 8 kolom, margin `24px`, gutter `16px` | Top Bar (`60px`) + Collapsible Drawer Sidebar |
| **Desktop** | `1024px+` | Sidebar `240px` + Konten `max-width: 1200px`, 12 kolom, gutter `20px` | Fixed Left Sidebar + Top Utility Bar (`64px`) |

## 3.2 Struktur Shell Aplikasi

### Desktop Shell (`≥ 1024px`)
```text
+--------------------+--------------------------------------------------------------+
| DagangAI           | [Judul Halaman]              [Kuota AI: 25/30] [+ Buat] [U]  |
+--------------------+--------------------------------------------------------------+
| [Beranda]          |                                                              |
|                    |  Area Konten Utama (max-width: 1200px, padding: 24px)        |
| BISNIS             |                                                              |
|  - Profil Bisnis   |                                                              |
|  - Produk & Layanan|                                                              |
|                    |                                                              |
| STUDIO & KONTEN    |                                                              |
|  - AI Content      |                                                              |
|  - Design Studio   |                                                              |
|  - Marketing Plan  |                                                              |
|  - Pustaka Materi  |                                                              |
|                    |                                                              |
| ------------------ |                                                              |
| [Pengaturan Akun]  |                                                              |
| [Nama Bisnis Aktif]|                                                              |
+--------------------+--------------------------------------------------------------+
```

### Mobile Shell (`360px – 767px`)
```text
+-----------------------------------+
| DagangAI          [AI: 25/30] [U] |  <- Top Bar (56px, sticky)
+-----------------------------------+
|                                   |
|  Area Konten 1 Kolom              |
|  (padding: 16px, bottom: 84px)    |
|                                   |
+-----------------------------------+
| Beranda | Produk | [AI] | Plan | =|  <- Bottom Nav (64px, target >= 44px)
+-----------------------------------+
   Tab "=" (Lainnya) membuka Bottom Sheet:
   - Profil Bisnis  - Design Studio  - Pustaka Materi  - Pengaturan Akun
```

---

# 4. Spesifikasi Layar Utama & Wireframe

## 4.1 Landing Page (Guest)
- **Tujuan:** Menjelaskan secara jujur dan jelas nilai DagangAI sebagai *AI-powered digital marketing workspace* bagi UMKM & ekonomi kreatif, tanpa janji peningkatan penjualan otomatis (`BR-11`).
- **Struktur Seksi (1 ide utama per layar):**
  1. **Navbar:** Logo DagangAI, tombol "Masuk", dan CTA primer "Mulai Gratis".
  2. **Hero:** Headline jelas (*"Ruang kerja pemasaran AI yang paham bisnis dan produk Anda"*), subheadline singkat, CTA "Mulai Gratis — Periode Kompetisi", serta pratinjau antarmuka produk nyata (konteks bisnis → variasi konten → template poster).
  3. **Alur Kerja Terpadu (4 Langkah):** Isi Profil & Produk → Buat Konten AI Kontekstual → Pasang di Template Desain → Atur di Marketing Planner.
  4. **Segmen UMKM & Ekraf:** Contoh penggunaan nyata untuk F&B, Fashion & Kerajinan, dan Jasa Lokal.
  5. **Komitmen Responsible AI & Transparansi:** Menegaskan AI tidak mengarang klaim produk dan pengguna selalu meninjau hasil akhir.
  6. **Footer:** Ringkas dengan tautan Masuk/Daftar dan informasi periode kompetisi gratis.

## 4.2 Autentikasi & Onboarding Profil Bisnis (`FR-01`–`FR-04`)

- **Layar Login / Daftar:** Kartu terpusat (`max-width: 420px`) di atas kanvas hangat `#FAF8F5`, validasi inline per field, toggle tampilkan kata sandi, dan tautan "Lupa kata sandi?".
- **Onboarding Wizard 2 Langkah** (muncul otomatis saat `has_business === false`):
  - **Langkah 1 — Identitas Usaha (Wajib):**
    - Nama Bisnis, Kategori Bisnis (kartu/dropdown dengan penanda preset tersedia untuk *F&B*, *Fashion & Kerajinan*, *Jasa Lokal*), Deskripsi Singkat (counter `0/500`), plus tombol **"Lihat Contoh Pengisian"** (`GET /business/presets`) yang mengisi referensi secara non-destruktif.
  - **Langkah 2 — Karakter Merek & Pelanggan (Opsional):**
    - Target Pelanggan, Keunggulan Utama (chip/daftar dinamis maks. 5), Pilihan Bahasa & Gaya Komunikasi (*brand tone* dalam bentuk kartu pilihan dengan contoh kalimat singkat), Warna Merek & Logo.
    - Aksi: **"Simpan & Masuk Workspace"** dan tombol sekunder **"Lengkapi Nanti"** (langsung menuju langkah tambah produk pertama atau Dashboard).

## 4.3 Dashboard / Beranda (`FR-33`–`FR-36`, `BR-08`)

```text
+-------------------------------------------------------------------+
| Halo, Rina — Kopi Senja Nusantara                                 |
| [Banner jika profil < 80%: Kelengkapan Profil 65% -> Lengkapi]    |
+-------------------------------------------------------------------+
| AKSI CEPAT                                                        |
| [+ Buat Konten AI]   [+ Buat Desain Promo]   [+ Tambah Produk]    |
+-------------------------------------------------------------------+
| RINGKASAN AKTIVITAS (30 Hari v)   [i] Catatan Aktivitas Internal  |
| +---------------+ +---------------+ +---------------+ +---------+ |
| | 18            | | 12            | | 4             | | 21 / 30 | |
| | Generasi AI   | | Materi Simpan | | Desain Dibuat | | Kuota AI| |
| +---------------+ +---------------+ +---------------+ +---------+ |
| Status Planner:  [Draft: 3]   [Planned: 5]   [Published: 4]       |
| *Data ini mencatat aktivitas Anda di DagangAI, bukan metrik       |
|  jangkauan media sosial atau penjualan aktual.*                   |
+-------------------------------------------------------------------+
| JADWAL TERDEKAT                 | PRODUK BELUM DIPROMOSIKAN       |
| - 28 Nov | IG | Es Kopi Susu    | - Matcha Latte Oat [Buat Konten]|
| - 30 Nov | WA | Paket Hemat     | - Roti Bakar Keju  [Buat Konten]|
+-------------------------------------------------------------------+
```

- **Aturan UX:**
  - *Disclaimer* aktivitas internal (`BR-08`) selalu tampil langsung di dalam kartu Ringkasan Aktivitas (bukan disembunyikan di tooltip).
  - Pada mobile, kartu metrik tersusun `2x2` grid dan seksi bawah menumpuk 1 kolom.

## 4.4 Profil Bisnis & Manajemen Produk (`FR-05`–`FR-13`)

- **Profil Bisnis (`/business`):**
  - Header menampilkan **Progress Bar Kelengkapan Konteks** (mis. `85% — Konteks Baik`) dan daftar singkat item yang belum terisi.
  - Seksi terpisah jelas: *Informasi Dasar*, *Target Pelanggan & Keunggulan*, *Identitas & Gaya Komunikasi Merek* (termasuk *Kata yang Dihindari* dalam bentuk tag input, pemilih warna hex + preset, dan unggah logo ≤ 5 MB).
- **Daftar Produk (`/products`):**
  - Top bar: Search input + filter Tipe (`Semua`/`Produk`/`Layanan`) + filter Status (`Tersedia`/`Pre-Order`/`Tidak Tersedia`) + CTA **"+ Tambah Produk"**.
  - Kartu produk menampilkan: thumbnail foto utama (rasio `4:3`), nama produk, harga (`display_label` atau *"Harga belum diatur"*), badge status, jumlah materi terkait, serta tombol langsung **"Buat Konten"** (`FR-13`) dan menu ubah/hapus.
- **Form Produk:** Mendukung unggah hingga **3 foto** dengan penandaan tombol **"Jadikan Foto Utama"** (bintang/pill) dan validasi ukuran/format langsung di klien sebelum unggah (`BR-12`).

## 4.5 AI Content Studio (`FR-14`–`FR-20`, `§10 PRD`)

Layar inti DagangAI dengan pendekatan **Structured Form-First + Quick Refine**:

### Wireframe Desktop (2-Pane Split: 42% Kiri / 58% Kanan)
```text
+-----------------------------------------------------------------------------+
| AI Content Studio                                   [Sisa Kuota: 25/30 AI]  |
| [Strip Konteks Aktif: Kopi Senja Nusantara • Es Kopi Susu • Ramah & Santai] |
+-------------------------------+---------------------------------------------+
| 1. Jenis Materi               | HASIL VARIASI (3 Pilihan)                   |
| [Caption IG/FB] [Deskripsi]   | [Variasi 1] [Variasi 2] [Variasi 3]         |
| [Slogan] [CTA] [Ide] [WA]     | +-----------------------------------------+ |
|                               | | Angle: Fokus Rasa & Bahan Alami         | |
| 2. Produk / Layanan           | | [Textarea Editable Langsung]            | |
| [Es Kopi Susu Gula Aren    v] | | Sore makin santai bareng Es Kopi Susu...| |
| (atau: Promosi Bisnis Umum)   | |                                         | |
|                               | | 347 karakter • 56 kata                  | |
| 3. Kanal & Tujuan             | +-----------------------------------------+ |
| Kanal:  [Instagram         v] | QUICK REFINE (1 Kredit):                    |
| Tujuan: [Perkenalan Produk v] | [Lebih singkat] [Lebih santai] [+ CTA]      |
| Gaya:   [Ramah & Santai    v] | [Instruksi revisi singkat...     ] [Ubah] |
|                               |                                             |
| 4. Info Tambahan (Opsional)   | [Salin] [Simpan ke Pustaka] [Ke Desain]     |
| [Promo/detail khusus...     ] | [Jadwalkan di Planner]                      |
| 0/300 karakter                |                                             |
|                               | [!] Periksa kembali harga & klaim sebelum   |
| [   Buat 3 Variasi Konten   ] |     dipublikasikan.  Apakah sesuai? [👍][👎]|
+-------------------------------+---------------------------------------------+
```

### Perilaku Mobile (`< 768px`)
- Form tampil 1 kolom penuh. Setelah pengguna mengetuk **"Buat 3 Variasi Konten"**, halaman secara halus menggulir ke panel hasil dengan **Tab Variasi (`Opsi 1 | Opsi 2 | Opsi 3`)** dan tombol **"Ubah Parameter"** untuk kembali ke form tanpa kehilangan input.
- Setelah *Quick Refine* dijalankan, tampilkan pill **"Lihat versi sebelumnya"** agar pengguna bisa membandingkan atau mengembalikan (*undo*) teks sebelum menyimpan (`US-04`).
- Jika pengguna mengetuk 👎 (*tidak sesuai*), tampilkan form ringkas opsional untuk menandai `is_factual_issue` (*"Mengandung harga/klaim yang tidak saya berikan"*) (`FR-19`).

## 4.6 Pustaka Materi / Content Library (`FR-21`–`FR-23`)
- Menyediakan tab teratas: **Semua**, **Materi Teks**, **Desain Visual**.
- Bar filter: pencarian kata kunci + filter Produk, Kanal, dan Status (`draft` / `planned` / `published`).
- Kartu materi menampilkan: judul, cuplikan 2–3 baris (atau thumbnail desain), badge jenis materi, badge status, chip nama produk (ditandai *"(Produk dihapus)"* bila `product.is_deleted === true` sesuai `BR-10`), serta tombol aksi cepat: **Salin / Unduh**, **Edit**, **Jadwalkan**, dan menu **Duplikasi / Hapus**.

## 4.7 Marketing Planner (`FR-29`–`FR-32`)
- **Switch Tampilan:** **Daftar (List)** *(default di mobile)* dan **Kalender (Calendar)** *(default di desktop)*.
- **Header Aksi:** Tombol **"+ Tambah Rencana"** dan tombol aksen **"✨ Saran Ide Mingguan AI"** (`POST /ai/planner/ideas`).
- **Tampilan Daftar:** Dikelompokkan berdasarkan tanggal target (atau *"Belum Dijadwalkan"* untuk `draft`). Setiap baris menampilkan tanggal, ikon kanal, judul, thumbnail desain/materi tertaut, dan **Status Pill interaktif** yang dapat diketuk langsung untuk mengganti `Draft` → `Planned` → `Published` (`FR-31`).
- **Tampilan Kalender:** Grid bulanan/mingguan bersih; mengetuk tanggal membuka daftar item tanggal tersebut (di mobile menggunakan *bottom sheet*), dan mengubah tanggal selalu memakai *date picker* standar (tanpa drag-and-drop wajib).
- **Modal Saran Ide AI:** Pengguna mengisi rentang minggu, tema kampanye opsional, dan produk target → sistem menampilkan 5–7 kartu ide dengan checkbox → pengguna memilih ide yang cocok lalu mengetuk **"Simpan Terpilih ke Planner"** (`POST /planner/items/bulk`).

## 4.8 Platform Admin Operational Dashboard (`FR-37`–`FR-39`)
- Diakses hanya oleh akun ber-role `platform_admin` melalui rute `/admin`.
- **Bagian 1 — Ringkasan Operasional Harian:** 4 kartu angka (*Pengguna Terdaftar / Aktif*, *Permintaan AI Hari Ini*, *Tingkat Keberhasilan AI*, *Estimasi Token Harian*).
- **Bagian 2 — Kontrol Runtime AI:** Form konfigurasi `daily_credits_limit`, `rate_limit_per_minute`, dan sakelar **Global Circuit Breaker** (dengan dialog konfirmasi + field pesan pemeliharaan).
- **Bagian 3 — Tabel Log Pemakaian AI:** Filter berdasarkan status (`success`/`failed`/`rate_limited`), fitur, dan tanggal.
- **Bagian 4 — Moderasi Akun:** Pencarian akun + aksi *Suspend* (wajib isi alasan) / *Aktifkan Kembali*.

---

# 5. Spesifikasi Editor & Katalog Template Design Studio

Dirancang khusus agar pelaku UMKM dapat membuat poster promosi dari ponsel **dalam < 2 menit tanpa drag-and-drop kompleks (`R-04`, `FR-24`–`FR-28`)**.

## 5.1 Alur 2 Langkah Design Studio

1. **Langkah 1 — Pilih Template & Sumber Data:**
   - Filter rasio: **Feed (`1:1`)**, **Story (`9:16`)**, **Banner (`16:9`)**.
   - Filter segmen: **Semua**, **F&B**, **Fashion & Kerajinan**, **Jasa Lokal**, **Umum**.
   - Pilihan *Smart Auto-Fill* (opsional): pilih **Produk** dan/atau **Materi Teks** tersimpan agar foto, harga, logo, warna merek, dan teks langsung terisi otomatis (`FR-25`).
2. **Langkah 2 — Editor Parameter Ramah Mobile:**

### Wireframe Editor Mobile (`360px`)
```text
+-----------------------------------+
| <- Kembali    [Simpan] [Unduh v]  |
+-----------------------------------+
|      +---------------------+      |
|      |                     |      |  <- Sticky Live Canvas Preview
|      |   PRATINJAU POSTER  |      |     (maks. 40-42% tinggi layar,
|      |        1:1          |      |      update real-time)
|      |                     |      |
|      +---------------------+      |
+-----------------------------------+
| [Teks] [Foto] [Warna] [Template]  |  <- 4 Tab Kontrol Sederhana
+-----------------------------------+
| [✨ Isi Teks Otomatis AI (1 AI)]  |
| Headline (24/45)                  |
| [Es Kopi Susu Gula Aren         ] |
| Sub-headline (42/90)              |
| [Arabika lokal & gula aren murni] |
| Badge / Harga (13/25) [Toggle ON] |
| [Mulai Rp18.000                 ] |
| Ajakan / CTA (21/35)              |
| [Pesan via DM Sekarang          ] |
+-----------------------------------+
```

- **Tab `Teks`:** Input terstruktur per slot lengkap dengan penghitung batas karakter (`24/45`) agar teks tidak pernah terpotong/bertabrakan, tombol **"Ambil dari Pustaka"**, dan tombol **"✨ Saran Teks AI"** (`POST /ai/design/copy-assist`).
- **Tab `Foto`:** Pilih foto dari katalog produk atau unggah foto baru, plus slider **Zoom (`1.0x–2.0x`)** dan tombol geser arah (`↑ ↓ ← →`) sebagai alternatif ramah sentuh untuk *pan/crop*.
- **Tab `Warna & Gaya`:** Tombol cepat **"Gunakan Warna Merek Saya"**, 5 palet warna preset harmonis, pilihan 3 pasangan font preset (*Modern Clean*, *Warm Artisan*, *Bold Promo*), serta sakelar tampilkan/sembunyikan **Logo** (dengan pilihan posisi: Kiri Atas / Kanan Atas / Bawah) dan **Badge Harga**.
- **Tab `Template`:** Ganti layout template tanpa kehilangan teks dan foto yang sudah diisi.
- **Ekspor (`FR-28`):** Menu unduh menyediakan pilihan **PNG (Kualitas Tajam)** dan **JPG (Ukuran Ringan)** pada resolusi minimal `1080px` (`1080×1080`, `1080×1920`, atau `1920×1080`).

## 5.2 Katalog Template Awal V1.0 (12 Template Seed)

| ID Template | Nama Template | Segmen | Rasio | Karakter Layout |
|---|---|---|---|---|
| `tpl_fnb_warm_01` | Warm Menu Highlight | F&B | `1:1` | Foto menu besar di atas, blok teks hangat + badge harga di bawah |
| `tpl_fnb_story_01` | Daily Menu Story | F&B | `9:16` | Foto penuh dengan *soft gradient* bawah, badge harga menonjol & CTA |
| `tpl_fnb_banner_01` | Promo Paket Banner | F&B | `16:9` | Split kiri-kanan: teks & harga di kiri, foto produk di kanan |
| `tpl_fashion_clean_01` | Lookbook Minimal | Fashion & Kerajinan | `1:1` | Bingkai putih bersih, tipografi editorial, fokus detail produk |
| `tpl_fashion_story_01` | New Arrival Story | Fashion & Kerajinan | `9:16` | Kartu produk vertikal elegan dengan aksen warna merek |
| `tpl_fashion_banner_01` | Collection Header | Fashion & Kerajinan | `16:9` | Banner katalog horizontal dengan blok judul & foto produk |
| `tpl_service_trust_01` | Promo Layanan Jelas | Jasa Lokal | `1:1` | Fokus headline manfaat, 1 foto/ilustrasi layanan, CTA kontak jelas |
| `tpl_service_story_01` | Booking Story | Jasa Lokal | `9:16` | Kartu penawaran layanan vertikal dengan badge ketersediaan & CTA |
| `tpl_service_banner_01` | Service Info Banner | Jasa Lokal | `16:9` | Banner profil layanan horizontal dengan blok warna merek |
| `tpl_general_promo_01` | Promo Serbaguna | Umum | `1:1` | Layout fleksibel cocok untuk semua kategori UMKM & ekraf |
| `tpl_general_story_01` | Story Pengumuman | Umum | `9:16` | Layout pengumuman promo atau produk baru vertikal |
| `tpl_general_banner_01` | Banner Kampanye | Umum | `16:9` | Banner serbaguna untuk header katalog atau promosi WhatsApp |

---

# 6. Pola Interaksi AI, Kuota, dan Responsible AI

1. **Strip Transparansi Konteks Aktif (`BR-03`):**
   - Selalu tampil di bagian atas AI Content Studio & AI Copy Assist agar pengguna melihat data mana yang sedang dibaca AI, lengkap dengan tautan cepat *"Ubah Profil"* atau *"Ganti Produk"*.
2. **Peringatan Konteks Minim (`R-09`):**
   - Jika `business.completeness_score < 50` atau deskripsi produk singkat, tampilkan *soft warning banner* (warna amber lembut): *"Profil bisnis masih singkat. Hasil AI tetap bisa dibuat, namun akan jauh lebih relevan jika profil dilengkapi."*
3. **Highlight Placeholder (`BR-04`):**
   - Teks placeholder yang dikembalikan AI (seperti `[isi harga]` atau `[isi nomor WhatsApp]`) diberi sorotan visual lembut pada mode pratinjau agar pengguna langsung sadar perlu mengisinya sebelum salin/publikasi.
4. **Human Review Notice (`BR-05`):**
   - Setiap kartu hasil AI wajib menampilkan catatan permanen di bagian bawah: *"Periksa kembali harga, detail produk, dan klaim promosi sebelum dipublikasikan."*
5. **Visualisasi Kuota Harian (`FR-35`, `§13 PRD`):**
   - **Normal (`> 20%`):** Pill netral `AI: 25/30`.
   - **Menipis (`1–20%`):** Pill amber `AI: 4/30 — Reset 00.00 WIB`.
   - **Habis (`0`):** Pill merah lembut `Kuota AI Habis`, tombol generate nonaktif dengan penjelasan waktu reset serta catatan bahwa **edit pustaka, template desain manual, dan planner tetap aktif**.
6. **Penanganan Loading & Error AI (`NFR-04`, `BR-07`):**
   - Loading menggunakan *skeleton card* bertahap dengan pesan proses (*"Membaca konteks bisnis Anda..."* → *"Menyusun variasi materi..."*) dan menonaktifkan tombol submit agar tidak terjadi klik ganda.
   - Jika terjadi timeout/error provider (`502`/`504`), tampilkan kartu error dengan pesan jelas: **"Layanan AI sedang sibuk. Kuota harian Anda tidak berkurang."** + tombol **"Coba Lagi"**.

---

# 7. Katalog Komponen UI Inti dan State Sistem

| Komponen | Varian Utama | Aturan Desain |
|---|---|---|
| **Button** | `Primary` (`#0F5C4D`), `Secondary` (outline `#CFC6B8`), `Ghost`, `Danger` (`#991B1B`) | Tinggi minimum `44px` di mobile (`40px` di desktop); state loading menampilkan spinner + label tetap stabil (tidak berubah lebar). |
| **Input / Textarea / Select** | Default, Focus (`2px solid #0F5C4D`), Error (`#991B1B`), Disabled | Selalu punya `<label>` eksplisit di atas input (bukan mengandalkan placeholder saja), penghitung karakter untuk field terbatas, pesan error tepat di bawah field. |
| **Status Badge** | `Draft`, `Planned`, `Published` | Ikon titik kecil + teks Bahasa Indonesia (`Draf`, `Terjadwal`, `Dipublikasikan`) agar tidak bergantung warna semata. |
| **Empty State Card** | Produk kosong, Pustaka kosong, Planner kosong | Ikon sederhana + 1 kalimat manfaat + 1 tombol aksi primer (*"Tambah Produk Pertama"* / *"Buat Konten Pertama"*). |
| **Modal & Bottom Sheet** | Konfirmasi hapus, Preview cepat, Pilih ide AI | Tampil sebagai **Centered Modal** di desktop (`≥ 768px`) dan **Bottom Sheet** yang mudah ditutup dari bawah di mobile (`< 768px`). |
| **Toast Notification** | Success, Info, Warning, Error | Muncul di kanan atas (desktop) atau di atas Bottom Nav (mobile), auto-dismiss 4 detik (error tetap bertahan sampai ditutup atau 6 detik). |

---

# 8. Panduan Microcopy & UX Writing (Bahasa Indonesia)

Mengikuti `NFR-08`, seluruh teks antarmuka memakai Bahasa Indonesia yang **hangat, singkat, lugas, dan bebas jargon teknis**:

| Situasi | Hindari (Terlalu Teknis / Berlebihan) | Gunakan (Sesuai Suara DagangAI) |
|---|---|---|
| CTA AI Content Studio | *"Execute Prompt Generation"* | **"Buat Variasi Konten"** |
| Disclaimer Dashboard | *"Internal metrics only"* | **"Ringkasan ini mencatat aktivitas Anda di DagangAI, bukan metrik jangkauan media sosial atau hasil penjualan aktual."** |
| Error Provider AI | *"504 Gateway Timeout from LLM"* | **"Layanan AI sedang sibuk atau lambat merespons. Kuota AI Anda tidak berkurang. Silakan coba lagi."** |
| Kuota AI Habis | *"429 Quota Exceeded"* | **"Kuota AI harian Anda sudah habis dan akan diisi ulang pukul 00.00 WIB. Anda tetap bisa mengedit materi, memakai template desain manual, dan mengatur jadwal."** |
| Peringatan Review AI | *"AI may hallucinate"* | **"Periksa kembali harga, detail produk, dan klaim promosi sebelum dipublikasikan."** |
| Hapus Produk | *"Confirm soft delete record?"* | **"Hapus produk ini dari katalog? Materi promosi dan jadwal yang pernah Anda buat tetap tersimpan aman."** |
| Salin Teks Berhasil | *"Copied to clipboard"* | **"Teks disalin! Siap ditempel ke Instagram atau WhatsApp Anda."** |

---

# 9. Standar Aksesibilitas dan Checklist Verifikasi UI

Sebelum V1.0 dinyatakan siap rilis (`PRD.md §15.3`), seluruh layar wajib lolos verifikasi berikut:

- [ ] **Viewport Mobile (`360px` & `390px`):** Tidak ada *horizontal scroll*, tidak ada teks terpotong, dan tidak ada elemen tertutup Bottom Nav.
- [ ] **Target Sentuh (`NFR-02`):** Seluruh tombol, tab, chip *Quick Refine*, dan tombol aksi kartu memiliki area klik minimal `44×44px` di mobile.
- [ ] **Tanpa Ketergantungan Drag-and-Drop:** Design Studio (ubah teks/foto/warna/posisi logo) dan Marketing Planner (ubah tanggal & status) dapat diselesaikan 100% menggunakan tap/klik dan input standar.
- [ ] **Kontras & Kejelasan Status:** Seluruh teks utama memenuhi kontras minimal `4.5:1`; status `Draf`/`Terjadwal`/`Dipublikasikan` dibedakan dengan teks & warna sekaligus.
- [ ] **Navigasi Keyboard (Desktop):** Seluruh form, tab, dan modal dapat dinavigasi dengan `Tab`/`Shift+Tab`/`Enter`/`Escape` dengan *focus ring* jelas.
- [ ] **Transparansi & Responsible AI:** *Human Review Notice*, indikator sisa kuota, *disclaimer* analitik internal, dan perilaku *no-quota-deduction on error* tampil konsisten pada layar terkait.

---

## Revision History

| Version | Date | Description |
|---|---|---|
| 1.0.0 | 2026-11-27 | Penyusunan spesifikasi UI/UX & Design System V1.0 DagangAI meliputi arah visual *Warm Craft Workspace*, design tokens, navigasi responsif mobile/desktop, wireframe seluruh modul (M1–M9), spesifikasi editor & 12 template Design Studio, pola Responsible AI, dan panduan microcopy Bahasa Indonesia. |
