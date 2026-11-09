from p_ks import *
ROOT = '../chm_x/riyadlus'
BOIL = re.compile(r'^(Riyadhus Shalihin\s*[–-]\s*Imam Nawawi|\*|Kompilasi Chm oleh:?|Abu Ahmad as Sidokare\s*\*?|Kompilasi Chm oleh:? Abu Ahmad as Sidokare\s*\*?|Abu Ahmad as|Sidokare)$', re.I)
def prep(L):
    out = []
    for l in L:
        l2 = re.sub(r'\*?\s*Kompilasi Chm oleh:?\s*Abu Ahmad as Sidokare\s*\*?', '', l).strip()
        if not l2 or BOIL.match(l2): continue
        out.append(l2)
    return out
toc, order = parse_hhc(ROOT + '/Riyadhus Shalihin.hhc')
exist = {os.path.relpath(p, ROOT).replace('\\', '/').lower(): os.path.relpath(p, ROOT).replace('\\', '/') for p in glob.glob(ROOT + '/**/*.htm', recursive=True)}
seq = [k for k in order if k in exist] + sorted(k for k in exist if k not in toc)
recs, issues, skipped = [], [], []
for k in seq:
    rel = exist[k]; chain = toc.get(k, [])
    iss = []
    head, hads, intro, ttl = parse_page(os.path.join(ROOT, rel), iss, rel, prep, 'cp1252')
    kitab = chain[0] if chain else ''
    bab = head or (chain[-1] if chain else ttl)
    if not hads and not intro: skipped.append(rel); continue
    # segmen tanpa nomor sebelum hadis pertama = pengantar bab (biasanya kutipan ayat); bukan hadis bernomor
    pre = []
    rest = []
    seen_num = False
    for h in hads:
        if h['no']: seen_num = True
        (rest if seen_num else pre).append(h)
    n = 0
    if intro or pre:
        n += 1
        recs.append({'id': 'riyadh:%s#%d' % (rel, n), 'src': 'riyadh', 'coll': 'riyadh', 'kind': 'teks', 'kitab': kitab, 'bab': bab, 'no': '',
                     'ar': '\n'.join(h['ar'] for h in pre if h['ar']), 'tr': '\n'.join(intro + [h['tr'] for h in pre if h['tr']]), 'path': rel, 'ord': n, 'rawi': [],
                     'note': 'Pengantar bab (teks sebelum hadis bernomor)'})
    merged = []
    for h in rest:
        if not h['no'] and merged and re.match(r"^(Dalam (riwayat|lafaz|sebuah riwayat|suatu riwayat)|Ada pula riwayat|Ada (lagi )?riwayat|Dan dalam riwayat|Pada riwayat|Di dalam riwayat|Dalam hadits lain|Sabda(nya)?|Ucapan(nya)?|Kata(-kata)?|Lafaz|Lafazh|Perkataan(nya)?|Arti|Maksud)", h['tr'], re.I):
            p0 = merged[-1]
            p0['ar'] = (p0['ar'] + '\n' + h['ar']).strip(); p0['tr'] = (p0['tr'] + '\n' + h['tr']).strip(); continue
        merged.append(h)
    for h in merged:
        n += 1
        if not h['no']: issues.append(('hadis tanpa nomor di sumber', rel, h['tr'][:60]))
        recs.append({'id': 'riyadh:%s#%d' % (rel, n), 'src': 'riyadh', 'coll': 'riyadh', 'kitab': kitab, 'bab': bab, 'no': h['no'], 'ar': h['ar'], 'tr': h['tr'], 'path': rel, 'ord': n, 'rawi': []})
    issues += [i for i in iss if i[0] != 'hadis tanpa nomor di sumber']
nums = [int(r['no']) for r in recs if r['no'].isdigit()]
from collections import Counter
c = Counter(nums)
print('files', len(exist), 'recs', len(recs), 'hadis bernomor', len(nums), 'uniq', len(c), 'min/max', min(nums), max(nums), 'pengantar', sum(1 for r in recs if r.get('kind') == 'teks'))
miss = [i for i in range(1, max(nums) + 1) if i not in c]
print('missing', len(miss), miss[:40]); print('dup', [k for k, v in c.items() if v > 1][:20])
print('no ar', sum(1 for r in recs if not r['ar'] and r.get('kind') != 'teks'), Counter(i[0] for i in issues), skipped[:5])
json.dump(recs, open('out_riyadh.json', 'w'), ensure_ascii=False); json.dump({'issues': issues, 'skipped': skipped}, open('iss_riyadh.json', 'w'), ensure_ascii=False)
