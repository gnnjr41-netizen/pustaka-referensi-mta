/* Uji pencarian gabungan v3.2 (makna lokal + makna/tema + kata).
   Pakai: node tools/validate_hybrid.js <folder-aplikasi> [keluaran.json]
   Memeriksa: (1) checksum semua file indeks vektor = meta, (2) kueri wajib menemukan rujukan yang sudah dicek manual,
   (3) aturan tingkat bukti tidak dilanggar, (4) mode Literal = urutan mesin kata V3.1. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const APP = path.resolve(process.argv[2] || '.'); const OUT = process.argv[3] || path.join(APP, 'tools', 'validate_hybrid.json');
process.argv.splice(2, process.argv.length - 2, APP);
const run = require(path.join(APP, 'tools/semantik/hybrid_run.js'));
const H = globalThis.PRMH, V = globalThis.PRMV, K = globalThis.PRMK, P = globalThis.PRM;
const tests = []; const add = (no, name, ok, detail) => { tests.push({ no, name, status: ok ? 'LULUS' : 'GAGAL', detail }); console.log((ok ? 'LULUS ' : 'GAGAL ') + no + ' ' + name + ' — ' + String(detail).slice(0, 300)); };
(async () => {
  // 1. checksum indeks
  const dir = path.join(APP, 'data/kitab/vektor'); const metaSrc = fs.readFileSync(path.join(dir, 'meta.js'), 'utf8');
  const meta = JSON.parse(metaSrc.slice(metaSrc.indexOf('(') + 1, metaSrc.lastIndexOf(');')));
  let n = 0, bad = [];
  for (const [kind, sub] of [['d', 'd'], ['k', 'k'], ['a', 'a']]) for (const [name, info] of Object.entries(meta[kind])) {
    const buf = fs.readFileSync(path.join(dir, sub, name + '.js')); n++;
    if (crypto.createHash('sha256').update(buf).digest('hex') !== info.sha256 || buf.length !== info.bytes) bad.push(sub + '/' + name);
  }
  add(1, 'Checksum indeks makna lokal', !bad.length, n + ' file dicek' + (bad.length ? '; rusak: ' + bad.join(', ') : '; semua cocok (versi ' + meta.ver + ')'));
  // 2. kueri wajib (rujukan dicek manual terhadap teks database)
  const top = (o, cat, k) => o.cats[cat].slice(0, k || 8);
  const hasQS = (o, refs, k) => { const t = top(o, 'quran', k).map(e => e.ref); return refs.filter(r => t.includes('QS ' + r)); };
  const QT = [
    [2, 'Ayat tentang mengikuti syariat Allah', ['45:18', '5:48'], 2],
    [3, 'Ayat tentang larangan mengikuti hawa nafsu', ['38:26', '28:50', '5:49'], 3],
    [4, 'Ayat tentang sabar menghadapi ujian hidup', ['2:153', '2:155', '3:186'], 3],
    [5, 'Ayat tentang berbakti kepada orang tua', ['17:23', '31:14', '46:15', '2:83'], 3],
    [6, 'Ayat tentang larangan berbuat curang', ['83:1', '83:3', '55:9', '11:85'], 3],
    [7, 'Dalil tentang kejujuran berdagang', ['83:1', '6:152', '2:282'], 2]
  ];
  const outs = {};
  for (const [no, q, refs, need] of QT) { const o = await run(q, { n: 10 }); outs[q] = o; const h = hasQS(o, refs); add(no, q + ' (Al-Qur\'an, 8 teratas)', h.length >= need, 'ditemukan ' + h.join(', ') + ' dari ' + refs.join(', ') + ' (minimal ' + need + ')'); }
  const HT = [
    [8, 'Hadis tentang amanah', /amanah|amanat/i, 5],
    [9, 'Hadis tentang sabar menghadapi musibah', /sabar|musibah/i, 6],
    [10, 'Dalil tentang kewajiban suami istri', /suami|istri|isteri|nikah/i, 5]
  ];
  for (const [no, q, re, need] of HT) { const o = await run(q, { n: 10 }); outs[q] = o; const t = top(o, 'hadis'); const k = t.filter(e => re.test(e.text)).length; add(no, q + ' (hadis, 8 teratas)', k >= need, k + '/8 memuat kata kunci di bab/matan; contoh: ' + t.slice(0, 3).map(e => e.ref).join(' | ')); }
  { const o = outs['Dalil tentang kejujuran berdagang']; const t = top(o, 'hadis', 6); add(11, 'Kejujuran berdagang → bab "Kejujuran dan Kejelasan dalam Jual Beli" (hadis, 6 teratas)', t.some(e => /Kejujuran dan Kejelasan dalam Jual Beli/i.test(e.text)), t.map(e => e.ref).join(' | ')); }
  // 3. aturan tingkat bukti
  let viol = [];
  for (const [q, o] of Object.entries(outs)) for (const cat of ['hadis', 'tafsir', 'materi']) for (const e of o.cats[cat]) { const core = e.ev.filter(z => !z.mod); if (e.tier === 'utama' && (!core.length || core.some(z => z.st !== 'direct'))) viol.push(q + ' → ' + e.ref); }
  add(12, 'Utama (hadis/tafsir/materi) hanya bila semua kata kunci inti tertulis di sumber', !viol.length, viol.length ? viol.slice(0, 5).join('; ') : 'tidak ada pelanggaran pada ' + Object.keys(outs).length + ' kueri');
  // 4. mode Literal = urutan mesin kata V3.1
  await K.init(); const q = 'sabar menghadapi musibah'; const lit = await K.search(P.parseQuery(q, {}), {});
  const an = H.analyze(q);
  const L = await H.kitab({ cat: 'hadis', lit: lit.results, mk: null, sem: null, related: [], an, mode: 'literal', get: ids => K.get(ids), limit: 20 });
  const expect = lit.results.filter(x => K.srcOf(x.i).cat === 'hadis').slice(0, 20).map(x => x.i);
  const got = L.map(e => e.i).slice(0, 20);
  const same = got.length && got.filter(i => expect.includes(i)).length === got.length;
  add(13, 'Mode Literal memakai hanya hasil kata persis V3.1', same, 'tingkat diurutkan per bukti; ' + got.length + ' hasil semuanya berasal dari mesin kata V3.1');
  // 5. kueri Arab memakai padanan dwibahasa
  const s = await V.search('الصبر على المصيبة', { cats: ['quran'] });
  add(14, 'Kueri Arab → padanan kata Indonesia (makna lokal)', s.q.used.some(u => u.via), 'kata dipakai: ' + s.q.used.map(u => u.w + (u.via ? '←' + u.via : '')).join(', '));
  const pass = tests.filter(t => t.status === 'LULUS').length;
  console.log('\nRingkasan: ' + pass + '/' + tests.length + ' lulus');
  fs.writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(), indexVer: meta.ver, pass, total: tests.length, tests }, null, 1));
  process.exit(pass === tests.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
