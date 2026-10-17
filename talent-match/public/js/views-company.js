// 企業向け画面
import { api, esc, state, toast, skillName, roleName, REMOTE, LEVEL, APP_STATUS, salary, matchBadge, modal, fmtDate } from './core.js';
import { ring, radar, hbar, seqColor, seqInk, shareBar } from './charts.js';
import { avatar } from './avatar.js';
import { resumePaper, jobEditor } from './editors.js';

const BREAK = { skills: 'スキル', experience: '経験', salary: '年収', workstyle: '働き方', language: '語学' };

export async function compHome(el) {
  const [jobs, apps, matches, hr] = await Promise.all([api('/api/company/jobs'), api('/api/applications'), api('/api/matches'), api('/api/hr/dashboard')]);
  const upcoming = apps.filter((a) => a.interviewAt && new Date(a.interviewAt) > new Date()).sort((a, b) => a.interviewAt.localeCompare(b.interviewAt));
  el.innerHTML = `<h1>${esc(state.me.company.name)} 採用ダッシュボード</h1>
    <div class="grid g4">
      <div class="card stat"><div class="label">掲載中の求人</div><div class="value num">${jobs.filter((j) => j.status !== 'closed').length}<small>件</small></div><div class="sub"><a href="#/job-new">＋ 新規作成</a></div></div>
      <div class="card stat"><div class="label">マッチ度70点以上の候補者</div><div class="value num">${jobs.reduce((s, j) => s + j.stats.strong, 0)}<small>人</small></div><div class="sub">全求人の合計（重複あり）</div></div>
      <div class="card stat"><div class="label">応募</div><div class="value num">${apps.length}<small>件</small></div><div class="sub">面接予定 ${upcoming.length}件</div></div>
      <div class="card stat"><div class="label">相互マッチ</div><div class="value num">${matches.length}<small>件</small></div><div class="sub">連絡先が開示済み</div></div>
    </div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><div class="row between"><h2>求人別の母集団</h2><a href="#/jobs-manage">求人管理 →</a></div>
        <div class="scroll-x"><table class="t"><thead><tr><th>求人</th><th>年収</th><th>有力候補</th><th>応募</th><th></th></tr></thead><tbody>
        ${jobs.map((j) => `<tr><td><b>${esc(j.title)}</b><div class="tiny">${REMOTE[j.remote]}</div></td><td class="num">${salary(j.salaryMin, j.salaryMax)}</td><td class="num">${j.stats.strong}</td><td class="num">${j.stats.applications}</td><td><a class="btn sm" href="#/candidates?job=${j.id}">候補者</a></td></tr>`).join('')}</tbody></table></div></div>
      <div class="card"><h2>📅 直近の面接</h2>${upcoming.map((a) => `<div class="list-item">${avatar(a.candidate)}<div class="grow"><b>${esc(a.candidate.name)}</b><div class="tiny">${fmtDate(a.interviewAt)}・${esc(a.job.title)}</div></div><a class="btn sm primary" href="#/advice?job=${a.jobId}&cand=${a.candidateId}">面談アドバイス</a></div>`).join('') || '<div class="empty">予定されている面接はありません</div>'}
        <h2 style="margin-top:16px">👥 社内リソース</h2><p>社員 <b>${hr.summary.headcount}名</b>・平均稼働率 <b>${hr.summary.avgUtilization}%</b>・離職リスク高 <b style="color:var(--critical)">${hr.summary.highRisk}名</b></p><a class="btn" href="#/hr">人材管理を開く →</a></div>
    </div>`;
}

