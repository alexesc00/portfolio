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
