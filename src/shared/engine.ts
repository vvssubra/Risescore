/**
 * R.I.S.E.™ diagnostic engine — TypeScript port of the verified v2.0 engine.
 *
 * Scoring rules, weights, thresholds, tie-breaks, applicability and critical-alert overrides are
 * unchanged and are locked by differential tests against the verbatim v2.0 source
 * (tests/reference/engine.v2.cjs).
 *
 * One deliberate hardening vs. the prototype: only answers to questions that are ACTIVE for the
 * profile are considered. In the prototype a stale answer to a conditional module question
 * (left over after the user went back and changed their profile) could still trigger an alert.
 *
 * This module is pure (no I/O) so the same code runs in the browser for UX hints and on the
 * server, where it is the only source of truth for results.
 */
import { GUARD_TEXT, PLANS } from './content.ts';
import { MODULES, QUESTIONS, SCORECARD_VERSION } from './questions.ts';
import type {
  AlertId,
  AlertItem,
  Answers,
  AssessmentResult,
  ModuleKey,
  PillarKey,
  PillarStat,
  Profile,
  Question,
  Track,
} from './types.ts';

export const SKIP = '__skip__';
export const PILLARS: Record<PillarKey, string> = { R: 'Restore', I: 'Income', S: 'Sustain', E: 'Empire' };
export const PILLAR_ORDER: PillarKey[] = ['R', 'I', 'S', 'E'];
export const WEIGHTS: Record<Track, Record<PillarKey, number>> = {
  financial: { R: 0.3, I: 0.25, S: 0.25, E: 0.2 },
  career: { R: 0.2, I: 0.3, S: 0.25, E: 0.25 },
};

const DISCLAIMER =
  'Educational self-assessment only, not a validated clinical, credit or regulated financial-advice instrument. No recommendation of a specific product or financial opportunity.';

export class EngineError extends Error {}

export function tier(score: number): string {
  return score < 40
    ? 'Needs immediate strengthening'
    : score < 60
      ? 'Needs attention'
      : score < 80
        ? 'Developing'
        : 'Strong foundation';
}

export function modulesFor(profile: Profile): ModuleKey[] {
  const result: ModuleKey[] = [];
  if (profile.track === 'financial') {
    if (['investing', 'property'].includes(profile.goal) || profile.role === 'property_agent') result.push('financial_investing');
    if (['preschool', 'business'].includes(profile.goal) || profile.role === 'business_owner') result.push('financial_business');
  } else if (profile.track === 'career') {
    if (['insurance_agent', 'property_agent'].includes(profile.role) || profile.goal === 'unit_trust') result.push('career_industry');
    if (profile.goal === 'career_change' || profile.switchIntent === 'yes') result.push('career_switch');
    if (profile.role === 'business_owner' || profile.goal === 'preschool' || profile.goal === 'business') result.push('career_business');
  }
  return result;
}

export function questionsFor(profile: Pick<Profile, 'track'> & Partial<Profile>): Question[] {
  if (!profile || !QUESTIONS[profile.track]) throw new EngineError('Select a valid scorecard.');
  return [...QUESTIONS[profile.track], ...modulesFor(profile as Profile).flatMap((m) => MODULES[m])];
}

type AnswerState =
  | { state: 'unknown'; score: null; option?: undefined }
  | { state: 'na'; score: null; option: Question['options'][number] }
  | { state: 'scored'; score: number; option: Question['options'][number] };

function getAnswer(q: Question, value: string | undefined | null): AnswerState {
  if (value === undefined || value === null || value === SKIP) return { state: 'unknown', score: null };
  const found = q.options.find((x) => x.key === value);
  if (!found) throw new EngineError(`Invalid answer ${q.id}: ${value}`);
  if (found.key === 'na') return { state: 'na', score: null, option: found };
  if (found.score === null) return { state: 'unknown', score: null };
  return { state: 'scored', score: found.score, option: found };
}

const is = (a: string | undefined, k: string) => a === k;
const oneOf = (a: string | undefined, arr: string[]) => a !== undefined && arr.includes(a);

