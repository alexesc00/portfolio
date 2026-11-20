import { describe, expect, it } from 'vitest';
import {
  barSpeedFor,
  coastedTopBar,
  flickedHiddenBy,
  followScroll,
  landedTopBar,
  nextTopBar,
  scrollSlack,
  settledHiddenBy,
  speedOf,
  topBarAtTop,
  type FollowingBar,
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

/** A bar 68px tall, as on a phone. */
const height = 68;

/** Drags the page through `positions` in turn, from `start`. */
function followThrough(positions: number[], start: FollowingBar) {
  return positions.reduce(
    (bar, scrollY) => followScroll(bar, scrollY, maxScrollY, height),
    start,
  );
}

// On a touch screen the bar moves with the thumb instead of switching:
// it slides up exactly as far as the page does, and comes back the same
// way, so a thumb that wobbles can't make it flip.
describe('followScroll', () => {
  const shownAt = (scrollY: number): FollowingBar => ({
    hiddenBy: 0,
    lastY: scrollY,
  });
  const hiddenAt = (scrollY: number): FollowingBar => ({
    hiddenBy: height,
    lastY: scrollY,
  });

  it('slides the bar up as far as the page scrolls down', () => {
    expect(followThrough([1020], shownAt(1000)).hiddenBy).toBe(20);
  });

  it('stops once the bar is out of view', () => {
    expect(followThrough([1200], shownAt(1000)).hiddenBy).toBe(height);
  });

  it('brings the bar back as far as the page scrolls up', () => {
    expect(followThrough([988], hiddenAt(1000)).hiddenBy).toBe(height - 12);
  });

  it('never brings it further than fully in view', () => {
    expect(followThrough([700], hiddenAt(1000)).hiddenBy).toBe(0);
  });

  it('lets a small wobble peek the bar in and back out', () => {
    const wobbled = followThrough([988, 1018], hiddenAt(1000));

    expect(wobbled.hiddenBy).toBe(height);
  });

  it('shows the bar in full when the page is stretched past its top', () => {
    expect(followThrough([-40], hiddenAt(1000)).hiddenBy).toBe(0);
  });

  // Springing back from past the bottom is Safari, not the visitor.
  it('ignores the page springing back from past its bottom', () => {
    const stretched = followThrough(
      [maxScrollY, maxScrollY + 60],
      hiddenAt(4000),
    );

    expect(followThrough([maxScrollY], stretched).hiddenBy).toBe(height);
  });
});

// When the thumb lets go and the page comes to rest, a bar caught partway
// settles to whichever end is nearer.
describe('settledHiddenBy', () => {
  it('slides a bar mostly in view the rest of the way in', () => {
    expect(settledHiddenBy(30, height)).toBe(0);
  });

  it('slides a bar mostly out of view the rest of the way out', () => {
    expect(settledHiddenBy(40, height)).toBe(height);
  });

  it('leaves a bar at either end where it is', () => {
    expect(settledHiddenBy(0, height)).toBe(0);
    expect(settledHiddenBy(height, height)).toBe(height);
  });
});

describe('speedOf', () => {
  /** A thumb moving `step` px every 60th of a second, ending at `end`. */
  function moving(step: number, end: number, count = 8) {
    return Array.from({ length: count }, (_, i) => ({
      time: end - (count - 1 - i) * 16,
      value: i * step,
    }));
  }

  it('reads how fast the thumb was going as it let go, in px per second', () => {
    const samples = moving(10, 1000);

    expect(speedOf(samples, 1000)).toBeCloseTo(625, 0);
  });

  it('only counts the last tenth of a second', () => {
    const samples = [
      { time: 700, value: 500 },
      { time: 800, value: 0 },
      ...moving(10, 1000).map((s) => ({ ...s, value: s.value + 100 })),
    ];

    expect(speedOf(samples, 1000)).toBeCloseTo(625, 0);
  });

  it('reads a thumb that stopped before letting go as still', () => {
    const samples = moving(10, 900);

    expect(speedOf(samples, 1000)).toBe(0);
  });

  it('reads a single step as still', () => {
    expect(speedOf([{ time: 990, value: 40 }], 1000)).toBe(0);
    expect(speedOf([], 1000)).toBe(0);
  });
});

describe('flickedHiddenBy', () => {
  it('settles a thumb let go without a flick to the nearer end', () => {
    expect(flickedHiddenBy(30, 0, height)).toBe(0);
    expect(flickedHiddenBy(40, 0, height)).toBe(height);
  });

  // A thumb barely moves in a flick; where it was heading is what counts.
  it('brings the bar in on a quick flick up, however little it moved', () => {
    expect(flickedHiddenBy(56, -600, height)).toBe(0);
  });

  it('sends the bar away on a quick flick down, however little it moved', () => {
    expect(flickedHiddenBy(12, 600, height)).toBe(height);
  });

  it('lets a slow drift settle as if there were no flick', () => {
    expect(flickedHiddenBy(56, -40, height)).toBe(height);
    expect(flickedHiddenBy(12, 40, height)).toBe(0);
  });
});

// Once the thumb lets go, the page can coast on a long way. The bar has
// already settled by then, by where the flick was heading, so the coast
// only moves it if it runs the other way by a whole bar's height.
describe('coastedTopBar', () => {
  const hiddenAt = (anchor: number): TopBar => ({ isShown: false, anchor });
  const shownAt = (anchor: number): TopBar => ({ isShown: true, anchor });

  it('leaves the bar settled while the page coasts on a little', () => {
    const bar = hiddenAt(1000);

    expect(coastedTopBar(bar, 960, 5000, height)).toBe(bar);
    expect(coastedTopBar(bar, 1400, 5000, height)).toBe(bar);
  });

  it('brings a hidden bar back once the page coasts up past its height', () => {
    expect(coastedTopBar(hiddenAt(1000), 900, 5000, height)).toEqual(
      shownAt(900),
    );
  });

  it('sends a shown bar away once the page coasts down past its height', () => {
    expect(coastedTopBar(shownAt(1000), 1100, 5000, height)).toEqual(
      hiddenAt(1100),
    );
  });

  it('always shows the bar once the page coasts to the top', () => {
    expect(coastedTopBar(hiddenAt(40), 0, 5000, height)).toEqual(topBarAtTop);
  });

  it('ignores Safari springing back from past the bottom', () => {
    const bar = hiddenAt(4900);

    expect(coastedTopBar(bar, 5000, 4900, height)).toBe(bar);
  });
});

describe('barSpeedFor', () => {
  it('moves the bar with the page while it’s partway', () => {
    expect(barSpeedFor(30, 600, height)).toBe(600);
    expect(barSpeedFor(30, -600, height)).toBe(-600);
  });

  it('holds a bar already out of view still while the page goes on down', () => {
    expect(barSpeedFor(height, 600, height)).toBe(0);
    expect(barSpeedFor(height, -600, height)).toBe(-600);
  });

  it('holds a bar already in view still while the page goes on up', () => {
    expect(barSpeedFor(0, -600, height)).toBe(0);
    expect(barSpeedFor(0, 600, height)).toBe(600);
  });
});
