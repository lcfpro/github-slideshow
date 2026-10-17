// 応募者向け画面
import { api, esc, state, toast, skillName, REMOTE, LEVEL, APP_STATUS, salary, matchBadge, modal, fmtDate } from './core.js';
import { ring, radar, hbar } from './charts.js';
import { avatar, companyLogo } from './avatar.js';
import { mountFair } from './fair.js';
import { mountInterview } from './interview.js';
import { profileEditor } from './editors.js';

const BREAK = { skills: 'スキル', experience: '経験', salary: '年収', workstyle: '働き方', language: '語学' };

function jobCard(x) {
  const { job, match } = x;
  return `<div class="list-item">
    ${companyLogo(job.company)}
    <div class="grow">
      <div class="row between"><div><b>${esc(job.title)}</b> ${x.scouted ? '<span class="badge">📩 スカウト</span>' : ''} ${x.mutual ? '<span class="badge" style="background:#dcfce7;color:#166534">🤝 相互マッチ</span>' : ''}<div class="tiny">${esc(job.company?.name)}・${esc(job.location)}・${REMOTE[job.remote] || ''}</div></div>
      <div class="num"><b>${salary(job.salaryMin, job.salaryMax)}</b></div></div>
      <div class="row" style="margin-top:6px">${match.matched.map((m) => `<span class="chip ok">✓ ${esc(m.name)}</span>`).join('')}${match.partial.map((m) => `<span class="chip part">△ ${esc(m.name)}</span>`).join('')}${match.missing.map((m) => `<span class="chip miss">✗ ${esc(m.name)}</span>`).join('')}</div>
      <div class="row" style="margin-top:8px"><button class="btn sm" data-detail="${job.id}">詳細・内訳</button><button class="btn sm ${x.liked ? 'liked' : ''}" data-like="${job.id}">${x.liked ? '♥ 興味あり' : '♡ 興味あり'}</button><button class="btn sm" data-apply="${job.id}">応募する</button><a class="btn sm ghost" href="#/prep?job=${job.id}">面談準備</a></div>
    </div>
    <div style="text-align:center">${ring(match.total, 64, 'マッチ度')}<div>${matchBadge(match.total)}</div></div>
  </div>`;
}

export async function jobDetail(jobId) {
  const { job, match } = await api(`/api/jobs/${jobId}`);
  modal(`<div class="row">${companyLogo(job.company, 52)}<div><h2 style="margin:0">${esc(job.title)}</h2><div class="muted">${esc(job.company.name)}・${esc(job.company.industry)}・${esc(job.company.size)}</div></div></div>
    <div class="grid g2" style="margin-top:14px">
      <div><h3>あなたとのマッチ度 ${match ? `${match.total}点` : ''}</h3>${match ? '<div data-radar></div>' : ''}
        ${match ? `<ul>${match.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}
        <table class="t"><tbody>${match ? Object.entries(match.breakdown).map(([k, v]) => `<tr><td>${BREAK[k]}</td><td class="num">${v} / 100</td></tr>`).join('') : ''}</tbody></table></div>
      <div><table class="t"><tbody>
        <tr><th>年収</th><td>${salary(job.salaryMin, job.salaryMax)}</td></tr><tr><th>勤務地</th><td>${esc(job.location)}／${REMOTE[job.remote]}</td></tr>
        <tr><th>経験</th><td>${job.minYears || 0}年以上</td></tr>
        <tr><th>必須</th><td>${job.required.map((r) => `${esc(skillName(r.id))} Lv${r.level}`).join('、')}</td></tr>
        <tr><th>歓迎</th><td>${job.preferred.map(skillName).map(esc).join('、') || '-'}</td></tr>
        <tr><th>語学</th><td>日本語 ${esc(job.languages?.japanese || '不問')}／英語 ${esc(job.languages?.english || '不問')}</td></tr></tbody></table>
        <p style="margin-top:10px">${esc(job.description)}</p><ul>${(job.duties || []).map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
        <div class="row">${(job.benefits || []).map((b) => `<span class="chip">${esc(b)}</span>`).join('')}</div></div>
    </div>
    ${state.user.type === 'candidate' ? `<div class="row" style="justify-content:flex-end;margin-top:12px"><a class="btn" href="#/interview?job=${job.id}" data-close>🎤 この企業で模擬面接</a><a class="btn" href="#/prep?job=${job.id}" data-close>面談準備</a><button class="btn primary" data-apply="${job.id}">応募する</button></div>` : ''}`, {
    wide: true,
    onMount: (m, close) => {
      if (match) radar(m.querySelector('[data-radar]'), Object.entries(match.breakdown).map(([k, v]) => ({ label: BREAK[k], value: v })));
      m.querySelector('[data-apply]')?.addEventListener('click', () => { close(); applyFlow(job.id); });
    },
  });
}

function applyFlow(jobId) {
  modal(`<h2>応募メッセージ</h2><p class="muted">テンプレートから選んで少し直すだけでOK。</p>
    <div class="row" style="margin-bottom:8px">${['経験を活かしたい', '成長したい', '事業に共感'].map((t, i) => `<button class="btn sm" data-t="${i}">${t}</button>`).join('')}</div>
    <textarea class="input" id="msg" style="min-height:120px"></textarea><div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn primary" id="send">応募する</button></div>`, {
    onMount: (m, close) => {
      const T = [
        'これまでの経験を活かし、貴社のプロダクト開発に即戦力として貢献したいと考え応募いたしました。ぜひ一度お話を伺えますと幸いです。',
        '貴社の技術スタックと開発文化に魅力を感じ、より大きな裁量のある環境で成長したいと考え応募いたしました。',
        '貴社の事業ビジョンに強く共感しました。エンジニアとして事業成長に直接貢献したいと考えております。',
      ];
      m.querySelector('#msg').value = T[0];
      m.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => { m.querySelector('#msg').value = T[Number(b.dataset.t)]; }));
      m.querySelector('#send').addEventListener('click', async () => {
        try {
          await api('/api/applications', { method: 'POST', body: { jobId, message: m.querySelector('#msg').value } });
          toast('✅ 応募しました。面談準備も進めましょう');
          close();
        } catch (e) { toast(e.message); }
      });
    },
  });
}

