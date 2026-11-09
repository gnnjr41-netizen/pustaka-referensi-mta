#!/usr/bin/env node
/* Bangun indeks pencarian Pustaka Kitab (Al-Qur'an, tafsir, hadis) dari db/*.jsonl.
   - Normalisasi memakai mesin PRM yang SAMA dengan aplikasi (diambil dari index.html).
   - Keluaran: data/kitab/ (meta.js, d/*.js kamus, p/*.js posting, r/*.js record, toc/*.js, qimg/).
   - Aman diulang: ditulis ke folder sementara lalu ditukar; folder lama disimpan sebagai .prev.
   Pemakaian: node build_index.js <folder-db> <folder-aplikasi> <folder-gambar-quran>
*/
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const DB = path.resolve(process.argv[2] || '../db');
const APP = path.resolve(process.argv[3] || '../app');
const QIMG = path.resolve(process.argv[4] || '../chm_x/quran/img');
const OUT = path.join(APP, 'data', 'kitab');
const TMP = OUT + '.tmp';

/* ---------- mesin PRM dari index.html ---------- */
const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
const em = html.match(/<script>\s*\/\* PRM engine[\s\S]*?<\/script>/);
if (!em) throw new Error('engine PRM tidak ditemukan di index.html');
const engFile = path.join(require('os').tmpdir(), 'prm_engine_' + process.pid + '.js');
fs.writeFileSync(engFile, em[0].replace(/^<script>/, '').replace(/<\/script>$/, ''));
const P = require(engFile);
fs.unlinkSync(engFile);

/* ---------- util ---------- */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function vlq(arr) { // bilangan bulat ≥0 → string (5 bit per karakter, bit ke-6 = lanjut)
  let s = '';
  for (let n of arr) {
    if (n < 0) throw new Error('negatif');
    do { let d = n & 31; n = Math.floor(n / 32); if (n > 0) d |= 32; s += B64[d]; } while (n > 0);
  }
  return s;
}
function rmrf(p) { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); }
function writeJs(file, js) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, js); }
const keyHex = k => Array.from(k).map(c => c.codePointAt(0).toString(16)).join('-');

/* ---------- muat database ---------- */
const manifest = JSON.parse(fs.readFileSync(path.join(DB, 'manifest.json'), 'utf8'));
const rel = JSON.parse(fs.readFileSync(path.join(DB, 'relations.json'), 'utf8'));
const qAr = JSON.parse(fs.readFileSync(path.join(DB, 'quran_ar_from_ibnukatsir.json'), 'utf8'));
const recs = [];
for (const s of manifest.sources) {
  const lines = fs.readFileSync(path.join(DB, s.code + '.jsonl'), 'utf8').split('\n');
  s.start = recs.length;
  for (const ln of lines) { if (!ln) continue; const r = JSON.parse(ln); if (r.i !== recs.length) throw new Error('urutan i tidak cocok ' + r.id); recs.push(r); }
  s.count = recs.length - s.start;
}
const N = recs.length;
console.log('record', N);
const SRC = Object.fromEntries(manifest.sources.map(s => [s.code, s]));
const COLLN = { bukhari: 'Bukhari', muslim: 'Muslim', abudaud: 'Abu Dawud', tirmidzi: 'Tirmidzi', nasai: "An-Nasa'i", ibnumajah: 'Ibnu Majah', ahmad: 'Ahmad', malik: 'Malik', darimi: 'Ad-Darimi', bulughul: 'Bulughul Maram', riyadh: 'Riyadhus Shalihin' };
function shortLabel(r) {
  const s = SRC[r.src];
  if (r.src === 'kitab9') return 'Kitab 9 Imam › ' + COLLN[r.coll] + (r.no ? ' No. ' + r.no : '');
  if (r.src === 'quran') return 'QS. ' + r.surah + ' (' + r.s + '): ' + r.a;
  return s.name.replace(/\s*\(.*\)$/, '') + (r.no ? ' No. ' + r.no : '');
}

