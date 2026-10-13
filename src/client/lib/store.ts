import { defaultProfile } from '../../shared/profile.ts';
import type { Answers, PreviewResult, Profile, Question, Track } from '../../shared/types.ts';
import type { WorkbookState } from '../../shared/workbook.ts';
import type { HandoverView, ReportView } from './api.ts';

export type Stage = 'welcome' | 'track' | 'profile' | 'question' | 'review' | 'submitting' | 'preview' | 'gate' | 'pending' | 'report-loading' | 'report' | 'report-error' | 'deleted' | 'toolkit';

/** The interactive planner currently open from the report. Entries live in memory only unless the person saves them on this device. */
export interface PlannerState { id: string; step: number; values: WorkbookState }

export interface State {
  stage: Stage;
  track: Track | null;
  profile: Profile;
  profileIndex: number;
  /** which profile questions the person has actually chosen (defaults are pre-filled but not shown as chosen) */
  profileAnswered: Record<string, boolean>;
  /** Every question that applies to the profile; follow-ups hidden by an earlier answer are skipped while navigating. */
  queue: Question[];
  questionIndex: number;
  /** Set while changing one answer from the answer-review screen: Continue returns there. */
  returnToReview: boolean;
  answers: Answers;
  assessment: { id: string; sessionToken: string; preview: PreviewResult } | null;
  report: ReportView | null;
  reportToken: string | null;
  planner: PlannerState | null;
  handover: HandoverView | null;
  gate: { firstName: string; email: string; consent: boolean; marketing: boolean; busy: boolean; error: string };
  pendingEmail: string;
  error: string;
  autoAdvance: boolean;
  depth: number;
}

export const fresh = (): State => ({
  stage: 'welcome', track: null, profile: defaultProfile('financial'), profileIndex: 0, profileAnswered: {}, queue: [], questionIndex: 0, returnToReview: false, answers: {},
  assessment: null, report: null, reportToken: null, planner: null, handover: null,
  gate: { firstName: '', email: '', consent: false, marketing: false, busy: false, error: '' },
  pendingEmail: '', error: '', autoAdvance: true, depth: 0,
});

export const state: State = fresh();
export function reset(keepAuto = true) { const auto = state.autoAdvance; Object.assign(state, fresh()); if (keepAuto) state.autoAdvance = auto; }

/** Only the in-progress assessment is kept in sessionStorage (tab-scoped, cleared when the tab closes). Never contact details or report tokens. */
export function snapshot() {
  return {
    stage: state.stage, track: state.track, profile: state.profile, profileIndex: state.profileIndex, profileAnswered: state.profileAnswered, questionIndex: state.questionIndex, returnToReview: state.returnToReview,
    answers: state.answers, assessment: state.assessment, autoAdvance: state.autoAdvance,
  };
}
