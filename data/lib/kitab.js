/* Pustaka Kitab — pencarian Al-Qur'an, tafsir & hadis dengan indeks bertahap.
   Data di data/kitab/ (dibangun oleh tools/build_index.js). Tidak memuat seluruh database:
   kamus (d/), posting (p/) dan record (r/) diambil per bagian saat dibutuhkan, lalu disimpan di memori.
   Normalisasi teks = mesin PRM yang sama (window.PRM.norm) dengan arsip brosur. */
(function (root) {
  'use strict';
  const K = root.PRMK = root.PRMK || {};
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const DEC = new Int8Array(128).fill(-1); for (let i = 0; i < 64; i++) DEC[B64.charCodeAt(i)] = i;
  function unvlq(s) {
    const out = []; let n = 0, sh = 1;
    for (let i = 0; i < s.length; i++) { const d = DEC[s.charCodeAt(i)]; n += (d & 31) * sh; if (d & 32) sh *= 32; else { out.push(n); n = 0; sh = 1; } }
    return out;
  }
  K.unvlq = unvlq;
  const P = () => root.PRM;
  let BASE = 'data/kitab/', VER = '';
  /* ---------- pemuat file data ---------- */
  const cache = { d: new Map(), p: new Map(), r: new Map(), t: new Map() };
  const waiting = new Map();
  K.d = (k, obj) => { cache.d.set(k, obj); };
  K.p = (id, arr) => { cache.p.set(id, arr); };
  K.r = (id, arr) => { cache.r.set(id, arr); };
  K.t = (code, arr) => { cache.t.set(code, arr); };
  K.loader = function (file) { // browser: <script>; Node mengganti fungsi ini
    return new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = BASE + file + VER; s.async = true;
      s.onload = () => { s.remove(); res(); }; s.onerror = () => { s.remove(); rej(new Error('Gagal memuat ' + file)); };
      document.head.appendChild(s);
    });
  };
  function need(file) {
    if (waiting.has(file)) return waiting.get(file);
    const pr = K.loader(file).catch(e => { waiting.delete(file); throw e; });
    waiting.set(file, pr); return pr;
  }
  function trim(map, max, kind) { // batasi memori: buang bagian tertua
    if (map.size <= max) return;
    const drop = map.size - max; let n = 0;
    for (const k of map.keys()) { if (n++ >= drop) break; map.delete(k); waiting.delete(kind + '/' + k + '.js'); }
  }
  /* ---------- meta ---------- */
  let M = null, metaP = null;
  K.init = function (base, opts) {
    if (base) BASE = base;
    if (metaP) return metaP;
    metaP = (async () => {
      await need('meta.js');
      M = K.meta; if (!M) throw new Error('meta kitab kosong');
      if (opts && opts.cacheBust) VER = '?v=' + M.build;
      const N = M.N;
      const bin = typeof atob === 'function' ? atob(M.dlq) : Buffer.from(M.dlq, 'base64').toString('binary');
      M.dl = new Float32Array(N); let tot = 0;
      for (let i = 0; i < N; i++) { const v = Math.pow(2, bin.charCodeAt(i) / 16) - 1; M.dl[i] = v; tot += v; }
      M.avg = tot / N;
      M.lead = new Int32Array(N).fill(-1); M.groups = [];
      const g = unvlq(M.grp);
      for (let k = 0; k < g.length;) { const n = g[k++]; let x = g[k++]; const mem = [x]; for (let j = 1; j < n; j++) { x += g[k++]; mem.push(x); } M.groups.push(mem); for (const m of mem) M.lead[m] = M.groups.length - 1; }
      const cs = unvlq(M.chunks); M.cstart = []; let acc = 0; for (const d of cs) { acc += d; M.cstart.push(acc); }
      M.src = {}; for (const s of M.sources) M.src[s.code] = s;
      M.splitSet = new Set(M.split);
      M.collOf = function (i) {
        for (const s of M.sources) if (i >= s.start && i < s.start + s.count) {
          if (s.code !== 'kitab9') return s.cat === 'hadis' ? s.code : null;
          let c = null; for (const [st, cc] of M.k9) { if (i >= st) c = cc; else break; } return c;
        }
        return null;
      };
      return M;
    })();
    return metaP;
  };
  K.ready = () => !!M;
  K.info = () => M;
  function srcOf(i) { for (const s of M.sources) if (i >= s.start && i < s.start + s.count) return s; return null; }
  K.srcOf = srcOf;
  /* ---------- record ---------- */
  function chunkOf(i) { const a = M.cstart; let lo = 0, hi = a.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (a[mid] <= i) lo = mid; else hi = mid - 1; } return lo; }
  K.get = async function (ids) {
    await K.init();
    const need2 = new Set(ids.map(chunkOf));
    await Promise.all(Array.from(need2).map(c => cache.r.has(c) ? null : need('r/' + c + '.js')));
    const out = new Map();
    for (const i of ids) { const c = chunkOf(i); const arr = cache.r.get(c); if (arr) out.set(i, arr[i - M.cstart[c]]); }
    trim(cache.r, 260, 'r');
    return out;
  };
  K.getOne = async i => (await K.get([i])).get(i);
  K.toc = async function (code) { await K.init(); if (!cache.t.has(code)) await need('toc/' + code + '.js'); return cache.t.get(code); };
  /* ---------- kamus & posting ---------- */
  const AR = /[؀-ۿ]/;
  function keyFor(tok) { const a = Array.from(tok); const k2 = a.slice(0, 2).join(''); return M.splitSet.has(k2) && a.length >= 3 ? a.slice(0, 3).join('') : k2; }
  async function shard(key) {
    if (cache.d.has(key)) return cache.d.get(key);
    const f = M.dict[key]; if (!f) { cache.d.set(key, null); return null; }
    await need('d/' + f + '.js'); return cache.d.get(key) || null;
  }
  // kandidat: {t: token persis | p: awalan, w: bobot, strong}
  async function resolve(cands, limitPerPrefix) {
    const keys = new Set();
    for (const c of cands) {
      const s = c.t || c.p; if (!s) continue;
      const a = Array.from(s);
      if (c.p && a.length < 3 && M.splitSet.has(a.slice(0, 2).join(''))) { c.t = c.p; c.p = null; }
      keys.add(keyFor(c.t || c.p));
      if (c.p && a.length === 2) keys.add(a.join(''));
    }
    await Promise.all(Array.from(keys).map(shard));
    const found = new Map(); // tok → {w, strong, e}
    const put = (tok, e, w, strong) => { const x = found.get(tok); if (!x || x.w < w) found.set(tok, { tok, e, w, strong: strong || (x && x.strong) }); };
    for (const c of cands) {
      if (c.t) { const sh = cache.d.get(keyFor(c.t)); const e = sh && sh[c.t]; if (e) put(c.t, e, c.w, c.strong); continue; }
      const sh = cache.d.get(keyFor(c.p)); if (!sh) continue;
      const lst = [];
      for (const tok in sh) if (tok.length > c.p.length && tok.startsWith(c.p)) lst.push(tok);
      lst.sort((x, y) => sh[y][0] - sh[x][0]);
      for (const tok of lst.slice(0, limitPerPrefix || 60)) put(tok, sh[tok], c.w, c.strong);
    }
    return Array.from(found.values());
  }
  async function postings(entries) {
    const packs = new Set(entries.map(x => x.e[1]));
    await Promise.all(Array.from(packs).map(p => cache.p.has(p) ? null : need('p/' + p + '.js')));
    for (const x of entries) { const arr = cache.p.get(x.e[1]); x.s = arr ? arr[x.e[2]] : ''; }
    trim(cache.p, 160, 'p');
  }
  // dekode posting: panggil fn(doc, tf, title, posStart, posArr) ; posisi absolut
  function walk(s, fn, wantPos) {
    let doc = 0, i = 0; const L = s.length; const pos = [];
    const next = () => { let n = 0, sh = 1; for (;;) { const d = DEC[s.charCodeAt(i++)]; n += (d & 31) * sh; if (d & 32) sh *= 32; else return n; } };
    while (i < L) {
      doc += next(); const tf2 = next(); const tf = tf2 >> 1;
      if (wantPos) { pos.length = 0; let p = 0; for (let k = 0; k < tf; k++) { p += next(); pos.push(p); } fn(doc, tf, tf2 & 1, pos); }
      else { for (let k = 0; k < tf; k++) next(); fn(doc, tf, tf2 & 1, null); }
    }
  }
  /* ---------- varian kata ---------- */
  const AFX = ['ber', 'be', 'ter', 'per', 'pe', 'ke', 'se', 'di', 'me', 'mem', 'men', 'meng', 'meny', 'peng', 'pen', 'pem', 'peny', 'diper', 'memper', 'keber', 'ber', 'mempe'];
  const AR_PRE = ['و', 'ف', 'ب', 'ل', 'ك', 'ال', 'وال', 'فال', 'بال', 'كال', 'لل', 'ولل', 'فلل', 'وب', 'ول', 'فب', 'فل', 'وك', 'ا'];
  function termCands(v, opt, w0, weak) {
    const out = []; const ar = AR.test(v);
    out.push({ t: v, w: w0, strong: !weak });
    if (/^#?\d+$/.test(v)) return out;
    if (ar) {
      const base = v.startsWith('ال') && v.length > 3 ? v.slice(2) : null;
      const forms = new Set();
      if (base) { forms.add(base); ['وال', 'فال', 'بال', 'كال', 'لل', 'ولل', 'فلل'].forEach(p => forms.add(p + base)); }
      else AR_PRE.forEach(p => forms.add(p + v));
      for (const f of forms) out.push({ t: f, w: w0 * 0.9, strong: !weak });
      if (!opt.whole && Array.from(v).length >= 3) { out.push({ p: v, w: w0 * 0.75, strong: !weak }); if (!base) ['و', 'ال', 'وال', 'بال'].forEach(p => out.push({ p: p + v, w: w0 * 0.65, strong: !weak })); }
    } else if (!opt.whole && v.length >= 3) {
      out.push({ p: v, w: w0 * 0.85, strong: !weak });
      if (v.length >= 4) for (const a of new Set(AFX)) out.push({ p: a + v, w: w0 * 0.6, strong: false });
    }
    return out;
  }
  /* ---------- nama koleksi / kitab dalam kueri ---------- */
  const COLLWORDS = [
    [['shahih', 'bukhari'], 'bukhari'], [['sahih', 'bukhari'], 'bukhari'], [['bukhari'], 'bukhari'], [['bukhary'], 'bukhari'], [['shahih', 'muslim'], 'muslim'], [['muslim'], 'muslim'],
    [['sunan', 'abu', 'dawud'], 'abudaud'], [['sunan', 'abu', 'daud'], 'abudaud'], [['abu', 'dawud'], 'abudaud'], [['abu', 'daud'], 'abudaud'], [['abudaud'], 'abudaud'], [['abudawud'], 'abudaud'],
    [['sunan', 'tirmidzi'], 'tirmidzi'], [['tirmidzi'], 'tirmidzi'], [['turmudzi'], 'tirmidzi'], [['tirmizi'], 'tirmidzi'],
    [['sunan', 'nasai'], 'nasai'], [['nasai'], 'nasai'], [['an', 'nasai'], 'nasai'], [['annasai'], 'nasai'],
    [['sunan', 'ibnu', 'majah'], 'ibnumajah'], [['ibnu', 'majah'], 'ibnumajah'], [['ibn', 'majah'], 'ibnumajah'], [['ibnumajah'], 'ibnumajah'],
    [['musnad', 'ahmad'], 'ahmad'], [['muwatha', 'malik'], 'malik'], [['muwattha', 'malik'], 'malik'], [['muwata', 'malik'], 'malik'],
    [['sunan', 'ad', 'darimi'], 'darimi'], [['sunan', 'darimi'], 'darimi'], [['ad', 'darimi'], 'darimi'], [['addarimi'], 'darimi'], [['darimi'], 'darimi'],
    [['bulughul', 'maram'], 'bulughul'], [['bulugul', 'maram'], 'bulughul'], [['riyadhus', 'shalihin'], 'riyadh'], [['riyadus', 'salihin'], 'riyadh'], [['riyadlus', 'shalihin'], 'riyadh'], [['riyadush', 'shalihin'], 'riyadh'], [['riyadhush', 'shalihin'], 'riyadh']
  ];
  const NUMWORDS = new Set(['hr', 'h', 'r', 'hadits', 'hadis', 'hadist', 'hadith', 'no', 'nomor', 'nomer', 'riwayat', 'nomer']);
  K.extractColl = function (pq) {
    if (!pq || !pq.groups) return null;
    const keys = pq.groups.map(g => g.kind === 'term' ? g.key : null);
    let best = null;
    for (const [ws0, code] of COLLWORDS) {
      const ws = ws0.map(w => P().norm(w));
      for (let i = 0; i + ws.length <= keys.length; i++) {
        let ok = true; for (let j = 0; j < ws.length; j++) if (keys[i + j] !== ws[j]) { ok = false; break; }
        if (ok && (!best || ws.length > best.len)) best = { i, len: ws.length, code };
      }
    }
    return best;
  };
  /* ---------- pencarian ---------- */
  /**
   * pq: hasil PRM.parseQuery; opts: {whole, broad, allow(i)→bool, coll}
   * Kembalikan {results:[{i, score, cov, tf, num, ph, dups}], maxCov, counts, ms}
   */
  K.search = async function (pq0, opts) {
    opts = opts || {};
    await K.init();
    const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
    const N = M.N;
    const pq = Object.assign({}, pq0, { groups: pq0.groups.slice() });
    // nama koleksi → saringan
    let coll = opts.coll || null, collLabel = null;
    const cw = K.extractColl(pq);
    if (cw) { coll = coll || cw.code; collLabel = pq.groups.slice(cw.i, cw.i + cw.len).map(g => g.label).join(' '); pq.groups.splice(cw.i, cw.len); }
    const numGroups = pq.groups.filter(g => g.kind === 'term' && /^\d{1,5}$/.test(g.key));
    if (numGroups.length) pq.groups = pq.groups.filter(g => !(g.kind === 'term' && NUMWORDS.has(g.key)));
    const groups = pq.groups;
    const allow = opts.allow || null;
    const collOK = coll ? (i => M.collOf(i) === coll) : null;
    const ok = i => (!allow || allow(i)) && (!collOK || collOK(i));
    // ---- rujukan ayat langsung (QS 2:183 / Al-Baqarah 183) ----
    const direct = [];
    if (pq.qref) {
      const s = pq.qref.s; const base = M.quranStart + M.surahOff[s - 1];
      const n = P().AYAT[s - 1];
      const a1 = pq.qref.a1 || 1, a2 = pq.qref.a1 ? pq.qref.a2 : n;
      for (let a = a1; a <= a2 && a <= n; a++) direct.push(base + a - 1);
    }
    // ---- kumpulkan kandidat token per grup ----
    const gEnt = [];
    for (const g of groups) {
      if (g.kind === 'phrase') { gEnt.push(null); continue; }
      const cands = [];
      if (/^\d{1,5}$/.test(g.key)) { cands.push({ t: '#' + (+g.key), w: 1, strong: true, num: true }); cands.push({ t: g.key, w: 0.3, strong: false }); }
      else for (const v of g.variants) { const weak = g.weak && g.weak.has(v); cands.push(...termCands(v, opts, weak ? 0.35 : 1, weak)); }
      gEnt.push(cands);
    }
    const flatC = []; gEnt.forEach((c, gi) => { if (c) c.forEach(x => { x.g = gi; flatC.push(x); }); });
    // resolve per grup (agar awalan dibatasi per grup)
    const resolved = await Promise.all(gEnt.map(c => c ? resolve(c, 60) : Promise.resolve([])));
    // frasa: token persis
    const phraseToks = [];
    groups.forEach((g, gi) => { if (g.kind === 'phrase') phraseToks.push({ gi, toks: g.key.split(' ').filter(Boolean) }); });
    if (pq.phrase && !phraseToks.length) phraseToks.push({ gi: -1, toks: pq.phrase.split(' ').filter(Boolean), bonus: true });
    const phRes = await Promise.all(phraseToks.map(ph => Promise.all(ph.toks.map((t, k) => resolve(k === 0 && AR.test(t) ? termCands(t, { whole: true }, 1) : [{ t, w: 1, strong: true }])))));
    // pengecualian
    const exEnt = await Promise.all((pq.excludes || []).map(x => resolve([{ t: x, w: 1 }, { p: x, w: 1 }], 200)));
    const all = []; resolved.forEach(r => all.push(...r)); phRes.forEach(r => r.forEach(x => all.push(...x))); exEnt.forEach(r => all.push(...r));
    await postings(all);
    // ---- skor ----
    const G = groups.length;
    const tfw = []; const strong = []; const tit = []; const numHit = new Uint8Array(N);
    for (let gi = 0; gi < G; gi++) { tfw.push(groups[gi].kind === 'phrase' ? null : new Float32Array(N)); strong.push(new Uint8Array(N)); tit.push(new Uint8Array(N)); }
    const touched = new Uint8Array(N); const list = [];
    const touch = d => { if (!touched[d]) { touched[d] = 1; list.push(d); } };
    resolved.forEach((ents, gi) => {
      for (const x of ents) {
        const isNum = x.tok.charCodeAt(0) === 35;
        walk(x.s, (d, tf, title) => {
          if (!ok(d)) return;
          tfw[gi][d] += tf * x.w; if (x.strong) strong[gi][d] = 1; if (title) tit[gi][d] = 1; if (isNum) numHit[d] = 1; touch(d);
        }, false);
      }
    });
    // frasa
    const phHit = phraseToks.map(() => new Map());
    phraseToks.forEach((ph, k) => {
      const per = phRes[k]; if (per.some(x => !x.length)) return;
      // posisi per token (gabungan varian)
      const maps = per.map(ents => { const m = new Map(); for (const x of ents) walk(x.s, (d, tf, title, pos) => { if (!ok(d)) return; let a = m.get(d); if (!a) { a = new Set(); m.set(d, a); } for (const p of pos) a.add(p); }, true); return m; });
      const first = maps[0];
      for (const [d, ps] of first) {
        let c = 0;
        for (const p of ps) { let good = true; for (let j = 1; j < maps.length; j++) { const s = maps[j].get(d); if (!s || !s.has(p + j)) { good = false; break; } } if (good) c++; }
        if (c) { phHit[k].set(d, c); if (!ph.bonus) touch(d); }
      }
    });
    const excl = new Uint8Array(N);
    exEnt.forEach(ents => ents.forEach(x => walk(x.s, d => { excl[d] = 1; }, false)));
    const dfg = new Array(G).fill(0);
    for (const d of list) for (let gi = 0; gi < G; gi++) if (tfw[gi] && tfw[gi][d] > 0) dfg[gi]++;
    phraseToks.forEach((ph, k) => { if (!ph.bonus) dfg[ph.gi] = phHit[k].size; });
    const idf = dfg.map(x => Math.log(1 + (N - x + 0.5) / (x + 0.5)));
    const k1 = 1.2, b = 0.5;
    const res = [];
    const phIdx = new Map(phraseToks.map((ph, k) => [ph.gi, k]));
    for (const d of list) {
      if (excl[d]) continue;
      let score = 0, cov = 0, req = true, num = false; const tf = {};
      for (let gi = 0; gi < G; gi++) {
        const g = groups[gi];
        if (g.kind === 'phrase') {
          const c = phHit[phIdx.get(gi)].get(d) || 0;
          if (!c) { req = false; continue; }
          cov += 1; tf[g.label] = c; score += idf[gi] * 2 + Math.log(1 + c) * 1.5; continue;
        }
        const w = tfw[gi][d];
        if (!w) { if (g.required) req = false; continue; }
        const isNumG = /^\d{1,5}$/.test(g.key);
        if (isNumG && numHit[d]) { num = true; cov += 1; score += 12; tf[g.label] = 1; continue; }
        cov += strong[gi][d] ? 1 : 0.5; tf[g.label] = Math.round(w * 10) / 10;
        const dl = M.dl[d];
        score += idf[gi] * (w * (k1 + 1)) / (w + k1 * (1 - b + b * dl / M.avg));
        if (tit[gi][d]) score += 1.5 * idf[gi];
      }
      if (!req) continue;
      let ph = false;
      for (const [k, ph0] of phraseToks.entries()) if (ph0.bonus) { const c = phHit[k].get(d); if (c) { score += 2 + Math.log(1 + c) * 1.5; ph = true; } }
      res.push({ i: d, score, cov, tf, num, ph });
    }
    // rujukan ayat
    const maxCov = groups.length + (pq.qref ? 1 : 0);
    if (direct.length) {
      const have = new Map(res.map(x => [x.i, x]));
      direct.forEach((i, k) => { if (!ok(i)) return; const x = have.get(i); if (x) { x.cov += 1; x.score += 50 - k * 0.01; x.ref = true; } else res.push({ i, score: 50 - k * 0.01, cov: Math.max(1, maxCov), tf: {}, ref: true }); });
    }
    // tafsir untuk ayat yang dirujuk langsung
    if (direct.length && direct.length <= 40) {
      const qr = await K.get(direct.filter(ok)); const have = new Set(res.map(x => x.i)); let k = 0;
      for (const i of direct) { const r = qr.get(i); if (!r) continue; for (const t of [r.jal, r.ik]) if (t != null && !have.has(t) && ok(t)) { have.add(t); res.push({ i: t, score: 40 - (k++) * 0.01, cov: Math.max(1, maxCov) - 0.01, tf: {}, ref: true, tafsirOf: i }); } }
    }
    // transliterasi Latin (atau kerangka Arab) → ayat Al-Qur'an
    let tl = null;
    if (!pq.qref && opts.translit !== false) {
      const raw = String(pq0.raw || '').replace(/(^|\s)-\S+/g, ' ');
      try { tl = await K.translit(raw, { ok }); } catch (e) { tl = null; }
      if (tl && tl.hits.length) {
        const have = new Map(res.map(x => [x.i, x]));
        tl.hits.slice(0, 300).forEach((h, k) => {
          const bonus = 60 * (h.pct / 100) + (h.err ? 3 : 25) * h.cover - k * 0.001;
          const x = have.get(h.i);
          if (x) { x.cov = Math.max(x.cov, maxCov); x.score += bonus; x.tl = h; }
          else res.push({ i: h.i, score: bonus, cov: tl.ar ? Math.max(0.5, maxCov - 0.01) : maxCov, tf: {}, tl: h });
        });
      }
    }
    // hanya nomor (+ nama koleksi): tampilkan yang nomornya cocok saja bila ada
    if (numGroups.length && groups.every(g => g.kind === 'term' && /^\d{1,5}$/.test(g.key)) && res.some(x => x.num)) {
      for (let k = res.length - 1; k >= 0; k--) if (!res[k].num && !res[k].ref) res.splice(k, 1);
    }
    // dengan nomor: utamakan yang nomornya cocok
    res.sort((a, b2) => (b2.cov - a.cov) || ((b2.num ? 1 : 0) - (a.num ? 1 : 0)) || ((b2.tl ? 1 : 0) - (a.tl ? 1 : 0))
      || (a.tl && b2.tl ? (a.tl.err - b2.tl.err) || (b2.tl.pct - a.tl.pct) || ((b2.tl.cover > 0.999 ? 1 : 0) - (a.tl.cover > 0.999 ? 1 : 0)) : 0)
      || (b2.score - a.score) || (a.i - b2.i));
    // gabungkan record identik (sumber tetap tercantum)
    const out = []; const seenG = new Map();
    for (const x of res) {
      const g = M.lead[x.i];
      if (g >= 0 && !opts.noCollapse) { if (seenG.has(g)) { seenG.get(g).dups.push(x.i); continue; } x.dups = []; seenG.set(g, x); }
      out.push(x);
    }
    const counts = { quran: 0, tafsir: 0, hadis: 0 }; const bySrc = {};
    for (const x of out) { const s = srcOf(x.i); counts[s.cat] = (counts[s.cat] || 0) + 1; bySrc[s.code] = (bySrc[s.code] || 0) + 1; }
    const ms = (typeof performance !== 'undefined' ? performance : Date).now() - t0;
    return { results: out, maxCov, counts, bySrc, coll, collLabel, ms, totalRaw: res.length, pq, tl: tl ? { q: tl.q, n: tl.hits.length, kmax: tl.kmax, ar: tl.ar, part: tl.part } : null };
  };
  /* ---------- transliterasi Latin ⇄ kerangka huruf Arab ----------
     Teks Arab dan tulisan Latin sama-sama diubah menjadi "kerangka konsonan" dengan pemetaan tetap:
     ب b · ت ط t · ث س ص s · ش S · ج j · ح خ ه h · د ض d · ذ ز ظ z · ر r · غ g · ف f · ق ك k · ل l · م m · ن n · ة H (cocok dengan t/h/kosong)
     Huruf vokal/panjang (ا و ي ى), hamzah, 'ain dan harakat diabaikan; huruf kembar (syaddah) dirapatkan;
     lam "al-" sebelum huruf syamsiyah dibuang (ar-rahman), kecuali lam bersyaddah (al-ladzi). Latin: kh→h gh→g sy→S sh/ts→s th→t dz/zh→z dh/dl→d q→k, vokal + w/y dibuang. */
  const SKA = { 'ب': 'b', 'ت': 't', 'ث': 's', 'ج': 'j', 'ح': 'h', 'خ': 'h', 'د': 'd', 'ذ': 'z', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'S', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'غ': 'g', 'ف': 'f', 'ق': 'k', 'ك': 'k', 'ک': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'ۃ': 'H', 'ة': 'H', 'ھ': 'h' };
  const SUN = new Set(['ت', 'ث', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ل', 'ن']);
  const ARL = /[ء-يٱ-ۓ]/;
  function skelAr(text) {
    const out = [], map = [];
    const re = /[ء-يٱ-ۓ][ؐ-ًؚ-ٰٟۖ-ۭـ]*/g;
    // kata demi kata agar aturan "al-" syamsiyah bisa diterapkan
    const words = text.split(/[^؀-ۿ]+/); let base = 0;
    let pos = 0;
    for (const w of text.split(/(\s+)/)) {
      if (!w.trim()) { pos += w.length; continue; }
      const L = []; let m; re.lastIndex = 0;
      while ((m = re.exec(w))) L.push([m[0][0], pos + m.index, m[0].includes('\u0651')]);
      // awalan و ف ب ك + ال + huruf syamsiyah → lam dibuang
      let k = 0; if (L.length > 3 && 'وفبك'.includes(L[0][0]) && 'اٱ'.includes(L[1][0])) k = 1;
      let skipLam = -1;
      // lam dibaca (tidak luluh) bila lam itu sendiri bersyaddah: الَّذِي، الَّتِي، الَّذِينَ; untuk teks gundul dipakai daftar kata
      const bare = L.slice(k).map(c => c[0]).join('');
      const lamRead = L[k + 1] && L[k + 1][2] || /^[اٱ]ل(ذي|ذين|تي|لذان|لذين|لتان|لتين|لاتي|لائي|لاء)$/.test(bare);
      if (!lamRead && L.length > k + 2 && 'اٱ'.includes(L[k][0]) && L[k + 1][0] === 'ل' && SUN.has(L[k + 2][0])) skipLam = k + 1;
      L.forEach((c, j) => { if (j === skipLam) return; const v = SKA[c[0]]; if (!v) return; if (out.length && out[out.length - 1] === v) return; out.push(v); map.push(c[1]); });
      pos += w.length;
    }
    return { s: out.join(''), map };
  }
  const LDI = [['kh', 'h'], ['gh', 'g'], ['sy', 'S'], ['sh', 's'], ['ts', 's'], ['th', 't'], ['dz', 'z'], ['zh', 'z'], ['dh', 'd'], ['dl', 'd'], ['ch', 'h']];
  function skelLat(text) {
    let t = String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
    for (const [a, b] of LDI) t = t.split(a).join(b);
    t = t.replace(/q/g, 'k').replace(/[vp]/g, 'f').replace(/c/g, 'k').replace(/x/g, 'ks').replace(/[aiueowy]/g, '');
    return t.replace(/(.)\1+/g, '$1');
  }
  K.skelAr = skelAr; K.skelLat = skelLat;
  K.skel = text => (ARL.test(text) ? skelAr(text).s : skelLat(text));
  // pencocokan kerangka secara toleran (algoritma Sellers): kembalikan {err, a, b} terbaik atau null
  function approx(q, t, kmax) {
    const m = q.length; let prev = new Int32Array(m + 1), cur = new Int32Array(m + 1), ps = new Int32Array(m + 1), cs = new Int32Array(m + 1);
    for (let i = 0; i <= m; i++) { prev[i] = i; ps[i] = 0; }
    let best = null;
    for (let j = 1; j <= t.length; j++) {
      const tc = t.charCodeAt(j - 1), isH = tc === 72;
      cur[0] = 0; cs[0] = j;
      for (let i = 1; i <= m; i++) {
        const qc = q.charCodeAt(i - 1);
        const same = qc === tc || (isH && (qc === 116 || qc === 104));
        let v = prev[i - 1] + (same ? 0 : 1), s = ps[i - 1];
        if (cur[i - 1] + 1 < v) { v = cur[i - 1] + 1; s = cs[i - 1]; }
        const del = prev[i] + (isH ? 0 : 1); if (del < v) { v = del; s = ps[i]; }
        cur[i] = v; cs[i] = s;
      }
      if (cur[m] <= kmax && (!best || cur[m] < best.err)) best = { err: cur[m], a: cs[m], b: j };
      [prev, cur] = [cur, prev]; [ps, cs] = [cs, ps];
    }
    return best;
  }
  K.approx = approx;
  let TL = null;
  K.tl = (arr, src) => { TL = { s: arr, src }; };
  K.translit = async function (raw, opt) {
    await K.init();
    const ar = ARL.test(raw);
    const q = ar ? skelAr(raw).s : skelLat(raw.replace(/["“”]/g, ' '));
    if (q.length < 5) return { q, hits: [] };
    if (!TL) await need('translit.js');
    const kmax = q.length < 8 ? 0 : q.length < 14 ? 1 : q.length < 21 ? 2 : Math.floor(q.length / 7);
    const hits = [];
    for (let k = 0; k < TL.s.length; k++) {
      const t = TL.s[k]; if (!t || t.length + kmax < q.length) continue;
      const i = M.quranStart + k; if (opt && opt.ok && !opt.ok(i)) continue;
      let r = null; const ex = t.indexOf(q);
      if (ex >= 0) r = { err: 0, a: ex, b: ex + q.length };
      else if (kmax) r = approx(q, t, kmax);
      if (!r) continue;
      hits.push({ i, err: r.err, a: r.a, b: r.b, pct: Math.round((1 - r.err / q.length) * 100), cover: q.length / t.length });
    }
    // tidak ada yang cocok: coba potongan kata berurutan (mis. "ayat kursi allahu la ilaha ...")
    let part = null;
    if (!hits.length && !ar) {
      const ws = raw.replace(/["“”]/g, ' ').split(/\s+/).filter(w => /[a-z]/i.test(w));
      for (let len = ws.length - 1; len >= 2 && !hits.length; len--) {
        for (let st = 0; st + len <= ws.length; st++) {
          const sub = skelLat(ws.slice(st, st + len).join(' ')); if (sub.length < 8) continue;
          for (let k = 0; k < TL.s.length; k++) {
            const t = TL.s[k]; if (!t) continue; const i = M.quranStart + k; if (opt && opt.ok && !opt.ok(i)) continue;
            const ex = t.indexOf(sub); if (ex < 0 || hits.some(h => h.i === i)) continue;
            hits.push({ i, err: 0, a: ex, b: ex + sub.length, pct: Math.round(sub.length / q.length * 100), cover: sub.length / t.length, part: ws.slice(st, st + len).join(' ') });
          }
          if (hits.length) { part = ws.slice(st, st + len).join(' '); }
        }
      }
    }
    hits.sort((x, y) => x.err - y.err || y.pct - x.pct || y.cover - x.cover || x.i - y.i);
    return { q, ar, kmax, hits, part };
  };
  // rentang karakter teks Arab asli untuk disorot dari hasil kerangka
  K.tlRange = function (text, query) {
    const A = skelAr(text); const q = ARL.test(query) ? skelAr(query).s : skelLat(query.replace(/["“”]/g, ' '));
    if (q.length < 5) return null;
    let r = null; const ex = A.s.indexOf(q);
    if (ex >= 0) r = { a: ex, b: ex + q.length }; else r = approx(q, A.s, q.length < 8 ? 0 : q.length < 14 ? 1 : q.length < 21 ? 2 : Math.floor(q.length / 7));
    if (!r || r.b <= r.a) return null;
    let a = A.map[r.a], b = A.map[Math.min(r.b, A.map.length) - 1];
    while (a > 0 && /\S/.test(text[a - 1])) a--;
    while (b < text.length && /\S/.test(text[b])) b++;
    return [a, b];
  };
  /* ---------- label & referensi ---------- */
  const COLLN = { bukhari: 'Bukhari', muslim: 'Muslim', abudaud: 'Abu Dawud', tirmidzi: 'Tirmidzi', nasai: "An-Nasa'i", ibnumajah: 'Ibnu Majah', ahmad: 'Ahmad', malik: 'Malik', darimi: 'Ad-Darimi', bulughul: 'Bulughul Maram', riyadh: 'Riyadhus Shalihin' };
  K.COLLN = COLLN;
  K.title = function (r) {
    const s = M.src[r.src];
    if (r.src === 'quran') return 'QS. ' + r.surah + ' (' + r.s + '): ' + r.a;
    if (r.src === 'qtema') return 'Indeks tema: ' + r.tema + (r.sub ? ' › ' + r.sub : '') + ' › ' + r.label;
    if (r.src === 'jalalain') return 'Tafsir Jalalain · QS. ' + r.s + ': ' + r.a;
    if (r.src === 'ibnukatsir') return 'Tafsir Ibnu Katsir · ' + (r.title || '');
    if (r.src === 'kitab9') return 'Kitab 9 Imam · ' + (r.coll === 'ahmad' ? 'Musnad Ahmad' : r.coll === 'malik' ? "Muwaththa' Malik" : r.coll === 'bukhari' ? 'Shahih Bukhari' : r.coll === 'muslim' ? 'Shahih Muslim' : 'Sunan ' + COLLN[r.coll]);
    return s.name;
  };
  K.srcName = code => M.src[code] ? M.src[code].name : code;
  K.srcFile = code => M.src[code] ? M.src[code].file : '';
  K.ref = function (r) {
    const s = M.src[r.src]; const p = [];
    if (r.src === 'quran') { p.push('QS. ' + r.surah + ' (' + r.s + '): ' + r.a); if (r.juz) p.push('Juz ' + r.juz); }
    else if (r.src === 'qtema') p.push('Indeks tema Al-Qur\'an: ' + r.tema + (r.sub ? ' › ' + r.sub : '') + ' › ' + r.label);
    else if (r.src === 'jalalain') p.push('Tafsir Jalalain, QS. ' + r.s + ': ' + r.a);
    else if (r.src === 'ibnukatsir') p.push('Tafsir Ibnu Katsir, ' + (r.title || ''));
    else {
      p.push(K.title(r));
      if (r.kitab) p.push(/^\d|kitab/i.test(r.kitab) ? 'Kitab ' + r.kitab.replace(/^kitab\s+/i, '') : r.kitab);
      if (r.bab) p.push('Bab ' + r.bab.replace(/^bab\s*/i, ''));
      if (r.no) p.push('No. ' + r.no);
    }
    p.push('Sumber: ' + s.file + ' › ' + r.path);
    return p.join('; ') + '.';
  };
})(typeof window !== 'undefined' ? window : globalThis);
if (typeof module !== 'undefined' && module.exports) module.exports = (typeof window !== 'undefined' ? window : globalThis).PRMK;
