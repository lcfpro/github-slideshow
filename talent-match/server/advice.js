// 面談アドバイス（企業向け）・面談準備（応募者向け）・スキル習得アドバイス・模擬面接の採点。
// ルールベースで常に結果を返し、Claude が有効な場合は要約と質問を補強する。
import { SKILL_BY_ID, LEARNING_PATHS, skillName } from './data/skills.js';
import { ROLE_BY_ID, ROLES, levelFromYears } from './data/roles.js';
import { matchScore } from './matching.js';
import { skillDemandSupply, roleSalaryBands } from './market.js';
import { structured, aiEnabled, ADVICE_SCHEMA, ANSWER_SCHEMA } from './ai.js';

const BEHAVIORAL = [
  { q: 'これまでで最も困難だったプロジェクトと、その乗り越え方を教えてください。', intent: '課題解決力・粘り強さ' },
  { q: 'チーム内で意見が対立した際、どのように対応しましたか？', intent: '協調性・コミュニケーション' },
  { q: '直近で自主的に学んだ技術と、その理由を教えてください。', intent: '学習意欲・技術への関心' },
  { q: '失敗から学んだ経験を一つ教えてください。', intent: '内省力・誠実さ' },
];

function candidateBrief(c) {
  return {
    years: c.years, desiredSalary: c.desiredSalary, remote: c.remote, location: c.location,
    skills: (c.skills || []).map((s) => `${skillName(s.id)}(Lv${s.level})`),
    experiences: (c.experiences || []).map((e) => `${e.period} ${e.company} ${e.role}: ${e.description}`),
    summary: c.summary,
  };
}

function jobBrief(j) {
  return {
    title: j.title, minYears: j.minYears, salary: `${j.salaryMin}-${j.salaryMax}万円`, remote: j.remote,
    required: (j.required || []).map((r) => `${skillName(r.id)}(Lv${r.level})`), preferred: (j.preferred || []).map(skillName), duties: j.duties,
  };
}

