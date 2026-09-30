import { describe, expect, it } from 'vitest';
import {
  isBottomLineShown,
  leavesAfter,
  returnsWithin,
} from './hero-bottom-line';

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

  it('keeps it for the first few pixels of a scroll', () => {
    expect(scrollThrough([leavesAfter])).toBe(true);
  });

  it('lets it go as the scroll gets going', () => {
    expect(scrollThrough([leavesAfter + 1])).toBe(false);
  });

  it('keeps it away on the way back up until the very top', () => {
    expect(scrollThrough([400, returnsWithin + 1])).toBe(false);
    expect(scrollThrough([400, leavesAfter])).toBe(false);
  });

  it('brings it back just before the top', () => {
    expect(scrollThrough([400, returnsWithin])).toBe(true);
  });

  it('shows it while Safari stretches the page past the top', () => {
    expect(scrollThrough([400, -30])).toBe(true);
  });

  it('comes back nearer the top than it leaves, so it can’t flicker', () => {
    expect(returnsWithin).toBeLessThan(leavesAfter);
  });
});
