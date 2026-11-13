# Pustaka Referensi MTA v3.2 — Hybrid Intelligent Search
**Laporan akhir · 13 November 2026 · diperbarui untuk v3.2 FINAL** (ringkasan perbaikan final: `LAPORAN_FINAL_v3.2.md`)

Status: **siap diuji tim** (belum diunggah ke repository produksi — menunggu persetujuan).
Dasar: `APLIKASI_v3_1_saja.zip` (SHA-256 `4bd3c82c…c84c82d7`), dibackup utuh sebelum pengerjaan.

---

## Ringkasan

| | V3.1 | V3.2 |
|---|---|---|
| Pencarian kata persis (BM25), nomor, Arab, transliterasi | ✓ | ✓ tidak berubah |
| Pencarian makna Al-Qur'an (tema, judul kelompok, terjemahan, tafsir, kamus) | ✓ | ✓ tidak berubah, kini digabung |
| Pencarian makna untuk **hadis, tafsir, materi, arsip CHM, brosur PDF** | — | ✓ baru |
| Penggabungan peringkat (RRF berbobot) + tingkat bukti | — | ✓ baru |
| Mode pencarian Campuran / Makna / Literal | — | ✓ (Pengaturan lanjutan) |
| Tampilan HP: kartu ringkas, filter terlipat, alasan satu baris | — | ✓ |
| Gemini | — | opsional, **tidak aktif**, kode Edge Function tersedia |
| Tanpa API berbayar, tanpa akun AI | ✓ | ✓ |
| Bisa dibuka langsung `index.html` tanpa internet | ✓ | ✓ (termasuk pencarian makna) |

Ayat rujukan yang muncul di 10 teratas pada 9 kueri uji Al-Qur'an:
**V3.1 = 37/90 → V3.2 awal = 43/90 → V3.2 FINAL = 52/90** (+41% dari V3.1). Kenaikan FINAL berasal dari 2 entri kamus baru dan sinonim frasa (lihat `LAPORAN_FINAL_v3.2.md`).
Uji regresi V3.1: **66/66 lulus**. Uji baru `validate_hybrid`: **14/14 lulus**. 12 uji wajib: **7 Tepat penuh + 5 Baik, 0 Sebagian**. Mode Literal: **38/40 halaman identik** dengan V3.1; 2 sisanya hanya bertambah 1 ayat utama di bagian *berdasarkan makna* karena sinonim kamus baru.

---

## 1. Arsitektur akhir

```
              ┌──────────── kueri pengguna ────────────┐
              │                                         │
   nomor / QS x:y / teks Arab / "frasa" / transliterasi │ kalimat biasa
   (ada kecocokan persis)                               │
              │                                         ▼
              ▼                    ┌───────────────┬───────────────┬──────────────────┐
     JALUR V3.1 (tidak berubah)    │ Kata persis   │ Makna/tema    │ Makna lokal BARU │
                                   │ BM25 (PRMK,   │ Al-Qur'an     │ vektor kata      │
                                   │ PRM brosur)   │ (PRMQ)        │ domain (PRMV)    │
                                   └──────┬────────┴──────┬────────┴────────┬─────────┘
                                          └───── RRF berbobot (PRMH) ───────┘
                                                        │
                                   Tingkat bukti dari TEKS SUMBER (bukan skor):
                                   Dalil utama · Referensi pendukung · Terkait
                                                        │
                                   (opsional, mati) Gemini via Supabase Edge Function:
                                   istilah tambahan + urut ulang kandidat "utama"
```

- **Kata persis** dan **makna/tema Al-Qur'an** = mesin V3.1 apa adanya.
- **Makna lokal** = model vektor kata yang **dilatih dari teks database V3.1 sendiri** (11 juta kata Indonesia + pasangan Arab–terjemahan). Kueri diubah menjadi vektor dengan rumus yang sama dengan dokumen; dibandingkan dengan 130.415 potongan teks.
- **RRF** (Reciprocal Rank Fusion, k = 60). Bobot awal (bisa diubah lewat `PRM_CONFIG.hybrid`):

| Mode | Al-Qur'an | Hadis / tafsir / materi / brosur |
|---|---|---|
| Campuran (bawaan) | makna/tema 1,5 · makna lokal 1 · kata 0,5 | makna lokal 1 · kata 1 |
| Makna | makna/tema 1,5 · makna lokal 1,5 · kata 0,2 | makna lokal 1,5 · kata 0,4 |
| Literal | hanya kata (sama dengan V3.1) | hanya kata |