/** 企業向け: 応募者ごとの面談アドバイス */
export async function interviewAdviceForCompany(job, candidate) {
  const m = matchScore(candidate, job);
  const role = ROLE_BY_ID[job.roleId];
  const strengths = m.matched.filter((x) => x.have >= 4).map((x) => ({
    title: `${x.name}（Lv${x.have}）`,
    q: `${x.name} を使った開発で、設計判断に最も悩んだ場面と、その結論に至った根拠を教えてください。`,
    look: '技術選定の根拠・トレードオフの説明ができるか、再現性のある成果か',
  }));
  const gaps = [
    ...m.missing.map((x) => ({ title: `${x.name}（未経験）`, q: `${x.name} は未経験とのことですが、近い技術の経験や、キャッチアップの計画はありますか？`, look: '類似経験の有無・学習速度・入社後の立ち上がり期間の見積り' })),
    ...m.partial.map((x) => ({ title: `${x.name}（${x.via ? `${x.via}経験で代替` : `Lv${x.have}/要求Lv${x.need}`}）`, q: `${x.name} について、実務でどの範囲まで担当しましたか？${x.via ? `${x.via} との違いをどう理解していますか？` : ''}`, look: '担当範囲の深さ（実装のみ／設計まで／運用まで）' })),
  ];
  const conditions = [];
  if (candidate.desiredSalary && job.salaryMax && candidate.desiredSalary > job.salaryMax) conditions.push(`希望年収 ${candidate.desiredSalary}万円 が上限 ${job.salaryMax}万円 を超えています。評価制度・昇給実績・SO/賞与など総報酬で説明を準備しましょう。`);
  if (candidate.remote === 'full' && job.remote !== 'full') conditions.push('応募者はフルリモートを希望しています。出社頻度とその理由を具体的に伝えましょう。');
  if (Number(candidate.years || 0) < Number(job.minYears || 0)) conditions.push(`経験年数（${candidate.years}年）が要件（${job.minYears}年）未満です。年数より成果の密度で判断しましょう。`);
  const exps = candidate.experiences || [];
  const flags = [];
  if (exps.length >= 4 && Number(candidate.years || 0) / exps.length < 1.5) flags.push('在籍期間が短い職歴が複数あります。転職理由を前向きに確認しましょう（決めつけは禁物）。');
  if (!exps.length) flags.push('職務経歴の記載が少ないため、具体的なプロジェクト内容を深掘りしましょう。');
  const attract = [];
  if (m.missing.length) attract.push(`入社後に ${m.missing.map((x) => x.name).join('・')} を習得できる環境は、成長意欲のある候補者への訴求点になります。`);
  if (job.remote === 'full' || job.remote === 'hybrid') attract.push('柔軟な働き方を具体例（チームの1週間など）で伝えると効果的です。');
  if (job.benefits?.length) attract.push(`福利厚生のうち「${job.benefits.slice(0, 2).join('」「')}」を強調しましょう。`);
  const rubric = [
    { name: '技術力（必須スキル）', weight: 35, guide: '設計意図・トレードオフを説明できる＝4以上' },
    { name: '問題解決力', weight: 20, guide: '課題→仮説→行動→結果を定量的に語れる' },
    { name: 'コミュニケーション', weight: 20, guide: '相手に合わせた説明・質問への的確な回答' },
    { name: 'カルチャーフィット', weight: 15, guide: '価値観・働き方の希望が組織と合うか' },
    { name: '成長性', weight: 10, guide: '学習習慣・キャッチアップ実績' },
  ];
  const questions = [
    ...(role?.questions || []).map((q) => ({ q, intent: `${role.name}としての実務力` })),
    ...strengths.slice(0, 2).map((s) => ({ q: s.q, intent: '強みの再現性の確認' })),
    ...gaps.slice(0, 3).map((g) => ({ q: g.q, intent: 'ギャップの把握' })),
    BEHAVIORAL[0], BEHAVIORAL[1],
  ];
  const result = {
    match: m,
    summary: `マッチ度 ${m.total}点。${m.matched.length ? `${m.matched.map((x) => x.name).join('・')} は要件を満たしています。` : ''}${m.missing.length ? `${m.missing.map((x) => x.name).join('・')} が未経験のため、面談で類似経験と学習意欲を確認しましょう。` : '必須要件の欠落はありません。'}`,
    timeline: [
      { min: '0-5分', what: 'アイスブレイク・会社紹介（訴求ポイントを先に伝える）' },
      { min: '5-25分', what: '経歴深掘り（強みの再現性 → ギャップの確認）' },
      { min: '25-40分', what: '技術質問・ケース（必要に応じてライブコーディング/設計課題）' },
      { min: '40-50分', what: '条件のすり合わせ・逆質問' },
      { min: '50-60分', what: '次のステップの案内' },
    ],
    strengths, gaps, conditions, flags, attract, rubric, questions,
    ng: ['年齢・家族構成・出身地・宗教など職務と無関係な質問は避ける', '結婚・出産の予定を尋ねない', '前職の機密情報を求めない'],
    engine: 'rules',
  };
  if (aiEnabled()) {
    const ai = await structured({
      system: 'あなたはIT企業の採用面接官トレーナーです。公正で職務に関連する質問のみを提案し、差別的・職務と無関係な質問は絶対に含めません。日本語で回答します。',
      content: [{ type: 'text', text: `次の求人と候補者について、面接官向けアドバイスを作成してください。\n求人: ${JSON.stringify(jobBrief(job))}\n候補者: ${JSON.stringify(candidateBrief(candidate))}\nマッチ分析: ${JSON.stringify({ total: m.total, missing: m.missing.map((x) => x.name), partial: m.partial.map((x) => x.name) })}\nsummary: 3文程度、points: 面接で確認すべき重要ポイント5つ、questions: 候補者固有の深掘り質問5つ（intent に評価観点）。` }],
      schema: ADVICE_SCHEMA,
    });
    if (ai) Object.assign(result, { summary: ai.summary, aiPoints: ai.points, questions: [...ai.questions, ...result.questions.slice(0, 4)], engine: 'claude' });
  }
  return result;
}

