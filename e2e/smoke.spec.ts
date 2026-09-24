import { expect, test } from '@playwright/test';
import { createExplorer, skipTask, solveQuiz, watchPage } from './helpers';

test.describe('Wonderverse smoke', () => {
  test('onboarding → hub, with zero third-party requests and no CSP violations', async ({ page }, info) => {
    const watch = watchPage(page);
    await createExplorer(page);
    await expect(page.getByTestId('world-solar-system')).toBeVisible();
    await page.screenshot({ path: info.outputPath('hub.png'), fullPage: true });
    expect(watch.external, 'no requests may leave the origin').toEqual([]);
    expect(watch.problems).toEqual([]);
  });

  for (const worldId of ['solar-system', 'chandrayaan', 'human-heart']) {
    test(`${worldId}: intro → first stop → task → quiz → reward`, async ({ page }, info) => {
      test.slow();
      const watch = watchPage(page);
      await createExplorer(page, 'Mia', worldId === 'human-heart' ? 10 : worldId === 'chandrayaan' ? 7 : 4);
      await page.getByTestId(`world-${worldId}`).click();
      await expect(page.getByTestId('world-shell')).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('canvas').first()).toBeVisible();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: info.outputPath(`${worldId}-intro.png`) });

      // Intro
      for (let i = 0; i < 12 && (await page.getByTestId('world-shell').getAttribute('data-phase')) === 'intro'; i++) {
        await page.getByTestId('guide-next').click();
      }
      await expect(page.getByTestId('world-shell')).toHaveAttribute('data-phase', 'map');
      await page.screenshot({ path: info.outputPath(`${worldId}-map.png`) });

      // First stop
      await page.locator('[data-testid^="stop-"]:enabled').first().click();
      await expect(page.getByTestId('world-shell')).toHaveAttribute('data-phase', 'explore', { timeout: 20_000 });
      await page.waitForTimeout(800);
      await page.screenshot({ path: info.outputPath(`${worldId}-explore.png`) });
      for (let i = 0; i < 20 && (await page.getByTestId('world-shell').getAttribute('data-phase')) === 'explore'; i++) {
        await page.getByTestId('guide-next').click();
      }

      const phase = await page.getByTestId('world-shell').getAttribute('data-phase');
      if (phase === 'task') {
        await expect(page.getByTestId('task-banner')).toBeVisible();
        await page.waitForTimeout(1200);
        await page.screenshot({ path: info.outputPath(`${worldId}-task.png`) });
        // Use the accessibility "help / skip" path (appears after a delay) to keep the test deterministic.
        await skipTask(page);
      }

      await expect(page.getByTestId('quiz-prompt')).toBeVisible();
      await solveQuiz(page);
      await expect(page.getByTestId('reward-card')).toBeVisible();
      await page.screenshot({ path: info.outputPath(`${worldId}-reward.png`) });

      expect(watch.external, 'no requests may leave the origin').toEqual([]);
      expect(watch.problems).toEqual([]);
    });
  }
});
