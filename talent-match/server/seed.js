// デモ用シードデータ（決定的な擬似乱数で毎回同じデータを生成）。
// `npm run seed` で data/db.json を作り直す。人物・企業名はすべて架空。
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './store.js';
import { SKILLS } from './data/skills.js';
import { ROLES, ROLE_BY_ID, LEVELS, PREFECTURES, levelFromYears } from './data/roles.js';
import { allTemplates } from './templates.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LAST = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山田', '佐々木', '松本', '井上', '木村', '林', '清水', '王', '李', 'Nguyen', 'Kumar'];
const FIRST = ['翔太', '美咲', '大輔', '陽菜', '健太', '結衣', '拓海', '彩', '悠真', '花子', '蓮', '優奈', '浩', '真由', '直樹', '葵', '明', 'Linh', 'Raj', '偉'];
const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#db2777', '#4f46e5', '#65a30d', '#0d9488'];

export const COMPANIES = [
  { id: 'c-nebula', name: 'ネビュラテック株式会社', industry: 'SaaS', size: '300名', location: '東京都', style: 'web', color: '#2563eb', description: 'BtoB向けSaaSで中小企業のDXを支援。開発組織100名規模。', booth: { x: 2, y: 1 } },
  { id: 'c-sakura', name: 'さくらシステムズ株式会社', industry: '大手SIer', size: '5,000名', location: '東京都', style: 'sier', color: '#db2777', description: '金融・公共向けの大規模システム開発を手がける独立系SIer。', booth: { x: 6, y: 1 } },
  { id: 'c-kaze', name: '株式会社カゼラボ', industry: 'スタートアップ', size: '40名', location: '福岡県', style: 'startup', color: '#16a34a', description: '生成AIを活用した業務自動化プロダクトを開発するシリーズAスタートアップ。', booth: { x: 10, y: 1 } },
  { id: 'c-orbit', name: 'Orbit Cloud Japan合同会社', industry: '外資系IT', size: '800名', location: '東京都', style: 'global', color: '#9333ea', description: 'グローバルクラウドサービスの日本法人。エンジニアの約半数が外国籍。', booth: { x: 2, y: 5 } },
  { id: 'c-minato', name: 'みなとペイ株式会社', industry: 'FinTech', size: '600名', location: '大阪府', style: 'web', color: '#ea580c', description: 'キャッシュレス決済サービスを運営。高トラフィックな決済基盤を自社開発。', booth: { x: 6, y: 5 } },
  { id: 'c-tsubasa', name: 'ツバサモビリティ株式会社', industry: 'メーカー', size: '12,000名', location: '愛知県', style: 'sier', color: '#0891b2', description: '自動車部品メーカーのソフトウェア子会社。車載ソフト・コネクテッド領域。', booth: { x: 10, y: 5 } },
  { id: 'c-hikari', name: 'ひかりデータ株式会社', industry: 'データ/AI', size: '150名', location: '東京都', style: 'startup', color: '#4f46e5', description: '小売・製造向けのデータ分析基盤とAIソリューションを提供。', booth: { x: 4, y: 3 } },
  { id: 'c-kitano', name: '北のゲームス株式会社', industry: 'ゲーム/エンタメ', size: '250名', location: '北海道', style: 'web', color: '#65a30d', description: 'スマホゲームを開発・運営。札幌拠点でフルリモート比率も高い。', booth: { x: 8, y: 3 } },
];

const COMPANY_ROLES = {
  'c-nebula': ['frontend', 'backend', 'sre', 'product_manager', 'qa'],
  'c-sakura': ['pm', 'backend', 'infra', 'sap', 'security'],
  'c-kaze': ['ml_engineer', 'fullstack', 'cloud'],
  'c-orbit': ['cloud', 'sre', 'security', 'tech_lead'],
  'c-minato': ['backend', 'mobile', 'security', 'data_engineer'],
  'c-tsubasa': ['embedded', 'qa', 'cloud', 'pm'],
  'c-hikari': ['data_scientist', 'data_engineer', 'ml_engineer', 'uiux'],
  'c-kitano': ['frontend', 'mobile', 'backend', 'uiux'],
};

