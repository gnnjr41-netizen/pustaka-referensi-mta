from p_sidokare import *
from collections import Counter
def go(code, root, sortkey, kitab_of):
    files = sorted([p for p in glob.glob(root + '/*.htm') if re.match(r'\d', os.path.basename(p))], key=sortkey)
    recs, issues = run(code, root, files, kitab_of)
    for r in recs: r['coll'] = code
    nos = [int(r['no']) for r in recs]
    c = Counter(nos)
    print(code, 'files', len(files), 'recs', len(recs), 'uniq', len(c), 'min/max', min(nos), max(nos), 'dupNo', sum(1 for v in c.values() if v > 1))
    miss = [i for i in range(min(nos), max(nos) + 1) if i not in c]
    print(' missing', len(miss), miss[:60])
    print(' no ar', sum(1 for r in recs if not r['ar']), 'no tr', sum(1 for r in recs if not r['tr']), 'no bab', sum(1 for r in recs if not r['bab']))
    print(' issues', Counter(i[0] for i in issues), issues[:5])
    json.dump(recs, open('out_%s.json' % code, 'w'), ensure_ascii=False); json.dump(issues, open('iss_%s.json' % code, 'w'), ensure_ascii=False)
    return recs
num = lambda p: int(re.match(r'(\d+)', os.path.basename(p)).group(1))
def dar_kitab(rel):
    t, e, b = decode('../chm_x/darimi/' + rel, 'cp1252'); tt = title_of(t)
    return re.sub(r'^(\d+)\s+', r'\1. ', tt)
R = go('darimi', '../chm_x/darimi', num, dar_kitab)
R2 = go('nasai', '../chm_x/nasai', num, lambda rel: os.path.splitext(rel)[0].replace('.', '. ', 1))
import random; random.seed(3)
for r in random.sample(R, 1) + random.sample(R2, 1): print(json.dumps(r, ensure_ascii=False)[:600])
