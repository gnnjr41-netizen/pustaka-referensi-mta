/* Korpus pelatihan vektor kata domain: token = PRMQ.toks (normalisasi & ejaan kamus yang sama dengan aplikasi) */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), readline = require('readline');
const APP = path.resolve(process.argv[2]); const IN = process.argv[3], OUT = process.argv[4];
const { P, K } = require(path.join(APP, 'tools/kitab_node.js'))(APP);
vm.runInThisContext(fs.readFileSync(path.join(APP, 'data/kamus_support.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(APP, 'data/lib/support.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(APP, 'data/lib/makna.js'), 'utf8'));
const Q = globalThis.PRMQ;
(async () => {
  const out = fs.createWriteStream(OUT); let n = 0, nt = 0;
  const rl = readline.createInterface({ input: fs.createReadStream(IN), crlfDelay: Infinity });
  for await (const line of rl) {
    const p = JSON.parse(line); if (p.v === 'ar') continue;
    for (const sent of p.text.split(/(?<=[.!?;:"”])\s+/)) { const t = Q.toks(sent); if (t.length >= 3) { out.write(t.join(' ') + '\n'); n++; nt += t.length; } }
  }
  out.end(); console.log('sentences', n, 'tokens', nt);
})();
