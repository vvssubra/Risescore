/**
 * In-browser stand-in for the server API, used only by the demo build. It runs the SAME engine, question bank,
 * two-priority logic, V4.3 planners and legal text as the real app, so results are real. Nothing leaves the page.
 * (The demo bundles all eight planners because it is a local, offline design artefact — never host it publicly.)
 */
import { entitledToolkits } from '../src/shared/priorities.ts';
import { SCORECARD_VERSION } from '../src/shared/questions.ts';
import { WORKBOOKS } from '../src/server/workbooks.ts';
import { CONSENT_TEXT, MARKETING_NOTICE_VERSION, PRIVACY_NOTICE_STATUS, PRIVACY_NOTICE_VERSION, privacyNotice } from '../src/shared/legal.ts';
import { EngineError, assess, validateAnswers } from '../src/shared/engine.ts';
import { validateProfile } from '../src/shared/profile.ts';
import type { Answers, AssessmentResult, PillarKey, Profile } from '../src/shared/types.ts';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public retryAfter?: number) { super(message); }
}
export type { Legal, Notice, PublicConfig, ReportView } from '../src/client/lib/api.ts';

const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, '0')).join('');
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const DAY = 86_400_000;

interface Stored { profile: Profile; answers: Answers; result: AssessmentResult }
const assessments = new Map<string, Stored & { token: string }>();
const reports = new Map<string, { id: string; firstName: string; marketing: boolean; expires: string }>();

function preview(r: AssessmentResult) {
  const byPillar = {} as Record<PillarKey, { name: string; score: number | null }>;
  for (const k of ['R', 'I', 'S', 'E'] as PillarKey[]) byPillar[k] = { name: r.byPillar[k].name, score: r.byPillar[k].score };
  return { version: r.version, track: r.track, overall: r.overall, complete: r.complete, confidence: r.confidence, byPillar, priority: r.priority, priorityName: r.priorityName, headline: r.headline, priorityReason: r.priorityReason };
}

export const api = {
  async config() {
    return { scorecardVersion: SCORECARD_VERSION, privacyNoticeVersion: PRIVACY_NOTICE_VERSION, marketingNoticeVersion: MARKETING_NOTICE_VERSION, privacyNoticeStatus: PRIVACY_NOTICE_STATUS, reportAccessMode: 'immediate' as const, whatsappNumber: '60122202217', reportTtlDays: 30 };
  },
  async legal() {
    const p = { assessmentDays: 90, reportDays: 365, handoverHours: 48 };
    return { version: PRIVACY_NOTICE_VERSION, status: PRIVACY_NOTICE_STATUS, notice: { en: privacyNotice('en', p), ms: privacyNotice('ms', p) }, consent: CONSENT_TEXT };
  },
  async createAssessment(profile: Profile, answers: Answers) {
    await wait(350);
    const perr = validateProfile(profile);
    if (perr) throw new ApiError(400, 'invalid_profile', perr);
    try {
      const clean = validateAnswers(profile, answers);
      const result = assess(profile, clean);
      const id = rid(), token = rid();
      assessments.set(id, { profile, answers: clean, result, token });
      return { id, sessionToken: token, expiresAt: new Date(Date.now() + 90 * DAY).toISOString(), preview: preview(result) };
    } catch (e) {
      if (e instanceof EngineError) throw new ApiError(400, 'invalid_answers', e.message);
      throw e;
    }
  },
  async requestReport(body: Record<string, unknown>) {
    await wait(450);
    const a = assessments.get(String(body.assessmentId));
    if (!a || a.token !== body.sessionToken) throw new ApiError(404, 'assessment_not_found', 'Assessment not found.');
    if (body.processingConsent !== true) throw new ApiError(400, 'validation', 'Processing consent is required.');
    const token = rid();
    reports.set(token, { id: String(body.assessmentId), firstName: String(body.firstName), marketing: !!body.marketingOptIn, expires: new Date(Date.now() + 30 * DAY).toISOString() });
    return { status: 'ready' as const, reportToken: token, reportPath: `/report/${token}` };
  },
  async verify(_t: string): Promise<{ reportToken: string; reportPath: string }> { throw new ApiError(410, 'link_expired', 'Not used in the demo.'); },
  async report(token: string) {
    await wait(200);
    const r = reports.get(token);
    const a = r && assessments.get(r.id);
    if (!r || !a) throw new ApiError(404, 'report_not_found', 'Report not found.');
    const result = assess(a.profile, a.answers);
    const toolkits = entitledToolkits(result)
      .map((id) => WORKBOOKS.find((w) => w.id === id)!)
      .map((w) => ({ id: w.id, title: w.title, sub: w.subtitle, minutes: w.minutes, track: w.track as string, pillar: w.pillar as string, workbook: w, pdf: null }));
    return {
      generatedAt: new Date().toISOString(), expiresAt: r.expires, firstName: r.firstName, profile: { track: a.profile.track, goal: a.profile.goal },
      result, toolkits, consent: { marketingOptIn: r.marketing }, whatsapp: { number: '60122202217' },
    };
  },
  async createHandover(_token: string) {
    await wait(300);
    const message = 'Demo only — in the live app this message contains your name, score, priority titles and a private staff-only link.';
    return { url: '#', expiresAt: new Date(Date.now() + 2 * DAY).toISOString(), message, whatsappUrl: `https://wa.me/60122202217?text=${encodeURIComponent(message)}` };
  },
  async revokeHandover(_token: string) { await wait(150); },
  async erase(token: string) { const r = reports.get(token); if (r) { assessments.delete(r.id); reports.delete(token); } },
  async setMarketing(token: string, optIn: boolean) { const r = reports.get(token); if (!r) throw new ApiError(404, 'report_not_found', 'Report not found.'); r.marketing = optIn; return { marketingOptIn: optIn }; },
};
