import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('gpd4.locale', 'en');
    window.localStorage.setItem('gpd4.muted', '1');
  });
});

const state = (page: Page) =>
  page.evaluate(() => {
    const s = window.__gpd4!.state();
    return {
      tick: s.tick,
      phase: s.phase,
      players: s.players.map((p) => ({ x: p.x, y: p.y, bombHold: p.bombHold, facing: p.facing })),
    };
  });

async function waitPlaying(page: Page) {
  await expect(page.getByTestId('match')).toHaveAttribute('data-phase', 'playing', {
    timeout: 15_000,
  });
}

test('G-001 / UI-05: Local VS runs a full match to the results screen; Rematch starts a new one', async ({
  page,
}) => {
  await page.goto('/local-vs?autopilot=1&speed=8&seed=21&size=small');
  await page.getByTestId('start-match').click();
  await waitPlaying(page);
  const results = page.getByTestId('results');
  await expect(results).toBeVisible({ timeout: 60_000 });
  await expect(results.getByRole('heading')).toContainText(/wins!|Draw/);
  const first = await page.evaluate(() => window.__gpd4!.state().outcome);
  expect(first).not.toBeNull();
  await page.getByTestId('rematch').click();
  await waitPlaying(page);
  await expect(page.getByTestId('results')).toBeHidden();
});

test('G-001: Solo vs AI runs a full match to the results screen', async ({ page }) => {
  await page.goto('/play?autopilot=1&speed=8&seed=5&start=1');
  await expect(page.getByTestId('results')).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('results-back').click();
  await expect(page.getByTestId('nav-play')).toBeVisible();
});

test('CTRL-01: two players on one keyboard move at once; holding a direction while charging works', async ({
  page,
}) => {
  await page.goto('/local-vs?seed=7&size=small&start=1');
  await waitPlaying(page);
  const before = await state(page);
  // P1 holds S (down) and charges Q; P2 holds Arrow Up at the same time.
  await page.keyboard.down('KeyS');
  await page.keyboard.down('ArrowUp');
  await page.keyboard.down('KeyQ');
  await page.waitForTimeout(400);
  const during = await state(page);
  await page.keyboard.up('KeyS');
  await page.keyboard.up('ArrowUp');
  await page.keyboard.up('KeyQ');
  expect(during.players[0]!.y).toBeGreaterThan(before.players[0]!.y);
  expect(during.players[1]!.y).toBeLessThan(before.players[1]!.y);
  expect(during.players[0]!.bombHold).toBeGreaterThan(5);
});

test('TIME-02 / OC-04: Esc pauses (no ticks run), Resume continues, Leave gives a forfeit', async ({
  page,
}) => {
  await page.goto('/local-vs?seed=8&start=1');
  await waitPlaying(page);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  const t1 = (await state(page)).tick;
  await page.waitForTimeout(500);
  expect((await state(page)).tick).toBe(t1);
  await page.getByTestId('resume').click();
  await page.waitForTimeout(300);
  expect((await state(page)).tick).toBeGreaterThan(t1);
  await page.keyboard.press('KeyP');
  await page.getByTestId('leave-p2').click();
  const results = page.getByTestId('results');
  await expect(results).toHaveAttribute('data-winner', '0');
  await expect(results).toHaveAttribute('data-reason', 'forfeit');
});

test('UI-04: the HUD shows Life, energy, timer, phase and boss HP', async ({ page }) => {
  await page.goto('/play?seed=3&size=medium&tier=hard&start=1');
  await waitPlaying(page);
  await expect(page.getByTestId('life-p1')).toHaveAttribute('data-value', '3');
  await expect(page.getByTestId('hud-p1')).toContainText('Attack');
  await expect(page.getByTestId('hud-p2')).toContainText('Defense');
  await expect(page.getByTestId('hud-phase')).toHaveText(/Boss Phase/i);
  await expect(page.getByTestId('hud-timer')).toHaveText(/^\d+:\d\d$/);
  await expect(page.getByTestId('boss-hp')).toHaveAttribute('data-value', '12');
  await expect(page.getByTestId('match-canvas')).toBeVisible();
});

test('M-005: changing the theme mid-match keeps the state hash', async ({ page }) => {
  await page.goto('/local-vs?seed=9&start=1');
  await waitPlaying(page);
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  const hash = await page.evaluate(() => window.__gpd4!.hash());
  for (const theme of ['desert', 'caverns', 'neon', 'volcano', 'garden']) {
    await page.getByTestId('pause-theme').selectOption(theme);
    expect(await page.evaluate(() => window.__gpd4!.hash())).toBe(hash);
  }
});

test('M2b: the environment is on by default, Off gives the plain maze, and an Ultimate match with every pattern runs to the end', async ({
  page,
}) => {
  await page.goto('/local-vs?seed=21&size=medium&tier=ultimate');
  await expect(page.getByTestId('setup-environment')).toHaveValue('true');
  await page.getByTestId('start-match').click();
  await waitPlaying(page);
  const kinds = await page.evaluate(() => [
    ...new Set(window.__gpd4!.state().env.map((e) => e.kind)),
  ]);
  for (const k of ['spike', 'shock', 'snare', 'pad', 'boost', 'ice', 'conveyor', 'gate'])
    expect(kinds).toContain(k);

  await page.goto('/local-vs?seed=21&size=medium&env=0&start=1');
  await waitPlaying(page);
  expect(await page.evaluate(() => window.__gpd4!.state().env.length)).toBe(0);

  await page.goto('/local-vs?autopilot=1&speed=8&seed=33&size=medium&tier=ultimate&start=1');
  await expect(page.getByTestId('results')).toBeVisible({ timeout: 90_000 });
});
