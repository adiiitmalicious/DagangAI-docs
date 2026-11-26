# API Specification — DagangAI

> **Status:** Draft v1.0 (Ready for Engineering Review)  
> **Document Type:** REST API Specification  
> **Product:** DagangAI  
> **API Version:** `v1` (`/api/v1`)  
> **Release Target:** V1.0 — Competition MVP  
> **Version:** 1.0.0  
> **Last Updated:** 27 November 2026  
> **Source Documents:** [PRD.md](./PRD.md) (v1.0.0), [product-discovery.md](./product-discovery.md) (v0.1.0)  
> **Document Purpose:** Menetapkan kontrak antarmuka HTTP/JSON antara klien web responsif (desktop & mobile) dan layanan backend DagangAI V1.0 secara terstruktur, konsisten, dan dapat langsung digunakan sebagai dasar implementasi backend, integrasi frontend, serta pengujian QA.

---

## Daftar Isi

1. [Ringkasan dan Konvensi Umum API](#1-ringkasan-dan-konvensi-umum-api)
2. [Autentikasi, Otorisasi, dan Isolasi Data](#2-autentikasi-otorisasi-dan-isolasi-data)
3. [Standar Format Respons, Error, dan Enumerasi](#3-standar-format-respons-error-dan-enumerasi)
4. [M1 — Autentikasi dan Akun (`/auth`, `/me`)](#4-m1--autentikasi-dan-akun-auth-me)
5. [M2 — Business Management (`/business`)](#5-m2--business-management-business)
6. [M3 — Product Management (`/products`)](#6-m3--product-management-products)
7. [M4 — AI Content Studio & Kuota AI (`/ai`)](#7-m4--ai-content-studio--kuota-ai-ai)
8. [M5 — Content Library (`/contents`)](#8-m5--content-library-contents)
9. [M6 — AI Design Studio (`/design-templates`, `/designs`, `/ai/design`)](#9-m6--ai-design-studio-design-templates-designs-aidesign)
10. [M7 — Marketing Planner (`/planner`, `/ai/planner`)](#10-m7--marketing-planner-planner-aiplanner)
11. [M8 — Marketing Activity Summary (`/analytics`)](#11-m8--marketing-activity-summary-analytics)
12. [M9 — Platform Admin Operational Controls (`/admin`)](#12-m9--platform-admin-operational-controls-admin)
13. [Katalog Kode Error dan Status HTTP](#13-katalog-kode-error-dan-status-http)
14. [Kebutuhan Keamanan, Rate Limiting, dan Penanganan Kegagalan AI](#14-kebutuhan-keamanan-rate-limiting-dan-penanganan-kegagalan-ai)
15. [Matriks Keterlacakan (PRD FR → Endpoint)](#15-matriks-keterlacakan-prd-fr--endpoint)

---

# 1. Ringkasan dan Konvensi Umum API

## 1.1 Base URL & Protokol

| Lingkungan | Base URL (Contoh) | Protokol |
|---|---|---|
| Development | `http://localhost:8000/api/v1` | HTTP (lokal saja) |
| Staging / Competition Demo | `https://api-staging.dagangai.app/api/v1` | HTTPS wajib (TLS 1.2+) |
| Production | `https://api.dagangai.app/api/v1` | HTTPS wajib (TLS 1.2+) |

## 1.2 Format Data & Header Standar

- **Content-Type:** `application/json; charset=utf-8` untuk seluruh payload JSON, dan `multipart/form-data` khusus endpoint unggah berkas (logo & foto produk).
- **Penamaan Field:** `snake_case` pada seluruh payload JSON dan parameter query.
- **Format ID:** UUID v4 atau ULID dalam bentuk string (contoh: `"usr_01J..."` atau `"550e8400-e29b-41d4-a716-446655440000"`).
- **Format Tanggal & Waktu:**
  - Timestamp: ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ssZ`).
  - Tanggal kalender (tanpa jam): `YYYY-MM-DD`.
  - Reset kuota harian AI mengikuti waktu Indonesia Barat (`00:00 WIB` / `17:00 UTC`).
- **Header Request Opsional yang Didukung:**
  - `Authorization: Bearer <access_token>` — Wajib pada seluruh endpoint terautentikasi.
  - `Idempotency-Key: <uuid>` — Direkomendasikan pada endpoint mutasi AI (`POST /ai/...`) untuk mencegah pemotongan kuota ganda akibat klik berulang atau *network retry* (TTL kunci: 5 menit).
  - `Accept-Language: id` — Default `id` (Bahasa Indonesia).

## 1.3 Konvensi Paginasi, Pencarian, dan Pengurutan

Endpoint daftar (*list*) mendukung parameter query standar:
- `page` (integer, default `1`, min `1`)
- `limit` (integer, default `20`, min `1`, max `100`)
- `search` (string, opsional, trim otomatis, maks. 100 karakter)
- `sort_by` (string, opsional, whitelist per resource)
- `sort_order` (`asc` | `desc`, default `desc`)

Objek `meta.pagination` pada respons:
```json
{
  "page": 1,
  "limit": 20,
  "total_items": 42,
  "total_pages": 3,
  "has_next": true,
  "has_prev": false
}
```

---

# 2. Autentikasi, Otorisasi, dan Isolasi Data

## 2.1 Mekanisme Autentikasi

- Menggunakan **JWT Access Token** berumur pendek (mis. 15–60 menit) yang dikirim via header `Authorization: Bearer <access_token>`.
- Menggunakan **Refresh Token** berumur lebih panjang (mis. 7–14 hari) yang dapat disimpan via `HttpOnly; Secure; SameSite=Lax` cookie atau dikirim ke `POST /api/v1/auth/refresh` (dengan rotasi token saat refresh).

## 2.2 Peran (Role-Based Access Control)

| Peran (`role`) | Akses Endpoint |
|---|---|
| `guest` (tanpa token) | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password` |
| `business_owner` | `/me/*`, `/business/*`, `/products/*`, `/ai/*`, `/contents/*`, `/design-templates/*`, `/designs/*`, `/planner/*`, `/analytics/*` |
| `platform_admin` | Seluruh endpoint `/admin/*` (+ `/me`, `/auth/logout`) |

## 2.3 Invarian Isolasi Data & Kepemilikan 1:1 (`BR-01`, `BR-02`, `NFR-05`)

1. Pada V1.0, **1 akun (`user_id`) memiliki tepat 1 bisnis (`business_id`)**.
2. Server **selalu** menurunkan `user_id` dan `business_id` dari token terautentikasi, **tidak pernah** mempercayai `user_id` atau `business_id` dari body/query klien pada endpoint `business_owner`.
3. Setiap operasi baca/ubah/hapus berdasarkan ID resource (`product_id`, `content_id`, `design_id`, `plan_item_id`) wajib memverifikasi bahwa resource tersebut milik `business_id` pengguna aktif. Jika milik akun lain, kembalikan `404 Not Found` (untuk mencegah kebocoran keberadaan ID / IDOR).
4. Akun berstatus `suspended` (oleh Platform Admin) ditolak dengan `403 Forbidden` (`ACCOUNT_SUSPENDED`).

---

# 3. Standar Format Respons, Error, dan Enumerasi

## 3.1 Envelope Respons Sukses

```json
{
  "success": true,
  "data": {},
  "meta": {
    "request_id": "req_01JDX7K8M2N9P4Q5R6S7T8",
    "timestamp": "2026-11-27T04:30:00Z"
  }
}
```

## 3.2 Envelope Respons Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data yang dikirim tidak valid. Periksa kembali isian formulir Anda.",
    "details": [
      {
        "field": "name",
        "code": "REQUIRED",
        "message": "Nama produk wajib diisi."
      }
    ]
  },
  "meta": {
    "request_id": "req_01JDX7K8M2N9P4Q5R6S7T9",
    "timestamp": "2026-11-27T04:30:00Z"
  }
}
```

## 3.3 Enumerasi Global (Domain Values)

| Enum | Nilai Valid | Keterangan |
|---|---|---|
| `business_category` | `fnb`, `fashion_craft`, `beauty_care`, `photo_video`, `design_creative`, `local_service`, `other` | Preset optimasi awal tersedia untuk `fnb`, `fashion_craft`, `local_service`. |
| `brand_tone` | `friendly_casual`, `professional`, `elegant`, `energetic_promo`, `educational`, `storytelling` | Gaya komunikasi merek. |
| `language_preference` | `id`, `en`, `id_casual_mix` | Bahasa default `id`. |
| `product_type` | `product`, `service` | Produk fisik/digital atau layanan jasa. |
| `availability_status` | `available`, `preorder`, `unavailable` | Status ketersediaan produk/layanan. |
| `content_type` | `social_caption`, `product_description`, `slogan_headline`, `cta`, `content_idea`, `promo_message` | 6 jenis materi utama AI Content Studio (`FR-14`). |
| `marketing_channel` | `instagram`, `tiktok`, `whatsapp`, `marketplace_catalog`, `general` | Kanal target publikasi manual (`FR-15`). |
| `promo_goal` | `product_intro`, `promo_discount`, `education_benefit`, `trust_testimonial`, `seasonal_reminder` | Tujuan promosi (`FR-15`). |
| `refine_preset` | `shorter`, `more_casual`, `more_persuasive`, `add_clear_cta`, `more_professional` | Preset Quick Refine (`FR-18`). |
| `content_status` | `draft`, `planned`, `published` | Siklus hidup status konten & rencana (`BR-09`). |
| `aspect_ratio` | `1:1`, `9:16`, `16:9` | Rasio template Design Studio (`FR-24`). |
| `export_format` | `png`, `jpg` | Format unduh Design Studio (`FR-28`). |

---

# 4. M1 — Autentikasi dan Akun (`/auth`, `/me`)

## 4.1 `POST /api/v1/auth/register`
Mendaftarkan akun `business_owner` baru (`FR-01`).

- **Auth:** Publik (`guest`)
- **Request Body:**
```json
{
  "full_name": "Rina Wulandari",
  "email": "rina@kopisenja.id",
  "password": "PasswordKuat123!"
}
```
- **Validasi:**
  - `full_name`: wajib, string, 2–100 karakter.
  - `email`: wajib, format email valid, unik (case-insensitive).
  - `password`: wajib, string, 8–72 karakter.
- **Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_01JDX7A1",
      "full_name": "Rina Wulandari",
      "email": "rina@kopisenja.id",
      "role": "business_owner",
      "status": "active",
      "has_business": false,
      "created_at": "2026-11-27T04:30:00Z"
    },
    "tokens": {
      "access_token": "eyJhbGciOi...",
      "token_type": "Bearer",
      "expires_in": 3600,
      "refresh_token": "rt_01JDX7A1..."
    }
  },
  "meta": {
    "request_id": "req_01",
    "timestamp": "2026-11-27T04:30:00Z"
  }
}
```
- **Error:** `400 VALIDATION_ERROR`, `409 EMAIL_ALREADY_REGISTERED`, `429 RATE_LIMITED`.

## 4.2 `POST /api/v1/auth/login`
Masuk ke akun terdaftar (`FR-02`, `FR-03`).

- **Auth:** Publik (`guest`)
- **Request Body:**
```json
{
  "email": "rina@kopisenja.id",
  "password": "PasswordKuat123!"
}
```
- **Response `200 OK`:** Sama dengan struktur `data` pada `register` (field `user.has_business` digunakan klien untuk mengarahkan ke alur onboarding jika `false`).
- **Error:** `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`, `403 ACCOUNT_SUSPENDED`, `429 RATE_LIMITED`.

## 4.3 `POST /api/v1/auth/refresh`
Memperbarui *access token* menggunakan *refresh token* valid (`FR-02`).

- **Auth:** Refresh token (body atau cookie `HttpOnly`).
- **Request Body (jika tidak via cookie):**
```json
{
  "refresh_token": "rt_01JDX7A1..."
}
```
- **Response `200 OK`:** Mengembalikan objek `tokens` baru (rotasi refresh token).
- **Error:** `401 INVALID_REFRESH_TOKEN`, `403 ACCOUNT_SUSPENDED`.

## 4.4 `POST /api/v1/auth/logout`
Mengakhiri sesi aktif dan mencabut *refresh token* (`FR-02`).

- **Auth:** Bearer Token
- **Request Body (opsional jika via cookie):** `{ "refresh_token": "rt_..." }`
- **Response `200 OK`:** `{ "success": true, "data": { "logged_out": true }, "meta": { ... } }`

## 4.5 `POST /api/v1/auth/forgot-password`
Mengirim tautan pemulihan kata sandi ke email terdaftar (`FR-02`).

- **Auth:** Publik (`guest`)
- **Request Body:** `{ "email": "rina@kopisenja.id" }`
- **Response `200 OK`:** Selalu mengembalikan pesan generik meskipun email tidak ditemukan (mencegah *account enumeration*):
```json
{
  "success": true,
  "data": {
    "message": "Jika email terdaftar, tautan reset kata sandi telah dikirim."
  },
  "meta": { ... }
}
```

## 4.6 `POST /api/v1/auth/reset-password`
Menetapkan kata sandi baru menggunakan token dari email (`FR-02`).

- **Auth:** Publik (`guest`)
- **Request Body:**
```json
{
  "token": "rst_987654abcdef",
  "new_password": "PasswordBaru456!"
}
```
- **Response `200 OK`:** `{ "success": true, "data": { "password_reset": true }, "meta": { ... } }`
- **Error:** `400 VALIDATION_ERROR`, `400 INVALID_OR_EXPIRED_RESET_TOKEN`.

## 4.7 `GET /api/v1/me`
Mengambil informasi akun aktif, status onboarding bisnis, dan ringkasan kuota AI (`FR-03`, `FR-35`).

- **Auth:** Bearer Token (`business_owner` | `platform_admin`)
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "usr_01JDX7A1",
    "full_name": "Rina Wulandari",
    "email": "rina@kopisenja.id",
    "role": "business_owner",
    "status": "active",
    "has_business": true,
    "business_summary": {
      "id": "biz_01JDX7B2",
      "name": "Kopi Senja Nusantara",
      "category": "fnb",
      "completeness_score": 85
    },
    "ai_quota": {
      "daily_credits_limit": 30,
      "daily_credits_used": 4,
      "daily_credits_remaining": 26,
      "reset_at": "2026-11-27T17:00:00Z"
    }
  },
  "meta": { ... }
}
```

## 4.8 `PATCH /api/v1/me` & `PATCH /api/v1/me/password`
- `PATCH /api/v1/me` — Mengubah `full_name` (2–100 karakter). Respons `200 OK`.
- `PATCH /api/v1/me/password` — Mengubah kata sandi dengan body `{ "current_password": "...", "new_password": "..." }`. Respons `200 OK` (error `400 INVALID_CURRENT_PASSWORD`).

---

# 5. M2 — Business Management (`/business`)

Resource menggunakan path tunggal `/business` untuk mencerminkan aturan **1 akun = 1 bisnis (`BR-01`)**.

## 5.1 `POST /api/v1/business`
Membuat profil bisnis pertama saat onboarding (`FR-03`, `FR-04`, `FR-05`–`FR-07`).

- **Auth:** Bearer Token (`business_owner`)
- **Request Body:**
```json
{
  "name": "Kopi Senja Nusantara",
  "category": "fnb",
  "description": "Kedai kopi rumahan yang menyajikan kopi susu gula aren dan minuman non-kopi segar dengan biji kopi lokal pilihan.",
  "location": "Bandung, Jawa Barat",
  "unique_selling_points": [
    "Biji kopi arabika lokal sangrai segar tiap minggu",
    "Menggunakan gula aren murni tanpa pemanis buatan"
  ],
  "target_audience": {
    "age_range": "18-35 tahun",
    "description": "Mahasiswa dan pekerja kantoran yang mencari kopi harian terjangkau dengan rasa konsisten"
  },
  "brand_identity": {
    "language_preference": "id",
    "brand_tone": "friendly_casual",
    "avoided_words": ["murahan", "paling enak sedunia"],
    "primary_color": "#5C3A21",
    "secondary_color": "#E6B87D"
  }
}
```
- **Validasi:**
  - `name`: wajib, 2–100 karakter.
  - `category`: wajib, enum `business_category`.
  - `description`: wajib, 10–500 karakter (dibatasi 500 karakter sesuai §13 PRD).
  - `location`: opsional, maks. 120 karakter.
  - `unique_selling_points`: opsional, array maks. 5 item, masing-masing maks. 120 karakter.
  - `target_audience.description`: opsional, maks. 300 karakter.
  - `brand_identity.avoided_words`: opsional, array maks. 15 kata/frasa.
  - `primary_color`, `secondary_color`: opsional, hex valid (`#RRGGBB`).
- **Response `201 Created`:** Mengembalikan objek bisnis lengkap beserta objek `completeness` (`FR-08`):
```json
{
  "success": true,
  "data": {
    "id": "biz_01JDX7B2",
    "name": "Kopi Senja Nusantara",
    "category": "fnb",
    "description": "Kedai kopi rumahan yang menyajikan kopi susu gula aren dan minuman non-kopi segar dengan biji kopi lokal pilihan.",
    "location": "Bandung, Jawa Barat",
    "unique_selling_points": [
      "Biji kopi arabika lokal sangrai segar tiap minggu",
      "Menggunakan gula aren murni tanpa pemanis buatan"
    ],
    "target_audience": {
      "age_range": "18-35 tahun",
      "description": "Mahasiswa dan pekerja kantoran yang mencari kopi harian terjangkau dengan rasa konsisten"
    },
    "brand_identity": {
      "language_preference": "id",
      "brand_tone": "friendly_casual",
      "avoided_words": ["murahan", "paling enak sedunia"],
      "primary_color": "#5C3A21",
      "secondary_color": "#E6B87D",
      "logo_url": null
    },
    "completeness": {
      "score": 85,
      "level": "good",
      "missing_fields": ["logo"],
      "context_impact_note": "Profil bisnis Anda sudah baik untuk menghasilkan materi AI yang kontekstual. Tambahkan logo untuk melengkapi template Design Studio."
    },
    "created_at": "2026-11-27T04:32:00Z",
    "updated_at": "2026-11-27T04:32:00Z"
  },
  "meta": { ... }
}
```
- **Error:** `400 VALIDATION_ERROR`, `409 BUSINESS_ALREADY_EXISTS` (`FR-04`, `BR-01`).

## 5.2 `GET /api/v1/business`
Mengambil profil bisnis aktif milik pengguna beserta skor kelengkapan (`FR-05`–`FR-08`).

- **Auth:** Bearer Token (`business_owner`)
- **Response `200 OK`:** Struktur `data` sama dengan respons `POST /api/v1/business`.
- **Error:** `404 BUSINESS_NOT_FOUND` (jika pengguna belum menyelesaikan onboarding).

## 5.3 `PATCH /api/v1/business`
Memperbarui sebagian atau seluruh field profil bisnis (`FR-05`–`FR-07`).

- **Auth:** Bearer Token (`business_owner`)
- **Request Body:** Partial dari payload `POST /api/v1/business`.
- **Response `200 OK`:** Objek bisnis terbaru + kalkulasi ulang `completeness`.
- **Error:** `400 VALIDATION_ERROR`, `404 BUSINESS_NOT_FOUND`.

## 5.4 `POST /api/v1/business/logo` & `DELETE /api/v1/business/logo`
Mengunggah/mengganti atau menghapus logo usaha (`FR-07`, `BR-12`).

- **Auth:** Bearer Token (`business_owner`)
- **`POST` Content-Type:** `multipart/form-data` dengan field `file` (format `image/jpeg`, `image/png`, `image/webp`; maks. `5 MB`).
- **`POST` Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "logo_url": "https://cdn.dagangai.app/biz_01JDX7B2/logo.webp",
    "completeness_score": 100
  },
  "meta": { ... }
}
```
- **`DELETE` Response `200 OK`:** `{ "success": true, "data": { "logo_url": null, "completeness_score": 85 }, "meta": { ... } }`
- **Error:** `400 UNSUPPORTED_MEDIA_TYPE`, `413 FILE_TOO_LARGE`.

## 5.5 `GET /api/v1/business/presets`
Mengambil panduan dan contoh isian kontekstual berdasarkan kategori usaha (`FR-09`).

- **Auth:** Bearer Token (`business_owner`)
- **Query Params:** `?category=fnb` (opsional; jika kosong mengembalikan ringkasan semua kategori prioritas: `fnb`, `fashion_craft`, `local_service`).
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "category": "fnb",
    "label": "Makanan & Minuman (F&B)",
    "example_description": "Kedai minuman kekinian yang fokus pada kopi susu aren dan matcha buatan sendiri dengan bahan segar harian.",
    "example_usps": [
      "Dibuat segar sesuai pesanan",
      "Pilihan level gula sesuai selera"
    ],
    "example_target_audience": "Pekerja muda dan mahasiswa di area sekitar yang mencari minuman segar untuk menemani aktivitas.",
    "recommended_tones": ["friendly_casual", "energetic_promo"],
    "suggested_product_categories": ["Kopi", "Non-Kopi", "Makanan Ringan", "Paket Hemat"]
  },
  "meta": { ... }
}
```

---

# 6. M3 — Product Management (`/products`)

## 6.1 `GET /api/v1/products`
Mengambil daftar produk/layanan milik bisnis dengan pencarian dan filter (`FR-10`, `FR-12`).

- **Auth:** Bearer Token (`business_owner`)
- **Query Params:**
  - `page`, `limit`, `search` (mencari di nama, kategori, deskripsi)
  - `type` (`product` | `service`)
  - `availability_status` (`available` | `preorder` | `unavailable`)
  - `category` (string)
  - `sort_by` (`created_at` | `updated_at` | `name` | `price_min`, default `created_at`)
  - `sort_order` (`asc` | `desc`, default `desc`)
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "prd_01JDX7C3",
      "name": "Es Kopi Susu Gula Aren",
      "type": "product",
      "category": "Kopi",
      "description": "Perpaduan espresso arabika lokal, susu segar, dan gula aren murni 250ml.",
      "pricing": {
        "currency": "IDR",
        "price_min": 18000,
        "price_max": 22000,
        "display_label": "Rp18.000 - Rp22.000"
      },
      "key_benefits": [
        "Gula aren murni tanpa pemanis buatan",
        "Bisa pilih level es dan tingkat kemanisan"
      ],
      "availability_status": "available",
      "primary_image_url": "https://cdn.dagangai.app/biz_01JDX7B2/prd_01_1.webp",
      "images_count": 2,
      "contents_count": 5,
      "created_at": "2026-11-27T04:35:00Z",
      "updated_at": "2026-11-27T04:35:00Z"
    }
  ],
  "meta": {
    "request_id": "req_05",
    "timestamp": "2026-11-27T04:36:00Z",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total_items": 1,
      "total_pages": 1,
      "has_next": false,
      "has_prev": false
    }
  }
}
```

## 6.2 `POST /api/v1/products`
Menambahkan produk atau layanan baru (`FR-10`, `FR-11`).

- **Auth:** Bearer Token (`business_owner`)
- **Request Body:**
```json
{
  "name": "Es Kopi Susu Gula Aren",
  "type": "product",
  "category": "Kopi",
  "description": "Perpaduan espresso arabika lokal, susu segar, dan gula aren murni 250ml.",
  "pricing": {
    "price_min": 18000,
    "price_max": 22000
  },
  "key_benefits": [
    "Gula aren murni tanpa pemanis buatan",
    "Bisa pilih level es dan tingkat kemanisan"
  ],
  "availability_status": "available"
}
```
- **Validasi:**
  - `name`: wajib, 2–120 karakter.
  - `type`: wajib (`product` | `service`).
  - `description`: wajib, 10–500 karakter.
  - `pricing`: opsional; bila diisi, `price_min >= 0`, dan bila `price_max` diisi maka `price_max >= price_min`.
  - `key_benefits`: opsional, array maks. 5 item, masing-masing maks. 120 karakter.
  - `availability_status`: opsional, default `available`.
- **Response `201 Created`:** Objek produk lengkap (termasuk array `images: []`).
- **Error:** `400 VALIDATION_ERROR`, `412 BUSINESS_PROFILE_REQUIRED` (jika profil bisnis belum dibuat).

## 6.3 `GET /api/v1/products/{product_id}`
Mengambil detail lengkap satu produk termasuk seluruh foto (`images[]`).

- **Auth:** Bearer Token (`business_owner`)
- **Response `200 OK`:** Objek produk lengkap dengan `images: [{ "id": "img_...", "url": "...", "is_primary": true, "created_at": "..." }]`.
- **Error:** `404 PRODUCT_NOT_FOUND`.

## 6.4 `PATCH /api/v1/products/{product_id}`
Memperbarui informasi produk/layanan (`FR-10`, `FR-11`).

- **Auth:** Bearer Token (`business_owner`)
- **Request Body:** Partial dari payload `POST /api/v1/products`.
- **Response `200 OK`:** Objek produk terbaru.

## 6.5 `DELETE /api/v1/products/{product_id}`
Menghapus produk dari katalog aktif (`FR-10`, `BR-10`).

- **Aturan Bisnis (`BR-10`):** Penghapusan bersifat *soft-delete* pada katalog aktif; seluruh materi di Content Library, Design Studio, dan Marketing Planner yang sebelumnya terhubung **tidak ikut terhapus** dan tetap menampilkan `product_snapshot` (nama produk historis + `is_deleted: true`).
- **Auth:** Bearer Token (`business_owner`)
- **Response `200 OK`:** `{ "success": true, "data": { "deleted": true, "id": "prd_01JDX7C3" }, "meta": { ... } }`

## 6.6 Manajemen Foto Produk (`FR-11`, `BR-12`)
- `POST /api/v1/products/{product_id}/images`
  - **Content-Type:** `multipart/form-data`, field `file` (`image/jpeg`, `image/png`, `image/webp`; maks. `5 MB`) dan opsional `is_primary` (`true`/`false`).
  - **Aturan:** Maksimal **3 foto per produk**. Foto pertama otomatis menjadi `is_primary: true`.
  - **Response `201 Created`:** `{ "id": "img_01", "url": "...", "is_primary": true }`
  - **Error:** `400 PRODUCT_IMAGE_LIMIT_EXCEEDED`, `400 UNSUPPORTED_MEDIA_TYPE`, `413 FILE_TOO_LARGE`.
- `PATCH /api/v1/products/{product_id}/images/{image_id}/primary`
  - Menjadikan foto tertentu sebagai foto utama. Respons `200 OK`.
- `DELETE /api/v1/products/{product_id}/images/{image_id}`
  - Menghapus foto produk (jika foto utama dihapus, sistem otomatis mempromosikan foto tersisa berikutnya sebagai utama). Respons `200 OK`.

---

# 7. M4 — AI Content Studio & Kuota AI (`/ai`)

Seluruh endpoint generasi AI menyertakan header kuota dan *rate limit*:
```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1795728660
X-AI-Quota-Limit: 30
X-AI-Quota-Remaining: 25
X-AI-Quota-Reset-At: 2026-11-27T17:00:00Z
```

> **Penegakan `BR-07`:** Kredit/kuota harian **hanya dikurangi** jika AI berhasil mengembalikan respons valid. Error provider (`502`/`504`) atau error validasi (`400`) **tidak memotong kuota**.

## 7.1 `GET /api/v1/ai/quota`
Mengambil informasi detail kuota harian dan batas frekuensi pengguna (`FR-35`, `§13`).

- **Auth:** Bearer Token (`business_owner`)
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "daily_credits_limit": 30,
    "daily_credits_used": 5,
    "daily_credits_remaining": 25,
    "credit_costs": {
      "content_generate": 1,
      "content_refine": 1,
      "design_copy_assist": 1,
      "planner_ideas": 2
    },
    "rate_limit_per_minute": 5,
    "reset_at": "2026-11-27T17:00:00Z",
    "reset_timezone": "Asia/Jakarta (WIB)",
    "service_available": true
  },
  "meta": { ... }
}
```

## 7.2 `POST /api/v1/ai/content/generate`
Menghasilkan 2–3 variasi materi pemasaran teks berbasis konteks bisnis & produk (`FR-14`, `FR-15`, `FR-16`, `§10`).

- **Auth:** Bearer Token (`business_owner`)
- **Header Opsional:** `Idempotency-Key: <uuid>`
- **Request Body:**
```json
{
  "content_type": "social_caption",
  "product_id": "prd_01JDX7C3",
  "channel": "instagram",
  "promo_goal": "product_intro",
  "brand_tone": "friendly_casual",
  "language": "id",
  "variants_count": 3,
  "additional_instructions": "Fokuskan untuk menemani kerja sore hari dan ajak pesan lewat DM atau datang ke kedai.",
  "temporary_context": null
}
```
- **Validasi:**
  - `content_type`: wajib, enum `content_type`.
  - `product_id`: opsional (null = mode "Promosi Bisnis Umum").
  - `channel`: wajib, enum `marketing_channel`.
  - `promo_goal`: wajib, enum `promo_goal`.
  - `brand_tone`: opsional (default mengambil dari Profil Bisnis).
  - `language`: opsional (default mengambil dari Profil Bisnis).
  - `variants_count`: opsional, integer `2` atau `3` (default `3`).
  - `additional_instructions`: opsional, maks. 300 karakter.
  - `temporary_context`: opsional (digunakan bila profil bisnis belum lengkap; maks. 300 karakter).
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "generation_id": "gen_01JDX7D4",
    "content_type": "social_caption",
    "channel": "instagram",
    "context_summary": {
      "business_name": "Kopi Senja Nusantara",
      "product_name": "Es Kopi Susu Gula Aren",
      "brand_tone": "friendly_casual",
      "language": "id",
      "used_business_profile": true,
      "used_product_context": true
    },
    "warnings": [],
    "review_notice": "Periksa kembali harga, detail produk, dan klaim promosi sebelum dipublikasikan.",
    "variants": [
      {
        "variant_index": 1,
        "angle": "Fokus Rasa & Bahan Alami",
        "headline": "Sore makin santai bareng Es Kopi Susu Gula Aren!",
        "body": "Butuh teman nugas atau lanjut kerja sore ini? Es Kopi Susu Gula Aren dari Kopi Senja Nusantara siap nemenin dengan perpaduan espresso arabika lokal, susu segar, dan gula aren murni tanpa pemanis buatan. Mulai Rp18.000 aja, dan kamu bebas atur level es serta manisnya!\n\nYuk mampir ke kedai atau kirim DM sekarang buat pesan.",
        "cta": "Kirim DM sekarang atau langsung mampir ke kedai Kopi Senja Nusantara!",
        "hashtags": ["#KopiSenjaNusantara", "#KopiSusuGulaAren", "#KopiBandung"],
        "placeholders_detected": [],
        "char_count": 347,
        "word_count": 56
      },
      {
        "variant_index": 2,
        "angle": "Storytelling Ringkas",
        "headline": "Jam 3 sore mulai ngantuk? Ini solusinya.",
        "body": "Kerjaan masih numpuk tapi mata sudah berat? Segelas Es Kopi Susu Gula Aren yang diracik dari biji kopi arabika lokal sangrai segar bisa jadi penyemangat sore kamu. Manisnya pas dari gula aren murni, harganya ramah mulai Rp18.000.\n\nLangsung DM kami untuk pesan atau mampir ke kedai ya!",
        "cta": "Pesan lewat DM sekarang!",
        "hashtags": ["#KopiHarian", "#EsKopiSusu", "#KopiLokal"],
        "placeholders_detected": [],
        "char_count": 302,
        "word_count": 48
      }
    ],
    "quota": {
      "credits_charged": 1,
      "daily_credits_remaining": 25,
      "reset_at": "2026-11-27T17:00:00Z"
    }
  },
  "meta": { ... }
}
```
- **Catatan `warnings`:** Jika profil bisnis/produk belum lengkap atau mengandung placeholder, `warnings` berisi kode informatif seperti `{ "code": "INCOMPLETE_BUSINESS_CONTEXT", "message": "Profil bisnis belum lengkap. Lengkapi profil agar hasil AI lebih sesuai karakter usaha Anda." }`.
- **Error:** `400 VALIDATION_ERROR`, `400 CONTENT_POLICY_VIOLATION` (moderasi input §10.3), `429 AI_DAILY_QUOTA_EXCEEDED`, `429 RATE_LIMITED`, `503 AI_SERVICE_CIRCUIT_OPEN`, `504 AI_PROVIDER_TIMEOUT`.

## 7.3 `POST /api/v1/ai/content/refine`
Menyempurnakan satu teks/variasi hasil menggunakan preset cepat atau instruksi singkat (`FR-18`).

- **Auth:** Bearer Token (`business_owner`)
- **Header Opsional:** `Idempotency-Key: <uuid>`
- **Request Body:**
```json
{
  "generation_id": "gen_01JDX7D4",
  "product_id": "prd_01JDX7C3",
  "content_type": "social_caption",
  "channel": "instagram",
  "source_text": "Butuh teman nugas atau lanjut kerja sore ini? ...",
  "refine_preset": "shorter",
  "custom_instruction": "Tekankan opsi pesan lewat DM untuk pengiriman area Bandung."
}
```
- **Validasi:**
  - `source_text`: wajib, 10–3000 karakter.
  - Minimal salah satu dari `refine_preset` (enum `refine_preset`) atau `custom_instruction` (maks. 200 karakter) wajib diisi.
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "generation_id": "gen_01JDX7E5",
    "parent_generation_id": "gen_01JDX7D4",
    "refined_text": "Ngantuk sore saat kerja? Segarkan lagi dengan Es Kopi Susu Gula Aren dari Kopi Senja Nusantara — arabika lokal + gula aren murni mulai Rp18.000. Bisa pilih level manis! Yuk pesan via DM untuk area Bandung.",
    "char_count": 211,
    "word_count": 35,
    "placeholders_detected": [],
    "review_notice": "Periksa kembali harga, detail produk, dan klaim promosi sebelum dipublikasikan.",
    "quota": {
      "credits_charged": 1,
      "daily_credits_remaining": 24,
      "reset_at": "2026-11-27T17:00:00Z"
    }
  },
  "meta": { ... }
}
```

## 7.4 `POST /api/v1/ai/feedback`
Mengirim penilaian kualitas dan pelaporan potensi halusinasi/klaim keliru (`FR-19`, §2.3 Responsible AI).

- **Auth:** Bearer Token (`business_owner`)
- **Request Body:**
```json
{
  "generation_id": "gen_01JDX7D4",
  "content_id": "cnt_01JDX7F6",
  "rating": 5,
  "is_helpful": true,
  "is_factual_issue": false,
  "issue_categories": [],
  "notes": "Gaya bahasanya pas banget untuk pelanggan kedai."
}
```
- **Validasi:**
  - Minimal salah satu `generation_id` atau `content_id` wajib diisi.
  - `rating`: opsional, integer `1–5`.
  - `is_helpful`: opsional, boolean.
  - `is_factual_issue`: wajib, boolean.
  - `issue_categories`: opsional, array enum (`fabricated_claim`, `wrong_price`, `wrong_tone`, `generic_output`, `other`).
  - `notes`: opsional, maks. 500 karakter.
- **Response `201 Created`:** `{ "success": true, "data": { "feedback_id": "fb_01", "recorded": true }, "meta": { ... } }`

---

# 8. M5 — Content Library (`/contents`)

## 8.1 `GET /api/v1/contents`
Mengambil daftar seluruh materi teks tersimpan dengan pencarian dan filter (`FR-21`, `FR-22`).

- **Auth:** Bearer Token (`business_owner`)
- **Query Params:**
  - `page`, `limit`, `search`
  - `content_type` (enum `content_type`)
  - `product_id` (UUID/ID produk)
  - `channel` (enum `marketing_channel`)
  - `status` (`draft` | `planned` | `published`)
  - `sort_by` (`created_at` | `updated_at` | `title`, default `updated_at`)
  - `sort_order` (`asc` | `desc`, default `desc`)
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cnt_01JDX7F6",
      "title": "Caption Promo Sore — Es Kopi Susu Gula Aren",
      "content_type": "social_caption",
      "channel": "instagram",
      "status": "draft",
      "headline": "Sore makin santai bareng Es Kopi Susu Gula Aren!",
      "body": "Ngantuk sore saat kerja? ...",
      "cta": "Pesan lewat DM sekarang!",
      "hashtags": ["#KopiSenjaNusantara", "#KopiSusuGulaAren"],
      "brand_tone": "friendly_casual",
      "source": "ai_generated",
      "generation_id": "gen_01JDX7E5",
      "product": {
        "id": "prd_01JDX7C3",
        "name": "Es Kopi Susu Gula Aren",
        "is_deleted": false
      },
      "created_at": "2026-11-27T04:40:00Z",
      "updated_at": "2026-11-27T04:40:00Z"
    }
  ],
  "meta": {
    "request_id": "req_09",
    "timestamp": "2026-11-27T04:41:00Z",
    "pagination": { "page": 1, "limit": 20, "total_items": 1, "total_pages": 1, "has_next": false, "has_prev": false }
  }
}
```

## 8.2 `POST /api/v1/contents`
Menyimpan materi teks baru (dari hasil AI yang telah ditinjau/diedit atau tulis manual) (`FR-17`, `BR-05`).

- **Auth:** Bearer Token (`business_owner`)
- **Request Body:**
```json
{
  "title": "Caption Promo Sore — Es Kopi Susu Gula Aren",
  "content_type": "social_caption",
  "channel": "instagram",
  "product_id": "prd_01JDX7C3",
  "headline": "Sore makin santai bareng Es Kopi Susu Gula Aren!",
  "body": "Ngantuk sore saat kerja? Segarkan lagi dengan Es Kopi Susu Gula Aren...",
  "cta": "Pesan lewat DM sekarang!",
  "hashtags": ["#KopiSenjaNusantara", "#KopiSusuGulaAren"],
  "brand_tone": "friendly_casual",
  "source": "ai_generated",
  "generation_id": "gen_01JDX7E5"
}
```
- **Validasi:** `title` wajib (2–150 karakter), `content_type` wajib, `body` wajib (1–5000 karakter), `source` (`ai_generated` | `manual`, default `manual`).
- **Response `201 Created`:** Objek materi lengkap dengan status awal `draft`.

## 8.3 `GET /api/v1/contents/{content_id}`
Mengambil detail lengkap satu materi teks tersimpan (`FR-23`).

## 8.4 `PATCH /api/v1/contents/{content_id}`
Mengedit judul, isi, headline, CTA, hashtag, kanal, produk terkait, atau status materi (`FR-23`).

- **Auth:** Bearer Token (`business_owner`)
- **Request Body:** Partial field dari `POST /api/v1/contents` + opsional `status` (`draft` | `planned` | `published`).
- **Response `200 OK`:** Objek materi terbaru.

## 8.5 `POST /api/v1/contents/{content_id}/duplicate`
Menduplikasi materi tersimpan sebagai salinan baru berstatus `draft` dengan prefiks/sufiks "(Salinan)" (`FR-23`).

- **Response `201 Created`:** Objek materi hasil duplikasi.

## 8.6 `DELETE /api/v1/contents/{content_id}`
Menghapus materi dari Content Library (`FR-23`). Jika tertaut di Marketing Planner, referensi `content_id` pada item planner diubah menjadi `null` (dengan catatan judul historis) agar jadwal pengguna tidak ikut hilang.

- **Response `200 OK`:** `{ "success": true, "data": { "deleted": true, "id": "cnt_01JDX7F6" }, "meta": { ... } }`

---

# 9. M6 — AI Design Studio (`/design-templates`, `/designs`, `/ai/design`)

## 9.1 `GET /api/v1/design-templates`
Mengambil daftar template desain promosi siap pakai (`FR-24`).

- **Auth:** Bearer Token (`business_owner`)
- **Query Params:**
  - `aspect_ratio` (`1:1` | `9:16` | `16:9`)
  - `segment` (`fnb` | `fashion_craft` | `local_service` | `general`)
  - `page`, `limit`
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "tpl_fnb_warm_01",
      "name": "Warm Menu Highlight",
      "segment": "fnb",
      "aspect_ratio": "1:1",
      "dimensions": { "width": 1080, "height": 1080 },
      "thumbnail_url": "https://cdn.dagangai.app/templates/tpl_fnb_warm_01.webp",
      "supports_logo": true,
      "supports_badge": true,
      "slots": {
        "headline": { "max_chars": 45, "required": true },
        "subheadline": { "max_chars": 90, "required": false },
        "price_or_badge": { "max_chars": 25, "required": false },
        "cta": { "max_chars": 35, "required": false }
      },
      "font_presets": ["modern_clean", "warm_artisan", "bold_promo"],
      "default_colors": {
        "background": "#FFF8F0",
        "accent": "#5C3A21",
        "text": "#231914"
      }
    }
  ],
  "meta": { ... }
}
```

