/* Pencarian makna Al-Qur'an (PRMQ) — tanpa AI.
   Indeks makna statis di data/kitab/makna/ (dibangun tools/build_makna.js dari terjemahan, catatan kaki,
   Tafsir Jalalain, Tafsir Ibnu Katsir, judul kelompok ayat & indeks tema Al-Qur'an Digital 2.1).
   Urutan prioritas: 1 makna/tema · 2 terjemahan/tafsir · 3 sinonim kamus · 4 literal (pendukung). */
(function (root) {
  'use strict';
  const Q = {};
  const P = () => root.PRM, K = () => root.PRMK, S = () => root.PRMS;

  /* ---------- tokenisasi & akar kata (dipakai bersama oleh build dan browser) ---------- */
  const MSTOP = new Set(('yang dan di ke dari untuk dengan itu ini adalah ialah yaitu dalam pada kepada oleh atau juga akan sudah telah ' +
    'kami kita kamu engkau mereka dia ia aku saya anda kalian beliau nya mu ku lah kah pun tah ' +
    'bagi agar supaya karena sebab jika kalau apabila bila maka lalu kemudian serta tetapi tapi namun melainkan hanya ' +
    'sebagai seperti bahwa bahwasanya sesungguhnya hai wahai sedang sedangkan antara tersebut begitu demikian itulah inilah ' +
    'ada sama para segala semua setiap tiap suatu sesuatu se pula lagi pun dan atas bawah oleh terhadap hingga sampai sehingga ' +
    'dari daripada akan saja pun yakni ').split(/\s+/).filter(Boolean));
  Q.MSTOP = MSTOP;
  function canon(w) { const p = P(); const g = p.VARMAP.get(w); return g ? g[0] : w; }
  /** teks → token normal (tanpa angka), urutan dipertahankan */
  function toks(text) {
    const p = P(); const out = [];
    for (const w of p.norm(String(text || '')).split(' ')) { if (!w || /^\d+$/.test(w) || /[؀-ۿ]/.test(w)) continue; out.push(canon(w)); }
    return out;
  }
  Q.toks = toks;
  const PART = ['lah', 'kah', 'pun', 'tah'], POS = ['nya', 'ku', 'mu'], DER = ['kan', 'an', 'i'];
  const PRE = ['memper', 'diper', 'menge', 'meng', 'meny', 'mem', 'men', 'me', 'di', 'ber', 'be', 'ter', 'ke', 'se'];
  const V = /^[aiueo]/;
  /** kandidat akar kata (bentuk dasar) dari satu kata; urutan tidak bermakna — pemilihan memakai kosakata */
  function cands(w) {
    const out = new Set();
    const sufs = [w];
    for (const p of PART) if (w.endsWith(p) && w.length - p.length >= 3) sufs.push(w.slice(0, -p.length));
    for (const s of sufs.slice()) for (const p of POS) if (s.endsWith(p) && s.length - p.length >= 3) sufs.push(s.slice(0, -p.length));
    for (const s of sufs.slice()) for (const d of DER) if (s.endsWith(d) && s.length - d.length >= 3) sufs.push(s.slice(0, -d.length));
    for (const s of sufs) {
      out.add(s);
      for (const p of PRE) {
        if (!s.startsWith(p) || s.length - p.length < 3) continue;
        const r = s.slice(p.length); out.add(r);
        if (V.test(r)) { // peluluhan nasal
          if (p === 'meny') out.add('s' + r);
          if (p === 'mem') out.add('p' + r);
          if (p === 'men') out.add('t' + r);
          if (p === 'meng' || p === 'menge') out.add('k' + r);
        }
        if ((p === 'ke' || p === 'se' || p === 'ber' || p === 'ter' || p === 'di') && r.length >= 5) { // berke-, kese-, diper-
          for (const p2 of ['ber', 'ke', 'per', 'se']) if (r.startsWith(p2) && r.length - p2.length >= 3) out.add(r.slice(p2.length));
        }
      }
    }
    out.delete(w);
    return Array.from(out);
  }
  Q.cands = cands;
  /** pilih akar: terpendek yang ada di kosakata (bukan kata sambung); seri → paling sering */
  function pickStem(w, freq) {
    if (w.length < 5) return w;
    let best = null, bf = 0;
    for (const c of cands(w)) {
      if (MSTOP.has(c) || c.length < 3) continue;
      const f = freq(c); if (!f) continue;
      if (c.length === 3 && f < 20) continue;
      if (!best || c.length < best.length || (c.length === best.length && f > bf)) { best = c; bf = f; }
    }
    return best || w;
  }
  Q.pickStem = pickStem;

  /* ---------- pemuatan indeks ---------- */
  let BASE = 'data/kitab/makna/';
  const store = { w: new Map(), u: new Map(), b: new Map() }, waiting = new Map();
  let M = null, metaP = null;
  Q.meta = null;
  Q.put = (kind, key, obj) => { store[kind].set(key, obj); };
  Q.loader = function (file) {
    return new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = BASE + file; s.async = true;
      s.onload = () => { s.remove(); res(); }; s.onerror = () => { s.remove(); rej(new Error('Gagal memuat ' + file)); };
      document.head.appendChild(s);
    });
  };
  function need(file) { if (waiting.has(file)) return waiting.get(file); const pr = Q.loader(file).catch(e => { waiting.delete(file); throw e; }); waiting.set(file, pr); return pr; }
  const shardKey = t => { const c = t.slice(0, 2).replace(/[^a-z]/g, '_'); return c.length === 2 ? c : (c + '_').slice(0, 2); };
  Q.shardKey = shardKey;
  Q.init = function (base) {
    if (base) BASE = base;
    if (metaP) return metaP;
    metaP = (async () => {
      await need('meta.js'); M = Q.meta; if (!M) throw new Error('indeks makna kosong');
      // judul kelompok ayat → rentang; ayat → daftar judul
      M.ayatHead = Array.from({ length: M.nAyat }, () => []);
      M.heads.forEach((h, hi) => { for (let x = h[1]; x <= h[2]; x++) M.ayatHead[x].push(hi); });
      M.ayatTema = Array.from({ length: M.nAyat }, () => []);
      M.tema.forEach((t, ti) => { for (const x of t[3]) M.ayatTema[x].push(ti); });
      M.ayatIK = Array.from({ length: M.nAyat }, () => []);
      M.ik.forEach((k, ki) => { for (let x = k[1]; x <= k[2]; x++) M.ayatIK[x].push(ki); });
      M.ayatOf = (s, a) => M.sOff[s - 1] + a - 1;
      M.sa = x => { let s = 1; while (s < 114 && M.sOff[s] <= x) s++; return [s, x - M.sOff[s - 1] + 1]; };
      return M;
    })();
    return metaP;
  };
  // bagian indeks yang tidak ada (tidak ada kata berawalan itu) dianggap kosong
  async function loadShards(kind, keys) { await Promise.all(Array.from(new Set(keys.map(shardKey))).map(k => store[kind].has(k) ? null : need(kind + '/' + k + '.js').then(() => { if (!store[kind].has(k)) store[kind].set(k, {}); }, () => { store[kind].set(k, {}); }))); }
  function dec(s, tfOut) { const out = []; if (!s) return out; let x = 0; for (const p of s.split(',')) { const c = p.indexOf(':'); x += parseInt(c < 0 ? p : p.slice(0, c), 36); out.push(x); if (tfOut) tfOut.push(c < 0 ? 1 : +p.slice(c + 1)); } return out; }
  /** kata permintaan → akar kata yang dipakai indeks */
  async function stemQuery(words) {
    await loadShards('w', words); await loadShards('u', words);
    const res = new Map(); const probe = [];
    for (const w of words) {
      const wm = store.w.get(shardKey(w)); const um = store.u.get(shardKey(w));
      if (wm && wm[w]) { res.set(w, wm[w]); continue; }
      if (um && um[w]) { res.set(w, w); continue; }
      probe.push(w);
    }
    if (probe.length) { // kata tidak ada di korpus: coba akar
      const cs = new Map(); probe.forEach(w => cs.set(w, cands(w).filter(c => c.length >= 3 && !MSTOP.has(c))));
      const all = []; cs.forEach(v => all.push(...v)); await loadShards('u', all);
      for (const w of probe) {
        let best = null; for (const c of cs.get(w)) { const um = store.u.get(shardKey(c)); if (um && um[c] && (!best || c.length < best.length)) best = c; }
        res.set(w, best ? canon(best) : w);
      }
    }
    return res;
  }
  function seqOf(phrase) { return toks(phrase).filter(t => !MSTOP.has(t)); }
  /** daftar ayat per bidang untuk satu bentuk (kata/frasa). Frasa = pasangan kata berurutan (bigram).
      Hasil: {R:[ayat], C:[ayat], J:[ayat], H:[judul], T:[tema], K:[bagian IK], tf:{J:Map, K:Map}} */
  async function formPostings(form, stemMap) {
    const seq = seqOf(form).map(w => stemMap.get(w) || w);
    if (!seq.length) return null;
    const uniE = w => { const um = store.u.get(shardKey(w)); const e = um && um[w]; return e ? decEntry(e) : { tf: {} }; };
    if (seq.length === 1) return uniE(seq[0]);
    const keys = []; for (let i = 0; i + 1 < seq.length; i++) keys.push(seq[i] + ' ' + seq[i + 1]);
    await loadShards('b', keys);
    let acc = null;
    for (const k of keys) {
      const bm = store.b.get(shardKey(k)); const e = bm && bm[k]; const d = e ? decEntry(e) : { tf: {} };
      if (!acc) { acc = { tf: {} }; for (const f of FL) if (d[f]) acc[f] = d[f]; if (d.tf.J) acc.tf.J = d.tf.J; continue; }
      for (const f of FL) { if (!acc[f]) continue; if (!d[f]) { delete acc[f]; continue; } const st = new Set(d[f]); acc[f] = acc[f].filter(x => st.has(x)); if (!acc[f].length) delete acc[f]; }
    }
    // Ibnu Katsir: hanya indeks kata tunggal → frasa = semua kata ada di bagian tafsir yang sama (bukti lemah)
    const us = seq.map(uniE);
    if (us.every(u => u.K)) {
      const sets = us.map(u => new Set(u.K)); const kAll = us[0].K.filter(x => sets.every(s => s.has(x)));
      if (kAll.length) { acc.K = kAll; const m = new Map(); kAll.forEach(x => m.set(x, Math.min(...us.map(u => u.tf.K.get(x) || 1)))); acc.tf.K = m; }
    }
    return acc;
  }
  const FL = ['R', 'P', 'C', 'J', 'H', 'T'];
  const cacheDec = new Map();
  function decEntry(e) {
    let d = cacheDec.get(e); if (d) return d; d = { tf: {} };
    for (const f of Object.keys(e)) { const tf = []; d[f] = dec(e[f], tf); if (f === 'J' || f === 'K') { const m = new Map(); d[f].forEach((x, i) => m.set(x, tf[i])); d.tf[f] = m; } }
    if (cacheDec.size > 4000) cacheDec.clear(); cacheDec.set(e, d); return d;
  }

  /* ---------- pencarian ---------- */
  const FIELD = { R: 'Terjemahan', P: 'Keterangan dalam kurung pada terjemahan', C: 'Catatan kaki terjemahan', J: 'Tafsir Jalalain', K: 'Tafsir Ibnu Katsir', H: 'Judul kelompok ayat', T: "Indeks tema Al-Qur'an" };
  Q.FIELD = FIELD;
  const LABEL = { tema: 'Kecocokan makna/tema', isi: 'Kecocokan terjemahan/tafsir', sinonim: 'Kecocokan sinonim', literal: 'Kecocokan kata literal', terkait: 'Hanya istilah terkait', ik: 'Hanya tafsir kelompok ayat' };
  Q.LABEL = LABEL;
  /**
   * @param text permintaan pengguna
   * @param opts {limit, analysis}
   * @returns {analysis, core, utama:[], pendukung:[], ms, note}
   */
  Q.search = async function (text, opts) {
    opts = opts || {};
    const t0 = Date.now();
    await Q.init();
    const A = opts.analysis || S().analyze(text);
    // konsep yang seluruh bentuknya hanya kata sambung (kamu, atas, …) tidak ikut dicari
    const concepts0 = A.concepts.filter(c => c.main && c.main.length && c.main.concat(c.related || []).some(v => seqOf(v).length));
    // konsep kamus berupa frasa majemuk ("berbakti kepada orang tua") dipecah menjadi konsep kamus penyusunnya
    // ("berbakti" + "orang tua"), agar ayat yang memuat keduanya dengan susunan berbeda tetap ditemukan
    const concepts = [];
    for (const c of concepts0) {
      if (c.entry) {
        const e = (S().kamus().entri || []).find(x => x.id === c.entry);
        let done = false;
        for (const src of [c.words && c.words.length >= 2 ? c.words.join(' ') : null, e && e.kata.includes(' ') ? e.kata : null]) {
          if (!src) continue;
          const A2 = S().analyze(src, { exclude: [c.entry] });
          const subs = A2.concepts.filter(z => z.entry && !z.mod);
          if (subs.length >= 2 && A2.concepts.every(z => z.entry || z.mod)) { subs.forEach(z => { z.parent = c; z.mod = !!c.mod; concepts.push(z); }); done = true; break; }
        }
        if (done) continue;
      }
      concepts.push(c);
    }
    if (!concepts.length) return { analysis: A, concepts: [], core: [], utama: [], pendukung: [], utamaTotal: 0, pendukungTotal: 0, ms: Date.now() - t0, empty: true };
    // bentuk per konsep: langsung (kata pengguna / kata utama kamus), sinonim (makna sama), terkait & akar (pendukung)
    const kam = S().kamus();
    const forms = [];
    for (const [ci, c] of concepts.entries()) {
      const direct = new Set([c.key].concat(c.words && c.words.length ? [c.words.join(' ')] : []));
      if (c.entry) { const e = (kam.entri || []).find(x => x.id === c.entry); if (e) { const n = P().norm(e.kata); direct.add(n); (kam.ejaan || []).forEach(g => { if (g.map(w => P().norm(w)).includes(n)) g.forEach(w => direct.add(P().norm(w))); }); } }
      for (const v of c.main) forms.push({ ci, f: v, kind: direct.has(v) || !c.entry ? 'direct' : 'syn' });
      if (c.parent) for (const v of c.parent.main) forms.push({ ci, f: v, kind: 'syn' }); // frasa majemuk utuh (mis. "birrul walidain") mendukung setiap penyusunnya
      for (const v of c.related || []) forms.push({ ci, f: v, kind: 'rel' });
      for (const v of c.stem || []) forms.push({ ci, f: v, kind: 'rel' });
    }
    const words = Array.from(new Set(forms.flatMap(x => seqOf(x.f))));
    const stemMap = await stemQuery(words);
    const posts = await Promise.all(forms.map(x => formPostings(x.f, stemMap)));
    // bukti per ayat per konsep: E[ci][bidang] = {kind, form, src, tf}
    const nC = concepts.length;
    const ev = new Map();
    const getE = x => { let e = ev.get(x); if (!e) { e = Array.from({ length: nC }, () => ({})); ev.set(x, e); } return e; };
    const rank = { direct: 3, syn: 2, rel: 1 };
    const put = (x, ci, fld, kind, form, src, tf) => {
      const slot = getE(x)[ci]; const cur = slot[fld];
      if (!cur || rank[kind] > rank[cur.kind] || (rank[kind] === rank[cur.kind] && (tf || 0) > (cur.tf || 0))) slot[fld] = { kind, form, src, tf };
    };
    forms.forEach((fm, k) => {
      const p = posts[k]; if (!p) return;
      for (const fld of ['R', 'P', 'C']) for (const x of p[fld] || []) put(x, fm.ci, fld, fm.kind, fm.f);
      for (const x of p.J || []) put(x, fm.ci, 'J', fm.kind, fm.f, null, p.tf.J ? p.tf.J.get(x) : 1);
      for (const hi of p.H || []) { const h = M.heads[hi]; for (let x = h[1]; x <= h[2]; x++) put(x, fm.ci, 'H', fm.kind, fm.f, hi); }
      for (const ti of p.T || []) for (const x of M.tema[ti][3]) put(x, fm.ci, 'T', fm.kind, fm.f, ti);
      // Tafsir Ibnu Katsir untuk ≤3 ayat dan kata tunggal disebut ≥3 kali → bukti tingkat tema (K3); selain itu bukti lemah (K)
      for (const ki of p.K || []) { const s = M.ik[ki]; const tf = p.tf.K ? p.tf.K.get(ki) || 1 : 1; for (let x = s[1]; x <= s[2]; x++) put(x, fm.ci, s[2] - s[1] < 3 && tf >= 3 && fm.kind !== 'rel' && seqOf(fm.f).length === 1 ? 'K3' : 'K', fm.kind, fm.f, ki, tf); }
    });
    const coreIdx = concepts.map((c, i) => c.mod ? -1 : i).filter(i => i >= 0);
    const core = coreIdx.length ? coreIdx : concepts.map((c, i) => i);
    let phraseSet = null;
    if (A.phrase && seqOf(A.phrase).length >= 2) { const pp = await formPostings(A.phrase, stemMap); phraseSet = new Set((pp && pp.R) || []); }
    const OWN = ['R', 'P', 'J', 'C'], THEME = ['T', 'H', 'K3'];
    const out = [];
    for (const [x, E] of ev) {
      let own = 0, nOK = 0, partialHit = 0, relOnly = 0, ikOnly = 0, syn = false, themeT = false, themeAny = false;
      const ownIn = { R: 0, J: 0 };
      for (const ci of core) {
        const s = E[ci];
        const so = OWN.filter(f => s[f] && s[f].kind !== 'rel'), st = THEME.filter(f => s[f] && s[f].kind !== 'rel');
        if (so.length || st.length) {
          nOK++; if (so.length) own++;
          if (s.R && s.R.kind !== 'rel') ownIn.R++; if (s.J && s.J.kind !== 'rel') ownIn.J++;
          if (!so.length) { themeAny = true; if (st.includes('T')) themeT = true; }
          if (st.includes('T') || st.includes('H')) themeAny = true;
          if (so.concat(st).every(f => s[f].kind === 'syn')) syn = true;
        } else if (s.K && s.K.kind !== 'rel') { ikOnly++; partialHit++; }
        else if (Object.keys(s).length) { relOnly++; partialHit++; }
      }
      // UTAMA: setiap konsep inti didukung terjemahan/catatan/Tafsir Jalalain ayat itu sendiri, atau tema yang menaungi ayat
      // (indeks tema, judul kelompok ayat, tafsir Ibnu Katsir untuk ≤3 ayat); minimal satu konsep tertulis pada ayat/tafsirnya sendiri,
      // kecuali ayat tercantum langsung di indeks tema untuk konsep itu.
      // K3 hanya boleh melengkapi satu konsep, dan ayat harus memuat konsep lain di terjemahannya sendiri
      let k3only = 0; for (const ci of core) { const s = E[ci]; if (!OWN.some(f => s[f] && s[f].kind !== 'rel') && !['T', 'H'].some(f => s[f] && s[f].kind !== 'rel') && s.K3) k3only++; }
      const k3ok = k3only === 0 || (k3only === 1 && core.length > 1 && ownIn.R >= core.length - 1);
      const utama = nOK === core.length && (own > 0 || themeT) && k3ok;
      if (!utama && !nOK && !partialHit) continue;
      let type;
      // label: makna/tema bila ada konsep yang didukung tema dan konsep lainnya tertulis di terjemahan ayat itu sendiri
      let themeLed = false;
      if (utama && themeAny) themeLed = core.every(ci => { const s = E[ci]; return ['T', 'H'].some(f => s[f] && s[f].kind !== 'rel') || ['R', 'P'].some(f => s[f] && s[f].kind !== 'rel'); });
      if (utama) type = themeLed ? 'tema' : (syn ? 'sinonim' : 'isi');
      else type = ikOnly && !relOnly ? 'ik' : (relOnly ? 'terkait' : 'literal');
      let sc = utama ? 1000 : 0;
      for (const ci of core) {
        const s = E[ci]; const w = k => k === 'direct' ? 1 : k === 'syn' ? 0.8 : 0.12;
        if (s.R) sc += 70 * w(s.R.kind);
        if (s.T) sc += 60 * w(s.T.kind);
        if (s.J) sc += (25 + 6 * Math.min(s.J.tf || 1, 5)) * w(s.J.kind);
        if (s.H) { const h = M.heads[s.H.src]; const span = h[2] - h[1] + 1; sc += (h[0] === 's' ? 55 : 30) / Math.sqrt(Math.max(1, span / 4)) * w(s.H.kind); }
        if (s.K3) sc += (15 + 3 * Math.min(s.K3.tf || 1, 8)) * w(s.K3.kind);
        if (s.K) sc += (3 + 2 * Math.min(s.K.tf || 1, 8)) * w(s.K.kind);
        if (s.C) sc += 10 * w(s.C.kind);
        if (s.P && !s.R) sc += 25 * w(s.P.kind);
      }
      if (core.length > 1 && ownIn.R === core.length) sc += 150; else if (core.length > 1 && ownIn.R + ownIn.J >= core.length && ownIn.J === core.length) sc += 60;
      concepts.forEach((c, i) => { if (c.mod) { const s = E[i]; if ((s.R && s.R.kind !== 'rel') || (s.H && s.H.kind !== 'rel')) sc += 6; } });
      if (phraseSet && phraseSet.has(x)) sc += 80;
      sc += nOK * 40 + partialHit * 4;
      out.push({ x, utama, type, score: sc, E, nOK });
    }
    out.sort((a, b) => b.score - a.score || a.x - b.x);
    // kedekatan: konsep inti yang berdekatan di terjemahan (≤6 kata) → lebih mungkin satu pokok bahasan
    if (core.length > 1 && K() && opts.proximity !== false) {
      const top = out.filter(o => o.utama).slice(0, 80);
      try {
        await K().init(); const recs = await K().get(top.map(o => M.qStart + o.x));
        for (const o of top) {
          const r = recs.get(M.qStart + o.x); if (!r) continue;
          const tt = toks(String(r.tr || '').replace(/\[\d+\]/g, ' ')).filter(w => !MSTOP.has(w));
          const pos = core.map(ci => {
            const s = o.E[ci]; const f = (s.R && s.R.kind !== 'rel') ? s.R.form : (s.P && s.P.kind !== 'rel') ? s.P.form : null; if (!f) return null;
            const w0 = seqOf(f)[0]; if (!w0) return null; const st = stemMap.get(w0) || w0;
            const ps = []; tt.forEach((t, i) => { if (t === w0 || t === st || cands(t).includes(st)) ps.push(i); }); return ps.length ? ps : null;
          });
          if (pos.some(p => !p)) continue;
          let best = 1e9; for (const a of pos[0]) { let mx = 0; for (let k = 1; k < pos.length; k++) { let d = 1e9; for (const b of pos[k]) d = Math.min(d, Math.abs(a - b)); mx = Math.max(mx, d); } best = Math.min(best, mx); }
          o.near = best; if (best <= 6) o.score += 120; else if (best <= 12) o.score += 50;
        }
      } catch (e) { /* tanpa data terjemahan: urutan tetap */ }
      out.sort((a, b) => (b.utama - a.utama) || b.score - a.score || a.x - b.x);
    }
    const ut = out.filter(o => o.utama), pd = out.filter(o => !o.utama);
    const res = { analysis: A, concepts, core, utamaTotal: ut.length, pendukungTotal: pd.length, utama: ut.slice(0, opts.limit || 60), pendukung: pd.slice(0, opts.limitP || 40), ms: 0 };
    for (const o of res.utama.concat(res.pendukung)) { const sa = M.sa(o.x); o.s = sa[0]; o.a = sa[1]; o.reasons = reasons(o, concepts); }
    res.ms = Date.now() - t0;
    return res;
  };
  /** alasan ditemukan: per konsep, bukti terkuat (bidang + bentuk kata + sumber). Istilah terkait hanya ditampilkan bila tidak ada bukti lain. */
  function reasons(o, concepts) {
    const out = [];
    concepts.forEach((c, ci) => {
      const s = o.E[ci];
      const order = ['T', 'H', 'R', 'P', 'J', 'C', 'K3', 'K'];
      let fl = order.filter(f => s[f] && s[f].kind !== 'rel');
      const relOnly = !fl.length; if (relOnly) fl = order.filter(f => s[f]);
      if (!fl.length) { if (!c.mod) out.push({ concept: c.label, missing: true }); return; }
      if (c.mod) fl = fl.filter(f => f === 'R' || f === 'J' || f === 'H').slice(0, 1);
      if (!fl.length) return;
      const items = fl.map(f => {
        const v = s[f]; const it = { field: f === 'K3' ? 'K' : f, fieldLabel: FIELD[f === 'K3' ? 'K' : f], form: v.form, kind: v.kind };
        if (f === 'H') { const h = M.heads[v.src]; it.text = h[4]; const a = M.sa(h[1]), b = M.sa(h[2]); it.range = a[0] + ':' + a[1] + (h[2] > h[1] ? '–' + b[1] : ''); }
        if (f === 'T') { const t = M.tema[v.src]; it.text = [t[0], t[1], t[2]].filter(Boolean).join(' › '); }
        if (f === 'K' || f === 'K3') { const k = M.ik[v.src]; it.text = k[3]; it.doc = k[0]; }
        return it;
      });
      out.push({ concept: c.label, mod: !!c.mod, relOnly, items });
    });
    return out;
  }
  Q.reasons = reasons;
  /** teks alasan singkat (kartu & salinan) */
  Q.reasonText = function (o) {
    const kindTxt = { direct: '', syn: ' (sinonim kamus)', rel: ' (istilah terkait — bukan bukti tema)' };
    return o.reasons.map(r => {
      if (r.missing) return '“' + r.concept + '”: tidak ditemukan pada ayat ini';
      return '“' + r.concept + '”' + (r.mod ? ' (pelengkap)' : '') + ': ' + r.items.map(it => it.fieldLabel + (it.text ? ' “' + it.text + '”' + (it.range ? ' (QS ' + it.range + ')' : '') : '') + ' memuat “' + it.form + '”' + kindTxt[it.kind]).join('; ');
    }).join(' · ');
  };
  Q._stemQuery = stemQuery; Q.seqOf = seqOf;
  Q.docOfAyat = x => M ? M.qStart + x : x;
  Q.jalalainDoc = x => M && M.jal ? M.jal[x] : -1;

  if (typeof module !== 'undefined' && module.exports) module.exports = Q;
  root.PRMQ = Q;
})(typeof window !== 'undefined' ? window : globalThis);
