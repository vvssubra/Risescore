import type { FullReport } from '../../server/services/reports.ts';
import type { Locale } from '../../shared/legal.ts';
import type { Answers, PreviewResult, Profile } from '../../shared/types.ts';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public retryAfter?: number) { super(message); }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { method, headers: body !== undefined ? { 'content-type': 'application/json' } : undefined, body: body !== undefined ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, 'network', 'network');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'error', data.message ?? 'Request failed', data.retryAfterSeconds);
  return data as T;
}

export interface PublicConfig {
  scorecardVersion: string; privacyNoticeVersion: string; marketingNoticeVersion: string; privacyNoticeStatus: 'draft' | 'approved';
  reportAccessMode: 'immediate' | 'email_verified'; whatsappNumber: string; reportTtlDays: number;
}
export interface Notice { title: string; intro: string; sections: { heading: string; body: string[] }[] }
export interface Legal { version: string; status: string; notice: Record<Locale, Notice>; consent: Record<'processing' | 'marketing', Record<Locale, string>> }
export type ReportView = FullReport;

export const api = {
  config: () => call<PublicConfig>('GET', '/api/config'),
  legal: () => call<Legal>('GET', '/api/legal'),
  createAssessment: (profile: Profile, answers: Answers) =>
    call<{ id: string; sessionToken: string; expiresAt: string; preview: PreviewResult }>('POST', '/api/assessments', { profile, answers }),
  requestReport: (body: Record<string, unknown>) =>
    call<{ status: 'ready' | 'pending_verification'; reportToken?: string; reportPath?: string }>('POST', '/api/report-requests', body),
  verify: (token: string) => call<{ reportToken: string; reportPath: string }>('POST', '/api/reports/verify', { token }),
  report: (token: string) => call<ReportView>('GET', `/api/reports/${encodeURIComponent(token)}`),
  erase: (token: string) => call<void>('DELETE', `/api/reports/${encodeURIComponent(token)}`),
  setMarketing: (token: string, optIn: boolean) => call<{ marketingOptIn: boolean }>('POST', `/api/reports/${encodeURIComponent(token)}/marketing`, { optIn }),
};
