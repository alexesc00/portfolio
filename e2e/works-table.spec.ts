import { expect, test } from '@playwright/test';
import { closedRow } from './rows';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

// A row opens like a drawer: the rows under it slide down to uncover its
// write-up. The write-up should never show past the top of those rows,
// on the way open, on the way shut, or when turned round mid-slide.
test('a write-up shows only as far as the rows over it have slid', async ({
  page,
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

  // Headless browsers can draw slower than 60 frames a second.
  expect(gaps.length).toBeGreaterThan(10);
  for (const gap of gaps) expect(Math.abs(gap)).toBeLessThanOrEqual(1);
});
