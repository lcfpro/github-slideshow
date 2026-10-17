// アップロードファイル → テキスト → 構造化プロフィール/求人 の抽出。
// 対応形式: PDF / Word(docx) / Excel(xlsx) / CSV / TXT / Markdown / JSON / HTML / 画像(Claude 有効時)
import path from 'node:path';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { detectSkills, SKILL_BY_ID } from './data/skills.js';
import { PREFECTURES, ROLES } from './data/roles.js';
import { structured, aiEnabled, PROFILE_SCHEMA, JOB_SCHEMA } from './ai.js';

const IMAGE_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
export const SUPPORTED_EXT = ['.pdf', '.docx', '.xlsx', '.csv', '.txt', '.md', '.json', '.html', '.htm', ...Object.keys(IMAGE_TYPES)];

/** ファイルからプレーンテキストを取り出す。画像は text=null で返す。 */
export async function fileToText(buffer, filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.pdf':
      return { ext, text: (await pdfParse(buffer)).text };
    case '.docx':
      return { ext, text: (await mammoth.extractRawText({ buffer })).value };
    case '.xlsx': {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      const lines = [];
      wb.eachSheet((sheet) => {
        lines.push(`# ${sheet.name}`);
        sheet.eachRow((row) => {
          const cells = row.values.slice(1).map((v) => cellText(v)).filter((v) => v !== '');
          if (cells.length) lines.push(cells.join(' : '));
        });
      });
      return { ext, text: lines.join('\n') };
    }
    case '.html':
    case '.htm':
      return { ext, text: buffer.toString('utf8').replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, '').replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ') };
    case '.json': {
      const obj = JSON.parse(buffer.toString('utf8'));
      return { ext, text: flattenJson(obj).join('\n') };
    }
    case '.csv':
      return { ext, text: buffer.toString('utf8').replace(/,/g, ' : ') };
    case '.txt':
    case '.md':
      return { ext, text: buffer.toString('utf8') };
    default:
      if (IMAGE_TYPES[ext]) return { ext, text: null, image: { media_type: IMAGE_TYPES[ext], data: buffer.toString('base64') } };
      throw Object.assign(new Error(`未対応のファイル形式です: ${ext}`), { status: 415 });
  }
}

function cellText(v) {
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map((r) => r.text).join('');
    if (v.text) return String(v.text);
    if (v.result != null) return String(v.result);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
  }
  return String(v).trim();
}

function flattenJson(obj, prefix = '') {
  if (obj == null) return [];
  if (typeof obj !== 'object') return [`${prefix}${obj}`];
  if (Array.isArray(obj)) return obj.flatMap((v) => flattenJson(v, prefix));
  return Object.entries(obj).flatMap(([k, v]) => (typeof v === 'object' ? [`${k}:`, ...flattenJson(v, '  ')] : [`${prefix}${k}: ${v}`]));
}

// ---------- ルールベース抽出 ----------

const toHalf = (s) => s.replace(/[０-９Ａ-Ｚａ-ｚ＠．－＋（）：／]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/　/g, ' ');

