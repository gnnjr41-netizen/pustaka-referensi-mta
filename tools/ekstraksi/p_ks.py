"""Parser format kampungsunnah (Mukhtashar Muslim, Shahih Sunan Abu Daud / Ibnu Majah / Tirmidzi - Albani)."""
import sys, os, re, json, glob
sys.path.insert(0, os.path.dirname(__file__))
from common import *
from collections import Counter

NUM = re.compile(r'^[\}\]\)\.\s«»:;,]*(\d{1,5}(?:\s*-\s*\d{1,5})?)\s*(?:[\.\-,]\s*(?=\S)|\s+(?=[A-Z"“\']))')
FOOT = re.compile(r'^(Copyright|Copyleft|Produksi Kampungsunnah|kampungsunnah\.org|Kampungsunnah\.org|\d\d\.\d\d\.\d{4}, mailto)', re.I)
GW = r"(?:Shahih|Hasan|Dha['’`]?if|Dhaif|Dla['’`]?if|Maudhu['’`]?|Munkar|Syadz|Sanad-?nya\s+(?:shahih|hasan|dha['’`]?if))"
GRADE = re.compile(r"(?:(?<=[\"”'’\.\)\}\]!?])|^)\s*[\(\{\[]?\s*(" + GW +
                   r"(?:\s+(?:Shahih|Lighairihi|Li\s?ghairihi|Mauquf|Maqthu['’`]?|Jiddan|Isnad|Al[\- ]Isnad|Gharib|Marfu['’`]?))*)\s*(?=[\)\}\]\.:,;]|$)")
STOPG = re.compile(r"(\s+(?:Abu Isa|Ia berkata|Dia berkata|Dalam bab|Didalam bab|Di dalam bab|Hadits ini|Diriwayatkan|Kami katakan|Aku katakan|Saya katakan)\b|[\"“”\n])")


PGRADE = re.compile(r"[\(\{]\s*((?i:shahih|hasan|dha['’`]?if|dhaif|maudhu['’`]?|munkar|syadz)[^\(\)\{\}]{0,200})[\)\}]")
def find_grade(tr):
    """Ambil keterangan derajat yang TERTULIS di sumber (gaya Albani), tidak menyimpulkan sendiri."""
    first = tr.split('\n')[0]
    for m in GRADE.finditer(first):
        if m.start() < len(first) * 0.3 and len(first) > 160:
            continue
        if re.search(r'[\(\{\[]\s*$', first[:m.start(1)]):
            close = re.search(r'[\)\}\]]', first[m.start(1):])
            if close and close.start() < 240:
                return first[m.start(1):m.start(1) + close.start()].strip().rstrip(' .,;')
        rest = first[m.start(1):]
        st = STOPG.search(rest, len(m.group(1)))
        seg = rest[:st.start()] if st else rest
        seg = seg[:220]
        seg = re.sub(r'[\s\(\{\[,;:]+$', '', seg).strip()
        if len(seg) > len(m.group(1)) + 1:
            mm = re.match(r'^(.*[\)\.\}])[^\)\.\}]*$', seg)
            if mm: seg = mm.group(1)
        seg = seg.strip(' {}')
        while seg.endswith(')') and seg.count(')') > seg.count('('):
            seg = seg[:-1].rstrip()
        seg = seg.rstrip(' .,;')
        return seg
    pm = None
    for pm in PGRADE.finditer(first): pass
    if pm and pm.start() > len(first) * 0.5: return pm.group(1).strip().rstrip(' .,;')
    return None


def parse_page(p, issues, rel, prep=None, enc_default='cp1256'):
    t, enc, bad = decode(p, enc_default)
    if bad: issues.append(('karakter rusak', rel, bad))
    L = lines(t); ttl = title_of(t)
    if prep: L = prep(L)
    return parse_lines(L, ttl, issues, rel)
