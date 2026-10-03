import { expect, test } from '@playwright/test';

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
