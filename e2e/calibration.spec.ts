import { expect, test, type Locator, type Page } from '@playwright/test';

// The Calibration design exercise: a service blueprint and four wireframes,
// copied into /calibration/ by scripts/sync-calibration.mjs. These check the
// behavior the pages share, on every browser the site is tested in.

const blueprint = '/calibration/';
const views = {
  write: '/calibration/write/',
  decide: '/calibration/decide/',
  promotion: '/calibration/promotion/',
  history: '/calibration/history/',
};

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`${locator} has no box on screen`);
  return box;
}

// Shown means fully drawn and in the accessibility tree, not mid-fade.
async function isShown(tip: Locator) {
  return tip.evaluate((element) => {
    const style = getComputedStyle(element);
    return style.opacity === '1' && style.visibility === 'visible';
  });
}

// Long enough for a tip's hover delay and its fade to finish
const settle = (page: Page) => page.waitForTimeout(500);

test.describe('the blueprint', () => {
  // The step is half of what the blueprint says, and on screen it comes
  // only from the column. Each cell has to say it in words too.
  test('each cell with actions names its step', async ({ page }) => {
    await page.goto(blueprint);
    const steps = await page.locator('.head .step').evaluateAll((cells) =>
      cells.map((cell) => {
        const number = cell.querySelector('.step-no')?.textContent ?? '';
        const name = cell.querySelector('.step-name')?.textContent ?? '';
        return number ? `Step ${number}, ${name}` : name;
      }),
    );
    expect(steps).toHaveLength(7);

    const cells = await page.locator('.lane-track').evaluateAll((tracks) =>
      tracks.flatMap((track) =>
        [...track.children].map((cell, index) => ({
          index,
          hasActions: !!cell.querySelector('.blueprint-block'),
          label: cell.querySelector(':scope > .visually-hidden')?.textContent,
        })),
      ),
    );
    const withActions = cells.filter((cell) => cell.hasActions);
    expect(withActions.length).toBeGreaterThan(0);
    for (const cell of withActions) {
      expect(cell.label).toBe(steps[cell.index]);
    }
  });

  // The hidden step names sit in cells far to the right. They mustn't
  // widen the page, which only the canvas may scroll.
  test('the page itself never scrolls sideways', async ({ page }) => {
    await page.goto(blueprint);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('full screen', () => {
  const canvas = (page: Page) => page.locator('.canvas');
  const toggle = (page: Page) => page.locator('.full-screen-toggle');
  // Once the blueprint has finished growing or shrinking
  const still = (page: Page) =>
    page.waitForFunction(
      () => document.querySelector('.canvas')?.getAnimations().length === 0,
    );
  const gutter = 16;

  test('fills the window and goes back to its place, scrolled where it was', async ({
    page,
  }) => {
    await page.goto(blueprint);
    const inPlace = await boxOf(canvas(page));
    await canvas(page).evaluate((box) => {
      box.scrollLeft = 200;
    });

    await toggle(page).click();
    await expect(toggle(page)).toHaveText('Exit full screen');
    await still(page);
    const full = await boxOf(canvas(page));
    const viewport = page.viewportSize();
    expect(full.x).toBe(gutter);
    expect(full.y).toBe(gutter);
    expect(full.x + full.width).toBe((viewport?.width ?? 0) - gutter);
    expect(await canvas(page).evaluate((box) => box.scrollLeft)).toBe(200);

    await page.keyboard.press('Escape');
    await expect(toggle(page)).toHaveText('Full screen');
    await still(page);
    expect(await boxOf(canvas(page))).toEqual(inPlace);
    expect(await canvas(page).evaluate((box) => box.scrollLeft)).toBe(200);
  });

  // Covered isn't enough: Tab would still reach the links under it.
  test('hides the rest of the page', async ({ page }) => {
    await page.goto(blueprint);
    await toggle(page).click();
    await still(page);
    await expect(page.locator('.intro h1')).toBeHidden();
    await expect(page.locator('.notes-open')).toBeHidden();
    await expect(toggle(page)).toBeVisible();
  });

  test('Escape partway through turns it back', async ({ page }) => {
    await page.goto(blueprint);
    await toggle(page).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await still(page);
    await expect(toggle(page)).toHaveText('Full screen');
    await expect(canvas(page)).not.toHaveClass(/is-full-screen/);
    await expect(page.locator('.intro h1')).toBeVisible();
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('switches at once', async ({ page }) => {
      await page.goto(blueprint);
      await toggle(page).click();
      expect(
        await canvas(page).evaluate((box) => box.getAnimations().length),
      ).toBe(0);
      expect((await boxOf(canvas(page))).y).toBe(gutter);
    });
  });
});

test.describe('page chain tips', () => {
  test.skip(({ isMobile }) => isMobile, 'Tips only show where there is hover');

  // Someone using magnification has to be able to move onto a tip to read it.
  test('a tip stays open while the pointer moves onto it', async ({ page }) => {
    await page.goto(views.decide);
    const tip = page.locator('#tip-promotion');
    await page.getByRole('link', { name: 'Promotion' }).hover();
    await settle(page);
    expect(await isShown(tip)).toBe(true);

    const box = await boxOf(tip);
    await page.mouse.move(box.x + 24, box.y + box.height / 2, { steps: 10 });
    await settle(page);
    expect(await isShown(tip)).toBe(true);
  });

  test('Escape hides a tip until the pointer leaves its link', async ({
    page,
  }) => {
    await page.goto(views.decide);
    const link = page.getByRole('link', { name: 'Promotion' });
    const tip = page.locator('#tip-promotion');
    await link.hover();
    await settle(page);
    await page.keyboard.press('Escape');
    await settle(page);
    expect(await isShown(tip)).toBe(false);

    await page.mouse.move(600, 600);
    await link.hover();
    await settle(page);
    expect(await isShown(tip)).toBe(true);
  });

  test('Escape hides a tip opened by keyboard focus', async ({ page }) => {
    await page.goto(views.decide);
    const link = page.getByRole('link', { name: 'Promotion' });
    const tip = page.locator('#tip-promotion');
    // A key press first, so the browser treats the focus as keyboard focus
    await page.keyboard.press('Shift');
    await link.focus();
    await settle(page);
    expect(await isShown(tip)).toBe(true);

    await page.keyboard.press('Escape');
    await settle(page);
    expect(await isShown(tip)).toBe(false);
  });

  test('no tip runs past the edge of a narrow window', async ({ page }) => {
    for (const width of [480, 560, 660]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(views.decide);
      const tips = page.locator('.page-chain-tip');
      for (let i = 0; i < (await tips.count()); i++) {
        const tip = tips.nth(i);
        const id = await tip.getAttribute('id');
        await page.locator(`[aria-describedby="${id}"]`).hover();
        await settle(page);
        const box = await boxOf(tip);
        expect(box.x, `${id} at ${width}px`).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, `${id} at ${width}px`).toBeLessThanOrEqual(
          width,
        );
        await page.mouse.move(width / 2, 700);
      }
    }
  });
});

// Each tip is its link's description. A resting tip has to be hidden too,
// or a screen reader reads it a second time as plain text.
test('screen readers get each tip once, as the link’s description', async ({
  page,
}) => {
  await page.goto(views.decide);
  await expect(
    page.getByRole('link', { name: 'Promotion' }),
  ).toHaveAccessibleDescription(/^Step 6, where the owner/);
  const nav = page.getByRole('navigation', { name: 'Calibration loop' });
  expect(await nav.ariaSnapshot()).not.toContain('Step 6, where the owner');
});

test.describe('margin notes', () => {
  test.skip(({ isMobile }) => isMobile, 'Phones list the notes under the view');

  test('each note sits level with its marker, or below the note above', async ({
    page,
  }) => {
    for (const path of Object.values(views)) {
      await page.goto(path);
      await expect(page.locator('.notes')).toHaveClass(/is-placed/);
      const notes = await page.locator('.notes ol > li').evaluateAll((items) =>
        items.map((item) => {
          const marker = document.querySelector(
            `.frame > .marker[data-for="${item.getAttribute('data-for')}"]`,
          );
          const box = item.getBoundingClientRect();
          return {
            top: box.top,
            bottom: box.bottom,
            markerTop: marker?.getBoundingClientRect().top ?? NaN,
          };
        }),
      );
      expect(notes[0].top).toBeCloseTo(notes[0].markerTop, 0);
      notes.forEach((note, i) => {
        expect(note.top, path).toBeGreaterThanOrEqual(note.markerTop - 1);
        if (i > 0) {
          expect(note.top, path).toBeGreaterThan(notes[i - 1].bottom);
        }
      });
    }
  });

  test('notes move beside the view and back as the window resizes', async ({
    page,
  }) => {
    await page.goto(views.decide);
    const notes = page.locator('.notes');
    await expect(notes).toHaveClass(/is-placed/);
    await page.setViewportSize({ width: 900, height: 900 });
    await expect(notes).not.toHaveClass(/is-placed/);
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(notes).toHaveClass(/is-placed/);
  });

  // Where the notes go is the layout's call. The script follows it rather
  // than keeping its own copy of the breakpoint.
  test('notes follow the layout when its breakpoint moves', async ({
    page,
  }) => {
    await page.route(`**${views.decide}`, async (route) => {
      const response = await route.fetch();
      // Only the stylesheet's breakpoint, so a script that keeps its own
      // copy would be caught out
      const html = (await response.text()).replaceAll(
        '@media (min-width: 1100px)',
        '@media (min-width: 1300px)',
      );
      await route.fulfill({ response, body: html });
    });
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto(views.decide);
    await expect(page.locator('.notes')).not.toHaveClass(/is-placed/);
  });

  test('a note without a marker leaves the Notes button working', async ({
    page,
  }) => {
    const errors: Error[] = [];
    page.on('pageerror', (error) => errors.push(error));
    await page.route(`**${views.decide}`, async (route) => {
      const response = await route.fetch();
      const html = (await response.text()).replace('data-note="3"', '');
      await route.fulfill({ response, body: html });
    });
    await page.goto(views.decide);
    await page.getByRole('button', { name: 'Notes' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Calibration loop notes' }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe('tables that scroll in their own box', () => {
  test.skip(({ isMobile }) => isMobile, 'Arrow keys need a keyboard');

  test('take keyboard focus only while they scroll', async ({
    page,
    browserName,
  }) => {
    await page.goto(views.decide);
    const scroller = page.locator('.table-scroll').first();
    await expect(scroller).not.toHaveAttribute('tabindex');

    await page.setViewportSize({ width: 600, height: 900 });
    const region = page.getByRole('region', {
      name: 'Run 2 scores, by tester and question',
    });
    await expect(region).toHaveAttribute('tabindex', '0');
    await region.focus();
    await expect(region).toBeFocused();
    // Playwright's WebKit doesn't scroll on an arrow key it sends, even in a
    // bare focusable box, so the scroll itself is checked in the others.
    if (browserName !== 'webkit') {
      await page.keyboard.press('ArrowRight');
      await expect
        .poll(() => region.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(0);
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(scroller).not.toHaveAttribute('tabindex');
  });
});

test.describe('on a phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'Only phones scroll the scores');

  test('the scores keep the tester column under its header', async ({
    page,
  }) => {
    await page.goto(views.decide);
    await page
      .locator('.table-scroll:has(.scores)')
      .evaluate((element) => (element.scrollLeft = 200));
    const header = await boxOf(
      page.getByRole('columnheader', { name: 'Tester', exact: true }),
    );
    const firstTester = await boxOf(
      page.getByRole('rowheader', { name: /^Tester 1\b/ }),
    );
    expect(header.x).toBeCloseTo(firstTester.x, 0);
  });
});

test.describe('in dark mode', () => {
  test.use({ colorScheme: 'dark' });

  // A record the platform keeps is drawn the same way on every page.
  test('every platform record has the same dashed edge', async ({ page }) => {
    const edges = new Set<string>();
    const edgeOf = (selector: string) =>
      page.locator(selector).evaluateAll((elements) =>
        elements.map((element) => {
          const style = getComputedStyle(element);
          return `${style.borderTopStyle} ${style.borderTopColor}`;
        }),
      );
    for (const path of Object.values(views)) {
      await page.goto(path);
      (await edgeOf('.well')).forEach((edge) => edges.add(edge));
    }
    await page.goto(blueprint);
    (await edgeOf('.blueprint-block.is-platform')).forEach((edge) =>
      edges.add(edge),
    );
    expect([...edges]).toHaveLength(1);
  });
});

// The check mark is decoration: the row already says "Accepted".
test('check marks on finished rows aren’t read aloud', async ({ page }) => {
  for (const [path, selector] of [
    [views.decide, '.questions'],
    [views.promotion, '.questions'],
    [views.history, '.history'],
  ]) {
    await page.goto(path);
    const snapshot = await page.locator(selector).ariaSnapshot();
    expect(snapshot, path).toContain('ccepted');
    expect(snapshot, path).not.toContain('✓');
  }
});