## 9.2 `GET /api/v1/design-templates/{template_id}`
Mengambil detail lengkap spesifikasi slot, palet warna preset, dan pasangan font template (`FR-24`, `FR-27`).

## 9.3 `POST /api/v1/designs/autofill-preview`
Menghasilkan konfigurasi awal (*Smart Auto-Fill*) template dari profil bisnis, produk, dan/atau materi teks tanpa memotong kuota AI (`FR-25`).

- **Auth:** Bearer Token (`business_owner`)
- **Request Body:**
```json
{
  "template_id": "tpl_fnb_warm_01",
  "product_id": "prd_01JDX7C3",
  "source_content_id": "cnt_01JDX7F6"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "template_id": "tpl_fnb_warm_01",
    "aspect_ratio": "1:1",
    "config": {
      "texts": {
        "headline": "Es Kopi Susu Gula Aren",
        "subheadline": "Arabika lokal, susu segar & gula aren murni.",
        "price_or_badge": "Mulai Rp18.000",
        "cta": "Pesan via DM Sekarang"
      },
      "colors": {
        "background": "#FFF8F0",
        "accent": "#5C3A21",
        "text": "#231914"
      },
      "font_preset": "warm_artisan",
      "image": {
        "url": "https://cdn.dagangai.app/biz_01JDX7B2/prd_01_1.webp",
        "crop": { "zoom": 1.0, "offset_x": 0, "offset_y": 0 }
      },
      "show_logo": true,
      "logo_position": "top_left",
      "show_badge": true
    }
  },
  "meta": { ... }
}
```

