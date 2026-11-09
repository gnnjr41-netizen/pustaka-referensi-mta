from p_sidokare import *
ROOT = '../chm_x/bukhari'
files = sorted(glob.glob(ROOT + '/*/*.htm'), key=lambda p: (int(re.match(r'(\d+)', os.path.basename(os.path.dirname(p))).group(1)), p))
def kitab_of(rel):
    d = rel.split('/')[0]; m = re.match(r'(\d+)\.\s*(.*)', d); return '%s. %s' % (m.group(1), m.group(2)) if m else d
recs, issues = run('bukhari', ROOT, files, kitab_of)
for r in recs: r['coll'] = 'bukhari'
if __name__ == '__main__':
    from collections import Counter
    nos = [int(r['no']) for r in recs]
    print('files', len(files), 'recs', len(recs), 'uniq no', len(set(nos)), 'min/max', min(nos), max(nos))
    print('no ar', sum(1 for r in recs if not r['ar']), 'no tr', sum(1 for r in recs if not r['tr']), 'no bab', sum(1 for r in recs if not r['bab']))
    print(Counter(i[0] for i in issues), issues[:8])
    import random; random.seed(1)
    for r in random.sample(recs, 2): print(json.dumps(r, ensure_ascii=False)[:700])
    json.dump(recs, open('out_bukhari.json', 'w'), ensure_ascii=False); json.dump(issues, open('iss_bukhari.json', 'w'), ensure_ascii=False)
