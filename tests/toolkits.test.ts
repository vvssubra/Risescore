import { describe, expect, it } from 'vitest';
import { deepStrictEqual } from 'node:assert';
import { FALLBACK_TOOLKIT_ID, TOOLKIT_TEMPLATES } from '../src/shared/toolkit-templates.ts';
import { DEFAULT_RULES, MAX_MATCHES, matchToolkitIds, type MatchRule } from '../src/shared/toolkit-rules.ts';
import { assess, templateAnswers } from '../src/shared/engine.ts';
import { AGE_BANDS, CAREER_GOALS, DEPENDANTS, FIN_GOALS, ROLES, defaultProfile } from '../src/shared/profile.ts';
import type { AlertId, Answers, Profile } from '../src/shared/types.ts';
import { mulberry32, randomAnswers, randomProfile, ref } from './helpers.ts';

// Reference output comes from another vm realm; normalise to host arrays before strict comparison.
const refIds = (report: any, profile: Profile): string[] => [...ref.RISE_TOOLKITS.match(report, profile)].map((k: any) => String(k.id));
const ourIds = (report: any, profile: Profile) => matchToolkitIds(report, profile, DEFAULT_RULES);

describe('toolkit catalog', () => {
  it('contains all 14 original templates, identical to the prototype', () => {
    expect(TOOLKIT_TEMPLATES).toHaveLength(14);
    const stripped = ref.RISE_TOOLKITS.CATALOG.map(({ pdfUrl, ...rest }: any) => rest);
    deepStrictEqual(JSON.parse(JSON.stringify(TOOLKIT_TEMPLATES)), JSON.parse(JSON.stringify(stripped)));
  });
  it('every template follows the 5-step understand → define → consider → act → review structure', () => {
    for (const t of TOOLKIT_TEMPLATES) expect(t.sections.map((s) => s[0])).toEqual(['Understand', 'Define', 'Consider', 'Act', 'Review']);
  });
  it('ids are unique and the fallback exists', () => {
    expect(new Set(TOOLKIT_TEMPLATES.map((t) => t.id)).size).toBe(14);
    expect(TOOLKIT_TEMPLATES.some((t) => t.id === FALLBACK_TOOLKIT_ID)).toBe(true);
  });
  it('educational wording never promises returns or implies accreditation', () => {
    const text = JSON.stringify(TOOLKIT_TEMPLATES).toLowerCase();
    for (const bad of ['guarantee return', 'guaranteed return', 'cfp-accredited', 'cfp certified', 'risk-free', 'you will earn']) expect(text).not.toContain(bad);
  });
});

/** One scenario per critical-alert id, each expected to route to its mapped toolkit. */
const ALERT_SCENARIOS: Record<AlertId, { profile: Partial<Profile> & { track: 'financial' | 'career' }; answers: Answers; toolkit: string }> = {
  cash_crisis: { profile: { track: 'financial' }, answers: { f_r1: 'overdue' }, toolkit: 'financial-reset' },
  debt_arrears: { profile: { track: 'financial' }, answers: { f_r3: 'missed' }, toolkit: 'financial-reset' },
  fragile_buffer: { profile: { track: 'financial' }, answers: { f_r2: 'none', f_i1: 'none' }, toolkit: 'financial-reset' },
  dependent_cover: { profile: { track: 'financial', dependants: 'yes' }, answers: { f_r4: 'gap' }, toolkit: 'family-protection' },
  investing_essential: { profile: { track: 'financial', goal: 'investing' }, answers: { f_m_investliquidity: 'essential' }, toolkit: 'asset-liquidity' },
  concentration: { profile: { track: 'financial', goal: 'property' }, answers: { f_m_property: 'dominates', f_s3: 'illiquid' }, toolkit: 'asset-liquidity' },
  business_feasibility: { profile: { track: 'financial', goal: 'preschool' }, answers: { f_b_feasibility: 'none' }, toolkit: 'preschool-due-diligence' },
  career_arrears: { profile: { track: 'career' }, answers: { c_r2: 'overdue' }, toolkit: 'career-runway' },
  switch_runway: { profile: { track: 'career', goal: 'career_change' }, answers: { c_r1: 'none', c_m_switch: 'immediate' }, toolkit: 'career-runway' },
  sales_authorisation: { profile: { track: 'career', goal: 'unit_trust' }, answers: { c_m_authorisation: 'none' }, toolkit: 'industry-credentials' },
  unit_trust_age: { profile: { track: 'career', goal: 'unit_trust', ageBand: '18_20' }, answers: { c_m_authorisation: 'registered' }, toolkit: 'industry-credentials' },
  weak_business_model: { profile: { track: 'career', role: 'business_owner' }, answers: { c_m_unit: 'unclear' }, toolkit: 'unit-economics' },
};

describe('12 alert → toolkit mappings', () => {
  it('prototype maps exactly the 12 alerts we reproduce', () => {
    expect(Object.keys(ref.RISE_TOOLKITS.FLAG_KITS).sort()).toEqual(Object.keys(ALERT_SCENARIOS).sort());
    expect(DEFAULT_RULES.filter((r) => r.stage === 'alert')).toHaveLength(12);
  });
  for (const [alert, sc] of Object.entries(ALERT_SCENARIOS)) {
    it(`${alert} → ${sc.toolkit} (first match, severe alerts take precedence)`, () => {
      const profile = { ...defaultProfile(sc.profile.track), ...sc.profile } as Profile;
      const report = assess(profile, { ...templateAnswers(profile, 'high'), ...sc.answers });
      expect(report.alerts.map((a) => a.id)).toContain(alert);
      const ids = ourIds(report, profile);
      expect(ids.length).toBeGreaterThanOrEqual(1);
      expect(ids.length).toBeLessThanOrEqual(MAX_MATCHES);
      expect(ids).toContain(sc.toolkit);
      deepStrictEqual(ids, refIds(report, profile));
    });
  }
});