/** 応募者向け: 面談前の準備アドバイス */
export async function prepAdviceForCandidate(candidate, job, store) {
  const m = matchScore(candidate, job);
  const role = ROLE_BY_ID[job.roleId];
  const level = job.level || levelFromYears(Number(candidate.years || 0));
  const band = store ? roleSalaryBands(store).find((b) => b.id === job.roleId)?.levels[level] : null;
  const exps = candidate.experiences || [];
  const stories = exps.slice(0, 3).map((e) => ({
    title: `${e.company}：${e.role || 'プロジェクト'}`,
    star: {
      S: `${e.period} のプロジェクト背景（規模・チーム人数・事業上の目的）`,
      T: 'あなたに求められた役割・課題（数値目標があれば）',
      A: `具体的に取った行動（${(e.skills || []).map(skillName).slice(0, 3).join('・') || '使用技術'}をどう使ったか）`,
      R: '成果を数字で（例: 処理時間 40%短縮、障害件数 半減）＋学び',
    },
  }));
  const likely = [
    { q: '自己紹介と、これまでの経歴を2分程度でお願いします。', tip: '直近の経験→強み→この求人で活かせる点の順に。2分で収める練習を。' },
    { q: '転職を考えた理由を教えてください。', tip: '不満ではなく「実現したいこと」を軸に。前職の批判は避ける。' },
    { q: `なぜ${job.title || 'このポジション'}に応募しましたか？`, tip: `求人の業務内容「${job.duties?.[0] || ''}」と自分の経験の接点を具体的に。` },
    ...(role?.questions || []).map((q) => ({ q, tip: 'STAR形式（状況・課題・行動・結果）で、数字を交えて回答。' })),
    ...m.matched.slice(0, 2).map((x) => ({ q: `${x.name} の経験について詳しく教えてください。`, tip: '使ったバージョン・規模・自分の担当範囲・工夫点を準備。' })),
    ...m.missing.slice(0, 2).map((x) => ({ q: `${x.name} の経験はありますか？`, tip: `未経験なら正直に。類似経験と「入社までに◯◯で学習中」と具体策を添える。` })),
    ...BEHAVIORAL.slice(0, 3).map((b) => ({ q: b.q, tip: `評価観点: ${b.intent}` })),
  ];
  const brushUp = [...m.missing, ...m.partial].map((x) => {
    const s = SKILL_BY_ID[x.id];
    return { name: x.name, quick: `面接までに: 公式チュートリアルで基本を押さえ、${s ? `「${(LEARNING_PATHS[s.cat] || [])[0] || '小さなサンプル作成'}」` : '小さなサンプル作成'}を実施して話せるネタを作る`, hours: s ? Math.min(10, Math.round(s.hours / 15)) : 5 };
  });
  const reverse = [
    '入社後3ヶ月で期待される成果は何ですか？',
    'チームの開発プロセス（レビュー・リリース頻度）を教えてください。',
    `技術的負債や、${role?.name || 'このポジション'}が今最も解決したい課題は何ですか？`,
    '評価制度と、昇給・昇格のモデルケースを教えてください。',
  ];
  const negotiation = [];
  if (band) negotiation.push(`この職種・レベルの市場相場は ${band.p25}〜${band.p75}万円（中央値 ${band.median}万円）です。`);
  if (candidate.desiredSalary && job.salaryMax && candidate.desiredSalary > job.salaryMax) negotiation.push(`希望 ${candidate.desiredSalary}万円 は求人上限 ${job.salaryMax}万円 を超えます。総報酬（賞与・SO）や入社後の昇給条件も含めて交渉しましょう。`);
  else negotiation.push('希望年収は「現年収・市場相場・提供できる価値」の3点を根拠に伝えましょう。');
  const result = {
    match: m,
    summary: `マッチ度 ${m.total}点。${m.matched.length ? `強み: ${m.matched.map((x) => x.name).join('・')}。` : ''}${m.missing.length ? `補強ポイント: ${m.missing.map((x) => x.name).join('・')}。` : ''}`,
    likely, stories, brushUp, reverse, negotiation,
    checklist: ['企業のプロダクトを実際に触る／技術ブログを読む', '職務経歴書の内容を自分の言葉で説明できるか確認', 'オンラインの場合: カメラ・マイク・背景・回線を事前チェック', '逆質問を3つ以上準備', '模擬面接ルームで本番形式の練習をする'],
    engine: 'rules',
  };
  if (aiEnabled()) {
    const ai = await structured({
      system: 'あなたはIT業界専門のキャリアアドバイザーです。応募者の面接準備を、具体的かつ前向きに支援します。日本語で回答します。',
      content: [{ type: 'text', text: `次の求人に応募する候補者の面接準備アドバイスを作成してください。\n求人: ${JSON.stringify(jobBrief(job))}\n候補者: ${JSON.stringify(candidateBrief(candidate))}\nsummary: 3文程度、points: 準備すべきこと5つ、questions: 想定質問5つ（intent に回答のコツ）。` }],
      schema: ADVICE_SCHEMA,
    });
    if (ai) Object.assign(result, { summary: ai.summary, aiPoints: ai.points, likely: [...ai.questions.map((x) => ({ q: x.q, tip: x.intent })), ...likely], engine: 'claude' });
  }
  return result;
}

