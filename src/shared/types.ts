export type Track = 'financial' | 'career';
export type PillarKey = 'R' | 'I' | 'S' | 'E';
export type ModuleKey = 'financial_investing' | 'career_industry' | 'career_switch';

export type AlertId =
  | 'cash_crisis'
  | 'debt_arrears'
  | 'fragile_buffer'
  | 'dependent_cover'
  | 'investing_essential'
  | 'concentration'
  | 'career_arrears'
  | 'switch_runway';

/** The eight V4.3 toolkits. A report may unlock at most two of them. */
export type ToolkitId = 'TK01' | 'TK02' | 'TK03' | 'TK04' | 'TK05' | 'TK06' | 'TK07' | 'TK08';

export type PriorityKind = 'flag' | 'score' | 'maintain';

/** One of at most two evidence-based next steps, each tied to exactly one toolkit. */
export interface Priority {
  number: number;
  pillar: PillarKey;
  pillarName: string;
  title: string;
  reason: string;
  toolkit: ToolkitId;
  kind: PriorityKind;
  actions: string[];
}

export interface Option {
  key: string;
  label: string;
  /** null = "unknown" (or "not applicable" when key === 'na'); never treated as zero. */
  score: number | null;
}

export interface Question {
  id: string;
  pillar: PillarKey;
  text: string;
  options: Option[];
  weight: number;
  tip: string;
  na: boolean;
}

/** Profile answers only route modules and alerts. They never change a pillar score directly. */
export interface Profile {
  track: Track;
  role: string;
  ageBand: string;
  dependants: string;
  goal: string;
  switchIntent: string;
}

export type Answers = Record<string, string>;

export interface PillarStat {
  name: string;
  score: number | null;
  coverage: number;
  answered: number;
  eligible: number;
  level: string;
}

export interface AlertItem {
  id: AlertId;
  severity: number;
  pillar: PillarKey;
  title: string;
  reason: string;
  steps: string[];
}

export interface PlanView {
  title: string;
  toolkit: string;
  steps: string[];
}

export interface AssessmentResult {
  version: string;
  track: Track;
  overall: number | null;
  complete: boolean;
  confidence: number;
  byPillar: Record<PillarKey, PillarStat>;
  priority: PillarKey;
  priorityName: string;
  headline: string;
  priorityReason: string;
  severity: number;
  alerts: AlertItem[];
  plan: PlanView;
  steps: string[];
  reasons: { question: string; response: string; score: number }[];
  /** One or two priorities. Empty only when too few answers were given to identify any. */
  priorities: Priority[];
  modules: { module: ModuleKey; answered: number; total: number }[];
  unknown: string[];
  disclaimer: string;
}

/** What anyone may see before giving contact details. No alerts detail, steps or toolkits. */
export interface PreviewResult {
  version: string;
  track: Track;
  overall: number | null;
  complete: boolean;
  confidence: number;
  byPillar: Record<PillarKey, Pick<PillarStat, 'name' | 'score'>>;
  priority: PillarKey;
  priorityName: string;
  headline: string;
  priorityReason: string;
}