describe('profile routes: every eligible result matches 1–3 toolkits, identical to the prototype', () => {
  it('covers 360+ role × goal × dependants × answer-pattern routes', () => {
    let routes = 0;
    for (const track of ['financial', 'career'] as const) {
      const goals = track === 'financial' ? FIN_GOALS : CAREER_GOALS;
      for (const [role] of ROLES) for (const [goal] of goals) for (const [dependants] of DEPENDANTS) for (const pattern of ['high', 'low', 'skip'] as const) {
        const profile = { ...defaultProfile(track), role, goal, dependants, ageBand: role === 'retired' ? '65_plus' : '25_34' } as Profile;
        const report = assess(profile, templateAnswers(profile, pattern));
        const ids = ourIds(report, profile);
        expect(ids.length, `${track}/${role}/${goal}/${dependants}/${pattern}`).toBeGreaterThanOrEqual(1);
        expect(ids.length).toBeLessThanOrEqual(MAX_MATCHES);
        expect(new Set(ids).size).toBe(ids.length);
        deepStrictEqual(ids, refIds(report, profile));
        routes++;
      }
    }
    expect(routes).toBeGreaterThanOrEqual(360);
  });
  it('age band routes (including 18–20 unit-trust) are identical to the prototype', () => {
    for (const [ageBand] of AGE_BANDS) {
      const profile = { ...defaultProfile('career'), goal: 'unit_trust', ageBand } as Profile;
      const report = assess(profile, { ...templateAnswers(profile, 'high'), c_m_authorisation: 'preparing' });
      deepStrictEqual(ourIds(report, profile), refIds(report, profile));
    }
  });
  it('5,000 random assessments match the prototype matcher and never come back empty', () => {
    const rnd = mulberry32(424242);
    for (let i = 0; i < 5000; i++) {
      const profile = randomProfile(rnd);
      const report = assess(profile, randomAnswers(rnd, profile));
      const ids = ourIds(report, profile);
      expect(ids.length).toBeGreaterThanOrEqual(1);
      deepStrictEqual(ids, refIds(report, profile));
    }
  });
});

describe('special pathways', () => {
  it('missing data → "Complete Your Snapshot" only', () => {
    const p = defaultProfile('financial');
    expect(ourIds(assess(p, templateAnswers(p, 'skip')), p)).toEqual([FALLBACK_TOOLKIT_ID]);
  });
  it('all strong with no alerts → annual review', () => {
    const p = defaultProfile('career');
    expect(ourIds(assess(p, templateAnswers(p, 'high')), p)).toContain('annual-review');
  });
  it('severe alerts come before the pillar default', () => {
    const p = { ...defaultProfile('financial'), dependants: 'yes' } as Profile;
    const r = assess(p, { ...templateAnswers(p, 'high'), f_r1: 'overdue', f_r4: 'gap' });
    expect(ourIds(r, p).slice(0, 2)).toEqual(['financial-reset', 'family-protection']);
  });
});

describe('admin-managed availability and rules', () => {
  const p = defaultProfile('financial');
  const report = assess(p, { ...templateAnswers(p, 'high'), f_r1: 'overdue' });
  it('an unavailable (archived / unpublished) toolkit is skipped and the next rule fills the slot', () => {
    const all = new Set(TOOLKIT_TEMPLATES.map((t) => t.id));
    all.delete('financial-reset');
    const ids = matchToolkitIds(report, p, DEFAULT_RULES, all);
    expect(ids).not.toContain('financial-reset');
    expect(ids.length).toBeGreaterThanOrEqual(1);
  });
  it('if nothing at all is available the safe fallback is still returned', () => {
    expect(matchToolkitIds(report, p, DEFAULT_RULES, new Set())).toEqual([FALLBACK_TOOLKIT_ID]);
  });
  it('inactive rules are ignored; new admin rules are honoured', () => {
    // An insurance agent exploring income growth: only the alert rule routes to industry-credentials.
    const agent = { ...defaultProfile('career'), role: 'insurance_agent', goal: 'income' } as Profile;
    const agentReport = assess(agent, { ...templateAnswers(agent, 'high'), c_m_authorisation: 'none' });
    expect(matchToolkitIds(agentReport, agent, DEFAULT_RULES)).toContain('industry-credentials');
    const rules: MatchRule[] = DEFAULT_RULES.map((r) => (r.id === 'default-alert-sales_authorisation' ? { ...r, active: false } : r));
    expect(matchToolkitIds(agentReport, agent, rules)).not.toContain('industry-credentials');
    const custom: MatchRule[] = [...DEFAULT_RULES, { id: 'x', toolkitId: 'family-continuity', stage: 'alert', track: 'financial', order: 0, active: true, when: { alert: 'cash_crisis' } }];
    expect(matchToolkitIds(report, p, custom)[0]).toBe('family-continuity');
  });
  it('rules for the other track never leak across', () => {
    const c = defaultProfile('career');
    const r = assess(c, { ...templateAnswers(c, 'high'), c_r2: 'overdue' });
    for (const id of matchToolkitIds(r, c, DEFAULT_RULES)) {
      const t = TOOLKIT_TEMPLATES.find((x) => x.id === id)!;
      expect(['career', 'both']).toContain(t.track);
    }
  });
});
