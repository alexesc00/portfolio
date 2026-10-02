import type { Page } from '@playwright/test';

/** Waits until nothing on the page is still moving. */
export async function settled(page: Page) {
  await page.waitForFunction(() =>
    document.getAnimations().every(({ playState }) => playState !== 'running'),
  );
}

/**
 * The first row that starts closed and has rows under it, so opening it
 * slides them. Some rows start open, so the first row won't do.
 */
export function closedRow(page: Page) {
  return page
    .locator(
      'tbody:not(:last-child):has([data-row-toggle][aria-expanded="false"])',
    )
    .first();
}

/**
 * Opens the first closed row, waits for its drawer to stop, and returns
 * the write-up it opened.
 */
export async function openClosedRow(page: Page) {
  const toggle = closedRow(page).locator('[data-row-toggle]');
  const id = await toggle.getAttribute('aria-controls');
  await toggle.click();
  await settled(page);
  return page.locator(`[id="${id}"]`);
}
