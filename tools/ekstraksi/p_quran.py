import sys, os, re, json, glob, html
sys.path.insert(0, os.path.dirname(__file__))
from common import *
ROOT = '../chm_x/quran'
def txt(h):
    h = re.sub(r'(?is)<sup>\s*<b>\s*\[(\d+)\]\s*</b>\s*</sup>', r'[\1]', h)
    return '\n'.join(lines(h))
# daftar surat (nama & jumlah ayat) dari i_surat.htm
t, _, _ = decode(ROOT + '/i_surat.htm')
SUR = {}
for m in re.finditer(r'(?is)<td>(\d+)</td>\s*<td[^>]*><a class="col" href=s(\d{3})a001\.htm>([^<]+)</a></td>\s*<td>(\d+)</td>', t):
    SUR[int(m.group(1))] = (html.unescape(m.group(3)).strip(), int(m.group(4)))
print('surat', len(SUR), sum(v[1] for v in SUR.values()))
name2no = {v[0].lower(): k for k, v in SUR.items()}
# juz dari i_juz.htm
t, _, _ = decode(ROOT + '/i_juz.htm')
juz = []
for n, m in enumerate(re.finditer(r'href=s(\d{3})a(\d{3})\.htm', t), 1): juz.append((n, int(m.group(1)), int(m.group(2))))
print('juz (indeks)', len(juz))
# penanda "JUZ n" di halaman ayat
marks = {}
for p in glob.glob(ROOT + '/s*a*.htm'):
    tt = open(p, 'rb').read().decode('utf-8', 'replace')
    mm = re.search(r'JUZ\s+(\d+)', tt)
    if mm:
        f = os.path.basename(p); marks[int(mm.group(1))] = (int(f[1:4]), int(f[5:8]))
diff = [(n, (js, ja), marks.get(n)) for n, js, ja in juz if marks.get(n) != (js, ja)]
print('penanda JUZ di halaman', len(marks), 'beda dengan indeks', diff)
JUZDIFF = diff
juz = sorted((n, v[0], v[1]) for n, v in marks.items())  # pakai penanda di halaman ayat
def juz_of(s, a):
    j = None
    for n, js, ja in juz:
        if (s, a) >= (js, ja): j = n
    return j
recs, issues = [], []
for s in range(1, 115):
    for a in range(1, SUR[s][1] + 1):
        fn = 's%03da%03d.htm' % (s, a); p = os.path.join(ROOT, fn)
        if not os.path.exists(p): issues.append(('file ayat tidak ada', fn)); continue
        t, enc, bad = decode(p)
        if bad: issues.append(('karakter rusak', fn, bad))
        m1 = re.search(r'(?is)class="row1"[^>]*>(.*?)</td>', t)
        m2 = re.search(r'(?is)class="row2"[^>]*>(.*?)</td>', t)
        row1 = m1.group(1) if m1 else ''
        row1 = re.sub(r'(?is)<script.*?</script>|<layer.*?</layer>', '', row1)
        img = re.search(r'(?is)<img[^>]*src="(img/s%03d/a%03d\.png)"[^>]*>' % (s, a), row1)
        if not img: issues.append(('gambar ayat tidak ditemukan', fn))
        pre, post = (row1[:img.start()], row1[img.end():]) if img else ('', row1)
        topics = [re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', x))).strip() for x in re.findall(r'(?is)<i>(.*?)</i>', pre)]
        topics = [x for x in topics if x]
        pl = txt(post).split('\n'); fi = next((i for i, x in enumerate(pl) if re.match(r'^\[\d+\]', x)), len(pl))
        tr = re.sub(r'\s+', ' ', ' '.join(pl[:fi])).strip(); foot0 = '\n'.join(pl[fi:]).strip()
        mm = re.match(r'^([\dO]+)\.\s*(.*)$', tr, re.S)
        if not mm or int(mm.group(1).replace('O', '0')) != a: issues.append(('nomor ayat pada terjemahan tidak cocok', fn, tr[:40]))
        else: tr = mm.group(2).strip()
        foot = txt(m2.group(1)) if m2 else ''
        foot = (foot0 + '\n' + foot).strip() if foot0 else foot
        foot = re.sub(r'\s*\n\s*(?=\[\d+\])', '\n', re.sub(r'(?<!\n)\n(?!\[\d+\])', ' ', foot)).strip()
        foot = re.sub(r'\n?\b%d\s*$' % SUR[s][1], '', foot).strip() if foot else ''
        if not tr: issues.append(('terjemahan kosong', fn))
        recs.append({'id': 'quran:%d:%d' % (s, a), 'src': 'quran', 'kind': 'ayat', 's': s, 'a': a, 'surah': SUR[s][0], 'nAyat': SUR[s][1], 'juz': juz_of(s, a),
                     'topik': topics, 'tr': tr, 'catatan': foot, 'img': img.group(1) if img else '', 'path': fn})
print('ayat', len(recs), 'issues', len(issues), issues[:10])
print('juz none', sum(1 for r in recs if not r['juz']), 'with topik', sum(1 for r in recs if r['topik']), 'with catatan', sum(1 for r in recs if r['catatan']))
# indeks tema
tema = []
for p in sorted(glob.glob(ROOT + '/i0*.htm')):
    t, _, _ = decode(p); ttl = title_of(t)
    cur1 = ''
    for m in re.finditer(r'(?is)<li class="(one|two)">(.*?)(?=<li class=|</ul>|$)', t):
        kind, body = m.group(1), m.group(2)
        refs = re.findall(r'href="s(\d{3})a(\d{3})\.htm"', body)
        label = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', re.split(r'(?i)<a href="s\d', body)[0]))).strip().rstrip(':').strip()
        if kind == 'one': cur1 = label
        if refs:
            tema.append({'id': 'qtema:%s:%d' % (os.path.basename(p), len(tema) + 1), 'src': 'quran', 'kind': 'tema', 'tema': ttl, 'sub': cur1 if kind == 'two' else '', 'label': label,
                         'refs': [[int(x), int(y)] for x, y in refs], 'path': os.path.basename(p)})
print('tema entries', len(tema), sum(len(x['refs']) for x in tema)); print(tema[0])
json.dump(recs, open('out_quran.json', 'w'), ensure_ascii=False); json.dump(tema, open('out_qtema.json', 'w'), ensure_ascii=False)
json.dump({'issues': issues, 'juzDiff': JUZDIFF}, open('iss_quran.json', 'w'), ensure_ascii=False)
print(json.dumps(recs[1+7+182], ensure_ascii=False))
