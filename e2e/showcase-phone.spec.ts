import { expect, test } from '@playwright/test';

test.skip(
  ({ isMobile, browserName }) => !isMobile || browserName !== 'chromium',
  'Touch drags are driven through Chromium',
);

// The seam is a strip down the whole height of the stills, a third of the
// way across, right where a thumb lands. Scrolling past it shouldn't catch.
test('a thumb that starts on the seam still scrolls the page', async ({
  page,
}) => {
  await page.goto('/');
  const seam = page.locator('[data-seam]');
  await seam.evaluate((element) =>
    element.scrollIntoView({ block: 'center', behavior: 'instant' }),
  );
  const box = await seam.boundingBox();
  if (!box) throw new Error('No seam on screen');
  const seamBefore = await seam.getAttribute('aria-valuenow');
  const scrollBefore = await page.evaluate(() => scrollY);

  // Off the seam's centre line but on its strip, as a thumb would be.
  const session = await page.context().newCDPSession(page);
  await session.send('Input.synthesizeScrollGesture', {
    x: Math.round(box.x + box.width / 2 + 12),
    y: Math.round(box.y + box.height / 2),
    yDistance: -200,
    speed: 400,
    gestureSourceType: 'touch',
    preventFling: true,
  });

  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(
    scrollBefore + 150,
  );
  await expect(seam).toHaveAttribute('aria-valuenow', seamBefore ?? '');
});
