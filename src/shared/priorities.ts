/**
 * V4.3 two-priority selection — TypeScript port of reference/v4.3/v4_priorities.js (`RISE_V4.enrich`).
 *
 * Order of precedence:
 *   1. "All strong" healthy results get ONE maintenance priority (never an invented problem).
 *   2. Known serious conditions (severity 3, then the listed severity-2 alerts).
 *   3. Weakest pillars / the user's stated goal, ranked.
 * At most two priorities, never two for the same pillar or the same toolkit.
 * Pure (no I/O): runs in the browser for UX and on the server as the source of truth.
 */
import { QUESTIONS } from './questions.ts';
import type { AlertId, AlertItem, Answers, AssessmentResult, PillarKey, Priority, PriorityKind, Profile, ToolkitId } from './types.ts';

const P: Record<PillarKey, string> = { R: 'Restore', I: 'Income', S: 'Sustain', E: 'Empire' };
const ORDER: PillarKey[] = ['R', 'I', 'S', 'E'];

export const TOOLKIT_IDS: readonly ToolkitId[] = ['TK01', 'TK02', 'TK03', 'TK04', 'TK05', 'TK06', 'TK07', 'TK08'];
export const MAX_PRIORITIES = 2;

const MAP_ALERT: Record<AlertId, ToolkitId> = {
  cash_crisis: 'TK04',
  debt_arrears: 'TK04',
  career_arrears: 'TK06',
  switch_runway: 'TK06',
  fragile_buffer: 'TK03',
  dependent_cover: 'TK02',
  investing_essential: 'TK05',
  concentration: 'TK05',
};

export const ACTIONS_BY_TOOLKIT: Record<ToolkitId, string[]> = {
  TK01: ['Work out how much extra money you want each month.', 'Compare one or two income ideas based on your skills, time and costs.', 'Test one small opportunity and check what you really keep after costs.'],
  TK02: ['Gather your medical and life insurance policy details.', 'Write down the coverage amounts, key limits and who relies on your income.', 'Discuss any unclear areas with an appropriately qualified person before changing policies.'],
  TK03: ['Add up your basic monthly bills and the savings you can access.', 'Choose a realistic savings target and a small amount to set aside.', 'Check your progress next month and adjust if needed.'],
  TK04: ['Write down income, basic bills and minimum debt payments.', 'Contact providers early if essential payments are overdue.', 'Pick one manageable change and check your numbers next month.'],
  TK05: ['List your investments and when you might need the money.', 'Check how much is tied to one investment and how much cash you can access.', 'Compare risks and questions before committing more money.'],
  TK06: ['Calculate how long your available savings can cover basic bills.', 'Compare career options and check training costs and realistic earnings.', 'Run a small test before making a big financial commitment.'],
  TK07: ['Estimate startup costs, monthly costs and possible income.', 'Calculate how many customers or sales are needed to cover running costs.', 'Test your assumptions and a slow-month scenario before investing.'],
  TK08: ['List the repeat tasks that depend on you.', 'Choose one task to document and teach to someone else.', 'Review quality, time saved and team feedback after 30 days.'],
};

const GOAL_PILLAR: Record<string, PillarKey> = {
  income: 'I', career_change: 'I', unit_trust: 'I', security: 'R', investing: 'S', property: 'S',
  business: 'I', financial_career: 'I', leadership: 'E', legacy: 'E',
};

const IMPORTANT_ALERTS: AlertId[] = ['dependent_cover', 'fragile_buffer', 'concentration'];

interface Candidate {
  pillar: PillarKey;
  score?: number;
  rank: number;
  topic: string;
  reason: string;
  toolkit: ToolkitId;
  kind: PriorityKind;
  actions: string[];
}

