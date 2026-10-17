import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ExcelJS from 'exceljs';
import { detectSkills } from '../server/data/skills.js';
import { ROLES } from '../server/data/roles.js';
import { allTemplates, suggestTemplates } from '../server/templates.js';
import { ruleProfile, ruleJob, fileToText, extractFromFiles } from '../server/extract.js';
import { matchScore } from '../server/matching.js';
import { Store } from '../server/store.js';
import { seed } from '../server/seed.js';
import { skillAdvice, interviewAdviceForCompany, prepAdviceForCandidate, evaluateAnswer } from '../server/advice.js';
import { candidateValue, companyInsights, skillDemandSupply } from '../server/market.js';
import { hrDashboard } from '../server/hr.js';

process.env.TALENT_MATCH_DISABLE_AI = '1';
const fixture = (f) => fs.readFileSync(new URL(`./fixtures/${f}`, import.meta.url));

test('detectSkills: 表記ゆれを吸収し、部分一致の誤検出をしない', () => {
  const ids = detectSkills('React.js と TypeScript、golang、k8s、AWS を使用。Javaは未経験。Google Analytics');
  for (const id of ['react', 'typescript', 'go', 'kubernetes', 'aws', 'java']) assert.ok(ids.includes(id), id);
  assert.ok(!ids.includes('javascript'), 'Java を JavaScript と誤認しない');
  assert.ok(!detectSkills('Google の広告運用').includes('go'), 'Google を Go と誤認しない');
});

test('テンプレートは職種×レベル×書式で多数用意されている', () => {
  const t = allTemplates();
  assert.equal(t.resumes.length, ROLES.length * 3 * 3);
  assert.equal(t.jobs.length, ROLES.length * 3 * 4);
  const s = suggestTemplates('resume', ['kubernetes', 'sre', 'observability', 'linux']);
  assert.equal(s[0].roleId, 'sre');
});

test('ルール抽出: 職務経歴書(Markdown)', () => {
  const p = ruleProfile(fixture('resume.md').toString());
  assert.equal(p.name, '鈴木 花子');
  assert.equal(p.email, 'hanako@example.com');
  assert.equal(p.location, '東京都');
  assert.equal(p.years, 7);
  assert.equal(p.desiredSalary, 900);
  assert.equal(p.skills.find((s) => s.id === 'go').years, 4);
  assert.ok(p.certifications.includes('CKA'));
  assert.equal(p.languages.english, 'TOEIC 820');
  assert.equal(p.experiences[0].company, '株式会社サンプルクラウド');
});

test('ルール抽出: 求人票(テキスト)', () => {
  const j = ruleJob(fixture('job.txt').toString());
  assert.equal(j.title, 'データエンジニア');
  assert.deepEqual([j.salaryMin, j.salaryMax], [600, 900]);
  assert.equal(j.minYears, 3);
  assert.equal(j.remote, 'hybrid');
  assert.equal(j.location, '大阪府');
  assert.ok(j.required.some((r) => r.id === 'data_eng'));
  assert.ok(j.preferred.includes('terraform'));
  assert.equal(j.roleId, 'data_engineer');
});

test('ファイル形式: docx / xlsx / csv / json / 未対応形式', async () => {
  assert.match((await fileToText(fixture('resume.docx'), 'a.docx')).text, /Spring Boot/);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('スキルシート');
  ws.addRow(['スキル', '経験年数']);
  ws.addRow(['Python', '5年']);
  const xlsx = Buffer.from(await wb.xlsx.writeBuffer());
  assert.match((await fileToText(xlsx, 'a.xlsx')).text, /Python : 5年/);
  assert.match((await fileToText(Buffer.from('skill,years\nRust,2'), 'a.csv')).text, /Rust : 2/);
  assert.match((await fileToText(Buffer.from('{"skills":["Go","AWS"]}'), 'a.json')).text, /Go/);
  await assert.rejects(fileToText(Buffer.from('x'), 'a.exe'), /未対応/);
});

