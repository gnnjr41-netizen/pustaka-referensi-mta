/* Membangun indeks makna Al-Qur'an (data/kitab/makna/) dari database kanonik.
   Pakai: node tools/build_makna.js <folder-db> <folder-aplikasi>
   Sumber pemetaan (semuanya tertulis di sumber, tidak ada tema buatan):
   R terjemahan ayat (Al-Qur'an Digital 2.1) · C catatan kaki terjemahan · J Tafsir Jalalain per ayat ·
   K Tafsir Ibnu Katsir per kelompok ayat · H judul kelompok ayat (topik) Al-Qur'an Digital · T indeks tema Al-Qur'an Digital */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const [DB, APP] = [process.argv[2] || '../db', process.argv[3] || '.'];
globalThis.window = globalThis;
const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
vm.runInThisContext(html.match(/<script>\s*\/\* PRM engine[\s\S]*?<\/script>/)[0].replace(/^<script>/, '').replace(/<\/script>$/, ''));
const Q = require(path.resolve(APP, 'data/lib/makna.js'));
const P = globalThis.PRM;
const read = f => fs.readFileSync(path.join(DB, f), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));

const quran = read('quran.jsonl').sort((a, b) => a.i - b.i);
const NA = quran.length;
const sOff = []; quran.forEach((r, x) => { if (r.a === 1) sOff[r.s - 1] = x; if (r.i !== x) throw new Error('urutan ayat tidak berurutan'); });
const X = (s, a) => sOff[s - 1] + a - 1;
const nAy = s => (s < 114 ? sOff[s] : NA) - sOff[s - 1];

