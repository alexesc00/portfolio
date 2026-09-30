import { describe, expect, it } from 'vitest';
import {
  landedTopBar,
  nextTopBar,
  scrollSlack,
  topBarAtTop,
  type TopBar,
} from './top-bar';

/** A page 5000px tall in an 800px window can scroll 4200px. */
const maxScrollY = 4200;

/** Scrolls through `positions` in turn, starting at the top. */
function scrollThrough(positions: number[], start: TopBar = topBarAtTop) {
  return positions.reduce(
    (bar, scrollY) => nextTopBar(bar, scrollY, maxScrollY),
    start,
  );
}

describe('nextTopBar', () => {
  it('shows the bar at the top of the page', () => {
    expect(topBarAtTop.isShown).toBe(true);
  });

  it('hides the bar on the first scroll down', () => {
    expect(scrollThrough([scrollSlack]).isShown).toBe(false);
  });

  it('brings the bar back on a scroll up from anywhere', () => {
    const hidden = scrollThrough([400, 2000]);

    expect(scrollThrough([2000 - scrollSlack], hidden).isShown).toBe(true);
  });

  it('hides the bar again on the next scroll down', () => {
    expect(scrollThrough([2000, 1800, 1800 + scrollSlack]).isShown).toBe(false);
  });

  // A trackpad sends many tiny steps. Measured from where the bar last
  // changed, they still add up to a scroll.
  it('adds up small steps until they pass the slack', () => {
    const steps = Array.from({ length: scrollSlack }, (_, i) => i + 1);

    expect(scrollThrough(steps).isShown).toBe(false);
  });

  it('ignores a jitter smaller than the slack', () => {
    const hidden = scrollThrough([1000]);

    expect(scrollThrough([1000 - scrollSlack + 1], hidden).isShown).toBe(false);
  });

  // Safari lets the page stretch past its ends and spring back. Springing
  // back from the bottom is not the visitor scrolling up.
  it('ignores the page springing back from past its bottom', () => {
    const hidden = scrollThrough([maxScrollY]);

    expect(scrollThrough([maxScrollY + 60, maxScrollY], hidden).isShown).toBe(
      false,
    );
  });

  it('shows the bar when the page is stretched past its top', () => {
    const hidden = scrollThrough([1000]);

    expect(scrollThrough([-40], hidden).isShown).toBe(true);
  });
});

// A link to a section jumps the page there. Covering the section's top
// with the bar would hide what the visitor asked for.
describe('landedTopBar', () => {
  it('hides the bar after a jump, even one up the page', () => {
    const jumpedUp = landedTopBar(900);

    expect(jumpedUp.isShown).toBe(false);
    expect(nextTopBar(jumpedUp, 900 - scrollSlack, maxScrollY).isShown).toBe(
      true,
    );
  });

  it('shows the bar after a jump to the very top', () => {
    expect(landedTopBar(0).isShown).toBe(true);
  });
});
