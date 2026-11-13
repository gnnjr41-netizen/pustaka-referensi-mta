/* Pencarian makna lokal (PRMV) — v3.2, tanpa API dan tanpa model besar.
   Indeks di data/kitab/vektor/ dibangun oleh tools/semantik/build_vektor.py dari teks database V3.1 sendiri:
   - kamus vektor kata domain (skip-gram 128 dimensi, dilatih dari Al-Qur'an terjemahan, tafsir, hadis, brosur)
   - vektor potongan teks (rata-rata berbobot SIF → buang komponen utama → PCA 64 → int8)
   - padanan kata Arab → kata Indonesia terdekat (model dwibahasa dari pasangan teks Arab–terjemahan)
   Kueri diolah dengan cara yang sama persis. Skor kemiripan hanyalah kedekatan pemakaian kata di korpus —
   BUKAN bukti kebenaran dalil. Semua file dimuat bertahap lewat <script> (berjalan juga saat index.html dibuka langsung). */
(function (root) {
  'use strict';
  const V = root.PRMV = root.PRMV || {};
  const P = () => root.PRM, Q = () => root.PRMQ;
  let BASE = 'data/kitab/vektor/', VERQ = '';
  const store = { d: new Map(), k: new Map(), a: new Map() };
  const waiting = new Map();
  const ST = { state: 'idle', err: null, bytes: 0, files: 0, integrity: 'belum dicek' };
  V.CATS = { quran: ['quran', 'qtema'], tafsir: ['jalalain', 'ibnukatsir'], hadis: ['hadis', 'k9-0', 'k9-1', 'k9-2'], materi: ['gurda'], brosur: ['chm', 'pdf'] };
  // kata pengantar yang tidak membawa makna pokok (kategori dibaca terpisah)
  const INTRO = new Set(('ayat ayatayat hadis hadits hadist hadith dalil dalilnya dalildalil keterangan referensi rujukan tentang mengenai soal terkait seputar ' +
    'carikan cari carilah tolong mohon minta berikan tunjukkan tampilkan sebutkan jelaskan apa apakah bagaimana mengapa kenapa materi bahan kajian ' +
    'alquran quran qs surat surah kitab buku brosur sumber yg dgn utk dlm').split(' '));
  const AR_STOP = new Set(['من', 'في', 'علي', 'الي', 'عن', 'ان', 'او', 'ثم', 'لا', 'ما', 'هو', 'هي', 'قال', 'كان', 'الذي', 'التي', 'هذا', 'هذه', 'ذلك', 'قد', 'لم', 'لن', 'اذا', 'كل', 'بن', 'رسول', 'الله', 'صلي', 'عليه', 'وسلم']);
  const AR = /[؀-ۿ]/;

  /* ---------- pemuat ---------- */
  V.d = o => { store.d.set(o.name, o); };
  V.k = o => { store.k.set(String(o.key), o); };
  V.a = o => { store.a.set(String(o.key), o); };
  // http(s): fetch → teks → JSON (sumber skrip besar tidak tertahan di memori); file:// (dobel-klik): <script>
  const CALL = { 'PRMV.d(': o => V.d(o), 'PRMV.k(': o => V.k(o), 'PRMV.a(': o => V.a(o), 'PRMV.setMeta(': o => V.setMeta(o) };
  V.loader = function (file) {
    if (typeof fetch === 'function' && typeof location !== 'undefined' && /^https?:$/.test(location.protocol)) {
      return fetch(BASE + file + VERQ).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }).then(t => {
        const pre = Object.keys(CALL).find(k => t.startsWith(k)); if (!pre) throw new Error('format tidak dikenal');
        const end = t.lastIndexOf(');'); CALL[pre](JSON.parse(t.slice(pre.length, end)));
      }).catch(e => { throw new Error('Gagal memuat ' + file + ' (' + e.message + ')'); });
    }
    return new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = BASE + file + VERQ; s.async = true;
      s.onload = () => { s.remove(); res(); }; s.onerror = () => { s.remove(); rej(new Error('Gagal memuat ' + file)); };
      document.head.appendChild(s);
    });
  };
  function need(file) {
    if (waiting.has(file)) return waiting.get(file);
    const pr = V.loader(file).then(() => { ST.files++; }).catch(e => { waiting.delete(file); throw e; });
    waiting.set(file, pr); return pr;
  }
  function b64bytes(s) {
    if (typeof atob === 'function') { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
    return new Uint8Array(Buffer.from(s, 'base64'));
  }
  function view(Ctor, s) { const u = b64bytes(s); return new Ctor(u.buffer, u.byteOffset, u.byteLength / Ctor.BYTES_PER_ELEMENT); }
  function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
  V.fnv = fnv;
  async function sha256hex(str) {
    const c = root.crypto && root.crypto.subtle; if (!c || typeof TextEncoder === 'undefined') return null;
    const buf = await c.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // cek isi pecahan: panjang array & versi selalu; SHA-256 isi bila crypto.subtle tersedia (https / localhost)
  async function verify(kind, name, o, parts) {
    const M = V.meta;
    if (o.ver !== M.ver) throw new Error('Versi pecahan ' + kind + '/' + name + ' (' + o.ver + ') tidak sama dengan meta (' + M.ver + '). Muat ulang halaman (Ctrl+F5).');
    const want = (M[kind] && M[kind][name] && M[kind][name].h) || o.h;
    const got = await sha256hex(parts.join('')).catch(() => null);
    if (got === null) { if (ST.integrity === 'belum dicek') ST.integrity = 'panjang & versi dicek (SHA-256 tidak tersedia di mode ini)'; return; }
    if (got !== want) throw new Error('Checksum pecahan ' + kind + '/' + name + ' tidak cocok — file indeks rusak/terpotong.');
    ST.integrity = 'SHA-256 cocok';
  }

  /* ---------- meta ---------- */
  let metaP = null;
  V.meta = V.meta || null;
  V.init = function (base, opts) {
    if (base) BASE = base;
    if (metaP) return metaP;
    ST.state = 'loading';
    metaP = (async () => {
      V.meta = null;
      await need('meta.js'); // berisi PRMV.setMeta({...})
      const M = V.meta; if (!M || !M.ver) throw new Error('meta indeks makna kosong');
      if (opts && opts.cacheBust) VERQ = '?v=' + M.ver;
      M.Cm = view(Float32Array, M.C); // 128×64 baris-utama
      M.uv = Float32Array.from(M.u); M.muv = Float32Array.from(M.mu);
      ST.state = 'ready';
      return M;
    })().catch(e => { ST.state = 'error'; ST.err = e.message; metaP = null; throw e; });
    return metaP;
  };
  V.setMeta = o => { V.meta = o; };
  V.status = () => ({ state: ST.state, err: ST.err, files: ST.files, integrity: ST.integrity, docShards: Array.from(store.d.keys()).filter(k => store.d.get(k).vA), ver: V.meta && V.meta.ver, model: V.meta && V.meta.model });

  /* ---------- kamus vektor kata ---------- */
  async function wordShard(h) {
    const key = String(h);
    let o = store.k.get(key);
    if (!o) { await need('k/' + key + '.js'); o = store.k.get(key); if (!o) throw new Error('pecahan kata ' + key + ' kosong'); }
    if (!o.map) {
      await verify('k', key, o, [o.v, o.sc]);
      o.vA = view(Int8Array, o.v); o.scA = view(Float32Array, o.sc);
      if (o.vA.length !== o.n * o.dim || o.scA.length !== o.n) throw new Error('pecahan kata ' + key + ' tidak utuh');
      o.map = new Map(); o.w.forEach((w, i) => o.map.set(w, i)); delete o.v; delete o.sc;
    }
    return o;
  }
  async function words(list) {
    const M = V.meta; const hs = new Set(list.map(w => fnv(w) % M.nShard));
    await Promise.all(Array.from(hs).map(wordShard));
    const out = new Map();
    for (const w of list) {
      const o = store.k.get(String(fnv(w) % M.nShard)); const i = o && o.map.get(w);
      if (i == null) continue;
      out.set(w, { w, f: o.f[i], o, i, nb: o.nb[i] });
    }
    return out;
  }
  function vecOf(e) { const d = e.o.dim, s = e.o.scA[e.i], v = new Float32Array(d); for (let k = 0; k < d; k++) v[k] = e.o.vA[e.i * d + k] * s; return v; }
  function parseNb(s) { return s ? s.split(',').map(x => { const p = x.lastIndexOf(' '); return [x.slice(0, p), +x.slice(p + 1) / 100]; }) : []; }
  V.neighbors = async function (list) { await V.init(); const m = await words(list); const out = {}; for (const [w, e] of m) out[w] = parseNb(e.nb); return out; };
  async function arabic(list) {
    const M = V.meta; const hs = new Set(list.map(w => fnv(w) % M.nShard));
    await Promise.all(Array.from(hs).map(h => store.a.has(String(h)) ? null : need('a/' + h + '.js')));
    const out = new Map();
    for (const w of list) { const o = store.a.get(String(fnv(w) % M.nShard)); if (o && o.m[w]) out.set(w, parseNb(o.m[w])); }
    return out;
  }

  /* ---------- token kueri (normalisasi aplikasi: PRM.norm + ejaan kamus) ---------- */
  V.toks = function (text) {
    const raw = String(text || '');
    const lat = Q() ? Q().toks(raw) : P().norm(raw).split(' ').filter(w => w && !/^\d+$/.test(w) && !AR.test(w));
    const MST = Q() ? Q().MSTOP : new Set();
    const keep = [], drop = [];
    for (const w of lat) { if (INTRO.has(w) || MST.has(w) || w.length < 2) drop.push(w); else keep.push(w); }
    const ar = P().norm(raw).split(' ').filter(w => w && AR.test(w) && Array.from(w).length >= 3 && !AR_STOP.has(w));
    return { lat: Array.from(new Set(keep)), ar: Array.from(new Set(ar)), drop };
  };

  /** vektor kueri 64 dimensi + kata yang dipakai (dengan bobot) */
  V.queryVec = async function (text, extra) {
    const M = await V.init();
    const T = V.toks(text);
    if (extra && extra.length) for (const w of V.toks(extra.join(' ')).lat) if (!T.lat.includes(w)) T.lat.push(w);
    const used = [], missing = [];
    let found = await words(T.lat);
    // kata yang tidak dikenal: coba bentuk dasar (imbuhan dilepas) yang ada di kamus vektor
    const miss = T.lat.filter(w => !found.has(w));
    if (miss.length && Q()) {
      const cands = new Map(); for (const w of miss) cands.set(w, Q().cands(w).filter(c => c.length >= 3).sort((a, b) => b.length - a.length));
      const all = Array.from(new Set(Array.from(cands.values()).flat()));
      const fc = all.length ? await words(all) : new Map();
      for (const [w, cs] of cands) { const c = cs.find(x => fc.has(x)); if (c) { found.set(w, Object.assign({}, fc.get(c), { via: c })); } else missing.push(w); }
    } else missing.push(...miss);
    const acc = new Float64Array(M.dimW);
    const add = (e, wt, label, via) => { const v = vecOf(e); for (let k = 0; k < v.length; k++) acc[k] += wt * v[k]; used.push({ w: label, base: e.w, f: e.f, wt: Math.round(wt * 1000) / 1000, via }); };
    for (const w of T.lat) { const e = found.get(w); if (e) add(e, e.f, w, e.via || null); }
    // kata Arab → kata Indonesia terdekat (padanan dari model dwibahasa)
    if (T.ar.length) {
      const am = await arabic(T.ar);
      const tgt = []; for (const [aw, lst] of am) for (const [w, s] of lst.slice(0, 3)) if (s >= 0.55) tgt.push([aw, w, s]);
      const tw = await words(Array.from(new Set(tgt.map(x => x[1]))));
      for (const [aw, w, s] of tgt) { const e = tw.get(w); if (e) add(e, e.f * s, w, aw); }
      for (const aw of T.ar) if (!am.has(aw)) missing.push(aw);
    }
    if (!used.length) return { vec: null, used, missing, drop: T.drop };
    // buang komponen utama korpus → normalkan → pusatkan → PCA 64 → normalkan (sama dengan build)
    let dot = 0; for (let k = 0; k < M.dimW; k++) dot += acc[k] * M.uv[k];
    let n = 0; for (let k = 0; k < M.dimW; k++) { acc[k] -= dot * M.uv[k]; n += acc[k] * acc[k]; }
    n = Math.sqrt(n) || 1;
    const out = new Float32Array(M.dim);
    for (let k = 0; k < M.dimW; k++) { const x = acc[k] / n - M.muv[k]; if (!x) continue; const row = k * M.dim; for (let j = 0; j < M.dim; j++) out[j] += x * M.Cm[row + j]; }
    let n2 = 0; for (let j = 0; j < M.dim; j++) n2 += out[j] * out[j]; n2 = Math.sqrt(n2) || 1;
    for (let j = 0; j < M.dim; j++) out[j] /= n2;
    return { vec: out, used, missing, drop: T.drop };
  };

  /* ---------- pecahan vektor dokumen ---------- */
  async function docShard(name) {
    let o = store.d.get(name);
    if (!o) { await need('d/' + name + '.js'); o = store.d.get(name); if (!o) throw new Error('pecahan ' + name + ' kosong'); }
    if (!o.vA) {
      await verify('d', name, o, [o.ref, o.sc, o.v]);
      o.refA = view(Int32Array, o.ref); o.scA = view(Float32Array, o.sc); o.vA = view(Int8Array, o.v);
      if (o.refA.length !== o.n * 3 || o.scA.length !== o.n || o.vA.length !== o.n * o.dim) throw new Error('pecahan ' + name + ' tidak utuh');
      delete o.ref; delete o.sc; delete o.v;
    }
    return o;
  }
  V.shardsFor = function (cats) { const out = []; for (const c of cats) for (const s of (V.CATS[c] || [])) if (!out.includes(s)) out.push(s); return out; };
  V.load = async function (names, onProgress) {
    await V.init(); let k = 0;
    for (const n of names) { await docShard(n); k++; if (onProgress) onProgress(k, names.length, n); }
  };
  V.bytesFor = function (names) { const M = V.meta; return names.reduce((s, n) => s + ((M && M.d[n] && M.d[n].bytes) || 0), 0); };
  V.loaded = name => !!(store.d.get(name) && store.d.get(name).vA);

  /**
   * Cari potongan teks paling dekat maknanya.
   * opts: {cats:[...]|shards:[...], top (per pecahan, bawaan 300), min (skor minimum, bawaan 0.2), extra:[istilah tambahan], onProgress}
   * hasil: {q:{used,missing,drop}, hits:[{shard, a, b0, b1, s}], ms}
   */
  V.search = async function (text, opts) {
    opts = opts || {}; const t0 = Date.now();
    const M = await V.init();
    const q = await V.queryVec(text, opts.extra);
    if (!q.vec) return { q, hits: [], ms: Date.now() - t0, empty: true };
    const names = opts.shards || V.shardsFor(opts.cats || Object.keys(V.CATS));
    let k = 0; const hits = []; const top = opts.top || 300, min = opts.min != null ? opts.min : 0.2;
    for (const name of names) {
      const o = await docShard(name); k++; if (opts.onProgress) opts.onProgress(k, names.length, name);
      const d = o.dim, v = o.vA, sc = o.scA, ref = o.refA, qv = q.vec, n = o.n;
      let best = []; let floor = min;
      for (let j = 0; j < n; j++) {
        let s = 0; const b = j * d;
        for (let t = 0; t < d; t++) s += qv[t] * v[b + t];
        s *= sc[j];
        if (s <= floor) continue;
        best.push([s, j]);
        if (best.length > top * 2) { best.sort((x, y) => y[0] - x[0]); best.length = top; floor = best[top - 1][0]; }
      }
      best.sort((x, y) => y[0] - x[0]); if (best.length > top) best.length = top;
      for (const [s, j] of best) hits.push({ shard: name, a: ref[j * 3], b0: ref[j * 3 + 1], b1: ref[j * 3 + 2], s: Math.round(s * 1000) / 1000 });
    }
    hits.sort((x, y) => y.s - x.s);
    return { q, hits, ms: Date.now() - t0 };
  };
  /** kata terdekat dari kata kueri yang dipakai (untuk alasan & bukti "istilah terkait") */
  V.related = async function (used) {
    const base = Array.from(new Set(used.map(u => u.base)));
    const nb = await V.neighbors(base);
    return used.map(u => ({ w: u.w, base: u.base, via: u.via, f: u.f, nb: (nb[u.base] || []).filter(x => x[1] >= 0.5) }));
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = V;
})(typeof window !== 'undefined' ? window : globalThis);
