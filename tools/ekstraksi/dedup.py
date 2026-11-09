"""Deteksi duplikasi & hubungan antar riwayat.
- identik  : teks Arab sama persis setelah normalisasi spasi/tanda baca (harakat DIPERTAHANKAN), atau
             teks Arab tanpa harakat sama DAN koleksi imam + nomor hadis sama.  → boleh digabung di daftar hasil (sumber tetap terpisah).
- mirip    : kemiripan isi (containment shingle 4 kata tanpa harakat) ≥ 60%. → TIDAK digabung; ditampilkan sebagai "riwayat serupa".
Tidak menghapus apa pun. Hasil: db/relations.json
"""
import json, os, re, sys, hashlib, time
import numpy as np
from collections import defaultdict, Counter
HERE = os.path.dirname(os.path.abspath(__file__)); DB = os.path.join(HERE, '..', 'db')
HAD = ['bulughul', 'riyadh', 'kitab9', 'bukhari', 'muslim', 'abudaud', 'ibnumajah', 'tirmidzi', 'nasai', 'darimi']
HARAKAT = re.compile(r'[ؐ-ًؚ-ٰٟۖ-ۭـ]')
NONAR = re.compile(r'[^ء-ي٠-٩\s]')
def base(s):
    s = HARAKAT.sub('', s)
    s = re.sub(r'[آأإٱ]', 'ا', s).replace('ى', 'ي').replace('ة', 'ه').replace('ؤ', 'و').replace('ئ', 'ي')
    s = NONAR.sub(' ', s)
    return re.sub(r'\s+', ' ', s).strip()
def withh(s):
    return re.sub(r'\s+', ' ', re.sub(r'[^؀-ۿ\s]', ' ', s)).strip()
