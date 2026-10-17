// 共通: API クライアント・状態・HTML エスケープ・UI ヘルパー
export const state = { user: null, me: null, meta: null };

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (state.user) headers['x-user-id'] = state.user.id;
  let body = opts.body;
  if (body && !(body instanceof FormData)) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const res = await fetch(path, { method: opts.method || 'GET', headers, body });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export function toast(msg, ms = 2600) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), ms);
}

export function skillName(id) {
  return state.meta?.skills.find((s) => s.id === id)?.name || id;
}
export function roleName(id) {
  return state.meta?.roles.find((r) => r.id === id)?.name || id || '-';
}
export function role(id) {
  return state.meta?.roles.find((r) => r.id === id);
}
export const REMOTE = { full: 'フルリモート', hybrid: 'ハイブリッド', onsite: '出社', any: 'こだわらない' };
export const LEVEL = { junior: 'ジュニア', middle: 'ミドル', senior: 'シニア' };
export const APP_STATUS = { applied: '応募', screening: '書類選考', interview: '面接', offer: '内定', hired: '入社', rejected: '見送り' };

export function salary(min, max) {
  if (!min && !max) return '応相談';
  return `${min ?? '?'}〜${max ?? '?'}万円`;
}

/** マッチ度ラベル（色だけに頼らずテキストと記号を併記） */
export function matchBadge(total) {
  const [icon, label, color] = total >= 85 ? ['◎', '非常に高い', 'var(--good-ink)'] : total >= 70 ? ['○', '高い', 'var(--brand)'] : total >= 55 ? ['△', '検討の余地', 'var(--ink-2)'] : ['−', '低い', 'var(--muted)'];
  return `<span class="status" style="color:${color}">${icon} ${label}</span>`;
}

export function skillChips(list = [], cls = '') {
  return list.map((s) => `<span class="chip ${cls}">${esc(typeof s === 'string' ? skillName(s) : s.name || skillName(s.id))}${s.level ? ` <small>Lv${s.level}</small>` : ''}</span>`).join(' ');
}

export function modal(html, { onMount, wide } = {}) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true" style="${wide ? 'width:min(1100px,100%)' : ''}"><div class="row between" style="margin-bottom:8px"><span></span><button class="btn ghost sm" data-close aria-label="閉じる">✕</button></div>${html}</div>`;
  const close = () => bg.remove();
  bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', function onKey(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } });
  document.body.append(bg);
  onMount?.(bg.querySelector('.modal'), close);
  return close;
}

export function tabs(el, names, render) {
  let cur = 0;
  const draw = () => {
    el.innerHTML = `<div class="tabs" role="tablist">${names.map((n, i) => `<button role="tab" aria-selected="${i === cur}" class="${i === cur ? 'on' : ''}" data-i="${i}">${esc(n)}</button>`).join('')}</div><div class="tab-body"></div>`;
    el.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => { cur = Number(b.dataset.i); draw(); }));
    render(cur, el.querySelector('.tab-body'));
  };
  draw();
}

export function loading(el, msg = '読み込み中…') {
  el.innerHTML = `<div class="empty">${esc(msg)}</div>`;
}

export function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
