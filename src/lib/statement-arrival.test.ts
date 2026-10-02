import { describe, expect, it } from 'vitest';
import { arrivesAt, hasArrived } from './statement-arrival';

/** Scrolls the statement through `ratios` of itself showing, in turn. */
function scrollThrough(ratios: number[]) {
  return ratios.reduce(
    (isArrived, ratio) => hasArrived(isArrived, ratio),
    false,
  );
}

describe('hasArrived', () => {
  it('waits while the statement is off screen', () => {
    expect(scrollThrough([0])).toBe(false);
  });

  it('waits while only its edge is showing', () => {
    expect(scrollThrough([0, 0.2, arrivesAt - 0.01])).toBe(false);
  });

  it('arrives once most of it is showing', () => {
    expect(scrollThrough([0, 0.3, arrivesAt])).toBe(true);
  });

  // Scrolling on past it, the statement stays in place until it's gone.
  it('stays arrived as it leaves the screen', () => {
    expect(scrollThrough([arrivesAt, 1, 0.4, 0.01])).toBe(true);
  });

  // So it arrives again whenever the visitor comes back to it.
  it('waits again once it has left the screen entirely', () => {
    expect(scrollThrough([1, 0.5, 0])).toBe(false);
    expect(scrollThrough([1, 0, 0.3])).toBe(false);
  });
});