export function alertsFor(p: Profile, a: Answers): AlertItem[] {
  const alerts: AlertItem[] = [];
  const add = (cond: boolean, id: AlertId) => {
    if (cond) alerts.push({ id, ...GUARD_TEXT[id] });
  };
  if (p.track === 'financial') {
    add(is(a.f_r1, 'overdue'), 'cash_crisis');
    add(is(a.f_r3, 'missed'), 'debt_arrears');
    add(oneOf(a.f_r2, ['none', 'under_one']) && oneOf(a.f_i1, ['irregular', 'none']), 'fragile_buffer');
    add(p.dependants === 'yes' && oneOf(a.f_r4, ['gap', 'none', 'unsure']), 'dependent_cover');
    add(oneOf(a.f_m_investliquidity, ['essential']) || oneOf(a.f_b_capital, ['essential', 'borrow']), 'investing_essential');
    add(is(a.f_m_property, 'dominates') && (oneOf(a.f_s3, ['limited', 'illiquid']) || oneOf(a.f_m_investliquidity, ['reduced', 'strained'])), 'concentration');
    add(oneOf(a.f_b_feasibility, ['idea', 'none']), 'business_feasibility');
  } else {
    add(is(a.c_r2, 'overdue'), 'career_arrears');
    add((p.switchIntent === 'yes' || p.goal === 'career_change') && oneOf(a.c_r1, ['one_two', 'under_one', 'none']) && a.c_m_switch !== 'gradual', 'switch_runway');
    add(oneOf(a.c_m_authorisation, ['preparing', 'none']) && (p.goal === 'unit_trust' || oneOf(p.role, ['insurance_agent', 'property_agent'])), 'sales_authorisation');
    add(p.goal === 'unit_trust' && p.ageBand === '18_20', 'unit_trust_age');
    add(is(a.c_m_unit, 'unclear'), 'weak_business_model');
  }
  return alerts.sort(
    (x, y) => y.severity - x.severity || PILLAR_ORDER.join('').indexOf(x.pillar) - PILLAR_ORDER.join('').indexOf(y.pillar) || x.id.localeCompare(y.id),
  );
}

/** Throws EngineError on unknown question ids or option keys. Used at the API boundary. */
export function validateAnswers(profile: Profile, answers: unknown): Answers {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw new EngineError('Answers must be an object.');
  const active = new Map(questionsFor(profile).map((q) => [q.id, q]));
  const clean: Answers = {};
  for (const [id, value] of Object.entries(answers as Record<string, unknown>)) {
    const q = active.get(id);
    if (!q) throw new EngineError(`Unknown or inactive question: ${id}`);
    if (typeof value !== 'string') throw new EngineError(`Invalid answer for ${id}`);
    if (value !== SKIP && !q.options.some((o) => o.key === value)) throw new EngineError(`Invalid answer ${id}: ${value}`);
    clean[id] = value;
  }
  return clean;
}

