import { scrollSlack } from './top-bar';

/*
 * The hero's bottom line: the colophon at the left and the theme switch
 * at the right. It turns away on the same first scroll that hides the top
 * bar, so everything around the page clears at once, and turns back only
 * as the visitor arrives at the very top, after the bar has returned.
 */

/**
 * How near the top, in pixels, the page has to be for it to come back.
 * Nearer than where it leaves, so a scroll resting between the two can't
 * make it flicker.
 */
export const returnsWithin = 4;

/** Whether the line shows once the page has scrolled to `scrollY`. */
export function isBottomLineShown(wasShown: boolean, scrollY: number) {
  return wasShown ? scrollY < scrollSlack : scrollY <= returnsWithin;
}
