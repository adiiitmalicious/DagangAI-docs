# Product Discovery — DagangAI

> **Status:** In Progress  
> **Document type:** Product Discovery  
> **Product:** DagangAI  
> **Version:** 0.1.0  
> **Last updated:** 24 November 2026  
> **Document purpose:** Menyatukan konteks produk, keputusan yang telah dikonfirmasi, hipotesis, risiko, dan pertanyaan terbuka sebagai dasar discovery lanjutan sebelum penyusunan PRD.

---

## Document Status

Dokumen ini merupakan artefak Product Discovery yang masih berjalan. Isinya membedakan keputusan yang telah dikonfirmasi dari hal-hal yang masih berupa hipotesis atau belum diputuskan.

| Status | Arti |
|---|---|
| **Confirmed** | Telah dinyatakan atau disetujui sebagai keputusan produk. |
| **Pending** | Belum diputuskan; membutuhkan diskusi atau validasi. |
| **Hypothesis** | Dugaan awal yang perlu diuji kepada calon pengguna. |
| **Recommendation** | Rekomendasi untuk dipertimbangkan, bukan keputusan final. |
| **Out of Scope** | Tidak termasuk ruang lingkup yang telah ditetapkan saat ini. |

**Penting:** Dokumen ini bukan PRD dan belum menjadi spesifikasi implementasi. Detail teknis, rancangan database, kontrak API, desain antarmuka final, serta acceptance criteria belum ditetapkan di tahap ini.

---

# 1. Product Overview

## 1.1 Product Name

**DagangAI**

## 1.2 Product Concept

DagangAI adalah *AI-powered digital marketing workspace* yang ditujukan untuk membantu pelaku Usaha Mikro, Kecil, dan Menengah (UMKM) serta pelaku ekonomi kreatif dalam mengelola informasi bisnis, membuat materi pemasaran, merancang konten promosi, dan merencanakan aktivitas pemasaran melalui satu platform web terintegrasi.

DagangAI diarahkan bukan sekadar menjadi chatbot atau generator caption. Produk ini ingin menghubungkan konteks bisnis dan produk dengan proses pembuatan materi pemasaran sehingga hasil AI lebih relevan dengan kebutuhan masing-masing usaha.

## 1.3 Product Description

> DagangAI is an AI-powered digital marketing workspace that helps UMKM and creative economy practitioners manage business information, generate marketing materials, design promotional content, and plan marketing activities through one integrated web platform.

## 1.4 Product Category

- AI-powered business tool
- Digital marketing workspace
- UMKM and creative economy enablement platform

## 1.5 Product Direction

**Confirmed:** DagangAI akan mengintegrasikan kemampuan AI ke dalam pengalaman kerja pemasaran bisnis.

**Pending:** Cakupan kemampuan AI yang benar-benar masuk ke versi awal, urutan prioritas, dan batas penggunaan setiap kemampuan.

---

# 2. Background and Context

Banyak pelaku UMKM dan ekonomi kreatif perlu memasarkan produk atau layanan melalui kanal digital. Aktivitas tersebut dapat mencakup penulisan deskripsi produk, pembuatan caption, penyusunan ide promosi, pembuatan materi visual, hingga perencanaan konten.

Namun, kemampuan, waktu, sumber daya, dan pengalaman pemasaran digital setiap pelaku usaha berbeda. Sebagian pelaku usaha mungkin belum memiliki keterampilan untuk menulis materi promosi, menentukan pendekatan komunikasi, atau membuat desain pemasaran yang konsisten.

AI berpotensi membantu pekerjaan tersebut. Akan tetapi, penggunaan AI yang terpisah-pisah atau tidak memiliki konteks bisnis dapat menghasilkan materi yang terlalu umum, tidak sesuai karakter merek, atau bahkan memuat klaim produk yang tidak benar.

DagangAI dieksplorasi sebagai ruang kerja terpadu yang menyimpan konteks bisnis dan produk, lalu menggunakan konteks tersebut untuk membantu aktivitas pemasaran.

**Catatan discovery:** Latar belakang di atas merupakan konteks dan hipotesis masalah awal. Besarnya masalah, frekuensi kejadian, serta kebutuhan nyata tiap segmen masih perlu divalidasi melalui riset pengguna.

---

# 3. Problem Space

## 3.1 Initial Problem Candidates

Tiga kelompok masalah awal telah diidentifikasi.

### A. Kesulitan membuat konten pemasaran

