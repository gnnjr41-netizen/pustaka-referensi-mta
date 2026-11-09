"""Tambahkan Pustaka Kitab ke index.html tanpa mengubah fitur lama. Setiap penggantian diverifikasi tepat satu kali."""
import sys, re
APP = sys.argv[1]
p = APP + '/index.html'
s = open(p, encoding='utf-8').read()
orig = s
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit('pola ditemukan %d kali (harus %d):\n%s' % (n, count, old[:200]))
    s = s.replace(old, new)

# ---- CSS ----
rep("--ayat: #0C6A53; --ayat-soft: #E3F2EC;", "--ayat: #0C6A53; --ayat-soft: #E3F2EC; --qred: #C62828;")
rep("--ayat: #5FD0AC; --ayat-soft: #15302A;", "--ayat: #5FD0AC; --ayat-soft: #15302A; --qred: #FF8A80;", 2)
css = """/* pustaka kitab */
.pill.t { color: var(--chm); background: var(--chm-soft); }
.pill.m { color: var(--pdf); background: var(--pdf-soft); } .kres.materi { border-left: 4px solid var(--pdf); }
.kres .ar { margin: 8px 0 4px; overflow-wrap: anywhere; }
.kres .tr { font-family: var(--f-read); font-size: 15px; line-height: 1.65; margin: 6px 0; overflow-wrap: anywhere; }
.kres .cit { font-size: 12.5px; color: var(--muted); margin-top: 4px; overflow-wrap: anywhere; }
.kres h3 { font-size: 16px; margin: 6px 0 2px; line-height: 1.35; }
.kres.quran { border-left: 4px solid var(--ayat); } .kres.hadis { border-left: 4px solid var(--hadits); } .kres.tafsir { border-left: 4px solid var(--chm); }
.krel { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 8px; font-size: 12.5px; color: var(--muted); }
.qimg { background: #FFFFFF; border: 1px solid var(--line); border-radius: 9px; padding: 6px 8px; margin: 8px 0; text-align: right; overflow: hidden; }
.qimg img { max-width: 100%; height: auto; display: inline-block; vertical-align: middle; }
.qimg.big img { width: 100%; }
.qred { color: var(--qred); }
.dj { color: var(--ok); background: var(--accent-soft); border-radius: 999px; padding: 1px 8px; font-weight: 700; }
.ksec { margin: 4px 0 18px; }
.ksh { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin: 12px 2px 8px; flex-wrap: wrap; }
.ksh h2 { font-size: 18px; margin: 0; } .ksh h2 small { font-size: 13px; color: var(--muted); font-weight: 600; }
.brhead { margin-top: 22px; border-top: 1px solid var(--line); padding-top: 14px; }
.kcounts { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 2px 0 12px; }
.kcounts button { border: 1px solid var(--line); background: var(--surface); border-radius: 999px; padding: 5px 12px; font-size: 13px; font-weight: 600; color: var(--muted); }
.kcounts button b { color: var(--ink); } .kcounts button:disabled { opacity: .5; } .kcounts .sub { color: var(--faint); font-size: 12px; }
.klab { font-family: var(--f-ui); font-size: 11.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--faint); margin: 14px 0 4px; }
select.sel.kpick { max-width: 210px; }
.tlbadge { display: inline-block; margin: 6px 0 0; font-size: 12px; font-weight: 700; color: var(--ayat); background: var(--ayat-soft); border-radius: 999px; padding: 2px 10px; }
@media (max-width: 720px) {"""
rep("@media (max-width: 720px) {", css)

# ---- script modul kitab ----
rep("<script>\n(function () {\n  'use strict';\n  const BUILD", "<script src=\"data/lib/kitab.js\"></script>\n<script>\n(function () {\n  'use strict';\n  const BUILD")

# ---- filter sumber ----
old_f = """        <button class="chip" data-src="all" aria-pressed="true">Semua</button>
        <button class="chip" data-src="CHM" aria-pressed="false">Arsip CHM</button>
        <button class="chip" data-src="PDF" aria-pressed="false">Brosur PDF</button>
      </div>"""
