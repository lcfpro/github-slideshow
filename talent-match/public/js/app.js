// SPA ルーター・レイアウト・ログイン
import { api, esc, state, toast } from './core.js';
import { avatar, companyLogo } from './avatar.js';
import * as C from './views-candidate.js';
import * as K from './views-company.js';
import { marketView } from './views-market.js';

const NAV = {
  candidate: [
    ['', 'ホーム', '🏠'], ['profile', 'プロフィール作成', '📝'], ['jobs', '求人を探す', '🔎'], ['applications', '応募・マッチ', '📮'],
    ['sec', 'リアル体験'], ['fair', 'バーチャル説明会', '🏢'], ['interview', '模擬面接', '🎤'],
    ['sec', 'アドバイス'], ['prep', '面談準備', '🧑‍🏫'], ['skills', 'スキルアドバイス', '📚'], ['market', '市場動態', '📈'],
  ],
  company: [
    ['', 'ダッシュボード', '🏠'], ['jobs-manage', '求人管理', '📢'], ['candidates', '候補者マッチング', '🎯'], ['pipeline', '選考管理', '📋'],
    ['sec', 'アドバイス'], ['advice', '面談アドバイス', '🧑‍💼'], ['market', '市場動態', '📈'],
    ['sec', '組織'], ['hr', '人的リソース管理', '👥'], ['fair', '説明会会場', '🏢'],
  ],
};

const ROUTES = {
  candidate: { '': C.candHome, profile: C.profileEditor, jobs: C.candJobs, applications: C.candApplications, fair: C.candFair, interview: C.candInterview, prep: C.candPrep, skills: C.candSkills, market: marketView },
  company: { '': K.compHome, 'jobs-manage': K.compJobs, 'job-new': K.compJobEdit, 'job-edit': K.compJobEdit, candidates: K.compCandidates, pipeline: K.compPipeline, advice: K.compAdvice, hr: K.compHR, market: marketView, fair: C.candFair },
};

function setTheme(t) {
  if (t) document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  try { t ? localStorage.setItem('theme', t) : localStorage.removeItem('theme'); } catch { /* storage unavailable */ }
}

function landing(root) {
  root.innerHTML = `<div class="landing"><div class="box">
    <div class="logo" style="justify-content:center;font-size:1.5rem"><span class="logo-mark">⚡</span>IT Talent Match</div>
    <h1 style="text-align:center">IT人材と企業が、出会う場所。</h1>
    <p class="muted" style="text-align:center">書類をアップするだけでプロフィール完成。AIマッチング・面談アドバイス・市場分析まで。</p>
    <div class="grid g2" style="margin-top:22px">
      <div class="role-card" data-login="u-candidate"><div class="big">🧑‍💻</div><h2>応募者として始める</h2><p class="muted">デモ: 山田 太郎（フロントエンド5年）</p><ul class="tiny"><li>履歴書をアップ → 自動でプロフィール化</li><li>マッチ度順の求人・バーチャル説明会・模擬面接</li><li>市場価値と学ぶべきスキルを可視化</li></ul></div>
      <div class="role-card" data-login="u-company"><div class="big">🏢</div><h2>企業として始める</h2><p class="muted">デモ: ネビュラテック株式会社</p><ul class="tiny"><li>求人票をアップ / テンプレートで求人作成</li><li>候補者マッチング・スカウト・面談アドバイス</li><li>社内スキルマトリクス・配置・離職リスク管理</li></ul></div>
    </div>
    <details class="card" style="margin-top:16px"><summary><b>新規アカウントを作成</b></summary>
      <div class="row" style="margin-top:10px"><select class="input" style="width:auto" id="rt"><option value="candidate">応募者</option><option value="company">企業</option></select>
      <input class="input" style="max-width:220px" id="rn" placeholder="お名前"><input class="input" style="max-width:220px" id="rc" placeholder="会社名（企業のみ）"><button class="btn primary" id="reg">登録</button></div></details>
    <div class="features"><div>📂 PDF・Word・Excel・CSV・画像から自動抽出</div><div>🧩 ${state.meta.roles.length}職種 × 3レベルのテンプレート多数</div><div>🎯 説明可能な双方向マッチング</div><div>🏢 歩ける説明会会場</div><div>🎤 音声で答える模擬面接</div><div>📈 スキル需給・年収相場</div></div>
  </div></div>`;
  root.querySelectorAll('[data-login]').forEach((b) => b.addEventListener('click', () => login(b.dataset.login)));
  root.querySelector('#reg').addEventListener('click', async () => {
    const name = root.querySelector('#rn').value.trim();
    if (!name) return toast('お名前を入力してください');
    const u = await api('/api/session/register', { method: 'POST', body: { type: root.querySelector('#rt').value, name, companyName: root.querySelector('#rc').value.trim() } });
    login(u.id, u.type === 'candidate' ? '#/profile' : '#/job-new');
  });
}

