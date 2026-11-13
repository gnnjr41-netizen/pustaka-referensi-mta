// Supabase Edge Function "pustaka-gemini" — OPSIONAL untuk Pustaka Referensi MTA v3.2.
// BELUM DIPASANG. Pasang hanya setelah disetujui admin (lihat LAPORAN/PANDUAN_GEMINI_OPSIONAL.md).
//
// Tugas yang diizinkan (selain itu ditolak):
//   expand : usulkan ≤ 8 istilah pencarian Bahasa Indonesia/Arab yang semakna. Aplikasi mencarinya lagi SECARA LOKAL.
//   rerank : urutkan ulang ≤ 12 kandidat yang SUDAH ditemukan aplikasi. Jawaban hanya berisi ID kandidat.
// Gemini tidak boleh menulis dalil, terjemahan, tafsir, nomor hadis, atau derajat hadis — dan tidak pernah
// diberi seluruh database; hanya kalimat pencarian + cuplikan pendek kandidat.
//
// Secret (Supabase → Project Settings → Edge Functions → Secrets):
//   GEMINI_API_KEY   wajib — kunci API Gemini (JANGAN ditaruh di HTML/JS/GitHub)
//   GEMINI_MODEL     opsional — nama model, mis. "gemini-2.5-flash-lite" (sesuaikan dengan model yang tersedia)
//   ALLOWED_ORIGIN   opsional — mis. "https://gnnjr41-netizen.github.io" (bawaan: hanya origin itu)
//   DAILY_LIMIT      opsional — batas permintaan per hari per instance (bawaan 300)

const API = 'https://generativelanguage.googleapis.com/v1beta/models/';
const ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'https://gnnjr41-netizen.github.io';
const MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash-lite';
const DAILY = Number(Deno.env.get('DAILY_LIMIT') || '300');
const PER_MIN_IP = 6;

// batas pemakaian sederhana (per instance fungsi; bukan pengganti kuota resmi Google)
let day = new Date().toISOString().slice(0, 10), dayCount = 0;
const ipHits = new Map<string, number[]>();

function cors(origin: string | null) {
  const ok = origin === ORIGIN || (origin || '').startsWith('http://localhost') || (origin || '').startsWith('http://127.0.0.1');
  return {
    'Access-Control-Allow-Origin': ok ? (origin as string) : ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Vary': 'Origin',
  };
}
function json(body: unknown, status: number, h: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...h, 'Content-Type': 'application/json' } });
}
const clip = (s: unknown, n: number) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

async function gemini(prompt: string, schema: Record<string, unknown>): Promise<any> {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY belum diatur');
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(API + encodeURIComponent(MODEL) + ':generateContent', {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 256, responseMimeType: 'application/json', responseSchema: schema },
      }),
    });
    if (r.status === 429) throw new Error('kuota Gemini habis');
    if (!r.ok) throw new Error('Gemini HTTP ' + r.status);
    const j = await r.json();
    const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!txt) throw new Error('jawaban Gemini kosong');
    return JSON.parse(txt);
  } finally { clearTimeout(t); }
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  if (req.method !== 'POST') return json({ error: 'metode tidak diizinkan' }, 405, h);

  // batas harian & per-IP
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) { day = today; dayCount = 0; ipHits.clear(); }
  if (dayCount >= DAILY) return json({ error: 'batas harian tercapai' }, 429, h);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anon';
  const now = Date.now(); const hits = (ipHits.get(ip) || []).filter((x) => now - x < 60000);
  if (hits.length >= PER_MIN_IP) return json({ error: 'terlalu sering, coba sebentar lagi' }, 429, h);
  hits.push(now); ipHits.set(ip, hits); dayCount++;

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'JSON tidak sah' }, 400, h); }
  const q = clip(body?.q, 300);
  if (!q) return json({ error: 'kueri kosong' }, 400, h);

  try {
    if (body.task === 'expand') {
      const out = await gemini(
        'Anda membantu mesin pencari referensi Islam berbahasa Indonesia. Berikan paling banyak 8 kata atau frasa pendek ' +
        '(Bahasa Indonesia, boleh istilah Arab yang lazim) yang semakna atau sangat berkaitan dengan maksud pencarian berikut, ' +
        'untuk dicari ulang di database. JANGAN menulis ayat, hadis, terjemahan, tafsir, nomor, atau penjelasan.\n' +
        'Pencarian: "' + q + '"',
        { type: 'object', properties: { terms: { type: 'array', items: { type: 'string' }, maxItems: 8 } }, required: ['terms'] },
      );
      const terms = (Array.isArray(out?.terms) ? out.terms : []).map((t: unknown) => clip(t, 40)).filter((t: string) => t && /^[\p{L}\p{M}\s'\-]+$/u.test(t)).slice(0, 8);
      return json({ terms, model: MODEL }, 200, h);
    }
    if (body.task === 'rerank') {
      const cands = (Array.isArray(body.candidates) ? body.candidates : []).slice(0, 12)
        .map((c: any) => ({ id: clip(c?.id, 20), text: clip(c?.text, 280) })).filter((c: any) => c.id && c.text);
      if (cands.length < 2) return json({ error: 'kandidat kurang' }, 400, h);
      const ids = new Set(cands.map((c: any) => c.id));
      const out = await gemini(
        'Urutkan kandidat referensi berikut dari yang paling sesuai dengan maksud pencarian. Nilai HANYA berdasarkan teks kandidat. ' +
        'Jawab berupa daftar ID saja, jangan menambah ID baru, jangan menulis isi apa pun.\nPencarian: "' + q + '"\nKandidat:\n' +
        cands.map((c: any) => '[' + c.id + '] ' + c.text).join('\n'),
        { type: 'object', properties: { order: { type: 'array', items: { type: 'string' } } }, required: ['order'] },
      );
      const order = (Array.isArray(out?.order) ? out.order : []).map(String).filter((id: string) => ids.has(id));
      return json({ order: Array.from(new Set(order)), model: MODEL }, 200, h);
    }
    return json({ error: 'tugas tidak dikenal' }, 400, h);
  } catch (e) {
    // aplikasi akan langsung kembali ke pencarian lokal
    return json({ error: (e as Error).message || 'gagal' }, 502, h);
  }
});
