// 軽量 SVG チャート。色はロール（CSS 変数）で指定し、ライト/ダーク両対応。
// すべてのチャートにホバーのツールチップを付け、系列色だけで識別させない（凡例・直接ラベル併用）。
import { esc } from './core.js';

const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)'];
export const seriesColor = (i) => SERIES[i % SERIES.length];

function tipLayer(wrap) {
  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.hidden = true;
  wrap.append(tip);
  return {
    show(html, x, y) {
      tip.innerHTML = html;
      tip.hidden = false;
      const w = wrap.clientWidth;
      const tw = tip.offsetWidth;
      tip.style.left = `${Math.max(0, Math.min(w - tw, x + 12))}px`;
      tip.style.top = `${Math.max(0, y - tip.offsetHeight - 8)}px`;
    },
    hide() { tip.hidden = true; },
  };
}

function localXY(wrap, e) {
  const r = wrap.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p / (v / p > 5 ? 2 : 1)) * p * (v / p > 5 ? 2 : 1);
}

/** 横棒グラフ: rows = [{label, value, note?}] */
export function hbar(el, rows, { unit = '', max, color = 'var(--s1)', labelWidth = 150, format = (v) => v } = {}) {
  const W = 560;
  const bh = 18;
  const gap = 10;
  const H = rows.length * (bh + gap) + 6;
  const m = max ?? niceMax(Math.max(...rows.map((r) => r.value), 0));
  const plotW = W - labelWidth - 56;
  el.innerHTML = `<div class="viz"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="横棒グラフ">
    ${rows.map((r, i) => {
      const y = i * (bh + gap) + 3;
      const w = Math.max(2, (r.value / m) * plotW);
      return `<g data-i="${i}">
        <rect x="0" y="${y - 4}" width="${W}" height="${bh + 8}" fill="transparent"/>
        <text class="lbl" x="${labelWidth - 8}" y="${y + bh / 2 + 4}" text-anchor="end">${esc(r.label)}</text>
        <path d="M${labelWidth},${y} h${w - 4} a4,4 0 0 1 4,4 v${bh - 8} a4,4 0 0 1 -4,4 h-${w - 4} z" fill="${r.color || color}"/>
        <text class="val num" x="${labelWidth + w + 6}" y="${y + bh / 2 + 4}">${esc(format(r.value))}${unit}</text>
      </g>`;
    }).join('')}
    <line class="axis" x1="${labelWidth}" x2="${labelWidth}" y1="0" y2="${H}"/>
  </svg></div>`;
  const wrap = el.querySelector('.viz');
  const tip = tipLayer(wrap);
  wrap.querySelectorAll('g[data-i]').forEach((g) => {
    const r = rows[Number(g.dataset.i)];
    g.addEventListener('mousemove', (e) => tip.show(`<b>${esc(r.label)}</b><br>${esc(format(r.value))}${unit}${r.note ? `<br><span class="tiny">${esc(r.note)}</span>` : ''}`, ...localXY(wrap, e)));
    g.addEventListener('mouseleave', tip.hide);
  });
}