/* ---------- relasi ---------- */
const grpOf = new Int32Array(N).fill(-1);
rel.ident.forEach((g, gi) => g.forEach(i => { grpOf[i] = gi; }));
// ayat → teks Arab dari Tafsir Ibnu Katsir
for (const r of recs) if (r.src === 'quran') { const x = qAr[r.s + ':' + r.a]; if (x) { r.arT = x[0]; r.arTsrc = x[1]; r.arTname = 'Tafsir Ibnu Katsir'; } }
// basmalah pembuka surat bukan bagian ayat 1 (kecuali Al-Fatihah) — Ibnu Katsir kadang menuliskannya di awal blok ayat 1
{
  const KK0 = require(path.join(APP, 'data', 'lib', 'kitab.js'));
  let nb = 0;
  for (const r of recs) if (r.src === 'quran' && r.a === 1 && r.s !== 1 && r.arT) {
    const ws = r.arT.split(' ');
    for (let k = 3; k <= Math.min(6, ws.length); k++) {
      if (KK0.skelAr(ws.slice(0, k).join(' ')).s === 'bsmlhrhmnrhm') {
        const rest = ws.slice(k).join(' ').trim();
        if (rest) { r.arT = rest; r.arTnote = 'Basmalah pembuka surat di awal blok Ibnu Katsir dipisahkan (bukan bagian ayat 1 menurut penomoran Al-Qur\'an Digital).'; }
        else { console.log('  teks Ibnu Katsir untuk ' + r.s + ':1 hanya basmalah pembuka → tidak dipakai'); delete r.arT; delete r.arTsrc; delete r.arTname; }
        nb++; break;
      }
    }
  }
  console.log('basmalah pembuka dipisahkan dari ayat 1:', nb);
}
// cadangan: paragraf Arab Tafsir Jalalain yang SELURUHNYA ditandai merah (= lafaz ayat menurut sumber), hanya bila Ibnu Katsir tidak punya
{
  const jr = new Map(); for (const r of recs) if (r.src === 'jalalain') jr.set(r.s + ':' + r.a, r);
  for (const r of recs) if (r.src === 'quran' && !r.arT) {
    const j = jr.get(r.s + ':' + r.a);
    if (j && j.arSeg && j.arSeg.length && j.arSeg.every(x => x[0] === 1)) { r.arT = j.arSeg.map(x => x[1]).join(' '); r.arTsrc = j.path; r.arTname = 'Tafsir Jalalain (paragraf Arab seluruhnya ditandai lafaz ayat)'; console.log('teks Arab cadangan Jalalain:', r.s + ':' + r.a); }
  }
}
// tautan ayat → record tafsir
const jal = new Map(), ik = [];
for (const r of recs) {
  if (r.src === 'jalalain') jal.set(r.s + ':' + r.a, r.i);
  if (r.src === 'ibnukatsir' && r.s && r.a1) ik.push([r.s, r.a1, r.a2, r.i]);
}