Contoh kebutuhan:
- Menulis caption media sosial.
- Membuat deskripsi produk atau layanan.
- Menyusun slogan dan kalimat promosi.
- Menentukan *call to action* (CTA).
- Menghasilkan variasi gaya komunikasi.
- Menemukan ide konten yang relevan.

### B. Kesulitan membuat materi visual promosi

Contoh kebutuhan:
- Membuat poster promosi.
- Menyiapkan banner atau materi kampanye.
- Membuat visual untuk kebutuhan media sosial.
- Menyesuaikan materi dengan identitas merek.
- Menghasilkan materi promosi tanpa harus menguasai perangkat desain kompleks.

### C. Kesulitan merencanakan aktivitas pemasaran

Contoh kebutuhan:
- Menentukan ide kampanye.
- Menyusun jadwal konten.
- Menjaga konsistensi aktivitas pemasaran.
- Menghubungkan ide konten dengan tujuan promosi.
- Mengelola status materi pemasaran.

## 3.2 Primary Problem

**Pending:** Belum ada satu masalah utama yang dipilih sebagai fokus MVP.

Ketiga kelompok masalah di atas tidak boleh otomatis dianggap memiliki prioritas yang sama. Menyelesaikan semuanya sekaligus berisiko memperbesar ruang lingkup, kompleksitas, dan biaya sebelum kebutuhan pengguna terbukti.

## 3.3 Problem Validation Needed

Discovery lanjutan perlu mencari bukti mengenai:
- Aktivitas pemasaran yang paling sering dilakukan pengguna.
- Bagian pekerjaan yang paling menyita waktu.
- Hambatan yang paling sulit diselesaikan sendiri.
- Solusi atau alat yang saat ini digunakan.
- Dampak hambatan terhadap aktivitas bisnis.
- Kesediaan pengguna untuk mencoba dan menggunakan solusi baru.
- Perbedaan kebutuhan antarjenis usaha.

---

# 4. Product Vision

## 4.1 Vision Statement

Menjadi ruang kerja pemasaran digital berbasis AI yang membantu pelaku UMKM dan ekonomi kreatif menjalankan aktivitas pemasaran secara lebih mudah, terarah, dan relevan dengan karakter bisnis mereka.

## 4.2 Product Principles

Prinsip berikut merupakan arah desain produk yang diusulkan.

1. **Context-driven**  
   AI sebaiknya menggunakan informasi bisnis, produk, target pelanggan, dan karakter komunikasi yang diberikan pengguna.

2. **Integrated workflow**  
   Pengelolaan informasi bisnis, pembuatan materi pemasaran, desain promosi, dan perencanaan aktivitas sebaiknya saling terhubung, bukan menjadi fitur yang berdiri sendiri.

3. **Accessible**  
   Pengalaman produk perlu dapat dipahami oleh pengguna yang tidak memiliki latar belakang pemasaran digital atau desain profesional.

4. **Actionable output**  
   Hasil AI sebaiknya dapat ditinjau, diedit, disimpan, dan digunakan kembali oleh pengguna.

5. **Responsible AI**  
   AI tidak boleh menyajikan klaim produk, sertifikasi, manfaat kesehatan, diskon, atau fakta bisnis yang tidak didukung informasi dari pengguna.

---

# 5. Goals and Expected Outcomes

## 5.1 Product Goals

Arah tujuan produk yang sedang dieksplorasi:

- Membantu pengguna membuat materi pemasaran dengan lebih mudah.
- Mengurangi hambatan dalam memulai aktivitas pemasaran digital.
- Menghasilkan materi pemasaran yang mempertimbangkan konteks bisnis dan produk.
- Menghubungkan beberapa aktivitas pemasaran dalam satu workspace.
- Membantu pengguna mengelola hasil pekerjaan pemasaran yang dibuat melalui platform.

## 5.2 Expected Outcomes

Hasil yang diharapkan untuk divalidasi:
- Pengguna dapat menyelesaikan pekerjaan pemasaran tertentu dengan lebih sedikit hambatan.
- Pengguna memperoleh materi pemasaran yang lebih sesuai dengan konteks usahanya.
- Pengguna dapat menyimpan dan menemukan kembali materi yang pernah dibuat.
- Pengguna lebih mudah merencanakan aktivitas pemasaran.

## 5.3 Non-Goals

DagangAI tidak boleh menjanjikan peningkatan penjualan secara otomatis. Pembuatan konten atau penggunaan AI tidak menjamin peningkatan jangkauan, konversi, maupun pendapatan.