def parse_lines(L, ttl, issues, rel):
    hi = -1; head = ''
    nt = re.sub(r'\s+', ' ', ttl or '')
    for i, l in enumerate(L[:14]):
        if is_ar(l): break
        if re.match(r'^\d+\.?$', l) and i + 1 < len(L) and not is_ar(L[i + 1]):
            hi = i + 1; head = l + ' ' + L[i + 1]; break
        if (nt and re.sub(r'\s+', ' ', l) == nt) or (re.match(r'^\d+\.\s+\S', l) and not NUM.match(l + ' X') is None and len(l) < 200 and (not nt or nt.startswith(l[:8]))):
            hi = i; head = l
            j = i + 1
            while j < len(L) and j < i + 3 and not is_ar(L[j]) and not FOOT.match(L[j]) and nt and len(re.sub(r'\s+', ' ', head)) < len(nt):
                head += ' ' + L[j]; hi = j; j += 1
            break
    body = L[hi + 1:] if hi >= 0 else L
    body2 = []
    for l in body:
        if FOOT.match(l): break
        body2.append(l)
    runs = []
    for l in body2:
        a = is_ar(l)
        if not AR.search(l) and not LAT.search(l) and not re.search(r'\d', l) and runs: a = runs[-1][0]  # baris tanda baca saja ikut blok sebelumnya
        if runs and runs[-1][0] == a: runs[-1][1].append(l)
        else: runs.append([a, [l]])
    hads = []; pendingAr = None; intro = []
    for a, ls in runs:
        if a:
            pendingAr = (pendingAr + ' ' if pendingAr else '') + ' '.join(ls)
            continue
        txt = re.sub(r'\s+', ' ', ' '.join(ls)).strip()
        m = NUM.match(txt)
        if m:
            hads.append({'no': re.sub(r'\s+', '', m.group(1)), 'ar': pendingAr or '', 'tr': txt[m.end():].strip()})
            pendingAr = None
        else:
            if hads and pendingAr is None:
                hads[-1]['tr'] += '\n' + txt
            elif pendingAr is not None:
                hads.append({'no': '', 'ar': pendingAr, 'tr': txt}); pendingAr = None
                issues.append(('hadis tanpa nomor di sumber', rel, txt[:60]))
            else:
                intro.append(txt)
    if pendingAr is not None:
        hads.append({'no': '', 'ar': pendingAr, 'tr': ''}); issues.append(('teks Arab tanpa terjemahan', rel, pendingAr[:40]))
    return re.sub(r'\s+', ' ', head).strip(), hads, intro, ttl


def run(code, root, hhc):
    toc, order = parse_hhc(hhc)
    exist = {}
    for p in glob.glob(root + '/**/*.htm*', recursive=True):
        rel = os.path.relpath(p, root).replace('\\', '/'); exist[rel.lower()] = rel
    seq = [k for k in order if k in exist]
    extra = sorted(k for k in exist if k not in toc)
    recs, issues, pages, skipped = [], [], 0, []
    for k in seq + extra:
        rel = exist[k]; p = os.path.join(root, rel)
        chain = toc.get(k, [])
        head, hads, intro, ttl = parse_page(p, issues, rel)
        pages += 1
        if not hads:
            skipped.append((rel, ' '.join(intro)[:120])); continue
        kitab = ''
        for c in chain[:-1]:
            if re.search(r'kitab', c, re.I): kitab = c
        if not kitab and len(chain) >= 2: kitab = chain[-2]
        bab = head or (chain[-1] if chain else ttl)
        for n, h in enumerate(hads, 1):
            g = find_grade(h['tr']) if code != 'muslim' else None
            r = {'id': '%s:%s#%d' % (code, rel, n), 'src': code, 'coll': code, 'kitab': kitab, 'bab': bab, 'no': h['no'],
                 'ar': h['ar'], 'tr': h['tr'], 'path': rel, 'ord': n, 'toc': chain, 'rawi': []}
            if g: r['derajat'] = g
            if intro and n == 1: r['intro'] = '\n'.join(intro)
            recs.append(r)
    return recs, issues, pages, skipped, len(exist), [exist[k] for k in extra]


def report(code, recs, issues, pages, skipped, nfiles, extra):
    print(code, 'html', nfiles, 'pages', pages, 'recs', len(recs), 'skipped(no hadith)', len(skipped), 'not in TOC', len(extra))
    print('  no number', sum(1 for r in recs if not r['no']), 'no ar', sum(1 for r in recs if not r['ar']), 'no tr', sum(1 for r in recs if not r['tr']), 'with derajat', sum(1 for r in recs if r.get('derajat')))
    print('  issues', Counter(i[0] for i in issues))
    print('  skipped sample', skipped[:6])
    print('  derajat sample', Counter((r.get('derajat') or '')[:22] for r in recs).most_common(14))
    json.dump(recs, open('out_%s.json' % code, 'w'), ensure_ascii=False)
    json.dump({'issues': issues, 'skipped': skipped, 'notInToc': extra}, open('iss_%s.json' % code, 'w'), ensure_ascii=False)


if __name__ == '__main__':
    for code, root, hhc in [('muslim', '../chm_x/muslim', 'Mukhtashar Shahih Muslim.hhc'), ('tirmidzi', '../chm_x/tirmidzi', 'Shahih Sunan Tirmidzi.hhc'),
                            ('abudaud', '../chm_x/abudaud', 'Shahih Sunan Abu Daud FIX.hhc'), ('ibnumajah', '../chm_x/ibnumajah', 'shahih sunan Ibnu Majah .hhc')]:
        report(code, *run(code, root, os.path.join(root, hhc)))
