/**
 * R.I.S.E.™ diagnostic engine — TypeScript port of the V4.3 engine (reference/v4.3/engine.js),
 * with V4.3's two-priority selection (./priorities.ts) applied to every result.
 *
 * V4.3 changes vs v2.0: career questions are filtered by role/goal before scoring (activeCore),
 * insurance and savings use separate yes/no, type (multi-select) and review questions, business and
 * preschool modules are retired, and a result needs >= 70% weight across at least three scored pillars.
 *
 * Hardening vs. the prototype: only answers to questions that are ACTIVE (and visible) for the
 * profile are considered, so a stale answer left over after the user changed their profile or a
 * parent answer can never raise an alert.
 *
 * This module is pure (no I/O) so the same code runs in the browser for UX hints and on the
 * server, where it is the only source of truth for results.
 */
import { GUARD_TEXT, PLANS } from './content.ts';
import { enrich } from './priorities.ts';
import { EXCLUSIVE_KEYS, MODULES, MULTI_SELECT_IDS, QUESTIONS, SCORECARD_VERSION } from './questions.ts';
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

const considersSwitch = (p: Partial<Profile>) => p.goal === 'career_change' || p.switchIntent === 'yes' || p.switchIntent === 'maybe';

/** Team/leadership questions only apply to business owners or people who chose the leadership goal. */
export function showLeadership(profile: Partial<Profile>): boolean {
  return profile.track === 'career' && (profile.role === 'business_owner' || profile.goal === 'leadership');
}

/** Core questions that apply to this profile. Scores normalise only across these. */
export function activeCore(profile: Pick<Profile, 'track'> & Partial<Profile>): Question[] {
  return QUESTIONS[profile.track].filter((q) => {
    if (profile.track !== 'career') return true;
    if (q.id === 'c_r4' && !considersSwitch(profile)) return false;
    if (q.id === 'c_s4' && !showLeadership(profile)) return false;
    if (q.pillar === 'E' && !showLeadership(profile)) return false;
    return true;
  });
}

export function modulesFor(profile: Partial<Profile>): ModuleKey[] {
  const result: ModuleKey[] = [];
  if (profile.track === 'financial') {
    if (['investing', 'property'].includes(profile.goal ?? '')) result.push('financial_investing');
  } else if (profile.track === 'career') {
    if (profile.goal === 'unit_trust') result.push('career_industry');
    if (considersSwitch(profile)) result.push('career_switch');
  }
  return result;
}

export function questionsFor(profile: Pick<Profile, 'track'> & Partial<Profile>): Question[] {
  if (!profile || !QUESTIONS[profile.track]) throw new EngineError('Select a valid scorecard.');
  return [...activeCore(profile), ...modulesFor(profile).flatMap((m) => MODULES[m])];
}

/**
 * Follow-up questions hidden by an earlier answer: insurance type/review when there is no (known)
 * insurance, and savings location when there are no (known) savings.
 */
export function isHidden(questionId: string, answers: Answers): boolean {
  if (questionId === 'f_savings_place') return ['none', 'unsure'].includes(answers.f_has_savings ?? '');
  if (questionId === 'f_policy_types' || questionId === 'f_policy_review') return ['none', 'unknown'].includes(answers.f_r4 ?? '');
  return false;
}

/** The questions a person actually sees, in order, given their current answers. */
export function visibleQuestions(profile: Profile, answers: Answers): Question[] {
  return questionsFor(profile).filter((q) => !isHidden(q.id, answers));
}

export const isMultiSelect = (id: string) => MULTI_SELECT_IDS.includes(id);

type AnswerState =
  | { state: 'unknown'; score: null; option?: undefined }
  | { state: 'na'; score: null; option: Question['options'][number] }
  | { state: 'scored'; score: number; option: Question['options'][number] };

function getAnswer(q: Question, value: string | undefined | null): AnswerState {
  if (value === undefined || value === null || value === SKIP || value === '') return { state: 'unknown', score: null };
  const keys = value.split('|');
  if (keys.length > 1) {
    // Multi-select answers are descriptive only and never scored.
    if (!isMultiSelect(q.id)) throw new EngineError(`Multiple answers not allowed for ${q.id}`);
    if (keys.some((k) => !q.options.some((o) => o.key === k) || EXCLUSIVE_KEYS.includes(k))) throw new EngineError(`Invalid multi-select ${q.id}`);
    return { state: 'unknown', score: null };
  }
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
    // Only a stated "no insurance" counts; an unreviewed or unknown policy is not "uninsured".
    add(p.dependants === 'yes' && is(a.f_r4, 'none'), 'dependent_cover');
    add(is(a.f_m_investliquidity, 'essential'), 'investing_essential');
    add(is(a.f_m_property, 'dominates') && (oneOf(a.f_s3, ['limited', 'illiquid']) || oneOf(a.f_m_investliquidity, ['reduced', 'strained'])), 'concentration');
  } else {
    add(is(a.c_r2, 'overdue'), 'career_arrears');
    add((p.switchIntent === 'yes' || p.goal === 'career_change') && oneOf(a.c_r1, ['one_two', 'under_one', 'none']) && a.c_m_switch !== 'gradual', 'switch_runway');
  }
  return alerts.sort(
    (x, y) => y.severity - x.severity || PILLAR_ORDER.join('').indexOf(x.pillar) - PILLAR_ORDER.join('').indexOf(y.pillar) || x.id.localeCompare(y.id),
  );
}

