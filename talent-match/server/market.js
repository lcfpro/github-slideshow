// 人材市場の動態分析。プラットフォーム内の求人・応募者データと、月次スナップショット（marketHistory）を集計する。
import { SKILLS, SKILL_BY_ID, skillName } from './data/skills.js';
import { ROLES, ROLE_BY_ID, LEVELS, levelFromYears } from './data/roles.js';
import { matchScore } from './matching.js';

function quantile(arr, q) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return Math.round(s[lo] + (s[hi] - s[lo]) * (pos - lo));
}

export function skillDemandSupply(store) {
  const jobs = store.all('jobs').filter((j) => j.status !== 'closed');
  const cands = store.all('candidates').filter((c) => c.status === 'published');
  const rows = SKILLS.map((s) => {
    const req = jobs.filter((j) => j.required?.some((r) => r.id === s.id)).length;
    const pref = jobs.filter((j) => j.preferred?.includes(s.id)).length;
    const supply = cands.filter((c) => c.skills?.some((x) => x.id === s.id)).length;
    const demand = req + pref * 0.5;
    const ratio = demand / Math.max(1, supply);
    return {
      id: s.id, name: s.name, cat: s.cat,
      demand: Math.round(demand * 10) / 10, supply,
      ratio: Math.round(ratio * 100) / 100,
      growth: s.growth,
      // 市場全体の需要指標（辞書の外部指標 6割 + プラットフォーム内の需給 4割）
      heat: Math.round(s.demand * 0.6 + Math.min(100, ratio * 40) * 0.4),
    };
  });
  return rows.sort((a, b) => b.heat - a.heat);
}

export function roleSalaryBands(store) {
  const jobs = store.all('jobs');
  return ROLES.map((r) => {
    const levels = {};
    for (const lv of LEVELS) {
      const mids = jobs.filter((j) => j.roleId === r.id && j.level === lv.id && j.salaryMin && j.salaryMax).map((j) => (j.salaryMin + j.salaryMax) / 2);
      const [lo, hi] = r.salary[lv.id];
      const pool = mids.length >= 3 ? mids : [...mids, lo, (lo + hi) / 2, hi];
      levels[lv.id] = { p25: quantile(pool, 0.25), median: quantile(pool, 0.5), p75: quantile(pool, 0.75), samples: mids.length };
    }
    const openJobs = jobs.filter((j) => j.roleId === r.id && j.status !== 'closed').length;
    const cands = store.all('candidates').filter((c) => c.status === 'published' && c.desiredRoles?.includes(r.id)).length;
    return { id: r.id, name: r.name, icon: r.icon, levels, openJobs, candidates: cands, ratio: Math.round((openJobs / Math.max(1, cands)) * 100) / 100 };
  });
}

export function trends(store, skillIds) {
  const hist = store.all('marketHistory').sort((a, b) => a.month.localeCompare(b.month));
  // 既定は「伸びている技術」と「縮小傾向の技術」の対比が見える組み合わせ
  const ids = skillIds?.length ? skillIds.slice(0, 8) : ['llm', 'typescript', 'kubernetes', 'java', 'php'];
  return {
    months: hist.map((h) => h.month),
    series: ids.map((id) => ({ id, name: skillName(id), values: hist.map((h) => h.skills?.[id]?.postings ?? 0) })),
    salary: hist.map((h) => h.avgSalary),
    jobsTotal: hist.map((h) => h.jobsTotal),
    candidatesTotal: hist.map((h) => h.candidatesTotal),
  };
}

export function overview(store) {
  const jobs = store.all('jobs').filter((j) => j.status !== 'closed');
  const cands = store.all('candidates').filter((c) => c.status === 'published');
  const remote = { full: 0, hybrid: 0, onsite: 0 };
  for (const j of jobs) remote[j.remote || 'hybrid']++;
  const mids = jobs.filter((j) => j.salaryMax).map((j) => (j.salaryMin + j.salaryMax) / 2);
  return {
    jobs: jobs.length,
    candidates: cands.length,
    jobsPerCandidate: Math.round((jobs.length / Math.max(1, cands.length)) * 100) / 100,
    medianSalary: quantile(mids, 0.5),
    remote,
    hotSkills: skillDemandSupply(store).slice(0, 10),
    risingSkills: [...SKILLS].sort((a, b) => b.growth - a.growth).slice(0, 8).map((s) => ({ id: s.id, name: s.name, growth: s.growth })),
  };
}