new_f = """        <button class="chip" data-src="all" aria-pressed="true">Semua</button>
        <button class="chip" data-src="k:quran" aria-pressed="false">Al-Qur'an</button>
        <button class="chip" data-src="k:hadis" aria-pressed="false">Hadis</button>
        <button class="chip" data-src="k:tafsir" aria-pressed="false">Tafsir</button>
        <button class="chip" data-src="CHM" aria-pressed="false" title="Brosur dan referensi lama (arsip CHM)">Arsip CHM</button>
        <button class="chip" data-src="PDF" aria-pressed="false" title="PDF dan dokumen lainnya">Brosur PDF</button>
        <select class="sel kpick" id="ksrc" aria-label="Kitab tertentu"><option value="">Kitab tertentu…</option>
          <optgroup label="Per file sumber"><option value="k:bulughul">Bulughul Maram</option><option value="k:kitab9">Kitab 9 Imam</option><option value="k:bukhari">Shahih Bukhari</option><option value="k:muslim">Shahih Muslim</option><option value="k:abudaud">Sunan Abu Dawud</option><option value="k:ibnumajah">Sunan Ibnu Majah</option><option value="k:tirmidzi">Sunan Tirmidzi</option><option value="k:nasai">Sunan An-Nasa'i</option><option value="k:darimi">Sunan Ad-Darimi</option><option value="k:riyadh">Riyadhus Shalihin</option><option value="k:ibnukatsir">Tafsir Ibnu Katsir</option><option value="k:jalalain">Tafsir Jalalain</option><option value="k:qtema">Indeks tema Al-Qur'an</option><option value="k:gurda">Pelatihan Gurda 2142 (materi)</option></optgroup>
          <optgroup label="Per imam (gabungan semua file)"><option value="c:bukhari">Riwayat Bukhari</option><option value="c:muslim">Riwayat Muslim</option><option value="c:abudaud">Riwayat Abu Dawud</option><option value="c:tirmidzi">Riwayat Tirmidzi</option><option value="c:nasai">Riwayat An-Nasa'i</option><option value="c:ibnumajah">Riwayat Ibnu Majah</option><option value="c:darimi">Riwayat Ad-Darimi</option><option value="c:ahmad">Musnad Ahmad</option><option value="c:malik">Muwaththa' Malik</option></optgroup>
        </select>
      </div>"""
rep(old_f, new_f)
rep("""<p class="hint">Satu kolom untuk arsip CHM dan semua brosur PDF. Bisa sebagian kata, <code>"frasa persis"</code>, <code>Al-Baqarah 153</code>, <code>QS 2:153</code>, <code>HR. Muslim</code>, atau <code>-kata</code> untuk mengecualikan.</p>""",
    """<p class="hint">Satu kolom untuk Al-Qur'an, tafsir, kitab hadis, arsip CHM dan semua brosur PDF. Bisa sebagian kata, <code>"frasa persis"</code>, <code>Al-Baqarah 153</code>, <code>QS 2:153</code>, <code>Bukhari 52</code>, teks Arab dengan/tanpa harakat, ayat dalam huruf Latin (<code>bismillahirrahmanirrahim</code>), <code>HR. Muslim</code>, atau <code>-kata</code> untuk mengecualikan.</p>""")
rep('placeholder="Cari kata, kalimat, ayat, hadits… contoh: tawakkal"', 'placeholder="Cari kata, kalimat, ayat, hadits, teks Arab… contoh: tawakkal"')

# ---- state ----
rep("const S = { tab: 'cari', q: '', src: 'all',", "const S = { kShown: 20, kb: null, tab: 'cari', q: '', src: 'all',")