export async function compJobs(el) {
  const jobs = await api('/api/company/jobs');
  el.innerHTML = `<div class="row between"><h1>📢 求人管理</h1><a class="btn primary" href="#/job-new">＋ 求人を作成</a></div>
    ${jobs.map((j) => `<div class="list-item"><div class="grow"><b>${esc(j.title)}</b> <span class="badge">${j.status === 'closed' ? '募集終了' : '募集中'}</span><div class="tiny">${esc(roleName(j.roleId))}・${LEVEL[j.level] || ''}・${salary(j.salaryMin, j.salaryMax)}・${REMOTE[j.remote]}</div>
      <div class="row" style="margin-top:6px">${j.required.map((r) => `<span class="chip">${esc(skillName(r.id))}</span>`).join('')}</div></div>
      <div class="row"><a class="btn sm" href="#/candidates?job=${j.id}">候補者 ${j.stats.strong}</a><a class="btn sm" href="#/job-edit?id=${j.id}">編集</a><button class="btn sm ghost" data-toggle="${j.id}" data-status="${j.status}">${j.status === 'closed' ? '再開' : '終了'}</button></div></div>`).join('') || '<div class="empty">求人がありません</div>'}`;
  el.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', async () => {
    await api(`/api/jobs/${b.dataset.toggle}`, { method: 'PUT', body: { status: b.dataset.status === 'closed' ? 'open' : 'closed' } });
    compJobs(el);
  }));
}

export function compJobEdit(el, params) {
  return jobEditor(el, params.get('id'), params.get('template'));
}

function candidateCard(x, jobId) {
  const c = x.candidate;
  const m = x.match;
  return `<div class="list-item">${avatar(c, 48)}
    <div class="grow"><div class="row between"><div><b>${esc(c.name)}</b> ${x.mutual ? '<span class="badge" style="background:#dcfce7;color:#166534">🤝 相互マッチ</span>' : ''}<div class="tiny">${esc(roleName(c.desiredRoles?.[0]))}・経験${c.years}年・${esc(c.location || '')}・希望${c.desiredSalary || '-'}万円・${REMOTE[c.remote] || ''}</div></div></div>
      <div class="row" style="margin-top:6px">${m.matched.map((s) => `<span class="chip ok">✓ ${esc(s.name)}</span>`).join('')}${m.partial.map((s) => `<span class="chip part">△ ${esc(s.name)}</span>`).join('')}${m.missing.map((s) => `<span class="chip miss">✗ ${esc(s.name)}</span>`).join('')}</div>
      <div class="row" style="margin-top:8px"><button class="btn sm" data-cand="${c.id}">プロフィール</button><button class="btn sm ${x.liked ? 'liked' : ''}" data-scout="${c.id}">${x.liked ? '♥ スカウト済み' : '📩 スカウト'}</button><a class="btn sm ghost" href="#/advice?job=${jobId}&cand=${c.id}">面談アドバイス</a></div></div>
    <div style="text-align:center">${ring(m.total, 64)}<div>${matchBadge(m.total)}</div></div></div>`;
}

async function candidateModal(candId, jobId) {
  const { candidate: c, matches } = await api(`/api/candidates/${candId}`);
  const m = matches.find((x) => x.jobId === jobId)?.match || matches[0]?.match;
  modal(`<div class="grid g2"><div>${resumePaper({ ...c, name: c.email ? c.name : `${c.name}（連絡先は相互マッチ後に開示）` })}</div>
    <div><h3>求人とのマッチ内訳</h3><div data-radar></div><ul>${(m?.reasons || []).map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
      <h3>自社の他求人との相性</h3><table class="t"><tbody>${matches.map((x) => `<tr><td>${esc(x.title)}</td><td class="num"><b>${x.match.total}</b></td></tr>`).join('')}</tbody></table>
      <div class="row" style="margin-top:12px"><a class="btn primary" href="#/advice?job=${jobId}&cand=${c.id}" data-close>面談アドバイスを見る</a></div></div></div>`, {
    wide: true,
    onMount: (el) => m && radar(el.querySelector('[data-radar]'), Object.entries(m.breakdown).map(([k, v]) => ({ label: BREAK[k], value: v }))),
  });
}