/** 応募者向け: 身につけるべきスキル */
export function skillAdvice(candidate, store, targetRoleId) {
  const heat = Object.fromEntries(skillDemandSupply(store).map((s) => [s.id, s]));
  const has = new Map((candidate.skills || []).map((s) => [s.id, s]));
  const targets = targetRoleId ? [ROLE_BY_ID[targetRoleId]].filter(Boolean) : (candidate.desiredRoles || []).map((id) => ROLE_BY_ID[id]).filter(Boolean);
  if (!targets.length) targets.push(ROLES[1]);
  const bands = Object.fromEntries(roleSalaryBands(store).map((b) => [b.id, b]));
  const level = levelFromYears(Number(candidate.years || 0));
  const nextLevel = level === 'junior' ? 'middle' : 'senior';

  const roles = targets.map((role) => {
    const reqGaps = role.required.filter((id) => !has.has(id) || has.get(id).level < 3);
    const anyGap = role.anyOf && !role.anyOf.some((id) => has.has(id)) ? [[...role.anyOf].sort((a, b) => (heat[b]?.heat || 0) - (heat[a]?.heat || 0))[0]] : [];
    const prefGaps = role.preferred.filter((id) => !has.has(id));
    const items = [
      ...[...reqGaps, ...anyGap].map((id) => ({ id, kind: '必須' })),
      ...prefGaps.map((id) => ({ id, kind: '歓迎' })),
    ].map(({ id, kind }) => {
      const s = SKILL_BY_ID[id];
      const h = heat[id];
      const current = has.get(id)?.level || 0;
      // 優先度 = 区分の重み × 市場ヒート × 成長率補正 ÷ 学習コスト
      const priority = (kind === '必須' ? 2 : 1) * (h?.heat || s.demand) * (1 + s.growth / 100) / Math.sqrt(s.hours);
      return {
        id, name: s.name, cat: s.cat, kind, current, heat: h?.heat || s.demand, growth: s.growth, hours: s.hours,
        priority: Math.round(priority * 10) / 10,
        path: LEARNING_PATHS[s.cat] || [],
      };
    }).sort((a, b) => b.priority - a.priority);
    const coverage = Math.round(((role.required.length - reqGaps.length) / role.required.length) * 100);
    const b = bands[role.id].levels;
    return {
      role: { id: role.id, name: role.name, icon: role.icon },
      coverage, items,
      salaryNow: b[level], salaryNext: b[nextLevel],
      uplift: Math.max(0, (b[nextLevel]?.median || 0) - (b[level]?.median || 0)),
    };
  });

  // 現スキルの隣接トレンド（同カテゴリで成長率の高いもの）
  const ownedCats = new Set([...has.keys()].map((id) => SKILL_BY_ID[id]?.cat));
  const trending = Object.values(SKILL_BY_ID)
    .filter((s) => !has.has(s.id) && (ownedCats.has(s.cat) || s.growth >= 15))
    .sort((a, b) => b.growth - a.growth)
    .slice(0, 6)
    .map((s) => ({ id: s.id, name: s.name, growth: s.growth, cat: s.cat }));

  // 12週間の学習プラン（優先度上位から週あたり10時間想定で割付）
  const plan = [];
  let week = 1;
  for (const it of roles[0].items.slice(0, 4)) {
    const weeks = Math.max(1, Math.min(6, Math.round(Math.min(it.hours, 60) / 10)));
    if (week > 12) break;
    plan.push({ from: week, to: Math.min(12, week + weeks - 1), skill: it.name, goal: it.path[0] || '基礎を学ぶ', output: it.path[1] || '成果物を作る' });
    week += weeks;
  }
  return { level, roles, trending, plan };
}

