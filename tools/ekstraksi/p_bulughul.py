import sys, os, re, json, glob
sys.path.insert(0, os.path.dirname(__file__))
from common import *
from collections import Counter
ROOT = '../chm_x/bulughul'
toc, order = parse_hhc(ROOT + '/HBMV2.hhc')
exist = {os.path.relpath(p, ROOT).replace('\\', '/').lower(): os.path.relpath(p, ROOT).replace('\\', '/') for p in glob.glob(ROOT + '/**/*.htm', recursive=True)}
seq = [k for k in order if k in exist] + sorted(k for k in exist if k not in toc)
MK = re.compile(r'Hadits\s*No\.?\s*((?:\d[ \t]?){0,4}\d(?:\s*(?:,|-|–|dan)\s*(?:\d[ \t]?){0,4}\d)*)(?=\s)', re.I)
recs, issues, skipped = [], [], []
for k in seq:
    rel = exist[k]; chain = toc.get(k, [])
    if rel.lower().startswith('0. pendahuluan') or '/' not in rel:
        skipped.append(rel); continue
    t, enc, bad = decode(os.path.join(ROOT, rel))
    if bad: issues.append(('karakter rusak', rel, bad))
    L = lines(t)
    S = '\n'.join(L)
    parts = MK.split(S)
    head = parts[0]
    hl = [x for x in head.split('\n') if x.strip()]
    babAr = ' '.join(x for x in hl if is_ar(x)); babLat = ' '.join(x for x in hl if not is_ar(x))
    kitab = chain[0] if chain else rel.split('/')[0]
    bab = chain[-1] if len(chain) > 1 else babLat
    n = 0
    if len(parts) == 1:
        # halaman tanpa nomor hadis (mis. pengantar kitab) disimpan sebagai teks
        if babLat.strip() or babAr.strip():
            n += 1
            recs.append({'id': 'bulughul:%s#%d' % (rel, n), 'src': 'bulughul', 'coll': 'bulughul', 'kind': 'teks', 'kitab': kitab, 'bab': bab, 'no': '', 'ar': babAr, 'tr': babLat, 'path': rel, 'ord': n, 'rawi': []})
        continue
    for i in range(1, len(parts), 2):
        no = re.sub(r'(?<=\d)[ \t](?=\d)', '', parts[i]).strip(); body = [x.strip() for x in parts[i + 1].split('\n') if x.strip()]
        ar, tr = [], []; last = None
        for x in body:
            if not AR.search(x) and not LAT.search(x):
                # baris tanda baca/angka saja: ikut kelompok sebelumnya agar tidak ada karakter yang hilang
                (last if last is not None else tr).append(x); continue
            last = ar if is_ar(x) else tr
            last.append(x)
        n += 1
        r = {'id': 'bulughul:%s#%d' % (rel, n), 'src': 'bulughul', 'coll': 'bulughul', 'kitab': kitab, 'bab': bab, 'babAr': babAr if n == 1 or True else '', 'no': no,
             'ar': ' '.join(ar).strip(), 'tr': re.sub(r'\s+', ' ', ' '.join(tr)).strip(), 'path': rel, 'ord': n, 'rawi': []}
        if not r['ar'] and not r['tr']: issues.append(('hadis kosong', rel, no)); continue
        recs.append(r)
nums = [int(x) for r in recs if r['no'] for x in re.findall(r'\d+', r['no'])]
c = Counter(nums)
print('files', len(exist), 'recs', len(recs), 'hadis', len(nums), 'uniq', len(c), 'min/max', min(nums), max(nums))
miss = [i for i in range(1, max(nums) + 1) if i not in c]
print('missing', len(miss), miss[:50], 'dup', [k for k, v in c.items() if v > 1][:30])
print('no ar', sum(1 for r in recs if not r['ar'] and r['no']), 'no tr', sum(1 for r in recs if not r['tr']), issues[:5], 'skipped', skipped)
json.dump(recs, open('out_bulughul.json', 'w'), ensure_ascii=False); json.dump({'issues': issues, 'skipped': skipped}, open('iss_bulughul.json', 'w'), ensure_ascii=False)
print(json.dumps(recs[5], ensure_ascii=False)[:800])
