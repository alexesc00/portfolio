import { expect, test, type Page } from '@playwright/test';
import { settled } from './rows';

test.skip(({ isMobile }) => isMobile, 'Phones only ever show the stills');

const showcase = (page: Page) => page.locator('[data-status]');
const toggle = (page: Page) =>
  page.locator('tbody:has([data-status]) [data-row-toggle]');

/** Waits for the live app to finish starting. */
async function live(page: Page) {
  await expect(showcase(page)).toHaveAttribute('data-status', 'live', {
    timeout: 120_000,
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await showcase(page).scrollIntoViewIfNeeded();
});

// The live app is two copies of a Python runtime. Left running in a closed
// row they keep using the visitor's CPU and memory, so a row left closed
// stops them, and opening it again starts them afresh.
test('a row left closed stops the live app', async ({ page }) => {
  // Starting Python in the browser takes a while, and it starts twice here
  test.setTimeout(240_000);
  await live(page);

  await toggle(page).click();
  await settled(page);
  await expect(showcase(page).locator('iframe')).toHaveCount(0, {
    timeout: 10_000,
  });
  await expect(showcase(page)).toHaveAttribute('data-status', 'still');

  await toggle(page).click();
  await live(page);
});

// Starting two Pythons is heavy, so a visitor flicking the row open and
// shut shouldn't start one each time, or stall the row's slide with it.
test('flicking the row open and shut never starts the app', async ({
  page,
}) => {
  // Start from shut, with nothing running.
  await toggle(page).click();
  await settled(page);
  await expect(showcase(page).locator('iframe')).toHaveCount(0, {
    timeout: 10_000,
  });

  const starts = await page.evaluate(async () => {
    const root = document.querySelector<HTMLElement>('[data-status]');
    const button = document.querySelector<HTMLElement>(
      'tbody:has([data-status]) [data-row-toggle]',
    );
    if (!root || !button) throw new Error('No showcase row');
    let starts = 0;
    new MutationObserver(() => {
      if (root.dataset.status === 'starting') starts++;
    }).observe(root, { attributes: true, attributeFilter: ['data-status'] });
    // Open and shut faster than the row can finish sliding.
    for (let i = 0; i < 6; i++) {
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return starts;
  });
  expect(starts).toBe(0);
});

// Closing and reopening a moment later keeps the app that's running,
// rather than throwing it away and starting another.
test('reopening the row soon after closing keeps the running app', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await live(page);
  const frame = await showcase(page).locator('iframe').first().elementHandle();

  await toggle(page).click();
  await settled(page);
  await toggle(page).click();
  await settled(page);

  await expect(showcase(page)).toHaveAttribute('data-status', 'live');
  expect(await frame?.evaluate((element) => element.isConnected)).toBe(true);
});

// With reduced motion on, the live app appears over the stills at once
// rather than fading in.
test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the live app appears without fading', async ({ page }) => {
    const fades = await showcase(page)
      .locator('[data-live]')
      .first()
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return (
          style.transitionProperty !== 'none' &&
          style.transitionDuration.split(',').some((d) => parseFloat(d) > 0)
        );
      });
    expect(fades).toBe(false);
  });
});

// A tag names the look on its side of the seam, so once the seam covers
// that side the tag fades out, and it comes back when the seam moves away.
// Below 1024 wide only the stills show, so the seam can be moved at once
// rather than after the live app has loaded.
test.describe('on the stills', () => {
  test.use({ viewport: { width: 900, height: 900 } });

  test('a tag hides while the seam covers its look', async ({ page }) => {
    const seam = showcase(page).locator('[data-seam]');
    const stockTag = showcase(page).locator('[data-tag=stock]');
    const brandTag = showcase(page).locator('[data-tag=brand]');

    await seam.press('Home');
    await expect(stockTag).toHaveCSS('opacity', '0');
    await expect(brandTag).toHaveCSS('opacity', '1');

    await seam.press('End');
    await expect(stockTag).toHaveCSS('opacity', '1');
    await expect(brandTag).toHaveCSS('opacity', '0');
  });
});

// The seam starts a third of the way across, but on a phone a third
// falls on the "Stock Streamlit" tag and would hide it, so there the
// seam starts halfway.
test.describe('on a phone-width screen', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('the seam starts halfway, clear of both tags', async ({ page }) => {
    await expect(showcase(page).locator('[data-seam]')).toHaveAttribute(
      'aria-valuenow',
      '50',
    );
    for (const look of ['stock', 'brand']) {
      const opacity = await showcase(page)
        .locator(`[data-tag=${look}]`)
        .evaluate((element) => Number(getComputedStyle(element).opacity));
      expect(opacity).toBeGreaterThan(0.5);
    }
  });
});

test('the seam starts a third of the way across from 768 wide', async ({
  page,
}) => {
  await expect(showcase(page).locator('[data-seam]')).toHaveAttribute(
    'aria-valuenow',
    '33',
  );
});