export async function compCandidates(el, params) {
  const jobs = await api('/api/company/jobs');
  const jobId = params.get('job') || jobs[0]?.id;
  if (!jobId) { el.innerHTML = '<div class="empty">まず求人を作成してください。<a href="#/job-new">求人を作成</a></div>'; return; }
  el.innerHTML = `<h1>🎯 候補者マッチング</h1><p class="muted">求人要件とのマッチ度順。✓=要件充足 △=部分的/近接スキル ✗=未経験</p>
    <div class="card" style="margin-bottom:12px"><div class="row"><select class="input" style="max-width:420px" data-job>${jobs.map((j) => `<option value="${j.id}" ${j.id === jobId ? 'selected' : ''}>${esc(j.title)}</option>`).join('')}</select>
    <label class="row tiny"><input type="checkbox" data-strong checked> 55点以上のみ</label><span class="tiny" data-count></span></div></div><div data-list></div>`;
  el.querySelector('[data-job]').addEventListener('change', (e) => { location.hash = `#/candidates?job=${e.target.value}`; });
  const load = async () => {
    let list = await api(`/api/candidates?jobId=${jobId}`);
    if (el.querySelector('[data-strong]').checked) list = list.filter((x) => x.match.total >= 55);
    el.querySelector('[data-count]').textContent = `${list.length}人`;
    const box = el.querySelector('[data-list]');
    box.innerHTML = list.map((x) => candidateCard(x, jobId)).join('') || '<div class="empty">条件に合う候補者がいません。求人要件の緩和を検討してください（市場動態ページ参照）</div>';
    box.querySelectorAll('[data-cand]').forEach((b) => b.addEventListener('click', () => candidateModal(b.dataset.cand, jobId)));
    box.querySelectorAll('[data-scout]').forEach((b) => b.addEventListener('click', async () => {
      const r = await api('/api/likes', { method: 'POST', body: { jobId, candidateId: b.dataset.scout } });
      toast(r.mutual ? '🤝 相互マッチが成立しました！連絡先が開示されます' : r.liked ? '📩 スカウトを送りました' : 'スカウトを取り消しました');
      load();
    }));
  };
  el.querySelector('[data-strong]').addEventListener('change', load);
  load();
}

export async function compPipeline(el) {
  const apps = await api('/api/applications');
  const cols = Object.keys(APP_STATUS);
  el.innerHTML = `<h1>📋 選考管理</h1><p class="muted">ステータスを変更して選考を進めます。面接予定の候補者には面談アドバイスを確認しましょう。</p>
    <div class="kanban">${cols.map((s) => `<div class="col"><h4>${APP_STATUS[s]}（${apps.filter((a) => a.status === s).length}）</h4>${apps.filter((a) => a.status === s).map((a) => `<div class="kcard"><div class="row">${avatar(a.candidate, 30)}<b>${esc(a.candidate.name)}</b></div><div class="tiny">${esc(a.job.title)}</div><div class="row between" style="margin-top:4px"><span class="num">${a.match.total}点</span>${a.interviewAt ? `<span class="tiny">${fmtDate(a.interviewAt)}</span>` : ''}</div>
      <select class="input" style="margin-top:6px;padding:4px" data-app="${a.id}">${cols.map((c) => `<option value="${c}" ${c === a.status ? 'selected' : ''}>${APP_STATUS[c]}</option>`).join('')}</select>
      <a class="btn sm" style="margin-top:6px;width:100%;justify-content:center" href="#/advice?job=${a.jobId}&cand=${a.candidateId}">面談アドバイス</a></div>`).join('')}</div>`).join('')}</div>`;
  el.querySelectorAll('[data-app]').forEach((s) => s.addEventListener('change', async () => {
    const body = { status: s.value };
    if (s.value === 'interview') body.interviewAt = new Date(Date.now() + 2 * 864e5).toISOString();
    await api(`/api/applications/${s.dataset.app}`, { method: 'PATCH', body });
    toast(`ステータスを「${APP_STATUS[s.value]}」に変更しました`);
    compPipeline(el);
  }));
}

