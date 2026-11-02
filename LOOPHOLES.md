# Celah pada Spesifikasi

Catatan celah yang saya temukan saat membaca soal dan selama membangun aplikasi. Setiap celah ditulis dengan lokasi di soal, cara memanfaatkannya, dampaknya bagi bank, usulan perbaikan, dan statusnya di repo ini.

Patokan saya: celah yang bisa ditutup tanpa mengubah hasil 10 test case di §5.2 langsung saya perbaiki dan beri test. Celah yang perbaikannya akan mengubah hasil test case atau kontrak API di soal hanya saya catat di sini.

Ringkasan:

| # | Celah | Status |
|---|---|---|
| 1 | Flag nasabah (`BLACKLIST`, `DECEASED`, `DUPLICATE_CIF`) tidak dipakai | Diperbaiki |
| 2 | Nomor HP berstatus tidak aktif ikut dicocokkan | Diperbaiki |
| 3 | `application_id` mudah ditebak, akses hanya pakai header ID | Diperbaiki |
| 4 | Validasi file hanya dari ekstensi dan Content-Type | Diperbaiki |
| 5 | Batas 5 file bisa dilewati dengan upload paralel | Diperbaiki |
| 6 | Respons bisa dipakai untuk menebak data nasabah | Sebagian |
| 7 | Submit ulang tanpa batas | Sebagian |
| 8 | Field kosong mengecilkan pembagi confidence | Dicatat |
| 9 | Kandidat dari NIK yang beda 1–2 digit | Dicatat |
| 10 | Gangguan API Scoring langsung jadi NOT PASS | Dicatat |
| 11 | Ekstensi dan isi file tidak harus cocok | Dicatat |
| 12 | Tidak ada batas usia minimum | Dicatat |
| 13 | Upload dan submit tanpa rate limit | Dicatat |
| 14 | Data pribadi tersimpan tanpa enkripsi dan tanpa masa simpan | Dicatat |
| 15 | Token akses di `sessionStorage`, belum ada Content-Security-Policy | Dicatat |
| 16 | Daftar gelar untuk normalisasi nama terbatas | Dicatat |

---

## 1. Flag nasabah tidak dipakai

**Lokasi:** §3.1 dan §5. Data nasabah punya field `flags` (misalnya `BLACKLIST`, `DECEASED`, `DUPLICATE_CIF`), tapi aturan keputusan tidak menyinggungnya sama sekali.

**Skenario:** seseorang yang masuk daftar hitam, atau yang memakai data nasabah yang sudah meninggal, mengisi form dengan data yang cocok. Confidence 100 dan skor tinggi, sehingga hasilnya PASS.

**Dampak:** kredit bisa disetujui untuk pihak yang seharusnya ditolak, termasuk penipuan dengan identitas orang yang sudah meninggal.

**Perbaikan:** kandidat terbaik dengan flag `BLACKLIST` atau `DECEASED` langsung NOT PASS (`reason = CIF_FLAGGED`). `DUPLICATE_CIF` tidak boleh langsung PASS dan diturunkan ke REFER supaya dicek analis. Tidak ada data di 10 case yang punya flag, jadi hasilnya tidak berubah.

**Status:** diperbaiki. Test: `DecisionEngineTest::test_blacklist_is_flagged`, `test_deceased_is_flagged`, `test_duplicate_cif_downgrades_pass_to_refer`.

## 2. Nomor HP tidak aktif ikut dicocokkan

**Lokasi:** §3.1 dan §4.1. Setiap nomor di `phones` punya `status`, tapi aturan kandidat dan skor HP memakai semua nomor.

**Skenario:** nomor lama nasabah yang sudah tidak aktif (bisa jadi sudah dipakai orang lain) dipakai untuk mengajukan. Nomor itu tetap memunculkan kandidat dan menambah 15 poin confidence.

**Dampak:** orang yang mendapatkan nomor bekas nasabah bisa terlihat lebih meyakinkan sebagai nasabah tersebut.

**Perbaikan:** hanya nomor berstatus `ACTIVE` yang dipakai, baik untuk memilih kandidat maupun untuk skor HP.

**Status:** diperbaiki. Test: `CustomerTest::test_only_active_phones_kept`, `CandidateSelectorTest::test_inactive_phone_not_matched`.

## 3. `application_id` mudah ditebak

**Lokasi:** §2.2 dan §6.2. Format `APP-YYYYMMDD-NNNN` berurutan, dan akses ke upload hanya mensyaratkan header `X-Application-Id`. `GET /api/cif/{application_id}` tidak menyebut otorisasi apa pun.

