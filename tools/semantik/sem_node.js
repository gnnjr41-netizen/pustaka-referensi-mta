/* Memuat mesin PRM + kitab + makna + semantik (PRMV) di Node, untuk uji & skrip. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
module.exports = function (appDir) {
  appDir = path.resolve(appDir);
  const { P, K } = require(path.join(appDir, 'tools/kitab_node.js'))(appDir);
  for (const f of ['data/kamus_support.js', 'data/lib/support.js', 'data/lib/makna.js', 'data/lib/semantik.js', 'data/lib/hybrid.js']) vm.runInThisContext(fs.readFileSync(path.join(appDir, f), 'utf8'), { filename: f });
  const Q = globalThis.PRMQ; Q.loader = async f => { vm.runInThisContext(fs.readFileSync(path.join(appDir, 'data/kitab/makna', f), 'utf8')); };
  const V = globalThis.PRMV; V.loader = async f => { vm.runInThisContext(fs.readFileSync(path.join(appDir, 'data/kitab/vektor', f), 'utf8')); };
  const H = globalThis.PRMH;
  if (H && fs.existsSync(path.join(appDir, 'data/lib/hybrid.js'))) { /* dimuat terpisah */ }
  return { P, K, Q, V, S: globalThis.PRMS };
};
