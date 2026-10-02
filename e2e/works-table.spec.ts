import { expect, test } from '@playwright/test';
import { closedRow } from './rows';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

/**
 * Checks that things meant to slide together stayed within a pixel of
 * each other on every frame. WebKit can take each position at a slightly
 * different moment, so a frame of its readings can be off by a pixel or
 * two either way even when the drawing isn't. There, the drift has to
 * average under half a pixel, which a real lag one way wouldn't, and no
 * frame can be off by as much as a jump would be.
 */
function expectTogether(gaps: number[], browserName: string) {
  // Headless browsers can draw slower than 60 frames a second.
  expect(gaps.length).toBeGreaterThan(10);
  const sizes = gaps.map(Math.abs);
  if (browserName !== 'webkit') {
    for (const size of sizes) expect(size).toBeLessThanOrEqual(1);
    return;
  }
  const average = sizes.reduce((sum, size) => sum + size) / sizes.length;
  expect(average).toBeLessThanOrEqual(0.5);
  for (const size of sizes) expect(size).toBeLessThanOrEqual(6);
}

// A row opens like a drawer: the rows under it slide down to uncover its
// write-up. The write-up should never show past the top of those rows,
// on the way open, on the way shut, or when turned round mid-slide.
test('a write-up shows only as far as the rows over it have slid', async ({
  page,
  browserName,
}) => {
  const group = await closedRow(page).elementHandle();
  const gaps = await page.evaluate(async (group) => {
    const button = group?.querySelector('[data-row-toggle]');
    if (!button) throw new Error('No row to open');
    const next = group?.nextElementSibling;
    const panel = document.getElementById(
      button.getAttribute('aria-controls') ?? '',
    );
    if (!group || !next || !panel) throw new Error('No row to open');
    group.scrollIntoView();

    const frame = () => new Promise(requestAnimationFrame);
    const gaps: number[] = [];
    async function watch(milliseconds: number) {
      const start = performance.now();
      while (performance.now() - start < milliseconds) {
        await frame();
        if (!panel || panel.hidden || !next) continue;
        const clip = /inset\(0px 0px ([\d.]+)px/.exec(
          getComputedStyle(panel).clipPath,
        );
        const shownBottom =
          panel.getBoundingClientRect().bottom - Number(clip?.[1] ?? 0);
        gaps.push(shownBottom - next.getBoundingClientRect().top);
      }
    }

    (button as HTMLElement).click();
    await watch(800);
    (button as HTMLElement).click();
    await watch(200);
    (button as HTMLElement).click();
    await watch(800);
    return gaps;
  }, group);

  expectTogether(gaps, browserName);
});

// The rest of the page slides with the rows instead of jumping: what
// comes after the table keeps the same distance from the table's last
// row the whole way, opening and closing.
test('the page below the table slides with the rows', async ({
  page,
  browserName,
}) => {
  const group = await closedRow(page).elementHandle();
  const gaps = await page.evaluate(async (group) => {
    const button = group?.querySelector<HTMLElement>('[data-row-toggle]');
    const table = group?.closest('table');
    const lastRow = table?.querySelector('tbody:last-child');
    const section = table?.closest('section');
    const below = section?.nextElementSibling;
    if (!button || !lastRow || !below) throw new Error('No page to slide');
    lastRow.scrollIntoView({ block: 'end' });

    const gap = () =>
      below.getBoundingClientRect().top -
      lastRow.getBoundingClientRect().bottom;
    const atRest = gap();
    const frame = () => new Promise(requestAnimationFrame);
    const gaps: number[] = [];
    async function watch(milliseconds: number) {
      const start = performance.now();
      while (performance.now() - start < milliseconds) {
        await frame();
        gaps.push(gap() - atRest);
      }
    }

    button.click();
    await watch(800);
    button.click();
    await watch(800);
    return gaps;
  }, group);

  expectTogether(gaps, browserName);
});

// The last row has no rows under it, but the page below slides over its
// write-up the same way, so it opens like every other row: uncovered at
// full strength, never faded.
test('the last row opens like the others, without fading', async ({ page }) => {
  const samples = await page.evaluate(async () => {
    const groups = document.querySelectorAll('tbody');
    const group = groups[groups.length - 1];
    const button = group?.querySelector<HTMLElement>('[data-row-toggle]');
    const panel = document.getElementById(
      button?.getAttribute('aria-controls') ?? '',
    );
    const below = group?.closest('section')?.nextElementSibling;
    if (!button || !panel || !below) throw new Error('No last row');
    if (button.getAttribute('aria-expanded') === 'true') button.click();
    await new Promise((resolve) => setTimeout(resolve, 800));
    group.scrollIntoView();

    const frame = () => new Promise(requestAnimationFrame);
    const samples: { opacity: number; gap: number }[] = [];
    async function watch(milliseconds: number) {
      const start = performance.now();
      while (performance.now() - start < milliseconds) {
        await frame();
        if (!panel || panel.hidden || !below) continue;
        const style = getComputedStyle(panel);
        const clip = /inset\(0px 0px ([\d.]+)px/.exec(style.clipPath);
        const shownBottom =
          panel.getBoundingClientRect().bottom - Number(clip?.[1] ?? 0);
        samples.push({
          opacity: Number(style.opacity),
          gap: shownBottom - below.getBoundingClientRect().top,
        });
      }
    }

    button.click();
    await watch(800);
    button.click();
    await watch(800);
    return samples;
  });

  expect(samples.length).toBeGreaterThan(10);
  for (const { opacity, gap } of samples) {
    expect(opacity).toBe(1);
    // Shown no further than the top of the page sliding over it, plus the
    // space the page keeps between the table and what follows.
    expect(gap).toBeLessThanOrEqual(1);
  }
});
