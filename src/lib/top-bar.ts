/**
 * How far, in pixels, the page has to scroll one way before the top bar
 * reacts, so a jittery trackpad or a resting thumb doesn't make it flicker.
 */
export const scrollSlack = 8;

/**
 * Whether the top bar is in view, and the scroll position where it last
 * changed. Scrolls are measured from there, so small steps add up.
 */
export interface TopBar {
  isShown: boolean;
  anchor: number;
}

export const topBarAtTop: TopBar = { isShown: true, anchor: 0 };

/**
 * The top bar after the page scrolls to `scrollY`: hidden on the way down,
 * back on any way up, and always shown at the very top.
 */
export function nextTopBar(
  bar: TopBar,
  scrollY: number,
  maxScrollY: number,
): TopBar {
  if (scrollY <= 0) return topBarAtTop;

  // Past the bottom is Safari stretching the page; springing back from
  // there isn't a scroll up.
  const position = Math.min(scrollY, maxScrollY);
  const distance = position - bar.anchor;
  if (Math.abs(distance) < scrollSlack) return bar;

  return { isShown: distance < 0, anchor: position };
}

/** The top bar after a link jumps the page to `scrollY`. */
export function landedTopBar(scrollY: number): TopBar {
  return scrollY <= 0 ? topBarAtTop : { isShown: false, anchor: scrollY };
}

/**
 * The top bar on a touch screen, where it moves with the thumb rather than
 * switching: how far it has slid up out of view, and the scroll position
 * it was last moved from.
 */
export interface FollowingBar {
  hiddenBy: number;
  lastY: number;
}

/**
 * The bar after the page scrolls to `scrollY`: slid up as far as the page
 * went down, and back as far as it came up, between fully in view (0) and
 * fully out of it (`height`). A thumb that wobbles only lets it peek in.
 */
export function followScroll(
  bar: FollowingBar,
  scrollY: number,
  maxScrollY: number,
  height: number,
): FollowingBar {
  if (scrollY <= 0) return { hiddenBy: 0, lastY: 0 };

  // Past the bottom is Safari stretching the page; springing back from
  // there isn't a scroll up.
  const position = Math.min(scrollY, maxScrollY);
  const hiddenBy = Math.min(
    height,
    Math.max(0, bar.hiddenBy + position - bar.lastY),
  );
  return { hiddenBy, lastY: position };
}

/**
 * Where a bar caught partway settles once the page comes to rest: back in
 * view if it's mostly showing, out of view if it's mostly gone.
 */
export function settledHiddenBy(hiddenBy: number, height: number) {
  return hiddenBy < height / 2 ? 0 : height;
}

/** How far back a thumb's speed is read from, in milliseconds. */
const speedWindow = 100;
/** A thumb that hasn't moved for this long before letting go was still. */
const stillFor = 50;

/**
 * How fast `samples` were changing at `now`, per second, over the last
 * tenth of a second: steadier than the last two steps alone, which a
 * thumb makes jittery. A thumb that stopped before letting go reads as 0.
 */
export function speedOf(
  samples: readonly { time: number; value: number }[],
  now: number,
) {
  const recent = samples.filter(({ time }) => now - time <= speedWindow);
  const first = recent[0];
  const last = recent.at(-1);
  if (!first || !last || last === first || now - last.time > stillFor) {
    return 0;
  }
  return (last.value - first.value) / ((last.time - first.time) / 1000);
}

/**
 * How far ahead a flick is read, in seconds: where the bar would be this
 * long after letting go, if it kept the thumb's speed.
 */
const flickReach = 0.2;

/**
 * Where a bar settles when the thumb lets go of the page while it's moving
 * at `speed` px per second (down is positive): by where the flick was
 * heading, not just where the bar is. A quick flick up brings it in
 * however little the page moved; a thumb that just lifts settles it to
 * the nearer end.
 */
export function flickedHiddenBy(
  hiddenBy: number,
  speed: number,
  height: number,
) {
  return settledHiddenBy(hiddenBy + speed * flickReach, height);
}

/**
 * The bar after the page, coasting on once the thumb has let go, reaches
 * `scrollY`. The bar settled by where the flick was heading, so the coast
 * leaves it alone, unless it runs the other way by more than the bar's
 * `height`, or reaches the top, where the bar always shows.
 */
export function coastedTopBar(
  bar: TopBar,
  scrollY: number,
  maxScrollY: number,
  height: number,
): TopBar {
  if (scrollY <= 0) return topBarAtTop;

  // Past the bottom is Safari stretching the page; springing back from
  // there isn't a scroll up.
  const position = Math.min(scrollY, maxScrollY);
  const distance = position - bar.anchor;
  if (bar.isShown ? distance > height : distance < -height) {
    return { isShown: !bar.isShown, anchor: position };
  }
  return bar;
}

/**
 * How fast the bar moves while the page moves at `speed` px per second
 * (down is positive): with the page, unless it's already all the way out
 * of view, or in view, and the page is pushing it further.
 */
export function barSpeedFor(hiddenBy: number, speed: number, height: number) {
  if (hiddenBy >= height && speed > 0) return 0;
  if (hiddenBy <= 0 && speed < 0) return 0;
  return speed;
}
