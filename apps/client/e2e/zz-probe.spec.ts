// TEMPORARY diagnostic for the Windows CI runner (PR 43); removed before merge.
import { test } from '@playwright/test';
test.describe.configure({ mode: 'serial' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('gpd4.muted', '1'));
});
for (const q of ['size=small&env=0', 'size=small&env=1', 'size=large&env=1'])
  test(`probe ${q}`, async ({ page }) => {
    test.setTimeout(60_000);
    page.on('pageerror', (e) => console.log('PROBE pageerror', e.message));
    page.on('console', (m) => m.type() === 'error' && console.log('PROBE console', m.text()));
    await page.goto(`/local-vs?autopilot=1&speed=1&seed=21&tier=easy&start=1&${q}`);
    const t0 = Date.now();
    await page.waitForSelector(
      '[data-testid="match"][data-phase="countdown"], [data-testid="match"][data-phase="playing"]',
      { timeout: 60_000 },
    );
    const loadMs = Date.now() - t0;
    const gl = await page.evaluate(() => {
      const c = document
        .createElement('canvas')
        .getContext('webgl2') as WebGL2RenderingContext | null;
      if (!c) return 'no webgl2';
      const ext = c.getExtension('WEBGL_debug_renderer_info');
      return ext
        ? String(c.getParameter(ext.UNMASKED_RENDERER_WEBGL))
        : String(c.getParameter(c.RENDERER));
    });
    console.log(`PROBE ${q}: load ${loadMs} ms, GL ${gl}`);
    await page.waitForTimeout(5000);
    const r = await page.evaluate(
      () =>
        new Promise<string>((res) => {
          let n = 0;
          let max = 0;
          let last = performance.now();
          const t0 = last;
          const f = () => {
            const t = performance.now();
            max = Math.max(max, t - last);
            last = t;
            n++;
            if (t - t0 < 3000) requestAnimationFrame(f);
            else res(`fps ${(n / 3).toFixed(1)} worst ${max.toFixed(0)} ms`);
          };
          requestAnimationFrame(f);
        }),
    );
    console.log(`PROBE ${q}: ${r}`);
  });
