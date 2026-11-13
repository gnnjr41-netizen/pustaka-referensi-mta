# Laporan pengujian v3.2 FINAL — 13 November 2026

Semua angka diukur pada salinan v3.2 FINAL (kamus `2026-11-13-final`, indeks vektor `202611130948`) dengan database V3.1 yang sebenarnya. Hasil lengkap: `lampiran_hasil_uji_kalimat_v3.2.txt`, `lampiran_hasil_uji_persis_v3.2.txt`, folder `hasil_validasi/`.

## 1. Ringkasan
| Uji | Hasil |
|---|---|
| Regresi V3.1 `validate_search` | **36/36** |
| Regresi V3.1 `validate_support` (Mode Support Ustadz) | **17/17** |
| Regresi V3.1 `validate_makna` | **13/13** |
| Uji baru `validate_hybrid` (checksum 139 file indeks, kueri wajib, aturan tingkat bukti, mode Literal, kueri Arab) | **14/14** |
| Mode **Literal** v3.2 vs v3.1 di Chrome (10 kueri × 4 sumber = 40 halaman hasil, teks dibandingkan) | **38/40 identik**. 2 beda = kueri `berbakti kepada orang tua` (Semua & Al-Qur'an), bagian *berdasarkan makna*: 11 → 12 ayat utama karena sinonim kamus baru. Disengaja; bagian kata persis tetap sama |
| Galat JavaScript di halaman (desktop, HP, file://) | **0** |
| Set 9 kueri Al-Qur'an (ayat rujukan di 10 teratas) | V3.1 **37/90** → v3.2 awal **43/90** → v3.2 FINAL **52/90** |
| Permintaan jaringan ke Gemini | **0** (Gemini tidak aktif) |

## 2. Dua belas uji wajib (dicek manual terhadap teks sumber)
Tanda: ✓ sesuai · ◐ sebagian (berkaitan tetapi bukan dalil pokok) · ✗ salah konteks.
Dinilai pada **8 hasil teratas** bagian yang diminta: *Ayat* → Al-Qur'an, *Hadis* → hadis, *Dalil* → keduanya.

Kriteria nilai (sama untuk semua nomor):
- **Tepat penuh** — semua hasil yang dinilai ✓.
- **Baik** — dalil utama benar, ada ◐, tidak ada ✗ di tingkat *Dalil utama*.
- **Sebagian** — ada ✗ di tingkat *Dalil utama*, atau dalil pokok tidak muncul.

| No | Uji | Rincian | Nilai |
|---|---|---|---|
| 1 | QS Al-Jatsiyah ayat 18 | QS 45:18 teratas, Tafsir Jalalain 45:18, Ibnu Katsir 45:16-20 (Al-Qur'an Digital 2.1 › s045a018.htm) | Tepat penuh |
| 2 | Ayat mengikuti syariat Allah | 5:48, 4:26, 45:18, 5:104, 3:95, 7:157 ✓; 3:20, 57:27 ◐ → 6 ✓ + 2 ◐ | Baik |
| 3 | Ayat larangan mengikuti hawa nafsu | 28:50, 20:16, 4:27, 5:77, 5:49, 38:26, 5:48, 47:14 → 8/8 ✓. Hadis pendamping juga 8/8 ✓ (Riyadhus Shalihin 105, Ad-Darimi bab "Menjauhi nafsu", Ibnu Majah 4250 "…orang lemah ialah yang mengikuti hawa nafsunya", Ahmad 18951, Abu Dawud 3984) | Tepat penuh |
| 4 | Ayat sabar menghadapi ujian hidup | 2:153, 2:155, 47:31, 3:186, 16:110, 2:214, 25:20 ✓; 33:11 ◐ (tentang diuji, tanpa kata sabar) → 7 ✓ + 1 ◐ | Baik |
| 5 | Ayat berbakti kepada orang tua | 19:14, 4:36, 46:15, 31:14, 2:83, 17:23 ✓; 17:25 ◐ (lanjutan 17:23-24), 18:81 ◐ → 6 ✓ + 2 ◐. Hadis pendamping: bab "Berbakti kepada (kedua) orang tua" Ibnu Majah & Abu Dawud 8/8 ✓ | Baik |
| 6 | Hadis tentang amanah | Tirmidzi 2179 & 2105, Riyadhus Shalihin 201, Tirmidzi 1882, Muslim 206, Ahmad 14877/7571/8105 → 8/8 ✓. (Al-Qur'an pendamping: 33:72, 4:58 ✓; 64:12, 5:67 ◐ — amanat = risalah) | Tepat penuh |
| 7 | Hadis sabar menghadapi musibah | Bukhari 1219, Muslim (Mukhtashar) 462, Tirmidzi 988, Ibnu Majah 1585/1586/1588, Nasa'i 1846, Muslim 1534 → 8/8 ✓ | Tepat penuh |
| 8 | Dalil kewajiban suami istri | Al-Qur'an: 2:228 (hak seimbang dengan kewajiban), 4:34, 4:128, 2:233, 4:19, 65:6, 65:7 ✓; 2:240 ◐ (wasiat nafkah untuk istri). Hadis: "Istri yang Enggan Melayani Suaminya", "Hak Istri Terhadap Suami", Ibnu Majah 1844, Ad-Darimi 2131, Abu Dawud 1829 "Hak suami atas isteri", Riyadhus Shalihin bab 34 & 35 → 8/8 ✓. **Hadis talak tidak lagi muncul di 8 teratas** | Baik |
| 9 | Dalil kejujuran berdagang | Al-Qur'an: 6:152, 2:282 ✓ (dua-duanya dalil utama), 83:1 ✓ (pendukung teratas). Hadis utama: Ibnu Majah (Albani) "pedagang dibangkitkan sebagai orang fajir kecuali yang bertakwa, berbuat baik dan jujur", Muslim "Kejujuran dan Kejelasan dalam Jual Beli", Ibnu Majah 2213 "Jujur dalam timbangan", 2214, 2137, Nasa'i 4381 ✓; Ibnu Majah 2130 ◐ → 6 ✓ + 1 ◐. **Bukhari 2723 tidak lagi menjadi dalil utama.** Catatan: pendukung Al-Qur'an no. 4–8 adalah ayat perniagaan umum (62:11, 24:37 ◐) dan 9:111 (jual beli kiasan, ✗ bila dibaca sebagai dalil dagang) — berlabel *pendukung*, bukan dalil utama | Baik |
| 10 | Frasa Arab persis | `ثم جعلناك على شريعة من الأمر` → QS 45:18 teratas, kecocokan huruf 100%. `إنما الأعمال بالنيات` (Hadis) → Abu Dawud 2201, Bukhari 1, Ibnu Majah 4302 (jalur V3.1) | Tepat penuh |
| 11 | Transliterasi Latin | `tsumma ja'alnaka 'ala syari'atin minal amri fattabi'ha` → QS 45:18 teratas; `bismillahirrahmanirrahim` → QS 1:1, 27:30 | Tepat penuh |
| 12 | Nomor ayat & hadis | `QS 45:18` ✓; `Tirmidzi 2179` → Kitab 9 Imam & Shahih Sunan Tirmidzi No. 2179 ✓; `Bukhari 52` → Shahih Bukhari No. 52 ✓ | Tepat penuh |

**Kesimpulan: 7 Tepat penuh + 5 Baik, 0 Sebagian. Salah konteks di tingkat Dalil utama: 0.** Satu salah konteks di tingkat pendukung (QS 9:111 pada no. 9).

**Koreksi angka laporan sebelumnya.** Laporan v3.2 awal menulis "10 uji penuh, 2 sebagian (no. 8 dan no. 5)". Itu tidak konsisten: no. 2 dan 4 (punya ◐) dihitung penuh, no. 5 (◐ sejenis) dihitung sebagian, dan no. 9 (ada ✗ Bukhari 2723 sebagai dalil utama) dihitung penuh. Dengan kriteria di atas, v3.2 awal = **7 Tepat penuh + 3 Baik + 2 Sebagian (no. 8, no. 9)**. FINAL = 7 + 5 + 0.

## 3. Kueri yang diperbaiki di FINAL (contoh tambahan)
| Kueri | Sebelum | FINAL |
|---|---|---|
| *Dalil kewajiban menunaikan janji* | QS 9:71 & 19:55 ("menunaikan zakat") ✗ di dalil utama | Al-Qur'an: 48:10, 2:177, 13:20, 3:76, 9:4, 17:34 ✓; 2:83, 5:12 ◐ (perjanjian Bani Israil). Hadis utama 5/5 ✓: Bukhari 2484 & 2487 "menepati janji", Tirmidzi 1511 & 1940 "Menunaikan janji", Riyadhus Shalihin 1584 |
| *Ayat tentang menghormati orang tua* | 17:23 hanya pendukung | 19:14, 4:36, 46:15, 31:14, 2:83, 29:8, 17:23 ✓; 18:81 ◐ (= hasil "berbakti") |
| *Dalil tentang kewajiban suami istri* | bercampur ayat & hadis talak | lihat no. 8 |
| *Dalil tentang kejujuran berdagang* | Bukhari 2723 ✗ dalil utama | lihat no. 9 |

Catatan *menghormati orang tua* (hadis): dalam bahasa Indonesia frasa ini juga berarti "menghormati orang yang lebih tua". Karena itu 3 hadis teratas adalah bab *menghormati yang dewasa / yang tua* (Tirmidzi 1945, 1843, 1842) ◐, disusul bab *berbakti kepada kedua orang tua* ✓. Tidak dipaksakan — kedua makna didukung sumber. Untuk ibu-bapak, gunakan kata "berbakti".

## 4. Browser & perangkat (pemeriksaan final, sekali jalan)
| Uji | Hasil |
|---|---|
| Emulasi Chrome Android (412 px) | ✓ tanpa galat, tanpa geser horizontal; area filter 101 px (terlipat) |
| Hasil kata persis tampil tanpa menunggu indeks makna | ✓ indeks vektor sengaja ditunda 5 dtk → hasil literal sudah tampil pada 2,5 dtk |
| Teks Arab | ✓ ayat tampil utuh (tidak dipotong); hadis Arab panjang (> 400 karakter) dilipat "Teks Arab lengkap — ketuk untuk membuka", isinya utuh |
| Tombol Buka detail · Tafsir · Salin kutipan · Salin referensi | ✓ berfungsi |
| Chrome desktop 1280 px & tablet 768 px | ✓ tanpa galat, tanpa geser horizontal |
| Dibuka langsung `index.html` (file://) tanpa internet | ✓ hasil gabungan tampil; integritas SHA-256 cocok |
| Kartu brosur CHM sebelum teks tahun itu termuat | ✓ tampil catatan "teks brosur masih dimuat…" (sebelumnya galat; diperbaiki di FINAL) |
| Memori | heap ±147 MB (v3.2) vs 122 MB (v3.1) setelah 3 pencarian |
| HP fisik | **belum** — perlu diuji tim (panduan langkah C) |

## 5. Gemini (server tiruan, karena API Google tidak dapat diakses dari lingkungan kerja)
| Skenario | Hasil |
|---|---|
| Tidak dikonfigurasi (bawaan FINAL) | ✓ tidak ada panggilan jaringan; hasil lokal |
| Berhasil | ✓ istilah tambahan tampil; kartu utama berlabel "urutan dibantu Gemini" |
| Gagal / kuota habis (HTTP 429) | ✓ hasil lokal langsung tampil; jeda 5 menit; pesan status |
| Jawaban tidak sah (ID asing, istilah berisi `<script>`) | ✓ urutan ditolak; istilah aneh dibuang |
| Lambat (> batas waktu) | ✓ dibatalkan; hasil lokal tampil |

## 6. Yang belum diuji
- HP Android fisik dan jaringan seluler nyata.
- Supabase (brosur online) dan Edge Function sungguhan — tidak dapat diakses dari lingkungan kerja.
- BGE-M3 — tidak dapat diunduh di lingkungan kerja (lihat laporan rancangan).