async function login(id, hash = '#/') {
  state.user = { id };
  try {
    state.me = await api('/api/me');
    state.user = state.me.user;
    try { localStorage.setItem('uid', id); } catch { /* storage unavailable */ }
    location.hash = hash;
    render();
  } catch {
    state.user = null;
    try { localStorage.removeItem('uid'); } catch { /* storage unavailable */ }
    render();
  }
}

function logout() {
  state.user = null;
  state.me = null;
  try { localStorage.removeItem('uid'); } catch { /* storage unavailable */ }
  location.hash = '#/';
  render();
}

function shell(root) {
  const type = state.user.type;
  const who = type === 'candidate' ? state.me.candidate : state.me.company;
  root.innerHTML = `<div class="app">
    <aside class="side" id="side"><div class="logo"><span class="logo-mark">⚡</span>IT Talent Match</div>
      <nav class="nav">${NAV[type].map(([p, label, icon]) => (p === 'sec' ? `<div class="sec">${label}</div>` : `<a href="#/${p}" data-p="${p}"><span>${icon}</span>${label}</a>`)).join('')}</nav>
      <div class="who"><div class="row">${type === 'candidate' ? avatar(who, 34) : companyLogo(who, 34)}<div><b>${esc(who?.name)}</b><div class="tiny">${type === 'candidate' ? '応募者' : '企業'}アカウント</div></div></div>
        <div class="row" style="margin-top:8px"><button class="btn sm" id="logout">切替/ログアウト</button><button class="btn sm ghost" id="theme" aria-label="テーマ切替">🌓</button></div>
        <div class="tiny" style="margin-top:6px">${state.meta.ai ? '🤖 Claude 連携: 有効' : '📐 ルールベースモード'}</div></div>
    </aside>
    <main class="main"><div class="topbar"><button class="btn menu-btn" id="menu" aria-label="メニュー">☰</button><span></span></div><div id="view"></div></main></div>`;
  root.querySelector('#logout').addEventListener('click', logout);
  root.querySelector('#theme').addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(cur === 'dark' ? 'light' : 'dark');
  });
  root.querySelector('#menu').addEventListener('click', () => root.querySelector('#side').classList.toggle('open'));
}

async function route() {
  const view = document.getElementById('view');
  if (!view) return;
  C.stopInterview();
  const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
  const params = new URLSearchParams(qs || '');
  const type = state.user.type;
  const fn = ROUTES[type][path] ?? ROUTES[type][''];
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.p === (path.startsWith('job-') ? 'jobs-manage' : path)));
  document.getElementById('side')?.classList.remove('open');
  view.innerHTML = '<div class="empty">読み込み中…</div>';
  try {
    if (type === 'candidate') state.me = await api('/api/me');
    await fn(view, params);
  } catch (e) {
    view.innerHTML = `<div class="card empty">⚠️ ${esc(e.message)}</div>`;
  }
  window.scrollTo(0, 0);
}

function render() {
  const root = document.getElementById('root');
  if (!state.user) return landing(root);
  shell(root);
  route();
}

window.addEventListener('hashchange', () => state.user && route());

(async function init() {
  try { const t = localStorage.getItem('theme'); if (t) setTheme(t); } catch { /* storage unavailable */ }
  state.meta = await api('/api/meta');
  let uid = null;
  try { uid = localStorage.getItem('uid'); } catch { /* storage unavailable */ }
  if (uid) await login(uid, location.hash || '#/');
  else render();
})();
