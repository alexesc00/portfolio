import { expect, test } from '@playwright/test';
import { settled } from './rows';

// From the narrowest phone still in use up to the largest.
const widths = [320, 360, 375, 390, 430];

test.skip(({ isMobile }) => !isMobile, 'Phone widths only matter on a phone');

for (const theme of ['dark', 'light'] as const) {
  for (const width of widths) {
    test(`nothing runs off the side at ${width} wide, ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.addInitScript(
        (theme) => localStorage.setItem('theme', theme),
        theme,
      );
      await page.goto('/');

      // Every write-up open, so the widest content is on the page.
      await page.evaluate(() => {
        for (const toggle of document.querySelectorAll<HTMLElement>(
          '[data-row-toggle][aria-expanded="false"]',
        ))
          toggle.click();
      });
      await settled(page);

      const overflowing = await page.evaluate(() => {
        const edge = document.documentElement.clientWidth;
        return [...document.querySelectorAll('body *')]
          .filter((element) => {
            const box = element.getBoundingClientRect();
            if (box.width === 0 || box.height === 0) return false;
            // Content its own clipping box hides doesn't make the page wider.
            for (
              let parent = element.parentElement;
              parent && parent !== document.body;
              parent = parent.parentElement
            ) {
              if (getComputedStyle(parent).overflowX !== 'visible')
                return false;
            }
            return box.right > edge + 1 || box.left < -1;
          })
          .map((element) =>
            `${element.tagName.toLowerCase()}.${element.className}`.slice(
              0,
              120,
            ),
          );
      });
      expect(overflowing).toEqual([]);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
    });
  }
}
