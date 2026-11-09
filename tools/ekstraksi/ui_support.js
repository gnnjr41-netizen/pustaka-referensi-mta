  /* ================= MODE SUPPORT USTADZ v3 — paket bahan kajian (tanpa AI) =================
     Mesin: data/lib/support.js (window.PRMS) + kamus data/kamus_support.js. Hanya menyusun kutipan sumber yang ditemukan. */
  const SUP = window.PRMS || null;
  let supSeq = 0;
  function supPq(A) { return { groups: A.concepts.map(c => ({ variants: c.main.concat(c.stem) })), phrase: null, raw: A.raw }; }
  function runSupport(soft) {
    const q = (soft && S.sup ? S.sup.q : $('#sq').value).trim();
    const out = $('#sout');
    if (q.length < 2) { out.innerHTML = '<div class="empty">Tulis permintaan bahan kajian terlebih dahulu, misalnya “Carikan materi tentang tayamum”.</div>'; return; }
    if (!SUP) { out.innerHTML = '<div class="note warn">Modul Mode Support Ustadz (data/lib/support.js) tidak termuat.</div>'; return; }
    const my = ++supSeq;
    if (!soft) out.innerHTML = '<div class="note">Menyusun bahan kajian… (membersihkan kata pengantar, memakai kamus sinonim, mencari di semua sumber)</div>';
    const ss = S.ssrc;
    const ctx = {
      docs: ss === 'kitab' ? [] : LIB.docs,
      docFilter: ss === 'all' || ss === 'kitab' ? d => (!S.y0 || docYear(d) >= S.y0 || !docYear(d)) && (!S.y1 || docYear(d) <= S.y1 || !docYear(d)) : filterFn(ss),
      withKitab: (ss === 'all' || ss === 'kitab') && !!(window.PRMK)
    };
    (ctx.withKitab ? kitabInit() : Promise.resolve()).then(() => { if (ctx.withKitab && !KST.meta) ctx.withKitab = false; return SUP.run(q, ctx); }).then(pack => {
      if (my !== supSeq) return;
      S.sup = { q, pack, pq: supPq(pack.analysis), copy: new Map(), chmLoading: !LIB.chmReady };
      renderSupport();
    }).catch(e => { if (my === supSeq) out.innerHTML = `<div class="note warn">Bahan kajian gagal disusun: ${esc(e.message)}</div>`; });
  }
  function lvlPill(level) { return level === 'utama' ? '<span class="lvl u" title="Memuat semua kata kunci inti atau frasa yang dicari">UTAMA</span>' : '<span class="lvl p" title="Hanya sebagian kata kunci atau istilah terkait — periksa relevansinya">PENDUKUNG</span>'; }
  function pickBox(X, key, text) { X.copy.set(key, text); return `<label class="pickbox"><input type="checkbox" class="pick" data-key="${esc(key)}"> pilih</label>`; }
  function supKitabRef(X, x, sec) {
    const r = X.pack.recs.get(x.i); if (!r) return '';
    const pq = X.pq; const M = KST.meta; const s = M.src[r.src];
    const key = sec + ':' + x.i;
    let h = `<div class="sref${x.level === 'utama' ? '' : ' pend'}"><div class="sh">${lvlPill(x.level)}${kPill(s.cat)}<strong>${esc(r.src === 'quran' ? 'QS. ' + surahName(r) + ' (' + r.s + '): ' + r.a : kTitle(r))}</strong>${r.no ? `<span>No. ${esc(r.no)}</span>` : ''}${x.dups && x.dups.length ? `<span>+${x.dups.length} teks identik di sumber lain</span>` : ''}</div>`;
    let txt = '';
    if (r.src === 'quran') {
      h += kArabicImg(r);
      if (r.arT) h += `<div class="ar" dir="rtl" lang="ar">${esc(r.arT)}</div><div class="crumb">Teks Arab: ${esc(r.arTname || 'Tafsir Ibnu Katsir')} (${esc(r.arTsrc || '')}); gambar = teks asli Al-Qur'an Digital 2.1.</div>`;
      h += `<div class="crumb">Transliterasi Latin: tidak tersedia di sumber.</div><div class="tr">${x.mk ? mkHl(r.tr.replace(/\[\d+\]/g, ''), x.mk) : kHl(r.tr, pq)}</div>`;
      if (x.mk) { const th = mkThemes(x.mk); h += `<div class="mkth">${mkBadge(x.mk)}${th.map(it => `<span class="kwchip">${esc(it.field === 'T' ? 'Tema: ' : 'Kelompok ayat: ')}${esc(it.text)}</span>`).join('')}</div>` + mkWhyHTML(x.mk); }
      txt = `QS. ${r.surah} (${r.s}): ${r.a}\n${r.arT || '[teks Arab: lihat gambar di Al-Qur\'an Digital 2.1]'}\n${r.tr}` + (x.mk ? `\n${MQ.LABEL[x.mk.type]} — ${MQ.reasonText(x.mk)}` : '');
    } else if (r.src === 'qtema') {
      h += `<div class="tr">${esc(r.tema)}${r.sub ? ' › ' + esc(r.sub) : ''} › <b>${esc(r.label)}</b></div><div class="srclist">${(r.refs || []).slice(0, 20).map(q => `<button class="srcchip" data-act="kayat" data-s="${q[0]}" data-a="${q[1]}">QS ${q[0]}:${q[1]}</button>`).join('')}</div>`;
      txt = `Indeks tema Al-Qur'an: ${r.tema} › ${r.label}: ${(r.refs || []).map(q => 'QS ' + q[0] + ':' + q[1]).join(', ')}`;
    } else if (r.blocks) {
      const bl = r.blocks.map((b, k) => [k, b]).filter(([k, b]) => kHas(b[1], pq)).slice(0, 3);
      const show = bl.length ? bl : r.blocks.slice(0, 2).map((b, k) => [k, b]);
      h += `<div class="crumb">${esc((r.toc || []).slice(1).join(' › ') || r.title || '')}</div>` + show.map(([k, b]) => `<button class="snip${b[0] === 'a' ? ' ar' : ''}" data-act="kopen" data-i="${r.i}" data-bi="${k}"><span class="loc">paragraf ${k + 1} dari ${r.blocks.length}</span><span class="txt"${b[0] === 'a' ? ' dir="rtl" lang="ar"' : ''}>${kHl(b[1], pq, 420)}</span></button>`).join('');
      txt = (r.title || '') + '\n' + show.map(([k, b]) => b[1]).join('\n');
    } else {
      if (r.kitab || r.bab) h += `<div class="crumb">${r.kitab ? 'Kitab: <b>' + esc(r.kitab) + '</b>' : ''}${r.kitab && r.bab ? ' · ' : ''}${r.bab ? 'Bab: <b>' + esc(r.bab) + '</b>' : ''}</div>`;
      if (r.ar) h += `<div class="ar" dir="rtl" lang="ar">${kHl(r.ar, pq, 700)}</div>`;
      if (r.tr) h += `<div class="tr">${kHl(r.tr, pq, 900)}</div>`;
      if (r.derajat) h += `<div class="cit">Keterangan derajat (tertulis di sumber): <b>${esc(r.derajat)}</b></div>`;
      txt = [r.ar, r.tr, r.derajat ? '(' + r.derajat + ')' : ''].filter(Boolean).join('\n');
    }
    h += `<div class="crumb">Sumber: <b>${esc(s.name)}</b> › ${esc(s.file)} › ${esc(r.path)}</div>`;
    let act = `<button class="btn ghost" data-act="kopen" data-i="${r.i}">Buka sumber asli</button>`;
    if (r.src === 'quran') { if (r.jal != null) act += `<button class="btn ghost" data-act="kopen" data-i="${r.jal}">Tafsir Jalalain</button>`; if (r.ik != null) act += `<button class="btn ghost" data-act="kopen" data-i="${r.ik}">Tafsir Ibnu Katsir</button>`; }
    act += `<button class="btn ghost" data-act="kcpq" data-i="${r.i}">Salin kutipan</button>`;
    h += `<div class="actions">${pickBox(X, key, '[' + (x.level === 'utama' ? 'Utama' : 'Pendukung') + '] ' + txt + '\nSumber: ' + KB.ref(r))}${act}</div></div>`;
    return h;
  }
  function supBrosurRef(X, b, sec) {
    const d = b.doc, x = b.res, pq = X.pq; const top = x.locs.slice(0, 2); const key = sec + ':' + d.id;
    const snip = top.map(L => snipHTML(d, L, x, pq, 300)).join('');
    const quote = top.map(L => d.blocks && d.blocks[L.bi] ? d.blocks[L.bi][1] : '').filter(Boolean).join('\n');
    return `<div class="sref${b.level === 'utama' ? '' : ' pend'}"><div class="sh">${lvlPill(b.level)}${pill(d)}<strong>${esc(d.title)}</strong><span>${esc(dateLabel(d))}</span>${d.no ? `<span>No. ${esc(d.no)}</span>` : ''}${b.titleHit ? '<span>judul cocok</span>' : ''}</div><div class="crumb">${crumb(d)}</div><div class="snips">${snip}</div>
      <div class="actions">${pickBox(X, key, '[' + (b.level === 'utama' ? 'Utama' : 'Pendukung') + '] “' + quote + '”\nSumber: ' + refText(d, top[0] ? top[0].bi : null))}<button class="btn ghost" data-act="open" data-id="${esc(d.id)}" data-bi="${top[0] ? top[0].bi : 0}">Buka sumber asli</button>${pdfBtn(d, pageOf(d, top[0] ? top[0].bi : 0), 'ghost', 'PDF asli · hal. ' + pageOf(d, top[0] ? top[0].bi : 0))}</div></div>`;
  }
  function srcLink(src) {
    if (!src) return '';
    return src.type === 'kitab' ? `<button class="srcchip" data-act="kopen" data-i="${src.i}"${src.bi != null ? ` data-bi="${src.bi}"` : ''}>${esc(trunc(src.label, 80))}</button>`
      : `<button class="srcchip" data-act="open" data-id="${esc(src.id)}" data-bi="${src.bi || 0}">${esc(trunc(src.label, 80))}</button>`;
  }
  function kosong(t) { return `<div class="kosong">${esc(t)}</div>`; }
  function renderSupport() {
    const X = S.sup; if (!X) return; const out = $('#sout'); const K0 = X.pack, A = K0.analysis; X.copy = new Map();
    if (K0.empty) { out.innerHTML = `<div class="empty">Tidak ada kata kunci yang bisa dicari dari “${esc(X.q)}”. Kata yang diabaikan: ${esc(A.removed.join(', ') || '-')}. Sebutkan temanya, misalnya “tayamum” atau “keutamaan sabar”.</div>`; return; }
    const c = K0.counts; const tgl = new Date(K0.date).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
    const kw = A.concepts.map(cn => `<span class="kwchip${cn.mod ? ' mod' : ''}" title="${esc('Dicari: ' + cn.main.slice(0, 12).join(', ') + (cn.related.length ? ' · terkait: ' + cn.related.join(', ') : '') + (cn.mod ? ' · kata pelengkap (bukan syarat referensi utama)' : ''))}">${esc(cn.label)}${cn.entry ? ' · kamus' : ''}</span>`).join('') + (A.qrefLabel ? `<span class="kwchip">${esc(A.qrefLabel)}</span>` : '');
    const syn = A.concepts.map(cn => { const alt = cn.main.filter(v => v !== cn.key).slice(0, 8); return `<div><b>${esc(cn.label)}</b>${cn.tema ? ' <span class="crumb">(' + esc(cn.tema) + ')</span>' : ''}: ${alt.length ? esc(alt.join(', ')) : '—'}${cn.related.length ? ` <span class="crumb">· terkait (pendukung): ${esc(cn.related.join(', '))}</span>` : ''}</div>`; }).join('');
    let h = `<div class="suptools"><button class="btn primary" data-act="supcopy2">Salin semua referensi</button><button class="btn" data-act="supsel">Salin bagian terpilih</button><button class="btn ghost" data-act="supall">Pilih / batal pilih semua</button><button class="btn" data-act="supprint">Cetak bahan kajian</button><button class="btn ghost" data-act="supback">Kembali ke pencarian</button></div>`;
    h += `<div class="sup-pack">`;
    // A. Identitas
    h += `<section class="sup-card" id="sa"><h2>A. Identitas materi</h2><dl class="sup-id"><dt>Tema kajian</dt><dd><b>${esc(K0.tema)}</b></dd><dt>Permintaan awal</dt><dd>${esc(X.q)}</dd><dt>Kata kunci</dt><dd>${kw}${A.removed.length ? '<div class="crumb">Kata pengantar yang diabaikan: ' + A.removed.map(w => `<span class="kwchip rm">${esc(w)}</span>`).join('') + '</div>' : ''}</dd><dt>Sinonim & variasi</dt><dd>${syn}</dd><dt>Tanggal pencarian</dt><dd>${esc(tgl)} · ${fmtN(K0.ms)} ms${S.ssrc !== 'all' ? ' · sumber: ' + esc(S.ssrc === 'kitab' ? "Al-Qur'an, hadis, tafsir & materi" : S.ssrc) : ''}</dd></dl></section>`;
    // ringkasan
    const tile = (id, t, v) => `<a href="#${id}"><b>${fmtN(v.utama)}<small style="font-size:12px;color:var(--muted);font-weight:600"> / ${fmtN(v.total)}</small></b><span>${t}</span></a>`;
    h += `<section class="sup-card"><h2>Ringkasan referensi <small>utama / seluruh kecocokan</small></h2><div class="sumtiles">${tile('sc', "Ayat Al-Qur'an", c.quran)}${tile('sd', 'Hadis', c.hadis)}${tile('se', 'Tafsir', c.tafsir)}${tile('sf', 'Materi pelatihan', c.materi)}${tile('sf', 'Arsip CHM', c.chm)}${tile('sf', 'PDF', c.pdf)}</div>
      <div class="crumb" style="margin-top:8px">Angka adalah hasil pencocokan kata, <b>bukan verifikasi relevansi</b>. <b>Utama</b> = memuat semua kata kunci inti atau frasa/rujukan yang dicari. <b>Pendukung</b> = hanya sebagian kata atau istilah terkait. Periksa sumber asli sebelum disampaikan.${X.chmLoading ? ' Arsip CHM masih dimuat; paket diperbarui otomatis.' : ''}</div></section>`;
    // B. Kerangka
    const pk = K0.kerangka;
    h += `<section class="sup-card" id="sb"><h2>B. Kerangka pembahasan <small>dari judul/bab referensi yang ditemukan</small></h2>`;
    if (!pk.pokok.length) h += kosong('Judul atau bab yang memuat kata kunci belum ditemukan — kerangka perlu disusun oleh penyusun materi.');
    else {
      h += `<ol class="kerangka">${pk.pokok.map((p0, i) => `<li><b>Pokok bahasan ${i + 1}: ${esc(p0.text)}</b><div class="srclist">${p0.srcs.slice(0, 4).map(srcLink).join('')}</div></li>`).join('')}</ol>`;
      X.copy.set('kerangka', pk.pokok.map((p0, i) => `${i + 1}. ${p0.text} (sumber: ${p0.srcs.slice(0, 3).map(s => s.label).join('; ')})`).join('\n') + (pk.subtema.length ? '\nSubtema pendukung: ' + pk.subtema.map(s => s.text).join('; ') : ''));
      if (pk.subtema.length) h += `<div class="subh">Subtema pendukung</div><ul>${pk.subtema.map(s => `<li>${esc(s.text)} <span class="srclist" style="display:inline-flex">${s.srcs.slice(0, 2).map(srcLink).join('')}</span></li>`).join('')}</ul>`;
      h += `<div class="actions">${pickBox(X, 'kerangka', X.copy.get('kerangka'))}</div>`;
    }
    h += `</section>`;
    // C. Al-Qur'an
    h += `<section class="sup-card" id="sc"><h2>C. Referensi Al-Qur'an <small>${fmtN(c.quran.utama)} utama · ${fmtN(c.quran.total)} kecocokan</small></h2>`;
    h += K0.quran.length ? K0.quran.map(x => supKitabRef(X, x, 'q')).join('') : kosong("Referensi belum ditemukan: tidak ada ayat/terjemahan yang memuat kata kunci.");
    if (K0.cited.ayat.length) h += `<div class="subh">Ayat yang dikutip di brosur yang cocok</div><div class="srclist">${K0.cited.ayat.map(g => `<button class="srcchip" data-act="kayat" data-s="${g.s}" data-a="${g.a1}" title="${esc('dikutip di: ' + g.docs.map(z => z.doc.title).join('; '))}">QS. ${esc(P.surahLabel(g.s))} ${g.s}:${g.a1}${g.a2 > g.a1 ? '-' + g.a2 : ''} · ${g.docs.length} brosur</button>`).join('')}</div>`;
    h += `</section>`;
    // D. Hadis
    h += `<section class="sup-card" id="sd"><h2>D. Referensi hadis <small>${fmtN(c.hadis.utama)} utama · ${fmtN(c.hadis.total)} kecocokan</small></h2><div class="crumb" style="margin-bottom:6px">Derajat hadis hanya ditampilkan bila tertulis di sumber. Hadis yang sama dari beberapa file yang teksnya identik digabung dan sumbernya tetap tercantum.</div>`;
    h += K0.hadis.length ? K0.hadis.map(x => supKitabRef(X, x, 'h')).join('') : kosong('Referensi hadis belum ditemukan.');
    if (K0.cited.hadits.length) h += `<div class="subh">Hadits yang dikutip di brosur yang cocok (rujukan sesuai tulisan brosur)</div>` + K0.cited.hadits.slice(0, 6).map((hd, k) => { const key = 'hb:' + k; return `<div class="sref"><div class="sh">${pill(hd.doc)}<strong>${esc(hd.perawi)}</strong><span>${esc(shortDate(hd.doc))} · ${esc(trunc(hd.doc.title, 60))}</span></div>${hd.ar ? `<div class="ar" dir="rtl" lang="ar">${esc(trunc(hd.ar, 600))}</div>` : ''}<div class="tr">${hlText(trunc(hd.text, 900), X.pq)}</div><div class="actions">${pickBox(X, key, (hd.ar ? hd.ar + '\n' : '') + hd.text + '\nSumber: ' + refText(hd.doc, hd.bi))}<button class="btn ghost" data-act="open" data-id="${esc(hd.doc.id)}" data-bi="${hd.bi}">Buka sumber asli</button></div></div>`; }).join('');
    h += `</section>`;
    // E. Tafsir & kitab
    h += `<section class="sup-card" id="se"><h2>E. Referensi tafsir dan kitab <small>${fmtN(c.tafsir.utama)} utama · ${fmtN(c.tafsir.total)} kecocokan</small></h2>`;
    h += K0.tafsir.length ? K0.tafsir.map(x => supKitabRef(X, x, 't')).join('') : kosong('Referensi tafsir belum ditemukan.');
    h += `</section>`;
    // F. CHM & PDF
    h += `<section class="sup-card" id="sf"><h2>F. Referensi CHM dan PDF</h2>`;
    h += `<div class="subh">Materi Pelatihan Gurda 2142 (CHM) · ${fmtN(c.materi.utama)} utama / ${fmtN(c.materi.total)}</div>` + (K0.materi.length ? K0.materi.map(x => supKitabRef(X, x, 'm')).join('') : kosong('Tidak ada halaman materi pelatihan yang cocok.'));
    h += `<div class="subh">Arsip CHM Brosur Ahad Pagi · ${fmtN(c.chm.utama)} utama / ${fmtN(c.chm.total)}</div>` + (K0.chm.length ? K0.chm.map(b => supBrosurRef(X, b, 'c')).join('') : kosong(S.ssrc === 'kitab' ? 'Arsip CHM tidak disertakan (filter sumber).' : 'Tidak ada brosur arsip CHM yang cocok.'));
    h += `<div class="subh">Brosur PDF · ${fmtN(c.pdf.utama)} utama / ${fmtN(c.pdf.total)}</div>` + (K0.pdf.length ? K0.pdf.map(b => supBrosurRef(X, b, 'p')).join('') : kosong(LIB.pdfState === 'ready' || LIB.pdfState === 'none' ? 'Tidak ada brosur PDF yang cocok.' : 'Brosur PDF belum dimuat.'));
    h += `</section>`;
    // G. Urutan penyampaian
    h += `<section class="sup-card" id="sg"><h2>G. Urutan penyampaian materi <small>disusun dari referensi di atas — tanpa tambahan isi</small></h2><ol class="urut">`;
    const gtxt = [];
    for (const u of K0.urutan) {
      let body = '', t = '';
      if (u.isi && u.isi.length && (u.isi[0].text != null)) { body = u.isi.map(z => `<div class="sref"><div class="tr">“${hlText(trunc(z.text, 700), X.pq)}”</div><div class="srclist">${srcLink(z.src)}</div></div>`).join(''); t = u.isi.map(z => '“' + z.text + '” (' + z.src.label + ')').join('\n'); }
      else if (u.ref) {
        const items = (u.isi || []).map(x => { const r = K0.recs.get(x.i); return r ? { label: r.src === 'quran' ? 'QS. ' + surahName(r) + ' (' + r.s + '): ' + r.a : kTitle(r) + (r.no ? ' No. ' + r.no : ''), i: x.i } : null; }).filter(Boolean);
        const cited = (u.cited || []).map(g => g.s ? { label: 'QS. ' + P.surahLabel(g.s) + ' ' + g.s + ':' + g.a1 + ' (dikutip ' + g.docs.length + ' brosur)', s: g.s, a: g.a1 } : { label: g.perawi + ' — ' + trunc(g.doc.title, 50), id: g.doc.id, bi: g.bi });
        if (items.length || cited.length) { body = `<div class="srclist">${items.map(z => `<button class="srcchip" data-act="kopen" data-i="${z.i}">${esc(z.label)}</button>`).join('')}${cited.map(z => z.s ? `<button class="srcchip" data-act="kayat" data-s="${z.s}" data-a="${z.a}">${esc(z.label)}</button>` : `<button class="srcchip" data-act="open" data-id="${esc(z.id)}" data-bi="${z.bi}">${esc(z.label)}</button>`).join('')}</div>`; t = items.concat(cited).map(z => '- ' + z.label).join('\n'); }
      } else if (u.poin) {
        if (u.poin.length) { body = `<ul>${u.poin.map(p0 => `<li>${esc(p0.text)} <span class="srclist" style="display:inline-flex">${srcLink(p0.srcs[0])}</span></li>`).join('')}</ul>`; t = u.poin.map(p0 => '- ' + p0.text).join('\n'); }
      }
      if (!body) { body = kosong(u.kosong); t = '[' + u.kosong + ']'; }
      h += `<li><h3>${esc(u.judul)}</h3>${body}</li>`;
      gtxt.push(u.no + '. ' + u.judul.toUpperCase() + '\n' + t);
    }
    h += `</ol>`;
    X.copy.set('urutan', gtxt.join('\n\n'));
    h += `<div class="actions">${pickBox(X, 'urutan', X.copy.get('urutan'))}</div></section>`;
    h += `<div class="note">Paket ini disusun otomatis oleh aplikasi dari kutipan sumber (tanpa AI). Aplikasi tidak menulis tafsir, hadis, atau kesimpulan baru. Bagian bertanda kuning perlu dilengkapi penyusun materi. Jika dua sumber berbeda pendapat, keduanya ditampilkan apa adanya.</div>`;
    h += `</div>`;
    out.innerHTML = h;
  }
  function supHeader(X) {
    const K0 = X.pack, A = K0.analysis;
    return `BAHAN KAJIAN — ${K0.tema}\nPermintaan: ${X.q}\nKata kunci: ${A.concepts.map(c => c.label).join(', ')}${A.removed.length ? ' (diabaikan: ' + A.removed.join(', ') + ')' : ''}\nTanggal: ${new Date(K0.date).toLocaleString('id-ID')}\nDisusun dari Pustaka Referensi MTA tanpa AI — hanya kutipan sumber; periksa sumber asli. [Utama] = memuat semua kata kunci inti; [Pendukung] = sebagian/istilah terkait.\n`;
  }
  function supCopy(selectedOnly) {
    const X = S.sup; if (!X) return;
    let keys = Array.from(X.copy.keys());
    if (selectedOnly) { keys = $$('#sout input.pick').filter(x => x.checked).map(x => x.dataset.key); if (!keys.length) { toast('Belum ada bagian yang dipilih'); return; } }
    const groups = [['kerangka', 'B. KERANGKA PEMBAHASAN'], ['q:', "C. REFERENSI AL-QUR'AN"], ['h:', 'D. REFERENSI HADIS'], ['hb:', 'D. HADITS YANG DIKUTIP DI BROSUR'], ['t:', 'E. TAFSIR DAN KITAB'], ['m:', 'F. MATERI PELATIHAN (CHM)'], ['c:', 'F. ARSIP CHM'], ['p:', 'F. BROSUR PDF'], ['urutan', 'G. URUTAN PENYAMPAIAN']];
    let t = supHeader(X);
    for (const [pre, title] of groups) {
      const ks = keys.filter(k => k === pre || (pre.endsWith(':') && k.startsWith(pre))); if (!ks.length) continue;
      t += '\n' + title + '\n' + ks.map((k, i) => (pre.endsWith(':') ? (i + 1) + '. ' : '') + X.copy.get(k)).join('\n\n') + '\n';
    }
    copy(t);
  }
  function supPrint() {
    if (!S.sup) return;
    document.body.classList.add('print-sup');
    const off = () => { document.body.classList.remove('print-sup'); window.removeEventListener('afterprint', off); };
    window.addEventListener('afterprint', off); setTimeout(() => { try { window.print(); } catch (e) { } setTimeout(off, 1500); }, 50);
  }
  function supBack() {
    const X = S.sup; const A = X && X.pack.analysis; const q = X ? (A.concepts.length ? A.concepts.map(c => c.label).join(' ') : X.q) : '';
    setTab('cari'); setSrc('all'); $('#q').value = q; S.q = q; $('#qClear').hidden = !q; if (q) runSearch(); window.scrollTo({ top: 0 });
  }
  /* ---------- editor kamus kata kunci ---------- */
  let kmEditing = null;
  function openKamus() { renderKamus(); showDrawer($('#kamus')); }
  function renderKamus(msg) {
    if (!SUP) return;
    const k = SUP.kamus(); const loc = SUP.local(); const nLoc = Object.keys(loc.entri || {}).length + (loc.hapus || []).length + (loc.abaikanTambah || []).length + (loc.abaikanHapus || []).length;
    const f = ($('#kmFilter') && $('#kmFilter').value) || '';
    const fn = P.norm(f);
    const list = k.entri.filter(e => !fn || P.norm([e.kata, e.tema].concat(e.sinonim || [], e.terkait || []).join(' ')).includes(fn)).sort((a, b) => (a.tema || '').localeCompare(b.tema || '') || a.kata.localeCompare(b.kata));
    const e = kmEditing && kmEditing !== 'baru' ? k.entri.find(x => x.id === kmEditing) : null;
    const adminNote = (typeof SB !== 'undefined' && SB.conf && !SB.admin) ? ' Anda belum masuk sebagai admin: perubahan tetap bisa dicoba di browser ini, tetapi penerbitan untuk semua pengguna dilakukan admin.' : '';
    let h = `<div class="dhead"><div class="row"><h2>Kamus kata kunci — Mode Support Ustadz</h2><button class="btn ghost" data-act="close" aria-label="Tutup">✕ Tutup</button></div>
      <div class="crumb">Sumber kamus: file <b>data/kamus_support.js</b> (versi ${esc(k.versi || '-')}, ${fmtN(k.entri.length)} entri) + perubahan di browser ini (${fmtN(nLoc)}). Perubahan langsung dipakai di browser ini. Agar berlaku untuk semua Support Ustadz: <b>Unduh kamus_support.js</b> → timpa file di repository → Commit & Push.${esc(adminNote)}</div>
      <div class="actions"><button class="btn primary" data-act="kmnew">+ Tambah entri</button><button class="btn" data-act="kmexport">Unduh kamus_support.js</button><label class="btn ghost" style="cursor:pointer">Impor file kamus<input type="file" id="kmImport" accept=".js,.json" hidden></label><button class="btn ghost" data-act="kmreset">Batalkan semua perubahan lokal</button></div></div><div class="dbody">`;
    if (msg) h += `<div class="qmsg ${msg[0]}">${esc(msg[1])}</div>`;
    h += `<div class="qitem"><div class="qh"><b>Uji pencarian</b><span>lihat cara aplikasi memahami permintaan & jumlah referensi yang ditemukan</span></div><div class="fgrid"><label class="wide">Permintaan<input id="kmTestQ" placeholder="mis. Tolong carikan materi shalat malam" value="${esc(($('#kmTestQ') && $('#kmTestQ').value) || '')}"></label></div><div class="actions" style="border:0;margin:0;padding:0"><button class="btn" data-act="kmtest">Uji</button></div><div id="kmTestOut"></div></div>`;
    if (kmEditing) {
      const v = e || { kata: '', tema: '', sinonim: [], terkait: [] };
      h += `<div class="qitem"><div class="qh"><b>${e ? 'Ubah entri' : 'Entri baru'}</b><span>${e ? 'asal: ' + (e.asal === 'lokal' ? 'perubahan lokal' : 'file kamus') : ''}</span></div><div class="fgrid">
        <label>Kata kunci utama (kata/frasa)<input id="kmKata" value="${esc(v.kata)}" placeholder="mis. shalat malam"></label>
        <label>Kelompok tema<input id="kmTema" value="${esc(v.tema || '')}" placeholder="mis. Shalat sunnah" list="kmTemaList"></label>
        <label class="wide">Sinonim / makna sama — dipisah koma (menjadi referensi UTAMA)<input id="kmSin" value="${esc((v.sinonim || []).join(', '))}" placeholder="qiyamul lail, tahajud"></label>
        <label class="wide">Istilah terkait — dipisah koma (hanya referensi PENDUKUNG)<input id="kmTer" value="${esc((v.terkait || []).join(', '))}" placeholder="witir, tarawih"></label></div>
        <datalist id="kmTemaList">${Array.from(new Set(k.entri.map(x => x.tema).filter(Boolean))).sort().map(t => `<option value="${esc(t)}">`).join('')}</datalist>
        <div class="actions" style="border:0;margin:0;padding:0"><button class="btn primary" data-act="kmsave">Simpan</button><button class="btn ghost" data-act="kmedit" data-id="">Batal</button></div>
        <div class="crumb">Perluas seperlunya. Sinonim yang terlalu umum membuat referensi tidak relevan ikut dianggap utama.</div></div>`;
    }
    h += `<div class="qitem"><div class="qh"><b>Kata pengantar (diabaikan saat mencari)</b><span>${fmtN(k.abaikan.length)} kata</span></div><div class="fgrid"><label class="wide">Kata (pisahkan dengan koma)<input id="kmAb" placeholder="mis. tolong, carikan"></label></div><div class="actions" style="border:0;margin:0;padding:0"><button class="btn" data-act="kmab" data-op="add">Tambahkan ke daftar</button><button class="btn ghost" data-act="kmab" data-op="del">Hapus dari daftar</button></div><details class="pv"><summary>Lihat daftar</summary><div>${esc(k.abaikan.join(', '))}</div></details></div>`;
    h += `<div class="qitem"><div class="qh"><b>Entri kamus</b><span>${fmtN(list.length)} dari ${fmtN(k.entri.length)}</span></div><input id="kmFilter" placeholder="Saring kata/tema…" value="${esc(f)}" style="border:1px solid var(--line);border-radius:8px;padding:7px 10px;background:var(--bg);color:var(--ink)">`;
    h += list.map(x => `<div class="kmrow"><div><b>${esc(x.kata)}</b> <span class="crumb">${esc(x.tema || 'tanpa tema')}${x.asal === 'lokal' ? ' · diubah di browser ini' : ''}</span><div class="m">Sinonim: ${esc((x.sinonim || []).join(', ') || '—')}</div><div class="m">Terkait: ${esc((x.terkait || []).join(', ') || '—')}</div></div><div><button class="btn ghost" data-act="kmedit" data-id="${esc(x.id)}">Ubah</button><button class="btn ghost" data-act="kmdel" data-id="${esc(x.id)}">Hapus</button></div></div>`).join('');
    h += `</div></div>`;
    $('#kamus').innerHTML = h;
    const fi = $('#kmFilter'); if (fi) fi.addEventListener('input', () => { const pos = fi.selectionStart; renderKamus(); const f2 = $('#kmFilter'); f2.focus(); try { f2.setSelectionRange(pos, pos); } catch (e2) { } });
    const im = $('#kmImport'); if (im) im.addEventListener('change', ev => kamusImport(ev.target.files[0]));
  }
  function splitList(v) { return String(v || '').split(/[,;\n]/).map(x => x.trim()).filter(Boolean); }
  function kamusEdit(id) { kmEditing = id === null ? 'baru' : (id || null); renderKamus(); }
  function kamusSave() {
    const kata = $('#kmKata').value.trim(); if (!kata) { renderKamus(['err', 'Kata kunci utama wajib diisi.']); return; }
    const loc = SUP.local(); const id = kmEditing && kmEditing !== 'baru' ? kmEditing : P.norm(kata).replace(/\s+/g, '-') + '-' + Date.now().toString(36).slice(-4);
    loc.entri = loc.entri || {}; loc.entri[id] = { kata, tema: $('#kmTema').value.trim(), sinonim: splitList($('#kmSin').value), terkait: splitList($('#kmTer').value) };
    loc.hapus = (loc.hapus || []).filter(x => x !== id);
    SUP.saveLocal(loc); kmEditing = null; renderKamus(['ok', 'Tersimpan di browser ini. Unduh kamus_support.js untuk menerbitkannya.']);
  }
  function kamusDel(id) {
    const loc = SUP.local(); const base = (SUP.base().entri || []).some(e => e.id === id);
    if (loc.entri && loc.entri[id]) delete loc.entri[id];
    if (base) { loc.hapus = loc.hapus || []; if (!loc.hapus.includes(id)) loc.hapus.push(id); }
    SUP.saveLocal(loc); if (kmEditing === id) kmEditing = null; renderKamus(['ok', 'Entri dihapus (di browser ini).']);
  }
  function kamusAbaikan(op) {
    const ws = splitList($('#kmAb').value).map(w => w.toLowerCase()); if (!ws.length) return;
    const loc = SUP.local(); loc.abaikanTambah = loc.abaikanTambah || []; loc.abaikanHapus = loc.abaikanHapus || [];
    for (const w of ws) { if (op === 'add') { if (!loc.abaikanTambah.includes(w)) loc.abaikanTambah.push(w); loc.abaikanHapus = loc.abaikanHapus.filter(x => x !== w); } else { if (!loc.abaikanHapus.includes(w)) loc.abaikanHapus.push(w); loc.abaikanTambah = loc.abaikanTambah.filter(x => x !== w); } }
    SUP.saveLocal(loc); renderKamus(['ok', (op === 'add' ? 'Ditambahkan: ' : 'Dihapus dari daftar: ') + ws.join(', ')]);
  }
  function kamusExport() { downloadBlob(new Blob([SUP.exportJs()], { type: 'text/javascript' }), 'kamus_support.js'); toast('kamus_support.js diunduh'); }
  function kamusReset() { SUP.resetLocal(); kmEditing = null; renderKamus(['ok', 'Perubahan lokal dibatalkan; kamus kembali sesuai file.']); }
  function kamusImport(file) {
    if (!file) return;
    file.text().then(t => {
      const i = t.indexOf('{'), j = t.lastIndexOf('}'); const o = JSON.parse(t.slice(i, j + 1));
      if (!o || !Array.isArray(o.entri)) throw new Error('format tidak dikenali');
      const base = SUP.base(); const baseIds = new Set((base.entri || []).map(e => e.id));
      const loc = { entri: {}, hapus: [], abaikanTambah: [], abaikanHapus: [], ejaanTambah: [] };
      for (const e of o.entri) if (e && e.kata) loc.entri[e.id || P.norm(e.kata).replace(/\s+/g, '-')] = { kata: e.kata, tema: e.tema || '', sinonim: e.sinonim || [], terkait: e.terkait || [] };
      for (const id of baseIds) if (!loc.entri[id]) loc.hapus.push(id);
      const bab = new Set(base.abaikan || []), oab = new Set(o.abaikan || []);
      loc.abaikanTambah = Array.from(oab).filter(w => !bab.has(w)); loc.abaikanHapus = Array.from(bab).filter(w => !oab.has(w));
      SUP.saveLocal(loc); renderKamus(['ok', 'Kamus diimpor: ' + o.entri.length + ' entri (disimpan di browser ini).']);
    }).catch(e => renderKamus(['err', 'Impor gagal: ' + e.message + '. Gunakan file hasil "Unduh kamus_support.js".']));
  }
  function kamusTest() {
    const q = ($('#kmTestQ').value || '').trim(); const box = $('#kmTestOut'); if (!q) return;
    const A = SUP.analyze(q);
    box.innerHTML = `<div class="crumb" style="margin-top:8px">Diabaikan: ${esc(A.removed.join(', ') || '—')}</div>` + A.concepts.map(c => `<div class="kmrow"><div><b>${esc(c.label)}</b> ${c.entry ? '<span class="kwchip">kamus</span>' : '<span class="kwchip mod">kata biasa</span>'}${c.mod ? '<span class="kwchip mod">pelengkap</span>' : ''}<div class="m">Dicari (utama): ${esc(c.main.join(', '))}${c.stem.length ? ' · bentuk dasar: ' + esc(c.stem.join(', ')) : ''}</div><div class="m">Terkait (pendukung): ${esc(c.related.join(', ') || '—')}</div></div></div>`).join('') + '<div class="crumb">Menghitung referensi…</div>';
    (window.PRMK ? kitabInit() : Promise.resolve()).then(() => SUP.run(q, { docs: LIB.docs, withKitab: !!KST.meta })).then(pk => {
      if (pk.empty) { box.lastElementChild.textContent = 'Tidak ada kata kunci yang bisa dicari.'; return; }
      const c = pk.counts; const f = v => `${fmtN(v.utama)} utama / ${fmtN(v.total)}`;
      box.lastElementChild.innerHTML = `<b>Hasil uji:</b> Al-Qur'an ${f(c.quran)} · Hadis ${f(c.hadis)} · Tafsir ${f(c.tafsir)} · Materi ${f(c.materi)} · Arsip CHM ${f(c.chm)} · PDF ${f(c.pdf)} · kerangka: ${esc(pk.kerangka.pokok.map(p0 => p0.text).join(' | ') || '—')} (${fmtN(pk.ms)} ms)`;
    });
  }
