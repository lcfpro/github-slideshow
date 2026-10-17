// 応募者プロフィール／求人票の作成: ファイル自動抽出 → テンプレート選択 → 少し修正 → 提出
import { api, esc, state, toast, skillName, roleName, REMOTE, LEVEL, salary, modal } from './core.js';

// ---------- 共通部品 ----------

function dropZone(kind, onResult) {
  const id = `f-${Math.random().toString(36).slice(2)}`;
  const html = `<label class="drop" for="${id}" data-drop>
      <div style="font-size:34px">📂</div>
      <b>${kind === 'job' ? '求人票' : '履歴書・職務経歴書'}をドラッグ＆ドロップ</b>
      <div class="muted">または クリックして選択（複数ファイル可・最大15MB）</div>
      <div class="file-icons">${['PDF', 'Word', 'Excel', 'CSV', 'テキスト', 'Markdown', 'JSON', 'HTML', state.meta.ai ? '画像（OCR）' : null].filter(Boolean).map((t) => `<span>${t}</span>`).join('')}</div>
      <input id="${id}" type="file" multiple hidden accept="${state.meta.supportedExt.join(',')}">
    </label><div data-status></div>`;
  const bind = (root) => {
    const zone = root.querySelector('[data-drop]');
    const input = root.querySelector(`#${id}`);
    const status = root.querySelector('[data-status]');
    const send = async (files) => {
      if (!files.length) return;
      const fd = new FormData();
      for (const f of files) fd.append('files', f);
      status.innerHTML = `<div class="card" style="margin-top:10px"><div class="row"><span>🔍 ${files.length}件のファイルを解析中…</span></div><div class="progress" style="margin-top:8px"><i style="width:60%"></i></div></div>`;
      try {
        const r = await api(`/api/extract?kind=${kind}`, { method: 'POST', body: fd });
        status.innerHTML = `<div class="card" style="margin-top:10px"><b>✅ 抽出完了</b>
          <table class="t" style="margin-top:6px"><tbody>${r.sources.map((s) => `<tr><td>${esc(s.filename)}</td><td>${s.engine === 'claude' ? '🤖 AI抽出' : s.engine === 'rules' ? '📐 ルール抽出' : '⚠️ 未処理'}</td><td class="tiny">${esc(s.note || `${s.chars}文字`)}</td></tr>`).join('')}</tbody></table></div>`;
        onResult(r);
      } catch (e) {
        status.innerHTML = `<div class="card" style="margin-top:10px;color:var(--critical)">⚠️ ${esc(e.message)}</div>`;
      }
    };
    input.addEventListener('change', () => send([...input.files]));
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('over'));
    zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('over'); send([...e.dataTransfer.files]); });
  };
  return { html, bind };
}

function thumb() {
  return '<div class="thumb"><i class="h"></i><i style="width:90%"></i><i style="width:75%"></i><i style="width:85%"></i><i style="width:60%"></i><i style="width:80%"></i></div>';
}

function templateGallery(root, kind, onPick) {
  root.innerHTML = `<div class="row" style="margin-bottom:12px">
      <select class="input" style="width:auto" data-f="role"><option value="">すべての職種</option>${state.meta.roles.map((r) => `<option value="${r.id}">${r.icon} ${esc(r.name)}</option>`).join('')}</select>
      <select class="input" style="width:auto" data-f="level"><option value="">すべてのレベル</option>${Object.entries(LEVEL).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
      <span class="tiny" data-count></span>
    </div><div class="grid g4" data-list></div>`;
  const load = async () => {
    const role = root.querySelector('[data-f=role]').value;
    const level = root.querySelector('[data-f=level]').value;
    const r = await api(`/api/templates?kind=${kind}&role=${role}&level=${level}`);
    root.querySelector('[data-count]').textContent = `${r.total}件のテンプレート`;
    root.querySelector('[data-list]').innerHTML = r.items.slice(0, 60).map((t) => `<div class="tpl" data-id="${t.id}" tabindex="0">${thumb()}<b style="font-size:.88rem">${esc(t.title)}</b><span class="tiny">${esc(t.description)}</span></div>`).join('');
    root.querySelectorAll('.tpl').forEach((el) => {
      const pick = () => onPick(r.items.find((t) => t.id === el.dataset.id));
      el.addEventListener('click', pick);
      el.addEventListener('keydown', (e) => e.key === 'Enter' && pick());
    });
  };
  root.querySelectorAll('[data-f]').forEach((s) => s.addEventListener('change', load));
  load();
}