Pengukuran dampak bisnis memerlukan data dan faktor lain yang tidak seluruhnya berada dalam kendali platform.

---

# 6. Target Users and Market

## 6.1 Broad Target Market

<badge>Confirmed</badge>

Target pasar DagangAI adalah:
- Pelaku UMKM.
- Pelaku ekonomi kreatif.

Target tersebut masih bersifat luas dan belum berarti semua kategori akan mendapatkan dukungan fitur yang sama pada versi awal.

## 6.2 Candidate User Segments

Segmen berikut merupakan kandidat untuk dipelajari, bukan prioritas yang sudah ditetapkan.

| Segmen | Contoh kebutuhan pemasaran |
|---|---|
| Makanan dan minuman | Foto produk, caption, deskripsi, dan promosi menu atau produk. |
| Fashion dan kerajinan | Katalog, identitas merek, deskripsi produk, dan kampanye. |
| Kecantikan dan perawatan diri | Materi promosi, visual, dan deskripsi layanan atau produk. |
| Fotografi dan videografi | Promosi jasa, portofolio, dan penawaran layanan. |
| Desain dan produk kreatif | Branding, portofolio, deskripsi produk, dan kampanye. |
| Jasa lokal | Promosi layanan dan komunikasi untuk menjangkau pelanggan. |

## 6.3 Priority Segment

**Pending:** Belum diputuskan apakah DagangAI sejak awal akan mengoptimalkan pengalaman untuk seluruh kategori atau memprioritaskan beberapa kategori terlebih dahulu.

Keputusan ini penting karena kebutuhan, istilah, format konten, atribut produk, dan pola promosi dapat berbeda antarsegmen.

## 6.4 User Personas

Persona belum ditetapkan. Persona perlu disusun berdasarkan temuan wawancara atau observasi, bukan hanya asumsi internal.

Informasi yang perlu digali antara lain:
- Jenis dan skala usaha.
- Peran pengguna dalam bisnis.
- Pengalaman menggunakan alat digital.
- Kanal pemasaran yang digunakan.
- Frekuensi membuat materi promosi.
- Keterampilan menulis dan desain.
- Kendala waktu dan sumber daya.
- Tujuan pemasaran yang ingin dicapai.

---

# 7. User Needs and Jobs to Be Done

Berikut adalah kebutuhan awal yang masih berupa hipotesis.

| Job / kebutuhan | Hasil yang diharapkan |
|---|---|
| Ketika ingin mempromosikan produk, pengguna membutuhkan bantuan membuat materi tulisan. | Materi promosi yang relevan dan dapat diedit. |
| Ketika memiliki informasi produk, pengguna ingin menggunakannya kembali tanpa mengisi konteks dari awal. | Informasi produk tersimpan dan dapat digunakan oleh fitur AI. |
| Ketika membutuhkan materi visual, pengguna ingin membuat materi promosi dengan proses yang mudah. | Materi visual yang dapat disesuaikan dan digunakan. |
| Ketika merencanakan pemasaran, pengguna ingin mengatur ide dan jadwal konten. | Rencana pemasaran yang lebih terorganisasi. |
| Ketika pernah membuat materi, pengguna ingin menemukannya kembali. | Riwayat atau tempat penyimpanan materi. |

**Pending:** Urutan kebutuhan, frekuensi, dan tingkat kepentingan belum divalidasi.

---

# 8. Value Proposition

## 8.1 Proposed Value Proposition

DagangAI menggabungkan konteks bisnis dan produk dengan bantuan AI dalam satu workspace untuk membantu pelaku UMKM dan ekonomi kreatif membuat serta mengelola materi pemasaran.

## 8.2 Potential Differentiators

Hal-hal berikut merupakan peluang diferensiasi yang perlu diuji:
- AI menggunakan profil bisnis dan data produk sebagai konteks.
- Hasil pembuatan konten dapat terhubung dengan produk yang dikelola.
- Materi pemasaran dapat diedit dan disimpan dalam satu workspace.
- Aktivitas pembuatan konten dapat dihubungkan dengan perencanaan pemasaran.

Diferensiasi tersebut belum terbukti menjadi keunggulan kompetitif sampai dibandingkan dengan alat yang sudah digunakan target pengguna.

---

# 9. Product Scope Candidates

Bagian ini mencatat kandidat kapabilitas produk. Daftar ini bukan keputusan bahwa seluruh fitur harus masuk MVP.

## 9.1 Business Management

