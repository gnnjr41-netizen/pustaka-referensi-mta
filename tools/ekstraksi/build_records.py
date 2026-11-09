"""Satukan hasil ekstraksi menjadi database referensi kanonik (JSONL per sumber + manifest).
Aman diulang: menulis ke folder sementara lalu mengganti folder lama secara atomik."""
import json, os, re, shutil, hashlib, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'db')

SOURCES = [
    # kode, file CHM asli, nama tampil, kategori, file out
    ('quran', 'Al_Quran_Digital_2.1.chm', "Al-Qur'an Digital 2.1", 'quran', 'out_quran.json'),
    ('qtema', 'Al_Quran_Digital_2.1.chm', "Al-Qur'an Digital 2.1 · Indeks Tema", 'quran', 'out_qtema.json'),
    ('ibnukatsir', 'Tafsir_Ibnu_Katsir.chm', 'Tafsir Ibnu Katsir', 'tafsir', 'out_ibnukatsir.json'),
    ('jalalain', 'Tafsir_Jalalain.CHM', 'Tafsir Jalalain', 'tafsir', 'out_jalalain.json'),
    ('bulughul', 'Bulughul Maram.CHM', 'Bulughul Maram', 'hadis', 'out_bulughul.json'),
    ('riyadh', 'Riyadlus_Shalihin.chm', 'Riyadhus Shalihin', 'hadis', 'out_riyadh.json'),
    ('kitab9', 'Kitab 9 Imam.chm', 'Kitab 9 Imam', 'hadis', 'out_kitab9.json'),
    ('bukhari', 'shahih Bukhari.chm', 'Shahih Bukhari', 'hadis', 'out_bukhari.json'),
    ('muslim', 'shahih Muslim.chm', 'Shahih Muslim (Mukhtashar, Al-Albani)', 'hadis', 'out_muslim.json'),
    ('abudaud', 'shahih sunan abu daud.chm', 'Shahih Sunan Abu Dawud (Al-Albani)', 'hadis', 'out_abudaud.json'),
    ('ibnumajah', 'shahih sunan ibnu majah.chm', 'Shahih Sunan Ibnu Majah (Al-Albani)', 'hadis', 'out_ibnumajah.json'),
    ('tirmidzi', 'shahih sunan tirmidzi.chm', 'Shahih Sunan Tirmidzi (Al-Albani)', 'hadis', 'out_tirmidzi.json'),
    ('nasai', "Sunan Nasa'i.chm", "Sunan An-Nasa'i", 'hadis', 'out_nasai.json'),
    ('darimi', 'sunan ad-darimi.chm', 'Sunan Ad-Darimi', 'hadis', 'out_darimi.json'),
]
COLL = {'bukhari': 'Bukhari', 'muslim': 'Muslim', 'abudaud': 'Abu Dawud', 'tirmidzi': 'Tirmidzi', 'nasai': "An-Nasa'i", 'ibnumajah': 'Ibnu Majah',
        'ahmad': 'Ahmad', 'malik': 'Malik', 'darimi': 'Ad-Darimi', 'bulughul': 'Bulughul Maram', 'riyadh': 'Riyadhus Shalihin'}


def clean(s):
    return re.sub(r'[ \t]+', ' ', s or '').strip()


def main():
    tmp = OUT + '.tmp'
    if os.path.exists(tmp): shutil.rmtree(tmp)
    os.makedirs(tmp)
    manifest = {'built': time.strftime('%Y-%m-%dT%H:%M:%S'), 'sources': []}
    gi = 0
    seen = set()
    for code, chm, name, cat, fn in SOURCES:
        recs = json.load(open(os.path.join(HERE, fn)))
        out = open(os.path.join(tmp, code + '.jsonl'), 'w', encoding='utf-8')
        n = 0
        for r in recs:
            o = {'i': gi, 'id': r['id'], 'src': code, 'cat': cat}
            if code == 'kitab9':  # id unik berbasis lokasi file (sumber memuat beberapa halaman ganda)
                o['id'] = 'kitab9:%s#%d' % (r['path'], r['ord'])
            if o['id'] in seen: raise SystemExit('ID ganda: ' + o['id'])
            seen.add(o['id'])
            for k in ('kind', 'coll', 'kitab', 'bab', 'babAr', 'no', 'ar', 'tr', 'rawi', 'derajat', 'path', 'ord', 'toc', 'intro', 'note',
                      's', 'a', 'surah', 'nAyat', 'juz', 'topik', 'catatan', 'img', 'tema', 'sub', 'label', 'refs', 'title', 'a1', 'a2', 'blocks', 'arSeg', 'babInherited'):
                v = r.get(k)
                if v in (None, '', [], {}): continue
                o[k] = clean(v) if isinstance(v, str) and k not in ('tr', 'catatan', 'intro', 'ar', 'path') else v
            if cat == 'hadis':
                o.setdefault('kind', 'hadis')
                if code == 'kitab9': o['collName'] = COLL[o['coll']]
                else: o['coll'] = code
            out.write(json.dumps(o, ensure_ascii=False) + '\n')
            gi += 1; n += 1
        out.close()
        manifest['sources'].append({'code': code, 'file': chm, 'name': name, 'cat': cat, 'count': n,
                                    'sha256_jsonl': hashlib.sha256(open(os.path.join(tmp, code + '.jsonl'), 'rb').read()).hexdigest()})
    # teks Arab ayat dari Tafsir Ibnu Katsir (dipakai untuk pencarian Arab Al-Qur'an, ditandai sumbernya)
    shutil.copy(os.path.join(HERE, 'out_quran_ar_ibnukatsir.json'), os.path.join(tmp, 'quran_ar_from_ibnukatsir.json'))
    manifest['total'] = gi
    json.dump(manifest, open(os.path.join(tmp, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
    if os.path.exists(OUT):
        old = OUT + '.prev'
        if os.path.exists(old): shutil.rmtree(old)
        os.rename(OUT, old)
    os.rename(tmp, OUT)
    print('records', gi)
    for s in manifest['sources']: print('  %-11s %6d  %s' % (s['code'], s['count'], s['name']))


if __name__ == '__main__':
    main()
