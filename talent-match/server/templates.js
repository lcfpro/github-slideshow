// 職種 × レベル × 書式 の組み合わせからテンプレートを生成する。
// 応募者・企業とも「選ぶ → 少し直す → 提出」で済むよう、全項目を事前に埋めておく。
import { ROLES, LEVELS, ROLE_BY_ID } from './data/roles.js';
import { skillName } from './data/skills.js';

const RESUME_FORMATS = [
  { id: 'chrono', name: '編年体式（時系列）', desc: '経歴を古い順に並べる定番形式。社歴が一貫している方向け' },
  { id: 'career', name: 'キャリア式（スキル軸）', desc: 'プロジェクト・スキル単位でまとめる形式。転職回数が多い方向け' },
  { id: 'global', name: '英文Resume併記', desc: '外資・グローバル企業向け。英語サマリー付き' },
];

const JOB_STYLES = [
  { id: 'startup', name: 'スタートアップ', perks: ['ストックオプション', 'フルリモート可', '書籍・カンファレンス費用補助'], remote: 'full', tone: '裁量が大きく、プロダクトの成長を間近で感じられる環境です。' },
  { id: 'web', name: 'Web/SaaS 事業会社', perks: ['フレックスタイム', 'リモート週3以上', '開発PC選択可', '副業可'], remote: 'hybrid', tone: '自社サービスの改善に継続的に関われる環境です。' },
  { id: 'sier', name: '大手SIer', perks: ['資格取得支援', '退職金制度', '住宅手当', '研修制度充実'], remote: 'hybrid', tone: '大規模案件で上流から下流まで経験を積める環境です。' },
  { id: 'global', name: '外資系IT', perks: ['英語研修', '海外拠点との協業', 'RSU', '年休25日'], remote: 'hybrid', tone: 'グローバルチームと共に最先端の技術に取り組める環境です。' },
];

function levelMeta(levelId) {
  return LEVELS.find((l) => l.id === levelId);
}

function skillLevelFor(levelId, required) {
  const base = { junior: 2, middle: 3, senior: 4 }[levelId];
  return required ? base : Math.max(1, base - 1);
}

function resumeTemplate(role, level, format) {
  const lv = levelMeta(level);
  const years = { junior: 2, middle: 5, senior: 10 }[level];
  const core = [...role.required, ...(role.anyOf ? [role.anyOf[0]] : [])];
  const extra = role.preferred.slice(0, level === 'junior' ? 1 : level === 'middle' ? 3 : 5);
  const skills = [...new Set([...core, ...extra])].map((id) => ({
    id,
    level: skillLevelFor(level, core.includes(id)),
    years: Math.max(1, Math.round(years * (core.includes(id) ? 0.8 : 0.4))),
  }));
  const mainSkills = skills.slice(0, 3).map((s) => skillName(s.id)).join('・');
  const salary = role.salary[level];
  const experiences = [];
  if (level !== 'junior') {
    experiences.push({
      company: '株式会社〇〇（前職）',
      period: `${2026 - years}年4月 〜 ${2026 - Math.ceil(years / 2)}年3月`,
      role: role.name,
      description: `${role.duties[0]}を担当。${mainSkills}を用いて開発を行い、チーム${level === 'senior' ? '10' : '5'}名規模のプロジェクトに参画。`,
      skills: core.slice(0, 3),
    });
  }
  experiences.push({
    company: '株式会社△△（現職）',
    period: `${2026 - Math.ceil(years / 2)}年4月 〜 現在`,
    role: level === 'senior' ? `${role.name}（リード）` : role.name,
    description: `${role.duties[1] || role.duties[0]}に従事。${level === 'senior' ? 'アーキテクチャ設計とメンバー育成を主導し、' : ''}成果として〇〇を△△%改善。`,
    skills: [...core, ...extra].slice(0, 4),
  });
  const summary = `${lv.name}${role.name}として約${years}年の経験があります。${mainSkills}を中心に、${role.duties[0]}を得意としています。` +
    (level === 'senior' ? 'チームを牽引し、技術選定から品質改善まで一貫して推進してきました。' : '今後はより上流の設計や改善提案にも挑戦したいと考えています。');
  return {
    id: `resume-${role.id}-${level}-${format.id}`,
    kind: 'resume',
    roleId: role.id,
    level,
    format: format.id,
    title: `${role.icon} ${role.name}（${lv.name}）— ${format.name}`,
    description: format.desc,
    profile: {
      summary: format.id === 'global'
        ? `${summary}\n\n[English] ${role.id.replace(/_/g, ' ')} professional with ~${years} years of experience in ${mainSkills}.`
        : summary,
      desiredRoles: [role.id],
      years,
      skills,
      desiredSalary: Math.round((salary[0] + salary[1]) / 2),
      remote: 'hybrid',
      languages: { japanese: 'ネイティブ', english: format.id === 'global' ? 'ビジネス（TOEIC 850）' : '読み書き' },
      experiences: format.id === 'career' ? experiences.reverse() : experiences,
      certifications: level === 'junior' ? ['基本情報技術者'] : ['応用情報技術者'],
      education: '〇〇大学 情報工学部 卒業',
    },
  };
}