function pick(text, re) {
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

function section(text, headings) {
  const lines = text.split(/\r?\n/);
  const hRe = new RegExp(`^[\\s#■□●◆【\\[]*(${headings.join('|')})[】\\]]?\\s*[:：]?\\s*(.*)$`, 'i');
  const anyHeading = /^[\s#]*[■□●◆【\[].{1,20}[】\]]?\s*$|^#{1,3}\s|^(職務要約|職務経歴|自己PR|スキル|資格|学歴|希望条件|必須|歓迎|応募資格|業務内容|福利厚生|待遇|summary|experience|skills|education)\s*[:：]?\s*$/i;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(hRe);
    if (!m) continue;
    const out = m[2] ? [m[2]] : [];
    for (let j = i + 1; j < lines.length && out.join('').length < 600; j++) {
      if (anyHeading.test(lines[j]) && out.length) break;
      if (lines[j].trim()) out.push(lines[j].trim());
    }
    return out.join('\n');
  }
  return '';
}

function yearsFromPeriods(text) {
  const re = /(\d{4})\s*[年/.\-]\s*(\d{1,2})?\s*月?\s*[〜~～\-–—]\s*(現在|現職|至現在|present|now|(\d{4})\s*[年/.\-]\s*(\d{1,2})?)/gi;
  let months = 0;
  let m;
  const now = new Date();
  while ((m = re.exec(text))) {
    const s = Number(m[1]) * 12 + Number(m[2] || 1);
    const e = m[4] ? Number(m[4]) * 12 + Number(m[5] || 12) : now.getFullYear() * 12 + now.getMonth() + 1;
    if (e > s && e - s < 50 * 12) months += e - s;
  }
  return Math.round((months / 12) * 10) / 10;
}

function skillYears(text, id) {
  const s = SKILL_BY_ID[id];
  for (const name of [s.name, ...s.aliases]) {
    const re = new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n\\d]{0,6}(\\d{1,2}(?:\\.\\d)?)\\s*(年|years?|yrs?)`, 'i');
    const m = text.match(re);
    if (m) return Number(m[1]);
  }
  return null;
}

function levelFromSkillYears(y) {
  if (y == null) return 3;
  if (y >= 7) return 5;
  if (y >= 4) return 4;
  if (y >= 2) return 3;
  if (y >= 1) return 2;
  return 1;
}

function parseExperiences(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const exps = [];
  const periodRe = /(\d{4})\s*[年/.\-]\s*(\d{1,2})?\s*月?\s*[〜~～\-–—]\s*(現在|現職|present|\d{4}\s*[年/.\-]\s*\d{0,2}\s*月?)/i;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(periodRe);
    if (!m) continue;
    const ctx = [lines[i], lines[i + 1] || '', lines[i + 2] || ''].join(' ');
    const rest = ctx.replace(m[0], ' ');
    const company = (rest.match(/(株式会社|有限会社|合同会社)\s*[^\s、,（(]+/) || rest.match(/[^\s、,（(\d]+\s*(株式会社|Inc\.?|Co\.,? ?Ltd\.?|LLC)/) || [])[0] || '';
    const descLines = [];
    for (let j = i + 1; j < Math.min(lines.length, i + 5) && !periodRe.test(lines[j]) && !/^[■□●◆【#]/.test(lines[j]); j++) descLines.push(lines[j]);
    const desc = descLines.join(' ');
    exps.push({
      company: company || '（会社名未記載）',
      period: m[0],
      role: (rest.match(/[^\s、,]*(エンジニア|マネージャー|リーダー|コンサルタント|デザイナー|アーキテクト|SE|PG|PM|PL)[^\s、,]*/) || [''])[0],
      description: desc.slice(0, 300),
      skills: detectSkills(desc),
    });
  }
  return exps.slice(0, 10);
}

function guessName(text) {
  const explicit = pick(text, /(?:氏\s*名|名\s*前|name)\s*[:：]?\s*([^\n\d@]{2,30})/i);
  if (explicit) return explicit.replace(/\s*(ふりがな|フリガナ).*/, '').trim();
  const first = text.split(/\r?\n/).map((l) => l.trim()).find((l) => l && l.length <= 20 && !/(職務経歴|履歴書|resume|curriculum|求人|募集)/i.test(l));
  return first || '';
}

export function ruleProfile(raw) {
  const text = toHalf(raw || '');
  const skillsIds = detectSkills(text);
  const explicitYears = Number(pick(text, /(?:経験年数|実務経験|IT経験|エンジニア歴)[^\d]{0,6}(\d{1,2}(?:\.\d)?)\s*年/) || pick(text, /(\d{1,2})\s*(?:年以上の|年の)(?:実務)?経験/) || pick(text, /(\d{1,2})\+?\s*years? of experience/i) || 0);
  const years = explicitYears || yearsFromPeriods(text);
  const salary = Number(pick(text, /希望(?:年収|給与)[^\d]{0,8}(\d{3,4})\s*万/) || 0);
  const toeic = pick(text, /TOEIC[^\d]{0,6}(\d{3})/i);
  const jlpt = pick(text, /(?:JLPT|日本語能力試験)[^N]{0,6}(N[1-5])/i);
  const location = PREFECTURES.find((p) => text.includes(p) || text.includes(p.replace(/[都府県]$/, ''))) || '';
  const certs = [...new Set((text.match(/(基本情報技術者|応用情報技術者|情報処理安全確保支援士|ネットワークスペシャリスト|データベーススペシャリスト|プロジェクトマネージャ試験|システムアーキテクト|AWS認定[^\s、,]*|AWS Certified[^\n,、]*|Google Cloud[^\s、,]*認定[^\s、,]*|PMP|LPIC-?\d?|CCNA|CCNP|CISSP|CKA|CKAD|Azure[^\s、,]*(?:認定|Certified)[^\s、,]*|TOEIC\s*\d{3}点?|G検定|E資格|統計検定\d?級?)/g) || []).map((s) => s.trim()))];
  const summary = section(text, ['職務要約', '自己PR', '自己紹介', 'サマリー', 'summary', 'profile', 'プロフィール']) || text.replace(/\s+/g, ' ').slice(0, 200);
  return {
    name: guessName(text),
    email: pick(text, /([\w.+-]+@[\w-]+\.[\w.-]+)/),
    phone: pick(text, /((?:\+81[-\s]?|0)\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4})/),
    location,
    summary: summary.slice(0, 600),
    years,
    skills: skillsIds.map((id) => {
      const y = skillYears(text, id);
      return { id, level: levelFromSkillYears(y ?? (years ? Math.min(years, 3) : null)), years: y ?? null };
    }),
    experiences: parseExperiences(text),
    certifications: certs,
    education: section(text, ['学歴', 'education']).split('\n')[0] || '',
    desiredSalary: salary || null,
    languages: { japanese: jlpt || ((text.match(/[ぁ-ん]/g) || []).length > 30 ? 'ネイティブ' : ''), english: toeic ? `TOEIC ${toeic}` : /(ビジネス英語|business english|英語.*(ビジネス|堪能|流暢))/i.test(text) ? 'ビジネス' : '' },
    desiredRoles: guessRoles(skillsIds),
  };
}

export function guessRoles(skillIds) {
  const set = new Set(skillIds);
  return ROLES.map((r) => {
    const pool = [...r.required, ...r.preferred];
    const req = r.required.filter((s) => set.has(s)).length / r.required.length;
    const any = r.anyOf ? (r.anyOf.some((s) => set.has(s)) ? 1 : 0) : 1;
    return { id: r.id, score: req * 2 * any + pool.filter((s) => set.has(s)).length / pool.length };
  })
    .filter((x) => x.score > 0.6)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.id);
}

export function ruleJob(raw) {
  const text = toHalf(raw || '');
  const req = section(text, ['必須スキル', '必須要件', '必須条件', '応募資格', '必須', 'required', 'requirements', 'must']);
  const pref = section(text, ['歓迎スキル', '歓迎要件', '歓迎条件', '歓迎', 'preferred', 'nice to have']);
  const reqIds = detectSkills(req || text);
  const prefIds = detectSkills(pref).filter((id) => !reqIds.includes(id));
  const sal = text.match(/(\d{3,4})\s*万円?\s*[〜~～\-–]\s*(\d{3,4})\s*万/);
  const minYears = Number(pick(text, /(?:経験|実務)[^\d\n]{0,10}(\d{1,2})\s*年以上/) || 0);
  const remote = /フルリモート|完全リモート|full[\s-]?remote/i.test(text) ? 'full' : /リモート|在宅|テレワーク|remote|hybrid/i.test(text) ? 'hybrid' : 'onsite';
  const duties = section(text, ['業務内容', '仕事内容', '職務内容', 'responsibilities', 'job description'])
    .split('\n').map((l) => l.replace(/^[・\-*•]\s*/, '').trim()).filter(Boolean).slice(0, 6);
  const benefits = section(text, ['福利厚生', '待遇', '働き方', 'benefits'])
    .split(/\n|、|,/).map((l) => l.replace(/^[・\-*•]\s*/, '').trim()).filter(Boolean).slice(0, 8);
  const title = pick(text, /(?:募集職種|職種|ポジション|position|title)\s*[:：]\s*([^\n]+)/i) || text.split(/\r?\n/).find((l) => l.trim())?.trim().slice(0, 40) || '';
  return {
    title,
    location: PREFECTURES.find((p) => text.includes(p) || text.includes(p.replace(/[都府県]$/, ''))) || '',
    salaryMin: sal ? Number(sal[1]) : null,
    salaryMax: sal ? Number(sal[2]) : null,
    minYears,
    remote,
    required: reqIds.map((id) => ({ id, level: minYears >= 5 ? 4 : 3 })),
    preferred: prefIds,
    duties,
    benefits,
    description: text.replace(/\s+/g, ' ').slice(0, 400),
    languages: {
      japanese: pick(text, /(N[1-5])\s*(?:以上|レベル)/) ? `${pick(text, /(N[1-5])\s*(?:以上|レベル)/)}以上` : '',
      english: /英語[^\n]{0,10}(ビジネス|必須|堪能)|business english/i.test(text) ? 'ビジネスレベル' : '',
    },
    roleId: guessRoles(reqIds.concat(prefIds))[0] || null,
  };
}

// ---------- AI 抽出（任意） ----------

function mapSkillNames(items) {
  const out = new Map();
  const unknown = [];
  for (const it of items) {
    const name = typeof it === 'string' ? it : it.name;
    const ids = detectSkills(name);
    if (!ids.length) unknown.push(name);
    for (const id of ids) if (!out.has(id)) out.set(id, it);
  }
  return { out, unknown };
}

async function aiProfile(text, image) {
  const content = [];
  if (image) content.push({ type: 'image', source: { type: 'base64', ...image } });
  content.push({ type: 'text', text: `${image ? '' : `<document>\n${text.slice(0, 120000)}\n</document>\n\n`}上記の職務経歴書/履歴書から応募者情報を抽出してください。不明な項目は空文字または0。skills.level は 1(入門)〜5(エキスパート)。desiredSalary は万円単位。` });
  const r = await structured({ system: 'あなたはIT業界専門の人材紹介会社のキャリアアドバイザーです。書類から正確に情報を抽出します。推測で情報を作らないでください。', content, schema: PROFILE_SCHEMA });
  if (!r) return null;
  const { out, unknown } = mapSkillNames(r.skills);
  return {
    name: r.name, email: r.email, phone: r.phone, location: r.location, summary: r.summary, years: r.years,
    skills: [...out].map(([id, s]) => ({ id, level: Math.min(5, Math.max(1, s.level || 3)), years: s.years || null })),
    otherSkills: unknown,
    experiences: r.experiences.map((e) => ({ ...e, skills: detectSkills(e.description) })),
    certifications: r.certifications, education: r.education, desiredSalary: r.desiredSalary || null,
    languages: { japanese: r.japanese, english: r.english },
    desiredRoles: guessRoles([...out.keys()]),
  };
}

async function aiJob(text, image) {
  const content = [];
  if (image) content.push({ type: 'image', source: { type: 'base64', ...image } });
  content.push({ type: 'text', text: `${image ? '' : `<document>\n${text.slice(0, 120000)}\n</document>\n\n`}上記の求人票から求人情報を抽出してください。年収は万円単位。required/preferred は技術スキル名の配列。不明な項目は空文字または0。` });
  const r = await structured({ system: 'あなたはIT業界専門の採用コンサルタントです。求人票から正確に情報を抽出します。', content, schema: JOB_SCHEMA });
  if (!r) return null;
  const req = mapSkillNames(r.required);
  const pref = mapSkillNames(r.preferred);
  const reqIds = [...req.out.keys()];
  return {
    title: r.title, location: r.location, salaryMin: r.salaryMin || null, salaryMax: r.salaryMax || null, minYears: r.minYears,
    remote: r.remote, required: reqIds.map((id) => ({ id, level: r.minYears >= 5 ? 4 : 3 })),
    preferred: [...pref.out.keys()].filter((id) => !reqIds.includes(id)),
    duties: r.duties, benefits: r.benefits, description: r.description,
    languages: { japanese: r.japanese, english: r.english },
    roleId: guessRoles([...reqIds, ...pref.out.keys()])[0] || null,
  };
}

/** 複数ファイルを読み、抽出結果をマージする。 */
export async function extractFromFiles(files, kind) {
  const texts = [];
  const results = [];
  const sources = [];
  for (const f of files) {
    const filename = Buffer.from(f.originalname, 'latin1').toString('utf8');
    const { ext, text, image } = await fileToText(f.buffer, filename);
    let parsed = null;
    let engine = 'rules';
    if (aiEnabled()) {
      parsed = kind === 'job' ? await aiJob(text, image) : await aiProfile(text, image);
      if (parsed) engine = 'claude';
    }
    if (!parsed) {
      if (text == null) {
        sources.push({ filename, ext, engine: 'none', note: '画像からの抽出には Claude API キーの設定が必要です' });
        continue;
      }
      parsed = kind === 'job' ? ruleJob(text) : ruleProfile(text);
    }
    if (text) texts.push(text);
    results.push(parsed);
    sources.push({ filename, ext, engine, chars: text ? text.length : 0 });
  }
  return { data: merge(results, kind), sources, rawText: texts.join('\n\n').slice(0, 20000) };
}

function merge(list, kind) {
  if (!list.length) return kind === 'job' ? ruleJob('') : ruleProfile('');
  const out = structuredClone(list[0]);
  for (const r of list.slice(1)) {
    for (const [k, v] of Object.entries(r)) {
      if (Array.isArray(v)) {
        if (k === 'skills' || k === 'required') {
          const ids = new Set(out[k].map((s) => s.id));
          for (const s of v) if (!ids.has(s.id)) out[k].push(s);
        } else out[k] = [...new Set([...(out[k] || []), ...v].map((x) => (typeof x === 'object' ? JSON.stringify(x) : x)))].map((x) => (x.startsWith?.('{') ? JSON.parse(x) : x));
      } else if (v && typeof v === 'object') {
        out[k] = { ...v, ...Object.fromEntries(Object.entries(out[k] || {}).filter(([, x]) => x)) };
      } else if (!out[k] && v) out[k] = v;
      else if (typeof v === 'number' && typeof out[k] === 'number' && k === 'years') out[k] = Math.max(out[k], v);
    }
  }
  return out;
}
