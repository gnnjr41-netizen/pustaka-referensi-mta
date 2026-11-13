/* Bantuan Gemini (PRMG) — v3.2, OPSIONAL dan NONAKTIF secara bawaan.
   Aktif hanya bila: (1) admin mengisi PRM_CONFIG.gemini.url (alamat Supabase Edge Function "pustaka-gemini"),
   dan (2) pengguna mencentang persetujuan di Pengaturan lanjutan.
   - API Key Gemini TIDAK ada di sini; disimpan sebagai secret di Supabase (lihat supabase/functions/pustaka-gemini).
   - Yang dikirim: kalimat pencarian, dan untuk pengurutan: maks. 12 cuplikan ≤ 280 karakter dari hasil yang SUDAH ditemukan.
   - Gemini hanya boleh: (a) mengusulkan istilah pencarian tambahan (dicari lagi secara lokal),
     (b) mengurutkan ulang kandidat dalam kelompok "Dalil utama". Jawaban yang memuat ID di luar kandidat ditolak.
   - Gagal / kuota habis / lambat (> 6 detik) → diabaikan 5 menit; pencarian lokal tetap berjalan. */
(function (root) {
  'use strict';
  const G = root.PRMG = root.PRMG || {};
  const cfg = () => (root.PRM_CONFIG && root.PRM_CONFIG.gemini) || null;
  let lastErr = null, coolUntil = 0;
  G.configured = () => { const c = cfg(); return !!(c && typeof c.url === 'string' && /^https:\/\/[^\s]+$/.test(c.url)); };
  G.host = () => { try { return new URL(cfg().url).host; } catch (e) { return ''; } };
  G.consent = () => { try { return localStorage.getItem('prm-gemini') === '1'; } catch (e) { return false; } };
  G.setConsent = v => { try { localStorage.setItem('prm-gemini', v ? '1' : '0'); } catch (e) { } };
  G.active = () => G.configured() && G.consent() && Date.now() >= coolUntil && (typeof navigator === 'undefined' || navigator.onLine !== false);
  G.lastErr = () => lastErr;
  async function call(body) {
    const c = cfg(); const key = (root.PRM_CONFIG && root.PRM_CONFIG.supabaseKey) || '';
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = setTimeout(() => ctl && ctl.abort(), c.timeoutMs || 6000);
    try {
      const r = await fetch(c.url, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, key ? { Authorization: 'Bearer ' + key, apikey: key } : {}), body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j || j.error) throw new Error((j && j.error) || ('HTTP ' + r.status));
      lastErr = null; return j;
    } catch (e) {
      lastErr = (e.name === 'AbortError' ? 'waktu habis' : e.message) + ' — dilewati 5 menit, pencarian lokal tetap berjalan';
      coolUntil = Date.now() + 5 * 60 * 1000; throw e;
    } finally { clearTimeout(t); }
  }
  const clean = s => String(s || '').replace(/[^\p{L}\p{M}\s'\-]/gu, ' ').replace(/\s+/g, ' ').trim();
  /** {terms:[…]} — maks. 8 istilah pendek; hanya dipakai sebagai kata pencarian tambahan */
  G.expand = async function (q) {
    if (!G.active()) return null;
    const j = await call({ task: 'expand', q: String(q).slice(0, 300) });
    // istilah yang memuat tanda/karakter selain huruf ditolak utuh (bukan dibersihkan)
    const ok = w => typeof w === 'string' && /^[\p{L}\p{M}\s'\-]{2,40}$/u.test(w.trim());
    const terms = Array.from(new Set((Array.isArray(j.terms) ? j.terms : []).filter(ok).map(clean).filter(w => w && w.toLowerCase() !== String(q).toLowerCase()))).slice(0, 8);
    return { terms };
  };
  /** urutan ID kandidat; null bila jawaban tidak sah */
  G.rerank = async function (q, cands) {
    if (!G.active() || !cands.length) return null;
    const ids = new Set(cands.map(c => c.id));
    const j = await call({ task: 'rerank', q: String(q).slice(0, 300), candidates: cands.slice(0, 12).map(c => ({ id: c.id, text: String(c.text || '').slice(0, 280) })) });
    const ord = (Array.isArray(j.order) ? j.order : []).map(String);
    if (!ord.length || ord.some(id => !ids.has(id))) return null; // menolak ID yang tidak ada di kandidat
    return Array.from(new Set(ord));
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
