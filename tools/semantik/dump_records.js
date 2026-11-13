// Muat seluruh record kitab dari data/kitab/r/*.js → JSONL (hanya baca)
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = process.argv[2], OUT = process.argv[3];
const ctx = { window: {}, PRMK: null }; ctx.window.PRMK = {}; ctx.PRMK = ctx.window.PRMK;
const recs = [];
ctx.PRMK.r = (id, arr) => { for (const r of arr) recs.push(r); };
vm.createContext(ctx);
const dir = path.join(APP, 'data/kitab/r');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort((a, b) => parseInt(a) - parseInt(b));
for (const f of files) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx);
recs.sort((a, b) => a.i - b.i);
const out = fs.createWriteStream(OUT);
for (const r of recs) out.write(JSON.stringify(r) + '\n');
out.end();
console.log('records', recs.length, 'first', recs[0].i, 'last', recs[recs.length - 1].i);
// cek kontinuitas indeks
let gaps = 0; for (let k = 0; k < recs.length; k++) if (recs[k].i !== k) gaps++;
console.log('index mismatches', gaps);