def main():
    t0 = time.time()
    recs = []
    for c in HAD:
        for ln in open(os.path.join(DB, c + '.jsonl'), encoding='utf-8'):
            r = json.loads(ln)
            if r.get('kind') == 'teks' or not r.get('ar'): continue
            recs.append((r['i'], c, r.get('coll'), r.get('no', ''), r['ar']))
    print('hadis dengan teks Arab', len(recs))
    B = [base(x[4]) for x in recs]
    H = [withh(x[4]) for x in recs]
    # ---------- identik ----------
    parent = {}
    def find(a):
        while parent.get(a, a) != a: a = parent[a]
        return a
    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb: parent[max(ra, rb)] = min(ra, rb)
    byH = defaultdict(list)
    for k, h in enumerate(H):
        if len(h) >= 15: byH[hashlib.sha1(h.encode()).digest()].append(k)
    for g in byH.values():
        for k in g[1:]: union(g[0], k)
    byB = defaultdict(list)
    for k, b in enumerate(B):
        if len(b) >= 15 and recs[k][3]: byB[(hashlib.sha1(b.encode()).digest(), recs[k][2], recs[k][3])].append(k)
    for g in byB.values():
        for k in g[1:]: union(g[0], k)
    groups = defaultdict(list)
    for k in range(len(recs)): groups[find(k)].append(k)
    ident = [g for g in groups.values() if len(g) > 1]
    print('grup identik', len(ident), 'record dalam grup', sum(len(g) for g in ident))
    gc = Counter(tuple(sorted(set(recs[k][1] for k in g))) for g in ident)
    print('  pasangan sumber', gc.most_common(8))
    # ---------- mirip (containment) ----------
    SAW = '\u0635\u0644\u064a \u0627\u0644\u0644\u0647 \u0639\u0644\u064a\u0647 \u0648\u0633\u0644\u0645'  # صلي الله عليه وسلم (setelah normalisasi)
    def matn(b):
        # perkiraan matan: teks setelah penyebutan pertama "صلى الله عليه وسلم" (jika berada di 70% awal); selain itu seluruh teks
        k = b.find(SAW)
        return b[k + len(SAW):] if 0 <= k < len(b) * 0.7 else b
    W = [matn(b).split(' ') for b in B]
    sh_h, sh_d = [], []
    nsh = np.zeros(len(recs), dtype=np.int32)
    for k, w in enumerate(W):
        if len(w) < 5: continue
        hs = set()
        for j in range(len(w) - 2):
            hs.add(hash(' '.join(w[j:j + 3])) & 0x7FFFFFFFFFFFFFFF)
        nsh[k] = len(hs)
        sh_h.extend(hs); sh_d.extend([k] * len(hs))
    sh_h = np.array(sh_h, dtype=np.int64); sh_d = np.array(sh_d, dtype=np.int32)
    order = np.argsort(sh_h, kind='stable'); sh_h = sh_h[order]; sh_d = sh_d[order]
    bnd = np.flatnonzero(np.diff(sh_h)) + 1
    starts = np.concatenate([[0], bnd]); ends = np.concatenate([bnd, [len(sh_h)]])
    df = ends - starts
    print('shingle', len(sh_h), 'unik', len(df), 'df>1', int((df > 1).sum()), 't=%.1fs' % (time.time() - t0))
    MAXDF = 120
    dfocc = np.repeat(df, df)
    ninf = np.bincount(sh_d[dfocc <= MAXDF], minlength=len(recs))
    pair = Counter()
    sel = np.flatnonzero((df > 1) & (df <= MAXDF))
    for gi in sel:
        ds = np.unique(sh_d[starts[gi]:ends[gi]])
        if len(ds) < 2: continue
        L = ds.tolist()
        for x in range(len(L)):
            a = L[x]
            for y in range(x + 1, len(L)):
                pair[(a << 20) | L[y]] += 1
    print('pasangan kandidat', len(pair), 't=%.1fs' % (time.time() - t0))
    rel = defaultdict(list)
    ident_of = {}
    for gid, g in enumerate(ident):
        for k in g: ident_of[k] = gid
    nm = 0
    for key, cnt in pair.items():
        a, b = key >> 20, key & 0xFFFFF
        if cnt < 4: continue
        m = min(ninf[a], ninf[b])
        if m < 5 or cnt / m < 0.4: continue
        if ident_of.get(a, -1) == ident_of.get(b, -2): continue
        sim = round(cnt / m * 100)
        # kontainmen diukur dari shingle df<=120 saja → nilai minimal (konservatif)
        rel[a].append((b, sim)); rel[b].append((a, sim)); nm += 1
    print('pasangan mirip', nm, 't=%.1fs' % (time.time() - t0))
    out = {'method': {'identik': 'teks Arab sama persis (harakat dipertahankan, hanya spasi/tanda baca dinormalkan), atau teks Arab tanpa harakat sama + koleksi & nomor hadis sama',
                      'mirip': 'kemiripan matan ≥40%: perkiraan matan = teks Arab (tanpa harakat) setelah penyebutan pertama صلى الله عليه وسلم; dihitung proporsi rangkaian 3 kata dari matan yang lebih pendek yang juga terdapat pada matan lainnya; rangkaian sangat umum (muncul di >120 hadis) tidak dihitung; minimal 4 rangkaian sama. Hanya penanda kemiripan teks, bukan penetapan takhrij.'},
           'ident': [[recs[k][0] for k in sorted(g)] for g in ident], 'similar': {}}
    for k, lst in rel.items():
        lst.sort(key=lambda x: -x[1])
        out['similar'][recs[k][0]] = [[recs[b][0], s] for b, s in lst[:12]]
    stats = {'hadisArab': len(recs), 'grupIdentik': len(ident), 'recordIdentik': sum(len(g) for g in ident), 'recordPunyaMirip': len(rel), 'pasanganMirip': nm,
             'pasanganSumberIdentik': [[list(k), v] for k, v in gc.most_common()]}
    out['stats'] = stats
    json.dump(out, open(os.path.join(DB, 'relations.json'), 'w'), ensure_ascii=False)
    print(json.dumps(stats, ensure_ascii=False)[:1200])
if __name__ == '__main__':
    main()