function skillsEditor(el, list, { years = true, onChange } = {}) {
  const draw = () => {
    el.innerHTML = `${list.map((s, i) => `<div class="skill-row">
        <select class="input" data-i="${i}" data-k="id">${state.meta.skills.map((m) => `<option value="${m.id}" ${m.id === s.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select>
        <span class="stars" role="radiogroup" aria-label="レベル">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="${n <= (s.level || 0) ? 'on' : ''}" data-i="${i}" data-star="${n}" aria-label="レベル${n}">★</button>`).join('')}</span>
        ${years ? `<input class="input yrs num" type="number" min="0" step="0.5" placeholder="年" value="${s.years ?? ''}" data-i="${i}" data-k="years">` : '<span></span>'}
        <button type="button" class="btn ghost sm" data-del="${i}" aria-label="削除">✕</button>
      </div>`).join('')}
      <button type="button" class="btn sm" data-add>＋ スキルを追加</button>`;
    el.querySelectorAll('select[data-k], input[data-k]').forEach((inp) => inp.addEventListener('change', () => {
      const s = list[Number(inp.dataset.i)];
      s[inp.dataset.k] = inp.dataset.k === 'years' ? (inp.value === '' ? null : Number(inp.value)) : inp.value;
      onChange?.();
    }));
    el.querySelectorAll('[data-star]').forEach((b) => b.addEventListener('click', () => { list[Number(b.dataset.i)].level = Number(b.dataset.star); draw(); onChange?.(); }));
    el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { list.splice(Number(b.dataset.del), 1); draw(); onChange?.(); }));
    el.querySelector('[data-add]').addEventListener('click', () => { list.push({ id: state.meta.skills[0].id, level: 3, years: null }); draw(); onChange?.(); });
  };
  draw();
}

function bindFields(root, obj, onChange) {
  root.querySelectorAll('[data-bind]').forEach((inp) => {
    const path = inp.dataset.bind.split('.');
    const get = () => path.reduce((o, k) => o?.[k], obj);
    const v = get();
    if (inp.type === 'checkbox') inp.checked = Boolean(v);
    else if (inp.multiple) [...inp.options].forEach((o) => { o.selected = (v || []).includes(o.value); });
    else inp.value = Array.isArray(v) ? v.join('\n') : v ?? '';
    inp.addEventListener('input', () => {
      let val = inp.multiple ? [...inp.selectedOptions].map((o) => o.value) : inp.value;
      if (inp.dataset.type === 'number') val = val === '' ? null : Number(val);
      if (inp.dataset.type === 'lines') val = val.split('\n').map((s) => s.trim()).filter(Boolean);
      let o = obj;
      for (const k of path.slice(0, -1)) o = o[k] = o[k] || {};
      o[path.at(-1)] = val;
      onChange?.();
    });
  });
}

// ---------- 応募者: 職務経歴書 ----------