export function assess(profile: Profile, answers?: Answers): AssessmentResult {
  if (!profile || !WEIGHTS[profile.track]) throw new EngineError('Invalid track');
  const active = questionsFor(profile);
  const activeIds = new Set(active.map((q) => q.id));
  const a: Answers = {};
  for (const [k, v] of Object.entries(answers ?? {})) if (activeIds.has(k)) a[k] = v;

  const base = QUESTIONS[profile.track];
  const stats = {} as Record<PillarKey, PillarStat>;
  let scoreTotal = 0;
  let totalWeight = 0;
  let fullEligible = 0;
  let fullAnswered = 0;
  const unknown: string[] = [];

  for (const pillar of PILLAR_ORDER) {
    const group = base.filter((q) => q.pillar === pillar);
    let eligible = 0;
    let scoredWeight = 0;
    let sum = 0;
    let count = 0;
    for (const q of group) {
      const val = getAnswer(q, a[q.id]);
      if (val.state === 'na') continue;
      eligible += q.weight;
      fullEligible += q.weight;
      if (val.state === 'scored') {
        sum += val.score * q.weight;
        scoredWeight += q.weight;
        fullAnswered += q.weight;
        count++;
      } else unknown.push(q.id);
    }
    const coverage = eligible ? scoredWeight / eligible : 0;
    // A pillar score needs at least two scored answers covering >= 60% of its eligible weight.
    const sc = count >= 2 && coverage >= 0.6 ? Math.round(sum / scoredWeight) : null;
    stats[pillar] = {
      name: PILLARS[pillar],
      score: sc,
      coverage: Math.round(coverage * 100),
      answered: count,
      eligible: group.length,
      level: sc === null ? 'Insufficient information' : tier(sc),
    };
    if (sc !== null) {
      scoreTotal += sc * WEIGHTS[profile.track][pillar];
      totalWeight += WEIGHTS[profile.track][pillar];
    }
  }

  const confidence = fullEligible ? Math.round((fullAnswered / fullEligible) * 100) : 0;
  const complete = totalWeight >= 0.999 && confidence >= 70;
  const overall = complete ? Math.round(scoreTotal) : null;
  const alerts = alertsFor(profile, a);
  const scored = Object.entries(stats).filter(([, v]) => v.score !== null) as [PillarKey, PillarStat][];
  const weak = scored.sort((x, y) => (x[1].score as number) - (y[1].score as number) || 'RISE'.indexOf(x[0]) - 'RISE'.indexOf(y[0]));
  const concern = alerts.find((x) => x.severity >= 2);
  const allStrong = complete && !concern && Object.values(stats).every((v) => v.score !== null && v.score >= 80);
  const matchedGoal = (
    { investing: 'S', property: 'S', income: 'I', unit_trust: 'I', career_change: 'I', business: 'E', preschool: 'E', leadership: 'E', legacy: 'E', security: 'R' } as Record<string, PillarKey>
  )[profile.goal];
  const priority: PillarKey = concern ? concern.pillar : allStrong ? matchedGoal || 'E' : weak[0] ? weak[0][0] : 'R';
  const basePlan = PLANS[profile.track][priority];
  const emptySnapshot = !concern && scored.length === 0;
  const plan = allStrong ? { ...basePlan, toolkit: 'Annual R.I.S.E.™ Progress Review Checklist' } : basePlan;

  const reasons = base
    .filter((q) => q.pillar === priority)
    .map((q) => ({ q, val: getAnswer(q, a[q.id]) }))
    .filter((x) => x.val.score !== null)
    .sort((x, y) => (x.val.score as number) - (y.val.score as number))
    .slice(0, 2)
    .map((x) => ({ question: x.q.text, response: (x.val.option as { label: string }).label, score: x.val.score as number }));

  const moduleResults = modulesFor(profile).map((module) => {
    const questions = MODULES[module];
    return {
      module,
      answered: questions.filter((q) => getAnswer(q, a[q.id]).state === 'scored').length,
      total: questions.length,
    };
  });

  return {
    version: SCORECARD_VERSION,
    track: profile.track,
    overall,
    complete,
    confidence,
    byPillar: stats,
    priority,
    priorityName: PILLARS[priority],
    headline: concern ? concern.title : emptySnapshot ? 'More information is needed for a diagnostic' : allStrong ? 'Keep building on your strengths' : plan.title,
    priorityReason: concern
      ? concern.reason
      : emptySnapshot
        ? 'Too few core responses were provided to identify a meaningful weakest pillar.'
        : allStrong
          ? 'All measured pillars currently appear strong; periodic review still matters.'
          : 'This pillar currently has the lowest available score.',
    severity: concern ? concern.severity : 0,
    alerts,
    plan,
    steps: concern
      ? concern.steps
      : emptySnapshot
        ? [
            'Return to the questionnaire and answer additional core questions where possible.',
            'Review any questions you marked as unknown or not applicable.',
            'Recheck your snapshot once at least two meaningful answers are available in every pillar.',
          ]
        : allStrong
          ? [
              'Maintain the habits and safeguards that support your strongest pillars.',
              'Recheck goals, assumptions and important documents at least annually.',
              'Choose one development priority that fits your present needs.',
            ]
          : plan.steps,
    reasons,
    modules: moduleResults,
    unknown,
    disclaimer: DISCLAIMER,
  };
}

/** Deterministic answer sets used by tests: best scored option, worst scored option, or everything skipped. */
export function templateAnswers(profile: Profile, key: 'high' | 'low' | 'skip'): Answers {
  const all: Answers = {};
  for (const q of questionsFor(profile)) {
    const opts = q.options.filter((o) => typeof o.score === 'number');
    if (key === 'high') all[q.id] = opts.slice().sort((x, y) => (y.score as number) - (x.score as number))[0].key;
    else if (key === 'low') all[q.id] = opts.slice().sort((x, y) => (x.score as number) - (y.score as number))[0].key;
    else all[q.id] = SKIP;
  }
  return all;
}

export { QUESTIONS, MODULES, PLANS };