export async function compAdvice(el, params) {
  const jobId = params.get('job');
  const candId = params.get('cand');
  if (!jobId || !candId) { el.innerHTML = '<div class="empty">候補者マッチングまたは選考管理から候補者を選んでください</div>'; return; }
  el.innerHTML = '<div class="empty">面談アドバイスを作成中…</div>';
  const [a, { candidate: c }] = await Promise.all([api(`/api/advice/interview?jobId=${jobId}&candidateId=${candId}`), api(`/api/candidates/${candId}`)]);
  const ul = (arr) => (arr.length ? `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="muted">特になし</p>');
  el.innerHTML = `<h1>🧑‍💼 面談アドバイス</h1>
    <div class="card"><div class="row">${avatar(c, 56)}<div class="grow" style="flex:1"><h2 style="margin:0">${esc(c.name)}</h2><p style="margin:4px 0">${esc(a.summary)}</p><span class="tiny">${a.engine === 'claude' ? '🤖 AIアドバイス' : '📐 ルールベース'}</span></div>${ring(a.match.total, 80)}</div>
      ${a.aiPoints ? `<h3 style="margin-top:10px">確認すべき重要ポイント</h3>${ul(a.aiPoints)}` : ''}</div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><h2>⏱ 60分の進行案</h2>${a.timeline.map((t) => `<div class="timeline-step"><b class="num">${t.min}</b><span>${esc(t.what)}</span></div>`).join('')}
        <h2 style="margin-top:16px">💪 強みの確認（再現性を見る）</h2>${a.strengths.map((s) => `<div class="q"><b>${esc(s.title)}</b>「${esc(s.q)}」<div class="tiny">👀 ${esc(s.look)}</div></div>`).join('') || '<p class="muted">高レベルの保有スキルはありません</p>'}
        <h2 style="margin-top:16px">🔍 ギャップの確認</h2>${a.gaps.map((s) => `<div class="q"><b>${esc(s.title)}</b>「${esc(s.q)}」<div class="tiny">👀 ${esc(s.look)}</div></div>`).join('') || '<p class="muted">必須要件の不足はありません</p>'}</div>
      <div>
        <div class="card"><h2>❓ 質問リスト</h2>${a.questions.map((q, i) => `<div class="q"><b>Q${i + 1}. ${esc(q.q)}</b><span class="tiny">評価観点: ${esc(q.intent)}</span></div>`).join('')}</div>
        <div class="card"><h2>📊 評価ルーブリック</h2><table class="t"><thead><tr><th>観点</th><th>配点</th><th>目安</th><th>評価</th></tr></thead><tbody>${a.rubric.map((r, i) => `<tr><td>${esc(r.name)}</td><td class="num">${r.weight}</td><td class="tiny">${esc(r.guide)}</td><td><select class="input" style="padding:2px" data-rub="${i}"><option value="">-</option>${[1, 2, 3, 4, 5].map((n) => `<option>${n}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table><p>総合評価: <b class="num" data-total>-</b></p></div>
        <div class="card"><h2>🤝 条件のすり合わせ</h2>${ul(a.conditions)}<h2>✨ 候補者への訴求ポイント</h2>${ul(a.attract)}<h2>⚠️ 注意して確認すること</h2>${ul(a.flags)}<h2>🚫 NG質問（法令・公正採用）</h2>${ul(a.ng)}</div>
      </div></div>`;
  el.querySelectorAll('[data-rub]').forEach((s) => s.addEventListener('change', () => {
    let sum = 0; let w = 0;
    el.querySelectorAll('[data-rub]').forEach((x) => { if (x.value) { sum += Number(x.value) * a.rubric[x.dataset.rub].weight; w += a.rubric[x.dataset.rub].weight; } });
    el.querySelector('[data-total]').textContent = w ? `${Math.round((sum / w) * 20)} / 100` : '-';
  }));
}

export async function compHR(el) {
  const d = await api('/api/hr/dashboard');
  const projects = d.staffing;
  el.innerHTML = `<h1>👥 人的リソース管理</h1>
    <div class="grid g4">
      <div class="card stat"><div class="label">社員数</div><div class="value num">${d.summary.headcount}<small>名</small></div><div class="sub">進行中プロジェクト ${d.summary.openProjects}件</div></div>
      <div class="card stat"><div class="label">平均稼働率</div><div class="value num">${d.summary.avgUtilization}<small>%</small></div><div class="sub">過負荷(&gt;100%) ${d.summary.overloaded}名・アサイン余力 ${d.summary.bench}名</div></div>
      <div class="card stat"><div class="label">離職リスク 高</div><div class="value num" style="color:var(--critical)">${d.summary.highRisk}<small>名</small></div><div class="sub">エンゲージメント・報酬・負荷から推定</div></div>
      <div class="card stat"><div class="label">属人化スキル</div><div class="value num">${d.matrix.risks.length}<small>件</small></div><div class="sub">Lv3以上が1名以下</div></div>
    </div>
    <div class="card" style="margin-top:16px"><div class="tabs-host"></div></div>`;
  const host = el.querySelector('.tabs-host');
  const { tabs } = await import('./core.js');
  tabs(host, ['スキルマトリクス', 'プロジェクト配置', '社員一覧', '採用・育成プラン'], (i, body) => {
    if (i === 0) {
      body.innerHTML = `<div class="scroll-x"><table class="heat"><thead><tr><th></th>${d.matrix.skills.map((s) => `<th class="tiny" style="writing-mode:vertical-rl;height:110px;font-weight:500">${esc(s.name)}</th>`).join('')}</tr></thead><tbody>
        ${d.matrix.rows.map((r) => `<tr><th style="text-align:left;white-space:nowrap;font-size:.82rem;padding-right:8px">${esc(r.name)}<div class="tiny">${esc(r.role)}</div></th>${r.levels.map((lv, k) => `<td class="num" title="${esc(r.name)} × ${esc(d.matrix.skills[k].name)}: Lv${lv || 0}" style="background:${seqColor(lv)};color:${seqInk(lv)}">${lv || ''}</td>`).join('')}</tr>`).join('')}
        <tr><th style="text-align:left;font-size:.8rem">Lv3以上の人数</th>${d.matrix.bus.map((b) => `<td class="num" style="font-weight:700;color:${b.experts <= 1 ? 'var(--critical)' : 'var(--ink)'}">${b.experts <= 1 ? '⚠' : ''}${b.experts}</td>`).join('')}</tr></tbody></table></div>
        <div class="legend"><span>スキルレベル:</span>${[1, 2, 3, 4, 5].map((l) => `<span><i style="background:${seqColor(l)}"></i>Lv${l}</span>`).join('')}<span>⚠ = 属人化リスク</span></div>`;
    } else if (i === 1) {
      body.innerHTML = projects.map((p) => `<div class="list-item"><div class="grow"><div class="row between"><b>${esc(p.name)}</b><span class="tiny">${p.start}〜${p.end}・${p.status === 'active' ? '進行中' : '計画中'}</span></div>
        <div class="row" style="margin:6px 0">配置 ${p.members.length}/${p.headcount}名 ${p.shortage ? `<span class="chip miss">不足 ${p.shortage}名</span>` : '<span class="chip ok">充足</span>'} ${p.gaps.map((g) => `<span class="chip miss">✗ ${esc(g.name)} Lv${g.level}</span>`).join('')}</div>
        <div class="tiny">メンバー: ${p.members.map((m) => `${esc(m.name)}(適合${m.fit}%)`).join('、') || 'なし'}</div>
        ${p.candidates.length ? `<div style="margin-top:8px"><b class="tiny">社内アサイン候補（稼働に余力あり）</b>${p.candidates.map((c) => `<div class="row between" style="margin-top:4px"><span>${esc(c.name)} <span class="tiny">適合${c.fit}%・稼働${c.utilization}%</span></span><button class="btn sm" data-assign="${c.id}" data-proj="${p.id}">アサイン</button></div>`).join('')}</div>` : ''}</div></div>`).join('');
      body.querySelectorAll('[data-assign]').forEach((b) => b.addEventListener('click', async () => {
        await api('/api/hr/assign', { method: 'POST', body: { employeeId: b.dataset.assign, projectId: b.dataset.proj } });
        toast('アサインしました');
        compHR(el);
      }));
    } else if (i === 2) {
      body.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn sm primary" data-add>＋ 社員を追加</button></div><div class="scroll-x"><table class="t"><thead><tr><th>社員</th><th>職種</th><th>経験</th><th>稼働率</th><th>年収</th><th>エンゲージメント</th><th>離職リスク</th></tr></thead><tbody>
        ${d.people.map((p) => `<tr><td><div class="row">${avatar(p, 30)}${esc(p.name)}</div></td><td>${esc(p.roleName)}</td><td class="num">${p.years}年</td><td style="min-width:110px"><div class="progress"><i style="width:${Math.min(100, p.utilization)}%;background:${p.utilization > 100 ? 'var(--critical)' : 'var(--brand)'}"></i></div><span class="tiny num">${p.utilization}%${p.utilization > 100 ? ' ⚠過負荷' : ''}</span></td><td class="num">${p.salary}万</td><td class="num">${p.engagement}</td>
          <td><span class="status" style="color:${p.risk.level === '高' ? 'var(--critical)' : p.risk.level === '中' ? 'var(--ink-2)' : 'var(--good-ink)'}">${p.risk.level === '高' ? '▲' : p.risk.level === '中' ? '■' : '●'} ${p.risk.level}</span><div class="tiny">${p.risk.reasons.map(esc).join('・')}</div></td></tr>`).join('')}</tbody></table></div>`;
      body.querySelector('[data-add]').addEventListener('click', () => addEmployee(() => compHR(el)));
    } else {
      body.innerHTML = `<p class="muted">プロジェクトで不足しているスキルを「社内育成」と「外部採用」に振り分けた提案です。</p>
        ${d.actions.map((a) => `<div class="list-item"><div class="grow"><b>${esc(a.skill)}</b> <span class="tiny">（${a.projects}プロジェクトで不足）</span><div>${a.plan === 'upskill' ? '📚 育成' : '📢 採用'}: ${esc(a.detail)}</div></div>${a.templateId ? `<a class="btn sm primary" href="#/job-new?template=${a.templateId}">求人を作成</a>` : ''}</div>`).join('') || '<div class="empty">不足スキルはありません</div>'}
        <h3 style="margin-top:16px">職種構成</h3><div data-roles></div>`;
      hbar(body.querySelector('[data-roles]'), Object.entries(d.byRole).map(([k, v]) => ({ label: k, value: v })), { unit: '名', labelWidth: 170 });
    }
  });
}

