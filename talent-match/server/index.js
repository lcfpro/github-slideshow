// IT Talent Match — API サーバー
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import multer from 'multer';
import { Store } from './store.js';
import { seed, COMPANIES } from './seed.js';
import { SKILLS } from './data/skills.js';
import { ROLES, LEVELS, PREFECTURES, ROLE_BY_ID } from './data/roles.js';
import { allTemplates, findTemplate, suggestTemplates } from './templates.js';
import { extractFromFiles, SUPPORTED_EXT } from './extract.js';
import { matchScore, rankJobsFor, rankCandidatesFor, scoreLabel, WEIGHTS } from './matching.js';
import { interviewAdviceForCompany, prepAdviceForCandidate, skillAdvice, evaluateAnswer, interviewQuestions } from './advice.js';
import { overview, skillDemandSupply, roleSalaryBands, trends, companyInsights, candidateValue, skillCategoryHeat } from './market.js';
import { hrDashboard } from './hr.js';
import { aiEnabled } from './ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const CANDIDATE_FIELDS = ['name', 'email', 'phone', 'location', 'years', 'desiredRoles', 'skills', 'otherSkills', 'desiredSalary', 'remote', 'languages', 'summary', 'experiences', 'certifications', 'education', 'avatar', 'status'];
const JOB_FIELDS = ['title', 'roleId', 'level', 'location', 'remote', 'minYears', 'salaryMin', 'salaryMax', 'required', 'preferred', 'duties', 'description', 'benefits', 'languages', 'headcount', 'status', 'templateId'];
const EMP_FIELDS = ['name', 'roleId', 'years', 'skills', 'projectId', 'utilization', 'salary', 'engagement', 'lastRaiseAt', 'joinedAt', 'avatar'];
const PROJECT_FIELDS = ['name', 'status', 'start', 'end', 'headcount', 'requiredSkills'];

const pickFields = (obj, fields) => Object.fromEntries(fields.filter((f) => obj?.[f] !== undefined).map((f) => [f, obj[f]]));
const num = (v) => (v === '' || v == null ? null : Number(v));

function normalizeCandidate(body) {
  const c = pickFields(body, CANDIDATE_FIELDS);
  if ('years' in c) c.years = num(c.years) ?? 0;
  if ('desiredSalary' in c) c.desiredSalary = num(c.desiredSalary);
  if (c.skills) c.skills = c.skills.filter((s) => s?.id).map((s) => ({ id: String(s.id), level: Math.max(1, Math.min(5, Number(s.level) || 3)), years: num(s.years) }));
  return c;
}

function normalizeJob(body) {
  const j = pickFields(body, JOB_FIELDS);
  for (const k of ['minYears', 'salaryMin', 'salaryMax', 'headcount']) if (k in j) j[k] = num(j[k]);
  if (j.required) j.required = j.required.filter((s) => s?.id).map((s) => ({ id: String(s.id), level: Math.max(1, Math.min(5, Number(s.level) || 3)) }));
  if (j.preferred) j.preferred = j.preferred.map(String);
  return j;
}

