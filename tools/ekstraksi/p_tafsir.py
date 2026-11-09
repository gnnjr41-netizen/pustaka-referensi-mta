"""Tafsir Ibnu Katsir & Tafsir Jalalain → record per halaman (Ibnu Katsir) / per ayat (Jalalain).
Juga mengambil teks Arab ayat dari blok {... (n) ...} Ibnu Katsir untuk pencarian Arab Al-Qur'an."""
import sys, os, re, json, glob, html
sys.path.insert(0, os.path.dirname(__file__))
from common import *
from collections import Counter, defaultdict

AYAT = [7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6]
AR_DIGITS = str.maketrans('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789')


def ibnukatsir():
    ROOT = '../chm_x/ibnukatsir'
    toc, order = parse_hhc(ROOT + '/toc.hhc')
    exist = {os.path.relpath(p, ROOT).lower(): os.path.relpath(p, ROOT) for p in glob.glob(ROOT + '/*.htm')}
    seq = [k for k in order if k in exist] + sorted(k for k in exist if k not in toc)
    recs, issues = [], []
    arab = {}  # (s,a) -> (teks, file)
    stats = Counter()
    for k in seq:
        rel = exist[k]; chain = toc.get(k, [])
        t, enc, bad = decode(os.path.join(ROOT, rel), 'utf-8')
        if bad: issues.append(('karakter rusak', rel, bad))
        L = lines(t)
        ttl = title_of(t) or (chain[-1] if chain else rel)
        if L and L[0] == ttl: L = L[1:]
        if L and L[0].startswith('Tafsir Ibnu Katsir ››'): L = L[1:]
        if not L: issues.append(('halaman kosong', rel)); continue
        s = 0
        for c in chain:
            m = re.match(r'^(\d{1,3})\s*\.\s*SURAT', c, re.I)
            if m: s = int(m.group(1))
        a1 = a2 = 0
        m = re.search(r'ayat\s+(\d+)(?:\s*[-–]\s*(\d+))?', ttl, re.I)
        if m and s: a1 = int(m.group(1)); a2 = int(m.group(2) or a1)
        blocks = []
        for l in L:
            blocks.append(['a' if is_ar(l) else 'p', l])
        recs.append({'id': 'ibnukatsir:%s' % rel, 'src': 'ibnukatsir', 'kind': 'tafsir', 'title': ttl, 'toc': chain, 's': s, 'a1': a1, 'a2': a2,
                     'blocks': blocks, 'path': rel})
        stats['halaman'] += 1
        if s and a1:
            stats['halaman ayat'] += 1
            # blok Arab pertama berisi ayat bernomor (n)
            first = next((b[1] for b in blocks if b[0] == 'a'), None)
            if not first: issues.append(('tidak ada blok Arab ayat', rel)); continue
            txt = first.translate(AR_DIGITS)
            parts = re.split(r'[\(﴿]\s*(\d{1,3})\s*[\)﴾]', txt)
            got = []
            for i in range(1, len(parts), 2):
                n = int(parts[i]); seg = parts[i - 1].strip().lstrip('{').strip()
                got.append((n, seg))
            nums = [n for n, _ in got]
            exp = list(range(a1, a2 + 1))
            if nums == exp and all(seg for _, seg in got):
                for n, seg in got:
                    seg = re.sub(r'\s+', ' ', seg).strip().strip('{}').strip()
                    if (s, n) not in arab: arab[(s, n)] = (seg, rel)
                stats['blok ayat cocok'] += 1
            elif len(exp) == 1 and not nums:
                seg = re.sub(r'\s+', ' ', txt).strip().strip('{}').strip()
                if (s, a1) not in arab: arab[(s, a1)] = (seg, rel)
                stats['blok ayat tunggal tanpa nomor'] += 1
            else:
                stats['blok ayat tidak cocok'] += 1
                issues.append(('nomor ayat di blok Arab tidak cocok dengan judul (tidak dipakai untuk teks ayat)', rel, ttl, nums[:12]))
    return recs, issues, arab, stats