Kandidat kemampuan:
- Mengelola profil bisnis.
- Menyimpan kategori dan deskripsi bisnis.
- Menyimpan target pelanggan.
- Menyimpan identitas dan preferensi komunikasi merek.
- Menjadi sumber konteks bagi fitur AI.

## 9.2 Product Management

Kandidat kemampuan:
- Menambahkan dan mengelola produk atau layanan.
- Menyimpan nama dan deskripsi.
- Menyimpan harga.
- Menyimpan kategori.
- Menyimpan foto produk.
- Menyimpan keunggulan dan status ketersediaan.

## 9.3 AI Content Studio

Kandidat kemampuan:
- Membuat caption.
- Membuat deskripsi produk atau layanan.
- Menghasilkan slogan.
- Mengembangkan ide konten.
- Menulis materi promosi.
- Menghasilkan CTA.
- Memberikan variasi gaya komunikasi.

Modul ini merupakan kandidat kapabilitas inti, tetapi prioritas final dan batas MVP masih pending.

## 9.4 AI Design Studio

Kandidat kemampuan:
- Membuat poster promosi.
- Membuat banner.
- Membuat visual untuk media sosial.
- Menggunakan template desain.
- Menyesuaikan ukuran dan elemen visual.
- Mengunduh hasil desain.

**Pending:** Belum diputuskan apakah versi awal menggunakan template, generasi gambar AI, atau kombinasi keduanya.

## 9.5 Marketing Planner

Kandidat kemampuan:
- Menyimpan ide konten.
- Menyusun kalender konten.
- Mengelola rencana kampanye.
- Menetapkan status materi, misalnya draft, planned, atau published.
- Menghubungkan materi dengan produk atau layanan.

## 9.6 Marketing Analytics

Kandidat kemampuan:
- Menampilkan jumlah materi yang dibuat.
- Menampilkan aktivitas kampanye.
- Menampilkan status publikasi yang dicatat pengguna.
- Menampilkan ringkasan aktivitas dalam platform.

**Batasan penting:** Data aktivitas internal tidak sama dengan metrik performa media sosial. Data seperti reach, impression, engagement, klik, dan penjualan memerlukan integrasi kanal eksternal atau input data dari pengguna.

---

# 10. AI Product Direction

## 10.1 Overall Direction

<badge>Confirmed</badge>

AI merupakan bagian terintegrasi dari arah produk DagangAI, bukan fitur tambahan yang berdiri sendiri.

## 10.2 AI Capabilities

**Pending:** Kemampuan AI yang akan benar-benar disediakan belum diprioritaskan.

Kandidat kemampuan:
- Generasi teks pemasaran.
- Penyusunan ide dan rencana konten.
- Pembuatan atau bantuan desain visual.
- Rekomendasi pemasaran berbasis konteks bisnis.
- Analisis informasi atau aktivitas pemasaran yang tersedia.

Tidak semua kemampuan tersebut harus masuk versi awal.

## 10.3 AI Interaction Model

**Pending:** Pola interaksi AI belum diputuskan.

Alternatif yang perlu dievaluasi:
1. **Form-based generator** — pengguna mengisi parameter, lalu sistem menghasilkan output.
2. **Conversational assistant** — pengguna berinteraksi melalui percakapan.
3. **Integrated AI workspace** — formulir terstruktur dan percakapan digunakan sesuai kebutuhan tugas.

Evaluasi perlu mempertimbangkan kemudahan pengguna pemula, kejelasan input, konsistensi output, biaya, serta kompleksitas pengalaman pengguna.

## 10.4 Business Context

Arah yang diusulkan adalah AI menggunakan konteks seperti:
- Profil bisnis.
- Kategori usaha.
- Informasi produk atau layanan.
- Target pelanggan.
- Keunggulan yang dinyatakan pengguna.
- Preferensi bahasa dan gaya komunikasi.

Informasi yang belum tersedia tidak boleh diisi dengan klaim faktual rekaan oleh AI.

## 10.5 Responsible AI Requirements

Rekomendasi prinsip pengamanan:
- Jangan mengarang sertifikasi, izin, komposisi, manfaat kesehatan, atau klaim kualitas.
- Jangan membuat klaim diskon, harga, stok, atau garansi yang tidak diberikan pengguna.
- Tandai atau minta konfirmasi ketika informasi penting tidak tersedia.
- Berikan ruang bagi pengguna untuk meninjau dan mengedit hasil AI.
- Hindari menyajikan prediksi atau rekomendasi sebagai kepastian.
- Berikan batasan yang jelas ketika AI tidak memiliki data yang cukup.

