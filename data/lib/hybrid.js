/* Pemeringkatan gabungan (PRMH) — v3.2.
   Menggabungkan tiga mesin lokal dengan Reciprocal Rank Fusion (RRF) berbobot:
     lit   = pencarian kata/frasa (BM25 PRMK.search & PRM.search — mesin V3.1)
     makna = pencarian makna Al-Qur'an berbasis tema/terjemahan/tafsir + kamus (PRMQ — mesin V3.1)
     sem   = kemiripan makna dari vektor kata domain (PRMV — baru)
   lalu menentukan tingkat bukti: Dalil utama / Referensi pendukung / Terkait (belum cukup kuat).
   Tingkat ditentukan oleh BUKTI TERTULIS di sumber (kata kunci/sinonim kamus tertulis di ayat/hadis/bab),
   bukan oleh skor kemiripan. Skor kemiripan tidak pernah sendirian menjadikan sesuatu "utama". */
(function (root) {
  'use strict';
  const H = root.PRMH = root.PRMH || {};
  const P = () => root.PRM, Q = () => root.PRMQ, S = () => root.PRMS, K = () => root.PRMK;
  /* ---------- konfigurasi (bisa ditimpa lewat window.PRM_CONFIG.hybrid) ---------- */
  const DEF = {
    k: 60, // konstanta RRF
    // bobot per mode; "quran" dipakai untuk Al-Qur'an (ada mesin makna/tema), "lain" untuk hadis/tafsir/materi/brosur.
    // Nilai awal dipilih dari uji 9 kueri Al-Qur'an (lihat LAPORAN): makna 1,5 · semantik 1 · kata 0,5 → 43/90 ayat rujukan di 10 teratas (V3.1: 37/90).
    weights: {
      campuran: { quran: { lit: 0.5, makna: 1.5, sem: 1.0 }, lain: { lit: 1.0, sem: 1.0 } },
      makna: { quran: { lit: 0.2, makna: 1.5, sem: 1.5 }, lain: { lit: 0.4, sem: 1.5 } },
      literal: { quran: { lit: 1.0 }, lain: { lit: 1.0 } }
    },
    depth: 120,          // berapa peringkat teratas tiap mesin yang ikut digabung
    semTopForTheme: 30,  // hadis/tafsir: "utama" bila kata kunci tertulis DAN (di judul bab ATAU peringkat makna ≤ 30 ATAU peringkat kata ≤ 30 dengan ≥2 kemunculan)
    relMin: 0.55         // kata terdekat (vektor kata) minimal kemiripan 0,55 untuk dicatat sebagai istilah terkait
  };
  H.cfg = function () {
    const c = (root.PRM_CONFIG && root.PRM_CONFIG.hybrid) || {};
    const weights = {}; for (const m of Object.keys(DEF.weights)) weights[m] = Object.assign({}, DEF.weights[m], (c.weights || {})[m] || {});
    return { k: c.k || DEF.k, weights, depth: c.depth || DEF.depth, semTopForTheme: c.semTopForTheme || DEF.semTopForTheme, relMin: c.relMin || DEF.relMin };
  };
  H.weightsFor = function (mode, cat) { const w = H.cfg().weights[mode] || H.cfg().weights.campuran; return (cat === 'quran' ? w.quran : w.lain) || w.lain || w; };
  H.MODES = [['campuran', 'Campuran (disarankan)', 'Makna + tema + kata persis digabung'], ['makna', 'Makna', 'Mengutamakan kemiripan makna & tema'], ['literal', 'Literal', 'Hanya kata/frasa persis — sama dengan V3.1']];
  H.mode = function () { try { const m = root.localStorage && localStorage.getItem('prm-mode'); if (m && H.MODES.some(x => x[0] === m)) return m; } catch (e) { } return 'campuran'; };
  H.setMode = function (m) { try { localStorage.setItem('prm-mode', m); } catch (e) { } };

  /* ---------- analisis permintaan (memakai penganalisis Mode Support yang sama) ---------- */
  const CATW = { ayat: 'quran', ayatayat: 'quran', alquran: 'quran', quran: 'quran', hadis: 'hadis', hadits: 'hadis', hadist: 'hadis', hadith: 'hadis', sunah: 'hadis', dalil: null, dalilnya: null, tafsir: 'tafsir' };
  H.analyze = function (text) {
    const A = S().analyze(text);
    let hint = null; const concepts = [];
    for (const c of A.concepts) {
      const key = P().norm(c.key || c.label || '');
      if (Object.prototype.hasOwnProperty.call(CATW, key)) { if (CATW[key] && !hint) hint = CATW[key]; continue; }
      concepts.push(c);
    }
    const core = concepts.filter(c => !c.mod);
    return { A, concepts, core: core.length ? core : concepts, hint };
  };

  /* ---------- RRF ---------- */
  H.rrf = function (lists, weights, k) {
    k = k || DEF.k; const out = new Map();
    for (const name of Object.keys(lists)) {
      const w = weights[name] || 0; if (!w) continue;
      lists[name].forEach((key, r) => {
        let e = out.get(key); if (!e) { e = { key, score: 0, rank: {} }; out.set(key, e); }
        if (e.rank[name] == null) { e.rank[name] = r + 1; e.score += w / (k + r + 1); }
      });
    }
    return Array.from(out.values()).sort((a, b) => b.score - a.score);
  };

  /* ---------- bukti tertulis ---------- */
  const tokCache = new Map();
  function toksOf(text) { // token normal + bentuk dasar kandidat, untuk pencocokan bentuk berimbuhan
    if (tokCache.has(text)) return tokCache.get(text);
    const t = Q().toks(text); const v = { t, set: new Set(t) };
    if (tokCache.size > 400) tokCache.clear(); tokCache.set(text, v); return v;
  }
  const SUF = ['nya', 'ku', 'mu', 'lah', 'kah', 'pun', 'nyalah'];
  function wordIn(T, w) {
    if (T.set.has(w)) return true;
    for (const t of T.set) if (t.length > w.length && t.startsWith(w) && SUF.includes(t.slice(w.length))) return true;
    if (w.length < 4) return false;
    for (const t of T.set) if (t.length > w.length && t.includes(w) && Q().cands(t).includes(w)) return true;
    return false;
  }
  function posOf(T, w) { const out = []; T.t.forEach((t, i) => { if (t === w || (t.length > w.length && t.startsWith(w) && SUF.includes(t.slice(w.length))) || (w.length >= 4 && t.length > w.length && t.includes(w) && Q().cands(t).includes(w))) out.push(i); }); return out; }
  /** bentuk (kata/frasa) tertulis di teks?
      frasa 2 kata (rumah tangga, hawa nafsu, suami istri): berurutan, jarak ≤ 2 kata;
      frasa ≥ 3 kata: semua kata ada dalam jarak ≤ 2×(jumlah kata − 1) */
  // posisi (indeks token) kecocokan pertama, −1 bila tidak tertulis
  function formPos(T, form) {
    const ws = Q().seqOf(form); if (!ws.length) return -1;
    if (ws.length === 1) { const p = posOf(T, ws[0]); return p.length ? p[0] : -1; }
    const pos = ws.map(w => posOf(T, w)); if (pos.some(p => !p.length)) return -1;
    if (ws.length === 2) { for (const a of pos[0]) if (pos[1].some(b => b > a && b - a <= 2)) return a; return -1; }
    const win = 2 * (ws.length - 1);
    for (const a of pos[0]) { let ok = true; for (let k = 1; k < pos.length; k++) { if (!pos[k].some(b => Math.abs(a - b) <= win)) { ok = false; break; } } if (ok) return a; }
    return -1;
  }
  function formIn(T, form) { return formPos(T, form) >= 0; }
  H.formIn = (text, form) => formIn(toksOf(text), form);
  /** bentuk langsung (kata pengguna + sinonim kamus + bentuk dasar), terkait (kamus + vektor kata) per konsep */
  H.forms = function (an, related) {
    const kam = S().kamus();
    return an.concepts.map(c => {
      const direct = new Set((c.main || []).concat(c.stem || []).map(x => P().norm(x)));
      const rel = new Set((c.related || []).map(x => P().norm(x)));
      const ws = (c.words || []).map(w => P().norm(w));
      // istilah terkait dari vektor kata: hanya untuk kata yang cukup khas (bobot SIF ≥ 0,35; kata umum seperti "orang" dilewati)
      // dan hanya bila kamus belum memberi istilah terkait untuk konsep ini
      if (!(c.related || []).length) for (const r of related || []) if ((r.f == null || r.f >= 0.35) && (ws.includes(r.w) || ws.includes(r.base) || (c.key && P().norm(c.key).split(' ').includes(r.w)))) for (const [w, s] of r.nb) if (s >= Math.max(H.cfg().relMin, ws.length > 1 ? 0.62 : 0) && !direct.has(w)) rel.add(w);
      return { c, label: c.label, mod: !!c.mod, direct: Array.from(direct), rel: Array.from(rel), entry: c.entry && (kam.entri || []).find(e => e.id === c.entry) };
    });
  };
  /** fields: [[nama bidang, teks], ...] → bukti per konsep */
  H.evidence = function (fields, F) {
    const TT = fields.filter(f => f[1]).map(f => [f[0], toksOf(String(f[1]))]);
    return F.map(fc => {
      for (const [fname, T] of TT) for (const f of fc.direct) { const p = formPos(T, f); if (p >= 0) return { label: fc.label, mod: fc.mod, st: 'direct', form: f, field: fname, pos: p }; }
      for (const [fname, T] of TT) for (const f of fc.rel) if (formIn(T, f)) return { label: fc.label, mod: fc.mod, st: 'rel', form: f, field: fname };
      return { label: fc.label, mod: fc.mod, st: 'none' };
    });
  };

  /* ---------- tingkat bukti & tingkat kecocokan ---------- */
  H.TIER = { utama: 'Dalil utama', utamaRef: 'Referensi utama', pendukung: 'Referensi pendukung', terkait: 'Terkait (belum cukup kuat)' };
  H.tierLabel = (t, cat) => t === 'utama' ? (cat === 'quran' || cat === 'hadis' ? H.TIER.utama : H.TIER.utamaRef) : H.TIER[t];
  const TITLE = new Set(['judul bab', 'judul', 'indeks tema']);
  // ≥ 2 kata kunci inti harus "berkumpul": salah satunya di judul bab, atau semuanya di bagian teks yang sama dalam jarak ≤ 40 kata
  // (mencegah kata yang kebetulan muncul berjauhan di kisah panjang menjadi "utama")
  function together(C) {
    if (C.length < 2 || C.some(e => TITLE.has(e.field))) return true;
    if (new Set(C.map(e => e.field)).size > 1) return false;
    const ps = C.map(e => e.pos); return Math.max.apply(null, ps) - Math.min.apply(null, ps) <= 40;
  }
  function tierOf(ev, opt) {
    const core = ev.filter(e => !e.mod); const C = core.length ? core : ev;
    const nD = C.filter(e => e.st === 'direct').length, nR = C.filter(e => e.st === 'rel').length;
    if (!C.length) return 'terkait';
    if (nD === C.length && opt.central && together(C)) return 'utama';
    if (nD >= 1 || (nD + nR === C.length && nR)) return 'pendukung';
    return 'terkait';
  }
  H.levelOf = function (e) {
    const eng = Object.keys(e.rank).length; const best = Math.min.apply(null, Object.values(e.rank));
    if (e.tier === 'utama' && (eng >= 2 || best <= 5)) return 'tinggi';
    if (e.tier === 'utama' || (e.tier === 'pendukung' && eng >= 2 && best <= 40)) return 'sedang';
    return 'rendah';
  };
  H.LEVEL_TIP = 'Tingkat kecocokan kata & makna dengan pertanyaan — bukan tingkat kebenaran, kekuatan, atau derajat dalil.';
  H.typesOf = function (e) {
    const t = [];
    if (e.rank.sem != null && e.rank.sem <= 150) t.push('makna');
    if (e.theme) t.push('tema');
    if (e.phrase) t.push('frasa');
    if (e.rank.lit != null) t.push('kata');
    return t;
  };

  /* ---------- gabungan untuk record kitab (Al-Qur'an, hadis, tafsir, materi) ---------- */
  /**
   * opts: {cat, lit: hasil PRMK.search (results), mk: hasil PRMQ.search | null, sem: hasil PRMV.search | null,
   *        related: PRMV.related(...) | null, an: H.analyze(...), mode, allow(i)→bool, get(ids)→Promise<Map>, limit}
   * Kembalikan [{key, i, x (hasil literal bila ada), o (hasil makna bila ada), rank, score, tier, level, types, ev, why}]
   */
  H.kitab = async function (opts) {
    const cfg = H.cfg(); const cat = opts.cat; const W = H.weightsFor(opts.mode, cat); const M = K().info(); const allow = opts.allow || (() => true);
    const gkey = i => (M.lead[i] >= 0 ? 'g' + M.lead[i] : 'r' + i);
    const members = i => (M.lead[i] >= 0 ? M.groups[M.lead[i]] : [i]);
    const pick = i => members(i).find(j => allow(j));
    const lists = {}; const litX = new Map(), mkO = new Map(), semB = new Map();
    // literal
    lists.lit = [];
    for (const x of (opts.lit || [])) { const s = K().srcOf(x.i); if (!s || s.cat !== cat) continue; const g = gkey(x.i); if (litX.has(g)) continue; litX.set(g, x); lists.lit.push(g); if (lists.lit.length >= cfg.depth) break; }
    // makna Al-Qur'an
    if (cat === 'quran' && opts.mk && !opts.mk.error && !opts.mk.empty) {
      lists.makna = [];
      for (const o of (opts.mk.utama || []).concat(opts.mk.pendukung || [])) { const i = Q().docOfAyat(o.x); if (!allow(i)) continue; const g = gkey(i); if (mkO.has(g)) continue; mkO.set(g, o); lists.makna.push(g); }
    }
    // makna lokal (vektor)
    if (opts.sem && opts.sem.hits && opts.sem.hits.length) {
      lists.sem = []; const jalInv = H._jalInv();
      for (const h of opts.sem.hits) {
        let i = h.a; const s = K().srcOf(i); if (!s) continue;
        if (cat === 'quran' && s.code === 'jalalain') { const x = jalInv && jalInv.get(i); if (x == null) continue; i = Q().docOfAyat(x); }
        else if (s.cat !== cat) continue;
        const j = pick(i); if (j == null) continue;
        const g = gkey(j); if (semB.has(g)) continue;
        semB.set(g, { i: j, s: h.s, b0: h.b0, b1: h.b1, shard: h.shard }); lists.sem.push(g);
        if (lists.sem.length >= cfg.depth) break;
      }
    }
    const fused = H.rrf(lists, W, cfg.k).slice(0, opts.limit || 60);
    // record untuk bukti
    const ids = fused.map(e => { const x = litX.get(e.key), o = mkO.get(e.key), b = semB.get(e.key); return x ? x.i : o ? Q().docOfAyat(o.x) : b.i; });
    const recs = await opts.get(ids.concat(cat === 'quran' ? [] : []));
    let jal = new Map();
    if (cat === 'quran') { const jids = ids.map(i => recs.get(i)).filter(r => r && r.jal != null).map(r => r.jal); if (jids.length) jal = await opts.get(jids); }
    const F = H.forms(opts.an, opts.related);
    const out = [];
    fused.forEach((e, k) => {
      const i = ids[k]; const r = recs.get(i); if (!r) return;
      const x = litX.get(e.key), o = mkO.get(e.key), b = semB.get(e.key);
      let fields;
      if (cat === 'quran') { const j = r.jal != null ? jal.get(r.jal) : null; fields = [['terjemahan', String(r.tr || '').replace(/\[\d+\]/g, ' ')], ['catatan kaki', r.catatan], ['Tafsir Jalalain', j && j.tr], ['indeks tema', r.src === 'qtema' ? [r.tema, r.sub, r.label].join(' ') : null]]; }
      else if (r.blocks) { const bl = r.blocks; const a = b && b.b0 >= 0 ? b.b0 : 0, z = b && b.b1 >= 0 ? b.b1 : Math.min(bl.length - 1, 3); fields = [['judul', (r.toc || []).join(' ') + ' ' + (r.title || '')], ['paragraf', bl.slice(a, z + 1).filter(q => q[0] !== 'a').map(q => q[1]).join(' ')]]; }
      else fields = [['judul bab', [r.kitab, r.bab].filter(Boolean).join(' ')], ['matan', r.tr]];
      const ev = H.evidence(fields, F);
      const titleHit = ev.some(z => !z.mod && z.st === 'direct' && (z.field === 'judul bab' || z.field === 'judul' || z.field === 'indeks tema'));
      let tier; const ent0 = {};
      if (cat === 'quran' && lists.makna) {
        // "utama" dari mesin makna V3.1 dipertahankan, KECUALI buktinya hanya dari tafsir (tanpa tema/judul kelompok, tanpa terjemahan ayat)
        // dan mesin lain juga tidak mendukung — kata yang kebetulan sama di tafsir tidak cukup untuk dalil utama.
        const inTr = o && o.E && o.E.some(z => z && ((z.R && z.R.kind !== 'rel') || (z.P && z.P.kind !== 'rel')));
        const backed = o && (o.type === 'tema' || inTr || (e.rank.sem != null && e.rank.sem <= 60) || (e.rank.lit != null && e.rank.lit <= 30));
        tier = o && o.utama ? (backed ? 'utama' : 'pendukung') : tierOf(ev, { central: false });
        if (o && o.utama && !backed) ent0.demoted = true;
      }
      else {
        const central = titleHit || (e.rank.sem != null && e.rank.sem <= cfg.semTopForTheme) || (x && e.rank.lit <= cfg.semTopForTheme && Object.values(x.tf || {}).some(v => v >= 2));
        tier = tierOf(ev, { central });
      }
      const ent = Object.assign(ent0, { key: e.key, i, x, o, b, rank: e.rank, score: e.score, tier, ev, theme: titleHit || !!(o && o.type === 'tema'), phrase: !!(x && x.ph) });
      ent.level = H.levelOf(ent); ent.types = H.typesOf(ent);
      out.push(ent);
    });
    const tw = { utama: 0, pendukung: 1, terkait: 2 };
    // di kelompok pendukung, ayat yang semula "utama" menurut mesin makna V3.1 (diturunkan karena bukti hanya di tafsir) didahulukan
    out.sort((a, b) => tw[a.tier] - tw[b.tier] || (b.demoted ? 1 : 0) - (a.demoted ? 1 : 0) || b.score - a.score);
    out.forEach((e, k) => { e.pos = k + 1; });
    return out;
  };
  H._jalInv = function () {
    const M = Q() && Q().meta; if (!M || !M.jal) return null;
    if (!H.__jal || H.__jalSrc !== M) { H.__jal = new Map(); M.jal.forEach((d, x) => { if (d >= 0) H.__jal.set(d, x); }); H.__jalSrc = M; }
    return H.__jal;
  };

  /* ---------- gabungan untuk brosur (Arsip CHM + PDF) ---------- */
  /** opts: {lit: hasil PRM.search (results, doc-level), semHits:[{id, b0, b1, s}], textOf(id,b0,b1)→teks, titleOf(id), an, related, mode} */
  H.brosur = function (opts) {
    const cfg = H.cfg(); const W = H.weightsFor(opts.mode, 'brosur');
    const lists = { lit: [], sem: [] }; const litX = new Map(), semB = new Map();
    for (const x of opts.lit || []) { if (litX.has(x.doc.id)) continue; litX.set(x.doc.id, x); lists.lit.push(x.doc.id); if (lists.lit.length >= cfg.depth) break; }
    for (const h of opts.semHits || []) { if (semB.has(h.id)) continue; semB.set(h.id, h); lists.sem.push(h.id); if (lists.sem.length >= cfg.depth) break; }
    const F = H.forms(opts.an, opts.related);
    const out = H.rrf(lists, W, cfg.k).slice(0, opts.limit || 60).map(e => {
      const x = litX.get(e.key), b = semB.get(e.key);
      const fields = [['judul', opts.titleOf(e.key)], ['paragraf', b ? opts.textOf(e.key, b.b0, b.b1) : (x && x.locs && x.locs.length ? opts.textOf(e.key, x.locs[0].bi, x.locs[0].bi) : '')]];
      const ev = H.evidence(fields, F);
      const titleHit = ev.some(z => !z.mod && z.st === 'direct' && z.field === 'judul');
      const central = titleHit || (e.rank.sem != null && e.rank.sem <= cfg.semTopForTheme) || (x && x.cov >= (opts.maxCov || 1));
      const ent = { key: e.key, x, b, rank: e.rank, score: e.score, ev, tier: tierOf(ev, { central }), theme: titleHit, phrase: false };
      ent.level = H.levelOf(ent); ent.types = H.typesOf(ent); return ent;
    });
    const tw = { utama: 0, pendukung: 1, terkait: 2 };
    out.sort((a, b) => tw[a.tier] - tw[b.tier] || b.score - a.score);
    return out;
  };

  /* ---------- teks alasan ---------- */
  H.whyItems = function (e) {
    const out = [];
    for (const z of e.ev) {
      if (z.st === 'direct') out.push({ k: 'd', t: '“' + z.label + '”' + (z.mod ? ' (pelengkap)' : '') + ': tertulis “' + z.form + '” di ' + z.field });
      else if (z.st === 'rel') out.push({ k: 'r', t: '“' + z.label + '”' + (z.mod ? ' (pelengkap)' : '') + ': hanya istilah terkait “' + z.form + '” di ' + z.field + ' — bukan bukti utama' });
      else if (!z.mod) out.push({ k: 'n', t: '“' + z.label + '”: tidak tertulis di bagian ini' });
    }
    if (e.demoted) out.push({ k: 'r', t: 'Mesin makna V3.1 menandai “utama”, tetapi buktinya hanya di tafsir (bukan di terjemahan/judul kelompok ayat) dan mesin lain tidak mendukung — diturunkan menjadi pendukung.' });
    const eng = [];
    if (e.rank.makna != null) eng.push('makna/tema Al-Qur\'an (urutan ' + e.rank.makna + ')');
    if (e.rank.sem != null) eng.push('kemiripan makna lokal (urutan ' + e.rank.sem + ')');
    if (e.rank.lit != null) eng.push('kata persis (urutan ' + e.rank.lit + ')');
    out.push({ k: 'e', t: 'Ditemukan oleh: ' + eng.join(' · ') });
    return out;
  };
  H.whyText = e => H.whyItems(e).map(x => x.t).join(' · ');
  if (typeof module !== 'undefined' && module.exports) module.exports = H;
})(typeof window !== 'undefined' ? window : globalThis);