function resumePaper(c) {
  const today = new Date();
  return `<div class="paper">
    <h2>職務経歴書</h2>
    <div class="right">${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 現在<br>氏名　${esc(c.name || '（未入力）')}</div>
    <h4>■ 職務要約</h4><p style="white-space:pre-wrap">${esc(c.summary || '（未入力）')}</p>
    <h4>■ 活かせる経験・知識・スキル</h4>
    <table><tbody>${(c.skills || []).map((s) => `<tr><td style="width:40%">${esc(skillName(s.id))}</td><td>${'★'.repeat(s.level || 0)}${'☆'.repeat(5 - (s.level || 0))}</td><td style="width:20%">${s.years ? `${s.years}年` : ''}</td></tr>`).join('') || '<tr><td>（未入力）</td></tr>'}</tbody></table>
    <h4>■ 職務経歴</h4>
    ${(c.experiences || []).map((e) => `<table style="margin-bottom:8px"><tbody><tr><th style="width:34%">${esc(e.period)}</th><th>${esc(e.company)}　${esc(e.role || '')}</th></tr><tr><td colspan="2">${esc(e.description)}${e.skills?.length ? `<br><small>使用技術: ${e.skills.map(skillName).map(esc).join(', ')}</small>` : ''}</td></tr></tbody></table>`).join('') || '<p>（未入力）</p>'}
    <h4>■ 資格</h4><p>${(c.certifications || []).map(esc).join('<br>') || '（なし）'}</p>
    <h4>■ 語学</h4><p>日本語: ${esc(c.languages?.japanese || '-')}　/　英語: ${esc(c.languages?.english || '-')}</p>
    <h4>■ 希望条件</h4><p>職種: ${(c.desiredRoles || []).map(roleName).map(esc).join('、') || '-'}　/　希望年収: ${c.desiredSalary ? `${c.desiredSalary}万円` : '-'}　/　働き方: ${REMOTE[c.remote] || '-'}　/　勤務地: ${esc(c.location || '-')}</p>
    <div class="right">以上</div>
  </div>`;
}