def jalalain():
    ROOT = '../chm_x/jalalain'
    toc, order = parse_hhc(ROOT + '/TAFSIR JALALAIN.hhc')
    exist = {os.path.relpath(p, ROOT).replace('\\', '/').lower(): os.path.relpath(p, ROOT).replace('\\', '/') for p in glob.glob(ROOT + '/**/*.htm', recursive=True)}
    seq = [k for k in order if k in exist] + sorted(k for k in exist if k not in toc)
    recs, issues = [], []
    P = re.compile(r'(?is)<p\b([^>]*)>(.*?)(?=<p\b|</td>|$)')
    for k in seq:
        rel = exist[k]; chain = toc.get(k, [])
        m = re.match(r'^(\d{3})\.', rel)
        if not m or m.group(1) == '000':
            continue
        s = int(m.group(1))
        raw = open(os.path.join(ROOT, rel), 'rb').read().decode('cp1252', 'replace')
        bad = raw.count('�')
        if bad: issues.append(('karakter rusak', rel, bad))
        body = raw[raw.find('mainbody'):] if 'mainbody' in raw else raw
        paras = []
        for pm in P.finditer(body):
            attrs, inner = pm.group(1), pm.group(2)
            text = ' '.join(lines(inner))
            if not text.strip(): continue
            if re.search(r'©\s*1431|rabbany1981', text): continue
            if is_ar(text) or 'rtl' in attrs.lower():
                segs = []
                for part in re.split(r'(?is)(<font[^>]*color="#FF0000"[^>]*>.*?</font>)', inner):
                    if not part.strip(): continue
                    red = bool(re.match(r'(?is)<font[^>]*color="#FF0000"', part))
                    tx = ' '.join(lines(part))
                    if tx.strip(): segs.append([1 if red else 0, tx])
                paras.append(('a', text, segs))
            else:
                paras.append(('p', text, None))
        cur_ar = []; n_in = 0
        for typ, text, segs in paras:
            if typ == 'a':
                cur_ar.append((text, segs)); continue
            mm = re.match(r'^(\d{1,3})\s*\.\s*(.*)$', text, re.S)
            if mm and 1 <= int(mm.group(1)) <= AYAT[s - 1]:
                a = int(mm.group(1)); n_in += 1
                recs.append({'id': 'jalalain:%d:%d' % (s, a), 'src': 'jalalain', 'kind': 'tafsir', 's': s, 'a': a, 'title': chain[-1] if chain else rel,
                             'toc': chain, 'ar': ' '.join(x[0] for x in cur_ar), 'arSeg': [sg for x in cur_ar for sg in (x[1] or [])], 'tr': mm.group(2).strip(), 'path': rel})
                cur_ar = []
            else:
                if recs and recs[-1]['path'] == rel and not cur_ar:
                    recs[-1]['tr'] += '\n' + text
                else:
                    issues.append(('paragraf tanpa nomor ayat', rel, text[:60])); cur_ar = []
        if not n_in: issues.append(('halaman tanpa ayat', rel))
    return recs, issues


if __name__ == '__main__':
    R, I, arab, st = ibnukatsir()
    print('IBNU KATSIR halaman', len(R), dict(st), 'issues', Counter(x[0] for x in I))
    print('  teks Arab ayat terkumpul', len(arab), 'dari 6236')
    per = Counter(s for s, a in arab)
    print('  surat dengan cakupan penuh', sum(1 for s in range(1, 115) if per[s] == AYAT[s - 1]), 'surat tanpa sama sekali', [s for s in range(1, 115) if not per[s]][:40])
    json.dump(R, open('out_ibnukatsir.json', 'w'), ensure_ascii=False)
    json.dump({'%d:%d' % k: v for k, v in arab.items()}, open('out_quran_ar_ibnukatsir.json', 'w'), ensure_ascii=False)
    json.dump({'issues': I, 'stats': st}, open('iss_ibnukatsir.json', 'w'), ensure_ascii=False)
    J, JI = jalalain()
    c = Counter((r['s'], r['a']) for r in J)
    print('JALALAIN ayat', len(J), 'uniq', len(c), 'dup', sum(1 for v in c.values() if v > 1), 'issues', Counter(x[0] for x in JI))
    miss = [(s, a) for s in range(1, 115) for a in range(1, AYAT[s - 1] + 1) if (s, a) not in c]
    print('  ayat tidak ditemukan', len(miss), miss[:30])
    json.dump(J, open('out_jalalain.json', 'w'), ensure_ascii=False); json.dump({'issues': JI, 'missing': miss}, open('iss_jalalain.json', 'w'), ensure_ascii=False)