# ---- status ----
rep("""    let s = (LIB.chmReady ? 'Indeks siap · ' : 'Memuat indeks · ') + chm + ' + ' + pdf;""",
    """    let s = (LIB.chmReady ? 'Indeks siap · ' : 'Memuat indeks · ') + chm + ' + ' + (KST.meta ? fmtN(KST.meta.N) + ' ayat, tafsir & hadis + ' : KST.err ? '(kitab tidak termuat) + ' : '') + pdf;""")

# ---- runSearch ----
old_rs = s[s.index('  function runSearch(soft) {'):s.index('  function renderMain() {')]
new_rs = """  function runSearch(soft) {
    const q = S.q.trim();
    if (q.length < 2) { S.last = null; renderMain(); return; }
    S.browse = null; S.kb = null;
    const pq = P.parseQuery(q, { stem: S.broad });
    if (!pq.groups.length && !pq.qref) { S.last = { pq, r: { results: [] }, ms: 0, empty: 'Kata yang diketik terlalu umum. Tambahkan kata yang lebih spesifik.' }; renderMain(); return; }
    const mode = srcMode();
    const t0 = performance.now();
    const r = mode === 'kitab' ? { results: [], maxCov: 0 } : P.search(LIB.docs, pq, { whole: S.whole, filter: filterFn(S.src) });
    if (S.sort === 'new') r.results.sort((a, b) => (b.doc.date || '').localeCompare(a.doc.date || ''));
    if (S.sort === 'old') r.results.sort((a, b) => (a.doc.date || '9').localeCompare(b.doc.date || '9'));
    const ms = performance.now() - t0;
    if (!soft) { S.shownDocs = 30; S.shownLocs = 60; S.kShown = 20; S.mkShown = 10; }
    const kkey = JSON.stringify([q, S.src, S.whole, S.broad]);
    const keep = soft && S.last && S.last.kkey === kkey;
    const prev = keep ? S.last : null;
    S.last = { pq, r, ms, seq: keep ? prev.seq : ++KST.seq, kkey, k: keep ? prev.k : null, kerr: keep ? prev.kerr : null, mk: keep ? prev.mk : null };
    renderMain();
    if (mode !== 'brosur' && !keep) kSearchFor(pq, S.last.seq);
  }
"""
s = s.replace(old_rs, new_rs)

# ---- renderMain → renderMain + brosurHTML ----
a = s.index('  function renderMain() {'); b = s.index('  function actionsHTML(d, bi, extra) {')
old_rm = s[a:b]
body = old_rm
body = body.replace("""  function renderMain() {
    if (S.tab !== 'cari') return;
    const out = $('#out');
    if (S.browse) return renderBrowse(out);
    if (!S.last) return renderHome(out);
    const { pq, r, ms } = S.last;
    if (S.last.empty) { out.innerHTML = `<div class="empty">${esc(S.last.empty)}</div>`; return; }
    const res = r.results;""", """  function renderMain() {
    if (S.tab !== 'cari') return;
    const out = $('#out');
    if (S.kb) { renderKBrowse(out); return; }
    if (S.browse) return renderBrowse(out);
    if (!S.last) return renderHome(out);
    const { pq } = S.last;
    if (S.last.empty) { out.innerHTML = `<div class="empty">${esc(S.last.empty)}</div>`; return; }
    const mode = srcMode();
    let h = '';
    if (mode === 'all') h += kSummaryHTML();
    if (mode !== 'brosur') h += kitabHTML(mode, pq);
    if (mode !== 'kitab') h += (mode === 'all' ? '<div class="ksh brhead"><h2>Brosur & dokumen <small>Arsip CHM + PDF</small></h2></div>' : '') + brosurHTML();
    out.innerHTML = h;
  }
  function brosurHTML() {
    const { pq, r, ms } = S.last;
    const res = r.results;""")
body = body.replace("""      out.innerHTML = h; return;
    }
    if (S.view === 'doc') {""", """      return h;
    }
    if (S.view === 'doc') {""")
_k = body.rindex("""    out.innerHTML = h;
  }
""")
body = body[:_k] + """    return h;
  }
""" + body[_k + len("""    out.innerHTML = h;
  }
"""):]
assert body.count('out.innerHTML') == 2, body.count('out.innerHTML')
s = s[:a] + body + s[b:]

