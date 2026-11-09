/* Uji pencarian makna Al-Qur'an. Pakai: node tools/validate_makna.js <folder-aplikasi> [keluaran.json] */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = path.resolve(process.argv[2] || '.'); const OUT = process.argv[3] || path.join(APP, 'tools', 'validate_makna.json');
const { P, K } = require(path.join(APP, 'tools/kitab_node.js'))(APP);
vm.runInThisContext(fs.readFileSync(path.join(APP, 'data/kamus_support.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(APP, 'data/lib/support.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(APP, 'data/lib/makna.js'), 'utf8'));
const Q = globalThis.PRMQ; Q.loader = async f => { vm.runInThisContext(fs.readFileSync(path.join(APP, 'data/kitab/makna', f), 'utf8')); };
const tests = []; const add = (no, name, query, ok, detail) => { tests.push({ no, name, query, status: ok ? 'LULUS' : 'GAGAL', detail }); console.log((ok ? 'LULUS ' : 'GAGAL ') + no + ' ' + name + ' — ' + detail.slice(0, 400)); };
const sa = o => o.s + ':' + o.a;
// teks sumber yang diklaim untuk satu bukti
async function fieldText(o, it) {
  const M = Q.meta; const qr = await K.getOne(Q.docOfAyat(o.x));
  const noF = s => (s || '').replace(/\[\d+\]/g, ' ');
  if (it.field === 'R') return noF(qr.tr).replace(/\([^()]*\)/g, ' ');
  if (it.field === 'P') return (noF(qr.tr).match(/\(([^()]*)\)/g) || []).join(' ');
  if (it.field === 'C') return qr.catatan || '';
  if (it.field === 'J') { const j = M.jal[o.x]; return j >= 0 ? (await K.getOne(j)).tr : ''; }
  if (it.field === 'H') return it.text;
  if (it.field === 'T') return it.text;
  if (it.field === 'K') { const r = await K.getOne(it.doc); return (r.blocks || []).filter(b => b[0] !== 'a').map(b => b[1]).join(' '); }
  return '';
}
async function verify(o) { // setiap bukti (bukan istilah terkait) benar-benar tertulis di sumbernya
  let n = 0, ok = 0; const bad = [];
  for (const r of o.reasons) for (const it of r.items || []) {
    if (it.kind === 'rel') continue; n++;
    const words = Q.seqOf(it.form); const sm = await Q._stemQuery(words);
    const toks = new Set(Q.toks(await fieldText(o, it)));
    const tokArr = Array.from(toks);
    const cn = c => (P.VARMAP.get(c) || [c])[0];
    const has = w => { const st = sm.get(w) || w; return toks.has(w) || toks.has(st) || tokArr.some(t => { const c = Q.cands(t).map(cn); return c.includes(st) || c.includes(w); }); };
    if (words.every(has)) ok++; else bad.push(sa(o) + ' ' + it.field + ' “' + it.form + '”');
  }
  return { n, ok, bad };
}
function classOK(o, res) { // utama: tiap konsep inti punya bukti non-terkait di bidang ayat/tema; pendukung: ada konsep inti tanpa bukti itu
  const own = ['R', 'P', 'J', 'C', 'T', 'H', 'K3'];
  const full = res.core.every(ci => own.some(f => o.E[ci][f] && o.E[ci][f].kind !== 'rel'));
  return o.utama ? full : true;
}
const QUESTIONS = [
  ['M1', 'Ayat tentang kesabaran ketika mendapatkan musibah.', ['2:155', '2:156', '11:11', '3:186', '22:35', '64:11'], 3],
  ['M2', 'Ayat tentang berbuat baik kepada kedua orang tua.', ['17:23', '31:14', '46:15', '4:36', '2:83', '6:151', '29:8'], 5],
  ['M3', 'Ayat tentang menjaga keharmonisan rumah tangga.', ['30:21', '4:128'], 2],
  ['M4', 'Ayat tentang orang beriman yang selalu mengingat Allah.', ['13:28', '33:41', '63:9', '3:191', '8:45', '33:35'], 4],
  ['M5', 'Ayat tentang rezeki yang diberikan Allah.', ['29:60', '29:62', '30:40', '65:3', '39:52'], 3],
  ['M6', 'Ayat tentang larangan berbuat curang dalam perdagangan.', ['83:1', '83:3', '11:84', '11:85', '7:85', '6:152'], 4],
  ['M7', 'Ayat tentang kewajiban menjaga amanah.', ['4:58', '8:27', '23:8', '70:32', '2:283', '33:72'], 5]
];
(async () => {
  await K.init(); await Q.init();
  const examples = []; const times = [];
  for (const [no, q, expect, need] of QUESTIONS) {
    const t0 = Date.now(); const r = await Q.search(q, { limit: 60, limitP: 40 }); times.push(Date.now() - t0);
    const top = r.utama.slice(0, 15).map(sa);
    const hit = expect.filter(e => r.utama.map(sa).includes(e));
    let vn = 0, vok = 0, bad = []; for (const o of r.utama.concat(r.pendukung.slice(0, 10))) { const v = await verify(o); vn += v.n; vok += v.ok; bad.push(...v.bad); }
    const overlap = r.utama.filter(o => r.pendukung.some(p => p.x === o.x)).length;
    const clsBad = r.utama.filter(o => !classOK(o, r)).map(sa);
    const relUtama = r.utama.filter(o => r.core.some(ci => { const s = o.E[ci]; const strong = ['R', 'P', 'J', 'C', 'T', 'H', 'K3'].some(f => s[f] && s[f].kind !== 'rel'); return !strong; })).map(sa);
    const ok = r.utamaTotal > 0 && hit.length >= need && vok === vn && !overlap && !clsBad.length && !relUtama.length;
    add(no, 'Pertanyaan: ' + q, q, ok, `konsep: ${r.concepts.map(c => c.label + (c.mod ? ' (pelengkap)' : '')).join(' + ')} · diabaikan: ${r.analysis.removed.join(', ')} · utama ${r.utamaTotal} / pendukung ${r.pendukungTotal} · ayat rujukan ditemukan sebagai Utama: ${hit.length}/${expect.length} (${hit.join(', ')}; minimal ${need}) · bukti tertelusur ke teks sumber: ${vok}/${vn}${bad.length ? ' GAGAL: ' + bad.slice(0, 5).join(' | ') : ''} · utama∩pendukung: ${overlap} · utama yang hanya didukung istilah terkait: ${relUtama.length} · 15 utama teratas: ${top.join(', ')} · ${r.ms} ms`);
    const recs = await K.get(r.utama.slice(0, 10).concat(r.pendukung.slice(0, 5)).map(o => Q.docOfAyat(o.x)));
    examples.push({ q, concepts: r.concepts.map(c => ({ label: c.label, pelengkap: !!c.mod, kamus: !!c.entry })), removed: r.analysis.removed, utamaTotal: r.utamaTotal, pendukungTotal: r.pendukungTotal,
      utama: r.utama.slice(0, 10).map(o => ({ ayat: sa(o), surah: recs.get(Q.docOfAyat(o.x)).surah, label: Q.LABEL[o.type], tr: recs.get(Q.docOfAyat(o.x)).tr.replace(/\[\d+\]/g, ''), alasan: Q.reasonText(o) })),
      pendukung: r.pendukung.slice(0, 5).map(o => ({ ayat: sa(o), label: Q.LABEL[o.type], tr: recs.get(Q.docOfAyat(o.x)).tr.replace(/\[\d+\]/g, '').slice(0, 200), alasan: Q.reasonText(o) })) });
  }
  // M8 frasa terjemahan → ayat yang tepat di urutan atas (makna tidak menggeser hasil persis)
  { const r = await Q.search('diwajibkan atas kamu berpuasa'); const i = r.utama.findIndex(o => sa(o) === '2:183'); add('M8', 'Frasa terjemahan persis tetap di atas', 'diwajibkan atas kamu berpuasa', i >= 0 && i < 3, `QS 2:183 di urutan ${i + 1} dari ${r.utamaTotal} utama`); }
  // M9 kata tunggal
  { const r = await Q.search('sabar'); let vn = 0, vok = 0; for (const o of r.utama) { const v = await verify(o); vn += v.n; vok += v.ok; } add('M9', 'Satu kata kunci (“sabar”)', 'sabar', r.utamaTotal >= 20 && vok === vn, `utama ${r.utamaTotal}, bukti tertelusur ${vok}/${vn}, teratas: ${r.utama.slice(0, 8).map(sa).join(', ')}`); }
  // M10 kata tidak dikenal → tidak mengarang, kembali ke literal
  { const r = await Q.search('ayat tentang qwertyzxv'); add('M10', 'Kata tidak dikenal → tidak ada hasil makna (aplikasi memakai pencarian literal)', 'ayat tentang qwertyzxv', r.utamaTotal === 0 && r.pendukungTotal === 0, `utama ${r.utamaTotal}, pendukung ${r.pendukungTotal}`); }
  // M11 hanya kata pengantar
  { const r = await Q.search('tolong carikan ayat tentang'); add('M11', 'Hanya kata pengantar → kosong', 'tolong carikan ayat tentang', !!r.empty, r.empty ? 'tidak ada kata kunci; tidak ada hasil dikarang' : 'ada hasil'); }
  // M12 istilah terkait tidak pernah menjadi utama: "cobaan" terkait musibah, tetapi sinonim "ujian"
  { const r = await Q.search('ayat tentang musibah'); const relU = r.utama.filter(o => { const s = o.E[r.core[0]]; return !['R', 'P', 'J', 'C', 'T', 'H', 'K3'].some(f => s[f] && s[f].kind !== 'rel'); }); add('M12', 'Istilah terkait (cobaan, ujian, menimpa) tidak dijadikan bukti Utama', 'ayat tentang musibah', !relU.length && r.utamaTotal > 0, `utama ${r.utamaTotal}; yang hanya lewat istilah terkait: ${relU.length}; pendukung lewat istilah terkait: ${r.pendukung.filter(o => o.type === 'terkait').length}`); }
  // M13 kecepatan
  { const ts = []; for (const [, q] of QUESTIONS) { const t0 = Date.now(); await Q.search(q); ts.push(Date.now() - t0); } add('M13', 'Kecepatan (indeks sudah termuat)', '7 pertanyaan', Math.max(...ts) < 1500, `pertama kali: ${times.join('/')} ms · ulang: ${ts.join('/')} ms (Node)`); }
  const st = Q.meta.stat;
  const res = { tests, coverage: st, noJal: Q.meta.noJal, examples };
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  console.log('\n' + tests.filter(t => t.status === 'LULUS').length + '/' + tests.length + ' lulus → ' + OUT);
})();
