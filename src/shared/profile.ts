import type { Profile, Track } from './types.ts';

export type Choice = readonly [key: string, label: string];

export const ROLES: Choice[] = [
  ['employee', 'Employee or professional'],
  ['insurance_agent', 'Insurance or takaful agent'],
  ['property_agent', 'Property agent'],
  ['business_owner', 'Business owner / entrepreneur'],
  ['self_employed', 'Freelancer / self-employed'],
  ['retired', 'Retired'],
  ['other', 'Other / exploring'],
];

export const AGE_BANDS: Choice[] = [
  ['18_20', '18–20'],
  ['21_24', '21–24'],
  ['25_34', '25–34'],
  ['35_44', '35–44'],
  ['45_54', '45–54'],
  ['55_64', '55–64'],
  ['65_plus', '65 or above'],
];

export const DEPENDANTS: Choice[] = [
  ['yes', 'Yes'],
  ['no', 'No'],
  ['unsure', 'Not sure / prefer not to say'],
];

export const FIN_GOALS: Choice[] = [
  ['security', 'Financial stability and security'],
  ['income', 'Improve household income'],
  ['investing', 'Investing and diversification'],
  ['property', 'Property and liquidity'],
  ['business', 'Business ownership or expansion'],
  ['preschool', 'Education / preschool investment'],
  ['legacy', 'Financial independence and legacy'],
];

export const CAREER_GOALS: Choice[] = [
  ['income', 'Grow current earning power'],
  ['career_change', 'Explore a different career'],
  ['unit_trust', 'Unit trust / PRS professional pathway'],
  ['business', 'Build or expand a business'],
  ['preschool', 'Education / preschool business'],
  ['leadership', 'Build a high-performing team'],
  ['security', 'Stabilise my current income'],
];

export const SWITCH_INTENT: Choice[] = [
  ['yes', 'Yes, within the next 6 months'],
  ['maybe', 'Possibly, still exploring'],
  ['no', 'No'],
];

export interface ProfileStep {
  key: Exclude<keyof Profile, 'track'>;
  title: string;
  help: string;
}

export const PROFILE_STEPS: Record<Exclude<keyof Profile, 'track'>, Omit<ProfileStep, 'key'>> = {
  role: {
    title: 'What best describes your current situation?',
    help: 'Your work situation helps us ask relevant follow-up questions.',
  },
  ageBand: {
    title: 'Which age group are you in?',
    help: 'Age adds context; it does not determine your score or automatically define your priorities.',
  },
  dependants: {
    title: 'Does someone rely on your income or care?',
    help: 'This helps us understand whether family protection may deserve attention.',
  },
  goal: {
    title: 'What would you most like to improve?',
    help: 'Select the topic most relevant to you today. Your actual results can point to another priority.',
  },
  switchIntent: {
    title: 'Are you considering a move to variable or commission-based earnings?',
    help: 'We use this to assess whether a transition plan may be useful.',
  },
};

export function profileKeys(track: Track): ProfileStep['key'][] {
  return ['role', 'ageBand', 'dependants', 'goal', ...(track === 'career' ? (['switchIntent'] as const) : [])];
}

export function choicesFor(key: ProfileStep['key'], track: Track): Choice[] {
  switch (key) {
    case 'role': return ROLES;
    case 'ageBand': return AGE_BANDS;
    case 'dependants': return DEPENDANTS;
    case 'goal': return track === 'financial' ? FIN_GOALS : CAREER_GOALS;
    case 'switchIntent': return SWITCH_INTENT;
  }
}

export function defaultProfile(track: Track): Profile {
  return {
    track,
    role: 'employee',
    ageBand: '25_34',
    dependants: 'unsure',
    goal: track === 'financial' ? 'security' : 'income',
    switchIntent: 'no',
  };
}

/** Returns an error message, or null if every profile field is an allowed value for the track. */
export function validateProfile(p: unknown): string | null {
  if (!p || typeof p !== 'object') return 'Profile is required.';
  const prof = p as Record<string, unknown>;
  if (prof.track !== 'financial' && prof.track !== 'career') return 'Select a valid scorecard.';
  const track = prof.track as Track;
  for (const key of ['role', 'ageBand', 'dependants', 'goal', 'switchIntent'] as const) {
    const allowed = choicesFor(key, track).map((c) => c[0]);
    if (typeof prof[key] !== 'string' || !allowed.includes(prof[key] as string)) {
      return `Invalid profile value for ${key}.`;
    }
  }
  return null;
}