/** 折れ線: x = ラベル配列, series = [{name, values}] */
export function lineChart(el, x, series, { unit = '', height = 260 } = {}) {
  const W = 640;
  const H = height;
  const pad = { l: 48, r: 96, t: 12, b: 26 };
  const all = series.flatMap((s) => s.values);
  const minV = Math.min(...all);
  const maxV = Math.max(...all);
  const lo = Math.max(0, minV - (maxV - minV) * 0.15);
  const hi = maxV + (maxV - minV) * 0.08 || 1;
  const px = (i) => pad.l + (i / Math.max(1, x.length - 1)) * (W - pad.l - pad.r);
  const py = (v) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * (H - pad.t - pad.b);
  const ticks = 4;
  const grid = Array.from({ length: ticks + 1 }, (_, k) => lo + ((hi - lo) * k) / ticks);
  const direct = series.length <= 4;
  // 直接ラベルの重なりを避けるため縦位置をずらす
  const ends = series.map((s, i) => ({ i, y: py(s.values.at(-1)) })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 13) ends[k].y = ends[k - 1].y + 13;
  const endY = Object.fromEntries(ends.map((e) => [e.i, e.y]));
  el.innerHTML = `<div class="viz"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="推移グラフ">
    ${grid.map((g) => `<line class="gridline" x1="${pad.l}" x2="${W - pad.r}" y1="${py(g)}" y2="${py(g)}"/><text class="num" x="${pad.l - 6}" y="${py(g) + 4}" text-anchor="end">${Math.round(g).toLocaleString()}</text>`).join('')}
    ${x.map((lbl, i) => (i % Math.ceil(x.length / 6) === 0 || i === x.length - 1 ? `<text x="${px(i)}" y="${H - 6}" text-anchor="middle">${esc(lbl)}</text>` : '')).join('')}
    <line class="axis" x1="${pad.l}" x2="${W - pad.r}" y1="${H - pad.b}" y2="${H - pad.b}"/>
    ${series.map((s, si) => `<path d="${s.values.map((v, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join('')}" fill="none" stroke="${seriesColor(si)}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${px(s.values.length - 1)}" cy="${py(s.values.at(-1))}" r="4" fill="${seriesColor(si)}" stroke="var(--chart-surface)" stroke-width="2"/>
      ${direct ? `<text class="lbl" x="${W - pad.r + 8}" y="${endY[si] + 4}">${esc(s.name)}</text>` : ''}`).join('')}
    <line class="xh" x1="0" x2="0" y1="${pad.t}" y2="${H - pad.b}" stroke="var(--axis)" stroke-width="1" visibility="hidden"/>
    <rect class="hit" x="${pad.l}" y="0" width="${W - pad.l - pad.r}" height="${H}" fill="transparent"/>
  </svg></div>${series.length > 1 ? `<div class="legend">${series.map((s, i) => `<span><i style="background:${seriesColor(i)}"></i>${esc(s.name)}</span>`).join('')}</div>` : ''}`;
  const wrap = el.querySelector('.viz');
  const svg = wrap.querySelector('svg');
  const xh = svg.querySelector('.xh');
  const tip = tipLayer(wrap);
  svg.querySelector('.hit').addEventListener('mousemove', (e) => {
    const r = svg.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(x.length - 1, Math.round(((vx - pad.l) / (W - pad.l - pad.r)) * (x.length - 1))));
    xh.setAttribute('x1', px(i));
    xh.setAttribute('x2', px(i));
    xh.setAttribute('visibility', 'visible');
    const rows = series.map((s, si) => ({ s, si, v: s.values[i] })).sort((a, b) => b.v - a.v);
    tip.show(`<b>${esc(x[i])}</b><br>${rows.map((o) => `<span style="color:${seriesColor(o.si)}">●</span> ${esc(o.s.name)}: <b class="num">${o.v.toLocaleString()}</b>${unit}`).join('<br>')}`, ...localXY(wrap, e));
  });
  svg.querySelector('.hit').addEventListener('mouseleave', () => { tip.hide(); xh.setAttribute('visibility', 'hidden'); });
}

/** スコアリング（ドーナツ）— 単一の値なので色はブランド色1色 */
export function ring(score, size = 76, label = '') {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  return `<div class="ring" style="width:${size}px;height:${size}px" title="${esc(label)} ${score}点">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--grid)" stroke-width="7"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--brand)" stroke-width="7" stroke-linecap="round"
        stroke-dasharray="${(c * score) / 100} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    </svg><b class="num">${score}</b></div>`;
}