function financialCard(pillar: PillarKey, profile: Profile, answers: Answers): Pick<Candidate, 'topic' | 'reason' | 'toolkit'> & { boost: number } {
  if (pillar === 'R') {
    if (answers.f_r4 === 'yes' && profile.dependants === 'yes' && ['maybe', 'no', 'notyet', 'unknown'].includes(answers.f_policy_review ?? '')) {
      return { topic: 'Check what your insurance covers', reason: 'You said you already have some insurance, and people depend on you. It may help to check what is covered before deciding whether anything needs to change.', toolkit: 'TK02', boost: 22 };
    }
    if (['none', 'under_one', 'one_two'].includes(answers.f_r2 ?? '')) {
      return { topic: 'Build your emergency savings', reason: 'You said your savings may not cover many months of basic bills. Start with a small, realistic cash backup.', toolkit: 'TK03', boost: 0 };
    }
    return { topic: 'Keep your day-to-day money steady', reason: 'Your answers suggest it may be worth checking bills, savings and financial commitments.', toolkit: 'TK04', boost: 0 };
  }
  if (pillar === 'I') {
    const reason = profile.goal === 'income'
      ? 'You said you want to earn more. Your Income answers suggest this is worth looking at with a realistic plan.'
      : 'Your income answers suggest room to build a steadier or stronger earning plan.';
    return { topic: 'Explore ways to grow your income', reason, toolkit: 'TK01', boost: 0 };
  }
  if (pillar === 'S') {
    return { topic: 'Review your savings and investment choices', reason: 'It may help to review when you need money, how quickly you can access it and what risks you are taking.', toolkit: 'TK05', boost: 0 };
  }
  return { topic: 'Plan your longer-term financial goals', reason: 'You may benefit from setting a clearer plan for later-life needs and family responsibilities.', toolkit: 'TK05', boost: 0 };
}

function careerCard(pillar: PillarKey, profile: Profile): Pick<Candidate, 'topic' | 'reason' | 'toolkit'> & { boost: number } {
  switch (pillar) {
    case 'R': return { topic: 'Plan a safer career move', reason: 'Your answers suggest checking how long you can pay basic bills if your income changes.', toolkit: 'TK06', boost: 0 };
    case 'I': return { topic: 'Build a practical career and income plan', reason: 'You may have room to grow your skills, compare opportunities and plan earnings realistically.', toolkit: profile.goal === 'income' ? 'TK01' : 'TK06', boost: 0 };
    case 'S': return { topic: 'Check how your work or business can improve', reason: 'Your answers suggest it could help to review repeatable work, customers and business costs.', toolkit: 'TK08', boost: 0 };
    case 'E': return { topic: 'Build better team systems', reason: 'You may benefit from clear team roles and processes that keep work running without you doing everything.', toolkit: 'TK08', boost: 0 };
  }
}

/** Score-based candidate for one pillar, or null when the pillar has no score. */
export function pillarCard(profile: Profile, answers: Answers, report: AssessmentResult, pillar: PillarKey): Candidate | null {
  const score = report.byPillar[pillar]?.score;
  if (score === null || score === undefined) return null;
  const base = profile.track === 'financial' ? financialCard(pillar, profile, answers) : careerCard(pillar, profile);
  const goalBoost = GOAL_PILLAR[profile.goal] === pillar ? 20 : 0;
  return {
    pillar, score, rank: 100 - score + base.boost + goalBoost,
    topic: base.topic, reason: base.reason, toolkit: base.toolkit, kind: 'score', actions: ACTIONS_BY_TOOLKIT[base.toolkit],
  };
}

const MAINTAIN: Record<PillarKey, (p: Profile) => { title: string; toolkit: ToolkitId; reason: string; steps: string[] }> = {
  R: () => ({ title: 'Keep your money foundation strong', toolkit: 'TK03', reason: 'Your answers suggest a strong foundation. Keep checking your savings, bills and protection as life changes.', steps: ['Check your available emergency savings once a year.', 'Review your major bills and family needs after big life changes.', 'Keep doing the money habits that are already working for you.'] }),
  I: () => ({ title: 'Plan your next income goal', toolkit: 'TK01', reason: 'Your income picture looks strong. You can explore your next earning goal at a comfortable pace.', steps: ['Decide whether growing your income is still a personal goal.', 'Compare ideas for time, cost and what you keep after expenses.', 'Only test opportunities that fit your existing commitments.'] }),
  S: () => ({ title: 'Keep your savings and investments on track', toolkit: 'TK05', reason: 'You appear to be doing well in this area. Periodic checks can help you stay on track.', steps: ['Review what you own and when you may need the money.', 'Check fees, access to cash and any concentration risk.', 'Seek qualified guidance before making major changes.'] }),
  E: (p) => ({ title: 'Keep your long-term plan up to date', toolkit: p.track === 'career' ? 'TK08' : 'TK05', reason: 'Your results look strong. Revisit longer-term goals as family, work and responsibilities change.', steps: ['Write down one longer-term goal for the next year.', 'Check your insurance, bank and loan records, or team responsibilities.', 'Set a date to review the plan again.'] }),
};