**Skenario:** siapa pun bisa mencoba `APP-20261102-0001`, `-0002`, dan seterusnya untuk melihat keputusan dan data pinjaman orang lain, mengunggah file ke pengajuan orang lain, atau mengunduh KTP dan slip gaji mereka.

**Dampak:** kebocoran data pribadi dan dokumen nasabah (IDOR), serta pengajuan orang lain bisa diganggu.

**Perbaikan:** `POST /api/cif/check` mengembalikan token acak 32 byte sekali saja, dan database hanya menyimpan hash SHA-256-nya. Melihat hasil, submit, upload, dan unduh dokumen wajib mengirim `X-Application-Token`. Token yang salah dijawab 404, sama seperti pengajuan yang tidak ada, supaya keberadaan nomor tidak bisa dipastikan. Header `X-Application-Id` dari soal tetap dipakai.

**Status:** diperbaiki. Test: `CifShowTest::test_wrong_token_looks_like_not_found`, `test_missing_token_401`, `UploadTest::test_wrong_token_404`, `test_other_application_403`, `SubmitTest::test_wrong_token_404`, `CifCaseTest::test_access_token_returned_once_and_stored_hashed`.

## 4. Validasi file hanya dari ekstensi dan Content-Type

**Lokasi:** §6.1: "Validasi tipe file dilakukan berdasarkan ekstensi nama file dan header Content-Type yang dikirim browser."

**Skenario:** file berbahaya (`.exe`, HTML berisi script) diganti namanya menjadi `ktp.jpg` dan dikirim dengan Content-Type `image/jpeg`. Kedua pengecekan dari soal lolos.

**Dampak:** server menyimpan file berbahaya yang nantinya dibuka oleh analis.

**Perbaikan:** selain ekstensi dan Content-Type, isi file juga dicek (aturan `mimes` Laravel membaca magic bytes). MIME yang disimpan dan dipakai saat file diunduh adalah hasil deteksi server, bukan dari browser. Respons unduhan juga memakai `X-Content-Type-Options: nosniff`.

**Status:** diperbaiki. Test: `UploadTest::test_fake_jpg_content_422`, `test_wrong_content_type_422`, `test_wrong_extension_422`.

## 5. Batas 5 file bisa dilewati dengan upload paralel

**Lokasi:** §6.1 dan §6.4. Frontend wajib mengunggah 3 file bersamaan, sementara batas 5 file per pengajuan tidak dijelaskan cara pengecekannya.

**Skenario:** pengajuan yang sudah punya 4 file menerima 2–3 request upload yang datang hampir bersamaan. Kalau setiap request menghitung "masih 4 file" sebelum ada yang tersimpan, semuanya lolos.

**Dampak:** batas jumlah file tidak berlaku, dan penyimpanan bisa diisi melebihi batas.

**Perbaikan:** pengecekan jumlah dan penyimpanan file dilakukan dalam satu transaksi dengan baris pengajuan dikunci (`lockForUpdate`), sehingga request berikutnya menunggu dan menghitung ulang.

**Status:** diperbaiki. Test: `UploadTest::test_sixth_file_422`. Paralelnya saya cek manual di Docker dengan MySQL.

## 6. Respons bisa dipakai untuk menebak data nasabah

**Lokasi:** §2.2 dan §5.1. Respons menampilkan `identity_confidence`, dan pengguna boleh submit ulang tanpa batas.

**Skenario:** penyerang yang tahu sebagian data seseorang (misalnya nama dan NIK) mencoba berbagai tanggal lahir atau nomor HP. Setiap kali confidence naik, berarti tebakannya benar.

**Dampak:** data nasabah yang tidak diketahui penyerang bisa ditemukan sedikit demi sedikit.

**Perbaikan yang saya lakukan:** NOT PASS tidak lagi mengirim angka (confidence dan skor `null`), `reason`, NO_CIF yang cocok, dan daftar kandidat tidak pernah dikirim ke browser, ditambah throttle 30 request per menit per IP. Angka untuk PASS dan REFER tetap dikirim karena soal mewajibkan angka itu tampil.

**Usulan lanjutan:** tampilkan angka hanya kepada petugas, bukan kepada pemohon, dan tambahkan batas percobaan per NIK.

**Status:** sebagian. Test: `CifCaseTest::test_response_hides_internal_fields`, `test_case` (NOT PASS tanpa angka), `test_throttled_after_30_requests_per_minute`.

