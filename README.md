# CIF Customer Information Checking

Take-home challenge Kopnus: modul pengecekan calon debitur untuk bank fiktif Bank Nusantara Digital.

Calon debitur mengisi form pengajuan kredit. Backend mencocokkan datanya ke 100 data nasabah memakai fuzzy matching (Jaro-Winkler dan Levenshtein), mengambil credit score, lalu memutuskan PASS, REFER, atau NOT PASS. Untuk REFER, calon debitur mengunggah dokumen pendukung (maksimal 3 file bersamaan) dan pengajuannya masuk antrean analis kredit.

Stack:

- Backend (BFF): Laravel 13, PHP 8.4, MySQL 8.4. Hanya backend yang memanggil API eksternal.
- Frontend: React 19, Vite 8, TypeScript 7, Tailwind CSS 4, shadcn/ui, react-hook-form + zod, TanStack Query.
- Docker Compose: nginx, php-fpm, worker antrean, MySQL.

Celah yang saya temukan di spesifikasi dan cara menanganinya ada di [LOOPHOLES.md](LOOPHOLES.md).

## Menjalankan dengan Docker

Butuh Docker dengan Compose v2, dan port 8080 sedang tidak dipakai.

```bash
cp .env.example .env
docker compose up --build
```

Di Windows PowerShell, ganti `cp` dengan `copy`.

File `.env` perlu ada karena password database sengaja tidak disimpan di repo. Isi `.env.example` bisa langsung dipakai, atau ganti `DB_PASSWORD` dan `DB_ROOT_PASSWORD` dengan nilai sendiri.

Kalau sudah siap, log container `web` akan menampilkan:

```
==================================================
 CIF Customer Information Checking siap
 Aplikasi (frontend) : http://localhost:8080
 API (backend)       : http://localhost:8080/api
 Contoh              : POST http://localhost:8080/api/cif/check
==================================================
```

Frontend dan API ada di alamat yang sama. nginx menyajikan React dan meneruskan request `/api/*` ke php-fpm, sedangkan php-fpm dan MySQL hanya bisa diakses dari jaringan internal Docker. Migrasi database jalan otomatis saat backend start.

Beberapa perintah yang sering dipakai:

```bash
docker compose build
docker compose up -d
docker compose logs -f backend queue
docker compose down        # data tetap ada
docker compose down -v     # database dan file upload ikut dihapus
```

### Kalau kuota Beeceptor habis

API Customer Information dan Scoring dari soal berjalan di Beeceptor dengan kuota harian yang terbatas. Saat kuota habis, Scoring membalas HTTP 429. Sesuai soal (§5.1) skornya dianggap 0, jadi case yang seharusnya PASS akan keluar NOT PASS, dan di database tercatat `scoring_error = HTTP_ERROR`.

Supaya tetap bisa dicoba, saya menyediakan mock lokal (`mock/server.mjs`) yang meniru kedua API memakai data di `testdata/`. Hasil 10 case dari mock ini sama dengan tabel soal. Cara mengaktifkannya, tambahkan ke `.env`:

```env
COMPOSE_PROFILES=mock
CUSTOMER_INFO_URL=http://upstream-mock:3000/api/customer-information
SCORING_URL=http://upstream-mock:3000/api/scoring
```

Lalu jalankan:

```bash
docker compose up -d
docker compose exec backend php artisan cache:clear
```

`COMPOSE_PROFILES` hanya menyalakan container mock, sedangkan dua URL itu yang membuat backend benar-benar memakainya, jadi ketiganya perlu diubah bersama. Untuk kembali ke Beeceptor, cukup beri `#` di depan ketiga baris tersebut.

### Isi `.env`

| Variabel | Default | Catatan |
|---|---|---|
| `DB_PASSWORD`, `DB_ROOT_PASSWORD` | wajib diisi | MySQL hanya membacanya saat volume masih kosong. Kalau diganti, jalankan `docker compose down -v` dulu. |
| `WEB_PORT` | `8080` | Port aplikasi di host. |
| `APP_KEY` | kosong | Kalau kosong, dibuat acak saat container start. Aplikasi tidak menyimpan data terenkripsi, token akses disimpan sebagai hash. |
| `DB_DATABASE`, `DB_USERNAME` | `cif` | |
| `CUSTOMER_INFO_URL`, `SCORING_URL` | URL Beeceptor dari soal | |
| `CUSTOMER_INFO_CACHE_TTL` | `300` | Dalam detik. Soal meminta minimal 5 menit. |
| `EXTERNAL_HTTP_TIMEOUT` | `10` | Dalam detik. |

## Test

Semua test memakai fixture di `testdata/` dan `Http::preventStrayRequests()`, jadi tidak ada yang memanggil Beeceptor dan aman dijalankan berulang kali.

