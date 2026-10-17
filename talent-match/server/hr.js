// 企業向け 人的リソース管理: スキルマトリクス・稼働状況・プロジェクトアサイン提案・採用/育成提案・離職リスク。
import { SKILL_BY_ID, skillName } from './data/skills.js';
import { ROLE_BY_ID, levelFromYears } from './data/roles.js';
import { roleSalaryBands } from './market.js';
import { allTemplates } from './templates.js';

export function skillMatrix(employees) {
  const counts = new Map();
  for (const e of employees) for (const s of e.skills || []) counts.set(s.id, (counts.get(s.id) || 0) + 1);
  const skills = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([id]) => ({ id, name: skillName(id), cat: SKILL_BY_ID[id]?.cat }));
  const rows = employees.map((e) => {
    const m = new Map((e.skills || []).map((s) => [s.id, s.level]));
    return { id: e.id, name: e.name, role: ROLE_BY_ID[e.roleId]?.name || e.roleId, levels: skills.map((s) => m.get(s.id) || 0) };
  });
  // スキルごとの「バス係数」（Lv3以上の人数）。1以下は属人化リスク
  const bus = skills.map((s, i) => ({ ...s, experts: rows.filter((r) => r.levels[i] >= 3).length }));
  return { skills, rows, bus, risks: bus.filter((b) => b.experts <= 1) };
}

function fitForProject(emp, project) {
  const m = new Map((emp.skills || []).map((s) => [s.id, s.level]));
  const req = project.requiredSkills || [];
  if (!req.length) return 0;
  const s = req.reduce((sum, r) => sum + Math.min(1, (m.get(r.id) || 0) / (r.level || 3)), 0) / req.length;
  return Math.round(s * 100);
}

export function projectStaffing(employees, projects) {
  return projects.map((p) => {
    const members = employees.filter((e) => e.projectId === p.id);
    const capacity = employees.filter((e) => (e.utilization || 0) < 80 && e.projectId !== p.id);
    const candidates = capacity
      .map((e) => ({ id: e.id, name: e.name, fit: fitForProject(e, p), utilization: e.utilization || 0 }))
      .filter((c) => c.fit >= 40)
      .sort((a, b) => b.fit - a.fit || a.utilization - b.utilization)
      .slice(0, 5);
    const gaps = (p.requiredSkills || []).filter((r) => !members.some((e) => (e.skills || []).some((s) => s.id === r.id && s.level >= (r.level || 3))))
      .map((r) => ({ id: r.id, name: skillName(r.id), level: r.level }));
    return {
      id: p.id, name: p.name, status: p.status, start: p.start, end: p.end, headcount: p.headcount,
      members: members.map((e) => ({ id: e.id, name: e.name, fit: fitForProject(e, p) })),
      shortage: Math.max(0, (p.headcount || 0) - members.length),
      gaps, candidates,
    };
  });
}

export function attritionRisk(emp, bands) {
  const reasons = [];
  let risk = 0;
  if ((emp.engagement ?? 70) < 50) { risk += 35; reasons.push('エンゲージメントスコアが低い'); }
  if ((emp.utilization ?? 0) > 110) { risk += 25; reasons.push('稼働率が110%を超過（過負荷）'); }
  const band = bands[emp.roleId]?.levels[levelFromYears(emp.years || 0)];
  if (band && emp.salary && emp.salary < band.p25) { risk += 25; reasons.push(`年収が市場相場（P25: ${band.p25}万円）を下回る`); }
  const months = emp.lastRaiseAt ? (Date.now() - new Date(emp.lastRaiseAt).getTime()) / (30 * 864e5) : 0;
  if (months > 24) { risk += 15; reasons.push('2年以上昇給なし'); }
  return { score: Math.min(100, risk), level: risk >= 50 ? '高' : risk >= 25 ? '中' : '低', reasons };
}

export function hrDashboard(store, companyId) {
  const employees = store.all('employees', { companyId });
  const projects = store.all('projects', { companyId });
  const bands = Object.fromEntries(roleSalaryBands(store).map((b) => [b.id, b]));
  const matrix = skillMatrix(employees);
  const staffing = projectStaffing(employees, projects);
  const util = employees.map((e) => e.utilization || 0);
  const avgUtil = util.length ? Math.round(util.reduce((a, b) => a + b, 0) / util.length) : 0;
  const people = employees.map((e) => ({ ...e, roleName: ROLE_BY_ID[e.roleId]?.name || e.roleId, risk: attritionRisk(e, bands) }));
  const byRole = {};
  for (const e of people) byRole[e.roleName] = (byRole[e.roleName] || 0) + 1;

  // 不足スキル → 「育成で埋める」か「採用で埋める」かの提案
  const gapCount = new Map();
  for (const p of staffing) for (const g of p.gaps) gapCount.set(g.id, (gapCount.get(g.id) || 0) + 1);
  const { jobs: jobTemplates } = allTemplates();
  const actions = [...gapCount.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => {
    const growable = people.filter((e) => (e.skills || []).some((s) => s.id === id && s.level >= 1 && s.level < 3));
    const tmpl = jobTemplates.find((t) => t.job.required.some((r) => r.id === id));
    return {
      skill: skillName(id), projects: n,
      plan: growable.length ? 'upskill' : 'hire',
      detail: growable.length ? `${growable.map((e) => e.name).slice(0, 3).join('・')} を育成（現Lv1-2）` : '社内に候補がいないため採用を推奨',
      templateId: growable.length ? null : tmpl?.id,
    };
  });

  return {
    summary: {
      headcount: employees.length,
      avgUtilization: avgUtil,
      overloaded: people.filter((e) => (e.utilization || 0) > 100).length,
      bench: people.filter((e) => (e.utilization || 0) < 50).length,
      highRisk: people.filter((e) => e.risk.level === '高').length,
      openProjects: projects.filter((p) => p.status !== 'done').length,
    },
    byRole, matrix, staffing, people, actions,
  };
}
