import { expect, test as base, type Page } from '@playwright/test';
import { finishExplore, openWorldMap, seedExplorer, skipTask, solveQuiz, visitStop, watchPage, type Band } from './helpers';

const WORLD = 'human-heart';
const STOPS = ['meet-heart', 'heartbeat', 'four-rooms', 'take-apart', 'valves', 'blood-ride', 'healthy-heart'] as const;

/**
 * The strict production CSP (no inline styles, Trusted Types) cannot be met by the Vite *dev* server, which
 * injects CSS as inline <style> tags. Only when the suite runs against a dev server (PW_BASE_URL=…vite) do we
 * bypass CSP; against the preview build the real policy is enforced and any violation fails via watchPage().
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

/** Run at the "medium" tier we budget for (SwiftShader renders on the CPU, so this also keeps CI quick). */
async function preferMediumQuality(page: Page) {
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

async function startTask(page: Page, band: Band, stopId: (typeof STOPS)[number]) {
  await seedExplorer(page, { band, completed: { [WORLD]: [...STOPS] } });
  await preferMediumQuality(page);
  await openWorldMap(page, WORLD);
  await visitStop(page, stopId);
  await finishExplore(page);
  await expectPhase(page, 'task');
}

test.describe('Inside the Human Heart', () => {
  test('map overview: the heart, the vessel loop and all seven stops', async ({ page }, info) => {
    test.setTimeout(240_000);
    const watch = watchPage(page);
    await seedExplorer(page, { band: 'junior', completed: { [WORLD]: STOPS.slice(0, 4) } });
    await preferMediumQuality(page);
    await openWorldMap(page, WORLD);
    for (const id of STOPS.slice(0, 5)) await expect(page.getByTestId(`stop-${id}`)).toBeEnabled();
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
      await preferMediumQuality(page);
      await openWorldMap(page, WORLD);

      await visitStop(page, stopId);
      // Let each stop's arrival animation (x-ray sweep, camera glide) settle before the explore shot.
      await page.waitForTimeout(3500);
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
    // Buttons and bubbles gently "breathe"; with reduced motion they hold still, so clicks are deterministic.
    test.use({ contextOptions: { reducedMotion: 'reduce' } });

    test('Heart Lab (tiny): pull two parts out, then click them back in', async ({ page }, info) => {
      test.setTimeout(300_000);
      const watch = watchPage(page);
      await startTask(page, 'tiny', 'take-apart');
      await page.getByTestId('lab-pull-aorta').click();
      await page.getByTestId('lab-pull-pa').click();
      await expect(page.getByTestId('lab-place-aorta')).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: info.outputPath('lab-exploded.png') });
      await page.getByTestId('lab-place-aorta').click();
      await page.getByTestId('lab-place-pa').click();
      await expectPhase(page, 'quiz', 30_000);
      expect(watch.external, 'no requests may leave the origin').toEqual([]);
      expect(watch.problems).toEqual([]);
    });

    test('Heart Lab (senior): rebuild from function clues', async ({ page }, info) => {
      test.setTimeout(300_000);
      const watch = watchPage(page);
      await startTask(page, 'senior', 'take-apart');
      const pulled: string[] = [];
      for (let n = 0; n < 10; n++) {
        const chip = page.locator('[data-testid^="lab-pull-"]').first();
        const id = ((await chip.getAttribute('data-testid')) ?? '').replace('lab-pull-', '');
        await chip.click();
        pulled.push(id);
      }
      // The first clue describes the first part pulled out.
      await expect(page.getByTestId('lab-clue')).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: info.outputPath('lab-senior-exploded.png') });
      for (const id of pulled) await page.getByTestId(`lab-place-${id}`).click();
      await expectPhase(page, 'quiz', 30_000);
      expect(watch.external, 'no requests may leave the origin').toEqual([]);
      expect(watch.problems).toEqual([]);
    });

    test('Heartbeat (tiny): tap the drum on the squeezes', async ({ page }) => {
      test.setTimeout(300_000);
      const watch = watchPage(page);
      await startTask(page, 'tiny', 'heartbeat');
      const drum = page.getByTestId('beat-drum');
      for (let n = 0; n < 120 && (await drum.isVisible().catch(() => false)); n++) {
        await drum.click({ timeout: 5_000 }).catch(() => undefined);
        await page.waitForTimeout(250);
      }
      await expectPhase(page, 'quiz', 30_000);
      expect(watch.external, 'no requests may leave the origin').toEqual([]);
      expect(watch.problems).toEqual([]);
    });

    test('Blood ride (junior): grab the oxygen in the lungs and feed the muscle', async ({ page }, info) => {
      test.setTimeout(360_000);
      const watch = watchPage(page);
      await startTask(page, 'junior', 'blood-ride');
      const grab = page.getByTestId('ride-bubble');
      await expect(grab).toBeVisible({ timeout: 200_000 });
      await page.screenshot({ path: info.outputPath('ride-lungs.png') });
      for (let n = 0; n < 4; n++) await grab.click();
      const deliver = page.getByTestId('ride-deliver');
      await expect(deliver).toBeVisible({ timeout: 200_000 });
      await page.screenshot({ path: info.outputPath('ride-muscle.png') });
      await deliver.click();
      await expectPhase(page, 'quiz', 30_000);
      expect(watch.external, 'no requests may leave the origin').toEqual([]);
      expect(watch.problems).toEqual([]);
    });
  });
});
