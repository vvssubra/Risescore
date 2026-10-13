import { SKIP, isHidden, isMultiSelect, questionsFor } from '../../shared/engine.ts';
import { EXCLUSIVE_KEYS } from '../../shared/questions.ts';
import type { Answers, Question } from '../../shared/types.ts';
import { state } from './store.ts';

/** Follow-up questions an earlier answer makes irrelevant. Changing the parent answer clears them. */
const CHILDREN: Readonly<Record<string, readonly string[]>> = {
  f_r4: ['f_policy_types', 'f_policy_review'],
  f_has_savings: ['f_savings_place'],
};

export const visibleQueue = (): Question[] => state.queue.filter((q) => !isHidden(q.id, state.answers));

/** 1-based position of the current question among the questions the person actually sees. */
export function visiblePosition(): { n: number; total: number } {
  const vis = visibleQueue();
  const cur = state.queue[state.questionIndex];
  return { n: Math.max(1, vis.findIndex((q) => q.id === cur?.id) + 1), total: vis.length };
}

/** Next/previous index in `state.queue` that is not hidden, or -1. */
export function stepIndex(from: number, dir: 1 | -1): number {
  for (let i = from + dir; i >= 0 && i < state.queue.length; i += dir) {
    if (!isHidden(state.queue[i].id, state.answers)) return i;
  }
  return -1;
}

/** First visible question with no answer at all ("I'm not sure" counts as answered), or -1. */
export function firstUnanswered(): number {
  return state.queue.findIndex((q) => !isHidden(q.id, state.answers) && state.answers[q.id] === undefined);
}

/** Rebuild the queue after a profile change, dropping answers to questions that no longer apply. */
export function rebuildQueue(): void {
  state.queue = questionsFor(state.profile);
  const ids = new Set(state.queue.map((q) => q.id));
  state.answers = Object.fromEntries(Object.entries(state.answers).filter(([k]) => ids.has(k)));
}

/** Single-choice answer. Changing a parent answer clears its follow-ups so stale choices are never submitted. */
export function setAnswer(id: string, value: string): void {
  const before = state.answers[id];
  const next: Answers = { ...state.answers, [id]: value };
  if (before !== value) for (const child of CHILDREN[id] ?? []) delete next[child];
  state.answers = next;
}

export const multiValues = (id: string): string[] => {
  const v = state.answers[id];
  return v && v !== SKIP ? v.split('|') : [];
};

/**
 * Toggle one choice of a multi-select question. "None / not sure" style choices are exclusive.
 * Choosing "Actually, I do not have insurance" corrects the parent answer and hides the follow-ups.
 */
export function toggleMulti(id: string, key: string): void {
  const current = multiValues(id);
  let values: string[];
  if (EXCLUSIVE_KEYS.includes(key)) values = current.includes(key) ? [] : [key];
  else {
    const rest = current.filter((k) => !EXCLUSIVE_KEYS.includes(k));
    values = rest.includes(key) ? rest.filter((k) => k !== key) : [...rest, key];
  }
  if (id === 'f_policy_types' && key === 'none' && values.length) {
    setAnswer('f_r4', 'none');
    return;
  }
  const next: Answers = { ...state.answers };
  if (values.length) next[id] = values.join('|'); else delete next[id];
  state.answers = next;
}

export const isMulti = (q: Question) => isMultiSelect(q.id);

/** Only the answers the server will accept: active for the profile and not hidden by an earlier answer. */
export function submittableAnswers(): Answers {
  const ids = new Set(visibleQueue().map((q) => q.id));
  return Object.fromEntries(Object.entries(state.answers).filter(([k]) => ids.has(k)));
}