---

# 11. Account and Business Ownership

## 11.1 Ownership Rule

<badge>Confirmed — V1</badge>

Satu akun hanya dapat mengelola **tepat satu bisnis** pada versi pertama.

Implikasi awal:
- Satu akun memiliki satu konteks bisnis utama.
- Data produk dan materi pemasaran berada dalam konteks bisnis tersebut.
- Fitur AI menggunakan konteks bisnis yang terhubung dengan akun.

## 11.2 Pending Details

Hal-hal berikut belum diputuskan:
- Apakah satu bisnis dapat memiliki beberapa pengguna.
- Apakah pemilik dapat mengundang anggota tim.
- Apakah perpindahan kepemilikan bisnis diperbolehkan.
- Bagaimana akun ditangani ketika pemilik kehilangan akses.
- Apakah dukungan multi-bisnis akan dipertimbangkan setelah V1.

Jangan menganggap fitur kolaborasi tim atau multi-bisnis sebagai bagian V1 tanpa keputusan eksplisit.

---

# 12. Platform and Accessibility

## 12.1 Platform

<badge>Confirmed</badge>

DagangAI akan dikembangkan sebagai platform web responsif untuk:
- Desktop.
- Perangkat mobile.

## 12.2 UX Implications

Implikasi yang perlu diperhatikan:
- Alur utama harus dapat digunakan pada layar kecil.
- Formulir pengelolaan bisnis dan produk perlu nyaman digunakan di mobile.
- Editor visual yang kompleks berpotensi sulit digunakan pada layar kecil.
- Interaksi drag-and-drop tidak boleh menjadi satu-satunya cara mengatur elemen.
- Proses menghasilkan dan menyimpan materi perlu memiliki umpan balik yang jelas.

**Pending:** Prioritas pengalaman mobile dibanding desktop dan batas kompleksitas editor belum ditentukan.

---

# 13. Business Model and Operational Constraints

## 13.1 Business Model

<badge>Confirmed — Competition Period</badge>

DagangAI akan tersedia secara gratis selama periode kompetisi.

Konsekuensi untuk ruang lingkup saat ini:
- Tidak membutuhkan sistem langganan.
- Tidak membutuhkan payment gateway.
- Tidak perlu mengimplementasikan penagihan pengguna untuk periode kompetisi.

Keputusan ini tidak otomatis berarti biaya operasional platform tidak terbatas.

## 13.2 AI Usage and Cost

**Pending:** Kebijakan kuota atau batas penggunaan AI belum ditetapkan.

Risiko operasional:
- Permintaan AI dapat menimbulkan biaya per penggunaan.
- Generasi gambar umumnya berpotensi lebih mahal daripada generasi teks.
- Penggunaan berlebihan dapat menghabiskan anggaran atau kuota penyedia AI.
- Permintaan paralel dapat memengaruhi ketersediaan layanan.

**Recommendation:** Pertimbangkan pembatasan penggunaan, rate limiting, pemantauan biaya, dan pencatatan pemakaian AI sejak awal. Nilai kuota dan kebijakannya harus ditentukan berdasarkan penyedia layanan, anggaran, serta kebutuhan kompetisi.

---

# 14. User Journey Hypothesis

Berikut contoh alur konseptual untuk menggambarkan hubungan antarbagian produk. Ini bukan user flow final.

1. Pengguna membuat akun dan masuk ke DagangAI.
2. Pengguna mengisi profil bisnis.
3. Pengguna menambahkan informasi produk atau layanan.
4. Pengguna membuka AI Content Studio.
5. Pengguna memilih kebutuhan pemasaran dan memberikan instruksi tambahan bila diperlukan.
6. AI menggunakan konteks bisnis dan produk untuk menghasilkan beberapa alternatif materi.
7. Pengguna meninjau dan mengedit hasil.
8. Pengguna menyimpan materi.
9. Jika tersedia, pengguna membuat atau menambahkan materi visual.
10. Pengguna mengatur materi dalam rencana pemasaran.
11. Pengguna melihat riwayat aktivitas yang tercatat di DagangAI.

**Hypothesis:** Alur ini dapat membantu mengurangi pengulangan input konteks dan membuat hasil AI lebih relevan. Hipotesis tersebut perlu diuji kepada calon pengguna.

---

# 15. Roles and Access Candidates

Peran berikut merupakan kandidat awal, bukan keputusan final.

