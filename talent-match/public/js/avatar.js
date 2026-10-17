// SVG アバター（応募者・社員・面接官）。テキストだけの画面にしないための人物表現。
const SKIN = ['#f5d0b5', '#eac09d', '#d9a77f', '#b98560'];
const HAIR = ['#2b2118', '#4a3221', '#1a1a1a', '#6b4a2b'];

function hash(s) {
  let h = 0;
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function avatar(person = {}, size = 44) {
  const h = hash(person.id || person.name);
  const color = person.avatar?.color || ['#2a78d6', '#1baf7a', '#6250d6', '#eb6834'][h % 4];
  const hair = person.avatar?.hair ?? h % 4;
  const skin = SKIN[(h >> 3) % SKIN.length];
  const hc = HAIR[(h >> 5) % HAIR.length];
  const hairPath = [
    'M14 22 Q14 9 26 9 Q38 9 38 22 Q34 15 26 15 Q18 15 14 22Z',
    'M13 24 Q12 8 26 8 Q40 8 39 24 L37 20 Q30 13 20 16 Q15 19 13 24Z',
    'M13 30 Q11 8 26 8 Q41 8 39 30 L37 22 Q26 12 15 22Z',
    'M15 20 Q17 10 26 10 Q35 10 37 20 Q26 12 15 20Z',
  ][hair % 4];
  return `<svg width="${size}" height="${size}" viewBox="0 0 52 52" aria-hidden="true" style="flex:none">
    <circle cx="26" cy="26" r="26" fill="${color}" opacity=".18"/>
    <path d="M8 52 Q10 36 26 36 Q42 36 44 52Z" fill="${color}"/>
    <circle cx="26" cy="23" r="11" fill="${skin}"/>
    <path d="${hairPath}" fill="${hc}"/>
    <circle cx="22" cy="24" r="1.3" fill="#222"/><circle cx="30" cy="24" r="1.3" fill="#222"/>
    <path d="M22.5 28.5 Q26 31 29.5 28.5" stroke="#8a4b3c" stroke-width="1.3" fill="none" stroke-linecap="round"/>
  </svg>`;
}

export function companyLogo(c = {}, size = 44) {
  const initial = (c.name || '?').replace(/株式会社|合同会社|有限会社/g, '').trim().slice(0, 1);
  return `<div style="width:${size}px;height:${size}px;border-radius:10px;background:${c.color || '#2a78d6'};color:#fff;display:grid;place-items:center;font-weight:700;font-size:${size * 0.42}px;flex:none" aria-hidden="true">${initial}</div>`;
}