function pickN(r, arr, n) {
  const a = [...arr];
  const out = [];
  while (a.length && out.length < n) out.push(a.splice(Math.floor(r() * a.length), 1)[0]);
  return out;
}

export function seed(store) {
  const r = rng(20261017);
  store.reset();
  const { jobs: jobTemplates } = allTemplates();

  for (const c of COMPANIES) store.insert('companies', { ...c });
  store.insert('users', { id: 'u-company', type: 'company', name: 'ネビュラテック 採用担当', companyId: 'c-nebula' });

  // 求人
  for (const c of COMPANIES) {
    for (const roleId of COMPANY_ROLES[c.id]) {
      const levels = pickN(r, LEVELS.map((l) => l.id), 1 + Math.floor(r() * 2));
      for (const level of levels) {
        const t = jobTemplates.find((x) => x.roleId === roleId && x.level === level && x.style === c.style) || jobTemplates.find((x) => x.roleId === roleId && x.level === level);
        const j = structuredClone(t.job);
        const jitter = 0.92 + r() * 0.2;
        store.insert('jobs', {
          ...j,
          companyId: c.id,
          location: c.location,
          salaryMin: Math.round((j.salaryMin * jitter) / 10) * 10,
          salaryMax: Math.round((j.salaryMax * jitter) / 10) * 10,
          remote: c.id === 'c-kitano' && r() > 0.4 ? 'full' : j.remote,
          status: 'open',
          templateId: t.id,
          createdAt: new Date(Date.now() - Math.floor(r() * 60) * 864e5).toISOString(),
        });
      }
    }
  }

  // 応募者
  const roleIds = ROLES.map((x) => x.id);
  for (let i = 0; i < 72; i++) {
    const role = ROLE_BY_ID[roleIds[Math.floor(r() * roleIds.length)]];
    const years = Math.round((0.5 + r() * r() * 15) * 10) / 10;
    const lvBase = Math.min(5, 1 + Math.round(years / 3));
    const core = [...role.required, ...(role.anyOf ? pickN(r, role.anyOf, 1) : [])].filter(() => r() > 0.15);
    const extra = pickN(r, role.preferred, Math.floor(r() * 4));
    const random = pickN(r, SKILLS.map((s) => s.id), Math.floor(r() * 3));
    const skills = [...new Set([...core, ...extra, ...random])].map((id) => ({ id, level: Math.max(1, Math.min(5, lvBase + Math.round((r() - 0.5) * 2))), years: Math.max(0.5, Math.round(years * (0.3 + r() * 0.7) * 10) / 10) }));
    const level = levelFromYears(years);
    const [lo, hi] = role.salary[level];
    const name = `${LAST[Math.floor(r() * LAST.length)]} ${FIRST[Math.floor(r() * FIRST.length)]}`;
    const foreign = /[A-Za-z]|王|李|偉/.test(name);
    store.insert('candidates', {
      userId: null,
      name,
      email: `user${i + 1}@example.com`,
      location: PREFECTURES[Math.floor(r() * r() * PREFECTURES.length)],
      years,
      desiredRoles: [role.id],
      skills,
      desiredSalary: Math.round((lo + (hi - lo) * r()) / 10) * 10,
      remote: ['full', 'hybrid', 'hybrid', 'onsite', 'any'][Math.floor(r() * 5)],
      languages: { japanese: foreign ? ['N1', 'N2', 'N3'][Math.floor(r() * 3)] : 'ネイティブ', english: r() > 0.6 ? `TOEIC ${600 + Math.floor(r() * 35) * 10}` : '読み書き' },
      summary: `${role.name}として約${Math.round(years)}年の経験。${skills.slice(0, 3).map((s) => SKILLS.find((x) => x.id === s.id).name).join('・')}が得意です。`,
      experiences: [{ company: '株式会社サンプル', period: `${2026 - Math.ceil(years)}年4月 〜 現在`, role: role.name, description: role.duties[0], skills: core.slice(0, 3) }],
      certifications: r() > 0.5 ? ['応用情報技術者'] : [],
      avatar: { color: COLORS[Math.floor(r() * COLORS.length)], hair: Math.floor(r() * 4) },
      status: 'published',
    });
  }

  // デモ応募者（ログインユーザー）
  const demo = store.insert('candidates', {
    id: 'cand-demo',
    userId: 'u-candidate',
    name: '山田 太郎',
    email: 'taro.yamada@example.com',
    location: '東京都',
    years: 5,
    desiredRoles: ['frontend', 'fullstack'],
    skills: [
      { id: 'javascript', level: 4, years: 5 }, { id: 'typescript', level: 4, years: 3 }, { id: 'react', level: 4, years: 4 },
      { id: 'html_css', level: 4, years: 5 }, { id: 'nodejs', level: 3, years: 2 }, { id: 'git', level: 4, years: 5 }, { id: 'aws', level: 2, years: 1 },
    ],
    desiredSalary: 700,
    remote: 'hybrid',
    languages: { japanese: 'ネイティブ', english: 'TOEIC 720' },
    summary: 'Webフロントエンドを中心に5年。ReactとTypeScriptでのSaaS開発、デザインシステム構築を担当。今後はフルスタックに挑戦したい。',
    experiences: [
      { company: '株式会社ウェブワークス', period: '2021年4月 〜 2023年3月', role: 'フロントエンドエンジニア', description: 'ECサイトのフロントエンドをjQueryからReactへ移行。表示速度を40%改善。', skills: ['react', 'javascript'] },
      { company: '株式会社クラウドノート', period: '2023年4月 〜 現在', role: 'フロントエンドエンジニア', description: 'SaaSの管理画面をTypeScript/Reactで開発。デザインシステムを構築し開発工数を30%削減。', skills: ['typescript', 'react', 'html_css'] },
    ],
    certifications: ['応用情報技術者'],
    education: '〇〇大学 情報工学部 卒業',
    avatar: { color: '#2563eb', hair: 1 },
    status: 'published',
  });
  store.insert('users', { id: 'u-candidate', type: 'candidate', name: demo.name, candidateId: demo.id });

  // デモ企業の社員とプロジェクト（人的リソース管理）
  const projects = [
    { id: 'p-1', name: '新管理画面リニューアル', status: 'active', start: '2026-07-01', end: '2027-03-31', headcount: 5, requiredSkills: [{ id: 'react', level: 3 }, { id: 'typescript', level: 3 }, { id: 'graphql', level: 3 }, { id: 'testing', level: 2 }] },
    { id: 'p-2', name: '基盤のKubernetes移行', status: 'active', start: '2026-04-01', end: '2026-12-31', headcount: 4, requiredSkills: [{ id: 'kubernetes', level: 3 }, { id: 'terraform', level: 3 }, { id: 'aws', level: 3 }, { id: 'observability', level: 3 }] },
    { id: 'p-3', name: '生成AIアシスタント機能', status: 'planning', start: '2026-11-01', end: '2027-06-30', headcount: 3, requiredSkills: [{ id: 'llm', level: 3 }, { id: 'python', level: 3 }, { id: 'api_design', level: 3 }] },
    { id: 'p-4', name: '請求APIのリファクタリング', status: 'active', start: '2026-05-01', end: '2026-11-30', headcount: 3, requiredSkills: [{ id: 'go', level: 3 }, { id: 'postgresql', level: 3 }, { id: 'microservices', level: 3 }] },
  ];
  for (const p of projects) store.insert('projects', { ...p, companyId: 'c-nebula' });
  const empRoles = ['frontend', 'frontend', 'frontend', 'backend', 'backend', 'backend', 'backend', 'sre', 'sre', 'cloud', 'qa', 'product_manager', 'data_scientist', 'fullstack', 'tech_lead', 'uiux'];
  empRoles.forEach((roleId, i) => {
    const role = ROLE_BY_ID[roleId];
    const years = Math.round((1 + r() * 12) * 10) / 10;
    const lvBase = Math.min(5, 1 + Math.round(years / 3));
    const skills = [...new Set([...role.required, ...(role.anyOf ? [role.anyOf[0]] : []), ...pickN(r, role.preferred, 2 + Math.floor(r() * 3))])].map((id) => ({ id, level: Math.max(1, Math.min(5, lvBase + Math.round((r() - 0.6) * 3))) }));
    const level = levelFromYears(years);
    const [lo, hi] = role.salary[level];
    const project = projects.find((p) => p.requiredSkills.some((rs) => skills.some((s) => s.id === rs.id)) && r() > 0.3);
    store.insert('employees', {
      companyId: 'c-nebula',
      name: `${LAST[(i * 7) % LAST.length]} ${FIRST[(i * 5) % FIRST.length]}`,
      roleId, years, skills,
      projectId: project?.id || null,
      utilization: project ? 60 + Math.floor(r() * 65) : Math.floor(r() * 50),
      salary: Math.round((lo * 0.85 + (hi - lo) * r()) / 10) * 10,
      engagement: 30 + Math.floor(r() * 65),
      lastRaiseAt: new Date(Date.now() - Math.floor(r() * 36) * 30 * 864e5).toISOString().slice(0, 10),
      joinedAt: new Date(Date.now() - Math.floor(years * 0.6 * 365) * 864e5).toISOString().slice(0, 10),
      avatar: { color: COLORS[i % COLORS.length], hair: i % 4 },
    });
  });

  // 市場の月次スナップショット（18ヶ月）
  const now = new Date();
  for (let k = 17; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const t = (17 - k) / 17;
    const skills = {};
    for (const s of SKILLS) {
      const base = s.demand * 12;
      const growth = 1 + (s.growth / 100) * t * 1.5;
      const season = 1 + 0.06 * Math.sin((d.getMonth() / 12) * Math.PI * 2);
      skills[s.id] = { postings: Math.round(base * growth * season * (0.95 + r() * 0.1)) };
    }
    store.insert('marketHistory', {
      month,
      skills,
      avgSalary: Math.round(640 + t * 28 + r() * 6),
      jobsTotal: Math.round(42000 * (1 + t * 0.08) * (0.97 + r() * 0.06)),
      candidatesTotal: Math.round(18000 * (1 + t * 0.03) * (0.97 + r() * 0.06)),
    });
  }

  // デモ用の応募・いいね
  const firstJobs = store.all('jobs').filter((j) => ['frontend', 'fullstack'].includes(j.roleId)).slice(0, 2);
  for (const j of firstJobs) store.insert('likes', { from: 'candidate', candidateId: 'cand-demo', jobId: j.id });
  const nebulaFront = store.all('jobs').find((j) => j.companyId === 'c-nebula' && j.roleId === 'frontend');
  if (nebulaFront) {
    store.insert('likes', { from: 'company', candidateId: 'cand-demo', jobId: nebulaFront.id });
    store.insert('likes', { from: 'candidate', candidateId: 'cand-demo', jobId: nebulaFront.id });
    store.insert('applications', { candidateId: 'cand-demo', jobId: nebulaFront.id, status: 'interview', message: 'デザインシステム構築の経験を活かしたいです。', interviewAt: new Date(Date.now() + 3 * 864e5).toISOString() });
  }
  store.flush();
  return store;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/db.json');
  const s = seed(new Store(file));
  console.log(`seeded: ${s.all('companies').length} companies, ${s.all('jobs').length} jobs, ${s.all('candidates').length} candidates, ${s.all('employees').length} employees → ${file}`);
}
