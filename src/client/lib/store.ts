import { defaultProfile } from '../../shared/profile.ts';
import type { Answers, PreviewResult, Profile, Question, Track } from '../../shared/types.ts';
import type { ReportView } from './api.ts';

export type Stage = 'welcome' | 'track' | 'profile' | 'question' | 'submitting' | 'preview' | 'gate' | 'pending' | 'report-loading' | 'report' | 'report-error' | 'deleted';

export interface State {
  stage: Stage;
  track: Track | null;
  profile: Profile;
  profileIndex: number;
  /** which profile questions the person has actually chosen (defaults are pre-filled but not shown as chosen) */
  profileAnswered: Record<string, boolean>;
  queue: Question[];
  questionIndex: number;
  answers: Answers;
  assessment: { id: string; sessionToken: string; preview: PreviewResult } | null;
  report: ReportView | null;
  reportToken: string | null;
  gate: { firstName: string; email: string; consent: boolean; marketing: boolean; busy: boolean; error: string };
  pendingEmail: string;
  error: string;
  autoAdvance: boolean;
  depth: number;
}

export const fresh = (): State => ({
  stage: 'welcome', track: null, profile: defaultProfile('financial'), profileIndex: 0, profileAnswered: {}, queue: [], questionIndex: 0, answers: {},
  assessment: null, report: null, reportToken: null,
  gate: { firstName: '', email: '', consent: false, marketing: false, busy: false, error: '' },
  pendingEmail: '', error: '', autoAdvance: true, depth: 0,
});

export const state: State = fresh();
export function reset(keepAuto = true) { const auto = state.autoAdvance; Object.assign(state, fresh()); if (keepAuto) state.autoAdvance = auto; }

/** Only the in-progress assessment is kept in sessionStorage (tab-scoped, cleared when the tab closes). Never contact details or report tokens. */
export function snapshot() {
  return {
    stage: state.stage, track: state.track, profile: state.profile, profileIndex: state.profileIndex, profileAnswered: state.profileAnswered, questionIndex: state.questionIndex,
    answers: state.answers, assessment: state.assessment, autoAdvance: state.autoAdvance,
  };
}