# ---- beranda ----
rep("""      <div class="stat"><b>${fmtN(LIB.docs.length)}</b><span>dokumen dalam satu indeks</span></div>""",
    """      <div class="stat"><b>${fmtN(LIB.docs.length + (KST.meta ? KST.meta.N : 0))}</b><span>brosur, ayat, tafsir & hadis dalam satu pencarian</span></div>""")
rep("""['tawakkal', 'keutamaan sabar', 'Al-Baqarah 183', '"laa haula walaa quwwata"', 'HR. Bukhari', 'shalat tahajjud', 'لَا حَوْلَ']""",
    """['tawakkal', 'keutamaan sabar', 'Al-Baqarah 183', '"laa haula walaa quwwata"', 'Bukhari 52', 'bismillahirrahmanirrahim', 'إنما الأعمال بالنيات', 'shalat tahajjud', 'لَا حَوْلَ']""")
rep("""    h += `</div><div class="sec"><h2>Jelajahi per tahun</h2><div class="years">${yearButtons()}</div></div>`;
    out.innerHTML = h;""", """    h += `</div><div class="sec"><h2>Jelajahi per tahun</h2><div class="years">${yearButtons()}</div></div>`;
    h += kHomeHTML();
    out.innerHTML = h;""")

# ---- modul UI kitab (sebelum events) ----
ui = open(sys.argv[2], encoding='utf-8').read()
rep("  /* ---------------- events ---------------- */", ui + "\n  /* ---------------- events ---------------- */")

# ---- events filter ----
rep("""    if (b.dataset.src) { S.src = b.dataset.src; $$('[data-src]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }""",
    """    if (b.dataset.src) { S.src = b.dataset.src; $$('#filters [data-src]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); $('#ksrc').value = ''; }""")
rep("""  ['y0', 'y1'].forEach(k =>""", """  function setSrc(v) {
    S.src = v; $$('#filters [data-src]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.src === v)));
    const sel = $('#ksrc'); sel.value = Array.from(sel.options).some(o => o.value === v) ? v : '';
  }
  $('#ksrc').addEventListener('change', e => { setSrc(e.target.value || 'all'); runSearch(); });
  ['y0', 'y1'].forEach(k =>""")

# ---- aksi klik ----
rep("""      case 'open': if (pv)""", """      case 'kopen': openKitab(el.dataset.i, el.dataset.bi); break;
      case 'kcpq': kCopy(el.dataset.i, true); break;
      case 'kcpr': kCopy(el.dataset.i, false); break;
      case 'kayat': kOpenAyat(+el.dataset.s, +el.dataset.a); break;
      case 'ksrc': closeDrawers(); setTab('cari'); setSrc(el.dataset.src); S.kb = null; if (S.q.trim().length >= 2) runSearch(); else { renderMain(); $('#q').focus(); } window.scrollTo({ top: 0 }); break;
      case 'kmore': S.kShown += 20; kEnsure(kVisibleIds()).then(renderMain); renderMain(); break;
      case 'mkmore': S.mkShown = (S.mkShown || 10) + 10; if (S.last && S.last.mk && S.last.mk.utama) mkEnsure(S.last.mk.utama.slice(0, S.mkShown)).then(renderMain); renderMain(); break;
      case 'kbrowse': S.kb = { src: el.dataset.src, k: null, b: null, shown: 20 }; S.last = null; $('#q').value = ''; S.q = ''; renderMain(); window.scrollTo({ top: 0 }); break;
      case 'kbk': S.kb = Object.assign({}, S.kb, { k: +el.dataset.k, b: null, shown: 20 }); renderMain(); window.scrollTo({ top: 0 }); break;
      case 'kbb': S.kb = Object.assign({}, S.kb, { b: +el.dataset.b, shown: 20 }); renderMain(); window.scrollTo({ top: 0 }); break;
      case 'kbup': S.kb = Object.assign({}, S.kb, S.kb.b != null && S.kb.k != null ? { b: null } : { k: null, b: null }); { const kb = S.kb; KB.toc(kb.src).then(t => { if (kb.k != null && kb.b == null && t[kb.k][3].length <= 1) { S.kb = Object.assign({}, kb, { k: null }); } renderMain(); }); } break;
      case 'kbmore': S.kb = Object.assign({}, S.kb, { shown: (S.kb.shown || 20) + 20 }); renderMain(); break;
      case 'open': if (pv)""")