/* ---------- token & posisi ---------- */
const GAP = 4;
const dict = new Map(); // token → {d:[], df}
let totalPos = 0;
const dl = new Uint32Array(N);
function add(tok, doc, posList, title) {
  let e = dict.get(tok);
  if (!e) { e = { a: [] }; dict.set(tok, e); }
  e.a.push(doc, posList.length * 2 + (title ? 1 : 0)); for (const p of posList) e.a.push(p);
}
function fieldsOf(r) {
  const title = [], body = [];
  const t = x => { if (x) title.push(Array.isArray(x) ? x.join(' ') : x); };
  const b = x => { if (x) body.push(x); };
  if (r.src === 'quran') { t(r.surah); t('surat ' + r.surah); t((r.topik || []).join(' ')); b(r.arT); b(r.tr); b(r.catatan); }
  else if (r.src === 'qtema') { t(r.tema); t(r.sub); t(r.label); b((r.refs || []).map(x => x[0] + ':' + x[1]).join(' ')); }
  else if (r.src === 'ibnukatsir') { t(r.title); t((r.toc || []).slice(2).join(' ')); for (const bl of r.blocks || []) b(bl[1]); }
  else if (r.src === 'jalalain') { t(r.title); t((r.toc || []).join(' ')); b(r.ar); b(r.tr); }
  else if (r.src === 'gurda') { t(r.title); t((r.toc || []).slice(1).join(' ')); for (const bl of r.blocks || []) if (bl[0] === 'h') t(bl[1]); for (const bl of r.blocks || []) b(bl[1]); }
  else { t(r.kitab); t(r.bab); t(r.babAr); b(r.ar); b(r.tr); b(r.intro); }
  return { title, body };
}
const t0 = Date.now();
for (const r of recs) {
  const { title, body } = fieldsOf(r);
  const occ = new Map(); let pos = 0; const titleSet = new Set();
  const feed = (text, isTitle) => {
    const n = P.norm(String(text)); if (!n) return;
    for (const tk of n.split(' ')) { if (!tk) continue; let o = occ.get(tk); if (!o) { o = []; occ.set(tk, o); } if (o.length < 400) o.push(pos); if (isTitle) titleSet.add(tk); pos++; }
    pos += GAP;
  };
  for (const x of title) feed(x, true);
  for (const x of body) feed(x, false);
  dl[r.i] = pos;
  // nomor hadis/ayat sebagai token khusus "#n"
  const nums = new Set();
  if (r.no) for (const m of String(r.no).match(/\d+/g) || []) nums.add('#' + (+m));
  for (const tk of nums) { occ.set(tk, [0]); titleSet.add(tk); }
  for (const [tk, ps] of occ) {
    const dp = []; let last = 0; for (const p of ps) { dp.push(p - last); last = p; }
    add(tk, r.i, dp, titleSet.has(tk)); totalPos += ps.length;
  }
  if (r.i % 20000 === 0) console.log('  token', r.i, ((Date.now() - t0) / 1000).toFixed(1) + 's', 'kamus', dict.size);
}
console.log('kamus', dict.size, 'posisi', totalPos, ((Date.now() - t0) / 1000).toFixed(1) + 's');

/* ---------- tulis ---------- */
rmrf(TMP); fs.mkdirSync(TMP, { recursive: true });
// posting: urutkan token, kelompokkan per shard kamus (2 huruf awal; dipecah 3 huruf bila besar)
const toks = Array.from(dict.keys()).sort();
const shardOf = tk => Array.from(tk).slice(0, 2).join('');
const shardSize = new Map();
for (const tk of toks) { const k = shardOf(tk); shardSize.set(k, (shardSize.get(k) || 0) + tk.length + 12); }
const SPLIT = new Set(Array.from(shardSize).filter(([k, v]) => v > 60000).map(([k]) => k));
const shardKey = tk => { const a = Array.from(tk); return SPLIT.has(a.slice(0, 2).join('')) && a.length >= 3 ? a.slice(0, 3).join('') : a.slice(0, 2).join(''); };
const shards = new Map(); // key → {tok: [df, pack, slot]}
let pack = [], packLen = 0, packId = 0; const PACK = 40000; let postBytes = 0;
const flushPack = () => { if (!pack.length) return; writeJs(path.join(TMP, 'p', packId + '.js'), 'PRMK.p(' + packId + ',' + JSON.stringify(pack) + ');'); postBytes += packLen; packId++; pack = []; packLen = 0; };
let lastShard = null;
for (const tk of toks) {
  const e = dict.get(tk); const a = e.a;
  // kodekan: docDelta, (tf*2+judul), posisi delta...
  const out = []; let lastDoc = 0, df = 0;
  for (let k = 0; k < a.length;) {
    const doc = a[k++], tfFlag = a[k++], tf = tfFlag >> 1;
    out.push(doc - lastDoc, tfFlag); lastDoc = doc; df++;
    for (let j = 0; j < tf; j++) out.push(a[k++]);
  }
  const s = vlq(out);
  dict.delete(tk);
  const sk = shardKey(tk);
  if (sk !== lastShard && packLen > PACK * 0.6) flushPack();
  lastShard = sk;
  if (s.length > PACK) { flushPack(); }
  pack.push(s); packLen += s.length;
  if (!shards.has(sk)) shards.set(sk, {});
  shards.get(sk)[tk] = [df, packId, pack.length - 1];
  if (packLen >= PACK) flushPack();
}
flushPack();
const dictFiles = {};
let dictBytes = 0;
for (const [k, obj] of shards) { const f = keyHex(k); dictFiles[k] = f; const js = 'PRMK.d(' + JSON.stringify(k) + ',' + JSON.stringify(obj) + ');'; dictBytes += js.length; writeJs(path.join(TMP, 'd', f + '.js'), js); }
console.log('pack', packId, 'posting MB', (postBytes / 1e6).toFixed(1), 'shard kamus', shards.size, 'kamus MB', (dictBytes / 1e6).toFixed(1));