## 7. Submit ulang tanpa batas

**Lokasi:** §5.1: "Calon debitur boleh submit ulang untuk memperbaiki data. Setiap submit diproses sebagai pengajuan baru."

**Skenario:** skrip mengirim ribuan pengajuan untuk menebak data (lihat nomor 6), menghabiskan kuota API Scoring, atau membuat ribuan `application_id` sampai nomor urut harian (4 digit) habis.

**Dampak:** kuota API eksternal habis sehingga layanan terganggu bagi semua pemohon, dan database membengkak. Nomor urut harian juga hanya 4 digit. Pengajuan ke-10000 dalam sehari akan mendapat nomor 5 digit, sehingga tidak lagi sesuai format `APP-YYYYMMDD-NNNN` dan ditolak saat upload.

**Perbaikan yang saya lakukan:** throttle 30 request per menit per IP di `POST /api/cif/check`.

**Usulan lanjutan:** batas per NIK per hari, CAPTCHA setelah beberapa kali gagal, dan format nomor urut yang lebih panjang.

**Status:** sebagian. Test: `CifCaseTest::test_throttled_after_30_requests_per_minute`.

## 8. Field kosong mengecilkan pembagi confidence

**Lokasi:** §4.3. Nomor HP hanya dihitung kalau diisi, dan nama pasangan hanya dihitung kalau diisi dan tidak dicentang lupa.

**Skenario:** penyerang yang hanya tahu NIK, nama, dan tanggal lahir korban sengaja mengosongkan HP dan mencentang "lupa nama pasangan". Confidence dihitung dari 3 field itu saja dan bisa mencapai 100, setara dengan pemohon yang mengisi lengkap dan semuanya cocok.

**Dampak:** data yang lebih sedikit justru menghasilkan confidence penuh. Field yang paling sulit diketahui orang lain (HP aktif, nama pasangan) bisa dilewati begitu saja.

**Usulan:** field kosong tetap masuk pembagi dengan skor 0, atau setidaknya hasil yang tanpa HP tidak boleh PASS langsung. Ini tidak saya terapkan karena akan mengubah hasil case 3 (HP kosong, seharusnya PASS).

**Status:** dicatat.

## 9. Kandidat dari NIK yang beda 1–2 digit

**Lokasi:** §3.1 dan §4.1. Jarak Levenshtein NIK sampai 2 tetap menjadi kandidat, dan jarak 1 masih bernilai 0.9.

**Skenario:** anggota keluarga dengan NIK berdekatan, atau penipu yang mengubah 1 digit NIK nasabah, ditambah nama dan tanggal lahir yang sama. Confidence-nya (35 × 0.9 + 25 + 15) / 75 × 100 = 95.3, di atas batas 90, sehingga bisa PASS.

**Dampak:** pengajuan bisa tercatat atas nama nasabah lain.

**Usulan:** NIK yang tidak sama persis tidak boleh langsung PASS (paling tinggi REFER), atau tambahkan verifikasi digit NIK (kode wilayah, tanggal lahir yang tertanam di NIK).

**Status:** dicatat, karena mengubah perilaku aturan matching di soal.

## 10. Gangguan API Scoring langsung jadi NOT PASS

**Lokasi:** §5.1: score `null` atau ada `error`, maka skor = 0.

**Skenario:** API Scoring sedang gangguan (`UPSTREAM_TIMEOUT`) atau kuotanya habis (HTTP 429). Semua pemohon yang sebenarnya layak mendapat NOT PASS. Hal ini sempat terjadi saat pengujian, ketika kuota Beeceptor habis.

**Dampak:** calon debitur yang layak ditolak, pengalaman pengguna buruk, dan bank kehilangan nasabah karena masalah teknis di sisi bank sendiri.

**Usulan:** kegagalan teknis dibedakan dari skor rendah. Hasilnya bisa REFER atau "coba lagi nanti" tanpa menyimpan keputusan final, dengan retry terbatas.

**Status:** dicatat. Aplikasi mengikuti soal (skor 0), tapi menyimpan `scoring_error` (`UPSTREAM_TIMEOUT`, `HTTP_ERROR`, `INVALID_SCORE`, `CUSTOMER_NOT_FOUND`) supaya analis bisa membedakannya. Test: `CifCaseTest::test_scoring_error_is_stored`, `ScoringClientTest`.

## 11. Ekstensi dan isi file tidak harus cocok

**Lokasi:** §6.1.

