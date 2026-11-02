# Pustaka Referensi MTA

Satu mesin pencarian untuk arsip **Brosur Ahad Pagi MTA**:

- Arsip CHM `Brosur_Ahad_Pagi_1995-2023_FIX.chm`: 1.354 brosur (1995–2023)
- Brosur PDF Ahad Pagi (folder `data/pdf`)

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
- Ringkasan AI hanya tersedia di versi Claude, tidak di website ini.
- Pencarian tetap berjalan langsung di perangkat (tanpa AI). Brosur online ikut masuk indeks yang sama dengan arsip CHM.
- Tulisan Arab dari PDF bisa tidak rapi di tampilan teks. Gunakan tombol **PDF asli** untuk melihat halaman aslinya.
- Website GitHub Pages bisa dibuka siapa saja yang mengetahui alamatnya.