function addEmployee(done) {
  const draft = { name: '', roleId: 'backend', years: 3, utilization: 0, salary: 600, engagement: 70, skills: [] };
  modal(`<h2>社員を追加</h2><div class="grid g2">
    <div class="field"><label class="f">氏名</label><input class="input" data-k="name"></div>
    <div class="field"><label class="f">職種</label><select class="input" data-k="roleId">${state.meta.roles.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select></div>
    <div class="field"><label class="f">経験年数</label><input class="input" type="number" data-k="years" value="3"></div>
    <div class="field"><label class="f">年収（万円）</label><input class="input" type="number" data-k="salary" value="600"></div></div>
    <div class="field"><label class="f">保有スキル（Ctrl/⌘で複数選択・Lv3で登録）</label><select class="input" multiple size="6" data-skills>${state.meta.skills.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
    <div class="row" style="justify-content:flex-end"><button class="btn primary" data-save>追加</button></div>`, {
    onMount: (m, close) => m.querySelector('[data-save]').addEventListener('click', async () => {
      m.querySelectorAll('[data-k]').forEach((i) => { draft[i.dataset.k] = i.type === 'number' ? Number(i.value) : i.value; });
      draft.skills = [...m.querySelector('[data-skills]').selectedOptions].map((o) => ({ id: o.value, level: 3 }));
      if (!draft.name) return toast('氏名を入力してください');
      await api('/api/hr/employees', { method: 'POST', body: draft });
      close(); toast('社員を追加しました'); done();
    }),
  });
}

export { shareBar };
