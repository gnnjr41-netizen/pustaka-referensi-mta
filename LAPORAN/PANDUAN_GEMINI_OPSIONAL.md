# Bantuan Gemini (opsional) — belum aktif

Aplikasi v3.2 **berjalan penuh tanpa Gemini**. Bagian ini hanya untuk bila admin kelak ingin mencoba bantuan Gemini. Mengaktifkannya mengubah konfigurasi Supabase dan `config.js` produksi — **perlu persetujuan dulu**.

## Apa yang dilakukan Gemini (dan yang tidak)
| Boleh | Tidak boleh |
|---|---|
| Mengusulkan ≤ 8 istilah pencarian tambahan → dicari ulang **secara lokal** | Menulis ayat, hadis, terjemahan, tafsir, nomor, derajat hadis |
| Mengurutkan ulang ≤ 12 kandidat **Dalil utama** yang sudah ditemukan | Menambah hasil baru / mengubah tingkat bukti |
| | Menerima seluruh database (yang dikirim hanya kalimat pencarian + cuplikan ≤ 280 karakter) |

Jawaban yang memuat ID di luar kandidat atau istilah berisi karakter aneh ditolak. Gagal, kuota habis, atau lebih dari 6 detik → dilewati 5 menit dan pencarian lokal langsung dipakai (sudah diuji dengan server tiruan: mati, berhasil, gagal kuota, jawaban tidak sah, lambat).

## Keamanan
- API Key **hanya** disimpan sebagai secret Supabase (`GEMINI_API_KEY`). Tidak ada di HTML/JS/GitHub, dan pengguna tidak diminta kunci pribadi.
- Fungsi membatasi origin (bawaan `https://gnnjr41-netizen.github.io`), 6 permintaan/menit per IP, dan batas harian (`DAILY_LIMIT`, bawaan 300).
- Pengguna harus mencentang persetujuan di **Pengaturan lanjutan** sebelum ada data yang dikirim.

## Biaya & ketentuan (perlu dicek ulang saat aktivasi)
- Tier gratis Gemini API memiliki batas permintaan per menit/hari yang berbeda per model dan dapat berubah — **tidak ada jaminan gratis tanpa batas**.
- Pada tier gratis, Google dapat memakai isi permintaan & jawaban untuk mengembangkan produknya (dan peninjau manusia dapat membacanya). Jangan aktifkan bila ini tidak dapat diterima.
- Supabase Edge Functions pada paket gratis memiliki kuota pemanggilan bulanan.

## Langkah aktivasi (setelah disetujui)
1. Supabase Dashboard → **Edge Functions** → buat fungsi `pustaka-gemini`, isi dengan `supabase/functions/pustaka-gemini/index.ts`, Deploy.
   (atau Supabase CLI: `supabase functions deploy pustaka-gemini`)
2. **Project Settings → Edge Functions → Secrets**: tambah `GEMINI_API_KEY`; opsional `GEMINI_MODEL` (sesuaikan dengan model yang tersedia), `ALLOWED_ORIGIN`, `DAILY_LIMIT`.
3. Edit `config.js`, tambahkan satu baris di dalam `window.PRM_CONFIG`:
   ```js
   gemini: { url: "https://htxjbmtzarzrosymbtww.supabase.co/functions/v1/pustaka-gemini" }
   ```
4. Commit & push. Di website: **Pengaturan lanjutan → Izinkan bantuan Gemini**.
5. Uji: cari `hadis tentang sabar menghadapi musibah` → di baris kata kunci muncul "istilah tambahan dari Gemini", dan sebagian kartu berlabel "urutan dibantu Gemini".

Menonaktifkan: hapus baris `gemini` di `config.js` (atau hapus secret). Aplikasi kembali ke lokal penuh.
