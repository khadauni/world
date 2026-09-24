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
