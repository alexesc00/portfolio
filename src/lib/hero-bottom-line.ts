/*
 * The hero's bottom line: the colophon at the left and the theme switch
 * at the right. It turns away as soon as the visitor starts reading down
 * and turns back only as they arrive at the very top, so the hero's first
 * screen is the only place it shows.
 */

/** How far down, in pixels, the page scrolls before the line leaves. */
export const leavesAfter = 32;

/**
 * How near the top, in pixels, the page has to be for it to come back.
 * Nearer than where it leaves, so a scroll resting between the two can't
 * make it flicker.
 */
export const returnsWithin = 16;

/** Whether the line shows once the page has scrolled to `scrollY`. */
export function isBottomLineShown(wasShown: boolean, scrollY: number) {
  return scrollY <= (wasShown ? leavesAfter : returnsWithin);
}
