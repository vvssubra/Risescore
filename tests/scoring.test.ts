import { assert, describe, expect, it } from 'vitest';
import { deepStrictEqual } from 'node:assert';
import { MODULES, QUESTIONS } from '../src/shared/questions.ts';
import { EngineError, SKIP, assess, alertsFor, modulesFor, questionsFor, templateAnswers, validateAnswers } from '../src/shared/engine.ts';
import { defaultProfile } from '../src/shared/profile.ts';
import type { Answers, Profile } from '../src/shared/types.ts';
import { mulberry32, parseCsv, randomAnswers, randomProfile, ref } from './helpers.ts';

const fin = (over: Partial<Profile> = {}): Profile => ({ ...defaultProfile('financial'), ...over });
const car = (over: Partial<Profile> = {}): Profile => ({ ...defaultProfile('career'), ...over });
const high = (p: Profile): Answers => templateAnswers(p, 'high');
const alertIds = (p: Profile, a: Answers) => assess(p, a).alerts.map((x) => x.id);

describe('R.I.S.E.™ scoring — 24 core cases', () => {
  it('01 best financial answers score 100 with no alerts', () => {
    const r = assess(fin(), high(fin()));
    expect(r.overall).toBe(100);
    expect(r.complete).toBe(true);
    expect(r.alerts).toEqual([]);
    expect(r.headline).toBe('Keep building on your strengths');
  });
  it('02 best career answers score 100 with no alerts', () => {
    const r = assess(car(), high(car()));
    expect(r.overall).toBe(100);
    expect(r.alerts).toEqual([]);
  });
  it('03 worst financial answers score low and raise critical alerts', () => {
    const p = fin({ dependants: 'yes' });
    const r = assess(p, templateAnswers(p, 'low'));
    expect(r.overall).toBeLessThan(25);
    expect(r.alerts.map((a) => a.id)).toEqual(expect.arrayContaining(['cash_crisis', 'debt_arrears', 'fragile_buffer', 'dependent_cover']));
    expect(r.severity).toBe(3);
  });
  it('04 everything unknown gives no score and no invented diagnosis', () => {
    const p = fin();
    const r = assess(p, templateAnswers(p, 'skip'));
    expect(r.overall).toBeNull();
    expect(r.complete).toBe(false);
    expect(r.headline).toBe('More information is needed for a diagnostic');
    expect(Object.values(r.byPillar).every((x) => x.score === null)).toBe(true);
    expect(r.confidence).toBe(0);
  });
  it('05 empty answers behave like everything unknown', () => {
    expect(assess(car(), {}).overall).toBeNull();
  });
  it('06 "unknown" is excluded, never treated as zero', () => {
    const p = fin();
    const a = { ...high(p), f_r1: SKIP };
    const skipped = assess(p, a).byPillar.R.score;
    const zero = assess(p, { ...high(p), f_r1: 'overdue' }).byPillar.R.score;
    expect(skipped).toBe(100);
    expect(zero).toBeLessThan(skipped as number);
  });
  it('07 "not applicable" removes a question from eligibility (retiree income-plan)', () => {
    const p = fin();
    const a = { ...high(p), f_i4: 'na', f_i1: 'stable_diverse' };
    expect(assess(p, a).byPillar.I.score).toBe(100);
    expect(assess(p, a).byPillar.I.eligible).toBe(4);
  });
  it('08 a single answer never produces a pillar score; enough answers do', () => {
    const p = fin();
    const a: Answers = { ...templateAnswers(p, 'skip'), f_r1: 'comfortable' };
    expect(assess(p, a).byPillar.R.score).toBeNull();
    expect(assess(p, { ...a, f_r2: 'six_plus', f_r3: 'none' }).byPillar.R.score).toBe(100);
  });
  it('09 a pillar needs at least 60% weighted coverage', () => {
    const p = fin();
    // R weights: 1.5 + 1.5 + 1.5 + 1 = 5.5; two answered = 3.0 = 55% < 60% => no score
    const a: Answers = { ...templateAnswers(p, 'skip'), f_r1: 'comfortable', f_r2: 'six_plus' };
    const r = assess(p, a);
    expect(r.byPillar.R.coverage).toBe(55);
    expect(r.byPillar.R.score).toBeNull();
  });
  it('10 overall needs all four pillars and >= 70% coverage', () => {
    const p = fin();
    const a = high(p);
    for (const k of ['f_e1', 'f_e2', 'f_e3']) a[k] = SKIP;
    const r = assess(p, a);
    expect(r.byPillar.E.score).toBeNull();
    expect(r.overall).toBeNull();
    expect(r.complete).toBe(false);
  });
  it('11 cash_crisis fires on overdue essentials (severity 3, pillar R)', () => {
    const p = fin();
    const r = assess(p, { ...high(p), f_r1: 'overdue' });
    const a = r.alerts.find((x) => x.id === 'cash_crisis')!;
    expect(a.severity).toBe(3);
    expect(r.priority).toBe('R');
  });
  it('12 debt_arrears fires on missed repayments', () => {
    const p = fin();
    expect(alertIds(p, { ...high(p), f_r3: 'missed' })).toContain('debt_arrears');
  });
  it('13 fragile_buffer needs low reserves AND uncertain income', () => {
    const p = fin();
    expect(alertIds(p, { ...high(p), f_r2: 'none' })).not.toContain('fragile_buffer');
    expect(alertIds(p, { ...high(p), f_r2: 'none', f_i1: 'irregular' })).toContain('fragile_buffer');
  });
  it('14 dependent_cover only fires when dependants = yes', () => {
    const a = { ...high(fin()), f_r4: 'gap' };
    expect(alertIds(fin({ dependants: 'yes' }), a)).toContain('dependent_cover');
    expect(alertIds(fin({ dependants: 'no' }), a)).not.toContain('dependent_cover');
    expect(alertIds(fin({ dependants: 'unsure' }), a)).not.toContain('dependent_cover');
  });
  it('15 investing_essential fires from either module (investing liquidity or business capital)', () => {
    const inv = fin({ goal: 'investing' });
    expect(alertIds(inv, { ...high(inv), f_m_investliquidity: 'essential' })).toContain('investing_essential');
    const biz = fin({ goal: 'business' });
    expect(alertIds(biz, { ...high(biz), f_b_capital: 'borrow' })).toContain('investing_essential');
  });
  it('16 concentration needs a dominating illiquid holding plus liquidity strain', () => {
    const p = fin({ goal: 'property' });
    expect(alertIds(p, { ...high(p), f_m_property: 'dominates' })).not.toContain('concentration');
    expect(alertIds(p, { ...high(p), f_m_property: 'dominates', f_s3: 'illiquid' })).toContain('concentration');
  });
  it('17 business_feasibility fires for idea-stage or unstarted validation', () => {
    const p = fin({ goal: 'preschool' });
    expect(alertIds(p, { ...high(p), f_b_feasibility: 'idea' })).toContain('business_feasibility');
  });
  it('18 career_arrears and switch_runway (needs a transition + short runway + not staged)', () => {
    const p = car({ goal: 'career_change' });
    expect(alertIds(p, { ...high(p), c_r2: 'overdue' })).toContain('career_arrears');
    expect(alertIds(p, { ...high(p), c_r1: 'under_one', c_m_switch: 'immediate' })).toContain('switch_runway');
    expect(alertIds(p, { ...high(p), c_r1: 'under_one', c_m_switch: 'gradual' })).not.toContain('switch_runway');
  });
  it('19 sales_authorisation and unit_trust_age (FIMM minimum age 21 wording preserved)', () => {
    const p = car({ goal: 'unit_trust', ageBand: '18_20' });
    const ids = alertIds(p, { ...high(p), c_m_authorisation: 'none' });
    expect(ids).toEqual(expect.arrayContaining(['sales_authorisation', 'unit_trust_age']));
    expect(alertIds(car({ goal: 'unit_trust', ageBand: '25_34' }), { ...high(car({ goal: 'unit_trust' })), c_m_authorisation: 'registered' })).toEqual([]);
  });
  it('20 weak_business_model fires when unit economics are unclear', () => {
    const p = car({ role: 'business_owner' });
    expect(alertIds(p, { ...high(p), c_m_unit: 'unclear' })).toContain('weak_business_model');
  });
  it('21 alerts sort by severity, then pillar order R-I-S-E, then id', () => {
    const p = fin({ dependants: 'yes', goal: 'business' });
    const a = { ...high(p), f_r1: 'overdue', f_r4: 'gap', f_b_feasibility: 'none', f_b_capital: 'essential' };
    const sev = alertIds(p, a);
    expect(sev.slice(0, 2)).toEqual(['cash_crisis', 'investing_essential']);
    expect(sev.indexOf('dependent_cover')).toBeLessThan(sev.indexOf('business_feasibility'));
  });
  it('22 a serious alert overrides the weakest-pillar rule and a high overall score', () => {
    const p = fin();
    const r = assess(p, { ...high(p), f_r1: 'overdue' });
    expect(r.overall).toBeGreaterThan(80);
    expect(r.priority).toBe('R');
    expect(r.headline).toBe('Essential payments need attention');
    expect(r.priorityReason).toContain('overdue');
  });
  it('23 conditional modules route by profile and add questions', () => {
    expect(modulesFor(fin())).toEqual([]);
    expect(modulesFor(fin({ goal: 'investing' }))).toEqual(['financial_investing']);
    expect(modulesFor(fin({ role: 'business_owner', goal: 'property' }))).toEqual(['financial_investing', 'financial_business']);
    expect(modulesFor(car({ switchIntent: 'yes', role: 'insurance_agent', goal: 'business' }))).toEqual(['career_industry', 'career_switch', 'career_business']);
    expect(questionsFor(fin()).length).toBe(15);
    expect(questionsFor(car({ goal: 'unit_trust' })).length).toBe(17);
  });
  it('24 invalid input is rejected; profile answers never change pillar scores', () => {
    expect(() => assess(fin(), { f_r1: 'nonsense' })).toThrow(EngineError);
    expect(() => assess({ ...fin(), track: 'x' as never }, {})).toThrow(EngineError);
    const a = high(fin());
    const base = assess(fin({ ageBand: '25_34', role: 'employee' }), a).byPillar;
    const other = assess(fin({ ageBand: '65_plus', role: 'retired', dependants: 'no' }), a).byPillar;
    expect(other).toEqual(base);
  });
});

