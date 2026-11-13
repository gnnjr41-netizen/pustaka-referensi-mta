/* Bangun potongan teks (passage) untuk indeks semantik dari database V3.1 yang sebenarnya.
   Pakai: node build_passages.js <folder-aplikasi> <kitab_records.jsonl> <keluaran.jsonl> */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), readline = require('readline');
const { semNorm, matan } = require('./teks.js');
const [APP, RECS, OUT] = process.argv.slice(2);
function loadJs(file, ctx) { ctx = ctx || {}; for (const k of Object.keys(ctx.window || {})) ctx[k] = ctx.window[k]; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(fs.readFileSync(file, 'utf8'), ctx); return ctx; }
// meta kitab (grup teks identik) & meta makna (judul kelompok ayat, indeks tema)
const kc0 = { window: { PRMK: {} } }; kc0.PRMK = kc0.window.PRMK; const kc = loadJs(path.join(APP, 'data/kitab/meta.js'), kc0);
const KM = kc.window.PRMK.meta; KM.src = {}; for (const s of KM.sources) KM.src[s.code] = s;
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'; const DEC = {}; for (let i = 0; i < 64; i++) DEC[B64[i]] = i;
function unvlq(s) { const o = []; let n = 0, sh = 1; for (const c of s) { const d = DEC[c]; n += (d & 31) * sh; if (d & 32) sh *= 32; else { o.push(n); n = 0; sh = 1; } } return o; }
const lead = new Int32Array(KM.N).fill(-1); { const g = unvlq(KM.grp); for (let k = 0; k < g.length;) { const n = g[k++]; let x = g[k++]; const mem = [x]; for (let j = 1; j < n; j++) { x += g[k++]; mem.push(x); } for (const m of mem) lead[m] = mem[0]; } }
const mc = { window: { PRMQ: {} } }; mc.PRMQ = mc.window.PRMQ; loadJs(path.join(APP, 'data/kitab/makna/meta.js'), mc); const MM = mc.window.PRMQ.meta;
const headOf = new Map(); // x → [judul utama, judul sub]
for (const h of MM.heads) for (let x = h[1]; x <= h[2]; x++) { const e = headOf.get(x) || {}; e[h[0]] = h[4]; headOf.set(x, e); }
const temaOf = new Map(); for (const t of MM.tema) for (const x of t[3]) { const a = temaOf.get(x) || []; a.push([t[0], t[1], t[2]].filter(Boolean).join(' › ')); temaOf.set(x, a); }
const out = fs.createWriteStream(OUT); let nP = 0; const stat = {};
function emit(o) { if (!o.text || o.text.length < 8) return; o.pid = nP++; out.write(JSON.stringify(o) + '\n'); stat[o.src] = (stat[o.src] || 0) + 1; }
// potong blok (paragraf) menjadi jendela ±maxc karakter, simpan rentang blok
function windows(blocks, maxc, ctx) {
  const res = []; let cur = [], len = 0, b0 = -1;
  blocks.forEach((b, k) => {
    if (!b || b[0] === 'a') return; // paragraf Arab murni dilewati (dicari secara literal)
    const t = semNorm(b[1]); if (!t) return;
    if (len && len + t.length > maxc) { res.push({ b0, b1: k - 1, text: cur.join(' ') }); cur = []; len = 0; b0 = -1; }
    if (b0 < 0) b0 = k;
    if (t.length > maxc * 1.6) { // paragraf sangat panjang → pecah per kalimat
      const sents = t.split(/(?<=[.!?;:])\s+/); let s2 = [], l2 = 0;
      for (const s of sents) { if (l2 && l2 + s.length > maxc) { res.push({ b0: k, b1: k, text: s2.join(' ') }); s2 = []; l2 = 0; } s2.push(s); l2 += s.length + 1; }
      if (s2.length) { cur.push(s2.join(' ')); len += l2; }
    } else { cur.push(t); len += t.length + 1; }
  });
  if (cur.length) res.push({ b0, b1: blocks.length - 1, text: cur.join(' ') });
  return res;
}
(async () => {
  const rl = readline.createInterface({ input: fs.createReadStream(RECS), crlfDelay: Infinity });
  for await (const line of rl) {
    const r = JSON.parse(line); const i = r.i;
    if (lead[i] >= 0 && lead[i] !== i) continue; // teks identik: cukup satu vektor (pemimpin grup)
    if (r.src === 'quran') {
      // uji prototipe: terjemahan saja memberi hasil terbaik untuk vektor kata (judul kelompok & tema sudah dipakai mesin makna V3.1)
      emit({ src: 'quran', i, v: 'id', text: semNorm(String(r.tr || '')) });
    } else if (r.src === 'qtema') {
      emit({ src: 'qtema', i, text: "Indeks tema Al-Qur'an: " + [r.tema, r.sub, r.label].filter(Boolean).join(' › ') });
    } else if (r.src === 'jalalain') {
      emit({ src: 'jalalain', i, text: semNorm(r.tr) });
    } else if (r.src === 'ibnukatsir' || r.src === 'gurda') {
      const head = r.src === 'gurda' ? (r.toc || [r.title]).join(' › ') : 'Tafsir ' + (r.title || '');
      for (const w of windows(r.blocks || [], 1100)) emit({ src: r.src, i, b0: w.b0, b1: w.b1, text: head + '. ' + w.text });
    } else if (KM.src[r.src] && KM.src[r.src].cat === 'hadis') {
      const ctx = [r.kitab && r.kitab !== r.bab ? r.kitab : null, r.bab].filter(Boolean).map(s => semNorm(s).replace(/^\d+\.\s*/, '')).join(' — ');
      const m = r.kind === 'teks' ? semNorm(r.tr) : matan(r.tr);
      emit({ src: r.src, i, text: (ctx ? 'Bab: ' + ctx + '. ' : '') + m });
    }
  }
  // Arsip CHM
  const dc = { window: {} }; dc.PRM_DATA = undefined; loadJs(path.join(APP, 'data/chm_docs.js'), dc); const docs = dc.window.PRM_DATA.docs;
  const years = Array.from(new Set(docs.map(d => d.shard)));
  for (const y of years) {
    const sc = { window: {} }; loadJs(path.join(APP, 'data/chm_' + y + '.js'), sc); const sh = sc.window.PRM_DATA.shards[y];
    for (const d of docs.filter(d => d.shard === y)) { const bl = sh[d.id]; if (!bl) continue;
      for (const w of windows(bl, 1100)) emit({ src: 'chm', d: d.id, b0: w.b0, b1: w.b1, text: 'Brosur: ' + semNorm(d.title) + '. ' + w.text }); }
  }
  // Brosur PDF bawaan (data/pdf_seed.js); brosur online Supabase tidak tersedia saat build → belum terindeks semantik
  const pc = { window: {} }; loadJs(path.join(APP, 'data/pdf_seed.js'), pc);
  for (const p of pc.window.PRM_DATA.pdfs || []) {
    const pages = new Map(); (p.blocks || []).forEach((b, k) => { const pg = b[2] || 1; if (!pages.has(pg)) pages.set(pg, []); pages.get(pg).push([b, k]); });
    for (const [pg, arr] of pages) {
      const bl = arr.map(x => x[0]); const ws = windows(bl, 1100);
      for (const w of ws) emit({ src: 'pdf', d: p.file, page: pg, b0: arr[Math.max(0, w.b0)][1], b1: arr[Math.min(arr.length - 1, w.b1)][1], text: 'Brosur: ' + semNorm(p.title) + '. ' + w.text });
    }
  }
  out.end(); console.log('passages', nP, stat);
})();