## 9.4 `POST /api/v1/ai/design/copy-assist`
Menghasilkan saran teks singkat yang sudah disesuaikan dengan batas karakter slot template (`FR-26`). Memotong 1 kredit AI saat berhasil.

- **Auth:** Bearer Token (`business_owner`)
- **Header Opsional:** `Idempotency-Key: <uuid>`
- **Request Body:**
```json
{
  "template_id": "tpl_fnb_warm_01",
  "product_id": "prd_01JDX7C3",
  "promo_goal": "product_intro",
  "additional_instructions": "Cocok untuk poster sore hari"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "generation_id": "gen_01JDX7G7",
    "suggestions": [
      {
        "headline": "Segarkan Sore dengan Kopi Aren",
        "subheadline": "Arabika lokal & gula aren murni, bebas pilih level manis.",
        "price_or_badge": "Mulai Rp18.000",
        "cta": "Pesan Lewat DM"
      },
      {
        "headline": "Teman Nugas Sore Paling Pas",
        "subheadline": "Es Kopi Susu Gula Aren segar dari Kopi Senja Nusantara.",
        "price_or_badge": "Tersedia Hari Ini",
        "cta": "Mampir ke Kedai"
      }
    ],
    "review_notice": "Periksa kembali harga dan teks sebelum mengunduh desain.",
    "quota": {
      "credits_charged": 1,
      "daily_credits_remaining": 23,
      "reset_at": "2026-11-27T17:00:00Z"
    }
  },
  "meta": { ... }
}
```