// record chunk (untuk tampilan)
const KEEP = ['i', 'src', 'kind', 'coll', 'kitab', 'bab', 'babAr', 'no', 'ar', 'tr', 'rawi', 'derajat', 'path', 'intro', 'note', 's', 'a', 'surah', 'nAyat', 'juz', 'topik', 'catatan', 'img', 'tema', 'sub', 'label', 'refs', 'title', 'a1', 'a2', 'blocks', 'arSeg', 'arT', 'arTsrc', 'arTname', 'arTnote', 'babInherited', 'toc'];
const chunkStarts = []; let chunk = [], cLen = 0, chunkId = 0, recBytes = 0; const CH = 24000;
const flushChunk = () => { if (!chunk.length) return; const js = 'PRMK.r(' + chunkId + ',' + JSON.stringify(chunk) + ');'; recBytes += js.length; writeJs(path.join(TMP, 'r', chunkId + '.js'), js); chunkId++; chunk = []; cLen = 0; };
let lastSrc = null;
for (const r of recs) {
  if (r.src !== lastSrc && chunk.length) flushChunk();
  lastSrc = r.src;
  if (!chunk.length) chunkStarts.push(r.i);
  const o = {};
  for (const k of KEEP) if (r[k] !== undefined && !(k === 'toc' && !['ibnukatsir', 'jalalain', 'riyadh', 'gurda'].includes(r.src))) o[k] = r[k];
  if (r.id) o.id = r.id;
  if (grpOf[r.i] >= 0) o.dup = rel.ident[grpOf[r.i]].filter(j => j !== r.i).map(j => [j, shortLabel(recs[j]), recs[j].src]);
  const sim = rel.similar[r.i];
  if (sim) {
    const seenG = new Set(); const lst = [];
    for (const [j, pct] of sim) { const g = grpOf[j] >= 0 ? 'g' + grpOf[j] : 'i' + j; if (seenG.has(g) || (grpOf[r.i] >= 0 && grpOf[j] === grpOf[r.i])) continue; seenG.add(g); lst.push([j, pct, shortLabel(recs[j]), recs[j].src]); if (lst.length >= 8) break; }
    if (lst.length) o.sim = lst;
  }
  if (r.src === 'quran') {
    const jj = jal.get(r.s + ':' + r.a); if (jj != null) o.jal = jj;
    const kk = ik.find(x => x[0] === r.s && r.a >= x[1] && r.a <= x[2]); if (kk) o.ik = kk[3];
  }
  const js = JSON.stringify(o); chunk.push(o); cLen += js.length;
  if (cLen >= CH) flushChunk();
}
flushChunk();
console.log('chunk record', chunkId, 'MB', (recBytes / 1e6).toFixed(1));

// daftar isi per sumber (untuk menjelajah kitab/bab)
for (const s of manifest.sources) {
  const kit = []; let cur = null, curB = null;
  for (let i = s.start; i < s.start + s.count; i++) {
    const r = recs[i];
    let K, Bb;
    if (s.code === 'quran') { K = r.s + '. ' + r.surah; Bb = null; }
    else if (s.code === 'qtema') { K = r.tema; Bb = r.sub || r.label; }
    else if (s.code === 'ibnukatsir') { K = (r.toc && r.toc[2]) || 'Pendahuluan'; Bb = r.title; }
    else if (s.code === 'jalalain') { K = (r.toc && r.toc[0]) || ''; Bb = (r.toc && r.toc[1]) || ''; }
    else if (s.code === 'gurda') { K = (r.toc && r.toc.length > 2 ? r.toc[1] : r.toc && r.toc[0]) || 'Pelatihan Gurda'; Bb = r.title; }
    else if (s.code === 'kitab9') { K = COLLN[r.coll] + ' › ' + (r.kitab || ''); Bb = r.bab || ''; }
    else { K = r.kitab || '—'; Bb = r.bab || ''; }
    if (!cur || cur[0] !== K) { cur = [K, i, 0, []]; kit.push(cur); curB = null; }
    cur[2]++;
    if (Bb != null) { if (!curB || curB[0] !== Bb) { curB = [Bb, i, 0]; cur[3].push(curB); } curB[2]++; }
  }
  writeJs(path.join(TMP, 'toc', s.code + '.js'), 'PRMK.t(' + JSON.stringify(s.code) + ',' + JSON.stringify(kit) + ');');
}

