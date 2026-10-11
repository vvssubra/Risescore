import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { AGE_BANDS, CAREER_GOALS, DEPENDANTS, FIN_GOALS, ROLES, SWITCH_INTENT } from '../src/shared/profile.ts';
import { SKIP, questionsFor } from '../src/shared/engine.ts';
import type { Answers, Profile, Track } from '../src/shared/types.ts';

const require = createRequire(import.meta.url);
/** Verbatim v2.0 engine + v3 toolkit matcher extracted from the supplied prototype (golden reference). */
export const ref = require('./reference/load.cjs') as {
  RISE: {
    assess(p: Profile, a: Answers): any;
    questionsFor(p: Profile): any[];
    modulesFor(p: Profile): string[];
    templateAnswers(p: Profile, k: string): Answers;
    QUESTIONS: any;
    MODULES: any;
  };
  RISE_TOOLKITS: { CATALOG: any[]; FLAG_KITS: Record<string, string>; PRIMARY: any; match(r: any, p: any, extra?: string[]): any[] };
};

/** Small deterministic PRNG so "random" failures are reproducible. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T>(rnd: () => number, arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];

export function randomProfile(rnd: () => number, track?: Track): Profile {
  const t: Track = track ?? (rnd() < 0.5 ? 'financial' : 'career');
  return {
    track: t,
    role: pick(rnd, ROLES)[0],
    ageBand: pick(rnd, AGE_BANDS)[0],
    dependants: pick(rnd, DEPENDANTS)[0],
    goal: pick(rnd, t === 'financial' ? FIN_GOALS : CAREER_GOALS)[0],
    switchIntent: pick(rnd, SWITCH_INTENT)[0],
  };
}

/** Random answers for ACTIVE questions only: a real option, "not sure", or left unanswered. */
export function randomAnswers(rnd: () => number, profile: Profile): Answers {
  const a: Answers = {};
  for (const q of questionsFor(profile)) {
    const r = rnd();
    if (r < 0.08) continue;
    if (r < 0.2) a[q.id] = SKIP;
    else a[q.id] = pick(rnd, q.options).key;
  }
  return a;
}

export function parseCsv(path: string): Record<string, string>[] {
  const text = readFileSync(path, 'utf8');
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
