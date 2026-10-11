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

  test('upload → submit → four-eyes review → published and visible in the public library', async ({ browser }) => {
    const title = `E2E Guide ${Date.now()}`;
    const editor = await (await browser.newContext()).newPage();
    await signIn(editor, 'editor@e2e.test');
    await expect(editor.getByRole('button', { name: 'Activate' }).or(editor.getByRole('button', { name: 'Deactivate' }))).toHaveCount(0); // editors can't change visibility
    await editor.getByText('Add a new toolkit').click();
    await editor.getByLabel('Title').fill(title);
    await editor.getByLabel('Short description').fill('A guide created during the end-to-end test run.');
    await editor.getByRole('button', { name: 'Create toolkit' }).click();
    const card = editor.locator('article', { hasText: title });
    await expect(card).toBeVisible();
    await card.getByText(/Versions \(0\)/).click();
    await card.locator('input[type=file]').setInputFiles({ name: 'guide.pdf', mimeType: 'application/pdf', buffer: pdf });
    await expect(card.getByText('draft')).toBeVisible();
    await card.getByRole('button', { name: 'Submit for review' }).click();
    await expect(card.getByText('in review')).toBeVisible();
    await expect(card.getByRole('button', { name: /Review/ })).toHaveCount(0); // editor cannot approve

    // not public yet
    const anon = await (await browser.newContext()).request.get('/api/toolkits');
    expect(JSON.stringify(await anon.json())).not.toContain(title);

    const reviewer = await (await browser.newContext()).newPage();
    await signIn(reviewer, 'reviewer@e2e.test');
    const rcard = reviewer.locator('article', { hasText: title });
    await rcard.getByText(/Versions/).click();
    await rcard.getByRole('button', { name: 'Review…' }).click();
    await reviewer.getByLabel('Note').fill('Checked.');
    await reviewer.getByRole('button', { name: 'Submit decision' }).click();
    await expect(rcard.getByText('published').first()).toBeVisible();
    const pub = await (await browser.newContext()).request.get('/api/toolkits');
    expect(JSON.stringify(await pub.json())).toContain(title);
  });

  test('role-limited navigation: admins see leads, users, audit and launch readiness; reviewers do not', async ({ browser }) => {
    const admin = await (await browser.newContext()).newPage();
    await signIn(admin, 'admin@e2e.test');
    for (const name of ['Leads', 'Staff', 'Audit log', 'Launch readiness', 'Matching rules']) await expect(admin.getByRole('button', { name })).toBeVisible();
    await admin.getByRole('button', { name: 'Launch readiness' }).click();
    await expect(admin.getByText('BLOCKING').first()).toBeVisible();
    await admin.getByRole('button', { name: 'Matching rules' }).click();
    await expect(admin.getByRole('heading', { name: 'Matching rules' })).toBeVisible();
    const rev = await (await browser.newContext()).newPage();
    await signIn(rev, 'reviewer@e2e.test');
    await expect(rev.getByRole('button', { name: 'Leads' })).toHaveCount(0);
  });
});
