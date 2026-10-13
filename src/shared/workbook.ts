/**
 * V4.3 interactive planner: types and the live "your numbers" calculations (port of the V4.3 workbooks.js
 * `calculate`). Pure and content-free, so it can ship in the browser bundle; the workbook TEXT is served
 * per report from the server (src/server/workbooks.ts).
 */
import type { PillarKey, ToolkitId, Track } from './types.ts';

export type FieldKind = 'money' | 'number' | 'text' | 'checkbox' | 'select';

export interface WorkbookField {
  id: string;
  label: string;
  kind: FieldKind;
  /** [value, label] pairs, only for kind === 'select'. */
  options?: [string, string][];
}

export interface Workbook {
  id: ToolkitId;
  title: string;
  subtitle: string;
  track: Track | 'both';
  pillar: PillarKey;
  minutes: string;
  promise: string;
  prep: string;
  check: string[];
  snapshotTip: string;
  mathTitle: string;
  mathIntro: string;
  mathExample: string;
  mathRead: string;
  mathPause: string;
  /** [name, detail] choices compared in step 4. */
  options: [string, string][];
  compare: string[];
  askBefore: string[];
  /** [week label, title, detail] for the 30-day plan. */
  weeks: [string, string, string][];
  reflect: string[];
  help: string;
  questions: string[];
  fields: WorkbookField[];
}

/** What the user typed or ticked, keyed by field id (plus free-text note keys). Never sent to the server. */
export type WorkbookState = Readonly<Record<string, string | boolean>>;

export interface CalcLine {
  title: string;
  result: string;
  detail: string;
  warn: boolean;
}

export const WORKBOOK_STEPS = ['Start here', 'Your situation', 'Work out the numbers', 'Compare your choices', 'Your 30-day plan', 'Review & save'] as const;

export const rm = (n: number): string => `RM ${Number(n).toLocaleString('en-MY', { maximumFractionDigits: 2 })}`;

