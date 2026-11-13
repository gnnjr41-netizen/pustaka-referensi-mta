/* Normalisasi teks untuk embedding (dipakai sama persis oleh build dokumen & kueri di browser). */
'use strict';
const HARAKAT = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭـ]/g;
function semNorm(s) {
  return String(s || '')
    .replace(/\[\d+\]/g, ' ')            // penanda catatan kaki [1]
    .replace(HARAKAT, '')                 // harakat & tatwil (agar tokenisasi Arab tidak terpecah per tanda)
    .replace(/[\u0000-\u0008\u000B\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ').trim();
}
// pembuka sanad yang berulang (hanya untuk teks embedding hadis; tampilan tetap teks asli)
const SANAD = /\b(dan\s+)?(telah\s+)?(menceritakan|mengabarkan|memberitakan|mengkhabarkan|menyampaikan|meriwayatkan|bercerita|memberi\s+kabar|mengatakan)(\s+hadits)?\s+(kepada|kpd)\s+(kami|kalian|kepadaku|aku)\b[,;:]?/gi;
const MARK = /(Rasulullah|Rasul|Nabi)\s+(shallallahu|shallalahu|sallallahu|Shallallahu|saw|SAW|s\.a\.w)|beliau bersabda|\bbersabda\b/;
function matan(tr) {
  let t = String(tr || '');
  const m = MARK.exec(t);
  const head = m ? t.slice(0, m.index) : '';
  const sanadLike = m && m.index > 30 && ((head.match(SANAD) || []).length >= 1 || /\[[^\]]+\]/.test(head) || (head.match(/\bdari\s/gi) || []).length >= 2);
  if (sanadLike) t = t.slice(m.index);
  t = t.replace(/\[[^\]]{1,80}\]/g, ' ').replace(SANAD, ' ');
  return semNorm(t);
}
module.exports = { semNorm, matan, HARAKAT };
