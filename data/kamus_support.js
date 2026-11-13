/* KAMUS KATA KUNCI — Mode Support Ustadz & pencarian makna Al-Qur'an (Pustaka Referensi MTA)
   Dikelola admin lewat menu "Kamus kata kunci" di Mode Support Ustadz → "Unduh kamus_support.js" → timpa file ini di repository.
   Struktur:
   - abaikan : kata pengantar yang tidak ikut dicari (tolong, carikan, referensi, …)
   - pelengkap: kata pelengkap (keutamaan, hukum, adab…) — menaikkan peringkat tetapi bukan syarat referensi utama
   - ejaan   : variasi penulisan satu kata (dianggap kata yang sama)
   - entri   : { id, kata (kata/frasa utama), tema (kelompok tema), sinonim (makna sama → referensi utama),
                 terkait (istilah terkait → referensi pendukung) }
   Prinsip: perluas seperlunya saja. Istilah "terkait" tidak pernah menjadikan dokumen referensi utama.
   v3.2 final (13 Nov 2026): + menepati-janji, + kewajiban-suami-istri; sinonim frasa untuk birrul-walidain (menghormati orang tua) & perdagangan (pedagang, penjual/pembeli, frasa takaran-timbangan). Semua entri lama tetap. */
window.PRM_KAMUS = {
 "versi": "2026-11-13-final",
 "abaikan": [
  "tolong",
  "mohon",
  "carikan",
  "cari",
  "carikanlah",
  "mencari",
  "cariin",
  "buatkan",
  "buat",
  "buatlah",
  "membuat",
  "susunkan",
  "siapkan",
  "menyiapkan",
  "persiapan",
  "referensi",
  "rujukan",
  "materi",
  "bahan",
  "kajian",
  "pengajian",
  "ceramah",
  "kultum",
  "tausiyah",
  "pembahasan",
  "penjelasan",
  "keterangan",
  "dalil",
  "dalilnya",
  "hukum",
  "hukumnya",
  "tentang",
  "mengenai",
  "perihal",
  "seputar",
  "terkait",
  "berkaitan",
  "soal",
  "masalah",
  "tema",
  "topik",
  "judul",
  "saya",
  "aku",
  "kami",
  "kita",
  "anda",
  "ustadz",
  "ustad",
  "ustadzah",
  "pak",
  "bu",
  "bapak",
  "ibu",
  "tim",
  "support",
  "ingin",
  "mau",
  "akan",
  "hendak",
  "perlu",
  "butuh",
  "membutuhkan",
  "minta",
  "meminta",
  "bisa",
  "dapat",
  "bantu",
  "bantuan",
  "dong",
  "ya",
  "nya",
  "apa",
  "apakah",
  "saja",
  "bagaimana",
  "gimana",
  "mengapa",
  "kenapa",
  "siapa",
  "kapan",
  "dimana",
  "berapa",
  "adakah",
  "jelaskan",
  "terangkan",
  "sebutkan",
  "tunjukkan",
  "tampilkan",
  "berikan",
  "yang",
  "dan",
  "atau",
  "serta",
  "di",
  "ke",
  "dari",
  "untuk",
  "dengan",
  "dalam",
  "pada",
  "kepada",
  "oleh",
  "itu",
  "ini",
  "tersebut",
  "adalah",
  "sebagai",
  "bagi",
  "agar",
  "supaya",
  "juga",
  "lalu",
  "kemudian",
  "pun",
  "lah",
  "kah",
  "hal",
  "hal-hal",
  "cara",
  "macam",
  "jenis",
  "beberapa",
  "semua",
  "seluruh",
  "secara",
  "lengkap",
  "singkat",
  "detail",
  "tolong",
  "umum",
  "khusus",
  "bahas",
  "membahas",
  "dibahas",
  "contoh",
  "misalnya",
  "kalimat",
  "pertanyaan",
  "jawaban",
  "brosur",
  "assalamualaikum",
  "assalamu",
  "alaikum",
  "wassalamualaikum",
  "wassalam",
  "terima",
  "kasih",
  "terimakasih",
  "makasih",
  "bantuannya",
  "tolongin",
  "mohon",
  "izin",
  "besok",
  "nanti",
  "lusa",
  "kemarin",
  "depan",
  "kesempatan",
  "insyaallah",
  "jazakallah",
  "khairan",
  "bahannya",
  "materinya",
  "referensinya",
  "acara",
  "pertemuan",
  "ayat",
  "ketika",
  "saat",
  "sewaktu",
  "manakala",
  "tatkala"
 ],
 "pelengkap": [
  "keutamaan",
  "fadhilah",
  "hukum",
  "adab",
  "tata",
  "tatacara",
  "larangan",
  "anjuran",
  "manfaat",
  "hikmah",
  "syarat",
  "rukun",
  "kewajiban",
  "sunnah",
  "pengertian",
  "definisi",
  "kedudukan",
  "ancaman",
  "pahala",
  "allah",
  "tuhan",
  "orang",
  "selalu",
  "senantiasa",
  "menghadapi",
  "mendapatkan",
  "mendapat",
  "diberikan",
  "memberikan",
  "diberi",
  "berbuat",
  "kehidupan",
  "hidup",
  "menjaga",
  "memelihara",
  "kaum",
  "umat",
  "manusia"
 ],
 "ejaan": [
  [
   "istri",
   "isteri"
  ],
  [
   "suami"
  ],
  [
   "ziarah",
   "ziyarah",
   "ziaroh",
   "ziyaroh"
  ],
  [
   "kubur",
   "qubur",
   "kuburan",
   "pekuburan",
   "pequburan",
   "makam"
  ],
  [
   "haid",
   "haidh",
   "haidl",
   "haidz"
  ],
  [
   "istihadhah",
   "istihadlah",
   "istihadah",
   "istihadloh",
   "istihadoh"
  ],
  [
   "nifas",
   "nifaas"
  ],
  [
   "wudhu",
   "wudlu",
   "wudu",
   "wudhuk"
  ],
  [
   "membatalkan",
   "membathalkan",
   "membatalkanya",
   "batal",
   "bathal",
   "pembatal",
   "membatalkannya"
  ],
  [
   "tayamum",
   "tayammum",
   "tayamom"
  ],
  [
   "najis",
   "najasah",
   "najisnya"
  ],
  [
   "mensucikan",
   "menyucikan",
   "mensucikanya",
   "mensucikannya",
   "mensucikanny",
   "bersuci",
   "mensuci"
  ],
  [
   "aqiqah",
   "akikah",
   "aqiqoh",
   "akikoh"
  ],
  [
   "tasbih",
   "tasbiih",
   "tasbeh"
  ],
  [
   "safar",
   "musafir",
   "bepergian"
  ],
  [
   "qashar",
   "qasar",
   "qoshor"
  ],
  [
   "jamak",
   "jama'"
  ],
  [
   "masbuq",
   "masbuk"
  ],
  [
   "makmum",
   "ma'mum",
   "mamum"
  ],
  [
   "taawudz",
   "ta'awudz",
   "taawuz",
   "taawwudz"
  ],
  [
   "basmalah",
   "basmallah",
   "bismillah"
  ],
  [
   "ruqyah",
   "rukyah",
   "ruqiyah",
   "rukyat"
  ],
  [
   "wabah",
   "waba",
   "tha'un",
   "taun",
   "thaun"
  ],
  [
   "musik",
   "musiq"
  ],
  [
   "nyanyian",
   "menyanyi",
   "bernyanyi",
   "nyanyi",
   "lagu"
  ],
  [
   "patung",
   "berhala"
  ],
  [
   "gambar",
   "menggambar",
   "lukisan"
  ],
  [
   "musbil",
   "isbal",
   "isbaal"
  ],
  [
   "nisfu",
   "nishfu",
   "nisfu"
  ],
  [
   "syaban",
   "sya'ban",
   "syakban",
   "syaaban"
  ],
  [
   "yasin",
   "yaasiin",
   "yasiin",
   "yaasin"
  ],
  [
   "jabat",
   "berjabat",
   "bersalaman",
   "salaman",
   "mushafahah"
  ],
  [
   "taat",
   "ketaatan",
   "menaati",
   "mentaati",
   "patuh",
   "kepatuhan"
  ],
  [
   "keutamaan",
   "fadhilah",
   "fadlilah",
   "fadilah",
   "fadhillah",
   "fadlillah"
  ],
  [
   "sedekah",
   "shadaqah",
   "shodaqoh",
   "sadaqah"
  ],
  [
   "jenazah",
   "janazah",
   "jinazah",
   "mayit",
   "mayat"
  ],
  [
   "tahajud",
   "tahajjud"
  ],
  [
   "tarawih",
   "taraweh"
  ],
  [
   "witir",
   "witr"
  ],
  [
   "jumat",
   "jum'at",
   "jumah",
   "jumuah"
  ],
  [
   "rezeki",
   "rezki",
   "rizki",
   "rizqi",
   "rejeki",
   "rizqy"
  ]
 ],
 "entri": [
  {
   "id": "tayamum",
   "kata": "tayamum",
   "tema": "Thaharah",
   "sinonim": [
    "tayammum"
   ],
   "terkait": [
    "bersuci dengan debu",
    "debu",
    "pengganti wudhu"
   ]
  },
  {
   "id": "pembatal-wudhu",
   "kata": "membatalkan wudhu",
   "tema": "Thaharah",
   "sinonim": [
    "pembatal wudhu",
    "batal wudhu",
    "membathalkan wudlu",
    "hal yang membatalkan wudhu"
   ],
   "terkait": [
    "hadats",
    "kentut",
    "menyentuh kemaluan",
    "tidur"
   ]
  },
  {
   "id": "wudhu",
   "kata": "wudhu",
   "tema": "Thaharah",
   "sinonim": [
    "wudlu"
   ],
   "terkait": [
    "bersuci",
    "thaharah"
   ]
  },
  {
   "id": "najis",
   "kata": "najis",
   "tema": "Thaharah",
   "sinonim": [
    "najasah"
   ],
   "terkait": [
    "mensucikan najis",
    "bersuci",
    "thaharah",
    "kotoran"
   ]
  },
  {
   "id": "haid",
   "kata": "haid",
   "tema": "Thaharah wanita",
   "sinonim": [
    "haidl",
    "datang bulan",
    "menstruasi"
   ],
   "terkait": [
    "istihadhah",
    "nifas",
    "darah wanita"
   ]
  },
  {
   "id": "istihadhah",
   "kata": "istihadhah",
   "tema": "Thaharah wanita",
   "sinonim": [
    "istihadlah",
    "darah penyakit"
   ],
   "terkait": [
    "haid",
    "nifas"
   ]
  },
  {
   "id": "nifas",
   "kata": "nifas",
   "tema": "Thaharah wanita",
   "sinonim": [],
   "terkait": [
    "haid",
    "melahirkan"
   ]
  },
  {
   "id": "mandi-jumat",
   "kata": "mandi jumat",
   "tema": "Thaharah",
   "sinonim": [
    "mandi jum'at"
   ],
   "terkait": [
    "shalat jumat",
    "mandi"
   ]
  },
  {
   "id": "shalat-malam",
   "kata": "shalat malam",
   "tema": "Shalat sunnah",
   "sinonim": [
    "qiyamul lail",
    "shalatul lail",
    "shalat lail",
    "tahajud",
    "qiyam ramadhan"
   ],
   "terkait": [
    "witir",
    "tarawih"
   ]
  },
  {
   "id": "shalat-tasbih",
   "kata": "shalat tasbih",
   "tema": "Shalat sunnah",
   "sinonim": [
    "shalat sunnah tasbih",
    "sholat tasbih"
   ],
   "terkait": [
    "shalat sunnah"
   ]
  },
  {
   "id": "shalat-safar",
   "kata": "shalat safar",
   "tema": "Shalat",
   "sinonim": [
    "shalat musafir",
    "shalat dalam perjalanan",
    "qashar",
    "jamak shalat"
   ],
   "terkait": [
    "safar",
    "musafir",
    "jamak"
   ]
  },
  {
   "id": "masbuq",
   "kata": "makmum masbuq",
   "tema": "Shalat berjamaah",
   "sinonim": [
    "masbuq"
   ],
   "terkait": [
    "shalat berjamaah",
    "makmum"
   ]
  },
  {
   "id": "taawudz",
   "kata": "taawudz",
   "tema": "Shalat",
   "sinonim": [
    "membaca taawudz"
   ],
   "terkait": [
    "basmalah",
    "imam membaca jahr",
    "jahr"
   ]
  },
  {
   "id": "aqiqah",
   "kata": "aqiqah",
   "tema": "Kelahiran anak",
   "sinonim": [
    "akikah"
   ],
   "terkait": [
    "kelahiran anak",
    "mencukur rambut bayi",
    "memberi nama anak",
    "kambing"
   ]
  },
  {
   "id": "ziarah-kubur",
   "kata": "ziarah kubur",
   "tema": "Jenazah & kubur",
   "sinonim": [
    "ziyarah qubur",
    "ziarah makam",
    "ziarah kuburan"
   ],
   "terkait": [
    "doa masuk kubur",
    "pekuburan",
    "kubur"
   ]
  },
  {
   "id": "jenazah",
   "kata": "jenazah",
   "tema": "Jenazah & kubur",
   "sinonim": [
    "janazah"
   ],
   "terkait": [
    "shalat jenazah",
    "kematian",
    "mayit"
   ]
  },
  {
   "id": "jabat-tangan",
   "kata": "berjabat tangan",
   "tema": "Akhlak",
   "sinonim": [
    "bersalaman",
    "mushafahah",
    "jabat tangan"
   ],
   "terkait": [
    "bermuka manis",
    "senyum"
   ]
  },
  {
   "id": "nisfu-syaban",
   "kata": "nisfu syaban",
   "tema": "Amalan & bidah",
   "sinonim": [
    "nishfu sya'ban",
    "malam nisfu syaban"
   ],
   "terkait": [
    "syaban",
    "bidah"
   ]
  },
  {
   "id": "yasin",
   "kata": "fadhilah yasin",
   "tema": "Amalan & bidah",
   "sinonim": [
    "keutamaan yasin",
    "surat yasin",
    "fadlilah yaasiin"
   ],
   "terkait": [
    "yasin",
    "hadits lemah"
   ]
  },
  {
   "id": "musbil",
   "kata": "musbil",
   "tema": "Pakaian",
   "sinonim": [
    "isbal",
    "kain di bawah mata kaki"
   ],
   "terkait": [
    "pakaian",
    "sombong"
   ]
  },
  {
   "id": "ruqyah",
   "kata": "ruqyah",
   "tema": "Pengobatan",
   "sinonim": [
    "rukyah",
    "jampi"
   ],
   "terkait": [
    "wabah",
    "pengobatan",
    "doa kesembuhan"
   ]
  },
  {
   "id": "wabah",
   "kata": "wabah",
   "tema": "Pengobatan",
   "sinonim": [
    "tha'un",
    "penyakit menular"
   ],
   "terkait": [
    "ruqyah",
    "sabar"
   ]
  },
  {
   "id": "musik",
   "kata": "musik",
   "tema": "Hiburan",
   "sinonim": [
    "nyanyian",
    "alat musik"
   ],
   "terkait": [
    "lagu",
    "hiburan"
   ]
  },
  {
   "id": "gambar-patung",
   "kata": "gambar dan patung",
   "tema": "Seni",
   "sinonim": [
    "membuat gambar",
    "membuat patung",
    "gambar makhluk bernyawa"
   ],
   "terkait": [
    "patung",
    "gambar",
    "foto"
   ]
  },
  {
   "id": "istri-taat",
   "kata": "istri taat suami",
   "tema": "Keluarga",
   "sinonim": [
    "ketaatan istri",
    "taat kepada suami",
    "kewajiban istri",
    "hak suami"
   ],
   "terkait": [
    "istri",
    "suami",
    "rumah tangga",
    "keluarga sakinah"
   ]
  },
  {
   "id": "birrul-walidain",
   "kata": "berbakti kepada orang tua",
   "tema": "Keluarga",
   "sinonim": [
    "birrul walidain",
    "berbakti kepada ibu bapak",
    "berbakti kepada kedua orang tua",
    "menghormati orang tua",
    "menghormati kedua orang tua",
    "menghormati ibu bapak",
    "memuliakan kedua orang tua",
    "berbuat baik kepada orang tua",
    "berbuat baik kepada kedua orang tua",
    "berbuat baik kepada ibu bapak",
    "berbuat baik pada ibu bapak"
   ],
   "terkait": [
    "durhaka kepada orang tua",
    "ibu bapak",
    "orang tua"
   ]
  },
  {
   "id": "sabar",
   "kata": "sabar",
   "tema": "Akhlak",
   "sinonim": [
    "kesabaran",
    "shabar",
    "bersabar",
    "tabah",
    "ketabahan"
   ],
   "terkait": [
    "ujian",
    "musibah",
    "tawakkal",
    "tahan uji"
   ]
  },
  {
   "id": "tawakkal",
   "kata": "tawakkal",
   "tema": "Akhlak",
   "sinonim": [
    "tawakal",
    "berserah diri kepada allah"
   ],
   "terkait": [
    "ikhtiar",
    "sabar"
   ]
  },
  {
   "id": "shalat-berjamaah",
   "kata": "shalat berjamaah",
   "tema": "Shalat berjamaah",
   "sinonim": [
    "shalat jamaah",
    "berjamaah"
   ],
   "terkait": [
    "imam",
    "makmum",
    "masjid"
   ]
  },
  {
   "id": "puasa-ramadhan",
   "kata": "puasa ramadhan",
   "tema": "Puasa",
   "sinonim": [
    "shaum ramadhan",
    "shiyam ramadhan"
   ],
   "terkait": [
    "sahur",
    "berbuka",
    "lailatul qadar"
   ]
  },
  {
   "id": "zakat-fitrah",
   "kata": "zakat fitrah",
   "tema": "Zakat",
   "sinonim": [
    "zakat fitri"
   ],
   "terkait": [
    "idul fitri",
    "zakat"
   ]
  },
  {
   "id": "riba",
   "kata": "riba",
   "tema": "Muamalah",
   "sinonim": [
    "bunga bank",
    "rente"
   ],
   "terkait": [
    "hutang",
    "jual beli"
   ]
  },
  {
   "id": "menuntut-ilmu",
   "kata": "menuntut ilmu",
   "tema": "Ilmu & dakwah",
   "sinonim": [
    "mencari ilmu",
    "thalabul ilmi",
    "menyebarluaskan ilmu"
   ],
   "terkait": [
    "ilmu",
    "majelis ilmu",
    "guru"
   ]
  },
  {
   "id": "dzikir",
   "kata": "dzikir",
   "tema": "Doa & dzikir",
   "sinonim": [
    "zikir",
    "mengingat allah",
    "ingat kepada allah",
    "ingatlah allah",
    "mengingati allah",
    "dzikrullah",
    "zikrullah",
    "ingat allah"
   ],
   "terkait": [
    "doa",
    "wirid",
    "tasbih",
    "menyebut nama allah",
    "bertasbih"
   ]
  },
  {
   "id": "orang-tua",
   "kata": "orang tua",
   "tema": "Keluarga",
   "sinonim": [
    "kedua orang tua",
    "ibu bapak",
    "ibu bapa",
    "bapak ibu",
    "ibu dan bapak",
    "ayah ibu",
    "walidain"
   ],
   "terkait": [
    "ibu",
    "bapak",
    "ayah"
   ]
  },
  {
   "id": "berbuat-baik",
   "kata": "berbuat baik",
   "tema": "Akhlak",
   "sinonim": [
    "berbakti",
    "berbuat ihsan",
    "ihsan",
    "bakti",
    "berbuat kebaikan"
   ],
   "terkait": [
    "menghormati",
    "kebaikan",
    "hormat"
   ]
  },
  {
   "id": "musibah",
   "kata": "musibah",
   "tema": "Akhlak",
   "sinonim": [
    "bencana",
    "malapetaka",
    "ditimpa musibah",
    "kemalangan"
   ],
   "terkait": [
    "cobaan",
    "ujian",
    "kesusahan",
    "kesulitan",
    "kesempitan",
    "penderitaan",
    "menimpa"
   ]
  },
  {
   "id": "ujian",
   "kata": "ujian",
   "tema": "Akhlak",
   "sinonim": [
    "cobaan",
    "diuji",
    "menguji",
    "ujian hidup",
    "ujian kehidupan"
   ],
   "terkait": [
    "musibah",
    "fitnah",
    "bala"
   ]
  },
  {
   "id": "rumah-tangga",
   "kata": "rumah tangga",
   "tema": "Keluarga",
   "sinonim": [
    "berumah tangga",
    "suami istri",
    "bersuami istri",
    "pernikahan",
    "perkawinan",
    "pasangan suami istri"
   ],
   "terkait": [
    "istri",
    "suami",
    "nikah",
    "keluarga"
   ]
  },
  {
   "id": "keharmonisan",
   "kata": "keharmonisan",
   "tema": "Keluarga",
   "sinonim": [
    "harmonis",
    "rukun",
    "kerukunan",
    "tenteram",
    "ketenteraman",
    "kasih sayang",
    "sakinah",
    "mawaddah",
    "berkasih sayang"
   ],
   "terkait": [
    "perdamaian",
    "mendamaikan",
    "damai",
    "perbaikan",
    "bergaul",
    "pergaulan",
    "persengketaan",
    "perselisihan"
   ]
  },
  {
   "id": "orang-beriman",
   "kata": "orang beriman",
   "tema": "Iman",
   "sinonim": [
    "orang orang yang beriman",
    "orang yang beriman",
    "mukmin",
    "orang mukmin",
    "mukminin",
    "kaum mukminin",
    "beriman"
   ],
   "terkait": [
    "iman",
    "keimanan"
   ]
  },
  {
   "id": "rezeki",
   "kata": "rezeki",
   "tema": "Muamalah",
   "sinonim": [
    "rezki",
    "rizki",
    "rizqi",
    "rejeki"
   ],
   "terkait": [
    "karunia",
    "nikmat",
    "harta",
    "kekayaan"
   ]
  },
  {
   "id": "curang",
   "kata": "curang",
   "tema": "Muamalah",
   "sinonim": [
    "kecurangan",
    "berbuat curang",
    "mengurangi takaran",
    "mengurangi timbangan",
    "kurangi takaran",
    "kurangi timbangan",
    "mengurangi sukatan",
    "merugikan manusia",
    "kurangkan bagi manusia",
    "mengurangi neraca",
    "kurangi neraca"
   ],
   "terkait": [
    "khianat",
    "menipu",
    "merugikan",
    "batil"
   ]
  },
  {
   "id": "perdagangan",
   "kata": "perdagangan",
   "tema": "Muamalah",
   "sinonim": [
    "perniagaan",
    "berniaga",
    "berdagang",
    "jual beli",
    "niaga",
    "dagang",
    "berjual beli",
    "takaran",
    "menakar",
    "sukatan",
    "pedagang",
    "para pedagang",
    "penjual",
    "pembeli",
    "penjual dan pembeli",
    "berjualan",
    "takaran dan timbangan",
    "menakar dan menimbang",
    "sempurnakanlah takaran",
    "cukupkanlah takaran",
    "mengurangi takaran",
    "mengurangi timbangan",
    "timbangan dengan adil",
    "menimbang dengan neraca yang benar"
   ],
   "terkait": [
    "timbangan",
    "menimbang",
    "neraca",
    "pasar",
    "harta"
   ]
  },
  {
   "id": "amanah",
   "kata": "amanah",
   "tema": "Akhlak",
   "sinonim": [
    "amanat",
    "titipan"
   ],
   "terkait": [
    "khianat",
    "janji",
    "menepati janji"
   ]
  },
  {
   "id": "menjaga-amanah",
   "kata": "menjaga amanah",
   "tema": "Akhlak",
   "sinonim": [
    "memelihara amanat",
    "menunaikan amanat",
    "menyampaikan amanat kepada yang berhak",
    "mengkhianati amanat",
    "memikul amanat",
    "menepati amanat"
   ],
   "terkait": [
    "amanat",
    "khianat",
    "janji"
   ]
  },
  {
   "id": "menepati-janji",
   "kata": "menepati janji",
   "tema": "Akhlak",
   "sinonim": [
    "menunaikan janji",
    "memenuhi janji",
    "penuhilah janji",
    "tepatilah janji",
    "tepatilah perjanjian",
    "menepati perjanjian",
    "memenuhi perjanjian",
    "penuhilah aqad",
    "memenuhi aqad",
    "menepati ikrar",
    "menepati janjinya",
    "memenuhi janjinya"
   ],
   "terkait": [
    "janji",
    "perjanjian",
    "aqad",
    "ikrar",
    "mengingkari janji",
    "ingkar janji",
    "menyalahi janji"
   ]
  },
  {
   "id": "kewajiban-suami-istri",
   "kata": "kewajiban suami istri",
   "tema": "Keluarga",
   "sinonim": [
    "hak dan kewajiban suami istri",
    "hak suami istri",
    "kewajiban suami dan istri",
    "kewajiban suami",
    "kewajiban suami terhadap istri",
    "hak istri",
    "hak istri atas suami",
    "hak istri terhadap suami",
    "hak suami",
    "hak suami atas istri",
    "kewajiban istri",
    "taat kepada suami",
    "melayani suami",
    "pemimpin bagi kaum wanita",
    "hak yang seimbang dengan kewajibannya",
    "bergaullah dengan mereka secara patut",
    "pergaulilah mereka dengan baik",
    "pergaulilah kaum wanita",
    "memberi nafkah",
    "berikanlah nafkah",
    "nafkah istri",
    "nafkah kepada istri",
    "menafkahi istri",
    "menafkahi keluarga",
    "memberi makan dan pakaian"
   ],
   "terkait": [
    "suami",
    "istri",
    "nikah",
    "pernikahan",
    "rumah tangga",
    "keluarga"
   ]
  }
 ]
};