**Skenario:** file PNG asli diberi nama `ktp.pdf`. Ekstensinya diizinkan dan isinya juga tipe yang diizinkan, jadi diterima.

**Dampak:** kecil, karena keduanya tipe aman. Tetapi file bisa gagal dibuka dengan aplikasi yang diharapkan analis.

**Usulan:** cocokkan ekstensi dengan MIME hasil deteksi.

**Status:** dicatat.

## 12. Tidak ada batas usia minimum

**Lokasi:** §2.1. Tanggal lahir hanya disyaratkan valid dan tidak di masa depan.

**Skenario:** tanggal lahir 2021 (usia 5 tahun) diterima. Saat uji manual, salah ketik tahun seperti ini membuat pencocokan tanggal lahir gagal dan hasilnya REFER, bukan error validasi yang jelas.

**Dampak:** pengajuan yang jelas tidak sah tetap diproses dan memakan kuota scoring, dan pemohon tidak mendapat petunjuk bahwa tanggal yang diisi keliru.

**Usulan:** batasi usia minimal 17 tahun (atau sesuai ketentuan produk kredit) dan maksimal yang wajar.

**Status:** dicatat, karena mengubah aturan validasi di soal.

## 13. Upload dan submit tanpa rate limit

**Lokasi:** §6.2.

**Skenario:** walaupun setiap pengajuan maksimal 5 file × 20 MB, penyerang bisa membuat banyak pengajuan (dibatasi 30 per menit) lalu mengisi masing-masing dengan 100 MB.

**Dampak:** disk server bisa penuh.

**Usulan:** rate limit untuk upload per IP dan per pengajuan, kuota total penyimpanan, dan pembersihan pengajuan yang tidak pernah dikirim ke analis.

**Status:** dicatat.

## 14. Data pribadi tanpa enkripsi dan tanpa masa simpan

**Lokasi:** catatan implementasi Laravel di soal (skema tabel `applications`, `documents`, dan cache Customer Information API).

**Skenario:** database atau backup bocor. NIK, tanggal lahir, nomor HP, dan dokumen KTP tersimpan apa adanya. Cache data 100 nasabah dari Customer Information API juga disimpan di tabel `cache`.

**Dampak:** kebocoran data pribadi dalam jumlah besar, yang berisiko melanggar UU Pelindungan Data Pribadi.

**Usulan:** enkripsi kolom sensitif dan file dokumen, batas masa simpan untuk pengajuan yang ditolak, dan cache di memori (Redis) dengan akses terbatas.

**Status:** dicatat. Yang sudah dilakukan: log tidak memuat NIK atau HP, file disimpan di luar folder publik dengan nama acak, dan MySQL tidak dibuka ke luar jaringan Docker.

## 15. Token akses di `sessionStorage`, belum ada Content-Security-Policy

**Lokasi:** implementasi token di nomor 3.

**Skenario:** kalau suatu saat ada celah XSS, script penyerang bisa membaca token dari `sessionStorage`.

**Dampak:** penyerang bisa melihat hasil dan dokumen pengajuan di tab tersebut.

**Usulan:** pindahkan token ke cookie `HttpOnly` + `SameSite=Strict` (disertai perlindungan CSRF) dan pasang Content-Security-Policy. CSP belum saya pasang karena dokumen dibuka lewat URL `blob:` yang mewarisi CSP halaman, dan aturan yang terlalu ketat bisa menghalangi tampilan PDF. Ini perlu diuji lebih lanjut.

**Status:** dicatat. Yang sudah ada: React meng-escape semua teks, dan nginx mengirim `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, dan `X-Content-Type-Options: nosniff`.

## 16. Daftar gelar untuk normalisasi nama terbatas

**Lokasi:** §4.2. Gelar yang dihapus hanya `hj, h, dr, ir, se, skom, mt, st, sh, mm, msi, spd`.

**Skenario:** nama dengan gelar lain (`Prof.`, `S.Kom.` yang ditulis `S.Kom`, `Amd`, `S.Ked`) tidak dibersihkan, sehingga skor Jaro-Winkler turun dan pemohon yang sah bisa jatuh ke REFER.

**Dampak:** lebih banyak pengajuan masuk ke analis tanpa alasan yang jelas.

**Usulan:** daftar gelar akademik dan keagamaan yang lebih lengkap, atau buang token pendek yang diikuti titik.

**Status:** dicatat. Daftar dari soal dipakai apa adanya supaya perhitungan sama dengan contoh di soal.