rep("""      case 'home': S.browse = null; renderMain(); break;""", """      case 'home': S.browse = null; S.kb = null; renderMain(); break;""")

rep("""      case 'supsum': supSummary(el); break;""", """      case 'supsum': supSummary(el); break;
      case 'supk': { const q = S.sup ? S.sup.q : ''; setTab('cari'); setSrc('all'); $('#q').value = q; S.q = q; $('#qClear').hidden = !q; runSearch(); window.scrollTo({ top: 0 }); break; }""")

# ---- Mode Support Ustadz v3: paket bahan kajian (data/lib/support.js) ----
sup = open(sys.argv[3], encoding='utf-8').read()
a = s.index('  function renderSupport() {'); b = s.index('  function hlText(t, pq) {')
s = s[:a] + s[b:]
a = s.index('  function supCopyAll() {'); b = s.index('  /* ---------------- kelola PDF ---------------- */')
s = s[:a] + s[b:]
a = s.index('  function runSupport(soft) {'); b = s.index('  function srcChips(items) {')
s = s[:a] + sup + '\n' + s[b:]
rep("""<script src="data/lib/kitab.js"></script>""", """<script src="data/lib/kitab.js"></script>\n<script src="data/kamus_support.js"></script>\n<script src="data/lib/support.js"></script>\n<script src="data/lib/makna.js"></script>""")
rep("""      <p>Tulis pertanyaan atau permintaan referensi dari ustadz. Sistem mencari di seluruh arsip CHM dan brosur PDF, lalu menyusun paket referensi: dokumen sumber, ayat Al-Qur'an, hadits, dan kutipan penjelasan, semuanya dengan identitas sumber aslinya.</p>""",
    """      <p>Tulis permintaan bahan kajian, misalnya <i>“Carikan materi tentang tayamum”</i>. Sistem membersihkan kata pengantar, memakai kamus sinonim, lalu mencari di Al-Qur'an, tafsir, kitab hadis, materi pelatihan, arsip CHM dan brosur PDF. Hasilnya disusun menjadi <b>paket bahan kajian</b> (kerangka, dalil, kutipan, urutan penyampaian) yang <b>hanya berisi kutipan dari sumber yang ditemukan</b>. Berjalan tanpa AI — sama untuk semua pengguna.</p>""")
rep("""      <button class="btn primary" id="btnSup" type="button">Susun referensi</button>""", """      <button class="btn primary" id="btnSup" type="button">Susun bahan kajian</button>""")
rep("""        <button class="chip" data-ssrc="all" aria-pressed="true">Semua</button>
        <button class="chip" data-ssrc="CHM" aria-pressed="false">CHM</button>
        <button class="chip" data-ssrc="PDF" aria-pressed="false">PDF</button>
      </div>""", """        <button class="chip" data-ssrc="all" aria-pressed="true">Semua</button>
        <button class="chip" data-ssrc="kitab" aria-pressed="false">Al-Qur'an, hadis, tafsir & materi</button>
        <button class="chip" data-ssrc="CHM" aria-pressed="false">Arsip CHM</button>
        <button class="chip" data-ssrc="PDF" aria-pressed="false">PDF</button>
      </div>
      <button class="btn ghost" data-act="kamus" type="button">Kamus kata kunci</button>""")
