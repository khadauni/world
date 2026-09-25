import { expect, test, type Page } from '@playwright/test';
import { finishExplore, openWorldMap, seedExplorer, skipTask, solveQuiz, visitStop, watchPage, type Band } from './helpers';

const WORLD = 'solar-system';
const STOPS = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'] as const;
const BANDS: readonly Band[] = ['tiny', 'junior', 'senior'];

/**
 * visitStop, with extra patience: software WebGL on a busy CI box can render a frame every few seconds, which
 * also delays the shell's own arrival timer beyond visitStop's 20 s.
 */
async function arrive(page: Page, id: string) {
  await visitStop(page, id).catch(async () => {
    await expect(page.getByTestId('world-shell')).toHaveAttribute('data-phase', 'explore', { timeout: 60_000 });
  });
}

test.describe('Solar System Voyage', () => {
  test('map overview: every stop visible, progress shown, nothing leaves the device', async ({ page }, info) => {
    test.setTimeout(360_000);
    const watch = watchPage(page);
    await seedExplorer(page, { name: 'Mia', band: 'junior', completed: { [WORLD]: ['sun', 'mercury', 'venus', 'earth'] } });
    await openWorldMap(page, WORLD);
    for (const id of STOPS) await expect(page.getByTestId(`stop-${id}`)).toBeAttached();
    await expect(page.getByTestId('stop-mars')).toBeEnabled();
    await expect(page.getByTestId('stop-jupiter')).toBeDisabled();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: info.outputPath('map.png') });
    expect(watch.external, 'no requests may leave the origin').toEqual([]);
    expect(watch.problems).toEqual([]);
  });

  test('tapping planets in 3D: a locked one explains itself, the next one launches the rocket', async ({ page }, info) => {
    test.setTimeout(420_000);
    const watch = watchPage(page);
    await seedExplorer(page, { name: 'Mia', band: 'junior', completed: { [WORLD]: ['sun', 'mercury', 'venus', 'earth'] } });
    await openWorldMap(page, WORLD);
    // Let the opening camera move settle, then tap just beside each name tag's anchor (inside the planet's hit area).
    await page.waitForTimeout(5000);
    const tapNear = async (id: string, dy: number) => {
      const box = await page.locator(`[data-label="map-${id}"]`).boundingBox();
      expect(box, `${id} tag is on screen`).not.toBeNull();
      if (box) await page.mouse.click(box.x, box.y + dy);
    };
    await tapNear('jupiter', 8); // tag sits above Jupiter
    await expect(page.getByText('That stop is still locked')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('world-shell')).toHaveAttribute('data-phase', 'map');

    await tapNear('mars', -8); // tag sits below Mars
    await expect(page.getByTestId('world-shell')).toHaveAttribute('data-phase', /travel|explore/, { timeout: 20_000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: info.outputPath('travel.png') });
    await expect(page.getByTestId('world-shell')).toHaveAttribute('data-phase', 'explore', { timeout: 60_000 });
    expect(watch.external).toEqual([]);
    expect(watch.problems).toEqual([]);
  });

  STOPS.forEach((id, i) => {
    const band = BANDS[i % BANDS.length] as Band;
    test(`${id} (${band}): travel → explore → task → quiz → reward`, async ({ page }, info) => {
      // Software WebGL (SwiftShader) renders the bloom tier at a few frames per second; give it room.
      test.setTimeout(900_000);
      const watch = watchPage(page);
      await seedExplorer(page, { name: 'Mia', band, avatar: 'panda', completed: { [WORLD]: [...STOPS] } });
      await openWorldMap(page, WORLD);
      await arrive(page, id);
      await page.waitForTimeout(2500);
      await page.screenshot({ path: info.outputPath(`${id}-explore.png`) });

      await finishExplore(page);
      await expect(page.getByTestId('world-shell')).toHaveAttribute('data-phase', 'task');
      await expect(page.getByTestId('task-banner')).toBeVisible();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: info.outputPath(`${id}-task.png`) });

      // Asking for the hint (💡) offers "Skip for now" straight away, so the skip path never races the banner's
      // help timer (on a slow software-GL runner "Help me!" can be swapped for "Skip" mid-click).
      await page.getByRole('button', { name: 'Show a hint' }).click();
      await skipTask(page);
      await expect(page.getByTestId('quiz-prompt')).toBeVisible();
      await solveQuiz(page);
      await expect(page.getByTestId('reward-card')).toBeVisible();

      expect(watch.external, 'no requests may leave the origin').toEqual([]);
      expect(watch.problems).toEqual([]);
    });
  });

  test('uranus: the "Tilt it!" buttons really complete the mission', async ({ page }, info) => {
    test.setTimeout(420_000);
    const watch = watchPage(page);
    await seedExplorer(page, { name: 'Leo', band: 'junior', completed: { [WORLD]: [...STOPS] } });
    await openWorldMap(page, WORLD);
    await arrive(page, 'uranus');
    await finishExplore(page);
    await expect(page.getByTestId('world-shell')).toHaveAttribute('data-phase', 'task');
    const tilt = page.getByTestId('tilt-tilt');
    for (let i = 0; i < 7; i++) {
      await tilt.click();
      await page.waitForTimeout(250);
    }
    await expect(page.getByTestId('uranus-angle')).toHaveText('98°');
    await page.screenshot({ path: info.outputPath('uranus-tilted.png') });
    await expect(page.getByTestId('quiz-prompt')).toBeVisible({ timeout: 10_000 });
    expect(watch.external).toEqual([]);
    expect(watch.problems).toEqual([]);
  });
});
