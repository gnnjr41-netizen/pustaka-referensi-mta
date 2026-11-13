# Tahap 1–3: Audit, Rancangan, Prototipe — Pustaka Referensi MTA v3.2

## Tahap 1 — Audit V3.1

**Backup.** File asli `APLIKASI_v3_1_saja.zip` disalin tanpa diubah (SHA-256 `4bd3c82c6646d10b4adb83ffcb423fc7c98d3dc73e24d2bcb4260c3e784c82d7`) dan seluruh 17.374 file dicatat checksum-nya sebelum pengerjaan. Pengerjaan dilakukan pada salinan.

**Isi aplikasi (390 MB).**
| Bagian | Isi |
|---|---|
| `index.html` (242 KB) | UI + mesin PRM (normalisasi, parseQuery, pencarian brosur) |
| `data/lib/kitab.js` | PRMK: BM25 (k1 1,2; b 0,5) di indeks terbalik bertahap, varian imbuhan Indonesia & awalan Arab, frasa, nomor, nama koleksi, transliterasi |
| `data/lib/makna.js` + `data/kitab/makna/` (9,6 MB) | PRMQ: makna Al-Qur'an dari terjemahan, catatan, Jalalain, Ibnu Katsir, judul kelompok ayat, indeks tema + kamus |
| `data/lib/support.js` + `data/kamus_support.js` | PRMS: Mode Support Ustadz, penganalisis kalimat & kamus |
| `data/kitab/` (361 MB) | 110.013 record (7.571 pecahan), posting, kamus, toc, 6.236 gambar ayat |
| `data/chm_*.js` | 1.354 brosur CHM (1995–2023) per tahun |
| `data/pdf_seed.js`, `data/pdf/` | 4 brosur PDF bawaan |
| `config.js`, `supabase/setup.sql`, `data/lib/supabase.js` | Brosur online (kunci publik saja) |

**Database.** Record dibaca ulang dari pecahan `data/kitab/r/` (110.013, indeks berurutan tanpa celah). Teks per sumber: Al-Qur'an 6.236 ayat (60 tanpa teks Arab), Jalalain 6.233, Ibnu Katsir 2.078 bagian (23,8 juta karakter), 10 kitab hadis 95.320 record (Kitab 9 Imam 62.198; 15.126 di antaranya identik dengan file lain), Gurda 24 halaman. `database_referensi/*.jsonl` tidak ada di paket "aplikasi saja" — tidak diperlukan karena record lengkap tersedia di `data/kitab/r/`.

**Mesin pencarian.** BM25 sudah ada untuk kitab; pencarian brosur memakai skor kata + frasa. Makna Al-Qur'an V3.1 berbasis bukti tertulis.

**Baseline uji V3.1 (dijalankan ulang):** `validate_search` 36/36, `validate_support` 17/17, `validate_makna` 13/13.

**Kemampuan browser.** GitHub Pages tidak mengirim header COOP/COEP → WebAssembly multi-thread tidak tersedia; file:// (dobel-klik) tidak bisa memakai fetch, ES module, atau Worker. Konsekuensi: semua aset baru harus bisa dimuat dengan `<script>` biasa.

**Supabase.** Hanya untuk brosur online (tabel `brosur`, `brosur_halaman`, `upload_log`, `admins`; bucket `brosur-pdf`). Tidak disentuh. Tidak bisa diuji dari lingkungan kerja.

**Lingkungan kerja.** Hugging Face, jsDelivr, unpkg, Google API diblokir; npm, PyPI, GitHub (terbatas) terbuka. 2 inti CPU, 7 GB RAM.

**File yang direncanakan berubah:** `index.html`, `README.md` (+ file baru). Data, kamus, konfigurasi produksi: tidak.

## Tahap 2 — Rancangan