## 9.5 CRUD Proyek Desain & Ekspor (`FR-27`, `FR-28`)
- `GET /api/v1/designs` — Daftar proyek desain tersimpan (query: `page`, `limit`, `search`, `aspect_ratio`, `product_id`).
- `POST /api/v1/designs` — Simpan proyek desain baru.
  - **Request Body:**
    ```json
    {
      "title": "Poster Feed — Es Kopi Susu Gula Aren",
      "template_id": "tpl_fnb_warm_01",
      "aspect_ratio": "1:1",
      "product_id": "prd_01JDX7C3",
      "source_content_id": "cnt_01JDX7F6",
      "config": {
        "texts": { "headline": "...", "subheadline": "...", "price_or_badge": "...", "cta": "..." },
        "colors": { "background": "#FFF8F0", "accent": "#5C3A21", "text": "#231914" },
        "font_preset": "warm_artisan",
        "image": { "url": "...", "crop": { "zoom": 1.0, "offset_x": 0, "offset_y": 0 } },
        "show_logo": true,
        "logo_position": "top_left",
        "show_badge": true
      }
    }
    ```
  - **Response `201 Created`:** Objek proyek desain lengkap (`id`, `title`, `template_id`, `aspect_ratio`, `preview_url`, `config`, `created_at`, `updated_at`).
