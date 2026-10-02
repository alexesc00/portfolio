import { expect, test } from '@playwright/test';
import { settled } from './rows';

// The live app is two copies of a Python runtime. Left running in a closed
// row they keep using the visitor's CPU and memory, so closing the row
// stops them, and opening it again starts them afresh.
test('closing the showcase row stops the live app', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === 'phone',
    'Phones only ever show the stills',
  );
  // Starting Python in the browser takes a while, and it starts twice here
  test.setTimeout(240_000);

  await page.goto('/');
  const showcase = page.locator('[data-status]');
  await showcase.scrollIntoViewIfNeeded();
  await expect(showcase).toHaveAttribute('data-status', 'live', {
    timeout: 120_000,
  });

  const toggle = page.locator('tbody:has([data-status]) [data-row-toggle]');
  await toggle.click();
  await settled(page);
  await expect(showcase.locator('iframe')).toHaveCount(0);
  await expect(showcase).toHaveAttribute('data-status', 'still');

  await toggle.click();
  await expect(showcase).toHaveAttribute('data-status', 'live', {
    timeout: 120_000,
  });
});
