"""Bangun indeks makna lokal (vektor kata domain + vektor potongan teks) untuk Pustaka Referensi MTA v3.2.

Semua dihitung dari database V3.1 yang sebenarnya (passages_v.jsonl dari build_passages.js) dan model vektor kata
yang dilatih dari teks database itu sendiri (train_w2v.py). Indeks hanya berisi angka dan rujukan ke record/blok
sumber — tidak ada teks baru yang dibuat.

Pakai:
  python3 -I build_vektor.py <folder-aplikasi> <passages_v.jsonl> <model_id> <model_bilingual> <toks.js> <folder-keluaran>
Keluaran (folder-keluaran, biasanya data/kitab/vektor/):
  meta.js          versi, parameter kueri (u, mu, C), daftar pecahan + checksum
  k/<n>.js         kamus vektor kata (64 pecahan, berdasarkan hash kata) + kata terdekat
  a/<n>.js         padanan kata Arab → kata Indonesia terdekat (dari model dwibahasa)
  d/<nama>.js      vektor potongan teks per sumber (int8, 64 dimensi) + rujukan record/blok
"""
import sys, os, json, base64, hashlib, subprocess, time, re
import numpy as np
from gensim.models import Word2Vec, KeyedVectors

APP, PAS, MID, MBI, TOKJS, OUT = sys.argv[1:7]
DIM = 64          # dimensi vektor dokumen setelah PCA (uji: 64 = setara 128 pada set uji)
SIF_A = 1e-3      # bobot SIF a/(a+p(w))
NSHARD = 64       # jumlah pecahan kamus vektor kata
NB_K, NB_MIN, NB_CNT = 8, 0.50, 8   # kata terdekat: maks 8, kemiripan ≥ 0,50, frekuensi kata ≥ 8
AR_K, AR_MIN, AR_CNT = 6, 0.45, 5   # padanan Arab → Indonesia
VER = time.strftime('%Y%m%d%H%M')
t0 = time.time()
AR = re.compile(r'[؀-ۿ]')


def fnv(s):  # FNV-1a 32-bit atas unit UTF-16 (identik dengan perhitungan JS charCodeAt)
    h = 0x811c9dc5
    e = s.encode('utf-16-le')
    for b in range(0, len(e), 2):
        h ^= e[b] | (e[b + 1] << 8)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


def b64(a):
    return base64.b64encode(np.ascontiguousarray(a).tobytes()).decode('ascii')


