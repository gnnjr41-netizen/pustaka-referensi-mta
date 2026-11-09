/* PRMS — Mesin Mode Support Ustadz (tanpa AI generatif).
   Alur: permintaan → bersihkan kata pengantar → normalisasi ejaan → kamus tema/sinonim → kelompok konsep
         → pencarian bertingkat (frasa, semua konsep, sebagian, sinonim, judul, isi, kategori) di brosur CHM/PDF + Al-Qur'an, tafsir, hadis, materi
         → penilaian Utama / Pendukung → paket bahan kajian A–G yang HANYA berisi kutipan dari sumber yang ditemukan.
   Dipakai di browser (window.PRMS) dan di Node (uji). Bergantung pada window.PRM (mesin teks) dan window.PRMK (indeks kitab). */
(function (root) {
  'use strict';
  const S = root.PRMS = root.PRMS || {};
  const P = () => root.PRM;
  const LSKEY = 'prm-kamus-lokal-v1';

  /* ================= KAMUS ================= */
  function lsGet() { try { return JSON.parse(root.localStorage.getItem(LSKEY) || 'null'); } catch (e) { return null; } }
  function lsSet(v) { try { root.localStorage.setItem(LSKEY, JSON.stringify(v)); return true; } catch (e) { return false; } }
  S.base = () => root.PRM_KAMUS || { abaikan: [], ejaan: [], entri: [] };
  S.local = () => lsGet() || { entri: {}, hapus: [], abaikanTambah: [], abaikanHapus: [], ejaanTambah: [] };
  S.saveLocal = v => lsSet(v);
  S.resetLocal = () => { try { root.localStorage.removeItem(LSKEY); } catch (e) { } };
  /** Kamus gabungan: file kamus_support.js + perubahan lokal admin */
  S.kamus = function () {
    const b = S.base(), l = S.local();
    const entri = new Map(); for (const e of b.entri || []) entri.set(e.id, Object.assign({ asal: 'file' }, e));
    for (const id of l.hapus || []) entri.delete(id);
    for (const id in l.entri || {}) entri.set(id, Object.assign({ asal: 'lokal' }, l.entri[id], { id }));
    const ab = new Set((b.abaikan || []).concat(l.abaikanTambah || [])); for (const w of l.abaikanHapus || []) ab.delete(w);
    const pl = new Set((b.pelengkap || []).concat(l.pelengkapTambah || [])); for (const w of l.pelengkapHapus || []) pl.delete(w);
    return { versi: b.versi, abaikan: Array.from(ab), pelengkap: Array.from(pl), ejaan: (b.ejaan || []).concat(l.ejaanTambah || []), entri: Array.from(entri.values()) };
  };
  S.exportJs = function () {
    const k = S.kamus();
    const ent = k.entri.map(e => ({ id: e.id, kata: e.kata, tema: e.tema || '', sinonim: e.sinonim || [], terkait: e.terkait || [] }));
    return '/* KAMUS KATA KUNCI — Mode Support Ustadz (Pustaka Referensi MTA). Diekspor ' + new Date().toISOString().slice(0, 10) + ' dari editor kamus.\n   Timpa file data/kamus_support.js di repository dengan file ini agar berlaku untuk semua pengguna. */\n' +
      'window.PRM_KAMUS = ' + JSON.stringify({ versi: new Date().toISOString().slice(0, 10), abaikan: k.abaikan, pelengkap: k.pelengkap, ejaan: k.ejaan, entri: ent }, null, 1) + ';\n';
  };
  // indeks kamus ternormalisasi (dicache per versi isi)
  let IDX = null, IDXSIG = '';
  function index() {
    const k = S.kamus(); const sig = JSON.stringify(k).length + ':' + k.entri.length + ':' + (k.versi || '');
    if (IDX && IDXSIG === sig) return IDX;
    const N = s => P().norm(String(s || ''));
    const ab = new Set(k.abaikan.map(N).filter(Boolean));
    const ej = new Map(); // token → daftar varian (token ternormalisasi)
    for (const g of k.ejaan) { const vs = Array.from(new Set(g.map(N).filter(x => x && !x.includes(' ')))); for (const v of vs) ej.set(v, Array.from(new Set((ej.get(v) || []).concat(vs)))); }
    const canon = t => { const g = ej.get(t); return g ? g[0] : t; };
    const keys = []; // {toks:[canon], entry}
    const isStop = t => ab.has(t) || (root.PRM.STOP && root.PRM.STOP.has(t));
    for (const e of k.entri) for (const ph of [e.kata].concat(e.sinonim || [])) { const n = N(ph); if (!n) continue; let tk = n.split(' ').filter(t => !isStop(t)).map(canon); if (!tk.length) tk = n.split(' ').map(canon); keys.push({ toks: tk, entry: e }); }
    keys.sort((a, b) => b.toks.length - a.toks.length);
    const pl = new Set((k.pelengkap || []).map(N).filter(Boolean));
    IDX = { k, ab, ej, canon, keys, N, pl }; IDXSIG = sig; return IDX;
  }
  S.index = index;
  /* ================= ANALISIS KATA KUNCI ================= */
  function stemBase(t) {
    if (t.length < 6 || /\d/.test(t)) return null;
    let s = t.replace(/(nya|lah|kah|pun)$/, '');
    if (/^ke.{3,}an$/.test(s)) s = s.slice(2, -2);
    else { s = s.replace(/^(memper|meng|meny|mem|men|me|ber|be|ter|peng|peny|pem|pen|per|pe|di|se)(?=.{4,})/, ''); s = s.replace(/(kan|an|i)$/, m => (s.length - m.length >= 4 ? '' : m)); }
    return s !== t && s.length >= 4 ? s : null;
  }
  S.stemBase = stemBase;
  /**
   * Kembalikan { raw, tokens, removed[], concepts[], phrase, qref }
   * concept: { label, key, main[], stem[], related[], tema, entry, words[] }
   */
  S.analyze = function (text, opts) {
    const excl = opts && opts.exclude ? new Set(opts.exclude) : null;
    const X = index(); const p = P();
    const pq0 = p.parseQuery(text, {});
    const toks = X.N(text.replace(/["“”]/g, ' ')).split(' ').filter(Boolean);
    const orig = String(text).split(/\s+/).map(w => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(w => X.N(w));
    const concepts = [], removed = [], used = new Array(toks.length).fill(false);
    const ct = toks.map(X.canon);
    // 1) frasa kamus (terpanjang dulu), kata sambung di antaranya dilewati ("istri taat kepada suami")
    const stop = toks.map(t => X.ab.has(t) || p.STOP.has(t));
    const seq = []; toks.forEach((t, i) => { if (!stop[i]) seq.push(i); });
    for (let s = 0; s < seq.length; s++) {
      if (used[seq[s]]) continue;
      for (const key of X.keys) {
        if (excl && excl.has(key.entry.id)) continue;
        const L = key.toks.length; if (s + L > seq.length) continue;
        let ok = true; for (let j = 0; j < L; j++) { const i = seq[s + j]; if (used[i] || ct[i] !== key.toks[j]) { ok = false; break; } }
        if (!ok) continue;
        for (let j = seq[s]; j <= seq[s + L - 1]; j++) used[j] = true;
        concepts.push(fromEntry(key.entry, seq.slice(s, s + L).map(i => toks[i]), X));
        break;
      }
    }
    // 2) kata lain: buang pengantar, sisanya jadi konsep
    for (let i = 0; i < toks.length; i++) {
      if (used[i]) continue; const t = toks[i];
      if (X.ab.has(t) || p.STOP.has(t) || (t.length < 2 && !/\d/.test(t))) { removed.push(orig[i] || t); continue; }
      if (pq0.qref && pq0.qrefWords && pq0.qrefWords.includes(t)) continue;
      if (/^\d+$/.test(t) && pq0.qref) continue;
      const main = new Set(X.ej.get(t) || [t]);
      if (p.VARMAP.has(t)) p.VARMAP.get(t).forEach(v => main.add(v));
      const st = stemBase(t); const stem = st && !main.has(st) ? [st] : [];
      concepts.push({ label: orig[i] || t, key: t, main: Array.from(main), stem, related: [], tema: '', entry: null, words: [t], mod: X.pl.has(t) || X.pl.has(X.canon(t)) });
    }
    // gabungkan konsep yang sama, buang konsep kata yang sudah tercakup varian konsep kamus
    const out = [];
    for (const c of concepts) {
      const dupe = out.find(o => o.main.some(v => c.main.includes(v)));
      if (dupe) { if (!dupe.entry && c.entry) Object.assign(dupe, c); continue; }
      out.push(c);
    }
    // urutkan sesuai posisi kemunculan
    out.sort((a, b) => toks.indexOf(a.words[0]) - toks.indexOf(b.words[0]));
    const imp = toks.filter((t, i) => !removed.includes(orig[i]) && !X.ab.has(t) && !p.STOP.has(t));
    if (out.every(c => c.mod)) out.forEach(c => { c.mod = false; });
    return { raw: text, tokens: toks, removed, concepts: out, phrase: imp.length >= 2 ? imp.join(' ') : null, qref: pq0.qref || null, qrefLabel: pq0.qrefLabel || null, cleaned: imp.join(' ') };
  };
  function fromEntry(e, words, X) {
    const main = new Set(), related = new Set();
    for (const ph of [e.kata].concat(e.sinonim || [])) { const n = X.N(ph); if (!n) continue; main.add(n); if (!n.includes(' ')) (X.ej.get(n) || []).forEach(v => main.add(v)); }
    for (const ph of e.terkait || []) { const n = X.N(ph); if (n && !main.has(n)) related.add(n); }
    // varian ejaan untuk tiap kata dalam frasa utama (mis. "ziarah kubur" → "ziyarah qubur")
    for (const ph of Array.from(main)) {
      const ws = ph.split(' '); if (ws.length < 2 || ws.length > 3) continue;
      const alts = ws.map(w => (X.ej.get(w) || [w]).slice(0, 4));
      const comb = alts.reduce((acc, a) => acc.flatMap(x => a.map(y => x ? x + ' ' + y : y)), ['']);
      comb.slice(0, 24).forEach(c => main.add(c));
    }
    return { label: e.kata, key: X.N(e.kata), main: Array.from(main), stem: [], related: Array.from(related), tema: e.tema || '', entry: e.id, words };
  }
  /* ================= PENCARIAN BERTINGKAT ================= */
  const CAT_LABEL = { quran: "Al-Qur'an", tafsir: 'Tafsir', hadis: 'Hadis', materi: 'Materi pelatihan' };
  function idf(n, N) { return Math.log(1 + (N - n + 0.5) / (n + 0.5)); }
  /**
   * ctx: { docs: [dokumen brosur ber-indeks], docFilter?(d), withKitab?:true, kitabAllow?(i) }
   * Kembalikan paket data (tanpa HTML).
   */
  S.run = async function (text, ctx) {
    ctx = ctx || {};
    const p = P(), K = root.PRMK;
    const t0 = Date.now();
    const A = S.analyze(text);
    const C = A.concepts;
    const core = C.map(c => !c.mod); const nCore = core.filter(Boolean).length || C.length;
    const pack = { request: text, date: new Date(), analysis: A, brosur: [], kitab: [], notes: [], ms: 0 };
    if (!C.length && !A.qref) { pack.empty = true; return pack; }
    // ---------- 1. brosur CHM + PDF (mesin lama, tanpa kata wajib) ----------
    const groups = C.map(c => ({ label: c.label, key: c.key, variants: Array.from(new Set(c.main.concat(c.stem, c.related))), weak: new Set(c.stem.concat(c.related)), kind: 'term' }));
    const pqB = { raw: text, groups, phrase: A.phrase, qref: A.qref, excludes: [], notes: [] };
    if (pqB.qref) pqB.qrefLabel = A.qrefLabel;
    const docs = ctx.docs || [];
    const rb = docs.length ? p.search(docs, pqB, { filter: ctx.docFilter }) : { results: [], df: [] };
    for (const x of rb.results) {
      const d = x.doc; const hs = d.idx.s;
      const tnorm = p.norm((d.title || '') + ' ' + (d.sub || ''));
      const mainHit = C.map(c => c.main.some(v => hasWord(hs, v)) ? 1 : 0);
      const anyWord = mainHit.some(Boolean) || C.some(c => c.stem.concat(c.related).some(v => hasWord(hs, v)));
      if (!anyWord && !(x.refHits && x.refHits.length)) continue; // hanya cocok di tengah kata lain → bukan referensi
      const titleHit = C.some(c => c.main.some(v => contains(tnorm, v)));
      const phraseHit = !!(x.phraseHits && x.phraseHits.n) || (x.refHits && x.refHits.length > 0);
      const nMain = mainHit.reduce((a, b, ci) => a + (core[ci] ? b : 0), 0);
      const titleCore = C.some((c, ci) => core[ci] && c.main.some(v => contains(tnorm, v)));
      const level = ((phraseHit || nMain === nCore) && nMain > 0) || (x.refHits && x.refHits.length) ? 'utama' : 'pendukung';
      pack.brosur.push({ kind: 'brosur', doc: d, res: x, level, score: x.score + (titleHit ? 4 : 0) + nMain * 3, titleHit, phraseHit, mainHit, cat: d.src === 'PDF' ? 'pdf' : 'chm' });
    }
    pack.brosur.sort((a, b) => lvl(b) - lvl(a) || b.score - a.score);
    // ---------- 2. Al-Qur'an, tafsir, hadis, materi (indeks kitab) ----------
    if (K && ctx.withKitab !== false) {
      await K.init(); const M = K.info();
      const ok = ctx.kitabAllow || null;
      const per = new Map(); // i → {i, hits:[score per konsep], strong:[], phrase, tl, dups}
      const get = i => { let e = per.get(i); if (!e) { e = { i, sc: new Array(C.length).fill(0), st: new Array(C.length).fill(0), rel: new Array(C.length).fill(0), phrase: 0, tl: null, ref: false, dups: [] }; per.set(i, e); } return e; };
      const conceptDf = new Array(C.length).fill(0);
      for (let ci = 0; ci < C.length; ci++) {
        const c = C[ci];
        const single = c.main.filter(v => !v.includes(' '));
        const stemS = c.stem.filter(v => !v.includes(' ') && !single.includes(v));
        const multi = c.main.filter(v => v.includes(' '));
        const relSingle = c.related.filter(v => !v.includes(' '));
        const short = single.some(v => v.length <= 4);
        const runs = [];
        if (single.length) runs.push({ pq: { raw: c.label, groups: [{ label: c.label, key: single[0], variants: single, kind: 'term' }], excludes: [] }, w: 1, whole: short });
        if (stemS.length) runs.push({ pq: { raw: c.label + ' (bentuk dasar)', groups: [{ label: 'dasar', key: stemS[0], variants: stemS, kind: 'term' }], excludes: [] }, w: 0.5, related: true, whole: true });
        for (const ph of multi.slice(0, 10)) runs.push({ pq: { raw: '"' + ph + '"', groups: [{ label: ph, key: ph, variants: [ph], kind: 'phrase', required: true }], excludes: [] }, w: 1.2 });
        if (relSingle.length) runs.push({ pq: { raw: c.label + ' (terkait)', groups: [{ label: 'terkait', key: relSingle[0], variants: relSingle, weak: new Set(relSingle), kind: 'term' }], excludes: [] }, w: 0.35, related: true, whole: true });
        const seen = new Set();
        for (const run of runs) {
          const r = await K.search(run.pq, { whole: !!run.whole, allow: ok, translit: false, noCollapse: true, noColl: true });
          const top = r.results.slice(0, 600); const max = top.length ? top[0].score || 1 : 1;
          for (const x of top) {
            const e = get(x.i); const v = run.w * (x.score / max);
            if (run.related) { e.rel[ci] = Math.max(e.rel[ci], v); continue; }
            e.sc[ci] = Math.max(e.sc[ci], v); e.st[ci] = 1; if (run.pq.groups[0].kind === 'phrase') e.phrase = Math.max(e.phrase, 1); seen.add(x.i);
          }
        }
        conceptDf[ci] = seen.size;
      }
      // frasa kata penting persis (tingkat 1) + transliterasi/rujukan ayat
      if (A.phrase && C.length >= 2) {
        const r = await K.search({ raw: '"' + A.phrase + '"', groups: [{ label: A.phrase, key: A.phrase, variants: [A.phrase], kind: 'phrase', required: true }], excludes: [] }, { allow: ok, translit: false, noCollapse: true, noColl: true });
        for (const x of r.results.slice(0, 300)) get(x.i).phrase = 2;
      }
      { const r = await K.search(Object.assign(p.parseQuery(A.qref ? text : A.cleaned || text, {}), {}), { allow: ok, noCollapse: true, noColl: true });
        // transliterasi hanya diterima bila persis & mencakup sebagian besar ayat (mencegah kebetulan dari kata Indonesia)
        for (const x of r.results) { const tlOk = x.tl && x.tl.err === 0 && !x.tl.part && x.tl.cover >= 0.5; if (tlOk || x.ref) { const e = get(x.i); if (tlOk) e.tl = x.tl; if (x.ref) e.ref = true; } } }
      const w = C.map((c, ci) => idf(conceptDf[ci], M.N));
      const wsum = w.reduce((a, b) => a + b, 0) || 1;
      for (const e of per.values()) {
        const nMain = e.st.reduce((a, b, ci) => a + (core[ci] ? b : 0), 0) + 0;
        const nAll = e.st.reduce((a, b) => a + b, 0);
        let score = 0; for (let ci = 0; ci < C.length; ci++) score += (e.sc[ci] + e.rel[ci] * 0.5) * w[ci] / wsum * 10;
        score += nMain * 4 + (nAll - nMain) * 1.5 + e.phrase * 6 + (e.tl ? 8 : 0) + (e.ref ? 20 : 0);
        // frasa sinonim satu konsep (phrase=1) hanya menghitung konsep itu; frasa seluruh kata penting (phrase=2) → utama
        const level = (e.ref || e.tl || e.phrase === 2 || (nMain === nCore && nMain > 0)) ? 'utama' : 'pendukung';
        const s = K.srcOf(e.i);
        pack.kitab.push({ kind: 'kitab', i: e.i, cat: s.cat, src: s.code, level, score, nMain, onlyRelated: nMain === 0, phrase: e.phrase, tl: e.tl, ref: e.ref });
      }
      // gabungkan record identik (sumber tetap tercantum)
      pack.kitab.sort((a, b) => lvl(b) - lvl(a) || b.score - a.score || a.i - b.i);
      const seenG = new Map(), out = [];
      for (const x of pack.kitab) { const g = M.lead[x.i]; if (g >= 0) { if (seenG.has(g)) { seenG.get(g).dups.push(x.i); continue; } x.dups = []; seenG.set(g, x); } out.push(x); }
      pack.kitab = out;
      // muat record teratas per kategori + tandai kecocokan judul
      const want = []; const take = { quran: 10, hadis: 14, tafsir: 5, materi: 8 };
      for (const cat in take) want.push(...pack.kitab.filter(x => x.cat === cat).slice(0, take[cat] * 2).map(x => x.i));
      const recs = await K.get(want); pack.recs = recs;
      for (const x of pack.kitab) {
        const r = recs.get(x.i); if (!r) continue;
        const tn = p.norm([r.title, r.bab, r.kitab, r.label, r.tema, (r.topik || []).join(' ')].filter(Boolean).join(' '));
        x.titleHit = C.some((c, ci) => core[ci] && c.main.some(v => contains(tn, v)));
        if (x.titleHit) x.score += 5;
      }
      pack.kitab.sort((a, b) => lvl(b) - lvl(a) || b.score - a.score || a.i - b.i);
    }
    // ---------- 2b. Al-Qur'an berdasarkan makna (indeks makna statis, data/lib/makna.js) ----------
    if (K && ctx.withKitab !== false && root.PRMQ && !A.qref) {
      try {
        const mk = await root.PRMQ.search(text, { analysis: A, limit: 12, limitP: 6 });
        if (!mk.empty) {
          pack.makna = mk;
          const rr = await K.get(mk.utama.concat(mk.pendukung).map(o => root.PRMQ.docOfAyat(o.x)));
          if (!pack.recs) pack.recs = new Map(); for (const [i, r] of rr) pack.recs.set(i, r);
        }
      } catch (e) { pack.maknaErr = e.message; }
    }
    // ---------- 3. susun paket ----------
    build(pack, ctx);
    pack.ms = Date.now() - t0;
    return pack;
  };
  function lvl(x) { return x.level === 'utama' ? 1 : 0; }
  function contains(hay, v) { if (!v) return false; const i = hay.indexOf(v); if (i < 0) return false; const b1 = i === 0 || hay[i - 1] === ' ', b2 = i + v.length >= hay.length || hay[i + v.length] === ' '; return v.length <= 4 ? (b1 && b2) : b1; }
  // kata utuh atau berimbuhan Indonesia di depan (ber-, di-, me-, ter-…); mencegah kecocokan di tengah kata (riba ≠ pribadi)
  const AFX = '(?:ber|be|di|me|mem|men|meng|meny|ter|se|ke|pe|per|pen|pem|peng)?';
  const RE = new Map();
  function hasWord(hay, v) { let re = RE.get(v); if (!re) { re = new RegExp('(?:^|[\\s])' + AFX + v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); if (RE.size > 3000) RE.clear(); RE.set(v, re); } return re.test(hay); }
  S.hasWord = hasWord;
  /* ---------- penyusunan paket A–G (hanya dari sumber yang ditemukan) ---------- */
  function build(pack, ctx) {
    const p = P(), K = root.PRMK; const A = pack.analysis, C = A.concepts;
    const allMain = Array.from(new Set(C.filter(c => !c.mod || C.every(z => z.mod)).flatMap(c => c.main.concat(c.stem))));
    const mainRe = s => { const n = p.norm(s); return allMain.some(v => contains(n, v)); };
    const recs = pack.recs || new Map();
    const byCat = cat => pack.kitab.filter(x => x.cat === cat && recs.has(x.i));
    pack.quran = byCat('quran').filter(x => K.srcOf(x.i).code === 'quran' || x.level === 'utama').slice(0, 10);
    if (pack.makna) { // ayat berdasarkan makna menggantikan daftar ayat hasil pencocokan kata; indeks tema tetap dicantumkan
      const mk = pack.makna, Q = root.PRMQ;
      const qt = byCat('quran').filter(x => K.srcOf(x.i).code === 'qtema' && x.level === 'utama').slice(0, 2);
      const it = o => ({ kind: 'kitab', i: Q.docOfAyat(o.x), cat: 'quran', src: 'quran', level: o.utama ? 'utama' : 'pendukung', mk: o, score: o.score });
      pack.quran = qt.concat(mk.utama.slice(0, 10).map(it), mk.pendukung.slice(0, 4).map(it)).filter(x => recs.has(x.i));
    }
    pack.hadis = byCat('hadis').slice(0, 14);
    pack.tafsir = byCat('tafsir').slice(0, 5);
    pack.materi = byCat('materi').slice(0, 8);
    pack.chm = pack.brosur.filter(x => x.cat === 'chm').slice(0, 15);
    pack.pdf = pack.brosur.filter(x => x.cat === 'pdf').slice(0, 10);
    pack.counts = {
      quran: pack.makna ? { total: pack.makna.utamaTotal + pack.makna.pendukungTotal, utama: pack.makna.utamaTotal } : byCatAll(pack, 'quran'), hadis: byCatAll(pack, 'hadis'), tafsir: byCatAll(pack, 'tafsir'), materi: byCatAll(pack, 'materi'),
      chm: count(pack.brosur.filter(x => x.cat === 'chm')), pdf: count(pack.brosur.filter(x => x.cat === 'pdf'))
    };
    // ayat & hadits yang DIKUTIP di brosur utama (dengan rujukan tertulis)
    pack.cited = { ayat: [], hadits: [] };
    const ayatMap = new Map();
    for (const b of pack.brosur.filter(x => x.level === 'utama').slice(0, 40)) {
      const d = b.doc; if (!d.blocks) continue;
      const refs = d.refs || (d.refs = p.extractRefs(d.blocks));
      const hitBlocks = new Set(b.res.locs.map(l => l.bi));
      for (const q of refs.q) {
        if (!hitBlocks.has(q[0]) && !hitBlocks.has(q[0] - 1) && !hitBlocks.has(q[0] + 1)) continue;
        const key = q[1] + ':' + q[2] + '-' + q[3];
        if (!ayatMap.has(key)) ayatMap.set(key, { s: q[1], a1: q[2], a2: q[3], docs: [] });
        const g = ayatMap.get(key); if (!g.docs.some(z => z.doc === d)) g.docs.push({ doc: d, bi: q[0] });
      }
      for (const h of refs.h) {
        if (!hitBlocks.has(h[0])) continue;
        if (pack.cited.hadits.length >= 12) break;
        pack.cited.hadits.push({ doc: d, bi: h[0], perawi: h[1], text: d.blocks[h[0]][1], ar: h[0] > 0 && d.blocks[h[0] - 1][0] === 'a' ? d.blocks[h[0] - 1][1] : '' });
      }
    }
    pack.cited.ayat = Array.from(ayatMap.values()).sort((a, b) => b.docs.length - a.docs.length).slice(0, 12);
    // ---- B. kerangka pembahasan dari judul/bab sumber yang ditemukan ----
    const heads = new Map();
    const addHead = (txt, w, src) => {
      if (!txt) return; let t = String(txt).replace(/\s+/g, ' ').trim().replace(/^(materi\s*(ke\s*-?\s*)?\d+\s*[:.\-]?\s*|bab\s*\d+\s*[:.]?\s*|\d+\s*[.)]\s*|[a-z]\s*[.)]\s+|[ivx]+\s*[.)]\s+)/i, '');
      if (t.length < 4 || t.length > 110) return;
      const key = p.norm(t).replace(/\d+/g, '').trim(); if (!key || key.split(' ').length > 14) return;
      let e = heads.get(key); if (!e) { e = { text: titleCase(t), key, w: 0, srcs: [], rel: mainRe(t) }; heads.set(key, e); }
      e.w += w; if (e.srcs.length < 6 && !e.srcs.some(s => s.label === src.label)) e.srcs.push(src);
    };
    for (const b of pack.brosur.slice(0, 25)) {
      const d = b.doc, w = b.level === 'utama' ? 2 : 1; const src = { type: 'brosur', id: d.id, bi: b.res.locs[0] ? b.res.locs[0].bi : 0, label: (d.src === 'PDF' ? 'PDF' : 'CHM') + ' · ' + d.title };
      addHead(d.title, w, src);
      if (d.blocks) for (const L of b.res.locs.slice(0, 4)) { const h = p.headingBefore(d.blocks, L.bi); if (h && h !== d.title) addHead(h, w, Object.assign({}, src, { bi: L.bi })); }
    }
    for (const x of pack.kitab.slice(0, 80)) {
      const r = recs.get(x.i); if (!r) continue; const w = x.level === 'utama' ? 2 : 1;
      const src = { type: 'kitab', i: x.i, label: K.title(r) + (r.no ? ' No. ' + r.no : '') };
      if (r.src === 'gurda') { addHead(r.title, w + 1, src); (r.blocks || []).forEach((bl, k) => { if (bl[0] === 'h') addHead(bl[1], w, Object.assign({}, src, { bi: k })); }); }
      else if (x.cat === 'hadis' && r.bab) addHead(r.bab, w, src);
      else if (x.cat === 'tafsir' && r.src === 'ibnukatsir') { }
    }
    const H = Array.from(heads.values()).filter(h => h.rel || h.w >= 3).sort((a, b) => (b.rel - a.rel) || b.w - a.w || b.srcs.length - a.srcs.length);
    pack.kerangka = { pokok: H.slice(0, 3), subtema: H.slice(3, 9) };
    // ---- G. urutan penyampaian ----
    const para = [];
    const DEF = /\b(adalah|ialah|yaitu|yakni|pengertian|artinya|maksudnya|dinamakan)\b/i;
    for (const x of pack.materi.filter(z => z.level === 'utama').concat(pack.materi)) {
      const r = recs.get(x.i); (r.blocks || []).forEach((bl, k) => { if (bl[0] === 'p' && bl[1].length > 50 && bl[1].length < 900 && mainRe(bl[1])) para.push({ text: bl[1], def: DEF.test(bl[1]), src: { type: 'kitab', i: x.i, bi: k, label: K.title(r) + ' · paragraf ' + (k + 1) }, level: x.level, w: x.score }); });
    }
    for (const b of pack.brosur.slice(0, 20)) {
      const d = b.doc; if (!d.blocks) continue;
      for (const L of b.res.locs.slice(0, 6)) { const bl = d.blocks[L.bi]; if (!bl || bl[0] !== 'p' || bl[1].length < 60 || bl[1].length > 900) continue; para.push({ text: bl[1], def: DEF.test(bl[1]), src: { type: 'brosur', id: d.id, bi: L.bi, label: (d.src === 'PDF' ? 'PDF' : 'CHM') + ' · ' + d.title + (d.date ? ' (' + d.date + ')' : '') }, level: b.level, w: b.score }); }
    }
    const seenP = new Set(); const P2 = para.filter(x => { const k = p.norm(x.text).slice(0, 90); if (seenP.has(k)) return false; seenP.add(k); return true; });
    const intro = P2.filter(x => x.def && x.level === 'utama')[0] || P2.filter(x => x.def)[0] || null;
    // maksimal 2 kutipan per sumber agar penjelasan beragam
    const perSrc = new Map(); const expl = [];
    for (const x of P2.filter(z => z !== intro).sort((a, b) => lvl(b) - lvl(a) || (b.def - a.def) || b.w - a.w)) {
      const k = x.src.type + ':' + (x.src.i != null ? x.src.i : x.src.id); const n = perSrc.get(k) || 0; if (n >= 2) continue;
      perSrc.set(k, n + 1); expl.push(x); if (expl.length >= 6) break;
    }
    const closing = [];
    const CLOSE = /^(kesimpulan|penutup|khulashah|khulasah|ringkasan|simpulan)/i;
    for (const x of pack.materi) { const r = recs.get(x.i); const bl = r.blocks || []; for (let k = 0; k < bl.length - 1; k++) if (bl[k][0] === 'h' && CLOSE.test(bl[k][1]) && bl[k + 1][0] === 'p') closing.push({ text: bl[k + 1][1], src: { type: 'kitab', i: x.i, bi: k + 1, label: K.title(r) } }); }
    for (const b of pack.brosur.filter(x => x.level === 'utama').slice(0, 15)) { const bl = b.doc.blocks || []; for (let k = 0; k < bl.length - 1; k++) if (bl[k][0] === 'h' && CLOSE.test(bl[k][1]) && bl[k + 1][0] === 'p') { closing.push({ text: bl[k + 1][1], src: { type: 'brosur', id: b.doc.id, bi: k + 1, label: 'CHM · ' + b.doc.title } }); break; } }
    pack.urutan = [
      { no: 1, judul: 'Pengantar tema', isi: intro ? [intro] : [], kosong: 'Referensi belum ditemukan — perlu dilengkapi oleh penyusun materi.' },
      { no: 2, judul: "Landasan Al-Qur'an", ref: 'quran', isi: pack.quran.filter(x => x.level === 'utama').slice(0, 4).concat(pack.cited.ayat.length ? [] : []), cited: pack.cited.ayat.slice(0, 4), kosong: 'Ayat yang memuat kata kunci belum ditemukan.' },
      { no: 3, judul: 'Penjelasan tafsir', ref: 'tafsir', isi: pack.tafsir.filter(x => x.level === 'utama').slice(0, 2), kosong: 'Tafsir yang memuat kata kunci belum ditemukan.' },
      { no: 4, judul: 'Landasan hadis', ref: 'hadis', isi: pack.hadis.filter(x => x.level === 'utama').slice(0, 5), cited: pack.cited.hadits.slice(0, 3), kosong: 'Hadis yang memuat kata kunci belum ditemukan.' },
      { no: 5, judul: 'Penjelasan dari kitab, materi atau brosur', isi: expl, kosong: 'Kutipan penjelasan belum ditemukan.' },
      { no: 6, judul: 'Poin penting pembahasan', poin: pack.kerangka.pokok.concat(pack.kerangka.subtema).slice(0, 8), kosong: 'Judul/subjudul pembahasan belum ditemukan di sumber.' },
      { no: 7, judul: 'Penutup / kesimpulan', isi: closing.slice(0, 2), kosong: 'Tidak ada bagian kesimpulan di sumber yang ditemukan — perlu dilengkapi oleh penyusun materi.' }
    ];
    pack.tema = titleCase(C.map(c => c.label).join(' · ') || A.qrefLabel || pack.request);
  }
  function count(list) { return { total: list.length, utama: list.filter(x => x.level === 'utama').length }; }
  function byCatAll(pack, cat) { return count(pack.kitab.filter(x => x.cat === cat)); }
  function titleCase(t) {
    const letters = String(t).replace(/[^A-Za-z]/g, ''); if (!letters) return t;
    const up = letters.replace(/[^A-Z]/g, '').length / letters.length;
    if (up < 0.7) return t.charAt(0).toUpperCase() + t.slice(1);
    return String(t).toLowerCase().replace(/(^|[\s(“"'‘-])(\p{L})/gu, (m, a, c) => a + c.toUpperCase());
  }
  S.titleCase = titleCase;
  S.CAT_LABEL = CAT_LABEL;
})(typeof window !== 'undefined' ? window : globalThis);
if (typeof module !== 'undefined' && module.exports) module.exports = (typeof window !== 'undefined' ? window : globalThis).PRMS;