| Peran | Kemungkinan tanggung jawab | Status |
|---|---|---|
| Guest | Melihat halaman informasi produk DagangAI. | Pending |
| Business Owner | Mengelola satu bisnis, produk, dan aktivitas pemasaran. | Candidate |
| Platform Admin | Mengelola operasional platform dan penggunaan AI. | Pending |

Belum ada keputusan final mengenai kebutuhan dashboard admin, dukungan tim dalam satu bisnis, maupun pembagian hak akses secara rinci.

---

# 16. MVP Considerations

## 16.1 Candidate MVP Capabilities

Kandidat kemampuan untuk dievaluasi:
- Autentikasi pengguna.
- Pembuatan profil bisnis.
- Pengelolaan produk atau layanan.
- Generasi teks pemasaran berbasis konteks.
- Edit dan penyimpanan hasil generasi.
- Template desain promosi sederhana.
- Riwayat aktivitas pemasaran.

Daftar ini adalah **kandidat**, bukan scope MVP yang telah disetujui.

## 16.2 Potential Later Capabilities

Kapabilitas yang dapat dipertimbangkan setelah prioritas MVP jelas:
- Generasi gambar AI.
- Rekomendasi pemasaran yang lebih lanjut.
- Generasi kampanye end-to-end.
- Kolaborasi beberapa pengguna dalam satu bisnis.
- Pengelolaan beberapa bisnis dalam satu akun.
- Publikasi langsung ke Instagram atau WhatsApp.
- Integrasi marketplace.
- AI customer service.
- Prediksi penjualan.

Daftar ini tidak berarti seluruh fitur akan dikembangkan. Setiap fitur memerlukan validasi kebutuhan, kelayakan, dan nilai bisnis.

## 16.3 MVP Decision Criteria

Pemilihan MVP sebaiknya mempertimbangkan:
- Seberapa penting masalah bagi target pengguna.
- Seberapa sering masalah terjadi.
- Seberapa besar manfaat yang dirasakan.
- Apakah solusi dapat diuji dalam waktu kompetisi.
- Kompleksitas pengembangan dan pemeliharaan.
- Biaya penggunaan layanan AI.
- Ketergantungan pada layanan pihak ketiga.
- Kemampuan mengukur keberhasilan.

---

# 17. Success Metrics

Metrik final belum ditetapkan. Kandidat metrik untuk dipertimbangkan:

| Area | Kandidat metrik | Catatan |
|---|---|---|
| Activation | Persentase pengguna yang menyelesaikan profil bisnis. | Mengukur keberhasilan onboarding. |
| Product usage | Jumlah pengguna yang membuat materi pemasaran. | Perlu definisi pengguna aktif. |
| Content workflow | Jumlah materi yang disimpan setelah dibuat. | Lebih bermakna daripada hanya menghitung generasi. |
| Retention | Pengguna yang kembali menggunakan platform. | Perlu periode pengukuran yang disepakati. |
| AI quality | Penilaian relevansi dan kegunaan hasil AI oleh pengguna. | Dapat menggunakan rating atau umpan balik. |
| Reliability | Tingkat keberhasilan permintaan AI dan ketersediaan fitur utama. | Perlu pencatatan error. |

**Catatan:** Jumlah konten yang dihasilkan tidak otomatis membuktikan peningkatan penjualan atau keberhasilan pemasaran.

---

# 18. Risks and Constraints

| ID | Risiko / kendala | Dampak potensial | Mitigasi atau tindak lanjut |
|---|---|---|---|
| R-01 | Target segmen terlalu luas. | Output AI dan pengalaman produk menjadi generik. | Tentukan segmen prioritas atau kebutuhan lintas-segmen yang benar-benar umum. |
| R-02 | Semua kemampuan AI dimasukkan ke MVP. | Scope membesar, kualitas tidak merata, dan pengembangan terlambat. | Prioritaskan masalah dan kemampuan berdasarkan bukti. |
| R-03 | Generasi gambar menimbulkan biaya dan latensi. | Anggaran atau kuota cepat habis. | Evaluasi template vs generasi gambar, tetapkan kuota dan monitoring. |
| R-04 | Editor visual terlalu kompleks untuk mobile. | Pengguna kesulitan menyelesaikan pekerjaan. | Batasi kompleksitas dan sediakan kontrol yang ramah layar sentuh. |
| R-05 | Analytics tidak memiliki data eksternal. | Platform berisiko menampilkan metrik yang tidak akurat atau menyesatkan. | Batasi analytics pada data internal atau integrasikan sumber data secara eksplisit. |
| R-06 | Produk gratis tetap memiliki biaya operasional. | Penggunaan AI tidak terkendali dapat meningkatkan biaya. | Terapkan rate limiting, kuota, dan pemantauan biaya. |
| R-07 | AI mengarang klaim produk. | Risiko misinformasi dan kerugian reputasi pengguna. | Gunakan konteks terverifikasi dari pengguna dan sediakan review sebelum penggunaan. |
| R-08 | Pengguna menganggap konten AI menjamin penjualan. | Ekspektasi produk tidak realistis. | Komunikasikan bahwa DagangAI membantu proses pemasaran, bukan menjamin hasil penjualan. |
| R-09 | Informasi bisnis tidak lengkap atau salah. | Hasil AI menjadi tidak relevan atau keliru. | Validasi input penting dan minta konfirmasi saat konteks kurang. |
| R-10 | Ketergantungan pada penyedia AI eksternal. | Perubahan harga, limit, atau gangguan layanan dapat memengaruhi fitur. | Evaluasi batas layanan dan siapkan penanganan kegagalan secara bertahap. |

