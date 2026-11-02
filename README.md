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

## Menambah brosur PDF baru (mingguan)
Brosur yang ditambahkan lewat tombol **Brosur PDF** di website **hanya tersimpan di browser perangkat itu**. Supaya muncul untuk semua orang:

1. Di website, klik **Brosur PDF** → pilih file PDF → periksa judul/tanggal/nomor → **Simpan ke pustaka**.
2. Di bagian bawah jendela yang sama, klik **Unduh pdf_seed.js baru**.
3. Salin file PDF brosur ke folder `data/pdf` repository. **Nama file harus sama persis** dengan nama saat diunggah.
4. Salin `pdf_seed.js` hasil unduhan ke folder `data` repository, timpa file lama.
5. Buka GitHub Desktop → tulis ringkasan (misalnya `Brosur 8 Nov 2026`) → **Commit to main** → **Push origin**.
6. Tunggu 1–3 menit. Brosur baru muncul di semua HP dan komputer setelah halaman dimuat ulang.

Arsip CHM dan brosur lama tidak tersentuh, karena yang berubah hanya `pdf_seed.js` dan PDF yang ditambahkan.

## Catatan
- Ringkasan AI hanya tersedia di versi Claude, tidak di website ini.
- Tulisan Arab dari PDF bisa tidak rapi di tampilan teks. Gunakan tombol **PDF asli** untuk melihat halaman aslinya.
- Website GitHub Pages bisa dibuka siapa saja yang mengetahui alamatnya.