def js_write(rel, call, obj):
    s = call + '(' + json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + ');\n'
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    data = s.encode('utf-8')
    open(path, 'wb').write(data)
    return {'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}


def payload_hash(*parts):  # hash isi (dicek ulang di browser bila crypto.subtle tersedia)
    return hashlib.sha256(''.join(parts).encode('ascii')).hexdigest()


def load_js_array(path, marker):
    s = open(path, encoding='utf-8').read()
    i = s.index(marker) + len(marker)
    return json.JSONDecoder().raw_decode(s[i:])[0]


def load_kv(path):  # model gensim lengkap (.model) atau hanya vektor kata (.kv)
    try: return Word2Vec.load(path).wv
    except Exception: return KeyedVectors.load(path)


wv = load_kv(MID)
cnt = np.array([wv.get_vecattr(w, 'count') for w in wv.index_to_key], dtype=np.float64); tot = cnt.sum()
sifw = (SIF_A / (SIF_A + cnt / tot)).astype(np.float32)
W = wv.vectors.astype(np.float32)
k2i = wv.key_to_index

# ---------- 1. token tiap potongan (via Node: PRMQ.toks = normalisasi & ejaan aplikasi) ----------
pas = [json.loads(l) for l in open(PAS, encoding='utf-8')]
p = subprocess.run(['node', TOKJS, APP], input='\n'.join(x['text'].replace('\n', ' ') for x in pas), capture_output=True, text=True, check=True)
TOK = p.stdout.split('\n')[:len(pas)]
assert len(TOK) == len(pas)
print('token selesai', round(time.time() - t0), 's', flush=True)

# ---------- 2. vektor SIF dokumen → buang komponen utama → PCA 64 → int8 ----------
X = np.zeros((len(pas), W.shape[1]), np.float32); empty = 0
for k, line in enumerate(TOK):
    ids = [k2i[t] for t in line.split() if t in k2i]
    if not ids:
        empty += 1; continue
    X[k] = (sifw[ids, None] * W[ids]).sum(0)
ok = np.linalg.norm(X, axis=1) > 0
u = np.linalg.svd(X[ok], full_matrices=False)[2][0].astype(np.float32)
X -= np.outer(X @ u, u)
nrm = np.linalg.norm(X, axis=1, keepdims=True); X = np.where(nrm > 0, X / np.maximum(nrm, 1e-9), 0).astype(np.float32)
mu = X[ok].mean(0).astype(np.float32)
C = np.linalg.svd(X[ok] - mu, full_matrices=False)[2][:DIM].T.astype(np.float32)  # 128×64
Y = (X - mu) @ C
nrm = np.linalg.norm(Y, axis=1, keepdims=True); Y = np.where(nrm > 0, Y / np.maximum(nrm, 1e-9), 0)
Y[~ok] = 0
mx = np.abs(Y).max(1); sc = np.where(mx > 0, mx / 127.0, 0.0).astype(np.float32)
Q8 = np.round(Y / np.where(sc > 0, sc, 1)[:, None]).astype(np.int8)
print('vektor dokumen', Y.shape, 'tanpa kata dikenal', empty, round(time.time() - t0), 's', flush=True)

# ---------- 3. rujukan & pecahan dokumen ----------
docs = load_js_array(os.path.join(APP, 'data/chm_docs.js'), 'PRM_DATA.docs=')
dIdx = {d['id']: k for k, d in enumerate(docs)}
pdfs = load_js_array(os.path.join(APP, 'data/pdf_seed.js'), 'PRM_DATA.pdfs=')
pIdx = {d['file']: k for k, d in enumerate(pdfs)}
HADIS = {'bulughul', 'riyadh', 'kitab9', 'bukhari', 'muslim', 'abudaud', 'ibnumajah', 'tirmidzi', 'nasai', 'darimi'}


def shard_of(x):
    s = x['src']
    if s == 'kitab9':  # Kitab 9 Imam dipecah tiga agar dimuat bertahap
        return 'k9-' + str((x['i'] - 18549) * 3 // 62198)
    if s in HADIS: return 'hadis'
    return s  # quran, qtema, jalalain, ibnukatsir, gurda, chm, pdf


groups = {}
for k, x in enumerate(pas):
    groups.setdefault(shard_of(x), []).append(k)
CAT = {'quran': 'quran', 'qtema': 'quran', 'jalalain': 'tafsir', 'ibnukatsir': 'tafsir', 'gurda': 'materi', 'chm': 'brosur', 'pdf': 'brosur', 'hadis': 'hadis', 'k9-0': 'hadis', 'k9-1': 'hadis', 'k9-2': 'hadis'}
meta_d = {}
for name, idx in sorted(groups.items()):
    idx = np.array(idx)
    ref = np.zeros((len(idx), 3), np.int32)  # [record kitab | dokumen brosur, blok awal, blok akhir]
    for r, k in enumerate(idx):
        x = pas[k]
        if x['src'] == 'chm': a = dIdx[x['d']]
        elif x['src'] == 'pdf': a = pIdx[x['d']]
        else: a = x['i']
        ref[r] = (a, x.get('b0', -1), x.get('b1', -1))
    R, S, V = b64(ref), b64(sc[idx]), b64(Q8[idx])
    info = js_write('d/' + name + '.js', 'PRMV.d', {'ver': VER, 'name': name, 'n': int(len(idx)), 'dim': DIM, 'ref': R, 'sc': S, 'v': V, 'h': payload_hash(R, S, V)})
    meta_d[name] = dict(info, n=int(len(idx)), cat=CAT[name], h=payload_hash(R, S, V))
    print('  pecahan', name, len(idx), info['bytes'] // 1024, 'KB', flush=True)

# ---------- 4. kamus vektor kata + kata terdekat ----------
STOPS = set('yang dan di ke dari untuk dengan itu ini adalah ialah dalam pada kepada oleh atau juga akan sudah telah kami kita kamu engkau mereka dia ia aku saya'.split())
good = np.array([w not in STOPS and cnt[k] >= NB_CNT and len(w) >= 3 for k, w in enumerate(wv.index_to_key)])
Wn = W / np.linalg.norm(W, axis=1, keepdims=True)
Gi = np.where(good)[0]; Gn = Wn[Gi]
wmx = np.abs(W).max(1); wsc = (wmx / 127.0).astype(np.float32); W8 = np.round(W / wsc[:, None]).astype(np.int8)
shards = [[] for _ in range(NSHARD)]
for k, w in enumerate(wv.index_to_key):
    shards[fnv(w) % NSHARD].append(k)
meta_k = {}
for h, ks in enumerate(shards):
    ks = np.array(ks, dtype=np.int64)
    sims = Wn[ks] @ Gn.T
    nbs = []
    for r, k in enumerate(ks):
        s = sims[r]; s[Gi == k] = -1
        top = np.argpartition(-s, NB_K)[:NB_K]; top = top[np.argsort(-s[top])]
        nbs.append(','.join(f"{wv.index_to_key[Gi[j]]} {int(round(s[j] * 100))}" for j in top if s[j] >= NB_MIN))
    words = [wv.index_to_key[k] for k in ks]
    Vb, Sb = b64(W8[ks]), b64(wsc[ks])
    obj = {'ver': VER, 'n': int(len(ks)), 'dim': int(W.shape[1]), 'w': words, 'f': [round(float(sifw[k]), 4) for k in ks], 'nb': nbs, 'sc': Sb, 'v': Vb, 'h': payload_hash(Vb, Sb)}
    meta_k[str(h)] = dict(js_write('k/' + str(h) + '.js', 'PRMV.k', dict(obj, key=h)), n=int(len(ks)), h=obj['h'])
print('kamus vektor kata', len(wv.index_to_key), 'kata', round(time.time() - t0), 's', flush=True)

# ---------- 5. padanan Arab → Indonesia (model dwibahasa) ----------
mb = load_kv(MBI)
bk = mb.index_to_key
bcnt = np.array([mb.get_vecattr(w, 'count') for w in bk])
lat = np.array([not AR.search(w) and w in k2i and good[k2i[w]] for w in bk])
arm = np.array([bool(AR.search(w)) and bcnt[k] >= AR_CNT for k, w in enumerate(bk)])
Bn = mb.vectors / np.linalg.norm(mb.vectors, axis=1, keepdims=True)
Li = np.where(lat)[0]; Ln = Bn[Li]
ash = [dict() for _ in range(NSHARD)]
Ai = np.where(arm)[0]
for st in range(0, len(Ai), 4000):
    blk = Ai[st:st + 4000]; S = Bn[blk] @ Ln.T
    for r, k in enumerate(blk):
        s = S[r]; top = np.argpartition(-s, AR_K)[:AR_K]; top = top[np.argsort(-s[top])]
        lst = [f"{bk[Li[j]]} {int(round(s[j] * 100))}" for j in top if s[j] >= AR_MIN]
        if lst: ash[fnv(bk[k]) % NSHARD][bk[k]] = ','.join(lst)
meta_a = {}
for h in range(NSHARD):
    meta_a[str(h)] = dict(js_write('a/' + str(h) + '.js', 'PRMV.a', {'ver': VER, 'key': h, 'm': ash[h]}), n=len(ash[h]))
print('padanan Arab', sum(len(x) for x in ash), round(time.time() - t0), 's', flush=True)

# ---------- 6. meta ----------
meta = {
    'ver': VER, 'model': 'w2v-mta-id128-v1', 'kind': 'vektor kata domain (skip-gram) dilatih dari teks database V3.1; vektor dokumen = rata-rata berbobot SIF, PCA 64, int8',
    'dimW': int(W.shape[1]), 'dim': DIM, 'sifA': SIF_A, 'nShard': NSHARD, 'nWords': len(wv.index_to_key), 'nDocs': len(pas),
    'u': [round(float(x), 6) for x in u], 'mu': [round(float(x), 6) for x in mu], 'C': b64(C),
    'd': meta_d, 'k': meta_k, 'a': meta_a,
    'chm': [d['id'] for d in docs], 'pdf': [d['file'] for d in pdfs],  # rujukan dokumen brosur (urutan = angka di pecahan chm/pdf)
    'sumber': 'Al-Qur\'an (terjemahan), indeks tema, Tafsir Jalalain, Tafsir Ibnu Katsir (per ±1.100 karakter), 10 kitab hadis (bab + matan tanpa sanad; teks identik cukup satu vektor), materi Gurda 2142, arsip CHM (per ±1.100 karakter), brosur PDF bawaan. Brosur online Supabase dan paragraf Arab murni belum terindeks makna (tetap dicari literal).',
    'build': {'detik': round(time.time() - t0), 'passages': os.path.basename(PAS)}
}
info = js_write('meta.js', 'PRMV.setMeta', meta)
print('meta', info, 'total', round(time.time() - t0), 's')