rep("""<aside class="drawer" id="manage" hidden""", """<aside class="drawer" id="kamus" hidden aria-label="Kamus kata kunci" role="dialog"></aside>
<aside class="drawer" id="manage" hidden""")
rep("""$('#reader').hidden = true; $('#manage').hidden = true;""", """$('#reader').hidden = true; $('#manage').hidden = true; $('#kamus').hidden = true;""")
rep("""      case 'supsum': supSummary(el); break;""", """      case 'supsum': supSummary(el); break;
      case 'supcopy2': supCopy(false); break;
      case 'supsel': supCopy(true); break;
      case 'supall': { const on = !$$('#sout input.pick').every(x => x.checked); $$('#sout input.pick').forEach(x => { x.checked = on; }); break; }
      case 'supprint': supPrint(); break;
      case 'supback': supBack(); break;
      case 'kamus': openKamus(); break;
      case 'kmsave': kamusSave(); break;
      case 'kmedit': kamusEdit(el.dataset.id); break;
      case 'kmdel': kamusDel(el.dataset.id); break;
      case 'kmnew': kamusEdit(null); break;
      case 'kmtest': kamusTest(); break;
      case 'kmexport': kamusExport(); break;
      case 'kmreset': kamusReset(); break;
      case 'kmab': kamusAbaikan(el.dataset.op); break;""")
rep("""      case 'supcopy': supCopyAll(); break;""", """      case 'supcopy': supCopy(false); break;""")
css = """.sup-pack { margin-top: 14px; display: grid; gap: 14px; }
.sup-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); padding: 14px 16px; }
.sup-card h2 { font-size: 17px; margin: 0 0 8px; display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; } .sup-card h2 small { font-size: 12.5px; color: var(--muted); font-weight: 600; }
.sup-id { display: grid; grid-template-columns: 150px 1fr; gap: 4px 12px; font-size: 14px; } .sup-id dt { color: var(--muted); font-weight: 600; } .sup-id dd { margin: 0; overflow-wrap: anywhere; }
.kwchip { display: inline-block; border-radius: 8px; padding: 2px 8px; margin: 2px 4px 2px 0; font-size: 12.5px; font-weight: 600; background: var(--accent-soft); color: var(--accent); }
.kwchip.mod { background: var(--sunk); color: var(--muted); } .kwchip.rm { background: transparent; color: var(--faint); text-decoration: line-through; font-weight: 500; }
.sumtiles { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; } .sumtiles a { display: block; text-decoration: none; color: inherit; background: var(--sunk); border-radius: 10px; padding: 8px 10px; }
.sumtiles b { font-size: 18px; display: block; font-variant-numeric: tabular-nums; } .sumtiles span { font-size: 12px; color: var(--muted); }
.suptools { position: sticky; top: calc(64px + env(safe-area-inset-top, 0px)); z-index: 5; display: flex; flex-wrap: wrap; gap: 6px; background: var(--bg); padding: 8px 0; }
.sref { border: 1px solid var(--line); border-left: 4px solid var(--accent); border-radius: 10px; padding: 10px 12px; margin: 8px 0; background: var(--surface); }
.sref.pend { border-left: 4px dashed var(--faint); background: var(--bg); }
.sref .sh { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; font-size: 13px; color: var(--muted); }
.sref .sh strong { color: var(--ink); font-size: 14.5px; }
.lvl { font-size: 11px; font-weight: 800; letter-spacing: .04em; border-radius: 999px; padding: 1px 8px; } .lvl.u { background: var(--accent); color: var(--on-accent); } .lvl.p { background: var(--sunk); color: var(--muted); border: 1px dashed var(--faint); }
.sref .tr { font-family: var(--f-read); font-size: 15px; line-height: 1.6; margin: 6px 0; overflow-wrap: anywhere; } .sref .ar { margin: 6px 0; }
.pickbox { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--muted); cursor: pointer; } .pickbox input { width: 16px; height: 16px; accent-color: var(--accent); }
.kosong { font-style: italic; color: var(--warn); background: var(--warn-soft); border-radius: 8px; padding: 8px 10px; font-size: 13.5px; }
.urut li { margin: 0 0 12px; } .urut h3 { font-size: 15px; margin: 0 0 4px; }
.kerangka li { margin: 0 0 8px; } .kerangka b { font-size: 15px; }
.subh { font-size: 12.5px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; color: var(--faint); margin: 14px 0 4px; }
.kmrow { display: grid; grid-template-columns: 1fr auto; gap: 6px; align-items: start; border-bottom: 1px solid var(--line); padding: 8px 0; font-size: 13.5px; }
.kmrow .m { color: var(--muted); font-size: 12.5px; overflow-wrap: anywhere; }
@media (max-width: 720px) { .sumtiles { grid-template-columns: repeat(3, minmax(0, 1fr)); } .sup-id { grid-template-columns: 1fr; } }
.mkl { font-size: 11px; font-weight: 800; border-radius: 999px; padding: 1px 8px; letter-spacing: .02em; }
.mkl.mt { background: var(--accent); color: var(--on-accent); } .mkl.mi { background: var(--accent-soft); color: var(--accent); } .mkl.ms { background: var(--sunk); color: var(--ink); border: 1px solid var(--line); } .mkl.ml { background: transparent; color: var(--muted); border: 1px dashed var(--faint); }
.kres.mk.pend { border-style: dashed; } .mkth { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0; } .mkth .kwchip { font-weight: 600; }
.mkwhy { font-size: 13px; color: var(--muted); background: var(--sunk); border-radius: 8px; padding: 8px 10px; margin: 8px 0; overflow-wrap: anywhere; } .mkwhy ul { margin: 4px 0 0; padding-left: 18px; } .mkwhy li { margin: 2px 0; } .mkwhy b { color: var(--ink); }
.mkintro { font-size: 13px; line-height: 1.6; } details.mkpend { margin: 12px 0; } details.mkpend summary { cursor: pointer; font-weight: 700; color: var(--muted); padding: 6px 0; }
@media print {
  body.print-sup .top, body.print-sup .tabs, body.print-sup #paneCari, body.print-sup .sup-head, body.print-sup #fSup, body.print-sup .sup-row, body.print-sup .suptools, body.print-sup .actions, body.print-sup footer, body.print-sup .pickbox, body.print-sup .scrim, body.print-sup .drawer, body.print-sup .toast { display: none !important; }
  body.print-sup { background: #FFFFFF; color: #000000; } body.print-sup .sup-card { border-color: #999999; } body.print-sup .sref { break-inside: avoid; border-color: #999999; } body.print-sup .sup-card h2 { break-after: avoid; }
}
@media (max-width: 720px) {"""
rep("@media (max-width: 720px) {\n  .stats", css + "\n  .stats")

