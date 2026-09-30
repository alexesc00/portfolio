import { describe, expect, it } from 'vitest';
import { isBottomLineShown, returnsWithin } from './hero-bottom-line';
import { nextTopBar, scrollSlack, topBarAtTop } from './top-bar';

/** Scrolls through `positions` in turn, starting at the top. */
function scrollThrough(positions: number[]) {
  return positions.reduce(
    (isShown, scrollY) => isBottomLineShown(isShown, scrollY),
    true,
  );
}

describe('isBottomLineShown', () => {
  it('shows the line at the top of the page', () => {
    expect(scrollThrough([0])).toBe(true);
  });

  it('keeps it through a nudge too small to move the top bar', () => {
    expect(scrollThrough([scrollSlack - 1])).toBe(true);
  });

  it('lets it go on the same scroll that hides the top bar', () => {
    const maxScrollY = 4200;
    expect(nextTopBar(topBarAtTop, scrollSlack, maxScrollY).isShown).toBe(
      false,
    );
    expect(scrollThrough([scrollSlack])).toBe(false);
  });

  it('keeps it away on the way back up until the very top', () => {
    expect(scrollThrough([400, returnsWithin + 1])).toBe(false);
  });

  it('brings it back just before the top', () => {
    expect(scrollThrough([400, returnsWithin])).toBe(true);
  });

  it('shows it while Safari stretches the page past the top', () => {
    expect(scrollThrough([400, -30])).toBe(true);
  });

  it('comes back nearer the top than it leaves, so it can’t flicker', () => {
    expect(returnsWithin).toBeLessThan(scrollSlack);
  });
});
