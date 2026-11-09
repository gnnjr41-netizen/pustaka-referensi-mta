#!/usr/bin/env node
/* Uji Mode Support Ustadz (data/lib/support.js) dengan data nyata: arsip brosur CHM/PDF + indeks kitab + materi Gurda.
   Pemakaian: node tools/validate_support.js [folder-aplikasi] > hasil.json  (ringkasan ke stderr) */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const { P, K } = require('./kitab_node.js')(APP);
vm.runInThisContext(fs.readFileSync(path.join(APP, 'data/kamus_support.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(APP, 'data/lib/support.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(APP, 'data/lib/makna.js'), 'utf8'));
const MQ = globalThis.PRMQ; MQ.loader = async f => { const fp = path.join(APP, 'data/kitab/makna', f); if (!fs.existsSync(fp)) throw new Error('tidak ada ' + f); vm.runInThisContext(fs.readFileSync(fp, 'utf8')); };
const S = globalThis.PRMS;
globalThis.PRM_DATA = { shards: {} };
const D = p => vm.runInThisContext(fs.readFileSync(path.join(APP, 'data', p), 'utf8'));
D('chm_docs.js'); D('pdf_seed.js');
const docs = PRM_DATA.docs.map(d => Object.assign({}, d));
for (const y of new Set(docs.map(d => d.shard))) D('chm_' + y + '.js');
for (const d of docs) { d.blocks = PRM_DATA.shards[d.shard][d.id] || []; d.idx = P.buildIndex(d.blocks); }
for (const p of PRM_DATA.pdfs) { const d = Object.assign({ id: 'p' + p.file, src: 'PDF' }, p); d.idx = P.buildIndex(d.blocks); docs.push(d); }
const byId = new Map(docs.map(d => [d.id, d]));
const out = { tests: [], examples: [] };
function test(no, name, query, pass, detail) { out.tests.push({ no, name, query, status: pass ? 'LULUS' : 'GAGAL', detail }); console.error((pass ? 'LULUS ' : 'GAGAL ') + no + ' ' + name + ' — ' + detail); }
const N = s => P.norm(String(s || ''));
// kata utuh atau berimbuhan Indonesia di depan (ber-, di-, me-, ter-, se-, ke-, pe-…), batas kata = awal/spasi/baris baru
const AFX = '(?:ber|be|di|me|mem|men|meng|meny|ter|se|ke|pe|per|pen|pem|peng)?';
const reCache = new Map();
const has = (hay, v) => { let re = reCache.get(v); if (!re) { re = new RegExp('(?:^|[\\s])' + AFX + v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); reCache.set(v, re); } return re.test(hay); };
async function recText(i) { const r = await K.getOne(i); return N([r.title, r.bab, r.kitab, r.babAr, r.label, r.tema, r.sub, (r.topik || []).join(' '), r.ar, r.arT, r.tr, r.catatan, r.intro, (r.blocks || []).map(b => b[1]).join(' ')].filter(Boolean).join(' ')); }
// verifikasi: setiap Utama memuat SEMUA konsep inti (salah satu variannya); setiap kutipan ada utuh di sumber
async function audit(pk) {
  const A = pk.analysis; const core = A.concepts.filter(c => !c.mod); const cs = core.length ? core : A.concepts;
  let nU = 0, okU = 0; const bad = [];
  const checkText = (t, label) => { nU++; const ok = cs.every(c => c.main.some(v => has(t, v))) || (pk.analysis.phrase && t.includes(pk.analysis.phrase)); if (ok) okU++; else bad.push(label); };
  for (const x of pk.kitab.filter(z => z.level === 'utama').slice(0, 25)) { if (x.ref || x.tl) { nU++; okU++; continue; } checkText(await recText(x.i), 'kitab#' + x.i); }
  for (const b of pk.brosur.filter(z => z.level === 'utama').slice(0, 25)) { if (b.res.refHits && b.res.refHits.length) { nU++; okU++; continue; } checkText(b.doc.idx.s, b.doc.title); }
  // kutipan urutan/penjelasan/penutup harus ada di sumber
  let nQ = 0, okQ = 0; const badQ = [];
  for (const u of pk.urutan) for (const z of (u.isi || [])) if (z && z.text != null) {
    nQ++; let src = '';
    if (z.src.type === 'kitab') { const r = await K.getOne(z.src.i); src = (r.blocks ? r.blocks.map(b => b[1]).join('\n') : [r.ar, r.tr].join('\n')); }
    else { const d = byId.get(z.src.id); src = (d.blocks || []).map(b => b[1]).join('\n'); }
    if (src.includes(z.text)) okQ++; else badQ.push(z.src.label);
  }
  // judul kerangka berasal dari judul/bab sumber
  let nH = 0, okH = 0;
  for (const h of pk.kerangka.pokok.concat(pk.kerangka.subtema)) {
    nH++; let found = false;
    for (const s of h.srcs) {
      let t = '';
      if (s.type === 'kitab') { const r = await K.getOne(s.i); t = N([r.title, r.bab, (r.blocks || []).filter(b => b[0] === 'h').map(b => b[1]).join(' ')].join(' ')); }
      else { const d = byId.get(s.id); t = N([d.title, (d.blocks || []).filter(b => b[0] === 'h').map(b => b[1]).join(' ')].join(' ')); }
      if (t.includes(h.key)) { found = true; break; }
    }
    if (found) okH++;
  }
  return { nU, okU, bad, nQ, okQ, badQ, nH, okH };
}
function sumLine(pk) { const c = pk.counts; const f = v => v.utama + '/' + v.total; return `Qur'an ${f(c.quran)} · Hadis ${f(c.hadis)} · Tafsir ${f(c.tafsir)} · Materi ${f(c.materi)} · CHM ${f(c.chm)} · PDF ${f(c.pdf)}`; }
async function titles(pk, cat, n) { const r = []; for (const x of pk[cat].slice(0, n)) { const rec = await K.getOne(x.i); r.push(K.title(rec).replace('Pelatihan Gurda 2142 · ', '') + (rec.src === 'quran' ? '' : rec.no ? ' #' + rec.no : '') + ' [' + (x.level === 'utama' ? 'U' : 'P') + ']'); } return r; }
(async () => {
  await K.init();
  const cases = [
    ['Carikan materi tentang tayamum.', 'Materi 2 TAYAMMUM', ['carikan', 'materi', 'tentang']],
    ['Apa saja hal yang membatalkan wudlu?', 'Materi 1 HAL HAL YANG MEMBATHALKAN WUDLU', ['apa', 'saja']],
    ['Saya ingin menyiapkan kajian mengenai najis dan cara mensucikannya.', 'Materi 3 PENGERTIAN NAJIS DAN CARA MENSUCIKANNYA', ['saya', 'ingin', 'menyiapkan', 'kajian', 'mengenai']],
    ['Buatkan bahan tentang shalat sunnah tasbih.', 'Materi 10 SHALAT SUNNAH TASBIH', ['buatkan', 'bahan', 'tentang']],
    ['Carikan pembahasan tentang aqiqah.', "Materi 11 'AQIQAH", ['carikan', 'pembahasan', 'tentang']],
    ['Saya perlu referensi mengenai ziarah kubur.', 'Materi 13 ANJURAN ZIYARAH QUBUR', ['saya', 'perlu', 'referensi', 'mengenai']],
    ['Tolong cari materi haid, istihadhah dan nifas.', 'Materi 4 HAIDL, ISTIHADLAH DAN NIFAS', ['tolong', 'cari', 'materi']],
  ];
  let n = 0;
  for (const [q, expect, fill] of cases) {
    n++; const t0 = Date.now(); const pk = await S.run(q, { docs }); const ms = Date.now() - t0;
    const removed = pk.analysis.removed.map(w => N(w));
    const fillOk = fill.every(w => removed.includes(N(w)));
    const mat = []; for (const x of pk.materi.slice(0, 3)) mat.push((await K.getOne(x.i)).title + (x.level === 'utama' ? ' [U]' : ' [P]'));
    const firstMat = pk.materi[0] ? (await K.getOne(pk.materi[0].i)).title : '-';
    const total = Object.values(pk.counts).reduce((a, v) => a + v.total, 0);
    const au = await audit(pk);
    const pass = fillOk && total > 0 && firstMat === expect && pk.materi[0].level === 'utama' && au.okU === au.nU && au.okQ === au.nQ && au.okH === au.nH;
    test('S' + n, 'Permintaan: ' + q, q, pass, `kata pengantar dibuang: ${pk.analysis.removed.join(', ')} · konsep: ${pk.analysis.concepts.map(c => c.label).join(' + ')} · ${sumLine(pk)} · materi teratas: ${mat.join(' ; ')} · kerangka: ${pk.kerangka.pokok.map(h => h.text).join(' | ')} · Utama memuat semua kata inti: ${au.okU}/${au.nU} · kutipan cocok sumber: ${au.okQ}/${au.nQ} · judul kerangka dari sumber: ${au.okH}/${au.nH} · ${ms} ms`);
    out.examples.push({ q, tema: pk.tema, removed: pk.analysis.removed, konsep: pk.analysis.concepts.map(c => ({ label: c.label, kamus: !!c.entry, sinonim: c.main.slice(0, 8), terkait: c.related })), counts: pk.counts, kerangka: pk.kerangka.pokok.map(h => ({ text: h.text, sumber: h.srcs.slice(0, 3).map(s => s.label) })), subtema: pk.kerangka.subtema.map(h => h.text),
      quran: await titles(pk, 'quran', 5), hadis: await titles(pk, 'hadis', 6), tafsir: await titles(pk, 'tafsir', 3), materi: await titles(pk, 'materi', 3), chm: pk.chm.slice(0, 4).map(b => b.doc.title + ' (' + (b.doc.date || '') + ') [' + (b.level === 'utama' ? 'U' : 'P') + ']'),
      urutan: pk.urutan.map(u => ({ no: u.no, judul: u.judul, isi: (u.isi || []).filter(z => z && z.text).map(z => ({ kutipan: z.text.slice(0, 220), sumber: z.src.label })), kosong: !((u.isi && u.isi.length) || (u.cited && u.cited.length) || (u.poin && u.poin.length)) ? u.kosong : null })), ms });
  }
  // kalimat panjang dengan banyak kata pengantar
  { const q = 'Assalamualaikum, mohon bantuannya ya, saya ingin menyiapkan bahan ceramah kultum untuk acara pengajian besok tentang tayamum, tolong carikan referensinya'; const pk = await S.run(q, { docs });
    const lab = pk.analysis.concepts.map(c => c.label); const m0 = pk.materi[0] ? (await K.getOne(pk.materi[0].i)).title : '-';
    test('S8', 'Kalimat panjang penuh kata pengantar', q, lab.length === 1 && N(lab[0]) === 'tayamum' && m0 === 'Materi 2 TAYAMMUM', `konsep tersisa: ${lab.join(' + ')} · dibuang ${pk.analysis.removed.length} kata · ${sumLine(pk)} · materi teratas: ${m0}`); }
  { const q = 'Tolong carikan referensi tentang keutamaan istri taat kepada suami.'; const pk = await S.run(q, { docs }); const au = await audit(pk); const top = pk.chm.slice(0, 3).map(b => b.doc.title);
    test('S9', 'Kalimat panjang + kata pelengkap ("keutamaan")', q, pk.counts.chm.utama > 0 && pk.counts.hadis.utama > 0 && au.okU === au.nU && pk.analysis.concepts.some(c => c.mod), `konsep: ${pk.analysis.concepts.map(c => c.label + (c.mod ? ' (pelengkap)' : '')).join(' + ')} · ${sumLine(pk)} · brosur teratas: ${top.join(' ; ')} · Utama memuat kata inti: ${au.okU}/${au.nU}`);
    out.examples.push({ q, tema: pk.tema, counts: pk.counts, kerangka: pk.kerangka.pokok.map(h => h.text), chm: top, hadis: await titles(pk, 'hadis', 5) }); }
  // sinonim membantu
  { const q = 'referensi shalat malam'; const pk = await S.run(q, { docs }); const mt = await titles(pk, 'materi', 3);
    let viaSyn = 0, nU = 0; const c = pk.analysis.concepts[0];
    for (const x of pk.kitab.filter(z => z.level === 'utama').slice(0, 40)) { const t = await recText(x.i); nU++; if (!has(t, 'shalat malam') && c.main.some(v => v !== 'shalat malam' && has(t, v))) viaSyn++; }
    let bSyn = 0; for (const b of pk.brosur.filter(z => z.level === 'utama').slice(0, 40)) if (!b.doc.idx.s.includes('shalat malam')) bSyn++;
    test('S10', 'Sinonim kamus menemukan dokumen terkait', q, mt.some(t => /SHALATUL LAIL/.test(t)) && viaSyn > 0, `sinonim: ${c.main.slice(0, 6).join(', ')} · materi: ${mt.join(' ; ')} · dari 40 utama kitab teratas, ${viaSyn} ditemukan HANYA lewat sinonim (tanpa frasa "shalat malam"); brosur utama lewat sinonim: ${bSyn}`); }
  // tema di luar isi CHM Gurda → koleksi lain
  for (const [no, q] of [['S11', 'Carikan materi tentang keutamaan sabar'], ['S12', 'Saya perlu bahan kajian berbakti kepada orang tua'], ['S13', 'Tolong referensi tentang riba']]) {
    const pk = await S.run(q, { docs }); const au = await audit(pk); const c = pk.counts;
    test(no, 'Tema di luar CHM Gurda (memakai koleksi lain)', q, (c.quran.utama + c.hadis.utama + c.chm.utama) > 0 && au.okU === au.nU && au.okQ === au.nQ, `${sumLine(pk)} · ayat: ${(await titles(pk, 'quran', 3)).join(' ; ')} · hadis: ${(await titles(pk, 'hadis', 2)).join(' ; ')} · materi: ${(await titles(pk, 'materi', 2)).join(' ; ') || '—'} · Utama memuat kata inti ${au.okU}/${au.nU} · kutipan cocok sumber ${au.okQ}/${au.nQ}`); }
  // tanpa kata kunci
  { const pk = await S.run('tolong carikan referensinya ya', { docs }); test('S14', 'Hanya kata pengantar → tidak mengarang, minta tema', 'tolong carikan referensinya ya', !!pk.empty, 'hasil: ' + (pk.empty ? 'paket kosong + pesan "sebutkan temanya"' : 'ada hasil')); }
  // semua hasil punya sumber
  { const pk = await S.run('Carikan materi tentang tayamum.', { docs }); let n = 0, ok = 0;
    for (const x of pk.kitab.slice(0, 60)) { const r = await K.getOne(x.i); n++; if (r && r.path && K.srcFile(r.src)) ok++; }
    for (const b of pk.brosur.slice(0, 60)) { n++; if (b.doc.file || b.doc.path || b.doc.src) ok++; }
    test('S15', 'Setiap referensi memiliki identitas sumber (file + lokasi)', 'tayamum', ok === n, `${ok}/${n} referensi punya nama file sumber + lokasi halaman/bab`); }
  // kecepatan
  { const qs = cases.map(c => c[0]); const t = []; for (const q of qs) { const t0 = Date.now(); await S.run(q, { docs }); t.push(Date.now() - t0); }
    const avg = t.reduce((a, b) => a + b, 0) / t.length; test('S16', 'Kecepatan penyusunan paket (ulang, cache)', qs.length + ' permintaan', avg < 1500, `rata-rata ${avg.toFixed(0)} ms, maks ${Math.max(...t)} ms (Node; di browser + unduh indeks pertama kali lebih lama)`); }
  // Al-Qur'an berdasarkan makna di dalam paket (data/lib/makna.js)
  { let n = 0, ok = 0, items = 0; const bad = [], seen = [];
    for (const q of ['Saya perlu bahan kajian berbakti kepada orang tua', 'Carikan materi tentang keutamaan sabar', 'Ayat tentang kewajiban menjaga amanah']) {
      const pk = await S.run(q, { docs });
      for (const x of pk.quran.filter(z => z.mk && z.level === 'utama')) {
        items++; const o = x.mk; const r = await K.getOne(x.i); seen.push(q.split(' ').slice(-2).join(' ') + '→' + o.s + ':' + o.a);
        const jal = r.jal != null ? (await K.getOne(r.jal)).tr : '';
        for (const rs of o.reasons) for (const it of rs.items || []) {
          if (it.kind === 'rel') continue; n++;
          const txt = N(it.field === 'R' || it.field === 'P' ? r.tr : it.field === 'C' ? r.catatan : it.field === 'J' ? jal : it.field === 'K' ? (await K.getOne(it.doc)).blocks.map(b => b[1]).join(' ') : it.text);
          const ws = MQ.seqOf(it.form); const sm = await MQ._stemQuery(ws);
          const cn = c => (P.VARMAP.get(c) || [c])[0]; const tt = MQ.toks(txt);
          if (ws.every(w => { const st = sm.get(w) || w; return tt.some(tk => tk === w || tk === st || MQ.cands(tk).map(cn).includes(st)); })) ok++; else bad.push(o.s + ':' + o.a + ' ' + it.field + ' ' + it.form);
        }
      }
    }
    test('S17', "Ayat Al-Qur'an berdasarkan makna di paket: setiap bukti Utama tertulis di sumbernya", '3 permintaan', items > 0 && ok === n, `${items} ayat utama · bukti tertelusur ${ok}/${n}${bad.length ? ' · gagal: ' + bad.slice(0, 5).join(', ') : ''} · contoh: ${seen.slice(0, 9).join(', ')}`); }
  process.stdout.write(JSON.stringify(out, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
