import { expect, test } from '@playwright/test';

// With reduced motion on, the credit line and theme switch still leave on
// the first scroll down, but disappear at once rather than fading.
test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the bottom line hides without fading', async ({ page }) => {
    await page.goto('/');
    const line = page.locator('[data-bottom-line]');

    await page.evaluate(() => scrollBy(0, 1200));
    await expect(line).toHaveAttribute('data-hidden');
    const fading = await line.evaluate((element) =>
      [...element.children].reduce(
        (count, child) => count + child.getAnimations().length,
        0,
      ),
    );
    expect(fading).toBe(0);
  });
});
