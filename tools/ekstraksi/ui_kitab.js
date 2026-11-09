  /* ================= PUSTAKA KITAB (Al-Qur'an, tafsir, hadis) =================
     Data: data/kitab/ (indeks bertahap). Mesin: data/lib/kitab.js (window.PRMK). */
  const KB = window.PRMK || null;
  const KST = { meta: null, err: null, cache: new Map(), recs: new Map(), seq: 0 };
  const KCAT = { quran: "Al-Qur'an", tafsir: 'Tafsir', hadis: 'Hadis' };
  const KFILTER_LABEL = {
    'k:quran': "Al-Qur'an", 'k:hadis': 'Hadis (semua kitab)', 'k:tafsir': 'Tafsir', 'k:bulughul': 'Bulughul Maram', 'k:kitab9': 'Kitab 9 Imam', 'k:bukhari': 'Shahih Bukhari',
    'k:muslim': 'Shahih Muslim', 'k:abudaud': 'Sunan Abu Dawud', 'k:ibnumajah': 'Sunan Ibnu Majah', 'k:tirmidzi': 'Sunan Tirmidzi', 'k:nasai': "Sunan An-Nasa'i", 'k:darimi': 'Sunan Ad-Darimi',
    'k:riyadh': 'Riyadhus Shalihin', 'k:ibnukatsir': 'Tafsir Ibnu Katsir', 'k:jalalain': 'Tafsir Jalalain', 'k:qtema': "Indeks tema Al-Qur'an",
    'c:bukhari': 'Riwayat Bukhari (semua file)', 'c:muslim': 'Riwayat Muslim (semua file)', 'c:abudaud': 'Riwayat Abu Dawud (semua file)', 'c:tirmidzi': 'Riwayat Tirmidzi (semua file)',
    'c:nasai': "Riwayat An-Nasa'i (semua file)", 'c:ibnumajah': 'Riwayat Ibnu Majah (semua file)', 'c:darimi': 'Riwayat Ad-Darimi (semua file)', 'c:ahmad': 'Musnad Ahmad (Kitab 9 Imam)', 'c:malik': "Muwaththa' Malik (Kitab 9 Imam)"
  };
  function srcMode() { return S.src === 'all' ? 'all' : (S.src === 'CHM' || S.src === 'PDF') ? 'brosur' : 'kitab'; }
  function kitabInit() {
    if (!KB) { KST.err = 'Modul kitab tidak termuat.'; return Promise.resolve(null); }
    return KB.init('data/kitab/', { cacheBust: !FILE_MODE }).then(m => { KST.meta = m; setStatus(); if (!S.q && S.tab === 'cari' && !S.browse && !S.kb) renderMain(); return m; })
      .catch(e => { KST.err = 'Data Al-Qur\'an & hadis belum bisa dimuat (' + e.message + ').'; setStatus(); renderMain(); return null; });
  }
  function kAllow(src) {
    const M = KST.meta; if (!M) return () => false;
    if (src === 'all') return null;
    if (src.startsWith('k:')) {
      const c = src.slice(2);
      if (KCAT[c]) { const rs = M.sources.filter(s => s.cat === c).map(s => [s.start, s.start + s.count]); return i => rs.some(r => i >= r[0] && i < r[1]); }
      const s = M.src[c]; if (s) return i => i >= s.start && i < s.start + s.count;
    }
    return null;
  }
  function kOpts(src) { const o = { whole: S.whole, allow: kAllow(src) }; if (src.startsWith('c:')) o.coll = src.slice(2); return o; }
  async function kRun(pq, src, seqKey) {
    const key = JSON.stringify([pq.raw, src, S.whole, S.broad, !!pq._support]);
    if (KST.cache.has(key)) return KST.cache.get(key);
    await kitabInit(); if (!KST.meta) return { error: KST.err || 'tidak tersedia', results: [] };
    const r = await KB.search(pq, kOpts(src));
    KST.cache.set(key, r); if (KST.cache.size > 30) KST.cache.delete(KST.cache.keys().next().value);
    return r;
  }
  async function kEnsure(ids) {
    const miss = ids.filter(i => !KST.recs.has(i));
    if (!miss.length) return;
    const m = await KB.get(miss); for (const [i, r] of m) KST.recs.set(i, r);
    if (KST.recs.size > 3000) { let n = KST.recs.size - 2000; for (const k of KST.recs.keys()) { if (n-- <= 0) break; KST.recs.delete(k); } }
  }
  function kSearchFor(pq, seq) {
    if (!pq || (!pq.groups.length && !pq.qref)) return;
    S.last.k = null; S.last.kerr = null;
    kRun(pq, S.src).then(async r => {
      if (!S.last || S.last.seq !== seq) return;
      if (r.error) { S.last.kerr = r.error; renderMain(); return; }
      S.last.k = r; await kEnsure(kVisibleIds()); if (S.last && S.last.seq === seq) renderMain();
    }).catch(e => { if (S.last && S.last.seq === seq) { S.last.kerr = 'Pencarian kitab gagal: ' + e.message; renderMain(); } });
  }
  function kByCat(r, cat) { return r.results.filter(x => KB.srcOf(x.i).cat === cat); }
  function kVisibleIds() {
    const r = S.last && S.last.k; if (!r) return [];
    if (srcMode() === 'all') return [].concat(kByCat(r, 'quran').slice(0, 3), kByCat(r, 'hadis').slice(0, 5), kByCat(r, 'tafsir').slice(0, 3)).map(x => x.i);
    return r.results.slice(0, S.kShown || 20).map(x => x.i);
  }
  function kPill(cat) { return cat === 'quran' ? '<span class="pill q">AL-QUR\'AN</span>' : cat === 'hadis' ? '<span class="pill h">HADIS</span>' : '<span class="pill t">TAFSIR</span>'; }
  function kHl(text, pq, max, isAr) {
    if (!text) return '';
    const ranges = pq ? P.matchRanges(text, hlVariants(pq), S.whole) : [];
    let a = 0, b = text.length;
    if (max && text.length > max) { const w = P.snippetWindow(text, ranges, max); a = w.a; b = w.b; }
    return (a > 0 ? '… ' : '') + hl(text, ranges, a, b).replace(/\n/g, '<br>') + (b < text.length ? ' …' : '');
  }
  function kHas(text, pq) { return !!(text && pq && P.matchRanges(text, hlVariants(pq), S.whole).length); }
  function surahName(r) { return r.surah || P.surahLabel(r.s); }
  function kTitle(r) {
    if (r.src === 'jalalain') return 'Tafsir Jalalain · QS. ' + P.surahLabel(r.s) + ' (' + r.s + '): ' + r.a;
    return KB.title(r);
  }
  function kSrcLine(r) {
    const M = KST.meta; const s = M.src[r.src];
    return `<div class="crumb">Sumber: <b>${esc(s.name)}</b> › ${esc(s.file)} › ${esc(r.path)}</div>`;
  }
  function kArabicImg(r, cls) { return r.img ? `<div class="qimg ${cls || ''}"><img src="data/kitab/qimg/${esc(r.img.replace(/^img\//, ''))}" alt="Teks Arab QS ${r.s}:${r.a} (gambar asli Al-Qur'an Digital 2.1)" loading="lazy"></div>` : ''; }
  function kJalAr(r, pq) {
    if (r.arSeg && r.arSeg.length) return r.arSeg.map(sg => sg[0] ? `<span class="qred">${esc(sg[1])}</span>` : esc(sg[1])).join(' ');
    return kHl(r.ar, pq);
  }
  function kRelLine(r, x) {
    let h = '';
    const dups = (x && x.dups && x.dups.length) ? x.dups : null;
    if (r.dup && r.dup.length) h += `<div class="krel">Teks identik juga ada di: ${r.dup.slice(0, 4).map(d => `<button class="srcchip" data-act="kopen" data-i="${d[0]}">${esc(d[1])}</button>`).join('')}${r.dup.length > 4 ? `<span class="crumb">+${r.dup.length - 4}</span>` : ''}</div>`;
    if (r.sim && r.sim.length) h += `<div class="krel">Matan serupa: ${r.sim.slice(0, 3).map(d => `<button class="srcchip" data-act="kopen" data-i="${d[0]}" title="kemiripan teks matan ±${d[1]}%">${esc(d[2])} · ${d[1]}%</button>`).join('')}${r.sim.length > 3 ? `<button class="more" data-act="kopen" data-i="${r.i}">+${r.sim.length - 3} lainnya</button>` : ''}</div>`;
    return h;
  }
  function kActions(r) {
    let a = `<button class="btn ghost" data-act="kopen" data-i="${r.i}">Buka detail</button>`;
    if (r.src === 'quran') {
      if (r.jal != null) a += `<button class="btn ghost" data-act="kopen" data-i="${r.jal}">Tafsir Jalalain</button>`;
      if (r.ik != null) a += `<button class="btn ghost" data-act="kopen" data-i="${r.ik}">Tafsir Ibnu Katsir</button>`;
    }
    if ((r.src === 'jalalain' || (r.src === 'ibnukatsir' && r.s && r.a1)) && KST.meta) a += `<button class="btn ghost" data-act="kayat" data-s="${r.s}" data-a="${r.a || r.a1}">Lihat ayat</button>`;
    a += `<button class="btn ghost" data-act="kcpq" data-i="${r.i}">Salin kutipan</button><button class="btn ghost" data-act="kcpr" data-i="${r.i}">Salin referensi</button>`;
    return `<div class="actions">${a}</div>`;
  }
  function kCardHTML(x, pq) {
    const r = KST.recs.get(x.i);
    if (!r) return `<article class="res kres"><div class="skel" style="width:40%"></div><div class="skel"></div><div class="skel" style="width:80%"></div></article>`;
    const M = KST.meta; const s = M.src[r.src]; const cat = s.cat;
    let h = `<article class="res kres ${cat}">`;
    if (r.src === 'quran') {
      h += `<div class="meta">${kPill(cat)}<span class="date">QS. ${esc(surahName(r))} (${r.s}): ${r.a}</span>${r.juz ? `<span>Juz ${r.juz}</span>` : ''}${(r.topik || []).length ? `<span>${esc(r.topik.join(' · '))}</span>` : ''}${x.tafsirOf != null ? '' : ''}</div>`;
      h += kArabicImg(r);
      const arQ = pq && pq.groups.some(g => /[؀-ۿ]/.test(g.key));
      if (x.tl && r.arT) {
        const rg = KB.tlRange(r.arT, x.tl.part || (pq && pq.raw) || '');
        const arH = rg ? esc(r.arT.slice(0, rg[0])) + '<mark>' + esc(r.arT.slice(rg[0], rg[1])) + '</mark>' + esc(r.arT.slice(rg[1])) : esc(r.arT);
        h += `<div class="tlbadge">${x.tl.part ? 'Cocok sebagian kata (“' + esc(x.tl.part) + '”)' : /[\u0600-\u06FF]/.test((pq && pq.raw) || '') ? 'Cocok dengan susunan huruf Arab' : 'Cocok dengan tulisan Latin / transliterasi'} · kecocokan huruf ${x.tl.pct}%${x.tl.err ? ' (selisih ' + x.tl.err + ' huruf)' : ''}</div>`;
        h += `<div class="ar kar" dir="rtl" lang="ar">${arH}</div><div class="crumb">Teks Arab: ${esc(r.arTname || 'Tafsir Ibnu Katsir')} (${esc(r.arTsrc || '')}). Gambar di atas adalah teks asli Al-Qur'an Digital 2.1.</div>`;
      } else if (arQ && r.arT && kHas(r.arT, pq)) h += `<div class="ar kar" dir="rtl" lang="ar">${kHl(r.arT, pq, 260)}</div><div class="crumb">Teks Arab yang dicari: ${esc(r.arTname || 'Tafsir Ibnu Katsir')} (${esc(r.arTsrc || '')}). Gambar di atas adalah teks asli Al-Qur'an Digital 2.1.</div>`;
      h += `<div class="tr">${kHl(r.tr, pq)}</div>`;
      if (r.catatan && kHas(r.catatan, pq)) h += `<div class="cit">Catatan kaki: ${kHl(r.catatan, pq, 240)}</div>`;
    } else if (r.src === 'qtema') {
      h += `<div class="meta">${kPill(cat)}<span class="date">Indeks tema</span><span>${esc(r.tema)}${r.sub ? ' › ' + esc(r.sub) : ''}</span></div><h3><button class="linklike" data-act="kopen" data-i="${r.i}">${kHl(r.label, pq)}</button></h3>`;
      h += `<div class="srclist">${(r.refs || []).slice(0, 24).map(q => `<button class="srcchip" data-act="kayat" data-s="${q[0]}" data-a="${q[1]}">QS ${q[0]}:${q[1]}</button>`).join('')}${(r.refs || []).length > 24 ? `<span class="crumb">+${r.refs.length - 24} ayat</span>` : ''}</div>`;
    } else if (r.src === 'jalalain') {
      h += `<div class="meta">${kPill(cat)}<span class="date">Tafsir Jalalain</span><span>QS. ${esc(P.surahLabel(r.s))} (${r.s}): ${r.a}</span></div>`;
      if (r.ar) h += `<div class="ar" dir="rtl" lang="ar">${r.arSeg && !kHas(r.ar, pq) ? kJalAr(r) : kHl(r.ar, pq, 300)}</div>`;
      h += `<div class="tr">${kHl(r.tr, pq, 420)}</div>`;
    } else if (r.src === 'ibnukatsir') {
      h += `<div class="meta">${kPill(cat)}<span class="date">Tafsir Ibnu Katsir</span>${r.s ? `<span>QS ${r.s}${r.a1 ? ':' + r.a1 + (r.a2 > r.a1 ? '-' + r.a2 : '') : ''}</span>` : ''}</div><h3><button class="linklike" data-act="kopen" data-i="${r.i}">${esc(r.title || '')}</button></h3>`;
      const bl = (r.blocks || []).map((b, k) => [k, b]).filter(([k, b]) => kHas(b[1], pq)).slice(0, 2);
      const show = bl.length ? bl : (r.blocks || []).slice(0, 2).map((b, k) => [k, b]);
      h += show.map(([k, b]) => `<button class="snip${b[0] === 'a' ? ' ar' : ''}" data-act="kopen" data-i="${r.i}" data-bi="${k}"><span class="loc">paragraf ${k + 1} dari ${(r.blocks || []).length}</span><span class="txt"${b[0] === 'a' ? ' dir="rtl" lang="ar"' : ''}>${kHl(b[1], pq, 280)}</span></button>`).join('');
    } else {
      const head = KB.title(r);
      h += `<div class="meta">${kPill(cat)}<span class="date">${esc(head)}</span>${r.no ? `<span>No. ${esc(r.no)}</span>` : (r.kind === 'teks' ? '<span>Teks pengantar (tanpa nomor)</span>' : '<span>Tanpa nomor di sumber</span>')}${r.derajat ? `<span class="dj" title="Keterangan derajat sebagaimana tertulis di sumber">${esc(r.derajat.length > 60 ? r.derajat.slice(0, 58) + '…' : r.derajat)}</span>` : ''}</div>`;
      h += `<h3><button class="linklike" data-act="kopen" data-i="${r.i}">${kHl(r.bab || r.kitab || head, pq)}</button></h3>`;
      h += `<div class="crumb">${r.kitab ? 'Kitab: <b>' + esc(r.kitab) + '</b>' : ''}${r.kitab && r.bab ? ' · ' : ''}${r.bab ? 'Bab: <b>' + esc(r.bab) + '</b>' : ''}</div>`;
      if (r.ar) h += `<div class="ar" dir="rtl" lang="ar">${kHl(r.ar, pq, 300)}</div>`;
      if (r.tr) h += `<div class="tr">${kHl(r.tr, pq, 460)}</div>`;
      if (r.rawi && r.rawi.length) h += `<div class="cit">Perawi (nama dalam tanda [ ] di sumber): ${esc(r.rawi.length > 4 ? r.rawi.slice(0, 2).join(' › ') + ' › … › ' + r.rawi.slice(-2).join(' › ') : r.rawi.join(' › '))}</div>`;
    }
    h += kRelLine(r, x);
    if (x.dups && x.dups.length) h += `<div class="crumb">${fmtN(x.dups.length)} record identik lain ikut cocok dan digabung di sini; tetap bisa dibuka satu per satu dari daftar “Teks identik”.</div>`;
    h += kSrcLine(r) + kActions(r) + '</article>';
    return h;
  }
  function kitabHTML(mode, pq) {
    const L = S.last; let h = '';
    if (!KB) return '<div class="note warn">Modul pencarian Al-Qur\'an & hadis (data/lib/kitab.js) tidak termuat.</div>';
    if (L.kerr) return `<div class="note warn">${esc(L.kerr)}</div>`;
    if (!L.k) return `<div class="note">Mencari di Al-Qur'an, tafsir dan kitab hadis…</div>`;
    const r = L.k;
    const notes = [];
    if (r.coll && !S.src.startsWith('c:')) notes.push(`Nama kitab <b>${esc(r.collLabel || r.coll)}</b> terdeteksi: hasil hadis disaring ke riwayat ${esc(KB.COLLN[r.coll] || r.coll)} (semua file). Untuk mencari kata itu di teks, tulis dalam tanda kutip.`);
    if (r.tl && r.tl.n) notes.push(`Kueri juga dibaca sebagai tulisan Latin/transliterasi (kerangka huruf <b>${esc(r.tl.q)}</b>)${r.tl.part ? ', cocok pada potongan “' + esc(r.tl.part) + '”' : ''} → <b>${fmtN(r.tl.n)}</b> ayat. Persentase menunjukkan kecocokan huruf, bukan kepastian.`);
    if (r.results.some(x => x.num)) notes.push('Nomor hadis dicocokkan dengan nomor yang tertulis di masing-masing kitab (tiap koleksi punya penomoran sendiri).');
    if (mode === 'all') {
      const q = kByCat(r, 'quran'), hd = kByCat(r, 'hadis'), tf = kByCat(r, 'tafsir');
      if (!q.length && !hd.length && !tf.length) return `<div class="note">Tidak ada hasil di Al-Qur'an, tafsir dan kitab hadis.</div>`;
      if (notes.length) h += `<div class="vchips">${notes.join(' ')}</div>`;
      const sec = (title, list, n, src) => list.length ? `<section class="ksec"><div class="ksh"><h2>${title} <small>${fmtN(list.length)} hasil</small></h2>${list.length > n ? `<button class="btn" data-act="ksrc" data-src="${src}">Lihat semua ${fmtN(list.length)}</button>` : ''}</div><div class="list">${list.slice(0, n).map(x => kCardHTML(x, pq)).join('')}</div></section>` : '';
      // urutkan bagian menurut kecocokan terbaik (bagian dengan hasil "semua kata cocok" didahulukan)
      const secs = [["Al-Qur'an", q, 3, 'k:quran', 0], ['Hadis', hd, 5, 'k:hadis', 1], ['Tafsir', tf, 3, 'k:tafsir', 2]].filter(x => x[1].length);
      const top = x => x[1][0]; const best = Math.max.apply(null, secs.map(x => top(x).cov));
      secs.sort((a, b2) => (top(b2).cov - top(a).cov) || ((top(b2).ref ? 1 : 0) - (top(a).ref ? 1 : 0)) || (a[4] - b2[4]));
      for (const x of secs) h += sec(x[0] + (top(x).cov < best && best >= 2 ? ' <small>· hanya sebagian kata cocok</small>' : ''), x[1], x[2], x[3]);
      return h;
    }
    const lbl = KFILTER_LABEL[S.src] || S.src;
    h += `<div class="rhead"><strong>${fmtN(r.results.length)} hasil di ${esc(lbl)}</strong><span class="sub">Al-Qur'an ${fmtN(r.counts.quran || 0)} · Tafsir ${fmtN(r.counts.tafsir || 0)} · Hadis ${fmtN(r.counts.hadis || 0)} · ${r.ms < 1 ? '<1' : Math.round(r.ms)} ms</span></div>`;
    if (notes.length) h += `<div class="vchips">${notes.join(' ')}</div>`;
    if (!r.results.length) return h + `<div class="empty">Tidak ada hasil untuk “${esc(S.q)}” di ${esc(lbl)}.<br>${S.whole ? 'Coba matikan “Kata utuh”. ' : ''}Coba pilih sumber “Semua”.</div>`;
    const n = S.kShown || 20;
    h += '<div class="list">' + r.results.slice(0, n).map(x => kCardHTML(x, pq)).join('') + '</div>';
    if (r.results.length > n) h += `<div class="loadmore"><button class="btn" data-act="kmore">Tampilkan 20 hasil lagi (${fmtN(r.results.length - n)} tersisa)</button></div>`;
    return h;
  }
  function kSummaryHTML() {
    const L = S.last; const r = L && L.k; const nB = L && L.r ? L.r.results.length : 0;
    if (!r) return '';
    const c = r.counts;
    return `<div class="kcounts">${[['k:quran', "Al-Qur'an", c.quran], ['k:hadis', 'Hadis', c.hadis], ['k:tafsir', 'Tafsir', c.tafsir]].map(([s, t, n]) => `<button data-act="ksrc" data-src="${s}"${n ? '' : ' disabled'}><b>${fmtN(n || 0)}</b> ${t}</button>`).join('')}<button data-act="ksrc" data-src="CHM"><b>${fmtN(nB)}</b> Brosur & PDF</button><span class="sub">${r.ms < 1 ? '<1' : Math.round(r.ms)} ms</span></div>`;
  }
  /* ---------- pembaca record kitab ---------- */
  async function openKitab(i, bi) {
    i = +i; await kitabInit(); if (!KST.meta) { toast('Data kitab belum tersedia'); return; }
    await kEnsure([i]); const r = KST.recs.get(i); if (!r) { toast('Record tidak ditemukan'); return; }
    const M = KST.meta; const s = M.src[r.src]; const pq = (S.tab === 'sup' && S.sup ? S.sup.pq : (S.last && S.last.pq)) || null;
    const prev = i > s.start ? i - 1 : null, next = i < s.start + s.count - 1 ? i + 1 : null;
    let h = `<div class="dhead"><div class="row"><div style="flex:1;min-width:0"><div class="meta">${kPill(s.cat)}<span class="date">${esc(s.name)}</span>${r.no ? `<span>No. ${esc(r.no)}</span>` : ''}${r.juz ? `<span>Juz ${r.juz}</span>` : ''}</div><h2>${esc(r.src === 'quran' ? 'QS. ' + surahName(r) + ' (' + r.s + '): ' + r.a : r.src === 'qtema' ? r.label : (r.bab || r.title || kTitle(r)))}</h2></div><button class="btn ghost" data-act="close" aria-label="Tutup">✕ Tutup</button></div>
      <div class="actions">${prev != null ? `<button class="btn" data-act="kopen" data-i="${prev}">‹ Sebelumnya</button>` : ''}${next != null ? `<button class="btn" data-act="kopen" data-i="${next}">Berikutnya ›</button>` : ''}<button class="btn ghost" data-act="kcpq" data-i="${i}">Salin kutipan</button><button class="btn ghost" data-act="kcpr" data-i="${i}">Salin referensi</button>${r.src === 'quran' && r.jal != null ? `<button class="btn ghost" data-act="kopen" data-i="${r.jal}">Tafsir Jalalain</button>` : ''}${r.src === 'quran' && r.ik != null ? `<button class="btn ghost" data-act="kopen" data-i="${r.ik}">Tafsir Ibnu Katsir</button>` : ''}${(r.src === 'jalalain' || (r.src === 'ibnukatsir' && r.a1)) ? `<button class="btn ghost" data-act="kayat" data-s="${r.s}" data-a="${r.a || r.a1}">Lihat ayat</button>` : ''}</div></div>`;
    h += `<div class="dbody" id="rbody"><div class="idbox">Sumber asli: <b>${esc(s.file)}</b> (${esc(s.name)})${r.kitab ? ' › Kitab <b>' + esc(r.kitab) + '</b>' : ''}${r.bab ? ' › Bab <b>' + esc(r.bab) + '</b>' : ''}${r.no ? ' › No. <b>' + esc(r.no) + '</b>' : ''}<br>Lokasi file di dalam CHM: <b>${esc(r.path)}</b>${r.babInherited ? '<br>Judul bab diambil dari hadis sebelumnya di halaman yang sama (sumber menulis judul bab sekali).' : ''}</div><div class="doc">`;
    const blk = (cls, inner, extra) => `<div class="blk ${cls}"${cls === 'a' ? ' lang="ar" dir="rtl"' : ''}${extra || ''}>${inner}</div>`;
    const lab = t => `<div class="klab">${t}</div>`;
    if (r.src === 'quran') {
      h += lab('Teks Arab (gambar asli Al-Qur\'an Digital 2.1)') + kArabicImg(r, 'big');
      if (r.arT) { const rg = pq && pq.raw ? KB.tlRange(r.arT, pq.raw) : null; h += lab('Teks Arab untuk pencarian — dari ' + esc(r.arTname || 'Tafsir Ibnu Katsir') + ' (' + esc(r.arTsrc || '') + ')') + blk('a', rg && !kHas(r.arT, pq) ? esc(r.arT.slice(0, rg[0])) + '<mark>' + esc(r.arT.slice(rg[0], rg[1])) + '</mark>' + esc(r.arT.slice(rg[1])) : kHl(r.arT, pq)); if (r.arTnote) h += `<div class="crumb">${esc(r.arTnote)}</div>`; }
      else h += `<div class="crumb">Teks Arab ayat ini tidak tersedia sebagai teks di sumber yang dilampirkan; pencarian Arab untuk ayat ini tidak bisa dilakukan. Gambar di atas tetap teks asli.</div>`;
      if ((r.topik || []).length) h += lab('Judul / topik di sumber') + blk('p', esc(r.topik.join(' · ')));
      h += lab('Terjemahan') + blk('p', kHl(r.tr, pq));
      if (r.catatan) h += lab('Catatan kaki & keterangan di sumber') + blk('p', kHl(r.catatan, pq));
    } else if (r.src === 'qtema') {
      h += lab('Indeks tema: ' + esc(r.tema) + (r.sub ? ' › ' + esc(r.sub) : '')) + blk('p', esc(r.label));
      h += `<div class="srclist">${(r.refs || []).map(q => `<button class="srcchip" data-act="kayat" data-s="${q[0]}" data-a="${q[1]}">QS ${q[0]}:${q[1]}</button>`).join('')}</div>`;
    } else if (r.src === 'ibnukatsir') {
      (r.blocks || []).forEach((b, k) => { h += `<div class="blk ${b[0]}${k === +bi ? ' target' : ''}" id="rb-${k}"${b[0] === 'a' ? ' lang="ar" dir="rtl"' : ''}>${kHl(b[1], pq)}</div>`; });
    } else if (r.src === 'jalalain') {
      if (r.ar) h += lab('Teks Arab (kata berwarna merah = lafaz ayat, sesuai penandaan di sumber)') + blk('a', r.arSeg && r.arSeg.length && !kHas(r.ar, pq) ? kJalAr(r) : kHl(r.ar, pq));
      h += lab('Terjemahan tafsir') + blk('p', kHl(r.tr, pq));
    } else {
      if (r.babAr) h += blk('a', esc(r.babAr));
      if (r.note) h += `<div class="crumb">${esc(r.note)}</div>`;
      if (r.ar) h += lab('Teks Arab') + blk('a', kHl(r.ar, pq));
      if (r.tr) h += lab(r.kind === 'teks' ? 'Teks' : 'Terjemahan') + blk('p', kHl(r.tr, pq));
      if (r.intro) h += lab('Teks pengantar di halaman sumber') + blk('p', kHl(r.intro, pq));
      if (r.rawi && r.rawi.length) h += lab('Perawi (nama yang ditandai [ ] di sumber, urut)') + blk('p', esc(r.rawi.join(' › ')));
      if (r.derajat) h += lab('Keterangan derajat (sebagaimana tertulis di sumber)') + blk('p', esc(r.derajat));
      else if (s.cat === 'hadis' && r.kind !== 'teks') h += `<div class="crumb">Sumber tidak mencantumkan keterangan derajat terpisah untuk hadis ini; aplikasi tidak menambahkannya.</div>`;
    }
    if (r.dup && r.dup.length) h += lab('Teks identik di record lain (sumber tetap terpisah)') + `<div class="srclist">${r.dup.map(d => `<button class="srcchip" data-act="kopen" data-i="${d[0]}">${esc(d[1])}</button>`).join('')}</div>`;
    if (r.sim && r.sim.length) h += lab('Riwayat dengan matan serupa') + `<div class="crumb">Dihitung otomatis dari kemiripan teks Arab matan (bukan penetapan takhrij). Periksa redaksinya; perbedaan lafaz tetap dipertahankan.</div><div class="srclist">${r.sim.map(d => `<button class="srcchip" data-act="kopen" data-i="${d[0]}">${esc(d[2])} · ${d[1]}%</button>`).join('')}</div>`;
    h += '</div></div>';
    const R = $('#reader'); R.innerHTML = h; showDrawer(R);
    readerCtx = null;
    requestAnimationFrame(() => { const t = $('#rb-' + bi); if (t) t.scrollIntoView({ block: 'center' }); else { const b = $('#rbody'); if (b) b.scrollTop = 0; } });
  }
  function kQuote(r) {
    const parts = [];
    if (r.src === 'quran') { if (r.arT) parts.push(r.arT); parts.push(r.tr); }
    else if (r.src === 'ibnukatsir') parts.push((r.blocks || []).slice(0, 3).map(b => b[1]).join('\n'));
    else if (r.src === 'qtema') parts.push(r.label + ': ' + (r.refs || []).map(q => q[0] + ':' + q[1]).join(', '));
    else { if (r.ar) parts.push(r.ar); if (r.tr) parts.push(r.tr); if (r.derajat) parts.push('(' + r.derajat + ')'); }
    parts.push('— ' + KB.ref(r));
    return parts.join('\n');
  }
  async function kCopy(i, quote) { await kEnsure([+i]); const r = KST.recs.get(+i); if (r) copy(quote ? kQuote(r) : KB.ref(r)); }
  async function kOpenAyat(s, a) { await kitabInit(); const M = KST.meta; if (!M) return; openKitab(M.quranStart + M.surahOff[s - 1] + (+a) - 1); }
  /* ---------- jelajah kitab ---------- */
  async function renderKBrowse(out) {
    const kb = S.kb; await kitabInit(); const M = KST.meta;
    if (!M) { out.innerHTML = `<div class="note warn">${esc(KST.err || 'Data kitab belum tersedia')}</div>`; return; }
    const s = M.src[kb.src]; const toc = await KB.toc(kb.src);
    let h = `<div class="rhead"><strong>${esc(s.name)} · ${fmtN(s.count)} record</strong><button class="btn ghost" data-act="${kb.k != null ? 'kbup' : 'home'}">← Kembali</button></div><div class="crumb" style="margin:-6px 2px 10px">File sumber: ${esc(s.file)}</div>`;
    if (kb.k == null) {
      h += `<div class="plist">${toc.map((k, ki) => `<div class="prow"><div><div class="t">${esc(k[0])}</div><div class="m">${fmtN(k[2])} record${k[3].length > 1 ? ' · ' + fmtN(k[3].length) + ' bab' : ''}</div></div><button class="btn" data-act="kbk" data-k="${ki}">Buka</button></div>`).join('')}</div>`;
      out.innerHTML = h; return;
    }
    const k = toc[kb.k];
    h += `<h3 style="margin:4px 2px 10px">${esc(k[0])}</h3>`;
    if (kb.b == null && k[3].length > 1) {
      h += `<div class="plist">${k[3].map((b, bi) => `<div class="prow"><div><div class="t">${esc(b[0] || '—')}</div><div class="m">${fmtN(b[2])} record</div></div><button class="btn" data-act="kbb" data-b="${bi}">Baca</button></div>`).join('')}</div>`;
      out.innerHTML = h; return;
    }
    const rng = kb.b != null ? k[3][kb.b] : [k[0], k[1], k[2]];
    if (kb.b != null) h += `<div class="crumb" style="margin:-4px 2px 10px">Bab: <b>${esc(rng[0])}</b></div>`;
    const n = Math.min(rng[2], kb.shown || 20); const ids = []; for (let j = 0; j < n; j++) ids.push(rng[1] + j);
    out.innerHTML = h + '<div class="note">Memuat…</div>';
    await kEnsure(ids);
    if (S.kb !== kb) return;
    h += '<div class="list">' + ids.map(i => kCardHTML({ i }, null)).join('') + '</div>';
    if (rng[2] > n) h += `<div class="loadmore"><button class="btn" data-act="kbmore">Tampilkan 20 lagi (${fmtN(rng[2] - n)} tersisa)</button></div>`;
    out.innerHTML = h;
  }
  function kHomeHTML() {
    const M = KST.meta;
    if (!M) return `<div class="sec"><h2>Al-Qur'an, tafsir & kitab hadis</h2><div class="note">${KST.err ? esc(KST.err) : 'Memuat daftar kitab…'}</div></div>`;
    const order = ['quran', 'qtema', 'jalalain', 'ibnukatsir', 'bulughul', 'riyadh', 'kitab9', 'bukhari', 'muslim', 'abudaud', 'tirmidzi', 'nasai', 'ibnumajah', 'darimi'];
    return `<div class="sec"><h2>Al-Qur'an, tafsir & kitab hadis</h2><div class="plist">${order.map(c => M.src[c]).filter(Boolean).map(s => `<div class="prow"><div><div class="m">${kPill(s.cat)} ${esc(s.file)}</div><div class="t">${esc(s.name)}</div><div class="m">${fmtN(s.count)} ${s.code === 'quran' ? 'ayat' : s.code === 'qtema' ? 'entri tema' : s.code === 'ibnukatsir' ? 'halaman tafsir' : s.code === 'jalalain' ? 'ayat bertafsir' : 'record'}</div></div><button class="btn" data-act="kbrowse" data-src="${s.code}">Jelajahi</button><button class="btn ghost" data-act="ksrc" data-src="k:${s.code}">Cari di sini</button></div>`).join('')}</div></div>`;
  }