export function createApp(store) {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 10 } });

  // 簡易セッション（デモ用）: x-user-id ヘッダーでユーザーを識別する
  app.use('/api', (req, _res, next) => {
    const id = req.get('x-user-id');
    req.user = id ? store.get('users', id) : null;
    next();
  });
  const need = (type) => (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'ログインしてください'));
    if (type && req.user.type !== type) return next(new HttpError(403, `${type === 'company' ? '企業' : '応募者'}アカウントでのみ利用できます`));
    next();
  };
  const myCandidate = (req) => store.get('candidates', req.user.candidateId);
  const myJob = (req, id) => {
    const j = store.get('jobs', id);
    if (!j || j.companyId !== req.user.companyId) throw new HttpError(404, '求人が見つかりません');
    return j;
  };
  const withCompany = (job) => ({ ...job, company: store.get('companies', job.companyId) });
  const publicCandidate = (c) => {
    // 企業側には連絡先を相互マッチ成立まで伏せる
    const { email, phone, ...rest } = c;
    return rest;
  };
  const mutual = (candidateId, jobId) => {
    const likes = store.all('likes').filter((l) => l.candidateId === candidateId && l.jobId === jobId);
    return likes.some((l) => l.from === 'candidate') && likes.some((l) => l.from === 'company');
  };

  // ---- メタ情報 ----
  app.get('/api/meta', (_req, res) => {
    res.json({ skills: SKILLS, roles: ROLES, levels: LEVELS, prefectures: PREFECTURES, ai: aiEnabled(), supportedExt: SUPPORTED_EXT, weights: WEIGHTS });
  });

  // ---- セッション ----
  app.get('/api/session/users', (_req, res) => {
    res.json(store.all('users').map((u) => ({ ...u, company: u.companyId ? store.get('companies', u.companyId) : null })));
  });
  app.post('/api/session/register', (req, res) => {
    const { type, name, companyId } = req.body || {};
    if (!['candidate', 'company'].includes(type) || !name) throw new HttpError(400, 'type と name は必須です');
    if (type === 'company') {
      let company = companyId ? store.get('companies', companyId) : null;
      if (!company) company = store.insert('companies', { name: req.body.companyName || `${name}の会社`, industry: req.body.industry || 'Web/SaaS', size: '-', location: '東京都', style: 'web', color: '#0d9488', description: '', booth: { x: 12, y: 3 } });
      return res.json(store.insert('users', { type, name, companyId: company.id }));
    }
    const cand = store.insert('candidates', { name, skills: [], desiredRoles: [], years: 0, status: 'draft', avatar: { color: '#0d9488', hair: 0 } });
    const user = store.insert('users', { type, name, candidateId: cand.id });
    store.update('candidates', cand.id, { userId: user.id });
    res.json(user);
  });
  app.get('/api/me', need(), (req, res) => {
    res.json({ user: req.user, candidate: req.user.candidateId ? myCandidate(req) : null, company: req.user.companyId ? store.get('companies', req.user.companyId) : null });
  });

  // ---- テンプレート ----
  app.get('/api/templates', (req, res) => {
    const { kind = 'resume', role, level, q } = req.query;
    const t = allTemplates();
    let list = kind === 'job' ? t.jobs : t.resumes;
    if (role) list = list.filter((x) => x.roleId === role);
    if (level) list = list.filter((x) => x.level === level);
    if (q) list = list.filter((x) => x.title.includes(q) || x.description.includes(q));
    res.json({ total: list.length, items: list, formats: t.formats, styles: t.styles });
  });
  app.get('/api/templates/suggest', (req, res) => {
    const skills = String(req.query.skills || '').split(',').filter(Boolean);
    res.json(suggestTemplates(req.query.kind === 'job' ? 'job' : 'resume', skills));
  });
  app.get('/api/templates/:id', (req, res) => {
    const t = findTemplate(req.params.id);
    if (!t) throw new HttpError(404, 'テンプレートが見つかりません');
    res.json(t);
  });

  // ---- ファイル抽出 ----
  app.post('/api/extract', need(), upload.array('files', 10), wrap(async (req, res) => {
    if (!req.files?.length) throw new HttpError(400, 'ファイルを選択してください');
    const kind = req.query.kind === 'job' ? 'job' : 'resume';
    const result = await extractFromFiles(req.files, kind);
    const ids = kind === 'job' ? (result.data.required || []).map((s) => s.id).concat(result.data.preferred || []) : (result.data.skills || []).map((s) => s.id);
    res.json({ ...result, suggestions: suggestTemplates(kind, ids, 4) });
  }));

  // ---- 応募者プロフィール ----
  app.get('/api/candidates/me', need('candidate'), (req, res) => res.json(myCandidate(req)));
  app.put('/api/candidates/me', need('candidate'), (req, res) => {
    const patch = normalizeCandidate(req.body);
    res.json(store.update('candidates', req.user.candidateId, patch));
  });
  app.get('/api/candidates', need('company'), (req, res) => {
    const pool = store.all('candidates').filter((c) => c.status === 'published');
    if (req.query.jobId) {
      const job = myJob(req, req.query.jobId);
      return res.json(rankCandidatesFor(job, pool, Number(req.query.limit) || 50).map(({ candidate, match }) => ({
        candidate: mutual(candidate.id, job.id) ? candidate : publicCandidate(candidate),
        match, label: scoreLabel(match.total),
        liked: store.all('likes').some((l) => l.from === 'company' && l.candidateId === candidate.id && l.jobId === job.id),
        mutual: mutual(candidate.id, job.id),
      })));
    }
    res.json(pool.map(publicCandidate));
  });
  app.get('/api/candidates/:id', need('company'), (req, res) => {
    const c = store.get('candidates', req.params.id);
    if (!c || c.status !== 'published') throw new HttpError(404, '応募者が見つかりません');
    const myJobs = store.all('jobs', { companyId: req.user.companyId });
    const anyMutual = myJobs.some((j) => mutual(c.id, j.id));
    res.json({ candidate: anyMutual ? c : publicCandidate(c), matches: myJobs.map((j) => ({ jobId: j.id, title: j.title, match: matchScore(c, j) })).sort((a, b) => b.match.total - a.match.total) });
  });

  // ---- 求人 ----
  app.get('/api/jobs', (req, res) => {
    let jobs = store.all('jobs').filter((j) => j.status !== 'closed');
    const { role, remote, location, q } = req.query;
    if (role) jobs = jobs.filter((j) => j.roleId === role);
    if (remote) jobs = jobs.filter((j) => j.remote === remote);
    if (location) jobs = jobs.filter((j) => j.location === location);
    if (q) jobs = jobs.filter((j) => `${j.title}${j.description}${store.get('companies', j.companyId)?.name}`.includes(q));
    if (req.user?.type === 'candidate') {
      const c = myCandidate(req);
      const likes = store.all('likes').filter((l) => l.candidateId === c.id);
      return res.json(rankJobsFor(c, jobs, 200).map(({ job, match }) => ({
        job: withCompany(job), match, label: scoreLabel(match.total),
        liked: likes.some((l) => l.from === 'candidate' && l.jobId === job.id),
        scouted: likes.some((l) => l.from === 'company' && l.jobId === job.id),
        mutual: mutual(c.id, job.id),
      })));
    }
    res.json(jobs.map((job) => ({ job: withCompany(job) })));
  });
  app.get('/api/jobs/:id', (req, res) => {
    const job = store.get('jobs', req.params.id);
    if (!job) throw new HttpError(404, '求人が見つかりません');
    const out = { job: withCompany(job) };
    if (req.user?.type === 'candidate') out.match = matchScore(myCandidate(req), job);
    res.json(out);
  });
  app.get('/api/company/jobs', need('company'), (req, res) => {
    const pool = store.all('candidates').filter((c) => c.status === 'published');
    res.json(store.all('jobs', { companyId: req.user.companyId }).map((j) => {
      const scores = pool.map((c) => matchScore(c, j).total);
      return {
        ...j,
        stats: {
          strong: scores.filter((s) => s >= 70).length,
          applications: store.all('applications', { jobId: j.id }).length,
          mutual: pool.filter((c) => mutual(c.id, j.id)).length,
        },
      };
    }));
  });
  app.post('/api/jobs', need('company'), (req, res) => {
    const j = normalizeJob(req.body);
    if (!j.title) throw new HttpError(400, '求人タイトルは必須です');
    res.status(201).json(store.insert('jobs', { status: 'open', required: [], preferred: [], ...j, companyId: req.user.companyId }));
  });
  app.put('/api/jobs/:id', need('company'), (req, res) => {
    myJob(req, req.params.id);
    res.json(store.update('jobs', req.params.id, normalizeJob(req.body)));
  });
  app.delete('/api/jobs/:id', need('company'), (req, res) => {
    myJob(req, req.params.id);
    store.remove('jobs', req.params.id);
    res.status(204).end();
  });

  // ---- いいね / スカウト / 相互マッチ ----
  app.post('/api/likes', need(), (req, res) => {
    const { jobId } = req.body || {};
    const from = req.user.type;
    const candidateId = from === 'candidate' ? req.user.candidateId : req.body.candidateId;
    if (from === 'company') myJob(req, jobId);
    if (!store.get('jobs', jobId) || !store.get('candidates', candidateId)) throw new HttpError(404, '対象が見つかりません');
    const existing = store.all('likes').find((l) => l.from === from && l.candidateId === candidateId && l.jobId === jobId);
    if (existing) store.remove('likes', existing.id);
    else store.insert('likes', { from, candidateId, jobId });
    res.json({ liked: !existing, mutual: mutual(candidateId, jobId) });
  });
  app.get('/api/matches', need(), (req, res) => {
    const pairs = new Map();
    for (const l of store.all('likes')) pairs.set(`${l.candidateId}|${l.jobId}`, { candidateId: l.candidateId, jobId: l.jobId });
    const list = [...pairs.values()].filter((p) => mutual(p.candidateId, p.jobId)).filter((p) => {
      if (req.user.type === 'candidate') return p.candidateId === req.user.candidateId;
      return store.get('jobs', p.jobId)?.companyId === req.user.companyId;
    });
    res.json(list.map((p) => {
      const job = store.get('jobs', p.jobId);
      const cand = store.get('candidates', p.candidateId);
      return { job: withCompany(job), candidate: cand, match: matchScore(cand, job) };
    }));
  });

  // ---- 応募・選考 ----
  app.post('/api/applications', need('candidate'), (req, res) => {
    const { jobId, message } = req.body || {};
    if (!store.get('jobs', jobId)) throw new HttpError(404, '求人が見つかりません');
    const dup = store.all('applications').find((a) => a.jobId === jobId && a.candidateId === req.user.candidateId);
    if (dup) throw new HttpError(409, 'すでに応募済みです');
    res.status(201).json(store.insert('applications', { jobId, candidateId: req.user.candidateId, message: message || '', status: 'applied' }));
  });
  app.get('/api/applications', need(), (req, res) => {
    let apps = store.all('applications');
    if (req.user.type === 'candidate') apps = apps.filter((a) => a.candidateId === req.user.candidateId);
    else apps = apps.filter((a) => store.get('jobs', a.jobId)?.companyId === req.user.companyId);
    res.json(apps.map((a) => {
      const job = store.get('jobs', a.jobId);
      const cand = store.get('candidates', a.candidateId);
      return { ...a, job: withCompany(job), candidate: req.user.type === 'company' ? cand : undefined, match: matchScore(cand, job) };
    }));
  });
  app.patch('/api/applications/:id', need('company'), (req, res) => {
    const a = store.get('applications', req.params.id);
    if (!a || store.get('jobs', a.jobId)?.companyId !== req.user.companyId) throw new HttpError(404, '応募が見つかりません');
    const { status, interviewAt, note } = req.body || {};
    if (status && !['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'].includes(status)) throw new HttpError(400, '不正なステータスです');
    res.json(store.update('applications', a.id, pickFields({ status, interviewAt, note }, ['status', 'interviewAt', 'note'])));
  });

  // ---- アドバイス ----
  app.get('/api/advice/interview', need('company'), wrap(async (req, res) => {
    const job = myJob(req, req.query.jobId);
    const cand = store.get('candidates', req.query.candidateId);
    if (!cand) throw new HttpError(404, '応募者が見つかりません');
    res.json(await interviewAdviceForCompany(job, cand));
  }));
  app.get('/api/advice/prep', need('candidate'), wrap(async (req, res) => {
    const job = store.get('jobs', req.query.jobId);
    if (!job) throw new HttpError(404, '求人が見つかりません');
    res.json({ job: withCompany(job), ...(await prepAdviceForCandidate(myCandidate(req), job, store)) });
  }));
  app.get('/api/advice/skills', need('candidate'), (req, res) => {
    res.json(skillAdvice(myCandidate(req), store, req.query.role));
  });

  // ---- 市場動態 ----
  app.get('/api/market/overview', (_req, res) => res.json(overview(store)));
  app.get('/api/market/skills', (_req, res) => res.json({ skills: skillDemandSupply(store), categories: skillCategoryHeat(store) }));
  app.get('/api/market/salaries', (_req, res) => res.json(roleSalaryBands(store)));
  app.get('/api/market/trends', (req, res) => res.json(trends(store, String(req.query.skills || '').split(',').filter(Boolean))));
  app.get('/api/market/company', need('company'), (req, res) => res.json(companyInsights(store, req.user.companyId)));
  app.get('/api/market/me', need('candidate'), (req, res) => res.json(candidateValue(store, myCandidate(req))));

  // ---- 人的リソース管理 ----
  app.get('/api/hr/dashboard', need('company'), (req, res) => res.json(hrDashboard(store, req.user.companyId)));
  const ownEmp = (req) => {
    const e = store.get('employees', req.params.id);
    if (!e || e.companyId !== req.user.companyId) throw new HttpError(404, '社員が見つかりません');
    return e;
  };
  app.post('/api/hr/employees', need('company'), (req, res) => {
    const e = pickFields(req.body, EMP_FIELDS);
    if (!e.name) throw new HttpError(400, '氏名は必須です');
    res.status(201).json(store.insert('employees', { skills: [], utilization: 0, engagement: 70, ...e, companyId: req.user.companyId }));
  });
  app.put('/api/hr/employees/:id', need('company'), (req, res) => {
    ownEmp(req);
    res.json(store.update('employees', req.params.id, pickFields(req.body, EMP_FIELDS)));
  });
  app.delete('/api/hr/employees/:id', need('company'), (req, res) => {
    ownEmp(req);
    store.remove('employees', req.params.id);
    res.status(204).end();
  });
  app.post('/api/hr/projects', need('company'), (req, res) => {
    const p = pickFields(req.body, PROJECT_FIELDS);
    if (!p.name) throw new HttpError(400, 'プロジェクト名は必須です');
    res.status(201).json(store.insert('projects', { status: 'planning', requiredSkills: [], headcount: 1, ...p, companyId: req.user.companyId }));
  });
  app.post('/api/hr/assign', need('company'), (req, res) => {
    const { employeeId, projectId } = req.body || {};
    const e = store.get('employees', employeeId);
    if (!e || e.companyId !== req.user.companyId) throw new HttpError(404, '社員が見つかりません');
    if (projectId) {
      const p = store.get('projects', projectId);
      if (!p || p.companyId !== req.user.companyId) throw new HttpError(404, 'プロジェクトが見つかりません');
    }
    const util = projectId ? Math.min(120, Math.max(e.utilization || 0, 0) + (e.projectId ? 0 : 60)) : Math.max(0, (e.utilization || 0) - 60);
    res.json(store.update('employees', e.id, { projectId: projectId || null, utilization: util }));
  });

  // ---- バーチャル合同説明会 / 模擬面接 ----
  app.get('/api/fair', (req, res) => {
    const cand = req.user?.type === 'candidate' ? myCandidate(req) : null;
    res.json(store.all('companies').map((c) => {
      const jobs = store.all('jobs').filter((j) => j.companyId === c.id && j.status !== 'closed');
      const best = cand ? jobs.map((j) => ({ id: j.id, title: j.title, score: matchScore(cand, j).total })).sort((a, b) => b.score - a.score)[0] : null;
      return { ...c, booth: c.booth || { x: 12, y: 3 }, jobs: jobs.map((j) => ({ id: j.id, title: j.title, salaryMin: j.salaryMin, salaryMax: j.salaryMax, remote: j.remote, roleId: j.roleId })), best };
    }));
  });
  app.get('/api/interview/questions', (req, res) => {
    const job = req.query.jobId ? store.get('jobs', req.query.jobId) : null;
    const cand = req.user?.type === 'candidate' ? myCandidate(req) : null;
    const company = job ? store.get('companies', job.companyId) : null;
    res.json({ ...interviewQuestions(job, cand), company, job });
  });
  app.post('/api/interview/evaluate', wrap(async (req, res) => {
    const { question, answer, jobId } = req.body || {};
    const job = jobId ? store.get('jobs', jobId) : null;
    const cand = req.user?.type === 'candidate' ? myCandidate(req) : null;
    const skills = [...new Set([...(job?.required || []).map((r) => r.id), ...(cand?.skills || []).map((s) => s.id)])];
    res.json(await evaluateAnswer(question, answer, { skills }));
  }));
  app.post('/api/interview/sessions', need('candidate'), (req, res) => {
    const { jobId, results } = req.body || {};
    const scores = (results || []).map((r) => Number(r.score) || 0);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    res.status(201).json(store.insert('interviews', { candidateId: req.user.candidateId, jobId: jobId || null, results: results || [], score: avg }));
  });
  app.get('/api/interview/sessions', need('candidate'), (req, res) => {
    res.json(store.all('interviews', { candidateId: req.user.candidateId }).slice(-20).reverse());
  });

  app.post('/api/admin/reset', (_req, res) => {
    seed(store);
    res.json({ ok: true });
  });

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not Found')));
  app.use(express.static(path.join(__dirname, '../public')));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'サーバーエラーが発生しました' : err.message });
  });
  return app;
}

export { COMPANIES, ROLE_BY_ID };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const store = new Store(process.env.DB_FILE || path.join(__dirname, '../data/db.json'));
  if (store.isEmpty()) seed(store);
  const port = Number(process.env.PORT || 3000);
  createApp(store).listen(port, () => {
    console.log(`IT Talent Match: http://localhost:${port}  (Claude ${aiEnabled() ? '有効' : '無効: ルールベースで動作'})`);
  });
}
