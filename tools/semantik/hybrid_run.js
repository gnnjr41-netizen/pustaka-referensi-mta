/* Jalankan pipeline gabungan (seperti di browser) untuk satu/lebih kueri. node hybrid_run.js <app> "<kueri>" ... [--json out.json] [--mode campuran] */
'use strict';
const fs = require('fs'), path = require('path');
const APP = path.resolve(process.argv[2]);
const args = process.argv.slice(3); let jsonOut = null, mode = 'campuran'; const qs = [];
for (let k = 0; k < args.length; k++) { if (args[k] === '--json') jsonOut = args[++k]; else if (args[k] === '--mode') mode = args[++k]; else qs.push(args[k]); }
const E = require(path.join(APP, 'tools/semantik/sem_node.js'))(APP); const { P, K, Q, V } = E; const H = globalThis.PRMH;
async function run(q, opts) {
  opts = opts || {};
  await K.init(); await Q.init(); const M = K.info();
  const pq = P.parseQuery(q, {});
  const lit = await K.search(pq, {});
  const arab = /[\u0600-\u06FF]/.test(q);
  const mkOk = !pq.qref && !arab && !/^\s*[\d:\s]+$/.test(q);
  const mk = mkOk ? await Q.search(q, { limit: 60, limitP: 40 }) : null;
  const md = opts.mode || mode;
  const sem = md === 'literal' ? null : await V.search(q, { cats: ['quran', 'tafsir', 'hadis', 'materi'] });
  const related = sem && sem.q.used.length ? await V.related(sem.q.used) : [];
  const an = H.analyze(q);
  const out = { q, mode: md, used: sem ? sem.q.used.map(u => u.w + (u.via ? '←' + u.via : '')) : [], concepts: an.concepts.map(c => (c.mod ? '+' : '') + c.label), hint: an.hint, cats: {} };
  for (const cat of ['quran', 'hadis', 'tafsir', 'materi']) {
    const res = await H.kitab({ cat, lit: lit.results, mk, sem, related, an, mode: md, get: ids => K.get(ids), limit: 60 });
    const recs = await K.get(res.slice(0, opts.n || 10).map(e => e.i));
    out.cats[cat] = res.slice(0, opts.n || 10).map(e => { const r = recs.get(e.i); return { i: e.i, ref: r.src === 'quran' ? 'QS ' + r.s + ':' + r.a : K.title(r) + (r.no ? ' No.' + r.no : ''), tier: e.tier, level: e.level, types: e.types, rank: e.rank, ev: (e.ev || []).map(z => ({ label: z.label, mod: z.mod, st: z.st })), demoted: !!e.demoted, why: H.whyText(e), text: (r.src === 'quran' ? r.tr : (r.bab ? 'Bab ' + r.bab + ' | ' : '') + (r.tr || (r.blocks || []).filter(b => b[0] !== 'a').slice(e.b && e.b.b0 >= 0 ? e.b.b0 : 0).map(b => b[1]).join(' '))).replace(/\s+/g, ' ').slice(0, 220) }; });
    out.cats[cat].total = res.length;
    out.cats[cat].tiers = res.reduce((a, e) => (a[e.tier] = (a[e.tier] || 0) + 1, a), {});
  }
  return out;
}
module.exports = run;
if (require.main === module) (async () => {
  const all = [];
  for (const q of qs) {
    const o = await run(q); all.push(o);
    console.log('\n######## ' + q + '  [mode ' + o.mode + '] konsep: ' + o.concepts.join(', ') + (o.hint ? ' · kategori: ' + o.hint : '') + ' · kata makna: ' + o.used.join(' '));
    for (const [cat, L] of Object.entries(o.cats)) {
      console.log(' == ' + cat + ' (' + L.total + ' kandidat; ' + JSON.stringify(L.tiers) + ')');
      for (const e of L.slice(0, 6)) console.log('   [' + e.tier + '/' + e.level + '/' + e.types.join('+') + '] ' + e.ref + ' :: ' + e.text.slice(0, 150) + '\n        ↳ ' + e.why.slice(0, 260));
    }
  }
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(all, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