// ---- judul kelompok ayat (topik) → rentang ----
function splitHead(t) {
  const ws = t.trim().split(/\s+/); let k = 0;
  while (k < ws.length) { const L = ws[k].replace(/[^A-Za-z]/g, ''); if (!L || L.replace(/[^A-Z]/g, '').length / L.length >= 0.7) k++; else break; }
  const maj = ws.slice(0, k).join(' '), sub = ws.slice(k).join(' ');
  const majOK = maj.replace(/[^A-Za-z]/g, '').length >= 4;
  return { maj: majOK ? maj : '', sub: majOK ? sub : t.trim() };
}
const heads = []; // [kind 'm'|'s', x1, x2, text, s]
for (let s = 1; s <= 114; s++) {
  let curM = null, curS = null;
  for (let a = 1; a <= nAy(s); a++) {
    const r = quran[X(s, a)]; if (!r.topik) continue;
    const parts = []; for (const t of r.topik) { const h = splitHead(t); if (h.maj) parts.push(['m', h.maj]); if (h.sub) parts.push(['s', h.sub]); }
    const hasM = parts.some(p => p[0] === 'm');
    if (hasM && curM) { curM[2] = X(s, a) - 1; curM = null; }
    if (curS) { curS[2] = X(s, a) - 1; curS = null; }
    for (const [k, txt] of parts) { const h = [k, X(s, a), -1, txt, s]; heads.push(h); if (k === 'm') curM = h; else curS = h; }
  }
  if (curM) curM[2] = X(s, nAy(s)); if (curS) curS[2] = X(s, nAy(s));
}
// ---- indeks tema ----
const tema = read('qtema.jsonl').map(t => [t.tema || '', t.sub || '', t.label || '', Array.from(new Set(t.refs.filter(([s, a]) => s >= 1 && s <= 114 && a >= 1 && a <= nAy(s)).map(([s, a]) => X(s, a)))).sort((a, b) => a - b), t.path]);
// ---- tafsir ----
const jal = new Array(NA).fill(-1); const jalTxt = new Array(NA).fill('');
for (const r of read('jalalain.jsonl')) { if (r.s >= 1 && r.a >= 1 && r.a <= nAy(r.s)) { jal[X(r.s, r.a)] = r.i; jalTxt[X(r.s, r.a)] = r.tr || ''; } }
const ik = []; const ikTxt = []; let ikSkip = 0;
for (const r of read('ibnukatsir.jsonl')) {
  if (!(r.s >= 1 && r.a1 >= 1)) { ikSkip++; continue; }
  const a2 = Math.min(r.a2 || r.a1, nAy(r.s));
  ik.push([r.i, X(r.s, r.a1), X(r.s, a2), r.title]);
  ikTxt.push((r.blocks || []).filter(b => b[0] !== 'a').map(b => b[1]).join(' '));
}
// ---- kosakata & akar ----
// teks dalam kurung pada terjemahan = keterangan tambahan penerjemah → bidang tersendiri (P), bobot lebih rendah
const noFoot = s => (s || '').replace(/\[\d+\]/g, ' ');
const outside = s => noFoot(s).replace(/\([^()]*\)/g, ' ');
const inside = s => (noFoot(s).match(/\(([^()]*)\)/g) || []).join(' ');
const fields = {
  R: quran.map(r => outside(r.tr)), P: quran.map(r => inside(r.tr)), C: quran.map(r => r.catatan || ''), J: jalTxt,
  H: heads.map(h => h[3]), T: tema.map(t => [t[0], t[1], t[2]].join(' ')), K: ikTxt
};
const tok = {}; const freq = new Map();
for (const f of Object.keys(fields)) { tok[f] = fields[f].map(t => Q.toks(t)); if (f !== 'K') for (const ts of tok[f]) for (const w of ts) if (!Q.MSTOP.has(w)) freq.set(w, (freq.get(w) || 0) + 1); }
for (const ts of tok.K) for (const w of new Set(ts)) if (!Q.MSTOP.has(w) && !freq.has(w)) freq.set(w, 0.01); // kata khusus Ibnu Katsir (bobot sangat kecil)
const stemOf = new Map();
const cn = w => { const g = P.VARMAP.get(w); return g ? g[0] : w; };
const fq = c => { const f = freq.get(c) || freq.get(cn(c)) || 0; return f >= 1 ? f : 0; };
for (const w of freq.keys()) stemOf.set(w, cn(Q.pickStem(w, fq)));
const S = w => stemOf.get(w) || w;
// ---- posting ----
const uni = new Map(), bi = new Map();
// J dan K menyimpan frekuensi kata (tf, maks 9) → penanda seberapa banyak tafsir membahas istilah itu
const TF = { J: 1, K: 1 };
const add = (map, term, f, id) => { let e = map.get(term); if (!e) map.set(term, e = {}); let a = e[f]; if (!a) a = e[f] = []; const L = a[a.length - 1]; if (!L || L[0] !== id) a.push([id, 1]); else if (TF[f]) L[1]++; };
for (const f of Object.keys(fields)) {
  tok[f].forEach((ts, id) => {
    const seq = ts.filter(w => !Q.MSTOP.has(w)).map(S);
    for (const w of seq) add(uni, w, f, id);
    if (f !== 'K') for (let i = 0; i + 1 < seq.length; i++) add(bi, seq[i] + ' ' + seq[i + 1], f, id);
  });
}
const enc = (a, f) => { let p = 0; return a.map(([v, tf]) => { const d = (v - p).toString(36); p = v; return TF[f] && tf > 1 ? d + ':' + Math.min(tf, 9) : d; }).join(','); };
const OUT = path.join(APP, 'data/kitab/makna'); const TMP = OUT + '.tmp';
fs.rmSync(TMP, { recursive: true, force: true }); ['u', 'b', 'w'].forEach(d => fs.mkdirSync(path.join(TMP, d), { recursive: true }));
function shards(map, kind) {
  const by = new Map();
  for (const [t, e] of map) { const k = Q.shardKey(t); if (!by.has(k)) by.set(k, {}); const o = {}; for (const f of Object.keys(e)) o[f] = enc(e[f].sort((a, b) => a[0] - b[0]), f); by.get(k)[t] = o; }
  let bytes = 0;
  for (const [k, o] of by) { const s = 'PRMQ.put(' + JSON.stringify(kind) + ',' + JSON.stringify(k) + ',' + JSON.stringify(o) + ');\n'; bytes += s.length; fs.writeFileSync(path.join(TMP, kind, k + '.js'), s); }
  return { files: by.size, bytes };
}
const su = shards(uni, 'u'), sb = shards(bi, 'b');
const wmap = new Map(); for (const [w, st] of stemOf) if (st !== w) { const k = Q.shardKey(w); if (!wmap.has(k)) wmap.set(k, {}); wmap.get(k)[w] = st; }
let wb = 0; for (const [k, o] of wmap) { const s = 'PRMQ.put("w",' + JSON.stringify(k) + ',' + JSON.stringify(o) + ');\n'; wb += s.length; fs.writeFileSync(path.join(TMP, 'w', k + '.js'), s); }
// ---- cakupan ----
const cov = { R: 0, P: 0, C: 0, J: 0, H: 0, T: 0, K: 0, any: 0, hOrT: 0 };
const hasH = new Uint8Array(NA), hasT = new Uint8Array(NA), hasK = new Uint8Array(NA);
heads.forEach(h => { for (let x = h[1]; x <= h[2]; x++) hasH[x] = 1; });
tema.forEach(t => t[3].forEach(x => { hasT[x] = 1; }));
ik.forEach(k => { for (let x = k[1]; x <= k[2]; x++) hasK[x] = 1; });
for (let x = 0; x < NA; x++) {
  const r = fields.R[x].trim() ? 1 : 0, c = fields.C[x].trim() ? 1 : 0, j = jalTxt[x].trim() ? 1 : 0;
  cov.R += r; cov.P += fields.P[x].trim() ? 1 : 0; cov.C += c; cov.J += j; cov.H += hasH[x]; cov.T += hasT[x]; cov.K += hasK[x]; cov.hOrT += (hasH[x] || hasT[x]) ? 1 : 0;
  cov.any += (r || j) ? 1 : 0;
}
const noJal = []; for (let x = 0; x < NA; x++) if (jal[x] < 0) { const s = quran[x].s, a = quran[x].a; noJal.push(s + ':' + a); }
const noH = []; for (let x = 0; x < NA; x++) if (!hasH[x]) noH.push(quran[x].s + ':' + quran[x].a);
const noK = []; for (let x = 0; x < NA; x++) if (!hasK[x]) noK.push(quran[x].s + ':' + quran[x].a);
const meta = {
  build: new Date().toISOString().slice(0, 19), nAyat: NA, qStart: 0, sOff, jal,
  heads: heads.map(h => [h[0], h[1], h[2], h[0], h[3]]),
  tema: tema.map(t => [t[0], t[1], t[2], t[3], t[4]]), ik,
  sumber: { R: "Terjemahan Al-Qur'an Digital 2.1 (Al_Quran_Digital_2.1.chm)", P: "Keterangan dalam kurung pada terjemahan Al-Qur'an Digital 2.1", C: "Catatan kaki terjemahan Al-Qur'an Digital 2.1", J: 'Tafsir Jalalain (Tafsir_Jalalain.CHM)', K: 'Tafsir Ibnu Katsir (Tafsir_Ibnu_Katsir.chm), per kelompok ayat', H: "Judul kelompok ayat (topik) Al-Qur'an Digital 2.1", T: "Indeks tema Al-Qur'an Digital 2.1" },
  stat: { cov, heads: heads.length, headsM: heads.filter(h => h[0] === 'm').length, tema: tema.length, ik: ik.length, ikSkip, vocab: freq.size, stemmed: Array.from(stemOf).filter(([w, s]) => w !== s).length, uniTerms: uni.size, biTerms: bi.size, bytes: { u: su.bytes, b: sb.bytes, w: wb } },
  noJal, noKcount: noK.length
};
fs.writeFileSync(path.join(TMP, 'meta.js'), 'PRMQ.meta=' + JSON.stringify(meta) + ';\n');
fs.rmSync(OUT + '.prev', { recursive: true, force: true });
if (fs.existsSync(OUT)) fs.renameSync(OUT, OUT + '.prev');
fs.renameSync(TMP, OUT); fs.rmSync(OUT + '.prev', { recursive: true, force: true });
console.log(JSON.stringify({ stat: meta.stat, noJal, noH: noH.slice(0, 20), noHn: noH.length, noK: noK.slice(0, 30) }, null, 1));