describe('API-boundary hardening', () => {
  it('validateAnswers rejects unknown, inactive and malformed answers', () => {
    const p = fin();
    expect(() => validateAnswers(p, { nope: 'x' })).toThrow(/Unknown or inactive/);
    expect(() => validateAnswers(p, { f_m_property: 'dominates' })).toThrow(/Unknown or inactive/);
    expect(() => validateAnswers(p, { f_r1: 'zzz' })).toThrow(/Invalid answer/);
    expect(() => validateAnswers(p, { f_r1: 5 })).toThrow(/Invalid answer/);
    expect(() => validateAnswers(p, [])).toThrow();
    expect(validateAnswers(p, { f_r1: 'comfortable', f_r2: SKIP })).toEqual({ f_r1: 'comfortable', f_r2: SKIP });
  });
  it('stale module answers (profile changed after answering) cannot trigger alerts — prototype bug fixed', () => {
    const noModule = fin({ goal: 'security' });
    const stale = { ...high(noModule), f_m_investliquidity: 'essential', f_b_feasibility: 'none' } as Answers;
    // The verbatim prototype engine still raises alerts from answers to questions no longer asked:
    const legacy = ref.RISE.assess(noModule, stale);
    expect(legacy.alerts.map((a: any) => a.id)).toEqual(expect.arrayContaining(['investing_essential', 'business_feasibility']));
    // The port ignores answers to inactive questions:
    expect(assess(noModule, stale).alerts).toEqual([]);
    expect(alertsFor(noModule, stale).length).toBeGreaterThan(0); // raw helper is unchanged; assess() filters
  });
});

