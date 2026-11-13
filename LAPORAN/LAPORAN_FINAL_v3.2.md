# Pustaka Referensi MTA v3.2 FINAL — Laporan penyempurnaan final
**13 November 2026** · Status: **paket final siap diuji tim; belum diunggah ke GitHub (menunggu persetujuan)** · Gemini: **tidak aktif**

## 1. Apa yang diperbaiki
| Masalah | Perbaikan | Hasil |
|---|---|---|
| "menunaikan janji" menemukan "menunaikan zakat" (QS 9:71, 19:55) | Entri kamus baru **menepati janji** (menunaikan/memenuhi janji, penuhilah janji, perjanjian, aqad, ikrar) | Al-Qur'an 48:10, 2:177, 13:20, 3:76, 9:4, 17:34; hadis Bukhari 2484/2487 "menepati janji", Tirmidzi 1511/1940 "Menunaikan janji". Zakat hilang dari dalil utama |
| "menghormati orang tua" tidak sampai ke ayat berbakti | Sinonim frasa di entri *birrul walidain*: menghormati / berbuat baik kepada (kedua) orang tua / ibu bapak | Hasil = hasil "berbakti": 19:14, 4:36, 46:15, 31:14, 2:83, 29:8, 17:23 |
| "kewajiban suami istri" didominasi ayat & hadis talak | Entri kamus baru **kewajiban suami istri** (hak/kewajiban suami & istri, nafkah, pergaulilah secara patut, pemimpin bagi kaum wanita, taat/melayani suami) + aturan bukti: kata kunci harus berdekatan dalam satu bagian teks (`hybrid.js`) | 2:228, 4:34, 4:128, 2:233, 4:19, 65:6, 65:7; hadis hak suami/istri 8/8. Talak tidak lagi di 8 teratas |
| "kejujuran berdagang" menjadikan Bukhari 2723 (kisah dakwah) dalil utama | Sinonim frasa *perdagangan*: pedagang, penjual & pembeli, takaran & timbangan, menimbang dengan adil + aturan kedekatan yang sama | Ibnu Majah "pedagang jujur", Muslim "Kejujuran dan Kejelasan dalam Jual Beli", Ibnu Majah 2213 "Jujur dalam timbangan", Nasa'i 4381. Bukhari 2723 turun dari dalil utama |
| Teks Arab di kartu HP dipotong | Ayat tampil **utuh**; teks Arab hadis yang panjang (> 400 karakter, biasanya sanad + matan) dilipat ("Teks Arab lengkap — ketuk untuk membuka"), isinya utuh; huruf 19 px, tidak meluber | — |
| Kartu brosur CHM bisa galat bila teks tahun itu belum termuat | Kartu menampilkan "teks brosur masih dimuat…" | 0 galat JavaScript |
| Angka laporan pengujian tidak konsisten ("10 penuh, 2 sebagian" padahal no. 5 dan no. 9 dinilai dengan ukuran berbeda) | Satu kriteria untuk semua nomor (lihat §3) | Dikoreksi di `LAPORAN_PENGUJIAN_v3.2.md` dan `LAPORAN_AKHIR_v3.2.md` |

Tidak ada hasil yang dipaksakan: kata tunggal yang bermakna ganda (mis. "timbangan" juga = timbangan amal; "hormat kepada orang tua" juga = kepada orang yang lebih tua) **tidak** dijadikan sinonim.

## 2. File yang berubah
**Dibanding v3.2 awal:** `index.html` (teks Arab utuh, pengaman kartu CHM), `data/lib/hybrid.js` (aturan kedekatan kata kunci untuk *Dalil utama*), `data/kamus_support.js` (versi `2026-11-13-final`: +2 entri → 48 entri, sinonim frasa; **semua entri lama tetap**), `README.md`, laporan di `LAPORAN/`.
**Dibanding V3.1:** hanya 3 file V3.1 yang berubah — `index.html`, `README.md`, `data/kamus_support.js` (dicek dengan checksum 17.374 file V3.1). Tidak ada file V3.1 yang dihapus. Database, indeks V3.1, `config.js`, mesin `kitab.js`/`makna.js`/`support.js`, skema Supabase dan URL **tidak berubah**. Indeks makna (`data/kitab/vektor/`, 140 file) sama dengan v3.2 awal.