- **Tingkat bukti** (tidak pernah dari skor kemiripan saja):
  - **Dalil utama** — Al-Qur'an: utama menurut mesin makna V3.1 *dan* didukung tema/judul kelompok, terjemahan ayat, atau mesin lain. Hadis/tafsir/materi/brosur: **setiap kata kunci inti (atau sinonim kamusnya) tertulis** di judul bab/matan/paragraf, dan kata kunci itu pokok bahasan (ada di judul bab, atau peringkat makna ≤ 30, atau ≥ 2 kemunculan).
  - **Referensi pendukung** — hanya sebagian kata kunci tertulis.
  - **Terkait (belum cukup kuat)** — hanya mirip makna / istilah terkait; disembunyikan dalam lipatan.
  - Ayat yang "utama" menurut V3.1 tetapi buktinya **hanya** di tafsir dan tidak didukung mesin lain diturunkan menjadi pendukung (contoh: QS 38:8 untuk "menghormati orang tua").
- Tampilan kartu: tingkat bukti, **Kecocokan tinggi/sedang/rendah** (bukan persen; keterangan: *bukan tingkat kebenaran atau derajat dalil*), jenis kecocokan (Makna · Tema · Frasa · Kata), kutipan asli, teks Arab, sumber & lokasi, alasan ditemukan, tombol Buka detail / Salin kutipan / Salin referensi.

## 2. Model yang digunakan dan alasannya