describe('question bank integrity', () => {
  it('config matches the audit CSV (reference/QUESTION_BANK.csv) exactly', () => {
    const rows = parseCsv(new URL('../reference/QUESTION_BANK.csv', import.meta.url).pathname);
    const expected: Record<string, string>[] = [];
    const push = (track: string, mod: string, q: (typeof QUESTIONS)['financial'][number]) => {
      for (const o of q.options)
        expected.push({
          track, module: mod, pillar: q.pillar, id: q.id, weight: String(q.weight), question: q.text,
          option_key: o.key, option_label: o.label, option_score: o.score === null ? 'N/A' : String(o.score), notes: q.tip,
        });
    };
    for (const t of ['financial', 'career'] as const) QUESTIONS[t].forEach((q) => push(t, 'core', q));
    const modTrack = (m: string) => (m.startsWith('financial') ? 'financial' : 'career');
    for (const [m, qs] of Object.entries(MODULES)) qs.forEach((q) => push(modTrack(m), m, q));
    const key = (r: Record<string, string>) => `${r.track}|${r.id}|${r.option_key}`;
    const byKey = new Map(rows.map((r) => [key(r), r]));
    expect(rows.length).toBe(expected.length);
    for (const e of expected) {
      const row = byKey.get(key(e));
      assert(row, `CSV is missing ${key(e)}`);
      expect({ ...row, module: row.module }).toEqual(e);
    }
  });
  it('every question has unique ids and unique option keys', () => {
    const all = [...QUESTIONS.financial, ...QUESTIONS.career, ...Object.values(MODULES).flat()];
    expect(new Set(all.map((q) => q.id)).size).toBe(all.length);
    for (const q of all) expect(new Set(q.options.map((o) => o.key)).size).toBe(q.options.length);
    expect(all.length).toBe(41);
  });
});

