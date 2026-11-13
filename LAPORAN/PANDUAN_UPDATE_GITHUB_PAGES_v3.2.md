# Panduan update GitHub Pages ke v3.2 FINAL

Repository: `gnnjr41-netizen/pustaka-referensi-mta` · Website: `https://gnnjr41-netizen.github.io/pustaka-referensi-mta/`

> Lakukan hanya setelah hasil v3.2 disetujui. Tidak ada data yang dihapus; semua file lama tetap ada.

## A. Sebelum update
1. Pastikan repository di komputer sudah versi terbaru (GitHub Desktop → **Fetch origin** → **Pull**).
2. Catat commit terakhir (untuk rollback): GitHub Desktop → tab **History** → baris paling atas.

## B. Update (GitHub Desktop)
1. Ekstrak `APLIKASI_v3.2_FINAL_saja.zip` (cek dulu SHA-256 dengan `SHA256SUMS.txt` bila perlu).
2. Salin **isi** folder `pustaka-referensi-mta` hasil ekstrak ke folder repository, pilih **Replace / Timpa semua**.
3. Di GitHub Desktop periksa daftar perubahan. Harus ada:
   - diubah: `index.html`, `README.md`, `data/kamus_support.js` (FINAL: +2 entri kamus & sinonim frasa)
   - baru: `data/lib/semantik.js`, `data/lib/hybrid.js`, `data/lib/gemini.js`
   - baru: `data/kitab/vektor/` → **140 file** (`meta.js`, `d/` 11, `k/` 64, `a/` 64)
   - baru: `tools/semantik/…`, `tools/validate_hybrid.js`, `supabase/functions/pustaka-gemini/index.ts`, `LAPORAN/…`
   - **Tidak boleh ada** perubahan di `config.js`, `data/kitab/r|p|d|toc|qimg|makna`, `data/chm_*.js`, `data/lib/kitab.js`, `data/lib/makna.js`, `data/lib/support.js`. Bila ada, batalkan (klik kanan → *Discard changes*) — kemungkinan salah salin.
4. Ringkasan commit: `v3.2 FINAL pencarian gabungan makna + kata` → **Commit to main** → **Push origin**.
   File terbesar ±2,3 MB (aman di bawah batas GitHub 100 MB).
5. Tunggu 1–3 menit (tab **Actions** di GitHub sampai centang hijau).

## C. Cek di website (HP dan laptop) — 10 langkah
1. Buka website, tekan **Ctrl+F5** (laptop) atau tarik-ulang halaman (HP).
2. Header menunjukkan "Indeks siap …".
3. Cari `Ayat tentang berbakti kepada orang tua` → muncul bagian **"Al-Qur'an · gabungan makna & kata"** dengan label **Dalil utama**; QS 17:23, 31:14, 46:15 ada di daftar.
4. Cari `Hadis tentang amanah` → bagian **Hadis** tampil lebih dulu, label Dalil utama, bab tentang amanah.
5. Buka **Filter & pengaturan ▾** (HP) → **Pengaturan lanjutan** → status "11/11 bagian termuat", integritas "SHA-256 cocok".
6. Pilih mode **Literal** → hasil kata persis sama seperti versi lama (bagian *berdasarkan makna* bisa bertambah sedikit karena kamus baru). Kembalikan ke **Campuran**.
7. Cari `QS 45:18` → ayat 45:18 teratas.
8. Cari `bismillahirrahmanirrahim` → QS 1:1 & 27:30.
9. Cari teks Arab `إنما الأعمال بالنيات` dengan sumber **Hadis** → Bukhari No. 1 di daftar.
10. Tab **Mode Support Ustadz** → `Carikan materi tentang tayamum` → paket bahan kajian tersusun seperti biasa.

Bila langkah 3–5 menampilkan "Pencarian makna lokal tidak tersedia", cek bahwa folder `data/kitab/vektor/` benar-benar ter-push (140 file).

## D. Rollback
GitHub Desktop → **History** → klik kanan commit v3.2 → **Revert changes in commit** → Push. Website kembali ke v3.1 dalam 1–3 menit.
Alternatif: ekstrak `APLIKASI_v3_1_saja.zip` asli, timpa ke repository, hapus `data/lib/semantik.js`, `data/lib/hybrid.js`, `data/lib/gemini.js`, folder `data/kitab/vektor/`, `tools/semantik/`, `tools/validate_hybrid.js`, `supabase/functions/`, `LAPORAN/` → commit → push. Tidak ada data database yang hilang (file data V3.1 tidak pernah diubah).

## E. Uji otomatis (opsional, butuh Node.js)
```
node tools/validate_search.js .     # 36 uji V3.1
node tools/validate_support.js .    # 17 uji Mode Support
node tools/validate_makna.js .      # 13 uji makna Al-Qur'an
node tools/validate_hybrid.js .     # 14 uji v3.2 (checksum indeks, kueri wajib, aturan tingkat bukti)
```

## F. Membangun ulang indeks makna (bila database/brosur bertambah)
Butuh Node.js, Python 3, paket `numpy` dan `gensim`.
```
node tools/semantik/dump_records.js . kerja/kitab_records.jsonl
node tools/semantik/build_passages.js . kerja/kitab_records.jsonl kerja/passages.jsonl
# opsi 1 — pakai model yang sudah ada (paket lengkap: PENGEMBANG/model/w2v_d128.kv, PENGEMBANG/model/w2v_bi128.kv)
# opsi 2 — latih ulang:
node tools/semantik/w2v_corpus.js . kerja/passages.jsonl kerja/korpus.txt
python3 tools/semantik/train_w2v.py kerja/korpus.txt kerja/w2v_d128.model 128 8
node tools/semantik/w2v_corpus2.js . kerja/passages.jsonl kerja/kitab_records.jsonl kerja/korpus2.txt
python3 tools/semantik/train_w2v.py kerja/korpus2.txt kerja/w2v_bi128.model 128 6
# bangun indeks (±30 detik)
python3 tools/semantik/build_vektor.py . kerja/passages.jsonl kerja/w2v_d128.model kerja/w2v_bi128.model tools/semantik/toks.js data/kitab/vektor
node tools/validate_hybrid.js .
```
Versi indeks berganti otomatis → browser pengguna mengunduh indeks baru sekali. Hapus folder `data/kitab/vektor/` lama sebelum membangun ulang.