function flagCandidate(f: AlertItem): Candidate {
  const toolkit = MAP_ALERT[f.id];
  if (f.id === 'dependent_cover') {
    return {
      pillar: f.pillar, rank: 0, kind: 'flag', toolkit, actions: ACTIONS_BY_TOOLKIT[toolkit],
      topic: 'Check your family insurance needs',
      reason: 'You said you do not currently have insurance and someone depends on your income. Consider reviewing your situation with an appropriately qualified person.',
    };
  }
  return { pillar: f.pillar, rank: 0, kind: 'flag', toolkit, topic: f.title, reason: f.reason, actions: f.steps };
}

function toPriority(c: Candidate, i: number): Priority {
  return { number: i + 1, pillar: c.pillar, pillarName: P[c.pillar], title: c.topic, reason: c.reason, toolkit: c.toolkit, kind: c.kind, actions: c.actions };
}

/** Lowest-scoring answered core questions in the pillar: the "why" shown under the first priority. */
function reasonsFor(profile: Profile, answers: Answers, pillar: PillarKey): AssessmentResult['reasons'] {
  return QUESTIONS[profile.track]
    .filter((q) => q.pillar === pillar)
    .map((q) => ({ q, opt: q.options.find((o) => o.key === answers[q.id]) }))
    .filter((x): x is { q: typeof x.q; opt: { key: string; label: string; score: number } } => !!x.opt && typeof x.opt.score === 'number')
    .sort((a, b) => a.opt.score - b.opt.score)
    .slice(0, 2)
    .map((x) => ({ question: x.q.text, response: x.opt.label, score: x.opt.score }));
}

/** Adds `priorities` (1–2, each with one toolkit) to a scored result and aligns headline/steps with priority 1. */
export function enrich(report: AssessmentResult, profile: Profile, answers: Answers): AssessmentResult {
  const flags = report.alerts.filter((a) => !(a.id === 'dependent_cover' && answers.f_r4 !== 'none'));
  const cards = ORDER.map((k) => pillarCard(profile, answers, report, k)).filter((c): c is Candidate => c !== null);
  const allStrong = report.complete && flags.length === 0 && cards.length >= 3 && cards.every((c) => (c.score as number) >= 80);

  if (allStrong) {
    const goal = GOAL_PILLAR[profile.goal] ?? 'R';
    const item = MAINTAIN[goal](profile);
    return {
      ...report, alerts: flags,
      priorities: [{ number: 1, pillar: goal, pillarName: P[goal], title: item.title, reason: item.reason, toolkit: item.toolkit, kind: 'maintain', actions: item.steps }],
      priority: goal, priorityName: P[goal], headline: item.title,
      priorityReason: `No urgent concerns stood out from your answers. ${item.reason}`,
      steps: item.steps, reasons: [],
    };
  }

  const chosen: Candidate[] = [];
  const add = (c: Candidate) => {
    if (chosen.length >= MAX_PRIORITIES || chosen.some((p) => p.pillar === c.pillar || p.toolkit === c.toolkit)) return;
    chosen.push(c);
  };
  // Severe known conditions first; a light coverage review never becomes a critical override.
  const urgent = flags.filter((a) => a.severity >= 3);
  const important = flags.filter((a) => a.severity === 2 && IMPORTANT_ALERTS.includes(a.id));
  for (const f of [...urgent, ...important]) add(flagCandidate(f));

  // Stable sort keeps R-I-S-E order for equal ranks, matching the reference.
  const ordered = [...cards].sort((a, b) => b.rank - a.rank);
  for (const c of ordered) {
    if (chosen.length >= MAX_PRIORITIES) break;
    if (c.rank >= 20 || GOAL_PILLAR[profile.goal] === c.pillar) add(c);
  }
  // One priority is better than an invented second one.
  if (!chosen.length && ordered.length) add(ordered[0]);

  const priorities = chosen.map(toPriority);
  const primary = chosen[0];
  if (!primary) return { ...report, alerts: flags, priorities };
  const matchingFlag = flags.find((f) => f.title === primary.topic);
  return {
    ...report, alerts: flags, priorities,
    priority: primary.pillar, priorityName: P[primary.pillar], headline: primary.topic, priorityReason: primary.reason,
    steps: matchingFlag?.steps ?? ACTIONS_BY_TOOLKIT[primary.toolkit],
    reasons: reasonsFor(profile, answers, primary.pillar),
  };
}

/** The toolkits a result unlocks: taken ONLY from server-computed priorities, never from client input. */
export function entitledToolkits(result: Pick<AssessmentResult, 'priorities'> | null | undefined): ToolkitId[] {
  const ids = (result?.priorities ?? []).slice(0, MAX_PRIORITIES).map((p) => p.toolkit).filter((id) => TOOLKIT_IDS.includes(id));
  return [...new Set(ids)];
}