describe('regression vs the verified v2.0 engine', () => {
  it('questionsFor/modulesFor match the reference for every profile combination', () => {
    const rnd = mulberry32(7);
    for (let i = 0; i < 2000; i++) {
      const p = randomProfile(rnd);
      deepStrictEqual(modulesFor(p), ref.RISE.modulesFor(p));
      deepStrictEqual(questionsFor(p).map((q) => q.id), ref.RISE.questionsFor(p).map((q: any) => q.id));
    }
  });
  it('10,000 random profile/answer combinations produce byte-identical results', () => {
    const rnd = mulberry32(20260131);
    for (let i = 0; i < 10_000; i++) {
      const p = randomProfile(rnd);
      const a = randomAnswers(rnd, p);
      let expected: unknown, actual: unknown;
      try { expected = ref.RISE.assess(p, a); } catch (e) { expected = 'throws'; }
      try { actual = assess(p, a); } catch (e) { actual = 'throws'; }
      try { deepStrictEqual(actual, expected); } catch (err) {
        throw new Error(`Mismatch at iteration ${i}\nprofile=${JSON.stringify(p)}\nanswers=${JSON.stringify(a)}\n${(err as Error).message.slice(0, 800)}`);
      }
    }
  });
  it('template answer sets (high / low / skip) match the reference', () => {
    const rnd = mulberry32(99);
    for (let i = 0; i < 300; i++) {
      const p = randomProfile(rnd);
      for (const k of ['high', 'low', 'skip'] as const) {
        deepStrictEqual(templateAnswers(p, k), ref.RISE.templateAnswers(p, k));
        deepStrictEqual(assess(p, templateAnswers(p, k)), ref.RISE.assess(p, ref.RISE.templateAnswers(p, k)));
      }
    }
  });
});
