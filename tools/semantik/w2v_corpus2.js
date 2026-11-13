/* Korpus v2: kalimat Indonesia + kalimat Arab + pasangan Arab–Indonesia yang diselang-seling (agar kata Arab & Indonesia sebidang) */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), readline = require('readline');
const APP = path.resolve(process.argv[2]); const PAS = process.argv[3], RECS = process.argv[4], OUT = process.argv[5];
const { P, K } = require(path.join(APP, 'tools/kitab_node.js'))(APP);
vm.runInThisContext(fs.readFileSync(path.join(APP, 'data/kamus_support.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(APP, 'data/lib/support.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(APP, 'data/lib/makna.js'), 'utf8'));
const Q = globalThis.PRMQ; const AR = /[؀-ۿ]/;
const arToks = s => P.norm(String(s || '')).split(' ').filter(w => w && AR.test(w));
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
function interleave(a, b) { const out = []; let i = 0, j = 0; while (i < a.length || j < b.length) { const pa = (a.length - i) / ((a.length - i) + (b.length - j)); if (rnd() < pa) out.push(a[i++]); else out.push(b[j++]); } return out; }
(async () => {
  const out = fs.createWriteStream(OUT); let n = 0, nt = 0; const w = t => { if (t.length >= 3) { out.write(t.join(' ') + '\n'); n++; nt += t.length; } };
  for await (const line of readline.createInterface({ input: fs.createReadStream(PAS), crlfDelay: Infinity })) {
    const p = JSON.parse(line); if (p.v === 'ar') continue;
    for (const s of p.text.split(/(?<=[.!?;:"”])\s+/)) w(Q.toks(s));
  }
  for await (const line of readline.createInterface({ input: fs.createReadStream(RECS), crlfDelay: Infinity })) {
    const r = JSON.parse(line);
    const ar = r.src === 'quran' ? r.arT : r.ar; if (!ar || !r.tr) continue;
    const A = arToks(ar), I = Q.toks(r.tr);
    if (A.length) { for (const s of String(ar).split(/[.،؛:!؟]+/)) w(arToks(s)); }
    if (A.length && I.length && A.length < 400) for (let k = 0; k < 2; k++) w(interleave(A, I));
  }
  out.end(); console.log('sentences', n, 'tokens', nt);
})();
