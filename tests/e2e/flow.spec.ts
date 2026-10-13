import { answer, answerAll, completeProfile, expect, noHorizontalScroll, notSure, progressText, startTrack, submitReview, test } from './helpers';

// Financial core = 19 questions when the person has insurance and savings (8 Restore incl. 4 follow-ups, 4 Income, 4 Sustain, 3 Empire).
const FIN_TOTAL = 19;

test.describe('public journey', () => {
  test('welcome → Financial track: one question per screen, answer check, free preview with no contact gate', async ({ page }) => {
    await startTrack(page, 'financial');
    await noHorizontalScroll(page);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('fieldset.answer-options')).toHaveCount(1);
    await expect(page.locator('.progress-count')).toHaveText('1 / 4');
    await completeProfile(page);
    await expect(page.locator('.progress-count')).toHaveText(`1 / ${FIN_TOTAL}`);
    await expect(page.locator('h1')).toHaveCount(1);
    await noHorizontalScroll(page);
    const fill = await page.locator('.progress-line span').evaluate((el) => el.getBoundingClientRect().width / (el.parentElement as HTMLElement).getBoundingClientRect().width);
    expect(fill).toBeGreaterThan(0.03);
    expect(fill).toBeLessThan(0.2);
    expect(await answerAll(page)).toBe(FIN_TOTAL);
    // complete answer check: every question seen + the profile, each with a Change button
    await expect(page.locator('[data-edit-question]')).toHaveCount(FIN_TOTAL);
    await expect(page.locator('[data-edit-profile]')).toHaveCount(4);
    await expect(page.locator('.review-section')).toHaveCount(5);
    await noHorizontalScroll(page);
    await submitReview(page);
    await expect(page.locator('input[type=email]')).toHaveCount(0);
    await expect(page.locator('.dial-number')).toHaveText(/^\d+$/);
    await expect(page.locator('.bar-cell')).toHaveCount(4);
    await expect(page.getByText('Your detailed action plan is ready to view')).toBeVisible();
    await noHorizontalScroll(page);
  });

  test('insurance types are multi-select; "I do not have insurance" corrects the earlier answer and hides follow-ups', async ({ page }) => {
    await startTrack(page, 'financial');
    await completeProfile(page);
    for (let i = 0; i < 3; i++) await answer(page, 'first');
    await answer(page, 'first'); // f_r4: yes, I have insurance
    await expect(page.locator('h1#qTitle')).toHaveText(/Which types of insurance/);
    for (const label of ['Medical card', 'Life insurance', 'Critical illness', 'Personal accident', 'from my employer', 'Another type']) {
      await page.locator('.answer-option', { hasText: label }).click();
    }
    await expect(page.locator('.opt-multi:checked')).toHaveCount(6); // choosing one never clears the others
    await page.locator('.answer-option', { hasText: 'I have insurance but do not know the type' }).click();
    await expect(page.locator('.opt-multi:checked')).toHaveCount(1); // "not sure" is exclusive
    await page.locator('.answer-option', { hasText: 'Actually, I do not have insurance' }).click();
    await expect(page.locator('h1#qTitle')).toHaveText(/Do you currently have any money saved/); // review question skipped too
    await expect(page.locator('.progress-count')).toHaveText(`5 / ${FIN_TOTAL - 2}`);
  });

  test('changing an answer from the answer check returns there, asking newly revealed follow-ups first', async ({ page }) => {
    await startTrack(page, 'financial');
    await completeProfile(page);
    await answerAll(page, (i) => (i === 3 ? 1 : 'first')); // f_r4: no insurance → 17 questions
    await expect(page.locator('[data-edit-question]')).toHaveCount(FIN_TOTAL - 2);
    await page.locator('[data-edit-question="f_r4"]').click();
    await expect(page.getByRole('button', { name: /return to my answers/ })).toBeVisible(); // the earlier answer is kept
    await page.locator('.answer-option').first().click(); // yes, I have insurance → types + review appear
    await expect(page.locator('h1#qTitle')).toHaveText(/Which types of insurance/);
    await answer(page, 'first');
    await answer(page, 'first');
    await expect(page.getByRole('heading', { name: /check your answers/i })).toBeVisible();
    await expect(page.locator('[data-edit-question]')).toHaveCount(FIN_TOTAL);
  });

  test('Career & Income track with unit-trust module adds follow-up questions and "I\'m not sure" is never scored as zero', async ({ page }) => {
    await startTrack(page, 'career');
    await expect(page.locator('.progress-count')).toHaveText('1 / 5');
    // role = insurance agent (1), age = 25–34 (2), dependants yes (0), goal = unit trust (3), switch = no (2)
    await completeProfile(page, [1, 2, 0, 3, 2]);
    const total = Number((await progressText(page)).split('/')[1]);
    expect(total).toBe(12); // 10 core (no leadership/switch questions for this goal) + 2 industry module questions
    let n = 0;
    while (await page.locator('h1#qTitle').count()) { await notSure(page); n++; }
    expect(n).toBe(12);
    await submitReview(page);
    await expect(page.locator('.dial-number')).toHaveText('—');
    await expect(page.locator('.dial-caption')).toHaveText('not scored');
    await expect(page.getByText('More information is needed for a diagnostic')).toBeVisible();
  });

  test('Previous keeps earlier answers; browser Back steps through questions', async ({ page }) => {
    await startTrack(page, 'financial');
    await completeProfile(page);
    await answer(page, 2);
    await answer(page, 3);
    await expect(page.locator('.progress-count')).toHaveText(`3 / ${FIN_TOTAL}`);
    await page.getByRole('button', { name: /Previous/ }).click();
    await expect(page.locator('.progress-count')).toHaveText(`2 / ${FIN_TOTAL}`);
    await expect(page.locator('.answer-option.chosen input')).toHaveAttribute('value', 'under_one');
    await page.goBack();
    await expect(page.locator('.progress-count')).toHaveText(`1 / ${FIN_TOTAL}`);
    await expect(page.locator('.answer-option.chosen input')).toHaveAttribute('value', 'sometimes');
  });

  test('keyboard users select with arrows and continue with Enter; selection alone never moves them on', async ({ page }) => {
    await startTrack(page, 'financial');
    await completeProfile(page);
    const first = page.locator('.opt-input').first();
    await first.focus();
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(600);
    await expect(page.locator('.progress-count')).toHaveText(`1 / ${FIN_TOTAL}`);
    await expect(page.getByRole('button', { name: /Continue/ })).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('.progress-count')).toHaveText(`2 / ${FIN_TOTAL}`);
    await expect(page.locator('h1#qTitle')).toBeFocused();
    await page.locator('.opt-input').first().focus();
    await page.keyboard.press('2');
    await expect(page.locator('.progress-count')).toHaveText(`3 / ${FIN_TOTAL}`);
  });

  test('auto-advance can be switched off', async ({ page }) => {
    await startTrack(page, 'financial');
    await completeProfile(page);
    await page.getByLabel('Move on automatically after I choose').uncheck();
    await page.locator('.answer-option').first().click();
    await page.waitForTimeout(600);
    await expect(page.locator('.progress-count')).toHaveText(`1 / ${FIN_TOTAL}`);
    await page.getByRole('button', { name: /Continue/ }).click();
    await expect(page.locator('.progress-count')).toHaveText(`2 / ${FIN_TOTAL}`);
  });

  test('reload resumes an in-progress assessment', async ({ page }) => {
    await startTrack(page, 'financial');
    await completeProfile(page);
    await answer(page, 1);
    await answer(page, 1);
    await page.reload();
    await expect(page.locator('.progress-count')).toHaveText(`3 / ${FIN_TOTAL}`);
    await page.getByRole('button', { name: /Previous/ }).click();
    await expect(page.locator('.answer-option.chosen input')).toHaveAttribute('value', 'three_five');
    await page.getByRole('button', { name: /Previous/ }).click();
    await expect(page.locator('.answer-option.chosen input')).toHaveAttribute('value', 'usually');
  });

  test('full path: gate → private report → priorities → interactive planner → WhatsApp handover → erase', async ({ page, context }) => {
    await startTrack(page, 'financial');
    await completeProfile(page, [0, 2, 0, 0]); // employee, 25–34, dependants: yes, goal: security
    await answerAll(page, (i) => (i === 0 ? 'last' : i === 3 ? 'last' : 'first')); // overdue essentials; insurance "not sure"
    await submitReview(page);
    await expect(page.getByText('Essential payments need attention')).toBeVisible();
    await page.getByRole('button', { name: /View my full report/ }).click();

    await expect(page.getByRole('heading', { name: /One more step/ })).toBeVisible();
    await page.getByRole('button', { name: 'Read the Privacy Notice' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Privacy Notice');
    await expect(dialog).toContainText('WhatsApp');
    await dialog.getByRole('button', { name: 'Bahasa Malaysia' }).click();
    await expect(dialog).toContainText('Notis Privasi');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    await page.getByRole('button', { name: /Get my full report/ }).click();
    await expect(page.locator('#gateError')).toContainText('first name');
    await page.getByLabel('First name', { exact: true }).fill('Aisyah');
    await page.getByLabel('Email address', { exact: true }).fill('aisyah.e2e@example.com');
    await page.getByLabel(/I agree that Balla DK may use my first name/).check();
    await expect(page.getByLabel(/Optional: I would also like/)).not.toBeChecked();
    await page.getByRole('button', { name: /Get my full report/ }).click();

    // report: one or two priorities, each with its own planner; nothing to browse beyond them
    await expect(page.getByRole('heading', { name: 'Your roadmap, Aisyah.' })).toBeVisible();
    await expect(page).toHaveURL(/\/report\/[\w-]{40,}$/);
    await expect(page.locator('.pillar-line')).toHaveCount(4);
    const prios = page.locator('.priority-item');
    expect(await prios.count()).toBeGreaterThanOrEqual(1);
    expect(await prios.count()).toBeLessThanOrEqual(2);
    await expect(prios.first()).toContainText('Essential payments need attention');
    await expect(prios.first().locator('.toolkit-card')).toContainText('Debt & Cash Flow Reset');
    await expect(prios.first().locator('.action-list li')).toHaveCount(3);
    expect(await page.locator('.toolkit-card').count()).toBeLessThanOrEqual(2);
    await expect(page.getByText(/browse/i)).toHaveCount(0);

    // branded A4 layout for Save as PDF
    await expect(page.locator('.print-report')).toBeHidden();
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.print-report .pr-page')).toHaveCount(2);
    await expect(page.locator('.print-report .pr-prio').first()).toContainText('Essential payments need attention');
    await page.emulateMedia({ media: 'screen' });

    // interactive planner: six steps, live calculations, back to the report
    await prios.first().getByRole('button', { name: /Open interactive planner/ }).click();
    await expect(page.getByRole('heading', { name: 'Debt & Cash Flow Reset' })).toBeVisible();
    await expect(page.locator('[data-wb-step]')).toHaveCount(6);
    await page.getByRole('button', { name: /Next step/ }).click();
    await page.getByLabel('Total monthly take-home income').fill('3000');
    await page.getByLabel('Essential spending (excluding debt payments)').fill('2500');
    await page.getByLabel('Minimum loan and card payments').fill('600');
    await page.getByLabel('Other monthly spending').fill('200');
    await page.getByRole('button', { name: /Next step/ }).click();
    await expect(page.locator('#wbLiveResults .wb-result').first()).toContainText('RM -300');
    await page.getByLabel('Are any essential bills overdue?').selectOption('yes');
    await expect(page.locator('#wbLiveResults .wb-warn')).toHaveCount(2);
    await page.getByRole('button', { name: 'My report', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your roadmap, Aisyah.' })).toBeVisible();

    // WhatsApp handover: link created only on tap, message previewed, person sends it themselves
    const wa = page.locator('#waBtn');
    await expect(wa).toHaveCSS('background-color', 'rgb(37, 211, 102)');
    await wa.click();
    const ho = page.getByRole('dialog');
    await expect(ho.locator('.ho-preview')).toContainText('Name: Aisyah');
    await expect(ho.locator('.ho-preview')).toContainText('1. Essential payments need attention');
    await expect(ho.locator('.ho-preview')).toContainText('/admin/handover/');
    const open = ho.getByRole('link', { name: 'Open WhatsApp' });
    const href = (await open.getAttribute('href'))!;
    expect(href).toMatch(/^https:\/\/wa\.me\/60122202217\?text=/);
    for (const secret of ['aisyah.e2e', 'overdue essential household', 'f_r1']) expect(decodeURIComponent(href)).not.toContain(secret);
    await expect(open).toHaveAttribute('rel', /noopener/);
    const handoverPath = new URL(decodeURIComponent(href).match(/https?:\/\/\S+\/admin\/handover\/[\w-]+/)![0]).pathname;
    // an outsider with the link sees only the staff sign-in, never the report
    const outsider = await context.browser()!.newContext();
    const op = await outsider.newPage();
    await op.goto(handoverPath);
    await expect(op.getByRole('heading', { name: 'Staff sign-in' })).toBeVisible();
    await expect(op.getByText('Aisyah')).toHaveCount(0);
    await outsider.close();
    await ho.getByRole('button', { name: 'Withdraw link' }).click();
    await expect(ho).toHaveCount(0);

    // deep link works in a fresh context (what the emailed link does)
    const url = page.url();
    const fresh = await context.newPage();
    await fresh.goto(url);
    await expect(fresh.getByRole('heading', { name: 'Your roadmap, Aisyah.' })).toBeVisible();
    await fresh.close();

    await page.getByLabel('Send me educational updates by email').check();
    await expect(page.locator('#mktState')).toContainText('You are subscribed');

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