---

# 19. Assumptions to Validate

Asumsi berikut belum boleh diperlakukan sebagai fakta:
1. Pelaku UMKM dan ekonomi kreatif mengalami kesulitan membuat materi pemasaran.
2. Kesulitan tersebut cukup penting sehingga pengguna bersedia memakai platform baru.
3. Penggunaan konteks bisnis dapat meningkatkan relevansi hasil AI.
4. Pengguna membutuhkan workspace terpadu, bukan hanya generator satu fungsi.
5. Pengguna bersedia memasukkan dan memelihara data bisnis serta produk.
6. Pengguna dapat menerima batas penggunaan AI selama periode kompetisi.
7. Template desain sederhana dapat memenuhi sebagian kebutuhan visual pengguna.
8. Pengguna akan menyimpan dan menggunakan kembali materi yang dibuat.

Setiap asumsi perlu diuji melalui wawancara, observasi, prototype testing, atau bentuk validasi lain yang sesuai.

---

# 20. Open Questions and Discovery Backlog

Pertanyaan berikut masih terbuka dan perlu dijawab secara bertahap.

## 20.1 Target Segment

- Apakah DagangAI akan mendukung seluruh kategori UMKM dan ekonomi kreatif sejak awal?
- Atau apakah beberapa kategori perlu diprioritaskan, sementara kategori lain tetap dapat menggunakan platform?
- Segmen mana yang paling mudah dijangkau untuk riset dan pengujian selama kompetisi?

## 20.2 Primary Problem

- Dari pembuatan konten, desain visual, dan perencanaan pemasaran, masalah mana yang paling penting untuk diselesaikan?
- Masalah mana yang paling sering terjadi?
- Masalah mana yang paling mungkin diselesaikan dengan baik oleh DagangAI dalam waktu kompetisi?

## 20.3 AI Experience

- Apakah pengalaman AI sebaiknya berbasis formulir, percakapan, atau gabungan keduanya?
- Kemampuan AI apa yang wajib tersedia pada versi awal?
- Apakah generasi gambar AI benar-benar diperlukan untuk MVP?
- Bagaimana pengguna mengoreksi hasil yang tidak sesuai?

## 20.4 MVP Boundary

- Fitur minimum apa yang sudah memberikan nilai nyata?
- Apakah Marketing Planner perlu masuk MVP?
- Apakah desain visual berbasis template cukup untuk versi awal?
- Apakah analytics diperlukan atau cukup berupa riwayat aktivitas?

## 20.5 Business and Operations

- Berapa batas penggunaan AI yang realistis selama kompetisi?
- Berapa anggaran operasional yang tersedia?
- Apakah satu bisnis hanya dikelola pemilik akun atau membutuhkan anggota tim?
- Apakah publikasi langsung ke media sosial diperlukan, atau pengguna cukup mengunduh dan memublikasikan secara manual?

## 20.6 Validation

- Siapa calon pengguna yang dapat diwawancarai?
- Bagaimana proses pemasaran mereka saat ini?
- Alat apa yang mereka gunakan?
- Apa indikator bahwa DagangAI benar-benar membantu pekerjaan mereka?

---

# 21. Current Decision Log

