import sys, os, re, json, glob
sys.path.insert(0, os.path.dirname(__file__))
from common import *
ROOT = '../chm_x/kitab9'
COLL = {'1': ('bukhari', 'Shahih Bukhari'), '2': ('muslim', 'Shahih Muslim'), '3': ('abudaud', 'Sunan Abu Dawud'), '4': ('tirmidzi', 'Sunan Tirmidzi'),
        '5': ('nasai', "Sunan An-Nasa'i"), '6': ('ibnumajah', 'Sunan Ibnu Majah'), '7': ('ahmad', 'Musnad Ahmad'), '8': ('malik', "Muwaththa' Malik"), '9': ('darimi', 'Sunan Ad-Darimi')}
HNO = re.compile(r'^Hadits\s+No\.?\s*(\d+)\s*$', re.I)
def parse():
    recs, issues, pages = [], [], 0
    files = sorted(glob.glob(ROOT + '/had/H[1-9]K*B*.htm*'), key=lambda p: (p.split('/')[-1]))
    for p in files:
        fn = os.path.basename(p)
        m = re.match(r'H(\d)K(\d+)B(\d+)\.html?$', fn)
        if not m: issues.append(('nama file tak dikenal', fn)); continue
        pages += 1
        t, enc, bad = decode(p)
        if bad: issues.append(('karakter rusak', fn, bad))
        L = lines(t)
        coll, collName = COLL[m.group(1)]
        crumb = L[0] if L and L[0].startswith('Kitab 9 Imam') else ''
        parts = [x.strip() for x in crumb.split('>') if x.strip()]
        kitab = parts[2] if len(parts) > 2 else ''
        kitab = re.sub(r'^BAB\s+(\d+)\.\s*', r'\1. ', kitab)
        i = 1 if crumb else 0
        bab, babAr = '', ''
        head = []
        while i < len(L) and not HNO.match(L[i]): head.append(L[i]); i += 1
        lat = [h for h in head if not is_ar(h)]; ar = [h for h in head if is_ar(h)]
        bab = ' '.join(lat).strip(); babAr = ' '.join(ar).strip()
        k = 0
        while i < len(L):
            mh = HNO.match(L[i])
            if not mh: issues.append(('baris di luar hadis', fn, L[i][:80])); i += 1; continue
            no = mh.group(1); i += 1
            body = []
            while i < len(L) and not HNO.match(L[i]): body.append(L[i]); i += 1
            trL, arL, order = [], [], []
            for b in body:
                (arL if is_ar(b) else trL).append(b)
            tr = '\n'.join(trL).strip(); arT = ' '.join(arL).strip()
            if not tr and not arT: issues.append(('hadis kosong', fn, no)); continue
            k += 1
            rawi = re.findall(r'\[([^\[\]]{2,80})\]', tr)
            recs.append({'id': 'k9:%s:%s' % (coll, no) if True else '', 'src': 'kitab9', 'coll': coll, 'collName': collName,
                         'kitab': kitab, 'bab': bab, 'babAr': babAr, 'no': no, 'ar': arT, 'tr': tr, 'rawi': rawi,
                         'path': 'had/' + fn, 'ord': k})
    return recs, issues, pages, len(files)
if __name__ == '__main__':
    recs, issues, pages, nf = parse()
    ids = {}
    for r in recs: ids[r['id']] = ids.get(r['id'], 0) + 1
    dup = {k: v for k, v in ids.items() if v > 1}
    print('files', nf, 'pages', pages, 'recs', len(recs), 'dup ids', len(dup), list(dup.items())[:10])
    from collections import Counter
    print(Counter(r['coll'] for r in recs))
    print('no ar', sum(1 for r in recs if not r['ar']), 'no tr', sum(1 for r in recs if not r['tr']))
    print(Counter(i[0] for i in issues)); print(issues[:15])
    json.dump(recs, open('out_kitab9.json', 'w'), ensure_ascii=False)
    json.dump(issues, open('iss_kitab9.json', 'w'), ensure_ascii=False)