export async function profileEditor(el) {
  const me = await api('/api/candidates/me');
  const draft = structuredClone(me);
  draft.skills ||= [];
  draft.experiences ||= [];
  draft.languages ||= {};
  draft.desiredRoles ||= [];
  let step = draft.skills.length ? 2 : 0;

  const applyData = (data, { replace } = {}) => {
    for (const [k, v] of Object.entries(data)) {
      if (v == null || v === '' || (Array.isArray(v) && !v.length)) continue;
      if (k === 'skills') {
        const ids = new Set(draft.skills.map((s) => s.id));
        draft.skills = replace ? v : [...draft.skills, ...v.filter((s) => !ids.has(s.id))];
      } else if (k === 'languages') draft.languages = { ...draft.languages, ...Object.fromEntries(Object.entries(v).filter(([, x]) => x)) };
      else if (['name', 'email', 'phone'].includes(k) && draft[k] && replace) continue;
      else draft[k] = structuredClone(v);
    }
  };

  const draw = () => {
    el.innerHTML = `<div class="row between"><div><h1>📝 プロフィール作成</h1><p class="muted">入力はほぼ不要です。書類をアップするか、テンプレートを選んで少し直すだけで提出できます。</p></div>
        <span class="badge">${draft.status === 'published' ? '公開中' : '下書き'}</span></div>
      <div class="tabs">${['① ファイルから自動入力', '② テンプレートを選ぶ', '③ 確認・修正して提出'].map((n, i) => `<button class="${i === step ? 'on' : ''}" data-step="${i}">${n}</button>`).join('')}</div>
      <div data-body></div>`;
    el.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => { step = Number(b.dataset.step); draw(); }));
    const body = el.querySelector('[data-body]');
    if (step === 0) {
      const dz = dropZone('resume', (r) => {
        applyData(r.data);
        const sug = body.querySelector('[data-sug]');
        sug.innerHTML = `<div class="card" style="margin-top:12px"><b>抽出結果</b><p>${r.data.skills?.length || 0}個のスキル、${r.data.experiences?.length || 0}件の職歴を読み取りました。足りない項目はテンプレートで補完できます。</p>
          <div class="row">${(r.data.skills || []).map((s) => `<span class="chip ok">${esc(skillName(s.id))}</span>`).join('')}</div>
          <h3 style="margin-top:12px">あなたに近いテンプレート</h3><div class="grid g4">${r.suggestions.map((t) => `<div class="tpl" data-tid="${t.id}">${thumb()}<b style="font-size:.85rem">${esc(t.title)}</b></div>`).join('')}</div>
          <div class="row" style="margin-top:12px"><button class="btn primary" data-go>抽出内容を確認する →</button></div></div>`;
        sug.querySelector('[data-go]').addEventListener('click', () => { step = 2; draw(); });
        sug.querySelectorAll('[data-tid]').forEach((t) => t.addEventListener('click', async () => {
          const tpl = await api(`/api/templates/${t.dataset.tid}`);
          applyData({ ...tpl.profile, skills: tpl.profile.skills.filter((s) => !draft.skills.some((d) => d.id === s.id)), summary: draft.summary || tpl.profile.summary, experiences: draft.experiences.length ? draft.experiences : tpl.profile.experiences });
          toast('テンプレートで不足項目を補完しました');
          step = 2; draw();
        }));
      });
      body.innerHTML = `<div class="grid g2"><div>${dz.html}<div data-sug></div></div><div class="card"><h3>💡 こんなファイルから読み取れます</h3><ul class="muted"><li>他サイトでダウンロードした職務経歴書（PDF / Word）</li><li>スキルシート（Excel / CSV）</li><li>LinkedIn等のエクスポート（JSON / HTML）</li><li>ポートフォリオのREADME（Markdown）</li>${state.meta.ai ? '<li>紙の履歴書を撮影した画像（AI-OCR）</li>' : ''}</ul><p class="tiny">${state.meta.ai ? '🤖 Claude による高精度抽出が有効です' : '📐 ルールベース抽出で動作中（ANTHROPIC_API_KEY を設定するとAI抽出・画像対応になります）'}</p></div></div>`;
      dz.bind(body);
    } else if (step === 1) {
      templateGallery(body, 'resume', (t) => {
        modal(`<h2>${esc(t.title)}</h2><p class="muted">${esc(t.description)}</p>${resumePaper({ ...t.profile, name: draft.name })}
          <div class="row" style="margin-top:12px;justify-content:flex-end"><button class="btn" data-mode="merge">不足項目だけ補完</button><button class="btn primary" data-mode="replace">このテンプレートを使う</button></div>`, {
          onMount: (m, close) => m.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
            if (b.dataset.mode === 'replace') applyData(structuredClone(t.profile), { replace: true });
            else applyData({ ...t.profile, summary: draft.summary || t.profile.summary, experiences: draft.experiences.length ? draft.experiences : t.profile.experiences });
            close(); step = 2; draw(); toast('テンプレートを適用しました。内容を自分の経験に合わせて調整してください');
          })),
        });
      });
    } else {
      body.innerHTML = `<div class="grid g2">
        <div class="card"><h3>基本情報</h3>
          <div class="grid g2"><div class="field"><label class="f">氏名</label><input class="input" data-bind="name"></div><div class="field"><label class="f">メール</label><input class="input" data-bind="email"></div>
          <div class="field"><label class="f">電話</label><input class="input" data-bind="phone"></div><div class="field"><label class="f">居住地</label><select class="input" data-bind="location"><option value=""></option>${state.meta.prefectures.map((p) => `<option>${p}</option>`).join('')}</select></div>
          <div class="field"><label class="f">IT経験年数</label><input class="input num" type="number" step="0.5" min="0" data-bind="years" data-type="number"></div><div class="field"><label class="f">希望年収（万円）</label><input class="input num" type="number" step="10" data-bind="desiredSalary" data-type="number"></div>
          <div class="field"><label class="f">働き方</label><select class="input" data-bind="remote">${Object.entries(REMOTE).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
          <div class="field"><label class="f">希望職種（複数可）</label><select class="input" multiple size="3" data-bind="desiredRoles">${state.meta.roles.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select></div>
          <div class="field"><label class="f">日本語</label><input class="input" data-bind="languages.japanese" placeholder="ネイティブ / N1 など"></div><div class="field"><label class="f">英語</label><input class="input" data-bind="languages.english" placeholder="TOEIC 800 / ビジネス など"></div></div>
          <div class="field"><label class="f">職務要約</label><textarea class="input" data-bind="summary"></textarea></div>
          <h3>スキル</h3><div data-skills></div>
          <h3 style="margin-top:14px">職務経歴</h3><div data-exps></div>
          <div class="field" style="margin-top:10px"><label class="f">資格（1行に1つ）</label><textarea class="input" data-bind="certifications" data-type="lines" style="min-height:60px"></textarea></div>
          <div class="row" style="justify-content:flex-end"><button class="btn" data-save="draft">下書き保存</button><button class="btn primary" data-save="published">提出して公開</button></div>
        </div>
        <div><div style="position:sticky;top:12px" data-preview></div></div></div>`;
      const preview = () => { body.querySelector('[data-preview]').innerHTML = resumePaper(draft); };
      bindFields(body, draft, preview);
      skillsEditor(body.querySelector('[data-skills]'), draft.skills, { onChange: preview });
      const exps = body.querySelector('[data-exps]');
      const drawExps = () => {
        exps.innerHTML = `${draft.experiences.map((e, i) => `<div class="card" style="padding:10px;margin-bottom:8px"><div class="grid g2">
            <input class="input" placeholder="会社名" value="${esc(e.company)}" data-e="${i}" data-k="company"><input class="input" placeholder="期間" value="${esc(e.period)}" data-e="${i}" data-k="period"></div>
            <input class="input" style="margin-top:6px" placeholder="役割" value="${esc(e.role || '')}" data-e="${i}" data-k="role">
            <textarea class="input" style="margin-top:6px;min-height:60px" data-e="${i}" data-k="description">${esc(e.description)}</textarea>
            <button class="btn ghost sm" data-edel="${i}">削除</button></div>`).join('')}<button class="btn sm" data-eadd>＋ 職歴を追加</button>`;
        exps.querySelectorAll('[data-e]').forEach((inp) => inp.addEventListener('input', () => { draft.experiences[Number(inp.dataset.e)][inp.dataset.k] = inp.value; preview(); }));
        exps.querySelectorAll('[data-edel]').forEach((b) => b.addEventListener('click', () => { draft.experiences.splice(Number(b.dataset.edel), 1); drawExps(); preview(); }));
        exps.querySelector('[data-eadd]').addEventListener('click', () => { draft.experiences.push({ company: '', period: '', role: '', description: '', skills: [] }); drawExps(); });
      };
      drawExps();
      preview();
      body.querySelectorAll('[data-save]').forEach((b) => b.addEventListener('click', async () => {
        draft.status = b.dataset.save;
        const saved = await api('/api/candidates/me', { method: 'PUT', body: draft });
        Object.assign(draft, saved);
        state.me.candidate = saved;
        toast(draft.status === 'published' ? '🎉 プロフィールを公開しました。マッチする求人を確認しましょう' : '下書きを保存しました');
        if (draft.status === 'published') location.hash = '#/jobs';
      }));
    }
  };
  draw();
}

