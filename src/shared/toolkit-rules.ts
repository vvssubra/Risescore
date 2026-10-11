/**
 * Toolkit matching rules as DATA so Balla DK can change them from the admin console without code edits.
 * `DEFAULT_RULES` reproduces the prototype's RISE_TOOLKITS.match() behaviour exactly (see tests/toolkits.test.ts).
 *
 * Evaluation order (mirrors the prototype):
 *   1. fallback  — only when the snapshot is too incomplete to score: returns just the fallback toolkit.
 *   2. alert     — for each of the top 3 alerts (already severity-sorted), the toolkit mapped to that alert.
 *   3. primary   — the "all strong, no alerts" annual review, otherwise the toolkit for the priority pillar.
 *   4. profile   — extra specialist toolkits chosen by goal / role / dependants.
 * The first 3 distinct, available toolkits win. Severe alerts therefore always take precedence.
 */
import type { AlertId, AssessmentResult, PillarKey, Profile, Track } from './types.ts';
import { FALLBACK_TOOLKIT_ID } from './toolkit-templates.ts';

export type RuleStage = 'fallback' | 'alert' | 'primary' | 'profile';

export interface RuleCondition {
  alert?: AlertId;
  priority?: PillarKey;
  /** true = complete result, every pillar >= 80 and no alerts. */
  allStrong?: boolean;
  goals?: string[];
  roles?: string[];
  dependants?: string;
}

export interface MatchRule {
  id: string;
  toolkitId: string;
  stage: RuleStage;
  track: Track | 'both';
  order: number;
  active: boolean;
  when: RuleCondition;
}

export const MAX_MATCHES = 3;
export const STAGE_RANK: Record<RuleStage, number> = { fallback: 0, alert: 1, primary: 2, profile: 3 };

const alertRule = (n: number, alert: AlertId, toolkitId: string, track: Track): MatchRule => ({
  id: `default-alert-${alert}`, toolkitId, stage: 'alert', track, order: n, active: true, when: { alert },
});
const primaryRule = (track: Track, priority: PillarKey, toolkitId: string, n: number): MatchRule => ({
  id: `default-primary-${track}-${priority}`, toolkitId, stage: 'primary', track, order: n, active: true, when: { priority },
});

export const DEFAULT_RULES: MatchRule[] = [
  { id: 'default-fallback', toolkitId: FALLBACK_TOOLKIT_ID, stage: 'fallback', track: 'both', order: 0, active: true, when: {} },
  alertRule(1, 'cash_crisis', 'financial-reset', 'financial'),
  alertRule(2, 'debt_arrears', 'financial-reset', 'financial'),
  alertRule(3, 'fragile_buffer', 'financial-reset', 'financial'),
  alertRule(4, 'dependent_cover', 'family-protection', 'financial'),
  alertRule(5, 'investing_essential', 'asset-liquidity', 'financial'),
  alertRule(6, 'concentration', 'asset-liquidity', 'financial'),
  alertRule(7, 'business_feasibility', 'preschool-due-diligence', 'financial'),
  alertRule(8, 'career_arrears', 'career-runway', 'career'),
  alertRule(9, 'switch_runway', 'career-runway', 'career'),
  alertRule(10, 'sales_authorisation', 'industry-credentials', 'career'),
  alertRule(11, 'unit_trust_age', 'industry-credentials', 'career'),
  alertRule(12, 'weak_business_model', 'unit-economics', 'career'),
  { id: 'default-primary-annual', toolkitId: 'annual-review', stage: 'primary', track: 'both', order: 0, active: true, when: { allStrong: true } },
  primaryRule('financial', 'R', 'financial-reset', 1),
  primaryRule('financial', 'I', 'second-income', 2),
  primaryRule('financial', 'S', 'asset-liquidity', 3),
  primaryRule('financial', 'E', 'family-continuity', 4),
  primaryRule('career', 'R', 'career-runway', 5),
  primaryRule('career', 'I', 'income-skills', 6),
  primaryRule('career', 'S', 'pipeline-systems', 7),
  primaryRule('career', 'E', 'leadership-5r', 8),
  { id: 'default-profile-fin-business', toolkitId: 'preschool-due-diligence', stage: 'profile', track: 'financial', order: 1, active: true, when: { goals: ['business', 'preschool'] } },
  { id: 'default-profile-fin-dependants', toolkitId: 'family-protection', stage: 'profile', track: 'financial', order: 2, active: true, when: { dependants: 'yes', priority: 'R' } },
  { id: 'default-profile-career-unittrust', toolkitId: 'industry-credentials', stage: 'profile', track: 'career', order: 3, active: true, when: { goals: ['unit_trust'] } },
  { id: 'default-profile-career-owner', toolkitId: 'unit-economics', stage: 'profile', track: 'career', order: 4, active: true, when: { roles: ['business_owner'] } },
];

function isAllStrong(r: AssessmentResult): boolean {
  return r.complete && Object.values(r.byPillar).every((x) => x.score !== null && x.score >= 80) && r.alerts.length === 0;
}

function isUnscorable(r: AssessmentResult): boolean {
  return !r.complete && r.alerts.length === 0 && Object.values(r.byPillar).every((x) => x.score === null);
}

function trackOk(rule: MatchRule, track: Track): boolean {
  return rule.track === 'both' || rule.track === track;
}

function profileConditionOk(w: RuleCondition, profile: Profile, report: AssessmentResult): boolean {
  if (w.goals && !w.goals.includes(profile.goal)) return false;
  if (w.roles && !w.roles.includes(profile.role)) return false;
  if (w.dependants !== undefined && profile.dependants !== w.dependants) return false;
  if (w.priority !== undefined && report.priority !== w.priority) return false;
  return true;
}

/**
 * Returns toolkit ids in display order. `available` (optional) restricts results to toolkits that are
 * currently active and have publishable content; unavailable ones are skipped BEFORE the cap of 3 so a
 * deactivated toolkit never leaves a hole. If nothing remains, the fallback toolkit is returned.
 */
export function matchToolkitIds(
  report: AssessmentResult,
  profile: Profile,
  rules: MatchRule[],
  available?: ReadonlySet<string>,
): string[] {
  const live = rules
    .filter((r) => r.active && trackOk(r, report.track))
    .sort((a, b) => STAGE_RANK[a.stage] - STAGE_RANK[b.stage] || a.order - b.order || a.id.localeCompare(b.id));
  const ok = (id: string) => !available || available.has(id);
  const fallback = (): string[] => {
    const fb = live.filter((r) => r.stage === 'fallback' && ok(r.toolkitId)).map((r) => r.toolkitId);
    if (fb.length) return [fb[0]];
    return [FALLBACK_TOOLKIT_ID];
  };

  if (isUnscorable(report)) return fallback();

  const ids: string[] = [];
  const add = (id: string) => {
    if (id && ok(id) && !ids.includes(id)) ids.push(id);
  };

  for (const alert of report.alerts.slice(0, 3)) {
    for (const r of live) if (r.stage === 'alert' && r.when.alert === alert.id) add(r.toolkitId);
  }

  const strong = isAllStrong(report);
  for (const r of live) {
    if (r.stage !== 'primary') continue;
    if (strong ? r.when.allStrong === true : r.when.allStrong !== true && r.when.priority === report.priority) add(r.toolkitId);
  }

  for (const r of live) {
    if (r.stage === 'profile' && profileConditionOk(r.when, profile, report)) add(r.toolkitId);
  }

  const out = ids.slice(0, MAX_MATCHES);
  return out.length ? out : fallback();
}
