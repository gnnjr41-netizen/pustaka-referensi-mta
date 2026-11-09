"""Pelatihan Gurda 2142.chm → satu record per halaman, isi dipecah per paragraf (blok) dengan jenis:
'h' judul/subjudul, 'a' teks Arab, 'p' paragraf. Judul halaman & rantai daftar isi dipertahankan."""
import sys, os, re, json, glob, html
sys.path.insert(0, os.path.dirname(__file__))
from common import decode, parse_hhc, is_ar, AR, LAT
from collections import Counter
ROOT = os.path.join(os.path.dirname(__file__), '..', 'chm_x', 'gurda')
P_RE = re.compile(r'(?is)<(p|h[1-6]|li|td|div)\b([^>]*)>(.*?)(?=<(?:/?(?:p|h[1-6]|li|td|tr|table|div)\b))')


def clean(inner):
    t = re.sub(r'(?is)<!--.*?-->', ' ', inner)
    t = re.sub(r'(?is)<br\b[^>]*>', '\n', t)
    t = re.sub(r'(?s)<[^>]+>', '', t)          # tag dibuang tanpa menyisipkan spasi (teks Arab bersambung antar span)
    t = html.unescape(t).replace('\xa0', ' ')
    t = re.sub(r'[ \t\r]*\n[ \t\r]*', ' ', t)    # baris baru di sumber HTML = bungkus baris Word → spasi
    t = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', t)
    return re.sub(r'\s+', ' ', t).strip()


def kind(text, inner):
    if is_ar(text): return 'a'
    letters = re.sub(r'[^A-Za-z]', '', text)
    if letters and len(text) <= 100 and not re.search(r'[\.,;:]$', text):
        up = sum(1 for c in letters if c.isupper()) / len(letters)
        if up > 0.75 and len(letters) >= 4: return 'h'
        if re.search(r'(?is)^\s*(<[^>]+>\s*)*<b\b', inner) and re.search(r'(?is)</b>\s*(<[^>]+>\s*)*$', inner) and len(text) <= 80: return 'h'
    return 'p'


def parse():
    toc, order = parse_hhc(os.path.join(ROOT, 'help.hhc'))
    exist = {os.path.basename(p).lower(): os.path.basename(p) for p in glob.glob(ROOT + '/*.htm')}
    seq = [k for k in order if k in exist] + sorted(k for k in exist if k not in toc)
    recs, issues = [], []
    for n, k in enumerate(seq, 1):
        rel = exist[k]; chain = toc.get(k, [])
        t, enc, bad = decode(os.path.join(ROOT, rel), 'utf-8')
        if bad: issues.append(('karakter rusak', rel, bad))
        m = re.search(r'(?is)id="winchm_template_content"[^>]*>(.*)$', t)
        body = m.group(1) if m else t
        body = re.sub(r'(?is)<(script|style)\b.*?</\1>', ' ', body) + '<p>'
        blocks = []
        for pm in P_RE.finditer(body):
            txt = clean(pm.group(3))
            if not txt or not (AR.search(txt) or LAT.search(txt) or re.search(r'\d', txt)): continue
            blocks.append([kind(txt, pm.group(3)), txt, pm.group(1).lower()])
        # gabungkan baris tanda baca/angka saja ke blok sebelumnya (mis. "43 و المائدة:6" tetap utuh)
        merged = []
        for b in blocks:
            # sel tabel (td) tidak digabung dengan sel lain
            if merged and not LAT.search(b[1]) and not AR.search(b[1]) and not re.search(r'\d', b[1]): merged[-1][1] += ' ' + b[1]; continue
            merged.append(b)
        merged = [[b[0], b[1]] for b in merged]
        title = chain[-1] if chain else re.sub(r'\.htm$', '', rel)
        if not merged: issues.append(('halaman tanpa isi', rel)); continue
        recs.append({'id': 'gurda:%s' % rel, 'src': 'gurda', 'kind': 'materi', 'title': title, 'toc': chain, 'blocks': merged, 'path': rel, 'ord': n})
    return recs, issues


if __name__ == '__main__':
    recs, issues = parse()
    c = Counter(b[0] for r in recs for b in r['blocks'])
    print('halaman', len(recs), 'blok', sum(len(r['blocks']) for r in recs), dict(c), 'issues', issues)
    for r in recs: print('  %-62s %4d blok  judul: %s' % (r['title'][:62], len(r['blocks']), ' | '.join(b[1][:40] for b in r['blocks'] if b[0] == 'h')[:110]))
    json.dump(recs, open(os.path.join(os.path.dirname(__file__), 'out_gurda.json'), 'w'), ensure_ascii=False)
    json.dump({'issues': issues}, open(os.path.join(os.path.dirname(__file__), 'iss_gurda.json'), 'w'), ensure_ascii=False)