// ---------- 企業: 求人票 ----------

function jobPaper(j, company) {
  return `<div class="paper" style="font-family:var(--font)">
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px"><div style="width:8px;height:40px;background:${company?.color || '#2a78d6'};border-radius:3px"></div><div><div style="font-size:12px;color:#555">${esc(company?.name || '')}</div><div style="font-size:18px;font-weight:700">${esc(j.title || '（求人タイトル）')}</div></div></div>
    <table><tbody>
      <tr><th style="width:25%">職種</th><td>${esc(roleName(j.roleId))}（${LEVEL[j.level] || '-'}）</td></tr>
      <tr><th>年収</th><td>${salary(j.salaryMin, j.salaryMax)}</td></tr>
      <tr><th>勤務地</th><td>${esc(j.location || '-')}／${REMOTE[j.remote] || '-'}</td></tr>
      <tr><th>必須スキル</th><td>${(j.required || []).map((r) => `${esc(skillName(r.id))}(Lv${r.level}以上)`).join('、') || '-'}${j.minYears ? `／実務${j.minYears}年以上` : ''}</td></tr>
      <tr><th>歓迎スキル</th><td>${(j.preferred || []).map(skillName).map(esc).join('、') || '-'}</td></tr>
      <tr><th>語学</th><td>日本語: ${esc(j.languages?.japanese || '不問')}／英語: ${esc(j.languages?.english || '不問')}</td></tr>
    </tbody></table>
    <h4>仕事内容</h4><p>${esc(j.description || '')}</p><ul>${(j.duties || []).map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
    <h4>福利厚生・働き方</h4><p>${(j.benefits || []).map(esc).join('／') || '-'}</p>
  </div>`;
}

