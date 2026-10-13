import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { answer, answerAll, completeProfile, expect, startTrack, submitReview, test } from './helpers';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function audit(page: Page, name: string) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n   ${v.nodes.slice(0, 4).map((n) => n.target.join(' ') + ' → ' + (n.failureSummary ?? '').split('\n').slice(1, 3).join(' ')).join('\n   ')}`);
  expect.soft(summary, `axe violations on "${name}"`).toEqual([]);
}

test.describe('WCAG 2.2 AA (axe-core) on every screen', () => {
  // Reduced motion also verifies the no-animation path and keeps axe from sampling colours mid-fade.
  test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: 'reduce' }); });

  test('welcome, track, profile, question and loading states', async ({ page }) => {
    await page.goto('/');
    await audit(page, 'welcome');
    await page.getByRole('button', { name: /Explore my scorecard/ }).click();
    await audit(page, 'track chooser');
    await page.locator('[data-track="financial"]').click();
    await audit(page, 'profile question');
    await completeProfile(page);
    await audit(page, 'scored question (nothing selected)');
    await page.locator('.answer-option').nth(1).hover();
    await answer(page, 1);
    await page.getByRole('button', { name: /Previous/ }).click();
    await audit(page, 'scored question (answer selected)');
  });

  test('preview, gate, privacy notice, report, worksheet', async ({ page }) => {
    await startTrack(page, 'financial');
    await completeProfile(page, [0, 2, 0, 0]);
    await answerAll(page, (i) => (i === 0 ? 'last' : 'first'));
    await audit(page, 'answer check');
    await submitReview(page);
    await audit(page, 'preview');
    await page.getByRole('button', { name: /View my full report/ }).click();
    await expect(page.getByRole('heading', { name: /One more step/ })).toBeVisible();
    await audit(page, 'gate');
    await page.getByRole('button', { name: 'Read the Privacy Notice' }).click();
    await audit(page, 'privacy notice dialog (EN)');
    await page.getByRole('dialog').getByRole('button', { name: 'Bahasa Malaysia' }).click();
    await audit(page, 'privacy notice dialog (BM)');
    await page.keyboard.press('Escape');
    await page.getByLabel('First name', { exact: true }).fill('Nur');
    await page.getByLabel('Email address', { exact: true }).fill('nur.a11y@example.com');
    await page.getByLabel(/I agree that Balla DK may use my first name/).check();
    await page.getByRole('button', { name: /Get my full report/ }).click();
    await expect(page.getByRole('heading', { name: /Your roadmap, Nur/ })).toBeVisible();
    await audit(page, 'full report');
    await page.locator('#waBtn').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await audit(page, 'WhatsApp handover dialog');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /Open interactive planner/ }).first().click();
    await audit(page, 'planner start');
    for (let i = 0; i < 5; i++) { await page.locator('[data-wb-nav="next"]').click(); await audit(page, `planner step ${i + 2}`); }
    await page.locator('[data-wb-nav="exit"]').first().click();
    await page.locator('#langBtn').click();
    await audit(page, 'full report (Bahasa Malaysia)');
  });

  test('the career track with an alert audits clean too', async ({ page }) => {
    await startTrack(page, 'career');
    await completeProfile(page, [1, 2, 0, 2, 2]);
    await answerAll(page, (i) => (i === 1 ? 'last' : 'first'));
    await submitReview(page);
    await audit(page, 'career preview');
  });
});
