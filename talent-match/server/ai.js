// Claude API 連携（任意）。ANTHROPIC_API_KEY 等の認証情報がない場合は null を返し、
// 呼び出し側はルールベースのロジックにフォールバックする。
import Anthropic from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';

const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5-5';

let client = null;
export function aiEnabled() {
  if (process.env.TALENT_MATCH_DISABLE_AI === '1') return false;
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

/**
 * JSON スキーマに沿った構造化出力を得る。失敗時は null（呼び出し側でフォールバック）。
 * content は Messages API の user content（text / document / image ブロック配列）。
 */
export async function structured({ system, content, schema, effort = 'low', maxTokens = 16000 }) {
  if (!aiEnabled()) return null;
  try {
    const res = await getClient().beta.messages.parse({
      model: MODEL,
      max_tokens: maxTokens,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system,
      output_config: { effort, format: jsonSchemaOutputFormat(schema) },
      messages: [{ role: 'user', content }],
    });
    if (res.stop_reason === 'refusal' || res.stop_reason === 'max_tokens') {
      console.warn(`[ai] stop_reason=${res.stop_reason}; falling back to rules`);
      return null;
    }
    return res.parsed_output ?? null;
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) console.warn('[ai] rate limited; falling back to rules');
    else if (err instanceof Anthropic.APIError) console.warn(`[ai] API error ${err.status}: ${err.message}`);
    else console.warn(`[ai] ${err.message}`);
    return null;
  }
}

const str = { type: 'string' };
const strArr = { type: 'array', items: str };

export const PROFILE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'email', 'phone', 'location', 'summary', 'years', 'skills', 'experiences', 'certifications', 'education', 'desiredSalary', 'japanese', 'english'],
  properties: {
    name: str, email: str, phone: str, location: str, summary: str,
    years: { type: 'number' },
    skills: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['name', 'level', 'years'],
        properties: { name: str, level: { type: 'integer' }, years: { type: 'number' } },
      },
    },
    experiences: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['company', 'period', 'role', 'description'],
        properties: { company: str, period: str, role: str, description: str },
      },
    },
    certifications: strArr,
    education: str,
    desiredSalary: { type: 'number' },
    japanese: str,
    english: str,
  },
};

export const JOB_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'location', 'salaryMin', 'salaryMax', 'minYears', 'required', 'preferred', 'duties', 'benefits', 'description', 'remote', 'japanese', 'english'],
  properties: {
    title: str, location: str, description: str,
    salaryMin: { type: 'number' }, salaryMax: { type: 'number' }, minYears: { type: 'number' },
    required: strArr, preferred: strArr, duties: strArr, benefits: strArr,
    remote: { type: 'string', enum: ['full', 'hybrid', 'onsite'] },
    japanese: str, english: str,
  },
};

export const ADVICE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'points', 'questions'],
  properties: {
    summary: str,
    points: strArr,
    questions: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['q', 'intent'],
        properties: { q: str, intent: str },
      },
    },
  },
};

export const ANSWER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['score', 'good', 'improve'],
  properties: { score: { type: 'integer' }, good: str, improve: str },
};