function bindJobActions(root, reload) {
  root.querySelectorAll('[data-detail]').forEach((b) => b.addEventListener('click', () => jobDetail(b.dataset.detail)));
  root.querySelectorAll('[data-apply]').forEach((b) => b.addEventListener('click', () => applyFlow(b.dataset.apply)));
  root.querySelectorAll('[data-like]').forEach((b) => b.addEventListener('click', async () => {
    const r = await api('/api/likes', { method: 'POST', body: { jobId: b.dataset.like } });
    toast(r.mutual ? '🤝 相互マッチが成立しました！企業と連絡が取れます' : r.liked ? '興味ありを送りました' : '取り消しました');
    reload?.();
  }));
}

export async function candHome(el) {
  const c = state.me.candidate;
  const [value, jobs, apps, matches] = await Promise.all([api('/api/market/me'), api('/api/jobs'), api('/api/applications'), api('/api/matches')]);
  const next = apps.filter((a) => a.interviewAt && new Date(a.interviewAt) > new Date()).sort((a, b) => a.interviewAt.localeCompare(b.interviewAt))[0];
  const filled = ['summary', 'location', 'desiredSalary', 'years'].filter((k) => c[k]).length + (c.skills?.length ? 1 : 0) + (c.experiences?.length ? 1 : 0);
  const completeness = Math.round((filled / 6) * 100);
  el.innerHTML = `<div class="row" style="margin-bottom:16px">${avatar(c, 56)}<div><h1 style="margin:0">こんにちは、${esc(c.name)}さん</h1><p class="muted" style="margin:0">${esc(value.role.name)}・${LEVEL[value.level]}　あなたに合う求人が <b>${value.matchingJobs.strong}件</b> あります</p></div></div>
    ${completeness < 100 || c.status !== 'published' ? `<div class="card" style="margin-bottom:16px"><div class="row between"><b>プロフィール充実度 ${completeness}%</b><a class="btn sm primary" href="#/profile">ファイルをアップして完成させる</a></div><div class="progress" style="margin-top:8px"><i style="width:${completeness}%"></i></div></div>` : ''}
    <div class="grid g4">
      <div class="card stat"><div class="label">想定年収（市場価値）</div><div class="value num">${value.estimate.low}〜${value.estimate.high}<small>万円</small></div><div class="sub">中央値 ${value.estimate.mid}万円${value.topPercent ? `・同職種で上位${value.topPercent}%` : ''}</div></div>
      <div class="card stat"><div class="label">マッチ度70点以上の求人</div><div class="value num">${value.matchingJobs.strong}<small>件</small></div><div class="sub">検討の余地あり ${value.matchingJobs.possible}件</div></div>
      <div class="card stat"><div class="label">応募中</div><div class="value num">${apps.length}<small>件</small></div><div class="sub">面接予定 ${apps.filter((a) => a.status === 'interview').length}件</div></div>
      <div class="card stat"><div class="label">相互マッチ</div><div class="value num">${matches.length}<small>件</small></div><div class="sub">スカウト受信 ${jobs.filter((j) => j.scouted).length}件</div></div>
    </div>
    ${next ? `<div class="card" style="margin-top:16px;border-left:4px solid var(--brand)"><div class="row between"><div><b>📅 次の面接: ${fmtDate(next.interviewAt)}</b><div class="muted">${esc(next.job.company.name)}「${esc(next.job.title)}」</div></div><div class="row"><a class="btn" href="#/prep?job=${next.jobId}">面談準備アドバイス</a><a class="btn primary" href="#/interview?job=${next.jobId}">🎤 模擬面接で練習</a></div></div></div>` : ''}
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><div class="row between"><h2>おすすめ求人</h2><a href="#/jobs">すべて見る →</a></div><div data-jobs>${jobs.slice(0, 4).map(jobCard).join('')}</div></div>
      <div class="card"><h2>あなたの強み（市場で需要の高い保有スキル）</h2><div data-hot></div><p class="tiny">市場ヒート = 外部需要指標とプラットフォーム内の需給比から算出</p>
        <div class="row" style="margin-top:12px"><a class="btn" href="#/skills">📚 次に学ぶべきスキル</a><a class="btn" href="#/fair">🏢 バーチャル説明会へ</a></div></div>
    </div>`;
  hbar(el.querySelector('[data-hot]'), value.hotOwned.map((s) => ({ label: s.name, value: s.heat, note: `需要 ${s.demand} / 供給 ${s.supply}` })), { max: 100 });
  bindJobActions(el, () => candHome(el));
}