test('複数ファイルの抽出結果をマージする', async () => {
  const name = (s) => Buffer.from(s, 'utf8').toString('latin1');
  const r = await extractFromFiles([
    { originalname: name('経歴.md'), buffer: fixture('resume.md') },
    { originalname: name('補足.docx'), buffer: fixture('resume.docx') },
  ], 'resume');
  const ids = r.data.skills.map((s) => s.id);
  assert.ok(ids.includes('go') && ids.includes('spring'));
  assert.equal(r.sources.length, 2);
  assert.equal(r.sources[0].filename, '経歴.md');
});

test('マッチング: 要件を満たすほど高く、内訳と根拠を返す', () => {
  const job = { roleId: 'backend', required: [{ id: 'go', level: 3 }, { id: 'aws', level: 3 }], preferred: ['docker'], minYears: 3, salaryMin: 600, salaryMax: 800, remote: 'hybrid', languages: {} };
  const strong = { years: 5, desiredSalary: 700, remote: 'hybrid', desiredRoles: ['backend'], skills: [{ id: 'go', level: 4 }, { id: 'aws', level: 3 }, { id: 'docker', level: 3 }], languages: {} };
  const weak = { years: 1, desiredSalary: 1200, remote: 'full', skills: [{ id: 'php', level: 2 }], languages: {} };
  const a = matchScore(strong, job);
  const b = matchScore(weak, job);
  assert.ok(a.total >= 90, `strong=${a.total}`);
  assert.ok(b.total <= 45, `weak=${b.total}`);
  assert.equal(a.missing.length, 0);
  assert.equal(b.missing.length, 1, 'Go 欠落（PHP は同カテゴリで部分点）');
  assert.ok(b.reasons.some((r) => r.includes('希望年収')));
});

function seeded() {
  return seed(new Store(null));
}

test('アドバイス: 企業向け面談・応募者向け準備・スキル', async () => {
  const store = seeded();
  const cand = store.get('candidates', 'cand-demo');
  const job = store.all('jobs').find((j) => j.roleId === 'sre') || store.all('jobs')[0];
  const ia = await interviewAdviceForCompany(job, cand);
  assert.ok(ia.questions.length >= 4);
  assert.ok(ia.gaps.length > 0, 'SRE 求人ではギャップが出る');
  assert.equal(ia.rubric.reduce((s, r) => s + r.weight, 0), 100);
  const pa = await prepAdviceForCandidate(cand, job, store);
  assert.ok(pa.likely.length >= 5 && pa.stories.length === 2);
  const sa = skillAdvice(cand, store, 'fullstack');
  assert.ok(sa.roles[0].items.length > 0);
  assert.ok(sa.plan.every((p) => p.to <= 12));
});

test('模擬面接の採点: STAR と数値で加点', async () => {
  const good = await evaluateAnswer('困難だった経験', '当時のプロジェクトはチーム8名の決済基盤でした。課題はレスポンス遅延で、私がキャッシュ設計を担当しRedisを導入しました。結果としてレイテンシを60%短縮しました。');
  const bad = await evaluateAnswer('困難だった経験', '頑張りました');
  assert.ok(good.score > bad.score + 30, `${good.score} vs ${bad.score}`);
  assert.deepEqual(good.star, { S: true, T: true, A: true, R: true });
});

test('市場分析と人的リソース管理', () => {
  const store = seeded();
  assert.ok(skillDemandSupply(store).length > 50);
  const v = candidateValue(store, store.get('candidates', 'cand-demo'));
  assert.ok(v.estimate.low <= v.estimate.mid && v.estimate.mid <= v.estimate.high);
  const ci = companyInsights(store, 'c-nebula');
  assert.ok(ci.length > 0 && ci.every((j) => j.pool.total > 0));
  const hr = hrDashboard(store, 'c-nebula');
  assert.equal(hr.summary.headcount, 16);
  assert.equal(hr.matrix.rows.length, 16);
  assert.ok(hr.staffing.length === 4);
});
