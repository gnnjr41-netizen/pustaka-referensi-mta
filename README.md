# Pustaka Referensi MTA

Satu mesin pencarian untuk arsip **Brosur Ahad Pagi MTA**, **Al-Qur'an**, **tafsir**, dan **kitab hadis**:

- Arsip CHM `Brosur_Ahad_Pagi_1995-2023_FIX.chm`: 1.354 brosur (1995–2023)
- Brosur PDF Ahad Pagi (folder `data/pdf`)
- Al-Qur'an Digital 2.1 (6.236 ayat + indeks tema), Tafsir Jalalain, Tafsir Ibnu Katsir
- Bulughul Maram, Riyadhus Shalihin, Kitab 9 Imam (62.198 hadis), Shahih Bukhari, Shahih Muslim (Mukhtashar), Shahih Sunan Abu Dawud / Ibnu Majah / Tirmidzi (Al-Albani), Sunan An-Nasa'i, Sunan Ad-Darimi — **materi Pelatihan Gurda 2142** — total 110.013 record (folder `data/kitab`)

Semua sumber dicari dari satu kolom pencarian. Setiap hasil menunjuk ke sumber aslinya: bab/subbab CHM, atau file dan halaman PDF.

## Cara membuka
- **Website:** `https://USERNAME.github.io/pustaka-referensi-mta/`
- **Tanpa internet:** dobel-klik `index.html` di folder ini.

## Isi folder
| File / folder | Isi |
|---|---|
| `index.html` | Aplikasi |
| `data/chm_docs.js` | Daftar 1.354 brosur CHM (judul, tanggal, nomor, bab/subbab) |
| `data/chm_1995.js` … `data/chm_2023.js` | Teks brosur CHM per tahun |
| `data/pdf_seed.js` | Indeks teks brosur PDF (per halaman) + nama file PDF-nya |
| `data/pdf/` | File PDF asli |
| `data/lib/` | PDF.js 3.11.174 (membaca dan menampilkan PDF) |
| `manifest.webmanifest`, `icons/` | Ikon saat ditambahkan ke layar utama HP |
| `data/kitab/` | Indeks bertahap Al-Qur'an, tafsir & hadis (kamus `d/`, posting `p/`, record `r/`, daftar isi `toc/`, gambar ayat `qimg/`). Dibangun oleh `tools/build_index.js` — jangan diedit manual |
| `data/lib/kitab.js` | Mesin pencarian kitab (memuat indeks per bagian) |
| `data/lib/support.js` | Mesin Mode Support Ustadz (tanpa AI) |
| `data/lib/makna.js`, `data/kitab/makna/` | Pencarian makna Al-Qur'an (tanpa AI): indeks statis dari terjemahan, catatan kaki, Tafsir Jalalain, Tafsir Ibnu Katsir, judul kelompok ayat & indeks tema. Dibangun oleh `tools/build_makna.js` |
| `data/kamus_support.js` | Kamus kata kunci Mode Support: kata pengantar, ejaan, sinonim, istilah terkait. Bisa diedit lewat tombol **Kamus kata kunci** lalu diunduh dan ditimpa di sini |
| `tools/` | Skrip ekstraksi CHM, build indeks, dan uji (`validate_search.js`) |
| `.nojekyll` | Supaya GitHub Pages menampilkan file apa adanya |
| `config.js`, `supabase/` | Sambungan ke server online (lihat di bawah) |

## Menambah brosur PDF baru (mingguan)
### Jika server online (Supabase) sudah tersambung — cara utama
1. Buka website → tombol **Brosur PDF** → **Masuk** dengan email dan password admin.
2. Pilih satu atau beberapa file PDF. Setiap file otomatis melewati tahap: *Sedang membaca PDF → Sedang mengunggah → Sedang mengindeks → Berhasil*.
3. Selesai. Brosur langsung bisa dicari dan dibuka dari semua HP dan komputer. Tidak perlu GitHub Desktop.

Jika muncul **Gagal**, baca pesannya lalu tekan **Coba lagi**. File yang persis sama ditolak otomatis (deteksi sidik file SHA-256), dan brosur lama tidak pernah dihapus saat mengunggah brosur baru.

### Jika server belum tersambung — cara cadangan
Brosur yang ditambahkan hanya tersimpan di browser perangkat itu. Untuk menerbitkannya: klik **Unduh pdf_seed.js baru**, salin PDF ke `data/pdf`, timpa `data/pdf_seed.js`, lalu Commit dan Push.

## Server online (Supabase)
| File | Fungsi |
|---|---|
| `config.js` | Alamat server dan kunci **publik** (anon/publishable). Dibuat lewat menu Brosur PDF → Uji & sambungkan → Unduh config.js |
| `supabase/setup.sql` | Membuat tabel, tempat file, dan aturan keamanan. Dijalankan sekali di Supabase SQL Editor |
| `data/lib/supabase.js` | Pustaka penghubung ke Supabase (versi 2.117.1) |