- `GET /api/v1/designs/{design_id}` — Detail proyek desain untuk dibuka kembali di editor.
- `PATCH /api/v1/designs/{design_id}` — Simpan perubahan konfigurasi desain.
- `POST /api/v1/designs/{design_id}/duplicate` — Duplikasi proyek desain.
- `DELETE /api/v1/designs/{design_id}` — Hapus proyek desain.
- `POST /api/v1/designs/{design_id}/export` — Render atau simpan hasil ekspor resolusi tinggi (`≥ 1080px` pada sisi utama) (`FR-28`).
  - **Request Body:** `{ "format": "png", "quality": 95 }` (`format`: `png` | `jpg`; `quality` khusus `jpg`, 70–100).
  - **Response `200 OK`:**
    ```json
    {
      "success": true,
      "data": {
        "design_id": "dsn_01JDX7H8",
        "format": "png",
        "dimensions": { "width": 1080, "height": 1080 },
        "download_url": "https://cdn.dagangai.app/exports/dsn_01JDX7H8.png?sig=...",
        "expires_at": "2026-11-27T05:30:00Z"
      },
      "meta": { ... }
    }
    ```

---

# 10. M7 — Marketing Planner (`/planner`, `/ai/planner`)

## 10.1 `GET /api/v1/planner/items`
Mengambil daftar item rencana konten untuk **List View** maupun **Calendar View** (`FR-29`, `FR-30`).