## 3. Hasil pemeriksaan final (satu kali jalan)
| Pemeriksaan | Hasil |
|---|---|
| Regresi V3.1: kata persis / Mode Support Ustadz / makna Al-Qur'an | **36/36 · 17/17 · 13/13** |
| Uji v3.2 `validate_hybrid` (checksum 139 file indeks + aturan bukti) | **14/14** |
| 12 uji wajib (dicek manual ke teks sumber) | **7 Tepat penuh + 5 Baik + 0 Sebagian**; salah konteks di *Dalil utama*: **0** |
| Set 9 kueri Al-Qur'an (ayat rujukan di 10 teratas) | V3.1 37/90 → v3.2 awal 43/90 → **FINAL 52/90** |
| Mode Literal vs V3.1 (40 halaman hasil) | 38 identik; 2 hanya +1 ayat di bagian *berdasarkan makna* (kamus baru) |
| HP 412 px | tanpa geser horizontal; filter terlipat 101 px; hasil kata persis tampil **tanpa menunggu** indeks makna; tombol Buka detail / Tafsir / Salin kutipan / Salin referensi berfungsi |
| Desktop 1280 px, tablet 768 px, `file://` tanpa internet | tanpa galat |
| Permintaan ke Gemini | **0** |
| Paket ZIP | diuji `unzip -t`, 140 file indeks makna ada, diekstrak ulang dan dibuka langsung → berjalan |

Kriteria nilai: **Tepat penuh** = semua hasil yang dinilai sesuai · **Baik** = dalil utama benar, ada yang hanya berkaitan, tanpa salah konteks di *Dalil utama* · **Sebagian** = ada salah konteks di *Dalil utama* atau dalil pokok tidak muncul. Rincian: `LAPORAN_PENGUJIAN_v3.2.md`.

## 4. Fitur V3.1 yang dipertahankan
Pencarian kata persis BM25, nomor ayat/hadis, teks Arab (berharakat/tanpa), transliterasi, frasa "…", operator `-kata`, filter sumber & kitab, Mode Support Ustadz, kamus kata kunci (tombol **Kamus kata kunci**), arsip CHM, brosur PDF & Supabase, tafsir, salin kutipan/referensi, tampilan & ikon, offline `file://`. Mode **Literal** = mesin V3.1.

## 5. Keterbatasan
1. Kemiripan makna ≠ dalil. Label *Dalil utama* hanya bila kata kunci (atau sinonim kamus) tertulis di sumber; tetap periksa sumber asli. Tidak ada klaim 100% akurat.
2. "menghormati orang tua" juga berarti menghormati orang yang lebih tua → 3 hadis teratas tentang menghormati yang tua, lalu bab berbakti. Untuk ibu-bapak gunakan kata "berbakti".
3. "kejujuran berdagang": dalil utama Al-Qur'an hanya 2 ayat; sebagian ayat pendukung adalah ayat perniagaan umum.
4. Belum diuji di HP fisik (baru emulasi Chrome Android). Pencarian kalimat pertama mengunduh ±9 MB sekali.
5. Brosur online Supabase yang ditambah setelah build belum terindeks makna (tetap ditemukan lewat kata persis).
6. Gemini tidak aktif; mengaktifkannya butuh persetujuan dan konfigurasi Supabase (lihat `PANDUAN_GEMINI_OPSIONAL.md`).

## 6. Pemasangan & rollback
**Pasang** (setelah disetujui): ekstrak `APLIKASI_v3.2_FINAL_saja.zip` → salin isi folder `pustaka-referensi-mta` ke folder repository (timpa) → pastikan `data/kitab/vektor/` ikut (140 file) → commit `v3.2 FINAL` → push → tunggu 1–3 menit → Ctrl+F5. Daftar cek 10 langkah: `PANDUAN_UPDATE_GITHUB_PAGES_v3.2.md` bagian C.
**Uji tanpa GitHub:** ekstrak ZIP, klik dua kali `index.html`.
**Rollback ke V3.1:** GitHub Desktop → History → klik kanan commit v3.2 → *Revert changes in commit* → push. Atau timpa dengan `APLIKASI_v3_1_saja.zip` asli dan hapus file baru v3.2 (daftar di panduan bagian D). Tidak ada data yang hilang karena file data V3.1 tidak diubah.
**Integritas:** cocokkan ZIP dengan `SHA256SUMS.txt`.