function jobTemplate(role, level, style) {
  const lv = levelMeta(level);
  const [min, max] = role.salary[level];
  const bump = style.id === 'global' ? 1.15 : style.id === 'startup' ? 1.0 : style.id === 'sier' ? 0.95 : 1.05;
  const required = [...role.required, ...(role.anyOf ? [role.anyOf[0]] : [])].map((id) => ({ id, level: skillLevelFor(level, true) }));
  return {
    id: `job-${role.id}-${level}-${style.id}`,
    kind: 'job',
    roleId: role.id,
    level,
    style: style.id,
    title: `${role.icon} ${role.name}（${lv.name}）— ${style.name}向け`,
    description: `${style.name}の求人票ひな形。福利厚生・働き方を含め自動入力済み`,
    job: {
      title: `${role.name}（${lv.name}）`,
      roleId: role.id,
      level,
      minYears: lv.years[0],
      salaryMin: Math.round(min * bump),
      salaryMax: Math.round(max * bump),
      remote: style.remote,
      required,
      preferred: role.preferred.slice(0, 4),
      duties: role.duties,
      description: `${role.name}として、${role.duties[0]}をお任せします。${style.tone}`,
      benefits: style.perks,
      languages: { japanese: style.id === 'global' ? 'N2以上' : 'ネイティブレベル', english: style.id === 'global' ? 'ビジネスレベル' : '不問' },
      headcount: level === 'junior' ? 3 : level === 'middle' ? 2 : 1,
    },
  };
}

let cache;
export function allTemplates() {
  if (cache) return cache;
  const resumes = [];
  const jobs = [];
  for (const role of ROLES) {
    for (const lv of LEVELS) {
      for (const f of RESUME_FORMATS) resumes.push(resumeTemplate(role, lv.id, f));
      for (const s of JOB_STYLES) jobs.push(jobTemplate(role, lv.id, s));
    }
  }
  cache = { resumes, jobs, formats: RESUME_FORMATS, styles: JOB_STYLES };
  return cache;
}

export function findTemplate(id) {
  const { resumes, jobs } = allTemplates();
  return resumes.find((t) => t.id === id) || jobs.find((t) => t.id === id) || null;
}

/** 抽出済みプロフィールに最も近いテンプレートを推薦する（スキル重なり順）。 */
export function suggestTemplates(kind, skills = [], limit = 6) {
  const { resumes, jobs } = allTemplates();
  const list = kind === 'job' ? jobs : resumes;
  const ids = new Set(skills.map((s) => (typeof s === 'string' ? s : s.id)));
  return list
    .map((t) => {
      const role = ROLE_BY_ID[t.roleId];
      const pool = [...role.required, ...(role.anyOf || []), ...role.preferred];
      const hit = pool.filter((id) => ids.has(id)).length;
      return { t, score: hit / pool.length + (role.required.every((r) => ids.has(r)) ? 0.5 : 0) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.t);
}
