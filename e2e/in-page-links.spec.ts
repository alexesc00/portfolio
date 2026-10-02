import { expect, test, type Page } from '@playwright/test';
import { openClosedRow } from './rows';

/** Opens the first row and presses its ask for the case study. */
async function askForCaseStudy(page: Page) {
  await page.goto('/');
  const row = await openClosedRow(page);
  await row.getByRole('link', { name: /Ask for the full case study/ }).click();
}

const contactTop = (page: Page) =>
  page.evaluate(() =>
    Math.round(
      document.getElementById('contact')?.getBoundingClientRect().top ?? NaN,
    ),
  );

// A ride covers at most one screen, so it never flicks through the
// principles on the way down.
test('the ask rides the last screen to Contact', async ({ page }) => {
  await page.goto('/');
  const row = await openClosedRow(page);
  const ask = row.getByRole('link', { name: /Ask for the full case study/ });
  await ask.scrollIntoViewIfNeeded();

  // Every frame of the ride, how many screens below the top Contact is.
  await page.evaluate(() => {
    const tops: number[] = [];
    Object.assign(window, { rideTops: tops });
    const watch = () => {
      const contact = document.getElementById('contact');
      if (contact && 'riding' in document.documentElement.dataset) {
        tops.push(contact.getBoundingClientRect().top / innerHeight);
      }
      requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
  });
  await ask.click();
  await expect.poll(() => contactTop(page)).toBeCloseTo(0, 0);
  const tops = await page.evaluate(
    () => (window as unknown as { rideTops: number[] }).rideTops,
  );

  expect(tops.length).toBeGreaterThan(0);
  for (const screens of tops) {
    expect(screens).toBeLessThanOrEqual(1.01);
    expect(screens).toBeGreaterThan(-0.01);
  }
  await expect.poll(() => contactTop(page)).toBeCloseTo(0, 0);
  await expect(page).toHaveURL(/#contact$/);
});

test('with reduced motion, the ask jumps straight to Contact', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const row = await openClosedRow(page);
  const ask = row.getByRole('link', { name: /Ask for the full case study/ });
  await ask.scrollIntoViewIfNeeded();
  // Where Contact is two frames after the click: a ride would take about
  // thirty frames to get there, a jump is already there.
  const topSoonAfter = page.evaluate(
    () =>
      new Promise<number>((resolve) =>
        addEventListener(
          'click',
          () =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() =>
                resolve(
                  document.getElementById('contact')?.getBoundingClientRect()
                    .top ?? NaN,
                ),
              ),
            ),
          { once: true },
        ),
      ),
  );
  await ask.click();

  expect(Math.abs(await topSoonAfter)).toBeLessThanOrEqual(1);
});

test('Top rides back up and brings the top bar back', async ({ page }) => {
  await askForCaseStudy(page);
  await expect.poll(() => contactTop(page)).toBeCloseTo(0, 0);
  await page.getByRole('link', { name: 'Back to Top' }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator('[data-top-bar]')).not.toHaveAttribute(
    'data-hidden',
  );
  await expect(page.locator('#top')).toBeFocused();
});