/** 模擬面接: 回答の採点（ルールベース + 任意で Claude） */
export async function evaluateAnswer(question, answer, context = {}) {
  const a = String(answer || '');
  const len = a.replace(/\s/g, '').length;
  const has = (re) => re.test(a);
  const star = {
    S: has(/(プロジェクト|案件|当時|状況|背景|チーム|規模)/),
    T: has(/(課題|問題|目標|役割|任され|求められ|ミッション)/),
    A: has(/(実施|導入|設計|実装|提案|改善|対応|行い|取り組|しました)/),
    R: has(/(結果|成果|削減|向上|改善され|達成|短縮|増加|%|％|倍)/),
  };
  const numbers = (a.match(/\d+(\.\d+)?\s*(%|％|倍|件|人|名|時間|日|ヶ月|万|秒|ms)/g) || []).length;
  const skills = (context.skills || []).filter((id) => {
    const s = SKILL_BY_ID[id];
    return s && [s.name, ...s.aliases].some((n) => a.toLowerCase().includes(n.toLowerCase()));
  });
  let score = 20;
  score += Math.min(25, len / 8);
  score += Object.values(star).filter(Boolean).length * 10;
  score += Math.min(10, numbers * 5);
  score += Math.min(5, skills.length * 2.5);
  if (len > 600) score -= 10;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const good = [];
  const improve = [];
  if (star.S && star.T) good.push('状況と課題が明確です');
  if (star.A) good.push('自分の行動が具体的に述べられています');
  if (numbers) good.push('数字で成果を示せています');
  if (!star.S) improve.push('冒頭でプロジェクトの背景（規模・目的）を一言添えましょう');
  if (!star.T) improve.push('あなたの役割・課題を明確にしましょう');
  if (!star.R) improve.push('最後に結果と学びで締めくくりましょう');
  if (!numbers) improve.push('成果を数字（%・時間・件数など）で示すと説得力が増します');
  if (len < 80) improve.push('もう少し具体的に（目安: 200〜400文字・1〜2分）');
  if (len > 600) improve.push('長すぎます。要点を3つに絞りましょう');
  const result = { score, star, numbers, good: good.join(' / ') || '回答できました', improve: improve.join(' / ') || '非常に良い回答です', engine: 'rules' };
  if (aiEnabled() && len >= 20) {
    const ai = await structured({
      system: 'あなたはIT企業の面接官です。候補者の回答を公正に評価し、具体的で建設的なフィードバックを日本語で返します。score は 0〜100。',
      content: [{ type: 'text', text: `質問: ${question}\n回答: ${a}\n評価観点: 具体性・論理性（STAR）・成果の定量性・職務との関連性。good に良い点、improve に改善点。` }],
      schema: ANSWER_SCHEMA,
    });
    if (ai) Object.assign(result, { score: Math.max(0, Math.min(100, ai.score)), good: ai.good, improve: ai.improve, engine: 'claude' });
  }
  return result;
}

/** 模擬面接用の質問セット */
export function interviewQuestions(job, candidate) {
  const role = ROLE_BY_ID[job?.roleId] || ROLES[1];
  const m = job && candidate ? matchScore(candidate, job) : null;
  const qs = [
    { q: 'まずは自己紹介をお願いします。', intent: '第一印象・要約力', seconds: 90 },
    ...(role.questions || []).slice(0, 2).map((q) => ({ q, intent: `${role.name}の実務力`, seconds: 120 })),
  ];
  if (m?.matched[0]) qs.push({ q: `${m.matched[0].name} を使った開発で工夫した点を教えてください。`, intent: '強みの深さ', seconds: 120 });
  if (m?.missing[0]) qs.push({ q: `${m.missing[0].name} の経験がない場合、どのようにキャッチアップしますか？`, intent: '学習力', seconds: 90 });
  qs.push({ ...BEHAVIORAL[0], seconds: 120 }, { q: '最後に、何か質問はありますか？', intent: '関心度・準備度', seconds: 60 });
  return { role: role.name, interviewer: { name: '佐藤（技術面接官）', title: `${role.name} チームリード` }, questions: qs };
}