export async function candJobs(el, params) {
  el.innerHTML = `<h1>🔎 求人を探す</h1><p class="muted">あなたのプロフィールとのマッチ度順に表示しています。</p>
    <div class="card" style="margin-bottom:12px"><div class="row">
      <input class="input" style="max-width:220px" placeholder="キーワード" data-q value="${esc(params.get('q') || '')}">
      <select class="input" style="width:auto" data-role><option value="">職種すべて</option>${state.meta.roles.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select>
      <select class="input" style="width:auto" data-remote><option value="">働き方すべて</option>${['full', 'hybrid', 'onsite'].map((k) => `<option value="${k}">${REMOTE[k]}</option>`).join('')}</select>
      <label class="row tiny"><input type="checkbox" data-strong> 70点以上のみ</label><span class="tiny" data-count></span></div></div><div data-list></div>`;
  const load = async () => {
    const q = new URLSearchParams({ q: el.querySelector('[data-q]').value, role: el.querySelector('[data-role]').value, remote: el.querySelector('[data-remote]').value });
    let list = await api(`/api/jobs?${q}`);
    if (el.querySelector('[data-strong]').checked) list = list.filter((x) => x.match.total >= 70);
    el.querySelector('[data-count]').textContent = `${list.length}件`;
    el.querySelector('[data-list]').innerHTML = list.map(jobCard).join('') || '<div class="empty">条件に合う求人がありません</div>';
    bindJobActions(el.querySelector('[data-list]'), load);
  };
  el.querySelectorAll('input,select').forEach((i) => i.addEventListener(i.tagName === 'INPUT' && i.type !== 'checkbox' ? 'input' : 'change', load));
  load();
}

export async function candApplications(el) {
  const [apps, matches] = await Promise.all([api('/api/applications'), api('/api/matches')]);
  el.innerHTML = `<h1>📮 応募・マッチ状況</h1>
    <div class="grid g2"><div class="card"><h2>応募中の求人</h2>${apps.map((a) => `<div class="list-item">${companyLogo(a.job.company)}<div class="grow"><b>${esc(a.job.title)}</b><div class="tiny">${esc(a.job.company.name)}</div><div class="row" style="margin-top:6px"><span class="badge">${APP_STATUS[a.status]}</span>${a.interviewAt ? `<span class="tiny">面接: ${fmtDate(a.interviewAt)}</span>` : ''}</div>
      <div class="row" style="margin-top:6px"><a class="btn sm" href="#/prep?job=${a.jobId}">面談準備</a><a class="btn sm" href="#/interview?job=${a.jobId}">模擬面接</a></div></div>${ring(a.match.total, 54)}</div>`).join('') || '<div class="empty">まだ応募していません</div>'}</div>
    <div class="card"><h2>🤝 相互マッチ</h2><p class="tiny">企業とあなたの双方が「興味あり」を送ると成立し、連絡先が共有されます。</p>${matches.map((m) => `<div class="list-item">${companyLogo(m.job.company)}<div class="grow"><b>${esc(m.job.title)}</b><div class="tiny">${esc(m.job.company.name)}</div></div>${ring(m.match.total, 54)}</div>`).join('') || '<div class="empty">まだ相互マッチはありません</div>'}</div></div>`;
}