const MAX_ANSWER_LENGTH = 120;

/**
 * Throws EngineError on unknown/inactive question ids, unknown option keys, invalid multi-selects
 * (duplicates, exclusive choices combined) and follow-up answers that contradict their parent answer.
 * Used at the API boundary.
 */
export function validateAnswers(profile: Profile, answers: unknown): Answers {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw new EngineError('Answers must be an object.');
  const active = new Map(questionsFor(profile).map((q) => [q.id, q]));
  const clean: Answers = {};
  for (const [id, value] of Object.entries(answers as Record<string, unknown>)) {
    const q = active.get(id);
    if (!q) throw new EngineError(`Unknown or inactive question: ${id}`);
    if (typeof value !== 'string' || value.length > MAX_ANSWER_LENGTH) throw new EngineError(`Invalid answer for ${id}`);
    if (value !== SKIP) {
      const keys = value.split('|');
      if (keys.length > 1 && !isMultiSelect(id)) throw new EngineError(`Only one answer allowed for ${id}`);
      if (keys.length !== new Set(keys).size || keys.some((k) => !q.options.some((o) => o.key === k))) throw new EngineError(`Invalid answer ${id}: ${value}`);
      if (keys.length > 1 && keys.some((k) => EXCLUSIVE_KEYS.includes(k))) throw new EngineError(`Exclusive answer cannot be combined: ${id}`);
    }
    clean[id] = value;
  }
  if (clean.f_r4 === 'yes' && clean.f_policy_types === 'none') throw new EngineError('Please correct the insurance types selected.');
  for (const id of Object.keys(clean)) if (isHidden(id, clean)) throw new EngineError(`Answer for ${id} does not match the earlier answer.`);
  return clean;
}

export function assess(profile: Profile, answers?: Answers): AssessmentResult {
  if (!profile || !WEIGHTS[profile.track]) throw new EngineError('Invalid track');
  const activeIds = new Set(questionsFor(profile).map((q) => q.id));
  const raw = answers ?? {};
  const a: Answers = {};
  for (const [k, v] of Object.entries(raw)) if (activeIds.has(k) && !isHidden(k, raw)) a[k] = v;

  const base = activeCore(profile);
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
  const scoredPillars = Object.values(stats).filter((x) => x.score !== null).length;
  // Career profiles without leadership questions have three pillars, so overall is normalised by the weight actually scored.
  const complete = totalWeight >= 0.7 && confidence >= 70 && scoredPillars >= 3;
  const overall = complete ? Math.round(scoreTotal / totalWeight) : null;
  const alerts = alertsFor(profile, a);
  const scored = Object.entries(stats).filter(([, v]) => v.score !== null) as [PillarKey, PillarStat][];
  const weak = scored.sort((x, y) => (x[1].score as number) - (y[1].score as number) || 'RISE'.indexOf(x[0]) - 'RISE'.indexOf(y[0]));
  const concern = alerts.find((x) => x.severity >= 2);
  const allStrong = complete && !concern && Object.values(stats).every((v) => v.score !== null && v.score >= 80);
  const matchedGoal = (
    { investing: 'S', property: 'S', income: 'I', unit_trust: 'I', career_change: 'I', business: 'I', leadership: 'E', legacy: 'E', security: 'R' } as Record<string, PillarKey>
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

  const scoredResult: AssessmentResult = {
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
              'Recheck your goals and insurance, bank and family records at least once a year.',
              'Choose one development priority that fits your present needs.',
            ]
          : plan.steps,
    reasons,
    priorities: [],
    modules: moduleResults,
    unknown,
    disclaimer: DISCLAIMER,
  };
  return enrich(scoredResult, profile, a);
}

/** Deterministic answer sets used by tests: best scored option, worst scored option, or everything skipped. */
export function templateAnswers(profile: Profile, key: 'high' | 'low' | 'skip'): Answers {
  const all: Answers = {};
  for (const q of questionsFor(profile)) {
    const opts = q.options.filter((o) => typeof o.score === 'number');
    if (!opts.length) all[q.id] = SKIP;
    else if (key === 'high') all[q.id] = opts.slice().sort((x, y) => (y.score as number) - (x.score as number))[0].key;
    else if (key === 'low') all[q.id] = opts.slice().sort((x, y) => (x.score as number) - (y.score as number))[0].key;
    else all[q.id] = SKIP;
  }
  return all;
}

export { QUESTIONS, MODULES, PLANS };
