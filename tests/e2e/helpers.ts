import { expect, test as base, type Page } from '@playwright/test';

/** Every e2e test fails if the page triggers a CSP violation or an uncaught error — the strict CSP is part of the product. */
export const test = base.extend({
  page: async ({ page }, use) => {
    const problems: string[] = [];
    page.on('console', (m) => { if (/Content Security Policy|Refused to (apply|load|execute|connect)/i.test(m.text())) problems.push(m.text()); });
    page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
    await use(page);
    expect(problems, 'CSP violations / page errors').toEqual([]);
  },
});
export { expect };

export type Pick = 'first' | 'last' | number;

/** Taps an option on the current question/profile screen and waits for the next screen. Multi-select questions also need Continue. */
export async function answer(page: Page, which: Pick = 'first') {
  const before = await page.locator('h1#qTitle').textContent();
  const opts = page.locator('.answer-option');
  const n = await opts.count();
  expect(n).toBeGreaterThan(1);
  const multi = (await page.locator('.opt-multi').count()) > 0;
  await opts.nth(which === 'first' ? 0 : which === 'last' ? n - 1 : which).click();
  if (multi && (await page.locator('h1#qTitle').textContent()) === before) await page.locator('[data-continue]').click();
  await page.waitForFunction((prev) => { const h = document.querySelector('h1#qTitle'); return !h || h.textContent !== prev; }, before);
}

/** On the "check your answers" screen: confirm and wait for the free snapshot. */
export async function submitReview(page: Page) {
  await expect(page.getByRole('heading', { name: /check your answers/i })).toBeVisible();
  await page.getByRole('button', { name: /See my results/ }).click();
  await expect(page.getByRole('heading', { name: /snapshot is ready/i })).toBeVisible();
}

export async function notSure(page: Page) {
  const before = await page.locator('h1#qTitle').textContent();
  await page.getByRole('button', { name: "I'm not sure" }).click();
  await page.waitForFunction((prev) => { const h = document.querySelector('h1#qTitle'); return !h || h.textContent !== prev; }, before);
}

export async function startTrack(page: Page, track: 'financial' | 'career') {
  await page.goto('/');
  await page.getByRole('button', { name: /Explore my scorecard/ }).click();
  await page.locator(`[data-track="${track}"]`).click();
}

/** Completes the profile questions (first option, or the given picks by index) and returns once the first scored question shows. */
export async function completeProfile(page: Page, picks: Pick[] = []) {
  let i = 0;
  while (await page.locator('.progress-top .step-mark', { hasText: /YOUR PROFILE/i }).count()) {
    await answer(page, picks[i++] ?? 'first');
  }
}

export async function progressText(page: Page) { return (await page.locator('.progress-count').first().textContent())?.trim() ?? ''; }

export async function answerAll(page: Page, pick: (index: number) => Pick = () => 'first') {
  let idx = 0;
  while (await page.locator('h1#qTitle').count()) { await answer(page, pick(idx++)); }
  return idx;
}

export async function noHorizontalScroll(page: Page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over, 'page must not scroll sideways').toBeLessThanOrEqual(1);
}
