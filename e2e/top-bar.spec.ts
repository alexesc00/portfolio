import { expect, test, type Page } from '@playwright/test';

// The top bar gets out of the way while the visitor reads down the page,
// and comes back as soon as they head back up.
test('the top bar hides on the way down and returns on the way up', async ({
  page,
}) => {
  await page.goto('/');
  const bar = page.locator('[data-top-bar]');
  await expect(bar).not.toHaveAttribute('data-hidden');

  await page.evaluate(() => scrollBy(0, 1200));
  await expect(bar).toHaveAttribute('data-hidden');

  await page.evaluate(() => scrollBy(0, -200));
  await expect(bar).not.toHaveAttribute('data-hidden');
});

// With reduced motion on, the bar still hides and returns, but jumps
// there rather than sliding.
test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the top bar hides without sliding', async ({ page }) => {
    await page.goto('/');
    const bar = page.locator('[data-top-bar]');

    await page.evaluate(() => scrollBy(0, 1200));
    await expect(bar).toHaveAttribute('data-hidden');
    const sliding = await bar.evaluate(
      (element) => element.getAnimations().length,
    );
    expect(sliding).toBe(0);
  });
});

// On a touch screen the bar moves with the thumb, so a thumb that wobbles
// while reading only lets it peek in and back out, instead of sliding the
// whole bar in and out on every wobble. Real touch drags need Chromium.
test.describe('on a touch screen', () => {
  test.skip(
    ({ isMobile, browserName }) => !isMobile || browserName !== 'chromium',
    'Touch drags are driven through Chromium',
  );

  /**
   * Drags the page by `distance` px. The thumb lets go without a flick,
   * unless `flick` is set, when the page coasts on after it.
   */
  async function drag(
    page: Page,
    distance: number,
    { speed = 400, flick = false } = {},
  ) {
    const session = await page.context().newCDPSession(page);
    await session.send('Input.synthesizeScrollGesture', {
      x: 200,
      y: 500,
      // The thumb moves the other way to the page.
      yDistance: -distance,
      speed,
      gestureSourceType: 'touch',
      preventFling: !flick,
    });
  }

  /** How far into view the bar reached, in px, while `act` ran. */
  async function mostShownDuring(page: Page, act: () => Promise<void>) {
    await page.evaluate(() => {
      const bar = document.querySelector('[data-top-bar]');
      const record = window as unknown as {
        mostShown: number;
        watching: boolean;
      };
      record.mostShown = -Infinity;
      record.watching = true;
      const watch = () => {
        if (!bar || !record.watching) return;
        record.mostShown = Math.max(
          record.mostShown,
          bar.getBoundingClientRect().bottom,
        );
        requestAnimationFrame(watch);
      };
      requestAnimationFrame(watch);
    });
    await act();
    return page.evaluate(() => {
      const record = window as unknown as {
        mostShown: number;
        watching: boolean;
      };
      record.watching = false;
      return record.mostShown;
    });
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => scrollTo(0, 2500));
    await drag(page, 200);
    await expect(page.locator('[data-top-bar]')).toHaveAttribute('data-hidden');
  });

  test('a thumb that wobbles only lets the bar peek in', async ({ page }) => {
    const bar = page.locator('[data-top-bar]');

    const mostShown = await mostShownDuring(page, async () => {
      for (let i = 0; i < 3; i++) {
        await drag(page, -12);
        await drag(page, 30);
      }
    });

    // Never more than the 12px the page went back up, give or take a frame.
    expect(mostShown).toBeLessThanOrEqual(16);
    await expect(bar).toHaveAttribute('data-hidden');
  });

  test('the bar follows the thumb back, and settles in view once mostly shown', async ({
    page,
  }) => {
    const bar = page.locator('[data-top-bar]');

    await drag(page, -50);
    await expect(bar).not.toHaveAttribute('data-hidden');
    await expect
      .poll(() =>
        bar.evaluate((element) => element.getBoundingClientRect().top),
      )
      .toBe(0);
  });

  test('the bar starts settling as soon as the thumb lets go', async ({
    page,
  }) => {
    const bar = page.locator('[data-top-bar]');
    const top = () =>
      bar.evaluate((element) => element.getBoundingClientRect().top);

    await drag(page, -20);
    const atLetGo = await top();
    await page.waitForTimeout(90);

    // Already on its way back out, rather than waiting for the page.
    expect(await top()).toBeLessThan(atLetGo - 3);
    // All the way out: its bottom edge at the top of the screen.
    await expect
      .poll(() =>
        bar.evaluate((element) => element.getBoundingClientRect().bottom),
      )
      .toBe(0);
  });

  test('a quick flick up brings the bar back, as the page coasts on', async ({
    page,
  }) => {
    const bar = page.locator('[data-top-bar]');

    await drag(page, -24, { speed: 1600, flick: true });
    await expect
      .poll(() =>
        bar.evaluate((element) => element.getBoundingClientRect().top),
      )
      .toBe(0);
    await expect(bar).not.toHaveAttribute('data-hidden');
  });
});