Lewat Docker, tanpa perlu PHP atau Node di laptop:

```bash
docker compose --profile test build
docker compose --profile test run --rm backend-test     # 159 test
docker compose --profile test run --rm frontend-test    # 85 test
```

Tanpa Docker:

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan test
./vendor/bin/pint --test

cd ../frontend
npm ci
npm test
npm run lint
npm run build
```

Letak test yang diminta soal:

| Yang diuji | File |
|---|---|
| 6 unit test wajib (§4.5) | `backend/tests/Unit/Matching/RequiredSimilarityTest.php` |
| 10 test case (§5.2), lewat HTTP | `backend/tests/Feature/CifCaseTest.php`, datanya di `testdata/cases.json` |
| Validasi input (§2.1) | `backend/tests/Feature/CifCheckValidationTest.php`, `frontend/src/lib/validation.test.ts` |
| Integration test upload | `backend/tests/Feature/UploadTest.php` |
| Submit ke antrean analis | `backend/tests/Feature/SubmitTest.php`, `backend/tests/Unit/QueueForCreditAnalystTest.php` |
| Upload pool (maks. 3, retry, batal, progress) | `frontend/src/lib/uploadPool.test.ts` |
| Halaman form, hasil, dan panel upload | `frontend/src/pages/*.test.tsx`, `frontend/src/components/UploadPanel.test.tsx` |

## Menjalankan tanpa Docker

Butuh PHP 8.4 (dengan ekstensi `pdo_sqlite`, `fileinfo`, dan `gd` untuk test), Composer 2, dan Node 26.

Backend memakai SQLite:

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
PHP_CLI_SERVER_WORKERS=4 php artisan serve
```

Di terminal lain, jalankan worker antrean dengan `php artisan queue:work`. `PHP_CLI_SERVER_WORKERS=4` perlu supaya 3 upload paralel tidak diproses satu per satu.

Frontend:

```bash
cd frontend
npm ci
npm run dev
```

Buka http://localhost:5173. Vite meneruskan `/api` ke `http://127.0.0.1:8000`. Kalau backend jalan di port lain, salin `frontend/.env.example` menjadi `.env` lalu ubah `VITE_API_PROXY_TARGET`. Mock lokal juga bisa dipakai tanpa Docker dengan `node mock/server.mjs`, lalu arahkan dua URL di `backend/.env` ke `http://127.0.0.1:3000/...`.

## Arsitektur

```
                ┌──────────────────────── docker compose ────────────────────────┐
Browser ──8080──► web (nginx)                                                    │
                │   /       React (hasil build)                                  │
                │   /api/*  FastCGI ──► backend (php-fpm, Laravel 13)            │
                │                         ├─ Http/       Requests, Controllers, Resources, Middleware
                │                         ├─ Services/   CifCheck, Document, ApplicationIdGenerator
                │                         ├─ Matching/   Normalizer, JaroWinkler, FieldScorer,
                │                         │              CandidateSelector, ConfidenceCalculator, DecisionEngine
                │                         ├─ Clients/    CustomerInformation (cache 300 detik), Scoring
                │                         └─ Events/Listeners ──► jobs ──► queue (queue:work)
                │                                   │                          │
                │                                   ▼                          ▼
                │                              mysql 8.4: applications, documents, cache, jobs,
                │                              application_sequences, analyst_queue
                └────────────────────────────────────────────────────────────────┘
backend ──HTTPS──► Beeceptor (customer-information, scoring), atau upstream-mock
backend ──disk───► volume uploads: storage/app/private/uploads/{application_id}/
```

Folder `backend/app/Matching/` sengaja tidak bergantung pada Laravel (tidak memakai HTTP, database, atau facade), jadi bisa diuji tanpa menjalankan framework. Frontend memanggil `/api` dengan path relatif, jadi tidak perlu CORS dan tidak perlu env khusus di produksi.

### Alur `POST /api/cif/check`

1. Input divalidasi oleh Form Request. Frontend memakai aturan yang sama lewat skema zod, jadi kesalahan sudah terlihat sebelum request dikirim.
2. Backend mengambil 100 data nasabah dari Customer Information API dan menyimpannya di cache selama 300 detik. Kalau API gagal dan cache kosong, backend membalas 503 dengan pesan yang jelas, dan pengajuan tidak disimpan.
3. Backend membuat `application_id` dengan format `APP-YYYYMMDD-NNNN`, urut per hari (zona Asia/Jakarta). Baris nomor urut dikunci supaya tidak dobel saat ada request bersamaan.
4. Data dinormalisasi (§4.2), lalu kandidat dipilih: NIK dengan jarak Levenshtein maksimal 2, atau nomor HP aktif dengan jarak maksimal 1. Kalau lebih dari 5, diambil 5 dengan jarak NIK terkecil.
5. Confidence dihitung per kandidat: `Σ(bobot × skor) / Σbobot × 100`, dengan bobot NIK 35, nama 25, tanggal lahir 15, HP 15 (kalau diisi), dan nama pasangan 10 (kalau diisi dan tidak dicentang lupa). Kandidat dengan confidence tertinggi dipakai. Kalau seri, dipilih yang jarak NIK-nya paling kecil.
6. Scoring API hanya dipanggil kalau ada kandidat. `score` berupa string diubah ke angka. Kalau `null`, ada `error`, HTTP gagal, atau timeout, skornya dianggap 0 dan kode errornya disimpan.
7. Keputusan diambil dari aturan pertama yang cocok:
   - NOT PASS kalau tidak ada kandidat, confidence di bawah 70, skor di bawah 50, atau nasabah punya flag `BLACKLIST` atau `DECEASED`.
   - PASS kalau confidence minimal 90 dan skor minimal 80, kecuali nasabah ber-flag `DUPLICATE_CIF`.
   - Selain itu REFER.

   Perbandingan memakai nilai asli tanpa pembulatan. Di layar, angka ditampilkan maksimal 2 desimal.
8. Hasilnya disimpan. Status REFER adalah `WAITING_DOCUMENTS`, sedangkan PASS dan NOT PASS langsung `COMPLETED`.

## API

Semua respons berbentuk JSON. Kalau terjadi error, bentuknya `{"message": "..."}`, dan untuk 422 ada tambahan `errors` per field. Pesan memakai bahasa Indonesia.

| Method | Endpoint | Header | Sukses | Error |
|---|---|---|---|---|
| GET | `/api` | | 200, info layanan dan daftar endpoint | |
| POST | `/api/cif/check` | | 201, data pengajuan dan `access_token` | 422 validasi, 503 Customer Info tidak bisa dihubungi, 429 lebih dari 30 request per menit per IP |
| GET | `/api/cif/{application_id}` | `X-Application-Token` | 200, data pengajuan | 401 token tidak dikirim, 404 tidak ada atau token salah |
| POST | `/api/cif/{application_id}/submit` | `X-Application-Token` | 200, status menjadi `IN_REVIEW` dan masuk antrean analis | 401, 404, 409 bukan REFER yang menunggu dokumen, 422 belum ada dokumen |
| POST | `/api/uploads` | `X-Application-Id`, `X-Application-Token` | 201, `upload_id`, `file_name`, `doc_type`, `status`, `url` | 400 header tidak ada atau formatnya salah, 401, 404, 409 NOT PASS atau sudah `IN_REVIEW`, 422 tipe, ukuran, `doc_type`, atau sudah 5 file |
| GET | `/api/uploads/{upload_id}` | `X-Application-Id`, `X-Application-Token` | 200, isi file | 400, 401, 403 bukan pemilik, 404 |

Contoh request:

```bash
curl -s -X POST http://localhost:8080/api/cif/check \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"full_name":"Budi Santoso","nik":"3171011504900001","dob":"1990-04-15","phone":"081234567890","marital_status":"KAWIN","spouse_name":"Siti Aminah","loan_type":"KTA","loan_amount":50000000,"loan_tenor_months":12}'
```

Respons:

```json
{
  "data": {
    "application_id": "APP-20261102-0001",
    "access_token": "64 karakter hex, hanya muncul di respons ini",
    "decision": "PASS",
    "identity_confidence": 100,
    "credit_score": 85,
    "status": "COMPLETED",
    "documents_required": false,
    "loan": { "type": "KTA", "amount": 50000000, "tenor_months": 12 },
    "documents": [],
    "created_at": "2026-11-02T10:15:00+07:00"
  }
}
```

Data seperti `matched_no_cif`, `reason`, daftar kandidat, `scoring_error`, NIK, dan HP tidak pernah dikirim ke browser, hanya disimpan di database. Untuk NOT PASS, `identity_confidence` dan `credit_score` dikirim `null`.

### Upload dan penyimpanan file

- File yang diterima: JPG, PNG, atau PDF, maksimal 20 MB per file dan 5 file per pengajuan. `doc_type` salah satu dari `KTP`, `NPWP`, `SLIP_GAJI`, `BUKU_NIKAH`, `LAINNYA`.
- Pengecekan dilakukan di frontend dan backend: ekstensi, Content-Type dari browser, dan isi file. File `.exe` yang diganti namanya jadi `.jpg` tetap ditolak.
- Batas 5 file dicek di dalam transaksi dengan baris pengajuan dikunci, jadi upload paralel tidak bisa melewatinya.
- File disimpan dengan nama acak di `storage/app/private/uploads/{application_id}/`, di Docker ada di volume `uploads` dan di luar folder `public/`. Nama asli, jenis dokumen, MIME, dan ukuran dicatat di tabel `documents`. File hanya bisa diunduh lewat `GET /api/uploads/{id}` dengan kedua header.

## Keputusan desain

- **Laravel 13 dan PHP 8.4**, versi dengan masa dukungan paling panjang saat ini.
- **Logika matching dipisah dari framework** (`app/Matching/`). Jaro-Winkler saya tulis sendiri karena hasilnya harus persis dengan angka di soal (0.987, 0.938, 0.534), sedangkan Levenshtein memakai fungsi bawaan PHP.
- **10 case soal disimpan sebagai data** (`testdata/cases.json`) dan diuji lewat HTTP, sehingga routing, validasi, dan service ikut teruji. Data yang sama dipakai mock lokal.
- **Semua kegagalan Scoring dianggap skor 0** dan kode errornya disimpan. Tidak ada retry karena akan menambah waktu tunggu dan memakan kuota.
- **Cache dan antrean memakai driver database**, jadi tidak perlu Redis.
- **Upload per file memakai XMLHttpRequest** dengan pool berisi 3, karena `fetch` belum menyediakan progress untuk upload. Logika pool dipisah dan diuji tersendiri.
- **nginx dan php-fpm**, bukan `php artisan serve`, karena server bawaan PHP hanya satu proses sehingga upload paralel jadi berurutan.
- **Antrean analis memakai event dan queued listener**, supaya respons ke pengguna tidak menunggu proses analis.
- **Kode tanpa komentar**, kecuali komponen hasil generate shadcn di `frontend/src/components/ui/`. Format kode dijaga dengan Pint, oxlint, dan Prettier.

### Hal yang saya tambahkan atau ubah dari soal

- **Token akses.** `application_id` berurutan sehingga mudah ditebak, jadi `POST /api/cif/check` juga mengembalikan token acak sekali saja. Database hanya menyimpan hash SHA-256-nya. Token ini wajib untuk melihat hasil, submit, dan upload, selain `X-Application-Id` yang diminta soal. Frontend menyimpannya di `sessionStorage` per tab.
- **NOT PASS tidak menampilkan angka.** Confidence dan skor dikirim `null`, supaya respons tidak bisa dipakai untuk menebak data nasabah. PASS dan REFER tetap menampilkan angka sesuai soal.
- **Endpoint `POST /api/cif/{id}/submit`.** Soal tidak menyediakan endpoint untuk memasukkan pengajuan ke antrean analis setelah upload. Endpoint ini menghubungkan tombol "Kirim dokumen" (soal §6.4 menyebut tombol Submit yang nonaktif selama upload) ke antrean.
- **Perbaikan celah yang tidak mengubah hasil 10 case**: flag `BLACKLIST` dan `DECEASED` jadi NOT PASS, `DUPLICATE_CIF` turun dari PASS ke REFER, hanya HP berstatus `ACTIVE` yang dipakai, isi file dicek, dan ada throttle 30 request per menit per IP. Detailnya di [LOOPHOLES.md](LOOPHOLES.md).
- **File tidak langsung terunggah saat dipilih.** File tampil dulu sebagai "Siap diunggah", jenis dokumennya ditebak dari nama file dan bisa diubah, baru kemudian diunggah dengan tombol "Unggah n file". Kalau langsung diunggah, 3 file pertama sudah terkunci di jenis `LAINNYA`.
- **Perlu `.env`** untuk password database, jadi ada satu langkah `cp` sebelum `docker compose up --build`.
- Setiap kelompok pekerjaan dikerjakan di branch sendiri lalu di-merge `--no-ff` ke `main`, tanpa pull request.

### Belum dikerjakan / di luar scope

- Halaman atau endpoint untuk keputusan analis kredit, dan notifikasi ke pemohon. Soal berhenti di "masuk antrean analis". Setelah dokumen dikirim, pemohon diminta menyimpan nomor pengajuan.
- Login pengguna. Hasil pengajuan hanya bisa dibuka di tab tempat pengajuan dibuat, karena tokennya disimpan di `sessionStorage`.
- Upload per chunk, resume setelah refresh, dan thumbnail gambar (nilai tambah di §6.3 dan §6.4).

## Struktur folder

```
backend/            Laravel (app/Matching, Clients, Services, Http, Events, Listeners, tests/)
frontend/           React + Vite (src/pages, src/components, src/lib)
mock/server.mjs     tiruan Beeceptor dari data testdata/ (profile "mock")
testdata/           customers.json, scoring.json, cases.json untuk test dan mock
docker-compose.yml  mysql, backend, queue, web, ditambah upstream-mock, backend-test, frontend-test
LOOPHOLES.md        celah di spesifikasi dan penanganannya
```

## Versi

PHP 8.4, Laravel 13, MySQL 8.4, Node 26, React 19, Vite 8, TypeScript 7, Tailwind CSS 4, Docker Compose v2.
