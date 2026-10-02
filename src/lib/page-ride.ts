import { landedProgress, settleSpring, springCurve } from './spring';

/*
 * A link to another part of the page rides there instead of cutting. A
 * long ride would flick through everything on the way, the principles
 * included, so a ride never covers more than one screen: the page jumps
 * to a screen short of the section, then settles the rest of the way.
 */

/** How long a ride takes: the settle curve's own length. */
export const rideDuration = springCurve(settleSpring).duration;

/** Where a ride from `from` to `to` begins, at most a `screen` away. */
export function rideStart(from: number, to: number, screen: number) {
  if (Math.abs(to - from) <= screen) return from;
  return to - Math.sign(to - from) * screen;
}

/** Where the page is `time` milliseconds into a ride from `start` to `to`. */
export function ridePosition(start: number, to: number, time: number) {
  return start + (to - start) * landedProgress(settleSpring, time);
}
