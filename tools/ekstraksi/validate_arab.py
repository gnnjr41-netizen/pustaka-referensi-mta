"""Validasi teks Arab: setiap teks Arab di database harus terdapat UTUH (karakter & harakat sama) di halaman HTML sumbernya.
Perbandingan hanya menormalkan spasi (spasi ganda/baris baru → satu spasi). Tidak ada normalisasi huruf atau harakat."""
import json, os, re, sys, glob, random
sys.path.insert(0, os.path.dirname(__file__))
from common import decode, lines
DB = os.path.join(os.path.dirname(__file__), '..', 'db'); X = os.path.join(os.path.dirname(__file__), '..', 'chm_x')
ROOT = {'kitab9': 'kitab9', 'bukhari': 'bukhari', 'muslim': 'muslim', 'abudaud': 'abudaud', 'ibnumajah': 'ibnumajah', 'tirmidzi': 'tirmidzi', 'nasai': 'nasai', 'darimi': 'darimi',
        'bulughul': 'bulughul', 'riyadh': 'riyadlus', 'jalalain': 'jalalain', 'ibnukatsir': 'ibnukatsir'}
DEF = {'bukhari': 'cp1252', 'nasai': 'cp1252', 'darimi': 'cp1252', 'riyadh': 'cp1252', 'jalalain': 'cp1252', 'ibnukatsir': 'utf-8'}
HARAKAT = re.compile(r'[ً-ْ]')
ws = lambda s: re.sub(r'\s+', '', s)  # bandingkan tanpa spasi sama sekali (sumber Word memecah kata di tengah baris)
cache = {}
def page(src, path):
    k = (src, path)
    if k not in cache:
        if len(cache) > 400: cache.clear()
        t, enc, bad = decode(os.path.join(X, ROOT[src], path), DEF.get(src, 'cp1256'))
        cache[k] = ws(' '.join(lines(t)))
    return cache[k]
rep = {'metode': 'teks Arab record (tanpa spasi) harus merupakan substring dari teks halaman sumber (tanpa spasi); huruf & harakat tidak dinormalkan', 'sumber': {}}
qar = json.load(open(os.path.join(DB, 'quran_ar_from_ibnukatsir.json')))
for src in ROOT:
    tot = ok = 0; fails = []; har = 0; repl = 0; segs = 0
    for ln in open(os.path.join(DB, src + '.jsonl'), encoding='utf-8'):
        r = json.loads(ln)
        texts = []
        if src == 'ibnukatsir': texts = [b[1] for b in r.get('blocks', []) if b[0] == 'a']
        elif r.get('ar'): texts = [x for x in r['ar'].split('\n') if x.strip()] if src == 'riyadh' else [r['ar']]
        if not texts: continue
        P = page(src, r['path'])
        for t in texts:
            tot += 1
            if '�' in t: repl += 1
            if HARAKAT.search(t): har += 1
            if ws(t) in P: ok += 1
            else:
                # teks Arab gabungan dari beberapa paragraf (Jalalain/Kitab9): cek per bagian
                parts = [p for p in re.split(r'\s{2,}|\n', t) if p.strip()]
                if src in ('jalalain', 'kitab9', 'bukhari', 'darimi', 'nasai', 'muslim', 'abudaud', 'ibnumajah', 'tirmidzi', 'bulughul'):
                    words = t.split(' '); allin = True; i = 0
                    # pecah per 8 kata: setiap potongan harus ada di halaman
                    for j in range(0, len(words), 8):
                        if ws(' '.join(words[j:j + 8])) not in P: allin = False; break
                    if allin: ok += 1; segs += 1; continue
                fails.append({'id': r['id'], 'path': r['path'], 'awal': t[:60]})
    rep['sumber'][src] = {'teksArabDiperiksa': tot, 'cocokDenganSumber': ok, 'tidakCocok': tot - ok, 'cocokPerPotongan': segs, 'berharakat': har, 'karakterRusak(U+FFFD)': repl, 'contohTidakCocok': fails[:8]}
    print('%-11s diperiksa %6d  cocok %6d  tidak %4d  (per-potongan %d)  berharakat %6d  rusak %d' % (src, tot, ok, tot - ok, segs, har, repl))
# Al-Qur'an: teks Arab dari Ibnu Katsir harus ada di halaman Ibnu Katsir; gambar ayat lengkap
okq = 0; badq = []
for k, (t, f) in qar.items():
    if ws(t) in page('ibnukatsir', f): okq += 1
    else: badq.append(k)
imgs = len(glob.glob(os.path.join(X, 'quran', 'img', 's*', 'a*.png')))
rep['quran'] = {'ayat': 6236, 'gambarAyatAsli': imgs, 'teksArabDariIbnuKatsir': len(qar), 'teksArabCocokDenganHalamanIbnuKatsir': okq, 'tidakCocok': badq[:20],
                'ayatTanpaTeksArab': [k for k in ('%d:%d' % (s, a) for s in range(1, 115) for a in range(1, 300)) if False]}
AY = [7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6]
rep['quran']['ayatTanpaTeksArab'] = [('%d:%d' % (s, a)) for s in range(1, 115) for a in range(1, AY[s - 1] + 1) if ('%d:%d' % (s, a)) not in qar]
print('quran gambar', imgs, 'teks Arab IK', len(qar), 'cocok', okq, 'tanpa teks', len(rep['quran']['ayatTanpaTeksArab']))
# sampel acak untuk diperiksa manusia
random.seed(11); sample = []
for src in ['kitab9', 'bukhari', 'muslim', 'abudaud', 'bulughul', 'riyadh']:
    L = [json.loads(l) for l in open(os.path.join(DB, src + '.jsonl'), encoding='utf-8')]
    for r in random.sample([x for x in L if x.get('ar')], 2): sample.append({'id': r['id'], 'no': r.get('no'), 'ar': r['ar'][:200], 'tr': (r.get('tr') or '')[:200]})
rep['sampelAcak'] = sample
json.dump(rep, open(os.path.join(DB, '..', 'x', 'validate_arab.json'), 'w'), ensure_ascii=False, indent=1)
