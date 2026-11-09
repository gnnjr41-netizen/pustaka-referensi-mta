import sys, os, re, json, glob
sys.path.insert(0, os.path.dirname(__file__))
from common import *
BOIL = re.compile(r'^(KITAB SHAHIH BUKHARI|KITAB SUNAN AD-DARIMI|\*|Kompilasi Chm oleh:?|Abu Ahmad as Sidokare\s*\*?|Kompilasi Chm oleh: Abu Ahmad as Sidokare\s*\*?)$', re.I)
BAB = re.compile(r'^Bab\s*:\s*(.*)$', re.I)
NO = re.compile(r'^No\.?\s*Hadi[st]+\s*:\s*(\d+)\s*(.*)$', re.I)
def clean_lines(L):
    out = []
    for l in L:
        if BOIL.match(l): continue
        l = re.sub(r'^\*?\s*Kompilasi Chm oleh:?\s*Abu Ahmad as Sidokare\s*\*?\s*', '', l).strip()
        if l: out.append(l)
    return out
def join_lines(seq):
    # gabungkan baris; Arab dengan spasi, latin sebagai paragraf.
    # Baris tanpa huruf (mis. "{" atau ")") ikut kelompok sebelumnya agar tidak ada karakter yang hilang.
    ar, tr = [], []; last = None
    for l in seq:
        if not AR.search(l) and not LAT.search(l) and last is not None:
            last.append(l); continue
        last = ar if is_ar(l) else tr
        last.append(l)
    return ar, tr
def parse_file(p, relpath, issues, kitabName):
    t, enc, bad = decode(p, 'cp1252')
    if bad: issues.append(('karakter rusak', relpath, bad))
    L = clean_lines(lines(t))
    S = '\n'.join(L)
    S = re.sub(r'Kompilasi\s+Chm\s+oleh:?\s*Abu\s+Ahmad\s+as\s+Sidokare\s*\*?', '\n', S)
    S = re.sub(r'(?m)^\s*Kompilasi\s+Chm\s+oleh:?\s*Abu\s+Ahmad\s+as\s*$', '', S)
    S = re.sub(r'(?m)^\s*Sidokare\s*\*?\s*$', '', S)
    MK = re.compile(r'(No\.?\s*Hadi[st]+\s*[:;.]?\s*(\d+))|((?<![A-Za-z])Bab\s*:\s*)')
    toks = []; pos = 0
    for m in MK.finditer(S):
        toks.append(('txt', S[pos:m.start()]))
        toks.append(('no', m.group(2)) if m.group(1) else ('bab', None))
        pos = m.end()
    toks.append(('txt', S[pos:]))
    recs = []; cur = None; pendingBab = None; pre = []
    def segl(s): return [x.strip() for x in s.split('\n') if x.strip()]
    i = 0
    while i < len(toks):
        k, v = toks[i]
        if k == 'bab':
            txt = segl(toks[i + 1][1]) if i + 1 < len(toks) and toks[i + 1][0] == 'txt' else []
            babL = []; rest = []
            for j, l in enumerate(txt):
                if is_ar(l): rest = txt[j:]; break
                babL.append(l)
            babT = re.sub(r'\s+', ' ', ' '.join(babL)).strip()
            if cur is not None and not cur['bab'] and not cur['body']:
                cur['bab'] = babT
            else:
                pendingBab = babT
            if cur is not None and rest: cur['body'].extend(rest)
            i += 2; continue
        if k == 'no':
            if cur is not None: recs.append(cur)
            cur = {'no': v, 'bab': pendingBab or '', 'kitab': kitabName, 'body': []}
            pendingBab = None; i += 1; continue
        if cur is None: pre.extend(segl(v))
        else: cur['body'].extend(segl(v))
        i += 1
    if cur is not None: recs.append(cur)
    out = []
    for r in recs:
        ar, tr = join_lines(r.pop('body'))
        r['ar'] = ' '.join(ar).strip(); r['tr'] = re.sub(r'\s+', ' ', ' '.join(tr)).strip()
        if not r['ar'] and not r['tr']: issues.append(('hadis kosong', relpath, r['no'])); continue
        out.append(r)
    last = ''
    for r in out:
        if r['bab']: last = r['bab']
        elif last: r['bab'] = last; r['babInherited'] = True
    return out, pre
def run(code, root, files, kitab_of):
    recs, issues = [], []
    for p in files:
        rel = os.path.relpath(p, root)
        rs, pre = parse_file(p, rel, issues, kitab_of(rel))
        if not rs: issues.append(('tanpa hadis', rel, ' | '.join(pre)[:120]))
        for k, r in enumerate(rs, 1):
            r.update({'id': '%s:%s#%d' % (code, rel, k), 'src': code, 'path': rel, 'ord': k})
            r['rawi'] = []
            recs.append(r)
    return recs, issues