/** レーダー: axes = [{label, value(0-100)}]（単一系列） */
export function radar(el, axes, { size = 260 } = {}) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 42;
  const pt = (i, v) => {
    const a = -Math.PI / 2 + (i / axes.length) * Math.PI * 2;
    return [cx + Math.cos(a) * R * (v / 100), cy + Math.sin(a) * R * (v / 100)];
  };
  el.innerHTML = `<div class="viz" style="max-width:${size}px;margin:auto"><svg viewBox="0 0 ${size} ${size}" role="img" aria-label="マッチ内訳">
    ${[25, 50, 75, 100].map((v) => `<polygon points="${axes.map((_, i) => pt(i, v).join(',')).join(' ')}" fill="none" class="gridline"/>`).join('')}
    ${axes.map((_, i) => `<line class="gridline" x1="${cx}" y1="${cy}" x2="${pt(i, 100)[0]}" y2="${pt(i, 100)[1]}"/>`).join('')}
    <polygon points="${axes.map((a, i) => pt(i, a.value).join(',')).join(' ')}" fill="var(--s1)" fill-opacity=".18" stroke="var(--s1)" stroke-width="2" stroke-linejoin="round"/>
    ${axes.map((a, i) => {
      const [x, y] = pt(i, a.value);
      const [lx, ly] = pt(i, 128);
      return `<g data-i="${i}"><circle cx="${x}" cy="${y}" r="9" fill="transparent"/><circle cx="${x}" cy="${y}" r="4" fill="var(--s1)" stroke="var(--chart-surface)" stroke-width="2"/>
        <text class="lbl" x="${lx}" y="${ly}" text-anchor="middle">${esc(a.label)}</text><text class="val num" x="${lx}" y="${ly + 14}" text-anchor="middle">${a.value}</text></g>`;
    }).join('')}
  </svg></div>`;
  const wrap = el.querySelector('.viz');
  const tip = tipLayer(wrap);
  wrap.querySelectorAll('g[data-i]').forEach((g) => {
    const a = axes[Number(g.dataset.i)];
    g.addEventListener('mousemove', (e) => tip.show(`<b>${esc(a.label)}</b>: ${a.value} / 100`, ...localXY(wrap, e)));
    g.addEventListener('mouseleave', tip.hide);
  });
}

/** 需要×供給 散布図（単一系列 + 選択ラベル） */
export function scatter(el, pts, { xLabel, yLabel, labelTop = 8 } = {}) {
  const W = 640;
  const H = 320;
  const pad = { l: 48, r: 20, t: 14, b: 40 };
  const mx = niceMax(Math.max(...pts.map((p) => p.x), 1));
  const my = niceMax(Math.max(...pts.map((p) => p.y), 1));
  const px = (v) => pad.l + (v / mx) * (W - pad.l - pad.r);
  const py = (v) => pad.t + (1 - v / my) * (H - pad.t - pad.b);
  const top = new Set([...pts].sort((a, b) => b.emph - a.emph).slice(0, labelTop).map((p) => p.label));
  el.innerHTML = `<div class="viz"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(xLabel)}と${esc(yLabel)}の散布図">
    ${[0, 0.25, 0.5, 0.75, 1].map((k) => `<line class="gridline" x1="${pad.l}" x2="${W - pad.r}" y1="${py(my * k)}" y2="${py(my * k)}"/><text class="num" x="${pad.l - 6}" y="${py(my * k) + 4}" text-anchor="end">${Math.round(my * k)}</text>`).join('')}
    ${[0, 0.25, 0.5, 0.75, 1].map((k) => `<text class="num" x="${px(mx * k)}" y="${H - pad.b + 16}" text-anchor="middle">${Math.round(mx * k)}</text>`).join('')}
    <line class="gridline" x1="${px(0)}" y1="${py(0)}" x2="${px(Math.min(mx, my))}" y2="${py(Math.min(mx, my))}" stroke-dasharray="4 4"/>
    <text x="${W - pad.r}" y="${H - 4}" text-anchor="end">${esc(xLabel)} →</text>
    <text x="${pad.l}" y="${pad.t - 2}">↑ ${esc(yLabel)}</text>
    ${pts.map((p, i) => `<g data-i="${i}"><circle cx="${px(p.x)}" cy="${py(p.y)}" r="12" fill="transparent"/><circle cx="${px(p.x)}" cy="${py(p.y)}" r="${p.r || 5}" fill="var(--s1)" fill-opacity=".75" stroke="var(--chart-surface)" stroke-width="2"/>
      ${top.has(p.label) ? `<text class="lbl" x="${px(p.x) + 8}" y="${py(p.y) - 6}">${esc(p.label)}</text>` : ''}</g>`).join('')}
  </svg></div><p class="tiny">点線より上 = 需要が供給を上回る（採用難・市場価値が高い）スキル</p>`;
  const wrap = el.querySelector('.viz');
  const tip = tipLayer(wrap);
  wrap.querySelectorAll('g[data-i]').forEach((g) => {
    const p = pts[Number(g.dataset.i)];
    g.addEventListener('mousemove', (e) => tip.show(`<b>${esc(p.label)}</b><br>${esc(xLabel)}: ${p.x}<br>${esc(yLabel)}: ${p.y}${p.note ? `<br>${esc(p.note)}` : ''}`, ...localXY(wrap, e)));
    g.addEventListener('mouseleave', tip.hide);
  });
}

