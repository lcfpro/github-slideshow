// 人材市場の動態（企業・応募者 共通 + それぞれ向けの示唆）
import { api, esc, state, tabs, LEVEL } from './core.js';
import { hbar, lineChart, scatter, rangeChart, shareBar } from './charts.js';

export async function marketView(el) {
  const isCompany = state.user.type === 'company';
  const [ov, sk, sal, tr, mine] = await Promise.all([
    api('/api/market/overview'), api('/api/market/skills'), api('/api/market/salaries'), api('/api/market/trends'),
    isCompany ? api('/api/market/company') : api('/api/market/me'),
  ]);
  el.innerHTML = `<h1>📈 IT人材市場の動態</h1><p class="muted">プラットフォーム内の求人・候補者データと月次スナップショットから算出しています（毎月更新）。</p>
    <div class="grid g4">
      <div class="card stat"><div class="label">掲載求人</div><div class="value num">${ov.jobs}</div><div class="sub">市場全体 ${tr.jobsTotal.at(-1).toLocaleString()}件（推計）</div></div>
      <div class="card stat"><div class="label">公開中の候補者</div><div class="value num">${ov.candidates}</div><div class="sub">市場全体 ${tr.candidatesTotal.at(-1).toLocaleString()}人（推計）</div></div>
      <div class="card stat"><div class="label">求人倍率</div><div class="value num">${(tr.jobsTotal.at(-1) / tr.candidatesTotal.at(-1)).toFixed(2)}<small>倍</small></div><div class="sub">売り手市場の目安 1.5倍以上</div></div>
      <div class="card stat"><div class="label">平均提示年収</div><div class="value num">${tr.salary.at(-1)}<small>万円</small></div><div class="sub">前年同月比 ${tr.salary.at(-1) - tr.salary.at(-13) >= 0 ? '+' : ''}${tr.salary.at(-1) - tr.salary.at(-13)}万円</div></div>
    </div>
    <div class="card" style="margin-top:16px" data-mine></div>
    <div class="card" style="margin-top:16px"><div data-tabs></div></div>`;

  const mineEl = el.querySelector('[data-mine]');
  if (isCompany) {
    mineEl.innerHTML = `<h2>🏢 自社求人の市場競争力</h2><div class="scroll-x"><table class="t"><thead><tr><th>求人</th><th>年収ポジション</th><th>有力候補（70点+）</th><th>採用難スキル</th><th>改善提案</th></tr></thead><tbody>
      ${mine.map((j) => `<tr><td><b>${esc(j.title)}</b></td><td><span class="status" style="color:${j.salaryPosition.includes('上') ? 'var(--good-ink)' : j.salaryPosition.includes('以下') ? 'var(--critical)' : 'var(--ink-2)'}">${j.salaryPosition.includes('上') ? '▲' : j.salaryPosition.includes('以下') ? '▼' : '■'} ${esc(j.salaryPosition)}</span><div class="tiny">自社 ${j.mid ?? '-'}万 / 相場 ${j.band?.median ?? '-'}万</div></td><td class="num">${j.pool.strong}人<div class="tiny">候補 ${j.pool.possible}人</div></td><td>${j.scarce.map((s) => `<span class="chip miss">${esc(s.name)} ${s.ratio}倍</span>`).join(' ') || '-'}</td><td class="tiny">${j.tips.map(esc).join('<br>') || '良好です'}</td></tr>`).join('')}</tbody></table></div>`;
  } else {
    mineEl.innerHTML = `<h2>👤 あなたの市場価値</h2><div class="grid g3">
      <div><div class="tiny">想定年収レンジ（${esc(mine.role.name)}・${LEVEL[mine.level]}）</div><div class="hero num">${mine.estimate.low}〜${mine.estimate.high}<small style="font-size:1rem">万円</small></div><div class="tiny">相場 P25 ${mine.band.p25} / 中央値 ${mine.band.median} / P75 ${mine.band.p75}万円</div></div>
      <div><div class="tiny">応募可能性の高い求人</div><div class="hero num">${mine.matchingJobs.strong}<small style="font-size:1rem">件</small></div><div class="tiny">全${mine.matchingJobs.total}件中・検討余地 ${mine.matchingJobs.possible}件</div></div>
      <div><div class="tiny">同職種の候補者内ポジション</div><div class="hero num">${mine.topPercent ? `上位${mine.topPercent}%` : '-'}</div><div class="tiny">スキル数×経験年数で比較</div></div></div>
      <p style="margin-top:10px">需要の高い保有スキル: ${mine.hotOwned.map((s) => `<span class="chip ok">${esc(s.name)} ${s.heat}</span>`).join(' ')}　<a href="#/skills">→ 次に学ぶべきスキル</a></p>`;
  }

  tabs(el.querySelector('[data-tabs]'), ['スキル需要ランキング', '需要と供給', '求人数の推移', '職種別 年収相場', '働き方'], (i, body) => {
    if (i === 0) {
      body.innerHTML = '<div class="grid g2"><div><h3>市場ヒート上位</h3><div data-a></div></div><div><h3>需要成長率（前年比）</h3><div data-b></div></div></div><p class="tiny">市場ヒート（0-100）= 外部需要指標 × 0.6 + プラットフォーム内 需要/供給比 × 0.4</p>';
      hbar(body.querySelector('[data-a]'), ov.hotSkills.map((s) => ({ label: s.name, value: s.heat, note: `需要 ${s.demand} / 供給 ${s.supply}人・${s.cat}` })), { max: 100 });
      hbar(body.querySelector('[data-b]'), ov.risingSkills.map((s) => ({ label: s.name, value: s.growth })), { unit: '%', color: 'var(--s3)' });
    } else if (i === 1) {
      body.innerHTML = '<h3>スキル別 需要（求人）× 供給（候補者）</h3><div data-a></div><h3 style="margin-top:12px">カテゴリ別</h3><div class="scroll-x"><table class="t" data-b></table></div>';
      scatter(body.querySelector('[data-a]'), sk.skills.filter((s) => s.demand || s.supply).map((s) => ({ label: s.name, x: s.supply, y: s.demand, emph: s.ratio * s.demand, note: `需給比 ${s.ratio}倍` })), { xLabel: '供給（候補者数）', yLabel: '需要（求人数）' });
      body.querySelector('[data-b]').innerHTML = `<thead><tr><th>カテゴリ</th><th>需要</th><th>供給</th><th>平均ヒート</th></tr></thead><tbody>${sk.categories.map((c) => `<tr><td>${esc(c.cat)}</td><td class="num">${Math.round(c.demand)}</td><td class="num">${c.supply}</td><td class="num"><b>${c.heat}</b></td></tr>`).join('')}</tbody>`;
    } else if (i === 2) {
      let sel = tr.series.map((x) => x.id);
      body.innerHTML = `<div class="row" style="margin-bottom:10px" data-sel>${state.meta.skills.map((s) => `<button class="chip toggle ${sel.includes(s.id) ? 'on' : ''}" data-s="${s.id}" aria-pressed="${sel.includes(s.id)}">${esc(s.name)}</button>`).join('')}</div>
        <p class="tiny">スキルをクリックして比較（最大6つ）</p><div data-a></div>
        <div class="scroll-x" style="margin-top:8px"><details><summary class="tiny">データ表を表示</summary><table class="t" data-tbl></table></details></div>`;
      const draw = async () => {
        const t = await api(`/api/market/trends?skills=${sel.join(',')}`);
        lineChart(body.querySelector('[data-a]'), t.months.map((m) => m.slice(2).replace('-', '/')), t.series.map((s) => ({ name: s.name, values: s.values })), { unit: '件' });
        body.querySelector('[data-tbl]').innerHTML = `<thead><tr><th>月</th>${t.series.map((s) => `<th>${esc(s.name)}</th>`).join('')}</tr></thead><tbody>${t.months.map((m, k) => `<tr><td>${m}</td>${t.series.map((s) => `<td class="num">${s.values[k].toLocaleString()}</td>`).join('')}</tr>`).join('')}</tbody>`;
      };
      body.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', () => {
        const id = b.dataset.s;
        if (sel.includes(id)) { if (sel.length === 1) return; sel = sel.filter((x) => x !== id); } else if (sel.length < 6) sel = [...sel, id];
        body.querySelectorAll('[data-s]').forEach((x) => { const on = sel.includes(x.dataset.s); x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
        draw();
      }));
      draw();
    } else if (i === 3) {
      const myRole = isCompany ? null : mine.role.id;
      body.innerHTML = `<div class="row" style="margin-bottom:8px">${Object.entries(LEVEL).map(([k, v]) => `<button class="btn sm" data-lv="${k}">${v}</button>`).join('')}</div><div data-a></div>`;
      const draw = (lv) => {
        body.querySelectorAll('[data-lv]').forEach((b) => b.classList.toggle('primary', b.dataset.lv === lv));
        const rows = sal.map((r) => ({ label: r.name, lo: r.levels[lv].p25, mid: r.levels[lv].median, hi: r.levels[lv].p75, highlight: r.id === myRole, note: `求人${r.openJobs}件 / 候補者${r.candidates}人` })).sort((a, b) => b.mid - a.mid);
        rangeChart(body.querySelector('[data-a]'), rows);
      };
      body.querySelectorAll('[data-lv]').forEach((b) => b.addEventListener('click', () => draw(b.dataset.lv)));
      draw(isCompany ? 'middle' : mine.level);
    } else {
      body.innerHTML = `<h3>求人の働き方</h3>${shareBar([{ label: 'フルリモート', value: ov.remote.full }, { label: 'ハイブリッド', value: ov.remote.hybrid }, { label: '出社', value: ov.remote.onsite }])}
        <h3 style="margin-top:16px">職種別 求人倍率（求人 ÷ 希望者）</h3><div data-a></div>`;
      hbar(body.querySelector('[data-a]'), [...sal].sort((a, b) => b.ratio - a.ratio).map((r) => ({ label: r.name, value: r.ratio, note: `求人${r.openJobs} / 希望者${r.candidates}` })), { unit: '倍', labelWidth: 190, color: 'var(--s2)' });
    }
  });
}
