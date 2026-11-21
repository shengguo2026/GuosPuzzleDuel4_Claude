import { expect, test } from '@playwright/test';

const ROUTES = [
  ['play', 'Solo vs AI'],
  ['campaign', 'Campaign'],
  ['challenges', 'Challenges'],
  ['local-vs', 'Local VS'],
  ['wifi-vs', 'Local WiFi VS'],
  ['profiles', 'Profiles'],
  ['store', 'Store'],
  ['museum', 'Museum'],
  ['statistics', 'Statistics'],
  ['settings', 'Settings'],
] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.localStorage.getItem('gpd4.locale'))
      window.localStorage.setItem('gpd4.locale', 'en');
  });
});

test('UI-02: every dashboard route opens from the dashboard and back', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle("Guo's Puzzle Duel IV");
  for (const [id, title] of ROUTES) {
    await page.getByTestId(`nav-${id}`).click();
    await expect(page).toHaveURL(new RegExp(`/${id}$`));
    await expect(
      page.getByTestId(`page-${id}`).getByRole('heading', { name: title }),
    ).toBeVisible();
    await page.getByTestId('back').click();
    await expect(page.getByTestId(`nav-${id}`)).toBeVisible();
  }
});

test('UI-02: every route opens directly by URL and survives a reload', async ({ page }) => {
  for (const [id] of ROUTES) {
    await page.goto(`/${id}`);
    await expect(page.getByTestId(`page-${id}`)).toBeVisible();
  }
  await page.reload();
  await expect(page.getByTestId('page-settings')).toBeVisible();
});

test('OPS-02: the page reaches the host over HTTP and WebSocket on the bound port', async ({
  page,
  baseURL,
}) => {
  const port = new URL(baseURL!).port;
  await page.goto('/');
  await expect(page.getByTestId('host-status')).toHaveAttribute('data-state', 'connected');
  await expect(page.getByTestId('host-port')).toContainText(`port ${port}`);
});

test('UI-06: the language switch shows Chinese and German, and is remembered', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('language').selectOption('zh');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('盛国的迷宫对决 IV');
  await expect(page.getByTestId('nav-settings')).toContainText('设置');
  await page.getByTestId('language').selectOption('de');
  await expect(page.getByTestId('nav-settings')).toContainText('Einstellungen');
  await page.goto('/store');
  await expect(page.getByTestId('page-store')).toContainText('Laden');
});

test('UI-02: the unified Guo favicon is served', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
  const res = await request.get('/favicon.svg');
  expect(res.headers()['content-type']).toBe('image/svg+xml');
  expect(await res.text()).toContain('aria-label="Guo mark"');
});
