/* Memuat mesin PRM (dari index.html) + data/lib/kitab.js di Node, untuk uji & skrip. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
module.exports = function (appDir) {
  if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;
  const html = fs.readFileSync(path.join(appDir, 'index.html'), 'utf8');
  const em = html.match(/<script>\s*\/\* PRM engine[\s\S]*?<\/script>/);
  vm.runInThisContext(em[0].replace(/^<script>/, '').replace(/<\/script>$/, ''));
  vm.runInThisContext(fs.readFileSync(path.join(appDir, 'data/lib/kitab.js'), 'utf8'));
  const K = globalThis.PRMK;
  const base = path.join(appDir, 'data/kitab/');
  K.loader = async file => { vm.runInThisContext(fs.readFileSync(path.join(base, file), 'utf8')); };
  return { P: globalThis.PRM, K };
};
