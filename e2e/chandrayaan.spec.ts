import { expect, test as base, type Page } from '@playwright/test';
import { finishExplore, openWorldMap, seedExplorer, skipTask, solveQuiz, visitStop, watchPage } from './helpers';

const WORLD = 'chandrayaan';
const STOPS = ['launch-pad', 'earth-orbit', 'to-the-moon', 'separation', 'landing', 'pragyan-rover', 'moon-night'] as const;

/**
 * The strict production CSP (no inline styles, Trusted Types) cannot be met by the Vite *dev* server, which injects
 * CSS as inline <style> tags. Only when the suite is pointed at a dev server (PW_BASE_URL=…vite) do we bypass CSP;
 * against the preview build the real policy is enforced and any violation fails the test via watchPage().
 */
const test = base.extend<{ devServer: boolean }>({
  devServer: async ({ playwright, baseURL }, provide) => {
    const api = await playwright.request.newContext({ baseURL });
    const res = await api.get('./@vite/client').catch(() => null);
    const dev = !!res && res.ok() && (res.headers()['content-type'] ?? '').includes('javascript');
    await api.dispose();
    await provide(dev);
  },
  bypassCSP: async ({ devServer }, provide) => {
    await provide(devServer);
  },
});

/** Run the world at the "medium" tier we budget for (SwiftShader renders on the CPU, so this also keeps CI quick). */
async function useMediumQuality(page: Page) {
  await page.addInitScript(() => {
    try {
      const raw = window.localStorage.getItem('wonderverse:v1');
      if (!raw) return;
      const state = JSON.parse(raw) as { settings: { quality: string } };
      state.settings.quality = 'medium';
      window.localStorage.setItem('wonderverse:v1', JSON.stringify(state));
    } catch {
      /* ignore */
    }
  });
}

async function expectPhase(page: Page, phase: string, timeout = 30_000) {
  await expect(page.getByTestId('world-shell')).toHaveAttribute('data-phase', phase, { timeout });
}

test.describe('Chandrayaan Moon Mission', () => {
  test('mission map shows every stop, done stops and the next one', async ({ page }, info) => {
    test.setTimeout(240_000);
    const watch = watchPage(page);
    await seedExplorer(page, { band: 'junior', completed: { [WORLD]: STOPS.slice(0, 6) } });
    await openWorldMap(page, WORLD);
    for (const id of STOPS) await expect(page.getByTestId(`stop-${id}`)).toBeEnabled();
    await expect(page.locator('canvas').first()).toBeVisible();
    await page.waitForTimeout(3500);
    await page.screenshot({ path: info.outputPath('00-map.png') });
    expect(watch.external, 'no requests may leave the origin').toEqual([]);
    expect(watch.problems).toEqual([]);
  });

  STOPS.forEach((stopId, i) => {
    test(`${stopId}: explore → task → quiz → reward`, async ({ page }, info) => {
      test.setTimeout(420_000);
      const watch = watchPage(page);
      const tag = `${String(i + 1).padStart(2, '0')}-${stopId}`;
      await seedExplorer(page, { band: 'junior', completed: { [WORLD]: [...STOPS] } });
      await useMediumQuality(page);
      await openWorldMap(page, WORLD);

      await visitStop(page, stopId);
      await page.waitForTimeout(2500);
      await page.screenshot({ path: info.outputPath(`${tag}-explore.png`) });

      await finishExplore(page);
      await expectPhase(page, 'task');
      await expect(page.getByTestId('task-banner')).toBeVisible();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: info.outputPath(`${tag}-task.png`) });

      await skipTask(page);
      await expect(page.getByTestId('quiz-prompt')).toBeVisible({ timeout: 30_000 });
      await solveQuiz(page);
      await expect(page.getByTestId('reward-card')).toBeVisible();
      await page.screenshot({ path: info.outputPath(`${tag}-reward.png`) });

      expect(watch.external, 'no requests may leave the origin').toEqual([]);
      expect(watch.problems).toEqual([]);
    });
  });

  test.describe('played for real', () => {
    // The big buttons gently "breathe"; with reduced motion they hold still, so clicks are deterministic.
    test.use({ contextOptions: { reducedMotion: 'reduce' } });

    test('launch task can be played for real: checks, then tap-tap-tap LAUNCH (tap alternative to holding)', async ({ page }, info) => {
      test.setTimeout(300_000);
      const watch = watchPage(page);
      await seedExplorer(page, { band: 'junior', completed: { [WORLD]: [] } });
      await useMediumQuality(page);
      await openWorldMap(page, WORLD);
      await visitStop(page, 'launch-pad');
      await finishExplore(page);
      await expectPhase(page, 'task');

      await expect(page.getByTestId('launch-button')).toBeDisabled();
      for (const id of ['fuel', 'spacecraft', 'weather']) {
        await page.getByTestId(`check-${id}`).click();
        await expect(page.getByTestId(`check-${id}`)).toHaveAttribute('aria-pressed', 'true');
      }
      const launch = page.getByTestId('launch-button');
      await expect(launch).toBeEnabled();
      for (let n = 0; n < 16 && (await launch.isVisible().catch(() => false)); n++) {
        await launch.click({ timeout: 5_000 }).catch(() => undefined);
        await page.waitForTimeout(100);
      }
      await expect(launch).toBeHidden({ timeout: 20_000 });
      await page.screenshot({ path: info.outputPath('launch-countdown.png') });
      // Countdown (5 s) + liftoff, then the shell moves on to the quiz by itself.
      await expectPhase(page, 'quiz', 60_000);
      expect(watch.external, 'no requests may leave the origin').toEqual([]);
      expect(watch.problems).toEqual([]);
    });

    test('moon night can be played for real by a tiny explorer: tuck Pragyan in, HOP, tuck Vikram in', async ({ page }, info) => {
      test.setTimeout(300_000);
      const watch = watchPage(page);
      await seedExplorer(page, { band: 'tiny', completed: { [WORLD]: [...STOPS] } });
      await useMediumQuality(page);
      await openWorldMap(page, WORLD);
      await visitStop(page, 'moon-night');
      await finishExplore(page);
      await expectPhase(page, 'task');

      await page.getByTestId('tuck-rover').click();
      await page.getByTestId('hop-button').click({ timeout: 20_000 });
      await expect(page.getByTestId('tuck-lander')).toBeVisible({ timeout: 40_000 });
      await page.screenshot({ path: info.outputPath('night-after-hop.png') });
      await page.getByTestId('tuck-lander').click();
      await expectPhase(page, 'quiz', 60_000);
      expect(watch.external, 'no requests may leave the origin').toEqual([]);
      expect(watch.problems).toEqual([]);
    });
  });
});