/** 年収レンジ（P25〜P75 の帯 + 中央値） */
export function rangeChart(el, rows, { labelWidth = 170 } = {}) {
  const W = 620;
  const bh = 14;
  const gap = 14;
  const H = rows.length * (bh + gap) + 28;
  const lo = Math.floor(Math.min(...rows.map((r) => r.lo)) / 100) * 100;
  const hi = Math.ceil(Math.max(...rows.map((r) => r.hi)) / 100) * 100;
  const px = (v) => labelWidth + ((v - lo) / (hi - lo || 1)) * (W - labelWidth - 20);
  const ticks = [];
  for (let v = lo; v <= hi; v += (hi - lo) / 4) ticks.push(Math.round(v));
  el.innerHTML = `<div class="viz"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="年収レンジ">
    ${ticks.map((t) => `<line class="gridline" x1="${px(t)}" x2="${px(t)}" y1="0" y2="${H - 22}"/><text class="num" x="${px(t)}" y="${H - 6}" text-anchor="middle">${t}万</text>`).join('')}
    ${rows.map((r, i) => {
      const y = i * (bh + gap) + 6;
      return `<g data-i="${i}"><rect x="0" y="${y - 6}" width="${W}" height="${bh + 12}" fill="transparent"/>
        <text class="lbl" x="${labelWidth - 8}" y="${y + bh / 2 + 4}" text-anchor="end">${esc(r.label)}</text>
        <rect x="${px(r.lo)}" y="${y}" width="${Math.max(4, px(r.hi) - px(r.lo))}" height="${bh}" rx="4" fill="${r.highlight ? 'var(--s2)' : 'var(--seq-250)'}"/>
        <line x1="${px(r.mid)}" x2="${px(r.mid)}" y1="${y - 3}" y2="${y + bh + 3}" stroke="var(--ink)" stroke-width="2"/>
      </g>`;
    }).join('')}
  </svg></div><div class="legend"><span><i style="background:var(--seq-250)"></i>P25〜P75</span><span><i style="background:var(--ink);width:3px"></i>中央値</span></div>`;
  const wrap = el.querySelector('.viz');
  const tip = tipLayer(wrap);
  wrap.querySelectorAll('g[data-i]').forEach((g) => {
    const r = rows[Number(g.dataset.i)];
    g.addEventListener('mousemove', (e) => tip.show(`<b>${esc(r.label)}</b><br>P25 ${r.lo}万 / 中央値 <b>${r.mid}万</b> / P75 ${r.hi}万${r.note ? `<br>${esc(r.note)}` : ''}`, ...localXY(wrap, e)));
    g.addEventListener('mouseleave', tip.hide);
  });
}

/** 比率バー（最大 3 区分） */
export function shareBar(parts) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return `<div style="display:flex;gap:2px;height:14px;border-radius:4px;overflow:hidden">${parts.map((p, i) => `<div title="${esc(p.label)} ${p.value}" style="flex:${p.value};background:${seriesColor(i)}"></div>`).join('')}</div>
    <div class="legend">${parts.map((p, i) => `<span><i style="background:${seriesColor(i)}"></i>${esc(p.label)} <b class="num">${Math.round((p.value / total) * 100)}%</b></span>`).join('')}</div>`;
}

/** 連続値ヒートマップのセル背景（単一色相） */
export function seqColor(level, max = 5) {
  if (!level) return 'transparent';
  const steps = ['var(--seq-100)', 'var(--seq-250)', 'var(--seq-400)', 'var(--seq-550)', 'var(--seq-700)'];
  return steps[Math.min(steps.length - 1, Math.round((level / max) * (steps.length - 1)))];
}
export function seqInk(level, max = 5) {
  return level / max >= 0.6 ? '#fff' : 'var(--ink)';
}
