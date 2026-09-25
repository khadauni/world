import { expect, type Page } from '@playwright/test';

/** Collects console errors, page errors, CSP violations and any request leaving the origin. */
export function watchPage(page: Page) {
  const problems: string[] = [];
  const external: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error' && !/WebGL|GPU stall|swiftshader|GL_/i.test(text)) problems.push(`console: ${text}`);
    if (/Content Security Policy|Refused to/i.test(text)) problems.push(`csp: ${text}`);
  });
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname) && !url.protocol.startsWith('data') && !url.protocol.startsWith('blob')) {
      external.push(req.url());
    }
  });
  return { problems, external };
}

export type Band = 'tiny' | 'junior' | 'senior';

/**
 * Skip onboarding: seed local storage with an explorer (and optional finished stops) before the app loads.
 * `completed` maps worldId → stop ids that should count as done (so later stops are unlocked).
 */
export async function seedExplorer(page: Page, opts: { name?: string; band?: Band; avatar?: string; completed?: Record<string, string[]>; badges?: string[] } = {}) {
  const id = 'p_e2e';
  const worlds: Record<string, { stops: Record<string, { stars: number; at: number }>; badgeAt?: number }> = {};
  for (const [worldId, stops] of Object.entries(opts.completed ?? {})) {
    worlds[worldId] = { stops: Object.fromEntries(stops.map((s) => [s, { stars: 3, at: 1 }])) };
    if (opts.badges?.includes(worldId)) worlds[worldId].badgeAt = 1;
  }
  const state = {
    v: 1,
    activeId: id,
    profiles: [{ id, name: opts.name ?? 'Mia', avatar: opts.avatar ?? 'fox', band: opts.band ?? 'junior', createdAt: 1 }],
    progress: { [id]: { worlds, playLog: {} } },
    settings: { sound: false, narration: false, speechRate: 1, quality: 'high', reducedMotion: 'off', breakMinutes: 0 },
  };
  await page.addInitScript((json) => {
    try {
      window.localStorage.setItem('wonderverse:v1', json);
    } catch {
      /* ignore */
    }
  }, JSON.stringify(state));
}

/** Open a world and advance to the map (past the intro). */
export async function openWorldMap(page: Page, worldId: string) {
  await page.goto(`./#/world/${worldId}`);
  const shell = page.getByTestId('world-shell');
  await expect(shell).toBeVisible({ timeout: 30_000 });
  for (let i = 0; i < 15 && (await shell.getAttribute('data-phase')) === 'intro'; i++) {
    const skip = page.getByTestId('tour-skip');
    if (await skip.isVisible().catch(() => false)) await skip.click();
    else await page.getByTestId('guide-next').click();
  }
  await expect(shell).toHaveAttribute('data-phase', 'map');
}

/** From the map, fly to a stop and wait for the explore phase. */
export async function visitStop(page: Page, stopId: string) {
  await page.getByTestId(`stop-${stopId}`).click();
  await expect(page.getByTestId('world-shell')).toHaveAttribute('data-phase', 'explore', { timeout: 20_000 });
}

/** Step through the guided tour to its end card, then start the mission (or the quiz when there is none). */
export async function finishExplore(page: Page) {
  const end = page.getByTestId('tour-end');
  for (let i = 0; i < 40 && !(await end.isVisible().catch(() => false)); i++) {
    await page.getByTestId('tour-next').click({ timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(150);
  }
  await expect(end).toBeVisible();
  const mission = page.getByTestId('start-mission');
  if (await mission.isVisible().catch(() => false)) await mission.click();
  else await page.getByTestId('start-quiz').click();
}

/** Take the "Skip to quiz" shortcut from the tour. */
export async function skipTourToQuiz(page: Page) {
  await page.getByTestId('tour-skip').click();
  await expect(page.getByTestId('quiz-prompt')).toBeVisible();
}

export async function createExplorer(page: Page, name = 'Aarav', age = 7) {
  await page.goto('./');
  await page.getByTestId('start-button').click();
  await page.getByTestId('name-input').fill(name);
  await page.getByTestId('name-next').click();
  await page.getByTestId('avatar-next').click();
  await page.getByTestId(`age-${age}`).click();
  await page.getByTestId('finish-profile').click();
  await expect(page.getByRole('heading', { name: `Hi, ${name}!` })).toBeVisible();
}

/** Answers the open quiz by trying choices until the reward card appears. */
export async function solveQuiz(page: Page) {
  const reward = page.getByTestId('reward-card');
  for (let guard = 0; guard < 40; guard++) {
    if (await reward.isVisible().catch(() => false)) return;
    const next = page.getByTestId('quiz-next');
    if (await next.isVisible().catch(() => false)) {
      await next.click({ timeout: 5_000 }).catch(() => undefined);
      await page.waitForTimeout(400);
      continue;
    }
    const choice = page.locator('[data-testid^="choice-"]:enabled').first();
    if (await choice.isVisible().catch(() => false)) await choice.click({ timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(250);
  }
  await expect(reward).toBeVisible();
}

/** Skips a task through the accessible help path (hint → skip). */
export async function skipTask(page: Page) {
  const skip = page.getByTestId('task-skip');
  const help = page.getByTestId('task-help');
  await expect(skip.or(help)).toBeVisible({ timeout: 40_000 });
  if (await help.isVisible().catch(() => false)) await help.click();
  await skip.click();
}
