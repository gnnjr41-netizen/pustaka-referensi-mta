#!/usr/bin/env node
/* Uji pencarian nyata terhadap indeks data/kitab + arsip brosur lama (mesin yang sama dengan aplikasi).
   Pemakaian: node tools/validate_search.js [folder-aplikasi]  → menulis laporan JSON ke stdout */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const { P, K } = require('./kitab_node.js')(APP);
// muat arsip brosur lama (CHM + PDF bawaan) seperti di aplikasi
globalThis.PRM_DATA = { shards: {} };
const D = p => vm.runInThisContext(fs.readFileSync(path.join(APP, 'data', p), 'utf8'));
D('chm_docs.js'); D('pdf_seed.js');
const docs = PRM_DATA.docs.map(d => Object.assign({}, d));
const years = Array.from(new Set(docs.map(d => d.shard)));
for (const y of years) { D('chm_' + y + '.js'); }
for (const d of docs) { d.blocks = PRM_DATA.shards[d.shard][d.id] || []; d.idx = P.buildIndex(d.blocks); }
for (const p of PRM_DATA.pdfs) { const d = Object.assign({ id: 'p' + p.file, src: 'PDF' }, p); d.idx = P.buildIndex(d.blocks); docs.push(d); }
const out = { app: APP, tests: [], timing: [] };
const now = () => Number(process.hrtime.bigint() / 1000n) / 1000;
async function ks(q, opts) { const t = now(); const r = await K.search(P.parseQuery(q, {}), opts || {}); r.wall = now() - t; return r; }
async function recs(r, n) { return K.get(r.results.slice(0, n).map(x => x.i)); }
function allowSrc(codes) { const M = K.info(); const rs = M.sources.filter(s => codes.includes(s.code) || codes.includes(s.cat)).map(s => [s.start, s.start + s.count]); return i => rs.some(x => i >= x[0] && i < x[1]); }
function test(no, name, query, pass, detail) { out.tests.push({ no, name, query, status: pass ? 'LULUS' : 'GAGAL', detail }); console.error((pass ? 'LULUS ' : 'GAGAL ') + no + ' ' + name + ' — ' + detail); }
(async () => {
  await K.init(); const M = K.info();
  const Q = M.quranStart;
  // 1 nomor surah & ayat
  { const r1 = await ks('QS 2:183'), r2 = await ks('Al-Baqarah 183'), r3 = await ks('surat al baqoroh ayat 183'), r4 = await ks('Ali Imran 102');
    const a = await recs(r1, 1), b = await recs(r2, 1), c = await recs(r3, 1), d = await recs(r4, 1);
    const g = m => { const x = m.values().next().value; return x ? x.src + ' ' + x.s + ':' + x.a : '-'; };
    test(1, 'Pencarian ayat dengan nomor surah & ayat', 'QS 2:183 | Al-Baqarah 183 | surat al baqoroh ayat 183 | Ali Imran 102', g(a) === 'quran 2:183' && g(b) === 'quran 2:183' && g(c) === 'quran 2:183' && g(d) === 'quran 3:102', [g(a), g(b), g(c), g(d)].join(' · ')); }
  // 2 kalimat terjemahan
  { const r = await ks('diwajibkan atas kamu berpuasa', { allow: allowSrc(['quran']) }); const m = await recs(r, 3); const top = Array.from(m.values()).map(x => x.s + ':' + x.a);
    test(2, 'Pencarian kalimat terjemahan Al-Qur\'an', 'diwajibkan atas kamu berpuasa (filter Al-Qur\'an)', top[0] === '2:183', 'teratas: ' + top.join(', ') + ' dari ' + r.results.length + ' hasil'); }
  // 3 & 4 Arab dengan / tanpa harakat
  { const qa = 'يَا أَيُّهَا الَّذِينَ آمَنُوا كُتِبَ عَلَيْكُمُ الصِّيَامُ', qb = 'يا أيها الذين آمنوا كتب عليكم الصيام';
    const ra = await ks(qa, { allow: allowSrc(['quran']) }), rb = await ks(qb, { allow: allowSrc(['quran']) });
    const ta = Array.from((await recs(ra, 1)).values())[0], tb = Array.from((await recs(rb, 1)).values())[0];
    test(3, 'Pencarian teks Arab dengan harakat', qa, ta && ta.s === 2 && ta.a === 183, 'teratas QS ' + (ta ? ta.s + ':' + ta.a : '-') + ' · ' + ra.results.length + ' hasil');
    test(4, 'Pencarian teks Arab tanpa harakat', qb, tb && tb.s === 2 && tb.a === 183 && ra.results.length === rb.results.length, 'teratas QS ' + (tb ? tb.s + ':' + tb.a : '-') + ' · ' + rb.results.length + ' hasil (sama dengan versi berharakat: ' + (ra.results.length === rb.results.length) + ')');
    const h1 = await ks('إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ'), h2 = await ks('انما الاعمال بالنيات');
    test('3b', 'Arab hadis: berharakat vs tanpa harakat & variasi alif/hamzah', 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ | انما الاعمال بالنيات', h1.results.length === h2.results.length && h1.results[0].i === h2.results[0].i, h1.results.length + ' vs ' + h2.results.length + ' hasil, teratas sama: ' + (h1.results[0].i === h2.results[0].i)); }
  // 5 nomor hadis
  { const cases = [['bukhari 52', 'bukhari', '52'], ['HR. Muslim no 8', 'muslim', '8'], ['abu daud 2859', 'abudaud', '2859'], ['tirmidzi 143', 'tirmidzi', '143'], ['bulughul maram 1268', 'bulughul', '1268']];
    const det = []; let ok = true;
    for (const [q, coll, no] of cases) {
      const r = await ks(q); const m = await recs(r, 6); const arr = Array.from(m.values());
      const good = arr.length && arr.every(x => (x.coll === coll || x.src === coll) && String(x.no).split('-').includes(no));
      ok = ok && good; det.push(q + ' → ' + arr.map(x => K.title(x).replace('Kitab 9 Imam · ', 'K9 ') + ' #' + x.no).join(' | '));
    }
    test(5, 'Pencarian hadis berdasarkan nomor hadis', cases.map(c => c[0]).join(' | '), ok, det.join(' ;; ')); }
  // 6 nama kitab
  { const r = await ks('kitab puasa', { allow: allowSrc(['hadis']) }); const arr = Array.from((await recs(r, 10)).values());
    const n = arr.filter(x => /puasa|shiyam|shaum|siyam/i.test((x.kitab || '') + ' ' + (x.bab || ''))).length;
    const r2 = await ks('Shahih Muslim sabar'); const arr2 = Array.from((await recs(r2, 10)).values());
    test(6, 'Pencarian hadis berdasarkan nama kitab', 'kitab puasa | Shahih Muslim sabar', n >= 8 && arr2.length && arr2.every(x => x.coll === 'muslim'), n + '/10 teratas ber-kitab/bab puasa; "Shahih Muslim sabar" → ' + r2.results.length + ' hasil, semua riwayat Muslim: ' + arr2.every(x => x.coll === 'muslim')); }
  // 7 nama bab
  { const r = await ks('Mimpi orang-orang shalih'); const arr = Array.from((await recs(r, 5)).values());
    const r2 = await ks('"Larangan Buang Hajat di Tengah Jalan"'); const arr2 = Array.from((await recs(r2, 3)).values());
    test(7, 'Pencarian berdasarkan nama bab', 'Mimpi orang-orang shalih | "Larangan Buang Hajat di Tengah Jalan"', arr.some(x => /mimpi orang-orang shalih/i.test(x.bab || '')) && arr2.some(x => /Larangan Buang Hajat di Tengah Jalan/i.test(x.bab || '')),
      arr.slice(0, 3).map(x => K.title(x) + ' · bab ' + x.bab).join(' | ') + ' ;; ' + arr2.slice(0, 2).map(x => K.title(x) + ' · bab ' + x.bab).join(' | ')); }
  // 8 Kitab 9 Imam
  { const r = await ks('niat', { allow: allowSrc(['kitab9']) }); const arr = Array.from((await recs(r, 20)).values());
    const colls = {}; for (const x of r.results) { const c = M.collOf(x.i); colls[c] = (colls[c] || 0) + 1; }
    test(8, 'Pencarian hadis dari Kitab 9 Imam', 'niat (filter Kitab 9 Imam)', arr.length && arr.every(x => x.src === 'kitab9'), r.results.length + ' hasil, per koleksi: ' + JSON.stringify(colls)); }
  // 9 hadis di beberapa koleksi
  { const r = await ks('إنما الأعمال بالنيات'); const arr = Array.from((await recs(r, 30)).values());
    const colls = new Set(arr.map(x => x.coll || x.src)); const b1 = arr.find(x => x.src === 'bukhari' && x.no === '1') || arr.find(x => x.coll === 'bukhari');
    test(9, 'Hadis yang muncul pada beberapa koleksi', 'إنما الأعمال بالنيات', colls.size >= 5 && b1 && (b1.dup || []).length >= 1,
      '30 teratas dari ' + colls.size + ' koleksi: ' + Array.from(colls).join(', ') + ' ;; ' + (b1 ? K.title(b1) + ' #' + b1.no + ' identik dengan: ' + (b1.dup || []).map(d => d[1]).join(', ') + ' ;; matan serupa: ' + (b1.sim || []).slice(0, 5).map(d => d[2] + ' ' + d[1] + '%').join(', ') : '')); }
  // 10 referensi lama
  { const pq = P.parseQuery('tawakkal', {}); const t = now(); const r = P.search(docs, pq, {}); const ms = now() - t;
    const pq2 = P.parseQuery('dzikir', {}); const r2 = P.search(docs, pq2, { filter: d => d.src === 'PDF' });
    const pq3 = P.parseQuery('Al-Baqarah 183', {}); const r3 = P.search(docs, pq3, {});
    test(10, 'Pencarian referensi lama (arsip CHM & PDF)', 'tawakkal | dzikir (PDF) | Al-Baqarah 183', r.results.length > 0 && r2.results.length > 0 && r3.results.length > 0,
      'CHM+PDF "tawakkal": ' + r.results.length + ' dokumen (' + ms.toFixed(0) + ' ms); PDF "dzikir": ' + r2.results.length + '; brosur yang mengutip QS 2:183: ' + r3.results.length + ' (dari ' + docs.length + ' dokumen lama)'); }
  // 11 kombinasi filter + kata
  { const r1 = await ks('air', { allow: allowSrc(['bulughul']) }); const a1 = r1.results.every(x => K.srcOf(x.i).code === 'bulughul');
    const r2 = await ks('wudhu', { coll: 'tirmidzi' }); const a2 = r2.results.every(x => M.collOf(x.i) === 'tirmidzi');
    const r3 = await ks('sabar', { allow: allowSrc(['quran']) }); const a3 = r3.results.every(x => K.srcOf(x.i).cat === 'quran');
    const r4 = await ks('sabar -shalat', { allow: allowSrc(['hadis']) }); const a4 = r4.results.length > 0;
    test(11, 'Kombinasi filter dan pencarian', 'air+Bulughul | wudhu+riwayat Tirmidzi | sabar+Al-Qur\'an | sabar -shalat+Hadis', a1 && a2 && a3 && a4 && r1.results.length && r2.results.length && r3.results.length,
      `Bulughul ${r1.results.length} (semua Bulughul: ${a1}); Tirmidzi ${r2.results.length} (semua Tirmidzi: ${a2}); Al-Qur'an ${r3.results.length} (semua ayat/tema: ${a3}); sabar -shalat ${r4.results.length}`); }
  // 12 kecepatan
  { const qs = ['sabar', 'shalat berjamaah', 'puasa ramadhan', 'zakat fitrah', 'berbakti kepada orang tua', 'الصلاة', 'بسم الله الرحمن الرحيم', '"amal yang paling dicintai"', 'riba', 'QS 112:1', 'nikah', 'menuntut ilmu', 'muslim 1', 'لا حول ولا قوة', 'akhlak mulia', 'jenazah', 'haid', 'sedekah', 'dzikir pagi', 'taubat'];
    const cold = [], warm = [];
    for (const q of qs) { const r = await ks(q); await recs(r, 20); cold.push(r.wall); }
    for (const q of qs) { const r = await ks(q); warm.push(r.wall); }
    const avg = a => a.reduce((x, y) => x + y, 0) / a.length; const mx = a => Math.max.apply(null, a);
    out.timing = qs.map((q, k) => ({ q, coldMs: Math.round(cold[k]), warmMs: Math.round(warm[k]) }));
    test(12, 'Kecepatan pencarian (semua sumber)', qs.length + ' kueri', avg(warm) < 300, `pertama kali (termasuk membaca file indeks dari disk): rata-rata ${avg(cold).toFixed(0)} ms, maks ${mx(cold).toFixed(0)} ms; ulang (cache): rata-rata ${avg(warm).toFixed(0)} ms, maks ${mx(warm).toFixed(0)} ms`); }
  // ===== Transliterasi Latin → ayat (fitur baru) =====
  const quranOnly = allowSrc(['quran']);
  async function tl(q) { const r = await ks(q, { allow: quranOnly }); const top = r.results.filter(x => x.tl || K.srcOf(x.i).code === 'quran').slice(0, 6); const m = await K.get(top.map(x => x.i)); return { r, top: top.map(x => ({ x, rec: m.get(x.i) })) }; }
  const lab = o => o.top.map(t => 'QS ' + t.rec.s + ':' + t.rec.a + (t.x.tl ? ' (' + t.x.tl.pct + '%)' : ' (teks)')).join(', ');
  const wajib = ['bismillahirrahmanirrahim', 'bismillahir rahmanir rahim', 'bismillahirrahmannirrahim', 'bismillah', 'بِسْمِ اللهِ الرَّحْمَنِ الرَّحِيْمِ', 'بسم الله الرحمن الرحيم', 'bismillaahirrahmaanirrahiim', 'bismillahir rohmanir rohim', 'BISMILLAHIR-RAHMANIR-RAHIM!'];
  let n = 0;
  for (const q of wajib) {
    n++; const o = await tl(q); const ids = o.top.map(t => t.rec.s + ':' + t.rec.a);
    const first = ids[0] === '1:1', has2730 = ids.includes('27:30'), no21 = !o.top.some(t => t.rec.s === 2 && t.rec.a === 1 && t.x.tl);
    const t0 = o.top[0];
    test('T' + n, 'Transliterasi/Arab basmalah: ' + q, q, first && has2730 && no21 && t0.rec.arT && t0.rec.img,
      'urutan: ' + lab(o) + ' · teks Arab QS 1:1: ' + (t0.rec.arT || '-') + ' [' + (t0.rec.arTname || '') + '] · gambar ' + t0.rec.img + ' · terjemahan: ' + (t0.rec.tr || '').slice(0, 70) + ' · 2:1 tidak ikut: ' + no21);
  }
  const lain = [
    ['alhamdulillahi rabbil alamin', '1:2'], ['iyyaka na\'budu wa iyyaka nasta\'in', '1:5'], ['ihdinash shirathal mustaqim', '1:6'],
    ['allahu la ilaha illa huwal hayyul qayyum', '2:255'], ['ayat kursi allahu la ilaha illa huwal hayyul qayyum', '2:255'],
    ['inna lillahi wa inna ilaihi raji\'un', '2:156'], ['rabbana atina fid dunya hasanah wa fil akhirati hasanah wa qina adzaban nar', '2:201'],
    ['subhanalladzi asra bi\'abdihi lailan', '17:1'], ['alladzina yu\'minuna bil ghaibi', '2:3'], ['inna ma\'al usri yusra', '94:6'],
    ['wa ma khalaqtul jinna wal insa illa liya\'budun', '51:56'], ['ya ayyuhalladzina amanu kutiba alaikumush shiyam', '2:183']];
  for (const [q, exp] of lain) {
    n++; const o = await tl(q); const ids = o.top.filter(t => t.x.tl).map(t => t.rec.s + ':' + t.rec.a);
    test('T' + n, 'Transliterasi ayat lain', q, ids.slice(0, 3).includes(exp), 'diharapkan ' + exp + ' · hasil: ' + lab(o) + ' · kerangka ' + (o.r.tl && o.r.tl.q));
  }
  { n++; const o = await tl('qul huwallahu ahad'); test('T' + n, 'Ayat tanpa teks Arab di sumber (hanya gambar) — tidak boleh dikarang', 'qul huwallahu ahad', !o.top.some(t => t.x.tl && t.rec.s === 112), 'QS 112 hanya punya gambar di Al-Qur\'an Digital & tidak ada teks Arabnya di Ibnu Katsir/Jalalain → tidak dicocokkan secara transliterasi (hasil teks: ' + lab(o) + ')'); }
  { n++; const det = []; let ok = true;
    for (const q of ['sabar', 'puasa ramadhan', 'keutamaan shalat berjamaah', 'diwajibkan atas kamu berpuasa', 'berbakti kepada orang tua']) { const r = await ks(q); const c = r.tl ? r.tl.n : 0; det.push(q + ': ' + c); if (c > 3) ok = false; }
    test('T' + n, 'Kueri bahasa Indonesia tidak dibanjiri hasil transliterasi palsu', 'sabar | puasa ramadhan | …', ok, 'jumlah ayat hasil transliterasi: ' + det.join('; ')); }
  process.stdout.write(JSON.stringify(out, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