/** A non-negative number, or null when empty/invalid — an empty field is never treated as zero. */
export function numberOf(state: WorkbookState, key: string): number | null {
  const raw = state[key];
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const valueOr = (n: number | null) => (n === null ? 'Add your numbers' : rm(n));

type Calc = (v: (k: string) => number | null, s: WorkbookState, add: (title: string, result: string, detail: string, warn?: boolean) => void) => void;

const CALCS: Record<ToolkitId, Calc> = {
  TK01: (v, _s, add) => {
    const r = v('revenue'), c = v('costs'), hours = v('hours'), target = v('target');
    const net = r !== null && c !== null ? r - c : null;
    add('Money you keep each month', net === null ? 'Add income and costs' : rm(net), 'Expected money in minus work costs', net !== null && net < 0);
    add('Money kept per hour', net !== null && hours !== null && hours > 0 ? rm(net / hours) : 'Add hours', 'Money after costs, divided by hours');
    if (net !== null && target !== null) add('Compared with your extra-income goal', rm(net - target), 'Positive means above target; negative means a shortfall');
  },
  TK02: (v, s, add) => {
    const types = ['medical', 'life', 'accident', 'critical', 'employer'].filter((k) => !!s[k]);
    add('Coverage types you selected', types.length ? `${types.length} recorded` : 'Add what you have', 'Having insurance does not confirm the amount is enough');
    const life = v('lifeCover');
    if (life !== null) add('Life coverage you can confirm', rm(life), 'Information to verify against policy documents');
    add('Next best step', 'Check your documents', 'Review coverage limits, exclusions, dependants and beneficiaries. Do not use this tool to choose a product.');
  },
  TK03: (v, s, add) => {
    const essentials = v('essentials'), available = v('available'), monthly = v('monthly');
    const months = Number(s.months || 6);
    const target = essentials === null ? null : essentials * months;
    const short = target !== null && available !== null ? Math.max(0, target - available) : null;
    add('Your savings goal', valueOr(target), `${months} months of essential spending`);
    add('Months you could cover today', essentials !== null && essentials > 0 && available !== null ? `${(available / essentials).toFixed(1)} months` : 'Add your numbers', 'Using accessible money only');
    add('Still to save', valueOr(short), 'Savings goal minus money available');
    add('Time to goal', short !== null && monthly !== null && monthly > 0 ? `${Math.ceil(short / monthly)} months` : 'Add a monthly saving amount', 'Assumes steady saving, no withdrawals or interest');
  },
  TK04: (v, s, add) => {
    const a = v('income'), b = v('essentials'), c = v('debt'), d = v('other');
    const left = a !== null && b !== null && c !== null && d !== null ? a - b - c - d : null;
    add('Money left this month', valueOr(left), 'Income minus essentials, minimum debt payments and other spending', left !== null && left < 0);
    if (a !== null && a > 0 && c !== null) add('Debt payments as a share of income', `${((100 * c) / a).toFixed(1)}%`, 'For awareness only; not a credit or suitability score');
    if (s.late === 'yes') add('Important', 'Contact lenders or a debt-support service', 'Avoid taking new risky commitments while essentials are overdue', true);
  },
  TK05: (v, _s, add) => {
    const a = v('largest'), b = v('total'), short = v('shortNeed'), liquid = v('liquid');
    add('Share in your largest holding', a !== null && b !== null && b > 0 ? `${((100 * a) / b).toFixed(1)}%` : 'Add investment values', 'A high percentage invites further review; it is not a pass/fail score');
    const both = short !== null && liquid !== null;
    add('Short-term cash difference', both ? rm(liquid - short) : 'Add your numbers', 'Accessible money minus money needed within 12 months', both && liquid < short);
  },
  TK06: (v, _s, add) => {
    const reserve = v('reserve'), cost = v('essentials'), setup = v('setup');
    const remain = reserve !== null && setup !== null ? Math.max(0, reserve - setup) : null;
    add('Months of living-cost backup', remain !== null && cost !== null && cost > 0 ? `${(remain / cost).toFixed(1)} months` : 'Add savings and monthly needs', 'After allowing for estimated training and travel costs');
    const newpay = v('newpay'), old = v('pay');
    if (newpay !== null && old !== null) add('Difference in monthly pay', rm(newpay - old), 'Conservative new-pay estimate minus current pay; not guaranteed earnings');
  },
  TK07: (v, _s, add) => {
    const p = v('price'), c = v('variable'), fixed = v('fixed'), slow = v('slow');
    const unit = p !== null && c !== null ? p - c : null;
    add('Money left per customer', valueOr(unit), 'Selling price minus direct cost', unit !== null && unit <= 0);
    const breakeven = unit !== null && unit > 0 && fixed !== null ? Math.ceil(fixed / unit) : null;
    add('Customers needed to cover fixed costs', breakeven === null ? 'Add price and costs' : `${breakeven} per month`, 'This covers fixed costs only, not one-time setup, taxes or financing');
    if (unit !== null && fixed !== null && slow !== null) add('Slow-month result', rm(unit * slow - fixed), 'After direct and fixed costs; before other costs', unit * slow - fixed < 0);
    const capital = v('capital'), setup = v('setup'), buffer = v('buffer');
    if (capital !== null && setup !== null && buffer !== null) add('Capital after setup and slow-month buffer', rm(capital - setup - buffer), 'Negative means the initial plan needs revisiting', capital - setup - buffer < 0);
  },
  TK08: (v, _s, add) => {
    const total = v('total'), mine = v('owner'), hours = v('hours'), freed = v('freed');
    add('Tasks that depend only on you', total !== null && total > 0 && mine !== null ? `${((100 * mine) / total).toFixed(1)}%` : 'Add task counts', 'A prompt to decide what to document or teach');
    if (hours !== null && freed !== null) add('Repeat-task hours after your target', `${Math.max(0, hours - freed).toFixed(1)} hrs/week`, 'Planning estimate, not a guaranteed saving');
  },
};

/** Live results for a workbook. Missing inputs produce prompts, never invented zeros. */
export function calculate(id: ToolkitId, state: WorkbookState): CalcLine[] {
  const out: CalcLine[] = [];
  const add = (title: string, result: string, detail: string, warn = false) => out.push({ title, result, detail, warn });
  CALCS[id]((k) => numberOf(state, k), state, add);
  return out;
}