export async function jobEditor(el, jobId, templateId) {
  const company = state.me.company;
  let draft = { title: '', roleId: 'backend', level: 'middle', location: company?.location, remote: 'hybrid', minYears: 3, salaryMin: null, salaryMax: null, required: [], preferred: [], duties: [], benefits: [], description: '', languages: {}, headcount: 1 };
  if (jobId) draft = { ...draft, ...(await api(`/api/jobs/${jobId}`)).job };
  let step = jobId ? 2 : 0;
  const applyJob = (j) => {
    for (const [k, v] of Object.entries(j)) if (v != null && v !== '' && !(Array.isArray(v) && !v.length)) draft[k] = structuredClone(v);
    if (!draft.location) draft.location = company?.location;
  };
  if (templateId && !jobId) {
    const t = await api(`/api/templates/${templateId}`);
    applyJob({ ...t.job, templateId: t.id });
    step = 2;
  }
  const draw = () => {
    el.innerHTML = `<h1>${jobId ? '✏️ 求人を編集' : '📢 求人を作成'}</h1><p class="muted">既存の求人票をアップロードするか、${'職種×レベル×企業タイプ'}のテンプレートから選ぶだけで作成できます。</p>
      <div class="tabs">${['① 求人票から自動入力', '② テンプレートを選ぶ', '③ 確認・修正して掲載'].map((n, i) => `<button class="${i === step ? 'on' : ''}" data-step="${i}">${n}</button>`).join('')}</div><div data-body></div>`;
    el.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => { step = Number(b.dataset.step); draw(); }));
    const body = el.querySelector('[data-body]');
    if (step === 0) {
      const dz = dropZone('job', (r) => {
        applyJob(r.data);
        body.querySelector('[data-sug]').innerHTML = `<div class="card" style="margin-top:12px"><p>必須 ${r.data.required?.length || 0}件・歓迎 ${r.data.preferred?.length || 0}件のスキルを読み取りました。</p><button class="btn primary" data-go>内容を確認する →</button></div>`;
        body.querySelector('[data-go]').addEventListener('click', () => { step = 2; draw(); });
      });
      body.innerHTML = `<div class="grid g2"><div>${dz.html}<div data-sug></div></div><div class="card"><h3>💡 読み取り対象</h3><ul class="muted"><li>他媒体の求人票（PDF / Word）</li><li>社内の募集要項（Excel / Markdown）</li><li>採用ページのHTML</li></ul></div></div>`;
      dz.bind(body);
    } else if (step === 1) {
      templateGallery(body, 'job', (t) => {
        modal(`<h2>${esc(t.title)}</h2>${jobPaper(t.job, company)}<div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" data-use>このテンプレートを使う</button></div>`, {
          onMount: (m, close) => m.querySelector('[data-use]').addEventListener('click', () => { applyJob({ ...t.job, templateId: t.id }); close(); step = 2; draw(); toast('テンプレートを適用しました'); }),
        });
      });
    } else {
      body.innerHTML = `<div class="grid g2"><div class="card">
        <div class="field"><label class="f">求人タイトル</label><input class="input" data-bind="title"></div>
        <div class="grid g2">
          <div class="field"><label class="f">職種</label><select class="input" data-bind="roleId">${state.meta.roles.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select></div>
          <div class="field"><label class="f">レベル</label><select class="input" data-bind="level">${Object.entries(LEVEL).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
          <div class="field"><label class="f">年収下限（万円）</label><input class="input num" type="number" step="10" data-bind="salaryMin" data-type="number"></div>
          <div class="field"><label class="f">年収上限（万円）</label><input class="input num" type="number" step="10" data-bind="salaryMax" data-type="number"></div>
          <div class="field"><label class="f">勤務地</label><select class="input" data-bind="location">${state.meta.prefectures.map((p) => `<option>${p}</option>`).join('')}</select></div>
          <div class="field"><label class="f">働き方</label><select class="input" data-bind="remote">${['full', 'hybrid', 'onsite'].map((k) => `<option value="${k}">${REMOTE[k]}</option>`).join('')}</select></div>
          <div class="field"><label class="f">必要経験年数</label><input class="input num" type="number" min="0" data-bind="minYears" data-type="number"></div>
          <div class="field"><label class="f">募集人数</label><input class="input num" type="number" min="1" data-bind="headcount" data-type="number"></div>
          <div class="field"><label class="f">日本語</label><input class="input" data-bind="languages.japanese"></div>
          <div class="field"><label class="f">英語</label><input class="input" data-bind="languages.english"></div>
        </div>
        <h3>必須スキル</h3><div data-req></div>
        <div class="field" style="margin-top:10px"><label class="f">歓迎スキル（Ctrl/⌘で複数選択）</label><select class="input" multiple size="5" data-bind="preferred">${state.meta.skills.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
        <div class="field"><label class="f">仕事内容</label><textarea class="input" data-bind="description"></textarea></div>
        <div class="field"><label class="f">業務詳細（1行に1つ）</label><textarea class="input" data-bind="duties" data-type="lines"></textarea></div>
        <div class="field"><label class="f">福利厚生（1行に1つ）</label><textarea class="input" data-bind="benefits" data-type="lines"></textarea></div>
        <div class="row" style="justify-content:flex-end"><button class="btn primary" data-save>${jobId ? '更新する' : '掲載する'}</button></div>
      </div><div><div style="position:sticky;top:12px" data-preview></div><div data-hint></div></div></div>`;
      const preview = () => {
        body.querySelector('[data-preview]').innerHTML = jobPaper(draft, company);
        const hint = [];
        if ((draft.required || []).length > 5) hint.push('必須スキルが多すぎます（5つ以下推奨）。応募数が減る傾向があります。');
        if (!draft.salaryMax) hint.push('年収レンジの記載がある求人は応募率が高くなります。');
        if (draft.remote === 'onsite') hint.push('ITエンジニアの多くがリモート可を希望しています。');
        body.querySelector('[data-hint]').innerHTML = hint.length ? `<div class="card" style="margin-top:12px"><b>💡 改善ヒント</b><ul>${hint.map((h) => `<li>${esc(h)}</li>`).join('')}</ul></div>` : '';
      };
      bindFields(body, draft, preview);
      skillsEditor(body.querySelector('[data-req]'), draft.required, { years: false, onChange: preview });
      preview();
      body.querySelector('[data-save]').addEventListener('click', async () => {
        if (!draft.title) return toast('求人タイトルを入力してください');
        const saved = await api(jobId ? `/api/jobs/${jobId}` : '/api/jobs', { method: jobId ? 'PUT' : 'POST', body: draft });
        toast(jobId ? '求人を更新しました' : '🎉 求人を掲載しました。マッチする候補者を確認しましょう');
        location.hash = `#/candidates?job=${saved.id}`;
      });
    }
  };
  draw();
}

export { resumePaper, jobPaper };