/** 企業向け: 自社求人の市場競争力と、狙える人材プールの大きさ。 */
export function companyInsights(store, companyId) {
  const bands = Object.fromEntries(roleSalaryBands(store).map((b) => [b.id, b]));
  const supply = Object.fromEntries(skillDemandSupply(store).map((s) => [s.id, s]));
  const cands = store.all('candidates').filter((c) => c.status === 'published');
  const jobs = store.all('jobs').filter((j) => j.companyId === companyId);
  return jobs.map((j) => {
    const band = bands[j.roleId]?.levels[j.level];
    const mid = j.salaryMax ? (j.salaryMin + j.salaryMax) / 2 : null;
    const pos = band && mid ? (mid >= band.p75 ? '市場上位' : mid >= band.median ? '市場平均以上' : mid >= band.p25 ? '市場平均やや下' : '市場水準以下') : '不明';
    const scores = cands.map((c) => matchScore(c, j).total);
    const scarce = (j.required || []).map((r) => supply[r.id]).filter(Boolean).filter((s) => s.ratio >= 1).map((s) => ({ name: s.name, ratio: s.ratio }));
    const tips = [];
    if (pos === '市場水準以下' || pos === '市場平均やや下') tips.push(`年収レンジの中央値を ${band.median}万円 付近まで引き上げると応募者層が広がります`);
    if (scarce.length) tips.push(`${scarce.map((s) => s.name).join('・')} は需要超過のため、必須→歓迎への緩和や育成前提の採用を検討してください`);
    if (j.remote === 'onsite') tips.push('リモート可の求人が多数のため、週数日のリモート導入で母集団が増える可能性があります');
    if ((j.required || []).length > 5) tips.push('必須要件が多いと応募が減ります。本当に必須な3〜4項目に絞りましょう');
    return {
      jobId: j.id, title: j.title, salaryPosition: pos, band, mid,
      pool: { strong: scores.filter((s) => s >= 70).length, possible: scores.filter((s) => s >= 55 && s < 70).length, total: cands.length },
      scarce, tips,
    };
  });
}

/** 応募者向け: 市場価値（想定年収）とポジション。 */
export function candidateValue(store, candidate) {
  const roleId = candidate.desiredRoles?.[0] || 'backend';
  const role = ROLE_BY_ID[roleId] || ROLES[0];
  const level = levelFromYears(Number(candidate.years || 0));
  const band = roleSalaryBands(store).find((b) => b.id === role.id).levels[level];
  const heat = Object.fromEntries(skillDemandSupply(store).map((s) => [s.id, s]));
  const skillIds = (candidate.skills || []).map((s) => s.id);
  // 需要の高いスキルを高レベルで保有しているほどプレミアム
  const premium = (candidate.skills || []).reduce((sum, s) => {
    const h = heat[s.id]?.heat || 50;
    return sum + (h >= 80 ? 1.5 : h >= 70 ? 0.8 : 0.2) * ((s.level || 3) / 5);
  }, 0);
  const factor = 1 + Math.min(0.25, premium / 40);
  const est = { low: Math.round(band.p25 * factor), mid: Math.round(band.median * factor), high: Math.round(band.p75 * factor) };
  const jobs = store.all('jobs').filter((j) => j.status !== 'closed');
  const scores = jobs.map((j) => matchScore(candidate, j).total);
  const peers = store.all('candidates').filter((c) => c.status === 'published' && c.id !== candidate.id && c.desiredRoles?.includes(role.id));
  const better = peers.filter((p) => (p.skills?.length || 0) * (Number(p.years) || 0) > skillIds.length * Number(candidate.years || 0)).length;
  return {
    role: { id: role.id, name: role.name }, level, estimate: est, band,
    matchingJobs: { strong: scores.filter((s) => s >= 70).length, possible: scores.filter((s) => s >= 55 && s < 70).length, total: jobs.length },
    topPercent: peers.length ? Math.max(1, Math.round(((better + 1) / (peers.length + 1)) * 100)) : null,
    hotOwned: skillIds.map((id) => heat[id]).filter(Boolean).sort((a, b) => b.heat - a.heat).slice(0, 5),
  };
}

export function skillCategoryHeat(store) {
  const rows = skillDemandSupply(store);
  const cats = {};
  for (const r of rows) {
    cats[r.cat] = cats[r.cat] || { cat: r.cat, demand: 0, supply: 0, skills: 0, heat: 0 };
    cats[r.cat].demand += r.demand;
    cats[r.cat].supply += r.supply;
    cats[r.cat].skills++;
    cats[r.cat].heat += r.heat;
  }
  return Object.values(cats).map((c) => ({ ...c, heat: Math.round(c.heat / c.skills) })).sort((a, b) => b.heat - a.heat);
}

export { SKILL_BY_ID };
