import { assert, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { MODULES, QUESTIONS, SCORECARD_VERSION } from '../src/shared/questions.ts';
import { EngineError, SKIP, activeCore, assess, isHidden, modulesFor, questionsFor, templateAnswers, validateAnswers, visibleQuestions } from '../src/shared/engine.ts';
import { entitledToolkits } from '../src/shared/priorities.ts';
import { defaultProfile } from '../src/shared/profile.ts';
import type { Answers, Profile } from '../src/shared/types.ts';
import { mulberry32, parseCsv, randomAnswers, randomProfile } from './helpers.ts';

// Ported from the V4.3 package's own suites (scoring_tests.js, v4_tests.js, v42_tests.js, cohort_tests_v43.js).
const p = (track: 'financial' | 'career', more: Partial<Profile> = {}): Profile => ({
  track, role: 'employee', goal: track === 'financial' ? 'security' : 'income', dependants: 'no', ageBand: '25_34', switchIntent: 'no', ...more,
});
const make = (profile: Profile, kind: 'high' | 'low' | 'skip' = 'high') => templateAnswers(profile, kind);
const edit = (profile: Profile, edits: Answers, kind: 'high' | 'low' = 'high') => assess(profile, { ...make(profile, kind), ...edits });
const ids = (r: ReturnType<typeof assess>) => r.alerts.map((a) => a.id);

describe('V4.3 scoring rules', () => {
  it('financial strong baseline does not trigger false warnings', () => {
    const z = edit(p('financial'), {});
    expect(z.overall).toBeGreaterThanOrEqual(98);
    expect(z.alerts).toHaveLength(0);
  });
  it('career high baseline is 100', () => expect(edit(p('career'), {}).overall).toBe(100));
  it('low financial baseline triggers essential-payments crisis', () => {
    const z = edit(p('financial'), {}, 'low');
    expect(z.priority).toBe('R');
    expect(ids(z)).toContain('cash_crisis');
  });
  it('high-income strong answers cannot hide missed debt repayments', () => {
    const z = edit(p('financial'), { f_i1: 'stable_diverse', f_i2: 'large_surplus', f_r3: 'missed' });
    expect(ids(z)).toContain('debt_arrears');
    expect(z.priority).toBe('R');
  });
  it('no reserves plus unreliable income triggers buffer risk', () => expect(ids(edit(p('financial'), { f_r2: 'none', f_i1: 'irregular' }))).toContain('fragile_buffer'));
  it('dependants and no insurance receive a protection warning; no dependants does not', () => {
    expect(ids(edit(p('financial', { dependants: 'yes' }), { f_r4: 'none' }))).toContain('dependent_cover');
    expect(ids(edit(p('financial', { dependants: 'no' }), { f_r4: 'none' }))).not.toContain('dependent_cover');
  });
  it('unknown or unreviewed insurance is never treated as "uninsured"', () => {
    const pro = p('financial', { dependants: 'yes' });
    expect(ids(edit(pro, { f_r4: 'unknown' }))).not.toContain('dependent_cover');
    expect(ids(edit(pro, { f_r4: 'yes', f_policy_review: 'notyet' }))).not.toContain('dependent_cover');
  });
  it('essential money used for investing is a safety stop, even with a high score', () => {
    const z = edit(p('financial', { goal: 'investing' }), { f_m_investliquidity: 'essential' });
    expect(ids(z)).toContain('investing_essential');
    expect(z.priority).toBe('R');
  });
  it('property concentration and illiquidity trigger Sustain', () => {
    const z = edit(p('financial', { goal: 'investing' }), { f_m_property: 'dominates', f_s3: 'illiquid' });
    expect(ids(z)).toContain('concentration');
    expect(z.priority).toBe('S');
  });
  it('generic business interest opens no capital or preschool questionnaire', () => {
    const pro = p('financial', { goal: 'business', role: 'business_owner' });
    expect(modulesFor(pro)).toEqual([]);
    expect(questionsFor(pro).some((x) => /preschool|capital for a business|occupancy/i.test(x.text))).toBe(false);
  });
  it('career switch with low runway is critical; a staged change is not', () => {
    const pro = p('career', { goal: 'career_change', switchIntent: 'yes' });
    const z = edit(pro, { c_r1: 'under_one', c_m_switch: 'immediate' });
    expect(ids(z)).toContain('switch_runway');
    expect(z.severity).toBe(3);
    expect(ids(edit(pro, { c_r1: 'under_one', c_m_switch: 'gradual' }))).not.toContain('switch_runway');
  });
  it('unit-trust interest asks readiness questions but never labels an unregistered learner or an 18–20 year-old a risk', () => {
    const pro = p('career', { role: 'insurance_agent', goal: 'unit_trust' });
    expect(modulesFor(pro)).toContain('career_industry');
    expect(edit(pro, { c_m_authorisation: 'none' }).alerts).toHaveLength(0);
    const young = p('career', { goal: 'unit_trust', ageBand: '18_20' });
    expect(edit(young, { c_m_authorisation: 'preparing' }).overall).toBe(edit({ ...young, ageBand: '21_24' }, { c_m_authorisation: 'preparing' }).overall);
  });
  it('business owners get team questions; employees not seeking leadership are not scored on running an agency', () => {
    expect(questionsFor(p('career', { role: 'business_owner', goal: 'business' })).some((q) => q.id === 'c_e2')).toBe(true);
    const qids = questionsFor(p('career')).map((q) => q.id);
    for (const id of ['c_s4', 'c_e1', 'c_e2', 'c_e3', 'c_r4']) expect(qids).not.toContain(id);
    expect(edit(p('career'), {}).overall).toBe(100);
  });
  it('career profiles without leadership are complete on three pillars', () => {
    const z = edit(p('career'), {});
    expect(z.byPillar.E.score).toBeNull();
    expect(z.complete).toBe(true);
  });
  it('multi-select insurance keeps every compatible benefit', () => {
    const z = edit(p('financial', { dependants: 'yes' }), { f_r4: 'yes', f_policy_review: 'notyet', f_policy_types: 'medical|life|critical|accident|employer|other' });
    expect(ids(z)).not.toContain('dependent_cover');
  });
  it('an exclusive choice cannot be combined, and single questions take one answer', () => {
    expect(() => assess(p('financial'), { ...make(p('financial')), f_policy_types: 'medical|unsure' })).toThrow(EngineError);
    expect(() => assess(p('financial'), { ...make(p('financial')), f_r1: 'comfortable|usually' })).toThrow(EngineError);
  });
  it('savings in several places are independent and unscored', () => expect(edit(p('financial'), { f_has_savings: 'sometimes', f_savings_place: 'bank|epf|other' }).overall).not.toBeNull());
  it('"not applicable" and "unknown" are never scored as zero', () => {
    expect(edit(p('financial'), { f_e2: 'na' }).byPillar.E.score).toBe(100);
    const z = edit(p('financial'), { f_e2: SKIP });
    expect(z.byPillar.E.score).toBe(100);
    expect(z.confidence).toBeLessThan(100);
  });
  it('too many missing answers suppress the combined score', () => {
    const z = assess(p('financial'), make(p('financial'), 'skip'));
    expect(z.overall).toBeNull();
    expect(z.complete).toBe(false);
    expect(z.headline).toBe('More information is needed for a diagnostic');
    expect(z.priorities).toEqual([]);
  });
  it('age bands never change scored answers', () => {
    expect(edit(p('financial', { ageBand: '18_20' }), {}).byPillar).toEqual(edit(p('financial', { ageBand: '65_plus' }), {}).byPillar);
  });
  it('invalid answers are rejected, not coerced', () => expect(() => edit(p('financial'), { f_i2: 'this_is_invalid' })).toThrow(EngineError));
  it('version is 4.3', () => expect(edit(p('financial'), {}).version).toBe(SCORECARD_VERSION));
});

describe('two priorities and toolkit matching', () => {
  it('healthy result gets ONE maintenance priority — never an invented second need', () => {
    const z = edit(p('financial'), {});
    expect(z.priorities).toHaveLength(1);
    expect(z.priorities[0].kind).toBe('maintain');
    expect(z.headline).toMatch(/strong/i);
    expect(z.priorityReason).not.toMatch(/overdue|behind|danger/i);
  });
  it('career with N/A leadership: overall 100, E unscored, one priority', () => {
    const pc = p('career');
    const z = assess(pc, { ...make(pc), c_e1: 'na', c_e2: 'na', c_e3: 'na' });
    expect(z.overall).toBe(100);
    expect(z.byPillar.E.score).toBeNull();
    expect(z.priorities).toHaveLength(1);
  });
  it('income first, insurance review second, for a parent with unreviewed cover', () => {
    const pe = p('financial', { goal: 'income', dependants: 'yes' });
    const a = { ...make(pe), f_r4: 'yes', f_policy_review: 'notyet', f_policy_types: 'medical|life', f_has_savings: 'sometimes', f_savings_place: 'bank', f_i1: 'stable_one', f_i2: 'small_surplus', f_i3: 'limited' };
    const z = assess(pe, a);
    expect(z.priorities.map((x) => [x.pillar, x.toolkit])).toEqual([['I', 'TK01'], ['R', 'TK02']]);
    expect(ids(z)).not.toContain('dependent_cover');
    const none = assess(pe, { ...a, f_r4: 'none', f_policy_review: undefined as unknown as string, f_policy_types: undefined as unknown as string });
    expect(ids(none)).toContain('dependent_cover');
    expect(none.priorities[0].toolkit).toBe('TK02');
  });
  it('overdue essentials route to the debt and cash-flow reset', () => {
    const z = edit(p('financial'), { f_r1: 'overdue' });
    expect(z.priorities[0]).toMatchObject({ pillar: 'R', toolkit: 'TK04', kind: 'flag' });
    expect(z.steps).toEqual(z.priorities[0].actions);
  });
  it('never more than two priorities, never two for the same pillar or toolkit', () => {
    const rnd = mulberry32(431);
    for (let i = 0; i < 3000; i++) {
      const pro = randomProfile(rnd);
      const z = assess(pro, randomAnswers(rnd, pro));
      expect(z.priorities.length).toBeLessThanOrEqual(2);
      expect(new Set(z.priorities.map((x) => x.pillar)).size).toBe(z.priorities.length);
      expect(new Set(z.priorities.map((x) => x.toolkit)).size).toBe(z.priorities.length);
      expect(entitledToolkits(z)).toEqual(z.priorities.map((x) => x.toolkit));
      if (z.priorities.length) expect(z.headline).toBe(z.priorities[0].title);
    }
  });
  it('entitlements come only from server priorities and ignore anything unknown', () => {
    expect(entitledToolkits(null)).toEqual([]);
    expect(entitledToolkits({ priorities: [{ toolkit: 'TK99' } as never, { toolkit: 'TK03' } as never, { toolkit: 'TK05' } as never] })).toEqual(['TK03']);
  });
});

describe('synthetic cohorts (V4.3 COHORT_TEST_RESULTS.json)', () => {
  type Cohort = { scenario: string; age: string; track: 'financial' | 'career'; role: string; goal: string; questions: number; overall: number | null; coverage: number; first_pillar: string; first_topic: string; second_pillar: string; second_topic: string; alerts: string[] };
  const expected = (JSON.parse(readFileSync(new URL('../reference/v4.3/COHORT_TEST_RESULTS.json', import.meta.url), 'utf8')) as { results: Cohort[] }).results;
  // Answer changes and dependants per scenario, from cohort_tests_v43.js.
  const cases: Record<string, { dependants: string; changes: Answers }> = {
    '18–20 new worker, small savings': { dependants: 'no', changes: { f_r2: 'under_one', f_r4: 'none' } },
    '21–24 monthly saver': { dependants: 'no', changes: { f_s1: 'consistent', f_r2: 'three_five' } },
    '25–34 financially stretched employee': { dependants: 'no', changes: { f_i2: 'break_even', f_r2: 'one_two' } },
    '35–44 working parent with medical and life': { dependants: 'yes', changes: { f_r4: 'yes', f_policy_types: 'medical|life|employer', f_policy_review: 'notyet', f_i1: 'stable_one', f_i2: 'small_surplus', f_i3: 'limited' } },
    '35–44 parent with no insurance': { dependants: 'yes', changes: { f_r4: 'none' } },
    '35–44 essential debt overdue': { dependants: 'yes', changes: { f_r1: 'overdue', f_i2: 'large_surplus' } },
    '45–54 property investor with concentration': { dependants: 'yes', changes: { f_m_property: 'dominates', f_s3: 'illiquid' } },
    '45–54 business owner seeks to grow': { dependants: 'yes', changes: {} },
    '55–64 looking toward retirement': { dependants: 'yes', changes: { f_e1: 'vague' } },
    '65+ retiree with pension': { dependants: 'no', changes: { f_i1: 'stable_one', f_i4: 'na' } },
    '18–20 exploring first career': { dependants: 'no', changes: {} },
    '21–24 employee interested in extra earnings': { dependants: 'no', changes: {} },
    '25–34 employee considering change': { dependants: 'no', changes: { c_r1: 'under_one', c_m_switch: 'immediate' } },
    '35–44 existing insurance agent wants unit trust': { dependants: 'yes', changes: { c_m_authorisation: 'preparing' } },
    '35–44 property agent income development': { dependants: 'yes', changes: {} },
    '45–54 experienced team leader': { dependants: 'yes', changes: { c_e2: 'partial' } },
    '55–64 business owner considering succession': { dependants: 'yes', changes: { c_e2: 'manual' } },
    '65+ career mentor exploring advisory role': { dependants: 'no', changes: {} },
  };
  it('covers all 18 published scenarios', () => expect(expected).toHaveLength(18));
  for (const c of expected) {
    it(c.scenario, () => {
      const spec = cases[c.scenario];
      assert(spec, `no answer set for ${c.scenario}`);
      const profile: Profile = { track: c.track, ageBand: c.age, role: c.role, goal: c.goal, dependants: spec.dependants, switchIntent: c.goal === 'career_change' ? 'yes' : 'no' };
      // The reference answers hidden follow-ups too (they are unscored); hidden ones are ignored by our engine.
      const z = assess(profile, { ...make(profile), ...spec.changes });
      expect(questionsFor(profile)).toHaveLength(c.questions);
      expect(z.overall).toBe(c.overall);
      expect(z.confidence).toBe(c.coverage);
      expect(z.priorities[0]?.pillar ?? '').toBe(c.first_pillar);
      expect(z.priorities[0]?.title ?? '').toBe(c.first_topic);
      expect(z.priorities[1]?.pillar ?? '').toBe(c.second_pillar);
      expect(z.priorities[1]?.title ?? '').toBe(c.second_topic);
      expect(ids(z)).toEqual(c.alerts);
    });
  }
});

describe('follow-up visibility and API-boundary validation', () => {
  const fin = p('financial');
  it('insurance follow-ups are hidden unless the person has (or may have) insurance', () => {
    expect(isHidden('f_policy_types', { f_r4: 'none' })).toBe(true);
    expect(isHidden('f_policy_review', { f_r4: 'unknown' })).toBe(true);
    expect(isHidden('f_policy_types', { f_r4: 'yes' })).toBe(false);
    expect(isHidden('f_savings_place', { f_has_savings: 'none' })).toBe(true);
    expect(visibleQuestions(fin, { f_r4: 'none', f_has_savings: 'unsure' }).map((q) => q.id)).not.toEqual(expect.arrayContaining(['f_policy_types', 'f_savings_place']));
  });
  it('validateAnswers rejects unknown, inactive, malformed and contradictory answers', () => {
    expect(() => validateAnswers(fin, { nope: 'x' })).toThrow(EngineError);
    expect(() => validateAnswers(fin, { f_m_property: 'dominates' })).toThrow(/inactive/);
    expect(() => validateAnswers(fin, { f_r1: 'zzz' })).toThrow(EngineError);
    expect(() => validateAnswers(fin, { f_policy_types: 'medical|medical' })).toThrow(EngineError);
    expect(() => validateAnswers(fin, { f_policy_types: 'medical|none' })).toThrow(/Exclusive/);
    expect(() => validateAnswers(fin, { f_r4: 'yes', f_policy_types: 'none' })).toThrow(/insurance types/);
    expect(() => validateAnswers(fin, { f_r4: 'none', f_policy_types: 'medical' })).toThrow(/earlier answer/);
    expect(() => validateAnswers(fin, { f_has_savings: 'none', f_savings_place: 'bank' })).toThrow(/earlier answer/);
    expect(() => validateAnswers(fin, { f_r1: 'x'.repeat(121) })).toThrow(EngineError);
    expect(() => validateAnswers(fin, [])).toThrow(EngineError);
    expect(validateAnswers(fin, { f_r4: 'yes', f_policy_types: 'medical|life', f_r1: SKIP })).toEqual({ f_r4: 'yes', f_policy_types: 'medical|life', f_r1: SKIP });
  });
  it('stale answers (profile changed after answering) cannot trigger alerts', () => {
    const z = assess(fin, { ...make(fin), f_m_investliquidity: 'essential' });
    expect(ids(z)).not.toContain('investing_essential');
  });
  it('activeCore filters career questions by role and goal before scoring', () => {
    expect(activeCore(p('career')).map((q) => q.id)).not.toContain('c_r4');
    expect(activeCore(p('career', { switchIntent: 'maybe' })).map((q) => q.id)).toContain('c_r4');
    expect(activeCore(p('career', { goal: 'leadership' })).map((q) => q.id)).toEqual(expect.arrayContaining(['c_s4', 'c_e1', 'c_e2', 'c_e3']));
  });
});

describe('question bank integrity', () => {
  it('config matches the V4.3 audit CSV (reference/v4.3/QUESTION_BANK_V4_3.csv) exactly', () => {
    const rows = parseCsv(new URL('../reference/v4.3/QUESTION_BANK_V4_3.csv', import.meta.url).pathname);
    const expected: Record<string, string>[] = [];
    const push = (track: string, section: string, q: (typeof QUESTIONS)['financial'][number]) => {
      for (const o of q.options) expected.push({ track, section, question_id: q.id, pillar: q.pillar, question: q.text, plain_language_help: q.tip, weight: String(q.weight), answer_key: o.key, answer_label: o.label, score: o.score === null ? '' : String(o.score) });
    };
    for (const t of ['financial', 'career'] as const) QUESTIONS[t].forEach((q) => push(t, 'core', q));
    for (const [m, qs] of Object.entries(MODULES)) qs.forEach((q) => push(m.startsWith('financial') ? 'financial' : 'career', m, q));
    expect(rows).toHaveLength(expected.length);
    const byKey = new Map(rows.map((r) => [`${r.track}|${r.question_id}|${r.answer_key}`, r]));
    for (const e of expected) {
      const row = byKey.get(`${e.track}|${e.question_id}|${e.answer_key}`);
      assert(row, `CSV is missing ${e.question_id}/${e.answer_key}`);
      const { multi_select: _m, conditional_note: _c, score_notes: _s, ...comparable } = row;
      expect(comparable).toEqual(e);
    }
  });
  it('unique question ids and option keys; scored options within 0..100', () => {
    const all = [...QUESTIONS.financial, ...QUESTIONS.career, ...Object.values(MODULES).flat()];
    expect(new Set(all.map((q) => q.id)).size).toBe(all.length);
    for (const q of all) {
      expect(new Set(q.options.map((o) => o.key)).size).toBe(q.options.length);
      for (const o of q.options) if (o.score !== null) expect(o.score).toBeGreaterThanOrEqual(0), expect(o.score).toBeLessThanOrEqual(100);
    }
  });
  it('no retired preschool / business-capital questions remain', () => {
    const text = JSON.stringify({ QUESTIONS, MODULES }).toLowerCase();
    for (const bad of ['preschool', 'occupancy', 'f_b_', 'c_m_unit']) expect(text).not.toContain(bad);
  });
});

describe('robustness', () => {
  it('10,000 random profile/answer combinations stay bounded and deterministic', () => {
    const rnd = mulberry32(20261011);
    for (let i = 0; i < 10_000; i++) {
      const pro = randomProfile(rnd);
      const a = randomAnswers(rnd, pro);
      const z = assess(pro, a);
      expect(z.overall === null || (z.overall >= 0 && z.overall <= 100)).toBe(true);
      for (const s of Object.values(z.byPillar)) expect(s.score === null || (s.score >= 0 && s.score <= 100)).toBe(true);
      expect(assess(pro, a)).toEqual(z);
    }
  });
  it('every role × goal combination routes and scores', () => {
    for (const track of ['financial', 'career'] as const) {
      const base = defaultProfile(track);
      for (const role of ['employee', 'insurance_agent', 'property_agent', 'business_owner', 'self_employed', 'retired', 'other']) {
        for (const goal of ['security', 'income', 'investing', 'career_change', 'unit_trust', 'business', 'financial_career', 'leadership', 'legacy']) {
          const pro = { ...base, role, goal };
          const z = assess(pro, make(pro));
          expect(z.overall).toBeGreaterThanOrEqual(98);
          expect(z.priorities.length).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });
});