| ID | Keputusan | Status | Catatan |
|---|---|---|---|
| D-01 | Nama produk adalah DagangAI. | **Confirmed** | Nama produk. |
| D-02 | Target pasar mencakup UMKM dan pelaku ekonomi kreatif. | **Confirmed** | Segmen prioritas belum dipilih. |
| D-03 | AI menjadi kemampuan terintegrasi dalam produk. | **Confirmed** | Daftar kemampuan dan prioritas masih pending. |
| D-04 | Satu akun mengelola tepat satu bisnis pada V1. | **Confirmed** | Kolaborasi tim dan multi-bisnis belum diputuskan. |
| D-05 | Platform berupa web responsif untuk desktop dan mobile. | **Confirmed** | Detail prioritas UX belum ditentukan. |
| D-06 | Produk gratis selama periode kompetisi. | **Confirmed** | Biaya operasional dan kuota AI tetap perlu dikelola. |
| D-07 | Segmen UMKM/ekraf prioritas. | **Pending** | Menunggu keputusan dan validasi. |
| D-08 | Masalah utama yang menjadi fokus MVP. | **Pending** | Belum dipilih dari tiga kandidat masalah. |
| D-09 | Kemampuan AI untuk MVP. | **Pending** | Perlu pemeringkatan. |
| D-10 | Model interaksi AI. | **Pending** | Form, chat, atau gabungan. |
| D-11 | Generasi gambar AI pada MVP. | **Pending** | Perlu mempertimbangkan biaya dan kebutuhan. |
| D-12 | Kuota dan batas penggunaan AI. | **Pending** | Perlu mempertimbangkan anggaran dan provider. |
| D-13 | Kolaborasi beberapa pengguna dalam satu bisnis. | **Pending** | Tidak boleh diasumsikan masuk V1. |
| D-14 | Analytics dengan data eksternal. | **Pending** | Membutuhkan integrasi atau input pengguna. |

---

# 22. Recommended Next Discovery Steps

Urutan discovery yang direkomendasikan:

1. **Tentukan segmen prioritas.** Pilih fokus riset tanpa harus menutup kemungkinan kategori lain menggunakan produk.
2. **Validasi masalah utama.** Bandingkan kebutuhan pembuatan konten, desain visual, dan perencanaan pemasaran.
3. **Tentukan pengalaman AI.** Pilih pola interaksi berdasarkan karakter tugas dan kemampuan pengguna.
4. **Tetapkan batas MVP.** Pilih kemampuan minimum yang menyelesaikan masalah prioritas.
5. **Validasi operasional.** Tentukan kebutuhan kuota, batas penggunaan, dan biaya AI.
6. **Uji konsep atau prototype.** Periksa apakah alur dan hasil produk dipahami serta berguna bagi calon pengguna.

Tahapan ini perlu diselesaikan sebelum Product Requirements Document (PRD) disusun.

---

# 23. Exit Criteria for Product Discovery

Product Discovery dapat dianggap cukup matang untuk menjadi dasar PRD ketika:
- Segmen pengguna prioritas telah ditentukan dan memiliki alasan yang jelas.
- Masalah utama didukung temuan pengguna, bukan hanya asumsi.
- Value proposition dapat dijelaskan secara spesifik.
- Tujuan dan indikator keberhasilan awal telah disepakati.
- Kemampuan MVP dan batas non-MVP telah ditentukan.
- Model interaksi AI telah dipilih.
- Risiko utama, terutama biaya dan kualitas AI, memiliki pendekatan mitigasi.
- Aturan kepemilikan bisnis dan kebutuhan peran pengguna cukup jelas.
- Alur utama pengguna telah divalidasi pada tingkat konsep.

---

# 24. Handoff to PRD

Dokumen ini menjadi masukan untuk penyusunan PRD setelah discovery dinyatakan cukup matang.

PRD nantinya dapat menerjemahkan hasil discovery yang telah disepakati menjadi kebutuhan produk yang lebih terukur, termasuk:
- Ruang lingkup dan prioritas fitur.
- Kebutuhan fungsional dan nonfungsional.
- User stories dan acceptance criteria.
- Aturan bisnis.
- Skenario dan alur pengguna.
- Kebutuhan operasional dan batasan produk.

**Dokumen lanjutan:** `prd.md` — belum dibuat pada tahap ini.

Dokumen teknis seperti API Specification, Database Design, Design Specification, dan SRS sebaiknya disusun berdasarkan kebutuhan yang telah stabil, bukan digunakan untuk menggantikan proses discovery.

---

## Revision History

| Version | Date | Description |
|---|---|---|
| 0.1.0 | 2026-11-24 | Konsolidasi konsep DagangAI, keputusan terkonfirmasi, kandidat scope, risiko, asumsi, dan pertanyaan discovery yang masih terbuka. |
