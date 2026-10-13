import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './helpers';

const PW = 'Correct-Horse-9-battery';
const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');

async function signIn(page: Page, email: string) {
  await page.goto('/admin');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PW);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Toolkit library' })).toBeVisible();
}

test.describe('staff console', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 800, 'desktop workflow');

  test('sign-in screen has no WCAG violations; wrong password is refused', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/admin');
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(r.violations.map((v) => v.id)).toEqual([]);
    await page.getByLabel('Email').fill('admin@e2e.test');
    await page.getByLabel('Password').fill('wrong-password-123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Incorrect email or password.')).toBeVisible();
  });

  test('upload → submit → four-eyes review → published PDF for a V4.3 planner', async ({ browser }) => {
    const editor = await (await browser.newContext()).newPage();
    await signIn(editor, 'editor@e2e.test');
    await expect(editor.getByRole('button', { name: 'Activate' }).or(editor.getByRole('button', { name: 'Deactivate' }))).toHaveCount(0); // editors can't change visibility
    await expect(editor.getByText('Add a new toolkit')).toHaveCount(0); // reports only unlock TK01–TK08
    await expect(editor.locator('article', { hasText: 'V4.3 planner' })).toHaveCount(8);
    const card = editor.locator('article', { hasText: 'TK07 ·' });
    await card.getByText(/Versions \(/).click();
    await card.locator('input[type=file]').setInputFiles({ name: 'TK07.pdf', mimeType: 'application/pdf', buffer: pdf });
    await expect(card.getByText('draft')).toBeVisible();
    await card.getByRole('button', { name: 'Submit for review' }).click();
    await expect(card.getByText('in review')).toBeVisible();
    await expect(card.getByRole('button', { name: /Review/ })).toHaveCount(0); // editor cannot approve

    const reviewer = await (await browser.newContext()).newPage();
    await signIn(reviewer, 'reviewer@e2e.test');
    const rcard = reviewer.locator('article', { hasText: 'TK07 ·' });
    await rcard.getByText(/Versions/).click();
    await rcard.getByRole('button', { name: 'Review…' }).click();
    await reviewer.getByLabel('Note').fill('Checked.');
    await reviewer.getByRole('button', { name: 'Submit decision' }).click();
    await expect(rcard.getByText('published').first()).toBeVisible();
    // there is still no public library to browse
    expect((await (await browser.newContext()).request.get('/api/toolkits')).status()).toBe(404);
  });

  test('a report shared over WhatsApp opens for staff after sign-in', async ({ browser }) => {
    const ctx = await browser.newContext();
    const api = ctx.request;
    const profile = { track: 'financial', role: 'employee', ageBand: '35_44', dependants: 'yes', goal: 'security', switchIntent: 'no' };
    const a = await (await api.post('/api/assessments', { data: { profile, answers: { f_r1: 'overdue', f_r2: 'one_two', f_r3: 'easy', f_r4: 'none' } } })).json();
    const cfg = await (await api.get('/api/config')).json();
    const rep = await (await api.post('/api/report-requests', { data: { assessmentId: a.id, sessionToken: a.sessionToken, firstName: 'Farid', email: 'farid.e2e@example.com', processingConsent: true, marketingOptIn: false, privacyNoticeVersion: cfg.privacyNoticeVersion } })).json();
    const ho = await (await api.post(`/api/reports/${rep.reportToken}/handover`)).json();
    const path = new URL(ho.url).pathname;

    const staff = await (await browser.newContext()).newPage();
    await staff.goto(path);
    await expect(staff.getByRole('heading', { name: 'Staff sign-in' })).toBeVisible();
    await expect(staff.getByText('Farid')).toHaveCount(0);
    await staff.getByLabel('Email').fill('reviewer@e2e.test');
    await staff.getByLabel('Password').fill(PW);
    await staff.getByRole('button', { name: 'Sign in' }).click();
    await expect(staff.getByRole('heading', { name: /Farid · R\.I\.S\.E\.™ Financial Scorecard/ })).toBeVisible();
    await expect(staff.getByText('Essential payments need attention').first()).toBeVisible();
    await expect(staff.getByRole('button', { name: 'Print / save as PDF' })).toBeVisible();
  });

  test('role-limited navigation: admins see leads, users, audit and launch readiness; reviewers do not', async ({ browser }) => {
    const admin = await (await browser.newContext()).newPage();
    await signIn(admin, 'admin@e2e.test');
    for (const name of ['Leads', 'Staff', 'Audit log', 'Launch readiness']) await expect(admin.getByRole('button', { name })).toBeVisible();
    await expect(admin.getByRole('button', { name: 'Matching rules' })).toHaveCount(0);
    await admin.getByRole('button', { name: 'Launch readiness' }).click();
    await expect(admin.getByText('BLOCKING').first()).toBeVisible();
    const rev = await (await browser.newContext()).newPage();
    await signIn(rev, 'reviewer@e2e.test');
    await expect(rev.getByRole('button', { name: 'Leads' })).toHaveCount(0);
  });
});
