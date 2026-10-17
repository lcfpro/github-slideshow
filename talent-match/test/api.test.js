import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createApp } from '../server/index.js';
import { Store } from '../server/store.js';
import { seed } from '../server/seed.js';

process.env.TALENT_MATCH_DISABLE_AI = '1';
let server;
let base;

before(async () => {
  const store = seed(new Store(null));
  server = createApp(store).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

async function call(path, { user, method = 'GET', body } = {}) {
  const headers = {};
  if (user) headers['x-user-id'] = user;
  let payload = body;
  if (body && !(body instanceof FormData)) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(base + path, { method, headers, body: payload });
  return { status: res.status, data: res.status === 204 ? null : await res.json() };
}

test('認可: 企業APIは応募者から使えない、未ログインは401', async () => {
  assert.equal((await call('/api/hr/dashboard', { user: 'u-candidate' })).status, 403);
  assert.equal((await call('/api/candidates/me')).status, 401);
});

test('応募者: 求人はマッチ度順で返る', async () => {
  const { data } = await call('/api/jobs', { user: 'u-candidate' });
  assert.ok(data.length > 10);
  for (let i = 1; i < data.length; i++) assert.ok(data[i - 1].match.total >= data[i].match.total);
});

test('ファイルアップロード → 抽出 → プロフィール保存', async () => {
  const fd = new FormData();
  fd.append('files', new Blob([fs.readFileSync(new URL('./fixtures/resume.md', import.meta.url))]), 'resume.md');
  const { status, data } = await call('/api/extract?kind=resume', { user: 'u-candidate', method: 'POST', body: fd });
  assert.equal(status, 200);
  assert.ok(data.data.skills.length >= 5);
  assert.ok(data.suggestions.length > 0);
  const saved = await call('/api/candidates/me', { user: 'u-candidate', method: 'PUT', body: { ...data.data, status: 'published' } });
  assert.equal(saved.data.name, '鈴木 花子');
});

test('企業: テンプレートから求人作成 → 候補者ランキング → スカウトで相互マッチ', async () => {
  const tpl = await call('/api/templates/job-sre-middle-web');
  const job = await call('/api/jobs', { user: 'u-company', method: 'POST', body: tpl.data.job });
  assert.equal(job.status, 201);
  const ranked = await call(`/api/candidates?jobId=${job.data.id}`, { user: 'u-company' });
  assert.ok(ranked.data.length > 0);
  assert.equal(ranked.data[0].candidate.email, undefined, '相互マッチ前は連絡先を伏せる');
  const top = ranked.data[0].candidate.id;
  await call('/api/likes', { user: 'u-company', method: 'POST', body: { jobId: job.data.id, candidateId: top } });
  // 他人の求人ではスカウトできない
  const other = (await call('/api/jobs')).data.find((j) => j.job.companyId !== 'c-nebula');
  assert.equal((await call('/api/likes', { user: 'u-company', method: 'POST', body: { jobId: other.job.id, candidateId: top } })).status, 404);
});

test('応募 → 選考ステータス更新 → 面談アドバイス', async () => {
  const jobs = (await call('/api/jobs', { user: 'u-candidate' })).data;
  const target = jobs.find((j) => j.job.companyId === 'c-nebula' && !j.mutual);
  const app = await call('/api/applications', { user: 'u-candidate', method: 'POST', body: { jobId: target.job.id, message: 'よろしくお願いします' } });
  assert.equal(app.status, 201);
  assert.equal((await call('/api/applications', { user: 'u-candidate', method: 'POST', body: { jobId: target.job.id } })).status, 409);
  const upd = await call(`/api/applications/${app.data.id}`, { user: 'u-company', method: 'PATCH', body: { status: 'interview' } });
  assert.equal(upd.data.status, 'interview');
  const adv = await call(`/api/advice/interview?jobId=${target.job.id}&candidateId=cand-demo`, { user: 'u-company' });
  assert.ok(adv.data.questions.length > 0);
  const prep = await call(`/api/advice/prep?jobId=${target.job.id}`, { user: 'u-candidate' });
  assert.ok(prep.data.likely.length > 0);
});

test('市場・HR・説明会・模擬面接', async () => {
  assert.ok((await call('/api/market/overview')).data.hotSkills.length === 10);
  assert.equal((await call('/api/market/trends?skills=llm,java')).data.series.length, 2);
  const hr = (await call('/api/hr/dashboard', { user: 'u-company' })).data;
  const emp = hr.people.find((p) => !p.projectId);
  const assigned = await call('/api/hr/assign', { user: 'u-company', method: 'POST', body: { employeeId: emp.id, projectId: 'p-3' } });
  assert.equal(assigned.data.projectId, 'p-3');
  const fair = (await call('/api/fair', { user: 'u-candidate' })).data;
  assert.ok(fair.every((c) => c.booth && c.best));
  const qs = (await call('/api/interview/questions', { user: 'u-candidate' })).data;
  const ev = await call('/api/interview/evaluate', { user: 'u-candidate', method: 'POST', body: { question: qs.questions[0].q, answer: 'フロントエンドを5年担当し、表示速度を40%改善しました。' } });
  assert.ok(ev.data.score > 0);
});