export async function candFair(el) {
  el.innerHTML = '<h1>🏢 バーチャル合同企業説明会</h1><p class="muted">会場を歩いて企業ブースを訪問しましょう。ブース上の数字はあなたとのマッチ度です。</p><div data-fair></div>';
  const companies = await api('/api/fair');
  mountFair(el.querySelector('[data-fair]'), companies, { onBooth: (jobId) => jobDetail(jobId), isCandidate: state.user.type === 'candidate' });
}

async function pickJob(el, params, path, title) {
  const [apps, jobs] = await Promise.all([api('/api/applications'), api('/api/jobs')]);
  const options = [...apps.map((a) => ({ id: a.jobId, label: `【応募中】${a.job.company.name} ${a.job.title}` })), ...jobs.filter((j) => !apps.some((a) => a.jobId === j.job.id)).slice(0, 30).map((j) => ({ id: j.job.id, label: `${j.job.company.name} ${j.job.title}（${j.match.total}点）` }))];
  const cur = params.get('job') || options[0]?.id || '';
  el.innerHTML = `<h1>${title}</h1><div class="card" style="margin-bottom:12px"><label class="f">対象の求人</label><select class="input" data-job>${path === 'interview' ? '<option value="">汎用（職種のみ）</option>' : ''}${options.map((o) => `<option value="${o.id}" ${o.id === cur ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></div><div data-body></div>`;
  el.querySelector('[data-job]').addEventListener('change', (e) => { location.hash = `#/${path}?job=${e.target.value}`; });
  return { jobId: cur, body: el.querySelector('[data-body]') };
}

export async function candPrep(el, params) {
  const { jobId, body } = await pickJob(el, params, 'prep', '🧑‍🏫 面談前の準備アドバイス');
  if (!jobId) { body.innerHTML = '<div class="empty">求人を選択してください</div>'; return; }
  body.innerHTML = '<div class="empty">アドバイスを作成中…</div>';
  const a = await api(`/api/advice/prep?jobId=${jobId}`);
  body.innerHTML = `<div class="card"><div class="row">${ring(a.match.total, 72)}<div class="grow" style="flex:1"><h2 style="margin:0">${esc(a.job.company.name)}「${esc(a.job.title)}」</h2><p style="margin:4px 0 0">${esc(a.summary)}</p><span class="tiny">${a.engine === 'claude' ? '🤖 AIアドバイス' : '📐 ルールベース'}</span></div><a class="btn primary" href="#/interview?job=${jobId}">🎤 模擬面接で練習</a></div>
      ${a.aiPoints ? `<ul style="margin-top:10px">${a.aiPoints.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}</div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><h2>❓ 想定される質問と回答のコツ</h2>${a.likely.map((q) => `<div class="q"><b>${esc(q.q)}</b><span class="tiny">💡 ${esc(q.tip)}</span></div>`).join('')}</div>
      <div><div class="card"><h2>⭐ STAR形式で準備するエピソード</h2>${a.stories.map((s) => `<h3>${esc(s.title)}</h3><table class="t"><tbody>${Object.entries(s.star).map(([k, v]) => `<tr><th style="width:70px">${{ S: '状況', T: '課題', A: '行動', R: '結果' }[k]}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`).join('') || '<p class="muted">職務経歴を登録するとエピソードの準備例を作成します</p>'}</div>
      <div class="card"><h2>📖 面接までに補強したいスキル</h2>${a.brushUp.map((b) => `<div class="q"><b>${esc(b.name)}（目安 ${b.hours}時間）</b><span class="tiny">${esc(b.quick)}</span></div>`).join('') || '<p class="muted">必須スキルはすべて満たしています 🎉</p>'}</div>
      <div class="card"><h2>🙋 逆質問の例</h2><ul>${a.reverse.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>
      <div class="card"><h2>💰 条件交渉のポイント</h2><ul>${a.negotiation.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>
      <div class="card"><h2>✅ 前日チェックリスト</h2>${a.checklist.map((c, i) => `<label class="row" style="margin-bottom:4px"><input type="checkbox" id="ck${i}"> ${esc(c)}</label>`).join('')}</div></div>
    </div>`;
}

let cleanupInterview = null;
export async function candInterview(el, params) {
  cleanupInterview?.();
  const { jobId, body } = await pickJob(el, params, 'interview', '🎤 模擬面接');
  cleanupInterview = mountInterview(body, { jobId });
  const hist = await api('/api/interview/sessions').catch(() => []);
  if (hist.length) {
    const h = document.createElement('div');
    h.className = 'card';
    h.style.marginTop = '16px';
    h.innerHTML = `<h2>練習履歴</h2><table class="t"><thead><tr><th>日時</th><th>質問数</th><th>総合</th></tr></thead><tbody>${hist.map((s) => `<tr><td>${fmtDate(s.createdAt)}</td><td class="num">${s.results.length}</td><td class="num"><b>${s.score}</b></td></tr>`).join('')}</tbody></table>`;
    el.append(h);
  }
}
export function stopInterview() {
  cleanupInterview?.();
  cleanupInterview = null;
}

export async function candSkills(el, params) {
  const c = state.me.candidate;
  const roleSel = params.get('role') || '';
  const a = await api(`/api/advice/skills${roleSel ? `?role=${roleSel}` : ''}`);
  const r0 = a.roles[0];
  el.innerHTML = `<h1>📚 身につけるべきスキル</h1><p class="muted">目標職種の要件 × 市場の需要・成長率 × 習得コストから、学ぶ順番を提案します。</p>
    <div class="card" style="margin-bottom:12px"><label class="f">目標の職種</label><select class="input" data-role><option value="">希望職種（${(c.desiredRoles || []).length}件）</option>${state.meta.roles.map((r) => `<option value="${r.id}" ${r.id === roleSel ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></div>
    ${a.roles.map((r) => `<div class="card"><div class="row between"><h2 style="margin:0">${r.role.icon} ${esc(r.role.name)}</h2><span>必須スキル充足率 <b class="num">${r.coverage}%</b></span></div>
      <div class="progress" style="margin:8px 0 12px"><i style="width:${r.coverage}%"></i></div>
      <p class="muted">${LEVEL[a.level]}の相場 中央値 <b>${r.salaryNow?.median}万円</b> → 次のレベルで <b>${r.salaryNext?.median}万円</b>（<b style="color:var(--good-ink)">+${r.uplift}万円</b>）</p>
      <div class="scroll-x"><table class="t"><thead><tr><th>優先</th><th>スキル</th><th>区分</th><th>市場ヒート</th><th>需要成長</th><th>習得目安</th><th>学び方</th></tr></thead><tbody>
      ${r.items.slice(0, 8).map((it, i) => `<tr><td class="num"><b>${i + 1}</b></td><td><b>${esc(it.name)}</b>${it.current ? `<div class="tiny">現在 Lv${it.current}</div>` : ''}</td><td><span class="chip ${it.kind === '必須' ? 'miss' : ''}">${it.kind}</span></td><td class="num">${it.heat}</td><td class="num">${it.growth >= 0 ? '▲' : '▼'}${Math.abs(it.growth)}%</td><td class="num">${it.hours}h</td><td class="tiny">${it.path.map(esc).join(' → ')}</td></tr>`).join('') || '<tr><td colspan="7">要件をすべて満たしています 🎉</td></tr>'}</tbody></table></div></div>`).join('')}
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><h2>🗓 12週間の学習プラン（${esc(r0.role.name)}）</h2>${a.plan.map((p) => `<div class="timeline-step"><b class="num">第${p.from}${p.to !== p.from ? `〜${p.to}` : ''}週</b><div><b>${esc(p.skill)}</b><div class="tiny">目標: ${esc(p.goal)} ／ 成果物: ${esc(p.output)}</div></div></div>`).join('') || '<p class="muted">追加で学ぶべきスキルはありません</p>'}<p class="tiny">週10時間の学習を想定</p></div>
      <div class="card"><h2>🚀 需要が伸びている隣接スキル</h2><div data-trend></div></div>
    </div>`;
  el.querySelector('[data-role]').addEventListener('change', (e) => { location.hash = `#/skills${e.target.value ? `?role=${e.target.value}` : ''}`; });
  hbar(el.querySelector('[data-trend]'), a.trending.map((t) => ({ label: t.name, value: t.growth, note: t.cat })), { unit: '%', color: 'var(--s3)' });
}

export { profileEditor };