- Pengunjung: mencari dan membaca tanpa login. Admin: login, unggah, ubah data, hapus, lihat riwayat dan pemakaian penyimpanan.
- Paket gratis Supabase: 1 GB file, 500 MB database, 5 GB transfer per bulan. Tidak ada tagihan otomatis.
- Proyek gratis bisa berhenti sementara jika tidak dipakai sekitar satu minggu. Aktifkan lagi dari dashboard Supabase. Selama berhenti, arsip CHM dan brosur bawaan tetap bisa dicari, dan brosur online memakai salinan terakhir di perangkat.
- **Jangan pernah** menaruh kunci `service_role` / `secret` di `config.js`.

## Catatan
- Mode Support Ustadz dan seluruh pencarian berjalan tanpa AI, sama persis di website, di komputer, dan di Claude.
- Pencarian tetap berjalan langsung di perangkat (tanpa AI). Brosur online ikut masuk indeks yang sama dengan arsip CHM.
- Tulisan Arab dari PDF bisa tidak rapi di tampilan teks. Gunakan tombol **PDF asli** untuk melihat halaman aslinya.
- Website GitHub Pages bisa dibuka siapa saja yang mengetahui alamatnya.

## Al-Qur'an, tafsir & kitab hadis
- Dicari dari kolom yang sama. Filter Sumber: Al-Qur'an / Hadis / Tafsir / **Kitab tertentu…** (per file atau per imam).
- Contoh: `QS 2:183`, `bismillahirrahmanirrahim` (ayat dengan huruf Latin), `Bukhari 52`, `انما الاعمال بالنيات` (dengan/tanpa harakat), `Shahih Muslim sabar`, `kitab puasa`.
- Indeks tidak dimuat sekaligus: hanya bagian yang diperlukan kueri yang diunduh, lalu disimpan di cache.
- Teks Arab ayat di Al-Qur'an Digital 2.1 berupa gambar asli; teks Arab untuk pencarian ayat diambil dari Tafsir Ibnu Katsir (diberi label).
- Derajat hadis hanya ditampilkan bila tertulis di sumber. "Matan serupa" = kemiripan teks otomatis, bukan takhrij.
- Dokumentasi lengkap: folder `LAPORAN/` di paket ZIP (audit, ekstraksi, validasi, struktur database, panduan).

## Mode Support Ustadz (penyusunan bahan kajian tanpa AI)
- Tulis permintaan biasa, mis. *"Carikan materi tentang tayamum"* → **Susun bahan kajian**. Kata pengantar dibuang otomatis dan kata kunci diperluas dengan kamus sinonim/ejaan.
- Hasilnya paket **A Identitas · B Kerangka · C Al-Qur'an · D Hadis · E Tafsir · F Materi/CHM/PDF · G Urutan penyampaian**. Paket **hanya berisi kutipan dari sumber yang ditemukan**, masing-masing dengan lokasi sumber dan tombol buka sumber asli.
- **Utama** = memuat semua kata kunci inti. **Pendukung** = sebagian kata atau istilah terkait. Jumlah hasil bukan verifikasi relevansi; periksa sumber aslinya.
- Tombol yang tersedia: Salin semua, Salin bagian terpilih, Cetak, Kembali ke pencarian.
- Kamus dikelola admin lewat **Kamus kata kunci** (tambah/ubah/hapus, uji, unduh `kamus_support.js` → commit).
- Uji otomatis: `node tools/validate_support.js .`

## Pencarian makna Al-Qur'an (v3.1, tanpa AI)
- Tulis maksudnya, mis. *"ayat tentang berbuat baik kepada kedua orang tua"*. Bagian **Al-Qur'an · berdasarkan makna** menampilkan ayat yang kandungannya didukung terjemahan, Tafsir Jalalain, judul kelompok ayat, atau indeks tema, walau susunan katanya berbeda (*ibu bapak*, *ibu-bapa*).
- Label: Kecocokan makna/tema · Kecocokan terjemahan/tafsir · Kecocokan sinonim · Kecocokan kata literal. **Utama** = setiap kata kunci inti didukung sumber ayat itu. **Pendukung** = sebagian / istilah terkait / hanya Ibnu Katsir kelompok ayat.
- Setiap kartu memuat alasan ditemukan dan sumbernya. Hasil pencocokan, bukan penafsiran.
- Sinonim & istilah terkait memakai kamus yang sama dengan Mode Support (tombol **Kamus kata kunci**).
- Membangun ulang indeks: `node tools/build_makna.js <folder-db> .` · Uji: `node tools/validate_makna.js .`