1. **Model embedding** — kriteria: ukuran, akurasi Indonesia, Arab, kecepatan, RAM, kompatibilitas browser (termasuk file://), lisensi, penyimpanan. Diputuskan dari hasil uji Tahap 3 (bukan popularitas).
2. **Format indeks** — pecahan `.js` berisi base64 (bisa dimuat lewat `<script>` di file:// dan lewat fetch di website), per kategori agar dimuat bertahap; setiap pecahan membawa versi dan hash isi; `meta.js` menyimpan SHA-256 setiap file.
3. **Penggabungan** — RRF berbobot per mode & kategori; tingkat bukti dari teks sumber.
4. **Fallback** — mode Literal = V3.1; bila indeks gagal dimuat/rusak → hasil V3.1 + pesan; kueri nomor/QS/Arab/"frasa"/transliterasi tetap jalur V3.1 bila ada kecocokan persis.
5. **Estimasi** — dokumen ±130 rb potongan; int8 64 dimensi ≈ 8 MB vektor + rujukan; skor 130 rb × 64 ≈ 8 juta operasi (< 50 ms).
6. **Rencana uji** — 12 uji wajib + contoh bagian D, regresi 3 validator V3.1, perbandingan tampilan mode Literal vs V3.1 di browser, desktop & emulasi HP, file:// tanpa internet, Gemini mati/gagal/berhasil.

## Tahap 3 — Prototipe pada data nyata

**Potongan teks (passage)** dibuat dari database nyata: ayat (terjemahan), indeks tema, Jalalain per ayat, Ibnu Katsir per ±1.100 karakter, hadis (bab + matan; rangkaian sanad dibuang hanya untuk perhitungan vektor; teks identik cukup satu), Gurda, CHM per ±1.100 karakter, PDF per halaman. Total 130.415 (+ 6.150 teks Arab ayat untuk uji e5).

**Set uji Al-Qur'an** — 9 kueri dengan daftar ayat rujukan (mis. berbakti: 17:23, 17:24, 31:14, 31:15, 46:15, 2:83, 4:36, 6:151, 29:8 …). Metrik: ayat rujukan di 10 teratas (maks. 90).

| Sistem | Skor |
|---|---|
| BM25 V3.1 | 15 |
| Makna/tema V3.1 | 37 |
| e5-small: terjemahan / + judul & tema / jendela 3 ayat / Jalalain / teks Arab | 6–10 / 7 / 5 / 10 / 0 |
| e5-small + pemusatan vektor | ≤ 9 |
| Vektor kata domain (Indonesia) — terjemahan / Jalalain | 23 / 23 |
| Vektor kata dwibahasa — terjemahan | 19 (dipakai hanya untuk padanan Arab → Indonesia) |
| PCA 128 → 96 / 64 / 48 dimensi (int8) | 24 / 23 / 20 → dipilih 64 |
| RRF makna 1 + semantik 1 + kata 0,7 | 39 |
| **RRF makna 1,5 + semantik 1 + kata 0,5 (dipilih)** | **43** |

**Catatan e5-small.** Kemiripan antar dokumen sangat seragam (rata-rata 0,92 terhadap pusat) sehingga ayat pendek ("zaitun dan kurma") muncul untuk banyak kueri. Teks Arab berharakat terpecah per tanda baca dalam tokenisasi — harakat dihapus sebelum perhitungan.

**Hadis (7 kitab, penilaian manual 10 teratas):**
| Kueri | Vektor kata domain | e5-small | BM25 |
|---|---|---|---|
| amanah | 10 | 6–7 | 8 |
| sabar menghadapi musibah | 10 | 4–5 | 8–10 |
| kewajiban suami istri | 4 | 8–9 | 6–7 |
| kejujuran berdagang | 4 sesuai + 3 sebagian | 3 + 5 | 3 + 3 |

**Kecepatan prototipe** (CPU 2 inti): e5-small ±140 potongan/detik; seluruh build vektor kata 26 detik (pelatihan 2,5 menit Indonesia, 14 menit dwibahasa).

**Keputusan:** vektor kata domain + tabel padanan Arab sebagai mesin makna lokal; e5-small tidak dikirim; BGE-M3 tidak layak untuk HP (dan tidak bisa diunduh di lingkungan kerja).