- **Auth:** Bearer Token (`business_owner`)
- **Query Params:**
  - `from` (`YYYY-MM-DD`, opsional — wajib untuk rentang kalender bulanan/mingguan)
  - `to` (`YYYY-MM-DD`, opsional)
  - `status` (`draft` | `planned` | `published`)
  - `channel` (enum `marketing_channel`)
  - `campaign` (string)
  - `product_id` (ID produk)
  - `search` (string)
  - `page`, `limit`
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "pln_01JDX7J9",
      "title": "Posting Feed Sore — Es Kopi Susu Gula Aren",
      "campaign_name": "Promo Akhir Bulan November",
      "channel": "instagram",
      "scheduled_date": "2026-11-28",
      "status": "planned",
      "published_at": null,
      "notes": "Upload sekitar pukul 15.00 WIB sebelum jam pulang kantor.",
      "product": {
        "id": "prd_01JDX7C3",
        "name": "Es Kopi Susu Gula Aren",
        "is_deleted": false
      },
      "linked_content": {
        "id": "cnt_01JDX7F6",
        "title": "Caption Promo Sore — Es Kopi Susu Gula Aren",
        "content_type": "social_caption"
      },
      "linked_design": {
        "id": "dsn_01JDX7H8",
        "title": "Poster Feed — Es Kopi Susu Gula Aren",
        "aspect_ratio": "1:1",
        "preview_url": "https://cdn.dagangai.app/previews/dsn_01JDX7H8.webp"
      },
      "created_at": "2026-11-27T04:50:00Z",
      "updated_at": "2026-11-27T04:50:00Z"
    }
  ],
  "meta": { ... }
}
```

## 10.2 `POST /api/v1/planner/items`
Membuat item rencana pemasaran baru (`FR-29`, `BR-09`).

- **Auth:** Bearer Token (`business_owner`)
- **Request Body:**
```json
{
  "title": "Posting Feed Sore — Es Kopi Susu Gula Aren",
  "campaign_name": "Promo Akhir Bulan November",
  "channel": "instagram",
  "scheduled_date": "2026-11-28",
  "status": "planned",
  "product_id": "prd_01JDX7C3",
  "content_id": "cnt_01JDX7F6",
  "design_id": "dsn_01JDX7H8",
  "notes": "Upload sekitar pukul 15.00 WIB."
}
```
- **Aturan Validasi (`BR-09`):**
  - `title`: wajib, 2–150 karakter.
  - `channel`: wajib, enum `marketing_channel`.
  - Jika `status` adalah `planned`, `scheduled_date` wajib diisi (`YYYY-MM-DD`).
  - `product_id`, `content_id`, `design_id` opsional, namun bila diisi harus valid dan milik bisnis pengguna.
- **Response `201 Created`:** Objek item planner lengkap.

## 10.3 `GET / PATCH / DELETE /api/v1/planner/items/{plan_item_id}`
- `GET /api/v1/planner/items/{plan_item_id}` — Detail item beserta pratinjau lengkap materi dan desain tertaut.
- `PATCH /api/v1/planner/items/{plan_item_id}` — Ubah judul, tanggal target (`scheduled_date`), kanal, kampanye, catatan, atau tautan materi/desain (`FR-31`).
- `DELETE /api/v1/planner/items/{plan_item_id}` — Hapus item rencana (tidak menghapus materi di Content Library atau Design Studio).

## 10.4 `PATCH /api/v1/planner/items/{plan_item_id}/status`
Endpoint khusus ubah status cepat dari tampilan daftar/kalender (`FR-31`, `BR-09`).

- **Auth:** Bearer Token (`business_owner`)
- **Request Body:**
```json
{
  "status": "published",
  "scheduled_date": "2026-11-28"
}
```
- **Perilaku:**
  - Transisi ke `planned` memerlukan `scheduled_date` (baik sudah tersimpan maupun dikirim di body).
  - Transisi ke `published` otomatis mengisi `published_at` dengan timestamp saat ini.
  - Transisi kembali dari `published` ke `planned`/`draft` mengosongkan `published_at`.
- **Response `200 OK`:** Objek item planner terbaru.

## 10.5 `POST /api/v1/ai/planner/ideas`
Menghasilkan rekomendasi 5–7 ide rencana konten mingguan berbasis konteks bisnis & produk (`FR-32`). Memotong 2 kredit AI saat berhasil.

- **Auth:** Bearer Token (`business_owner`)
- **Header Opsional:** `Idempotency-Key: <uuid>`
- **Request Body:**
```json
{
  "start_date": "2026-11-30",
  "days_count": 7,
  "ideas_count": 5,
  "campaign_theme": "Menu Harian & Edukasi Kopi Lokal",
  "product_ids": ["prd_01JDX7C3"],
  "channels": ["instagram", "whatsapp"]
}
```
- **Validasi:** `ideas_count` integer `5–7` (default `5`), `campaign_theme` opsional maks. 150 karakter, `product_ids` opsional maks. 5 produk.
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "generation_id": "gen_01JDX7K0",
    "recommendation_notice": "Daftar berikut merupakan saran ide konten berbasis konteks bisnis Anda, bukan jaminan performa media sosial.",
    "ideas": [
      {
        "temp_id": "idea_1",
        "suggested_date": "2026-11-30",
        "title": "Kenalan dengan Biji Arabika Lokal Kami",
        "channel": "instagram",
        "recommended_content_type": "social_caption",
        "product_id": "prd_01JDX7C3",
        "angle": "Ceritakan proses pemilihan biji kopi sangrai segar mingguan untuk membangun kepercayaan rasa."
      }
    ],
    "quota": {
      "credits_charged": 2,
      "daily_credits_remaining": 21,
      "reset_at": "2026-11-27T17:00:00Z"
    }
  },
  "meta": { ... }
}
```

