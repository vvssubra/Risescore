import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { WORKBOOKS, WORKBOOK_PDF_FILES } from '../src/server/workbooks.ts';
import { ACTIONS_BY_TOOLKIT, TOOLKIT_IDS } from '../src/shared/priorities.ts';
import { calculate, numberOf } from '../src/shared/workbook.ts';

describe('V4.3 planner catalogue', () => {
  it('has exactly TK01–TK08, each with a PDF, fields, four weeks and three options', () => {
    expect(WORKBOOKS.map((w) => w.id)).toEqual([...TOOLKIT_IDS]);
    for (const w of WORKBOOKS) {
      expect(w.fields.length).toBeGreaterThanOrEqual(5);
      expect(w.weeks).toHaveLength(4);
      expect(w.options.length).toBeGreaterThanOrEqual(3);
      expect(new Set(w.fields.map((f) => f.id)).size).toBe(w.fields.length);
      for (const f of w.fields) if (f.kind === 'select') expect(f.options?.length).toBeGreaterThan(1);
      expect(existsSync(new URL(`../reference/v4.3/pdfs/${WORKBOOK_PDF_FILES[w.id]}`, import.meta.url))).toBe(true);
      expect(ACTIONS_BY_TOOLKIT[w.id]).toHaveLength(3);
    }
  });
  it('educational wording never promises returns or implies accreditation', () => {
    const text = JSON.stringify(WORKBOOKS).toLowerCase();
    for (const bad of ['we guarantee', 'returns are guaranteed', 'cfp-accredited', 'risk-free', 'you will earn']) expect(text).not.toContain(bad);
    // "guaranteed returns" may appear only inside a warning against such promises.
    for (const m of text.matchAll(/guaranteed returns?/g)) expect(text.slice(Math.max(0, m.index! - 60), m.index)).toMatch(/never|promises|not/);
  });
  it('workbook content is server-only: no client module imports it', async () => {
    const { readdirSync, readFileSync, statSync } = await import('node:fs');
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = `${dir}/${f}`; return statSync(p).isDirectory() ? walk(p) : [p]; });
    const root = new URL('../src/client', import.meta.url).pathname;
    for (const file of walk(root)) expect(readFileSync(file, 'utf8')).not.toMatch(/server\/workbooks/);
  });
});

describe('planner calculations', () => {
  it('empty or invalid fields are never treated as zero', () => {
    expect(numberOf({}, 'x')).toBeNull();
    expect(numberOf({ x: '' }, 'x')).toBeNull();
    expect(numberOf({ x: '-5' }, 'x')).toBeNull();
    expect(numberOf({ x: 'abc' }, 'x')).toBeNull();
    expect(numberOf({ x: ' 12.5 ' }, 'x')).toBe(12.5);
    for (const id of TOOLKIT_IDS) for (const line of calculate(id, {})) expect(line.result).not.toMatch(/RM 0$/);
  });
  it('TK03 emergency savings matches the worked example (RM3,000 × 6, RM4,000 saved, RM350/month)', () => {
    const r = calculate('TK03', { essentials: '3000', available: '4000', months: '6', monthly: '350' });
    expect(r.map((x) => x.result)).toEqual(['RM 18,000', '1.3 months', 'RM 14,000', '40 months']);
  });
  it('TK01 second income: money kept, per hour and vs target', () => {
    const r = calculate('TK01', { revenue: '1000', costs: '220', hours: '28', target: '500' });
    expect(r.map((x) => x.result)).toEqual(['RM 780', 'RM 27.86', 'RM 280']);
  });
  it('TK04 flags a negative month and overdue essentials', () => {
    const r = calculate('TK04', { income: '3000', essentials: '2500', debt: '600', other: '200', late: 'yes' });
    expect(r[0]).toMatchObject({ result: 'RM -300', warn: true });
    expect(r[1].result).toBe('20.0%');
    expect(r[2].warn).toBe(true);
  });
  it('TK07 break-even and slow month', () => {
    const r = calculate('TK07', { price: '50', variable: '20', fixed: '3000', slow: '60', capital: '10000', setup: '6000', buffer: '5000' });
    expect(r.map((x) => x.result)).toEqual(['RM 30', '100 per month', 'RM -1,200', 'RM -1,000']);
    expect(r.filter((x) => x.warn)).toHaveLength(2);
  });
  it('TK02, TK05, TK06, TK08 produce results', () => {
    expect(calculate('TK02', { medical: true, life: true, lifeCover: '200000' })[0].result).toBe('2 recorded');
    expect(calculate('TK05', { largest: '80000', total: '100000', shortNeed: '20000', liquid: '5000' }).map((x) => x.result)).toEqual(['80.0%', 'RM -15,000']);
    expect(calculate('TK06', { reserve: '12000', setup: '2000', essentials: '2500', pay: '4000', newpay: '3000' }).map((x) => x.result)).toEqual(['4.0 months', 'RM -1,000']);
    expect(calculate('TK08', { total: '20', owner: '15', hours: '10', freed: '4' }).map((x) => x.result)).toEqual(['75.0%', '6.0 hrs/week']);
  });
});