**Dipakai: `w2v-mta-id128-v1`** — vektor kata skip-gram 128 dimensi, dilatih dari teks database V3.1 (Al-Qur'an terjemahan, Tafsir Jalalain & Ibnu Katsir, 10 kitab hadis, materi Gurda, 1.354 brosur CHM, brosur PDF bawaan). Dokumen = rata-rata berbobot SIF → buang komponen utama → PCA 64 → int8. Ditambah tabel padanan **Arab → Indonesia** dari model dwibahasa (pasangan teks Arab dan terjemahannya).

Kandidat yang diuji pada data nyata (9 kueri Al-Qur'an dengan ayat rujukan; ayat rujukan di 10 teratas):

| Kandidat | Ukuran unduh | Hasil | Keterangan |
|---|---|---|---|
| **BGE-M3** (kandidat utama di permintaan) | ±570 MB (int8) / ±2,2 GB (fp32) | **tidak bisa diuji di sini** | Unduhan dari Hugging Face diblokir di lingkungan kerja. Dari ukurannya saja tidak layak di HP (RAM > 1 GB, unduhan ratusan MB). |
| multilingual-e5-small (int8 ONNX, Transformers.js/ONNX Runtime) | ±135 MB model + ±50 MB vektor + ±11 MB wasm | **9–10/90** | Diperoleh dari paket npm (checksum dicatat). Lemah untuk terjemahan ayat; lumayan untuk hadis (karena judul bab). |
| **Vektor kata domain (dipakai)** | ±9 MB (gzip) indeks + 80 KB/kata | **23/90** sendiri · **43/90** digabung (FINAL dengan kamus baru: 52/90) | Kecil, cepat (0,1–0,2 dtk di HP), bisa offline & dibuka langsung, alasan bisa dijelaskan. |
| Mesin makna V3.1 (pembanding) | sudah ada | 37/90 | Tetap dipakai dalam penggabungan. |
| BM25 V3.1 (pembanding) | sudah ada | 15/90 | Tetap dipakai dalam penggabungan. |

Uji hadis (penilaian manual 10 teratas, 7 kitab): vektor kata domain 10/10 (amanah), 10/10 (sabar–musibah); e5-small 6–7/10 dan 4–5/10. e5-small lebih baik untuk "hak suami-istri" (8–9/10 vs 4/10) — kekurangan ini ditutup oleh penggabungan dengan pencarian kata (BM25 6–7/10).

Kesimpulan: model besar tidak layak di HP dan model kecil populer kalah oleh model yang dilatih dari database sendiri. Lisensi: model domain dibuat dari database aplikasi sendiri (tanpa bobot pihak ketiga). Lisensi e5-small (MIT) dicatat, tetapi **tidak dikirim**.

## 3. Ukuran model dan indeks

| Bagian | Ukuran | gzip (transfer) |
|---|---|---|
| `data/kitab/vektor/d/` — 11 pecahan vektor dokumen (130.415 potongan × 64 int8) | 13,9 MB | 9,0 MB |
| `data/kitab/vektor/k/` — 64 pecahan kamus vektor kata (28.056 kata × 128 int8 + kata terdekat) | 8,2 MB | ±81 KB per pecahan |
| `data/kitab/vektor/a/` — 64 pecahan padanan Arab → Indonesia (67.160 kata Arab) | 5,8 MB | ±35 KB per pecahan |
| `meta.js` (versi, parameter, checksum) | 89 KB | — |
| Modul JS baru (`semantik.js`, `hybrid.js`, `gemini.js`) | 40 KB | — |
| **Total tambahan di repository** | **±28 MB** (aplikasi 390 → 417 MB) | |

Pecahan dokumen: quran 0,67 MB · indeks tema 0,01 · Jalalain 0,67 · Ibnu Katsir 2,3 · hadis (9 kitab) 1,9 · Kitab 9 Imam 3 × 2,2 · Gurda 0,03 · CHM 1,6 · PDF 0,01.

## 4. Ukuran unduhan awal

- **Membuka aplikasi: tidak ada tambahan** — indeks makna tidak dimuat sampai ada pencarian kalimat.
- Pencarian kalimat pertama di sumber **Semua**: ±9 MB (gzip), sekali saja; disimpan cache browser dan diperbarui otomatis bila versi indeks berubah (`?v=<versi>`).
- Hanya **Al-Qur'an**: ±1 MB · hanya **Hadis**: ±5 MB · hanya **Arsip CHM**: ±1 MB.
- Tombol *Pengaturan lanjutan → Muat semua indeks makna sekarang* untuk memuat dulu saat ada Wi-Fi.
- Selama memuat, hasil kata persis V3.1 sudah tampil; hasil gabungan menyusul.

## 5. Kecepatan pencarian (diukur)

| Keadaan | Hasil |
|---|---|
| Laptop, pencarian pertama (termasuk memuat semua indeks, lokal) | 2,1 dtk |
| Laptop, pencarian berikutnya | ±1 dtk sampai hasil gabungan tampil |
| Emulasi HP (Pixel 7, CPU diperlambat 4×): muat & dekode semua indeks | 1,5 dtk (+ waktu unduh) |
| Emulasi HP: tahap makna lokal per kueri | 0,1–0,2 dtk |
| Emulasi HP: penggabungan 4 kategori | 0,3–0,6 dtk |
| Emulasi HP: kueri ke-2 sampai hasil gabungan tampil (termasuk mesin V3.1) | ±4 dtk |
| Dibuka langsung (file://), tanpa internet | 1,1 dtk |

Mesin V3.1 (BM25 0,3–0,8 dtk, makna 0,2–0,6 dtk di emulasi HP) tetap bagian terbesar. Belum diuji di HP fisik.

## 6. Konsumsi RAM

- Indeks makna lengkap di memori: **+10–20 MB** (diukur di Chrome; pemuatan memakai fetch agar teks besar tidak tertahan).
- Setelah 3 pencarian: heap JS **147 MB (V3.2)** vs **122 MB (V3.1)**.

## 7. Akurasi hasil pengujian

Rincian di `LAPORAN_PENGUJIAN_v3.2.md`. Ringkas (dicek manual terhadap teks database):

Kriteria: **Tepat penuh** = semua hasil yang dinilai sesuai · **Baik** = dalil utama benar, ada yang sebagian, tidak ada salah konteks di tingkat *Dalil utama* · **Sebagian** = ada salah konteks di tingkat *Dalil utama* atau dalil pokok tidak muncul.

| No | Uji wajib | Hasil FINAL | Nilai |
|---|---|---|---|
| 1 | QS Al-Jatsiyah ayat 18 | QS 45:18 teratas + Tafsir Jalalain + Ibnu Katsir | Tepat penuh |
| 2 | Ayat mengikuti syariat Allah | 6 sesuai (5:48, 4:26, 45:18, 5:104, 3:95, 7:157), 2 sebagian (3:20, 57:27) | Baik |
| 3 | Ayat larangan mengikuti hawa nafsu | 8/8 sesuai | Tepat penuh |
| 4 | Ayat sabar menghadapi ujian | 7 sesuai, 1 sebagian (33:11) | Baik |
| 5 | Ayat berbakti kepada orang tua | 6 sesuai, 2 sebagian (17:25, 18:81) | Baik |
| 6 | Hadis amanah | 8/8 sesuai | Tepat penuh |
| 7 | Hadis sabar menghadapi musibah | 8/8 sesuai | Tepat penuh |
| 8 | Dalil kewajiban suami istri | Al-Qur'an 7 sesuai + 1 sebagian (2:240); hadis 8/8 tentang hak suami/istri; hadis talak tidak lagi di 8 teratas | Baik |
| 9 | Dalil kejujuran berdagang | QS 6:152, 2:282 utama; hadis pedagang jujur, takaran & timbangan 6 sesuai + 1 sebagian (Ibnu Majah 2130); Bukhari 2723 tidak lagi utama | Baik |
| 10 | Frasa Arab persis | 45:18 (100% huruf); *innamal a'malu binniyat* → Bukhari 1 dkk. | Tepat penuh |
| 11 | Transliterasi Latin | 45:18; bismillahirrahmanirrahim → 1:1, 27:30 | Tepat penuh |
| 12 | Nomor ayat & hadis | QS 45:18; Tirmidzi 2179; Bukhari 52 (jalur V3.1) | Tepat penuh |

**7 Tepat penuh + 5 Baik + 0 Sebagian.** (Versi awal dengan kriteria yang sama: 7 + 3 + 2 — angka "10 penuh, 2 sebagian" di laporan awal tidak konsisten dan sudah dikoreksi.)

Tidak ada klaim 100% akurat. Kelemahan yang tersisa: istilah di luar kamus yang jarang di database hanya terbantu sebagian oleh vektor kata; frasa bermakna ganda (mis. "menghormati orang tua" = ibu-bapak *atau* orang yang lebih tua) menampilkan kedua makna.

## 8. Daftar file yang berubah

**Diubah:** `index.html` (gaya, pengaturan lanjutan, filter lipat di HP, logika gabungan, kartu ringkas, teks Arab utuh — FINAL), `README.md`, `data/kamus_support.js` (FINAL: +2 entri, sinonim frasa; semua entri lama tetap).
**Baru:** `data/lib/semantik.js`, `data/lib/hybrid.js`, `data/lib/gemini.js`, `data/kitab/vektor/` (140 file), `supabase/functions/pustaka-gemini/index.ts`, `tools/semantik/` (10 file), `tools/validate_hybrid.js`, `LAPORAN/` (6 laporan/panduan + lampiran + `hasil_validasi/`).
**Tidak diubah (checksum sama dengan V3.1):** semua data Al-Qur'an/tafsir/hadis/indeks makna (`data/kitab/{r,p,d,toc,qimg,makna}`, `meta.js`, `translit.js`), arsip CHM (`data/chm_*.js`), `pdf_seed.js`, `data/pdf/`, `config.js`, `supabase/setup.sql`, `kitab.js`, `makna.js`, `support.js`, `supabase.js`, PDF.js, ikon, manifest. Skema Supabase dan URL aplikasi tidak berubah.

## 9. Risiko dan keterbatasan

1. **Kemiripan makna = kemiripan pemakaian kata di database**, bukan pemahaman agama. Karena itu tidak pernah sendirian menjadikan sesuatu "Dalil utama".
2. Kueri dengan istilah di luar kamus dan jarang di database hanya terbantu sebagian. Perbaikan termurah: tambah entri kamus lewat tombol **Kamus kata kunci** (contoh yang sudah dilakukan di FINAL: *menepati janji*, *kewajiban suami istri*).
3. Brosur online (Supabase) yang diunggah setelah build dan paragraf Arab murni **belum terindeks makna** — tetap dicari kata persis. Brosur baru akan ikut setelah indeks dibangun ulang (`tools/semantik`, lihat panduan).
4. Pengujian HP memakai emulasi Chrome (Pixel 7, CPU 4× lebih lambat) — belum di HP fisik. Mohon uji di 1–2 HP tim.
5. Pencarian pertama di "Semua" mengunduh ±9 MB. Di data seluler yang lambat bisa 5–15 detik (hasil kata persis tetap langsung tampil).
6. Mode Support Ustadz **sengaja tidak diubah** (17/17 uji tetap lulus).
7. Pelatihan vektor kata memakai 2 thread → bila dilatih ulang, angka bisa sedikit berbeda; model hasil pelatihan disertakan di paket lengkap agar indeks bisa dibangun ulang persis.
8. Gemini (bila kelak diaktifkan): kuota gratis terbatas dan isi permintaan di tier gratis dapat dipakai Google untuk pengembangan produk. Default tetap mati.

## 10. Cara update GitHub Pages

Lihat `PANDUAN_UPDATE_GITHUB_PAGES_v3.2.md`. Ringkas: salin isi `APLIKASI_v3.2_FINAL_saja.zip` ke folder repository (timpa), pastikan folder `data/kitab/vektor/` ikut ter-commit (140 file), commit & push, tunggu 1–3 menit, buka website dengan Ctrl+F5, lalu jalankan daftar cek 10 langkah di panduan. Rollback: kembalikan commit sebelumnya (tidak ada data yang dihapus).