## 10.6 `POST /api/v1/planner/items/bulk`
Menyimpan beberapa ide terpilih dari hasil AI langsung menjadi item `draft` atau `planned` dalam satu permintaan (`FR-32`).

- **Auth:** Bearer Token (`business_owner`)
- **Request Body:**
```json
{
  "campaign_name": "Menu Harian & Edukasi Kopi Lokal",
  "default_status": "planned",
  "items": [
    {
      "title": "Kenalan dengan Biji Arabika Lokal Kami",
      "channel": "instagram",
      "scheduled_date": "2026-11-30",
      "product_id": "prd_01JDX7C3",
      "notes": "Ceritakan proses pemilihan biji kopi sangrai segar mingguan."
    }
  ]
}
```
- **Validasi:** `items` array 1–10 item.
- **Response `201 Created`:** `{ "success": true, "data": { "created_count": 1, "items": [ ... ] }, "meta": { ... } }`

---

# 11. M8 — Marketing Activity Summary (`/analytics`)

## 11.1 `GET /api/v1/analytics/summary`
Mengambil ringkasan aktivitas internal platform untuk halaman Dashboard (`FR-33`–`FR-36`, `BR-08`).

- **Auth:** Bearer Token (`business_owner`)
- **Query Params:** `?period=7d` (`7d` | `30d` | `all`, default `30d`)
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "disclaimer": "Ringkasan ini merupakan catatan aktivitas internal Anda di DagangAI, bukan metrik jangkauan media sosial, interaksi audiens, atau hasil penjualan aktual.",
    "metrics": {
      "ai_generations_count": 18,
      "contents_saved_count": 12,
      "designs_created_count": 4,
      "planner_status_breakdown": {
        "draft": 3,
        "planned": 5,
        "published": 4
      }
    },
    "product_coverage": {
      "most_promoted": [
        { "product_id": "prd_01JDX7C3", "name": "Es Kopi Susu Gula Aren", "materials_count": 7 }
      ],
      "unpromoted_products": [
        { "product_id": "prd_01JDX7Z9", "name": "Matcha Latte Oat", "materials_count": 0 }
      ]
    },
    "upcoming_plans": [
      {
        "id": "pln_01JDX7J9",
        "title": "Posting Feed Sore — Es Kopi Susu Gula Aren",
        "channel": "instagram",
        "scheduled_date": "2026-11-28",
        "status": "planned"
      }
    ],
    "recent_activities": [
      {
        "type": "content_saved",
        "entity_id": "cnt_01JDX7F6",
        "title": "Caption Promo Sore — Es Kopi Susu Gula Aren",
        "occurred_at": "2026-11-27T04:40:00Z"
      }
    ],
    "business_completeness_score": 85,
    "ai_quota": {
      "daily_credits_limit": 30,
      "daily_credits_used": 9,
      "daily_credits_remaining": 21,
      "reset_at": "2026-11-27T17:00:00Z"
    }
  },
  "meta": { ... }
}
```

---

# 12. M9 — Platform Admin Operational Controls (`/admin`)

Seluruh endpoint pada bagian ini **wajib** memiliki role `platform_admin` (`403 FORBIDDEN` untuk `business_owner`).

## 12.1 `GET /api/v1/admin/overview`
Ringkasan kesehatan operasional, adopsi pengguna, dan pemakaian AI agregat (`FR-38`).

- **Query Params:** `?date=2026-11-27` (opsional, default hari ini WIB).
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "date": "2026-11-27",
    "users": {
      "total_registered": 145,
      "active_today": 38,
      "suspended_count": 1
    },
    "ai_operations": {
      "total_requests_today": 312,
      "success_count": 305,
      "failed_count": 4,
      "rate_limited_count": 3,
      "success_rate_percent": 98.7,
      "avg_latency_ms": 2840,
      "estimated_tokens_today": 412500,
      "factual_issue_reports_today": 1,
      "circuit_breaker_open": false
    }
  },
  "meta": { ... }
}
```

## 12.2 `GET /api/v1/admin/ai-logs`
Daftar log pemakaian AI terstruktur untuk pemantauan biaya & debugging (`FR-37`). Tidak menyertakan kata sandi atau data sensitif.

- **Query Params:** `page`, `limit`, `status` (`success` | `failed` | `rate_limited`), `feature` (`content_generate` | `content_refine` | `design_copy_assist` | `planner_ideas`), `user_id`, `from`, `to`.
- **Response `200 OK`:** Array log berisi `id`, `user_id`, `feature`, `status`, `credits_charged`, `estimated_input_tokens`, `estimated_output_tokens`, `latency_ms`, `error_code`, `created_at`.

## 12.3 `GET /api/v1/admin/ai-config` & `PATCH /api/v1/admin/ai-config`
Melihat dan mengubah parameter kuota & *circuit breaker* secara runtime tanpa redeploy (`FR-39`, `§13`).

- **`PATCH` Request Body (partial):**
```json
{
  "daily_credits_limit": 30,
  "rate_limit_per_minute": 5,
  "circuit_breaker_open": false,
  "circuit_breaker_message": "Layanan AI sedang dalam pemeliharaan singkat. Fitur kelola produk dan pustaka tetap dapat digunakan."
}
```
- **Response `200 OK`:** Konfigurasi terbaru + `updated_by` dan `updated_at`.

## 12.4 `PATCH /api/v1/admin/users/{user_id}/status`
Menonaktifkan sementara atau mengaktifkan kembali akun yang terindikasi spam/penyalahgunaan (`FR-39`).

- **Request Body:**
```json
{
  "status": "suspended",
  "reason": "Permintaan spam otomatis berulang."
}
```
- **Validasi:** `status` (`active` | `suspended`), `reason` wajib saat `suspended` (5–300 karakter).
- **Response `200 OK`:** `{ "success": true, "data": { "user_id": "usr_...", "status": "suspended", "updated_at": "..." }, "meta": { ... } }`

