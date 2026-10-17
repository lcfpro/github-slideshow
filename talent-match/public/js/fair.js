// バーチャル合同企業説明会: 会場を歩き、ブースに近づくと企業担当者が話しかけてくる。
import { esc, salary, REMOTE } from './core.js';

const T = 48; // タイルサイズ
const COLS = 14;
const ROWS = 8;

export function mountFair(el, companies, { onBooth, isCandidate }) {
  el.innerHTML = `<div class="fair-wrap">
    <canvas width="${COLS * T}" height="${ROWS * T}" aria-label="バーチャル説明会の会場。矢印キーまたはクリックで移動できます" tabindex="0"></canvas>
    <div class="fair-hud">🧭 矢印キー / WASD / クリックで移動 ・ ブースに近づくと担当者と話せます</div>
    <div class="dpad" aria-hidden="true"><span></span><button data-d="up">▲</button><span></span><button data-d="left">◀</button><button data-d="down">▼</button><button data-d="right">▶</button></div>
  </div><div class="fair-side"></div>`;
  const canvas = el.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const side = el.querySelector('.fair-side');
  const booths = companies.map((c) => ({ c, x: c.booth.x * T, y: c.booth.y * T, w: T * 2, h: T }));
  const player = { x: 7 * T, y: 7 * T, tx: null, ty: null, dir: 1, step: 0 };
  const npcs = Array.from({ length: 9 }, (_, i) => ({ x: (1 + ((i * 3) % 12)) * T, y: (2 + (i % 4) * 1.6) * T, vx: 0, vy: 0, color: ['#eb6834', '#1baf7a', '#6250d6', '#e87ba4', '#eda100'][i % 5], t: i * 40 }));
  const keys = new Set();
  let active = null;

  const blocked = (x, y) => x < 16 || y < 16 || x > COLS * T - 16 || y > ROWS * T - 12 || booths.some((b) => x > b.x - 10 && x < b.x + b.w + 10 && y > b.y - 6 && y < b.y + b.h + 14);

  const onKey = (e) => {
    if (!canvas.isConnected) return;
    const k = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }[e.key];
    if (!k || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    e.preventDefault();
    if (e.type === 'keydown') { keys.add(k); player.tx = null; } else keys.delete(k);
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * canvas.width;
    const y = ((e.clientY - r.top) / r.height) * canvas.height;
    const b = booths.find((bb) => x > bb.x && x < bb.x + bb.w && y > bb.y && y < bb.y + bb.h);
    if (b) { player.tx = b.x + b.w / 2; player.ty = b.y + b.h + 26; } else { player.tx = x; player.ty = y; }
    canvas.focus();
  });
  el.querySelectorAll('.dpad button').forEach((b) => {
    b.addEventListener('pointerdown', () => { keys.add(b.dataset.d); player.tx = null; });
    ['pointerup', 'pointerleave'].forEach((ev) => b.addEventListener(ev, () => keys.delete(b.dataset.d)));
  });

  function update() {
    let dx = 0;
    let dy = 0;
    const sp = 3;
    if (keys.has('up')) dy -= sp;
    if (keys.has('down')) dy += sp;
    if (keys.has('left')) dx -= sp;
    if (keys.has('right')) dx += sp;
    if (player.tx != null) {
      const ddx = player.tx - player.x;
      const ddy = player.ty - player.y;
      const d = Math.hypot(ddx, ddy);
      if (d < 4) player.tx = null;
      else { dx = (ddx / d) * sp; dy = (ddy / d) * sp; }
    }
    if (dx || dy) {
      if (!blocked(player.x + dx, player.y)) player.x += dx;
      else if (player.tx != null) player.tx = null;
      if (!blocked(player.x, player.y + dy)) player.y += dy;
      if (dx) player.dir = Math.sign(dx);
      player.step++;
    }
    for (const n of npcs) {
      if (--n.t <= 0) { n.vx = (Math.random() - 0.5) * 1.6; n.vy = (Math.random() - 0.5) * 1.6; n.t = 60 + Math.random() * 120; }
      if (!blocked(n.x + n.vx, n.y + n.vy)) { n.x += n.vx; n.y += n.vy; } else n.t = 0;
    }
    const near = booths.find((b) => Math.hypot(player.x - (b.x + b.w / 2), player.y - (b.y + b.h)) < T * 1.3) || null;
    if (near !== active) {
      active = near;
      renderPanel();
    }
  }

  function person(x, y, color, { bob = 0, label, me } = {}) {
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(x, y + 2, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(x - 9, y - 22 + bob, 18, 20, 6); ctx.fill();
    ctx.fillStyle = '#f2c9a5';
    ctx.beginPath(); ctx.arc(x, y - 29 + bob, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2b2118';
    ctx.beginPath(); ctx.arc(x, y - 32 + bob, 8, Math.PI, 0); ctx.fill();
    if (me) {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.moveTo(x, y - 52); ctx.lineTo(x - 6, y - 60); ctx.lineTo(x + 6, y - 60); ctx.fill();
    }
    if (label) {
      ctx.font = '600 11px system-ui, sans-serif';
      const w = ctx.measureText(label).width + 10;
      ctx.fillStyle = 'rgba(15,23,42,.85)';
      ctx.beginPath(); ctx.roundRect(x - w / 2, y + 6, w, 16, 4); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(label, x, y + 18);
    }
  }

  function draw() {
    // 床（タイル）
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = (r + c) % 2 ? '#e7e2d8' : '#efeae1';
      ctx.fillRect(c * T, r * T, T, T);
    }
    // 通路カーペット
    ctx.fillStyle = '#c2410c22';
    ctx.fillRect(0, 7 * T - 6, COLS * T, T);
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, COLS * T, 10);
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillStyle = '#475569'; ctx.textAlign = 'left';
    ctx.fillText('🚪 エントランス', 10, ROWS * T - 10);
    // ブース
    for (const b of booths) {
      const isActive = b === active;
      // 背面パネル → 担当者（カウンターの奥に立つ）→ カウンター の順に描く
      ctx.fillStyle = 'rgba(0,0,0,.15)';
      ctx.fillRect(b.x + 4, b.y + 6, b.w, b.h);
      ctx.fillStyle = b.c.color;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(b.x, b.y - 4, b.w, b.h);
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.roundRect(b.x, b.y - 24, b.w, 22, 6); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '700 11px system-ui, sans-serif'; ctx.textAlign = 'center';
      const nm = b.c.name.replace(/株式会社|合同会社/g, '').trim();
      ctx.fillText(nm.length > 9 ? `${nm.slice(0, 9)}…` : nm, b.x + b.w / 2, b.y - 9);
      person(b.x + b.w / 2, b.y + 26, b.c.color, { bob: Math.sin(Date.now() / 500) });
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.roundRect(b.x, b.y + 22, b.w, b.h - 22, 4); ctx.fill();
      ctx.strokeStyle = isActive ? '#f59e0b' : b.c.color; ctx.lineWidth = isActive ? 3 : 1.5;
      ctx.strokeRect(b.x, b.y + 22, b.w, b.h - 22);
      ctx.fillStyle = '#334155'; ctx.font = '10.5px system-ui, sans-serif';
      ctx.fillText(`${b.c.industry}・求人${b.c.jobs.length}件`, b.x + b.w / 2, b.y + 39);
      if (isCandidate && b.c.best) {
        const s = b.c.best.score;
        ctx.fillStyle = s >= 70 ? '#16a34a' : s >= 55 ? '#2563eb' : '#64748b';
        ctx.beginPath(); ctx.arc(b.x + b.w - 2, b.y - 26, 13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '700 11px system-ui, sans-serif';
        ctx.fillText(String(s), b.x + b.w - 2, b.y - 22);
      }
    }
    for (const n of npcs) person(n.x, n.y, n.color, { bob: Math.sin((n.x + n.y) / 10) });
    person(player.x, player.y, '#2563eb', { bob: Math.sin(player.step / 3) * 1.5, label: 'あなた', me: true });
    if (active) {
      const bx = active.x + active.w / 2;
      const by = active.y + active.h + 72; // 吹き出しはカウンターの手前に表示
      const text = `こんにちは！${active.c.name.replace(/株式会社|合同会社/g, '')}です 👋`;
      ctx.font = '12px system-ui, sans-serif';
      const w = Math.min(260, ctx.measureText(text).width + 20);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.roundRect(bx - w / 2, by - 70, w, 26, 8); ctx.fill();
      ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.fillText(text, bx, by - 53);
    }
  }

  function renderPanel() {
    if (!active) {
      side.innerHTML = '<div class="card" style="margin-top:12px"><p class="muted" style="margin:0">ブースに近づくと、企業担当者から求人の説明を受けられます。数字はあなたとの最高マッチ度です。</p></div>';
      return;
    }
    const c = active.c;
    side.innerHTML = `<div class="card" style="margin-top:12px">
      <div class="row"><div style="width:10px;height:36px;border-radius:4px;background:${c.color}"></div><div><h3 style="margin:0">${esc(c.name)}</h3><span class="tiny">${esc(c.industry)}・${esc(c.size)}・${esc(c.location)}</span></div></div>
      <p style="margin-top:10px">💬「${esc(c.description)}」</p>
      <div class="stack">${c.jobs.map((j) => `<div class="list-item"><div class="grow"><b>${esc(j.title)}</b><div class="tiny">${salary(j.salaryMin, j.salaryMax)}・${REMOTE[j.remote] || ''}</div></div><button class="btn sm" data-job="${j.id}">詳細</button></div>`).join('') || '<p class="muted">現在募集中の求人はありません</p>'}</div>
    </div>`;
    side.querySelectorAll('[data-job]').forEach((b) => b.addEventListener('click', () => onBooth?.(b.dataset.job, c)));
  }

  renderPanel();
  (function loop() {
    if (!canvas.isConnected) {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      return;
    }
    update();
    draw();
    requestAnimationFrame(loop);
  })();
}
