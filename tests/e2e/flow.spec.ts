import { answer, answerAll, completeProfile, expect, noHorizontalScroll, notSure, progressText, startTrack, test } from './helpers';

test.describe('public journey', () => {
  test('welcome → Financial track: one question per screen, free preview with no contact gate', async ({ page }) => {
    await startTrack(page, 'financial');
    await noHorizontalScroll(page);
    // profile first: exactly one question + radio group per screen
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('fieldset.answer-options')).toHaveCount(1);
    await expect(page.locator('.progress-count')).toHaveText('1 / 4');
    await completeProfile(page);
    await expect(page.locator('.progress-count')).toHaveText('1 / 15');
    await expect(page.locator('h1')).toHaveCount(1);
    await noHorizontalScroll(page);
    // the progress bar really renders as a fraction (regression: inline styles blocked by CSP left it full-width)
    const fill = await page.locator('.progress-line span').evaluate((el) => el.getBoundingClientRect().width / (el.parentElement as HTMLElement).getBoundingClientRect().width);
    expect(fill).toBeGreaterThan(0.03);
    expect(fill).toBeLessThan(0.2);
    await answerAll(page);
    // preview is shown without asking for any contact details
    await expect(page.getByRole('heading', { name: /snapshot is ready/i })).toBeVisible();
    await expect(page.locator('input[type=email]')).toHaveCount(0);
    await expect(page.locator('.dial-number')).toHaveText('100');
    expect(await page.locator('.score-dial').evaluate((el) => getComputedStyle(el).getPropertyValue('--pct').trim())).toBe('100%');
    expect(await page.locator('.mini-bar i').first().evaluate((el) => (el as HTMLElement).style.width)).toBe('100%');
    await expect(page.locator('.bar-cell')).toHaveCount(4);
    await expect(page.getByText('Your detailed action plan is ready to view')).toBeVisible();
    await noHorizontalScroll(page);
  });

  test('Career & Income track with unit-trust module adds follow-up questions and "I\'m not sure" is never scored as zero', async ({ page }) => {
    await startTrack(page, 'career');
    await expect(page.locator('.progress-count')).toHaveText('1 / 5');
    // role = insurance agent (index 1), age = 25–34 (2), dependants first, goal = unit trust (2), switch = no (2)
    await completeProfile(page, [1, 2, 0, 2, 2]);
    const total = Number((await progressText(page)).split('/')[1]);
    expect(total).toBe(17); // 15 core + 2 industry module questions
    let n = 0;
    while (await page.locator('h1#qTitle').count()) { await notSure(page); n++; }
    expect(n).toBe(17);
    await expect(page.getByRole('heading', { name: /snapshot is ready/i })).toBeVisible();
    await expect(page.locator('.dial-number')).toHaveText('—');
    await expect(page.locator('.dial-caption')).toHaveText('not scored');
    await expect(page.getByText('More information is needed for a diagnostic')).toBeVisible();
  });

  test('Previous keeps earlier answers; browser Back steps through questions', async ({ page }) => {
    await startTrack(page, 'financial');
    await completeProfile(page);
    await answer(page, 2);
    await answer(page, 3);
    await expect(page.locator('.progress-count')).toHaveText('3 / 15');
    await page.getByRole('button', { name: /Previous/ }).click();
    await expect(page.locator('.progress-count')).toHaveText('2 / 15');
    await expect(page.locator('.answer-option.chosen input')).toHaveAttribute('value', 'under_one'); // the earlier answer is kept
    await page.goBack();
    await expect(page.locator('.progress-count')).toHaveText('1 / 15');
    await expect(page.locator('.answer-option.chosen input')).toHaveAttribute('value', 'sometimes');
  });

  test('keyboard users select with arrows and continue with Enter; selection alone never moves them on', async ({ page }) => {
    await startTrack(page, 'financial');
    await completeProfile(page);
    const first = page.locator('.opt-input').first();
    await first.focus();
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(600);
    await expect(page.locator('.progress-count')).toHaveText('1 / 15'); // no auto-advance from keyboard selection
    await expect(page.getByRole('button', { name: /Continue/ })).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('.progress-count')).toHaveText('2 / 15');
    // focus lands on the new question heading
    await expect(page.locator('h1#qTitle')).toBeFocused();
    // number shortcut works while an option is focused
    await page.locator('.opt-input').first().focus();
    await page.keyboard.press('2');
    await expect(page.locator('.progress-count')).toHaveText('3 / 15');
  });

  test('auto-advance can be switched off', async ({ page }) => {
    await startTrack(page, 'financial');
    await completeProfile(page);
    await page.getByLabel('Move on automatically after I choose').uncheck();
    await page.locator('.answer-option').first().click();
    await page.waitForTimeout(600);
    await expect(page.locator('.progress-count')).toHaveText('1 / 15');
    await page.getByRole('button', { name: /Continue/ }).click();
    await expect(page.locator('.progress-count')).toHaveText('2 / 15');
  });

  test('reload resumes an in-progress assessment', async ({ page }) => {
    await startTrack(page, 'financial');
    await completeProfile(page);
    await answer(page, 1);
    await answer(page, 1);
    await page.reload();
    await expect(page.locator('.progress-count')).toHaveText('3 / 15');
    await page.getByRole('button', { name: /Previous/ }).click();
    await expect(page.locator('.progress-count')).toHaveText('2 / 15');
    await expect(page.locator('.answer-option.chosen input')).toHaveAttribute('value', 'three_five'); // answer to Q2 was restored
    await page.getByRole('button', { name: /Previous/ }).click();
    await expect(page.locator('.answer-option.chosen input')).toHaveAttribute('value', 'usually'); // and Q1
  });

  test('full path: gate → private report → worksheet → WhatsApp → erase', async ({ page, context }) => {
    await startTrack(page, 'financial');
    await completeProfile(page, [0, 2, 0, 0]); // employee, 25–34, dependants: yes, goal: security
    await answerAll(page, (i) => (i === 0 ? 'last' : i === 3 ? 'last' : 'first')); // overdue essentials + insurance gap
    await expect(page.getByText('Essential payments need attention')).toBeVisible();
    await page.getByRole('button', { name: /View my full report/ }).click();

    // gate: separate required + optional consent, privacy notice in two languages
    await expect(page.getByRole('heading', { name: /One more step/ })).toBeVisible();
    await page.getByRole('button', { name: 'Read the Privacy Notice' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Privacy Notice');
    await expect(dialog).toContainText('DRAFT');
    await dialog.getByRole('button', { name: 'Bahasa Malaysia' }).click();
    await expect(dialog).toContainText('Notis Privasi');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    await page.getByRole('button', { name: /Get my full report/ }).click();
    await expect(page.locator('#gateError')).toContainText('first name');
    await page.getByLabel('First name', { exact: true }).fill('Aisyah');
    await page.getByLabel('Email address', { exact: true }).fill('aisyah.e2e@example.com');
    await page.getByRole('button', { name: /Get my full report/ }).click();
    await expect(page.locator('#gateError')).toContainText('required box');
    await page.getByLabel(/I agree that Balla DK may use my first name/).check();
    await expect(page.getByLabel(/Optional: I would also like/)).not.toBeChecked();
    await page.getByRole('button', { name: /Get my full report/ }).click();

    // report
    await expect(page.getByRole('heading', { name: 'Your roadmap, Aisyah.' })).toBeVisible();
    await expect(page).toHaveURL(/\/report\/[\w-]{40,}$/);
    await expect(page.locator('.pillar-line')).toHaveCount(4);
    // branded A4 layout for Save as PDF: hidden on screen, swapped in for print
    await expect(page.locator('.print-report')).toBeHidden();
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.print-report .pr-page')).toHaveCount(2);
    await expect(page.locator('.print-report .pr-pillar')).toHaveCount(4);
    await expect(page.locator('.report-grid')).toBeHidden();
    await page.emulateMedia({ media: 'screen' });
    await expect(page.locator('.action-list li')).toHaveCount(3);
    await expect(page.locator('.alert-item').first()).toContainText('Essential payments need attention');
    await expect(page.locator('.toolkit-card').first()).toContainText('30-Day Financial Reset');
    expect(await page.locator('.toolkit-card').count()).toBeLessThanOrEqual(3);

    // worksheet modal: five steps, focus trapped, Escape restores focus
    const opener = page.getByRole('button', { name: /Open recommended worksheet/ });
    await opener.click();
    const ws = page.getByRole('dialog');
    await expect(ws.locator('.worksheet-step')).toHaveCount(5);
    await expect(ws.getByRole('button', { name: 'Close worksheet' })).toBeFocused();
    await ws.locator('textarea').first().fill('My private notes');
    await page.keyboard.press('Escape');
    await expect(opener).toBeFocused();

    // WhatsApp: official green, correct number, nothing private in the URL
    const wa = page.locator('#waBtn');
    await expect(wa).toHaveCSS('background-color', 'rgb(37, 211, 102)');
    const href = (await wa.getAttribute('href'))!;
    expect(href).toMatch(/^https:\/\/wa\.me\/60122202217\?text=/);
    const decoded = decodeURIComponent(href);
    for (const secret of ['overdue', 'Essential payments', 'Restore', 'Aisyah', 'aisyah.e2e', 'insurance']) expect(decoded).not.toContain(secret);
    await expect(wa).toHaveAttribute('rel', /noopener/);

    // deep link works in a fresh context (what the emailed link does)
    const url = page.url();
    const fresh = await context.newPage();
    await fresh.goto(url);
    await expect(fresh.getByRole('heading', { name: 'Your roadmap, Aisyah.' })).toBeVisible();
    await fresh.close();

    // marketing opt-in can be toggled from the report
    await page.getByLabel('Send me educational updates by email').check();
    await expect(page.locator('#mktState')).toContainText('You are subscribed');

    // right to erasure
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Delete my data' }).click();
    await expect(page.getByRole('heading', { name: 'Your data has been deleted' })).toBeVisible();
    await page.goto(url);
    await expect(page.getByRole('heading', { name: /can.t open this report/ })).toBeVisible();
  });

  test('language toggle switches the interface to Bahasa Malaysia', async ({ page }) => {
    await page.goto('/');
    await page.locator('#langBtn').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ms');
    await expect(page.getByRole('button', { name: /Terokai kad skor saya/ })).toBeVisible();
    await page.locator('#langBtn').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('an unknown report link shows a friendly, non-leaky error', async ({ page }) => {
    await page.goto('/report/' + 'A'.repeat(43));
    await expect(page.getByRole('heading', { name: /can.t open this report/ })).toBeVisible();
    await page.getByRole('button', { name: 'Start a new scorecard' }).click();
    await expect(page.getByRole('heading', { name: /Clarity before/ })).toBeVisible();
  });
});