---

# 13. Katalog Kode Error dan Status HTTP

| HTTP Status | `error.code` | Kapan Terjadi | Aksi yang Disarankan di Klien |
|---|---|---|---|
| `400` | `VALIDATION_ERROR` | Input tidak memenuhi aturan validasi schema | Tampilkan pesan error per field dari `error.details`. |
| `400` | `UNSUPPORTED_MEDIA_TYPE` | Format berkas bukan JPG/PNG/WebP | Tampilkan informasi format yang didukung. |
| `400` | `PRODUCT_IMAGE_LIMIT_EXCEEDED` | Jumlah foto produk sudah mencapai 3 | Minta pengguna menghapus 1 foto sebelum mengunggah lagi. |
| `400` | `CONTENT_POLICY_VIOLATION` | Input melanggar kebijakan moderasi Responsible AI | Tampilkan peringatan kebijakan dan minta revisi input. |
| `401` | `UNAUTHORIZED` | Token tidak ada, tidak valid, atau kedaluwarsa | Lakukan refresh token; jika gagal, arahkan ke halaman login. |
| `401` | `INVALID_CREDENTIALS` | Email atau kata sandi salah saat login | Tampilkan pesan login gagal generik. |
| `403` | `FORBIDDEN` | Peran akun tidak memiliki akses ke endpoint | Sembunyikan/arahkan keluar dari rute terlarang. |
| `403` | `ACCOUNT_SUSPENDED` | Akun dinonaktifkan oleh Platform Admin | Tampilkan halaman status akun ditangguhkan. |
| `404` | `RESOURCE_NOT_FOUND` | Resource tidak ditemukan atau milik akun lain | Tampilkan state "Data tidak ditemukan" (termasuk variasi `BUSINESS_NOT_FOUND`, `PRODUCT_NOT_FOUND`, dll.). |
| `409` | `EMAIL_ALREADY_REGISTERED` | Email sudah digunakan akun lain | Arahkan pengguna ke login atau lupa kata sandi. |
| `409` | `BUSINESS_ALREADY_EXISTS` | Akun mencoba membuat bisnis kedua (`BR-01`) | Arahkan ke halaman edit profil bisnis yang sudah ada. |
| `412` | `BUSINESS_PROFILE_REQUIRED` | Aksi membutuhkan profil bisnis yang belum dibuat | Arahkan ke alur onboarding profil bisnis. |
| `413` | `FILE_TOO_LARGE` | Ukuran berkas melebihi 5 MB (`BR-12`) | Minta pengguna memperkecil ukuran gambar. |
| `429` | `RATE_LIMITED` | Melebihi batas permintaan per menit | Tampilkan jeda tunggu singkat berdasarkan `Retry-After`. |
| `429` | `AI_DAILY_QUOTA_EXCEEDED` | Kredit AI harian pengguna habis (`0`) | Nonaktifkan tombol generate, tampilkan `reset_at`, dan arahkan bahwa fitur non-AI tetap bisa dipakai. |
| `502` | `AI_PROVIDER_ERROR` | Penyedia AI eksternal mengembalikan error | Tampilkan tombol "Coba Lagi"; informasikan kuota tidak berkurang (`BR-07`). |
| `503` | `AI_SERVICE_CIRCUIT_OPEN` | Circuit breaker AI aktif sementara oleh admin | Tampilkan pesan pemeliharaan; fitur non-AI tetap berjalan (`NFR-06`). |
| `504` | `AI_PROVIDER_TIMEOUT` | Permintaan ke penyedia AI melebihi batas 30 detik | Tampilkan tombol "Coba Lagi"; informasikan kuota tidak berkurang (`BR-07`). |
| `500` | `INTERNAL_SERVER_ERROR` | Kesalahan tak terduga di server | Catat `meta.request_id` dan tampilkan pesan error ramah. |

---

# 14. Kebutuhan Keamanan, Rate Limiting, dan Penanganan Kegagalan AI

1. **Perlindungan Kunci API & Prompt (`NFR-05`, `NFR-09`):**
   - Seluruh pemanggilan penyedia LLM eksternal dilakukan eksklusif dari sisi server (*backend*). Kunci API dan *system prompt* tidak pernah dikirim ke browser klien.
2. **Penanganan Kegagalan & Graceful Degradation (`NFR-04`, `NFR-06`, `BR-07`):**
   - Batas *timeout* panggilan ke penyedia AI ditetapkan maksimal `30 detik`.
   - Jika terjadi `AI_PROVIDER_TIMEOUT`, `AI_PROVIDER_ERROR`, atau `AI_SERVICE_CIRCUIT_OPEN`, kuota pengguna **tidak dipotong**, dan seluruh endpoint non-AI (`/business`, `/products`, `/contents`, `/designs`, `/planner`, `/analytics`) harus tetap merespons normal.
3. **Anti-Duplikasi Permintaan AI (`§13`):**
   - Jika klien mengirim header `Idempotency-Key` yang sama dalam jendela 5 menit, server mengembalikan hasil respons sebelumnya tanpa memanggil penyedia AI lagi dan tanpa memotong kuota kedua kali.
4. **Keamanan Unggahan Berkas (`BR-12`, `NFR-05`):**
   - Validasi berkas dilakukan berdasarkan *magic bytes* / MIME type aktual (bukan hanya ekstensi nama berkas), batas ukuran maksimal `5 MB`, dan nama berkas disanitasi/diacak di *object storage*.
5. **Rate Limiting Umum & Autentikasi:**
   - Endpoint autentikasi (`/auth/login`, `/auth/register`, `/auth/forgot-password`): maks. `10 permintaan/menit/IP`.
   - Endpoint AI (`/ai/*`): maks. `5 permintaan/menit/akun` (configurable via Admin).
   - Endpoint CRUD umum: maks. `120 permintaan/menit/akun`.

---

# 15. Matriks Keterlacakan (PRD FR → Endpoint)

| Modul PRD | Range FR | Endpoint Utama di API Specification |
|---|---|---|
| **M1. Autentikasi & Onboarding** | `FR-01` – `FR-04` | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET/PATCH /me`, `POST /business` (guard 409) |
| **M2. Business Management** | `FR-05` – `FR-09` | `POST /business`, `GET /business`, `PATCH /business`, `POST/DELETE /business/logo`, `GET /business/presets` |
| **M3. Product Management** | `FR-10` – `FR-13` | `GET/POST /products`, `GET/PATCH/DELETE /products/{product_id}`, `POST /products/{product_id}/images`, `PATCH/DELETE /products/{product_id}/images/{image_id}` |
| **M4. AI Content Studio** | `FR-14` – `FR-20` | `GET /ai/quota`, `POST /ai/content/generate`, `POST /ai/content/refine`, `POST /ai/feedback` |
| **M5. Content Library** | `FR-21` – `FR-23` | `GET/POST /contents`, `GET/PATCH/DELETE /contents/{content_id}`, `POST /contents/{content_id}/duplicate` |
| **M6. AI Design Studio** | `FR-24` – `FR-28` | `GET /design-templates`, `GET /design-templates/{template_id}`, `POST /designs/autofill-preview`, `POST /ai/design/copy-assist`, `GET/POST /designs`, `GET/PATCH/DELETE /designs/{design_id}`, `POST /designs/{design_id}/duplicate`, `POST /designs/{design_id}/export` |
| **M7. Marketing Planner** | `FR-29` – `FR-32` | `GET/POST /planner/items`, `GET/PATCH/DELETE /planner/items/{plan_item_id}`, `PATCH /planner/items/{plan_item_id}/status`, `POST /ai/planner/ideas`, `POST /planner/items/bulk` |
| **M8. Marketing Activity Summary** | `FR-33` – `FR-36` | `GET /analytics/summary`, `GET /ai/quota` |
| **M9. Operational Controls (Admin)** | `FR-37` – `FR-39` | `GET /admin/overview`, `GET /admin/ai-logs`, `GET/PATCH /admin/ai-config`, `PATCH /admin/users/{user_id}/status` |

---

## Revision History

| Version | Date | Description |
|---|---|---|
| 1.0.0 | 2026-11-27 | Penyusunan spesifikasi REST API V1.0 perdana DagangAI selaras dengan `PRD.md` v1.0.0 (`FR-01` s.d. `FR-39`, `BR-01` s.d. `BR-12`, dan `NFR-01` s.d. `NFR-09`). |