# ---- footer & boot ----
rep("""  $('#foot').innerHTML = `Pustaka Referensi MTA · arsip <b>${esc(CHM_FILE)}</b> ditambah brosur PDF mingguan, digabung dalam satu indeks pencarian. Setiap hasil menunjuk ke dokumen, bab/subbab atau halaman sumber aslinya. Ringkasan AI hanya alat bantu, bukan fatwa.`;""",
    """  $('#foot').innerHTML = `Pustaka Referensi MTA · arsip <b>${esc(CHM_FILE)}</b> ditambah brosur PDF mingguan, Al-Qur'an Digital 2.1, Tafsir Jalalain, Tafsir Ibnu Katsir, Bulughul Maram, Riyadhus Shalihin, Kitab 9 Imam dan kitab-kitab hadis (file CHM), digabung dalam satu pencarian. Setiap hasil menunjuk ke file, kitab/bab atau halaman sumber aslinya. Hubungan antar riwayat dihitung dari kemiripan teks, bukan penetapan takhrij. Ringkasan AI hanya alat bantu, bukan fatwa.`;""")
rep("""  loadChm();
  initCaps();
})();""", """  loadChm();
  initCaps();
  kitabInit();
})();""")
open(p, 'w', encoding='utf-8').write(s)
print('ok', len(orig), '→', len(s))
