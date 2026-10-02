/*
 * The spring every motion on the site is drawn from: the one the Æ's dots
 * move on. It's described the way Figma and Apple describe a spring, by
 * a duration, how long one swing takes, and a bounce, from 0 for none to
 * nearly 1. A bounce of b is a damping ratio of 1 − b.
 */

export interface Spring {
  /** How long one swing takes, in milliseconds. */
  duration: number;
  bounce: number;
}

/** The Æ's spring: what the pointer pushes, it bounces. */
export const aeSpring: Spring = { duration: 385, bounce: 0.7 };

/** The Æ's spring with no bounce: same stiffness, settles without overshooting. */
export const settleSpring: Spring = { ...aeSpring, bounce: 0 };

const frame = 1000 / 60;
/** How close to rest a curve has to stay before CSS can stop drawing it. */
const rest = 0.002;
const longest = 5000;
/** How many of the last points ease onto rest: 100ms. */
const landing = 6;

/** How far along `spring` is at `time` milliseconds: 0 at the start, 1 at rest. */
export function springProgress({ duration, bounce }: Spring, time: number) {
  const stiffness = (2 * Math.PI) / (duration / 1000);
  const damping = 1 - bounce;
  const t = time / 1000;
  if (damping >= 1) return 1 - (1 + stiffness * t) * Math.exp(-stiffness * t);
  const swing = stiffness * Math.sqrt(1 - damping ** 2);
  return (
    1 -
    Math.exp(-damping * stiffness * t) *
      (Math.cos(swing * t) +
        ((damping * stiffness) / swing) * Math.sin(swing * t))
  );
}

/**
 * `spring`'s progress a frame at a time, a point every 60th of a second,
 * until it stays within 0.2% of rest. Snapping that last 0.2% would leave
 * a step at the end, 1.4px on a 700px drawer, so the last points ease
 * onto rest instead, and the last point is rest itself.
 */
function landedPoints(spring: Spring) {
  const values: number[] = [];
  let lastAwayFromRest = 0;
  for (let step = 0; step * frame <= longest; step++) {
    const value = springProgress(spring, step * frame);
    values.push(value);
    if (Math.abs(1 - value) >= rest) lastAwayFromRest = step;
  }
  const end = lastAwayFromRest + 1;
  const landingStart = end - landing;
  const points = values.slice(0, end).map((value, step) => {
    const through = Math.max(step - landingStart, 0) / landing;
    // Smoothstep: starts and ends gently, so the landing has no corners.
    const pull = through * through * (3 - 2 * through);
    return value + (1 - value) * pull;
  });
  points.push(1);
  return points;
}

/** `spring` as a CSS linear() easing, and how long to run it. */
export function springCurve(spring: Spring) {
  const points = landedPoints(spring);
  const end = points.length - 1;
  return {
    easing: `linear(${points.map((value) => String(Number(value.toFixed(4)))).join(', ')})`,
    duration: Math.round(end * frame),
  };
}

/**
 * How far along `spring` is at `time` milliseconds, on the same landed
 * curve CSS draws, for motion a script has to move itself.
 */
export function landedProgress(spring: Spring, time: number) {
  const points = landedPoints(spring);
  const end = points.length - 1;
  const duration = Math.round(end * frame);
  if (time <= 0) return 0;
  if (time >= duration) return 1;
  const place = (time / duration) * end;
  const step = Math.floor(place);
  return points[step] + (points[step + 1] - points[step]) * (place - step);
}

/**
 * The per-step physics that moves along `spring`: each step of
 * `stepLength` milliseconds, a thing's speed gains `springStrength` of its
 * distance from rest, then keeps `damping` of itself.
 */
export function stepConstants(spring: Spring, stepLength: number) {
  const stiffness = (2 * Math.PI) / (spring.duration / 1000);
  const dampingRatio = 1 - spring.bounce;
  const seconds = stepLength / 1000;
  // One step shrinks the swing by `shrink` and turns it through `turn`.
  const shrink = Math.exp(-dampingRatio * stiffness * seconds);
  const turn = stiffness * Math.sqrt(1 - dampingRatio ** 2) * seconds;
  const damping = shrink ** 2;
  const springStrength = (1 + damping - 2 * shrink * Math.cos(turn)) / damping;
  return { springStrength, damping };
}