// meta
const dlq = Buffer.alloc(N); for (let i = 0; i < N; i++) dlq[i] = Math.min(255, Math.round(Math.log2(dl[i] + 1) * 16));
const grpFlat = []; for (const g of rel.ident) { grpFlat.push(g.length, g[0]); for (let k = 1; k < g.length; k++) grpFlat.push(g[k] - g[k - 1]); }
const k9 = []; let pc = null;
for (let i = SRC.kitab9.start; i < SRC.kitab9.start + SRC.kitab9.count; i++) if (recs[i].coll !== pc) { pc = recs[i].coll; k9.push([i, pc]); }
const qs = SRC.quran.start; const sOff = [];
for (let i = qs; i < qs + SRC.quran.count; i++) if (recs[i].a === 1) sOff.push(i - qs);
const build = new Date().toISOString().replace(/\D/g, '').slice(0, 12);
const meta = {
  build, N, sources: manifest.sources.map(s => ({ code: s.code, name: s.name, file: s.file, cat: s.cat, start: s.start, count: s.count })),
  k9, quranStart: qs, surahOff: sOff, dlq: dlq.toString('base64'), grp: vlq(grpFlat), nGrp: rel.ident.length,
  chunks: vlq(chunkStarts.map((v, i) => i ? v - chunkStarts[i - 1] : v)), nChunks: chunkId,
  dict: dictFiles, split: Array.from(SPLIT), packs: packId, relMethod: rel.method, relStats: rel.stats
};
writeJs(path.join(TMP, 'meta.js'), 'window.PRMK=window.PRMK||{};PRMK.meta=' + JSON.stringify(meta) + ';');

// indeks transliterasi: kerangka huruf Arab per ayat (fungsi yang sama dengan data/lib/kitab.js)
{
  const KK = require(path.join(APP, 'data', 'lib', 'kitab.js'));
  const arr = []; let n = 0;
  for (let i = SRC.quran.start; i < SRC.quran.start + SRC.quran.count; i++) { const r = recs[i]; const sk = r.arT ? KK.skelAr(r.arT).s : ''; if (sk) n++; arr.push(sk); }
  writeJs(path.join(TMP, 'translit.js'), 'PRMK.tl(' + JSON.stringify(arr) + ',' + JSON.stringify('kerangka huruf dari teks Arab ayat (Tafsir Ibnu Katsir; QS 1:1 dari Tafsir Jalalain)') + ');');
  console.log('indeks transliterasi ayat', n, 'dari', arr.length);
}
// gambar ayat (asli dari Al_Quran_Digital_2.1.chm)
let nImg = 0;
for (const r of recs) if (r.src === 'quran' && r.img) {
  const src = path.join(QIMG, '..', r.img); const dst = path.join(TMP, 'qimg', r.img.replace(/^img\//, ''));
  fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); nImg++;
}
fs.copyFileSync(path.join(QIMG, 'bismillah.png'), path.join(TMP, 'qimg', 'bismillah.png'));
console.log('gambar ayat', nImg);

// tukar folder secara atomik
if (fs.existsSync(OUT)) { rmrf(OUT + '.prev'); fs.renameSync(OUT, OUT + '.prev'); }
fs.renameSync(TMP, OUT);
fs.writeFileSync(path.join(OUT, 'BUILD.txt'), 'build ' + build + '\nrecord ' + N + '\nposting packs ' + packId + '\nkamus shard ' + shards.size + '\nchunk record ' + chunkId + '\n');
console.log('selesai', build, ((Date.now() - t0) / 1000).toFixed(1) + 's');
