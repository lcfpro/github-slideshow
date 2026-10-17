// 応募者 × 求人 の双方向マッチングスコア。説明可能性を重視し、内訳と根拠を返す。
import { SKILL_BY_ID, skillName } from './data/skills.js';

export const WEIGHTS = { skills: 0.5, experience: 0.15, salary: 0.15, workstyle: 0.1, language: 0.1 };

const REMOTE_FIT = {
  full: { full: 1, hybrid: 0.6, onsite: 0.15 },
  hybrid: { full: 1, hybrid: 1, onsite: 0.5 },
  onsite: { full: 0.8, hybrid: 1, onsite: 1 },
  any: { full: 1, hybrid: 1, onsite: 1 },
};

function jlptRank(s = '') {
  if (/ネイティブ|native|母語/i.test(s)) return 6;
  const m = s.match(/N([1-5])/i);
  if (m) return 6 - Number(m[1]);
  if (/ビジネス|流暢|fluent/i.test(s)) return 4;
  if (/日常会話/.test(s)) return 2;
  return 0;
}

function englishRank(s = '') {
  const t = s.match(/TOEIC\s*(\d{3})/i);
  if (t) return Number(t[1]) >= 860 ? 4 : Number(t[1]) >= 730 ? 3 : Number(t[1]) >= 600 ? 2 : 1;
  if (/ネイティブ|native/i.test(s)) return 5;
  if (/ビジネス|business|流暢|fluent/i.test(s)) return 3;
  if (/日常会話|読み書き|conversational/i.test(s)) return 2;
  return 0;
}

function requiredEnglish(s = '') {
  if (!s || /不問|不要|none/i.test(s)) return 0;
  if (/ネイティブ|native/i.test(s)) return 5;
  if (/ビジネス|business/i.test(s)) return 3;
  if (/日常会話|読み書き/.test(s)) return 2;
  return englishRank(s);
}

export function matchScore(candidate, job) {
  const has = new Map((candidate.skills || []).map((s) => [s.id, s]));
  const candCats = new Map();
  for (const s of candidate.skills || []) {
    const cat = SKILL_BY_ID[s.id]?.cat;
    if (cat) candCats.set(cat, [...(candCats.get(cat) || []), s.id]);
  }

  const matched = [];
  const partial = [];
  const missing = [];
  let reqScore = 0;
  const reqs = job.required || [];
  for (const r of reqs) {
    const c = has.get(r.id);
    if (c) {
      const ratio = Math.min(1, (c.level || 3) / (r.level || 3));
      reqScore += ratio;
      (ratio >= 1 ? matched : partial).push({ id: r.id, name: skillName(r.id), have: c.level, need: r.level });
    } else {
      // 同カテゴリの近接スキル（例: Vue.js 経験 → React 要件）は部分点
      const cat = SKILL_BY_ID[r.id]?.cat;
      const near = cat && candCats.get(cat)?.find((id) => id !== r.id);
      if (near) {
        reqScore += 0.3;
        partial.push({ id: r.id, name: skillName(r.id), have: 0, need: r.level, via: skillName(near) });
      } else missing.push({ id: r.id, name: skillName(r.id), need: r.level });
    }
  }
  const reqRatio = reqs.length ? reqScore / reqs.length : 1;
  const prefs = job.preferred || [];
  const prefHit = prefs.filter((id) => has.has(id));
  const prefRatio = prefs.length ? prefHit.length / prefs.length : 0;
  const skills = Math.min(1, reqRatio * 0.85 + prefRatio * 0.15);

  const years = Number(candidate.years || 0);
  const minYears = Number(job.minYears || 0);
  const experience = minYears ? Math.min(1, years / minYears) : 1;

  let salary = 1;
  const desired = Number(candidate.desiredSalary || 0);
  if (desired && job.salaryMax) {
    if (desired > job.salaryMax) salary = Math.max(0, 1 - ((desired - job.salaryMax) / job.salaryMax) * 3);
    else if (job.salaryMin && desired < job.salaryMin * 0.8) salary = 0.85; // 希望が低すぎる場合はミスマッチの兆候
  }

  const remoteFit = REMOTE_FIT[candidate.remote || 'any']?.[job.remote || 'hybrid'] ?? 1;
  const locFit = !candidate.location || !job.location || job.remote === 'full' || candidate.location === job.location ? 1 : 0.6;
  const workstyle = remoteFit * 0.7 + locFit * 0.3;

  const jaNeed = jlptRank(job.languages?.japanese);
  const enNeed = requiredEnglish(job.languages?.english);
  const jaHave = jlptRank(candidate.languages?.japanese) || (candidate.languages?.japanese ? 3 : 6);
  const enHave = englishRank(candidate.languages?.english);
  const ja = jaNeed ? Math.min(1, jaHave / jaNeed) : 1;
  const en = enNeed ? Math.min(1, enHave / enNeed) : 1;
  const language = (ja + en) / 2;

  const breakdown = { skills, experience, salary, workstyle, language };
  let total = Object.entries(WEIGHTS).reduce((sum, [k, w]) => sum + breakdown[k] * w, 0);
  const roleFit = (candidate.desiredRoles || []).includes(job.roleId);
  if (roleFit) total = Math.min(1, total + 0.03);
  // 必須スキルの過半が欠けている場合は上限を設ける
  if (reqs.length && missing.length / reqs.length > 0.5) total = Math.min(total, 0.45);

  const reasons = [];
  if (matched.length) reasons.push(`必須スキル ${matched.map((m) => m.name).join('・')} を満たしています`);
  if (prefHit.length) reasons.push(`歓迎スキル ${prefHit.map(skillName).join('・')} を保有`);
  if (roleFit) reasons.push('希望職種と一致');
  if (experience < 1) reasons.push(`経験年数が要件（${minYears}年）に対し ${years}年`);
  if (salary < 1 && desired > (job.salaryMax || 0)) reasons.push(`希望年収 ${desired}万円 が上限 ${job.salaryMax}万円 を超過`);
  if (remoteFit < 0.6) reasons.push('働き方（リモート可否）の希望に差があります');

  return {
    total: Math.round(total * 100),
    breakdown: Object.fromEntries(Object.entries(breakdown).map(([k, v]) => [k, Math.round(v * 100)])),
    matched, partial, missing,
    preferredHit: prefHit.map((id) => ({ id, name: skillName(id) })),
    reasons,
  };
}

export function rankJobsFor(candidate, jobs, limit = 50) {
  return jobs
    .map((job) => ({ job, match: matchScore(candidate, job) }))
    .sort((a, b) => b.match.total - a.match.total)
    .slice(0, limit);
}

export function rankCandidatesFor(job, candidates, limit = 50) {
  return candidates
    .map((candidate) => ({ candidate, match: matchScore(candidate, job) }))
    .sort((a, b) => b.match.total - a.match.total)
    .slice(0, limit);
}

export function scoreLabel(total) {
  if (total >= 85) return { label: '非常に高い', color: '#16a34a' };
  if (total >= 70) return { label: '高い', color: '#2563eb' };
  if (total >= 55) return { label: '検討の余地あり', color: '#d97706' };
  return { label: '低い', color: '#6b7280' };
}
