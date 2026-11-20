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

test('a sideways drag on the seam moves it as far as the thumb goes', async ({
  page,
}) => {
  await page.goto('/');
  const seam = page.locator('[data-seam]');
  await seam.evaluate((element) =>
    element.scrollIntoView({ block: 'center', behavior: 'instant' }),
  );
  const box = await seam.boundingBox();
  if (!box) throw new Error('No seam on screen');
  const width = await page
    .locator('[data-screen]')
    .evaluate((screen) => screen.getBoundingClientRect().width);
  const seamPercent = () =>
    page
      .locator('[data-showcase]')
      .evaluate((root) => parseFloat(root.style.getPropertyValue('--seam')));
  const before = await seamPercent();

  // Off the seam's centre line but on its strip, as a thumb would be.
  const x = Math.round(box.x + box.width / 2 + 12);
  const y = Math.round(box.y + box.height / 2);
  const session = await page.context().newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', atX: number) =>
    session.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x: atX, y }],
    });
  await touch('touchStart', x);
  for (let step = 1; step <= 6; step++) await touch('touchMove', x + step * 10);
  await touch('touchEnd', x + 60);

  expect(await seamPercent()).toBeCloseTo(before + (60 / width) * 100, 0);
});
