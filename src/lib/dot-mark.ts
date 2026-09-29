/*
 * The dotted Æ in the hero: its letter sampled into dots, and the physics
 * that pushes dots away from the pointer and springs them home. No DOM
 * here; the DotMark component does the drawing.
 */

import { aeSpring, stepConstants } from './spring';

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Every dot's home, position and velocity, one entry per dot. */
export interface Dots {
  homeX: Float32Array;
  homeY: Float32Array;
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
}

/*
 * The physics, stepped at 60 frames a second. Each step scales it by how
 * many of those frames have passed, so the dots move at the same speed on
 * a 120Hz screen. The spring is the site's own: its constants come out
 * within a thousandth of the prototype's hand-tuned 0.08 and 0.85.
 */
const frameLength = 1000 / 60;
const pushStrength = 15;
const { springStrength, damping } = stepConstants(aeSpring, frameLength);
/** The push radius as tuned on a mark 350px tall. */
const basePushRadius = 120;
const basePushRadiusHeight = 350;
const longestFrame = 50;
/** Below this, movement is too small to see, so the dots count as still. */
const stillMotion = 0.01;

/** How long the pointer is gone before a stand-in starts to wander, in ms. */
export const idleBeforeWander = 1500;

/**
 * One dot in the middle of every `spacing`-sized tile of `box` whose middle
 * is inside the letter. The tiles line up with the CSS dot pattern of the
 * still Æ, so the dots land exactly where the still drew them.
 */
export function sampleDots({
  box,
  spacing,
  isInside,
}: {
  box: Box;
  spacing: number;
  isInside: (x: number, y: number) => boolean;
}): Dots {
  const columns = Math.floor(box.width / spacing + 0.5);
  const rows = Math.floor(box.height / spacing + 0.5);
  const homes: number[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const x = box.x + (column + 0.5) * spacing;
      const y = box.y + (row + 0.5) * spacing;
      if (isInside(x, y)) homes.push(x, y);
    }
  }

  const count = homes.length / 2;
  const homeX = new Float32Array(count);
  const homeY = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    homeX[i] = homes[i * 2];
    homeY[i] = homes[i * 2 + 1];
  }
  return {
    homeX,
    homeY,
    x: homeX.slice(),
    y: homeY.slice(),
    vx: new Float32Array(count),
    vy: new Float32Array(count),
  };
}

/**
 * How much of `elapsed` milliseconds to move things on by. A long frame,
 * after a stall or a background tab, would fling the dots; a clock that
 * steps backwards would make the damping amplify instead, and blow them
 * apart.
 */
export function clampElapsed(elapsed: number): number {
  return Math.min(Math.max(elapsed, 0), longestFrame);
}

/**
 * Moves the dots on by `elapsed` milliseconds: pushed away from `pusher`
 * when they're within `pushRadius` of it, and always pulled home. Returns
 * whether every dot has come to rest.
 */
export function stepDots(
  dots: Dots,
  elapsed: number,
  pusher: Point | null,
  pushRadius: number,
): boolean {
  const frames = clampElapsed(elapsed) / frameLength;
  // With no time passed nothing could move, so stillness can't be told.
  if (frames === 0) return false;
  const frameDamping = damping ** frames;
  const { homeX, homeY, x, y, vx, vy } = dots;
  let motion = 0;

  for (let i = 0; i < x.length; i++) {
    const startVx = vx[i];
    const startVy = vy[i];
    if (pusher) {
      const dx = pusher.x - x[i];
      const dy = pusher.y - y[i];
      const distance = Math.hypot(dx, dy);
      if (distance < pushRadius && distance > 0) {
        const force =
          ((pushRadius - distance) / pushRadius) * pushStrength * frames;
        vx[i] -= (dx / distance) * force;
        vy[i] -= (dy / distance) * force;
      }
    }
    vx[i] =
      (vx[i] + (homeX[i] - x[i]) * springStrength * frames) * frameDamping;
    vy[i] =
      (vy[i] + (homeY[i] - y[i]) * springStrength * frames) * frameDamping;
    x[i] += vx[i] * frames;
    y[i] += vy[i] * frames;

    // A dot is still when it's slow and nothing is speeding it up. Speed
    // alone would count a dot at the top of a bounce as still; distance
    // from home would never count one held off by a resting pointer.
    const speed = Math.abs(vx[i]) + Math.abs(vy[i]);
    const speedChange = Math.abs(vx[i] - startVx) + Math.abs(vy[i] - startVy);
    motion = Math.max(motion, speed + speedChange);
  }
  return motion < stillMotion;
}

/**
 * The push radius for a mark `markHeight` pixels tall. A fixed radius would
 * open a hole across the whole letter on a phone, so it scales with the
 * mark, within limits.
 */
export function pushRadiusFor(markHeight: number): number {
  const scale = Math.min(
    Math.max(markHeight / basePushRadiusHeight, 0.55),
    1.4,
  );
  return basePushRadius * scale;
}

/**
 * Where the stand-in pointer is at `time` milliseconds: a slow figure of
 * eight across `mark`, going round about every 15 seconds.
 */
export function wanderPoint(time: number, mark: Box): Point {
  const seconds = time / 1000;
  return {
    x: mark.x + mark.width * (0.5 + 0.5 * Math.sin(seconds * 0.43)),
    y: mark.y + mark.height * (0.5 + 0.32 * Math.sin(seconds * 0.86 + 0.6)),
  };
}

/**
 * Whether `point` is close enough to `mark` to push any of its dots. A
 * pointer further away counts as gone, so the stand-in can wander.
 */
export function isNearMark(
  point: Point,
  mark: Box,
  pushRadius: number,
): boolean {
  const dx = Math.max(mark.x - point.x, 0, point.x - (mark.x + mark.width));
  const dy = Math.max(mark.y - point.y, 0, point.y - (mark.y + mark.height));
  return Math.hypot(dx, dy) < pushRadius;
}

/**
 * What pushes the dots: the pointer while there is one near the mark.
 * After a moment without one, a stand-in wanders over the mark, so it
 * moves on phones, which have no hover, and under a resting cursor.
 */
export function choosePusher({
  pointer,
  idleFor,
  time,
  mark,
}: {
  pointer: Point | null;
  idleFor: number;
  time: number;
  mark: Box;
}): Point | null {
  if (pointer) return pointer;
  if (idleFor > idleBeforeWander) return wanderPoint(time, mark);
  return null;
}

/**
 * Whether the drawing loop can stop until something wakes it. Once the
 * dots settle under a pointer nothing changes until it moves; without a
 * pointer the stand-in is about to wander, so the loop keeps going.
 */
export function canStopDrawing({
  isSettled,
  hasPointer,
}: {
  isSettled: boolean;
  hasPointer: boolean;
}): boolean {
  return isSettled && hasPointer;
}

/**
 * How many canvas pixels to draw per CSS pixel. Past 2× the extra
 * sharpness can't be seen on dots this small, but costs a lot to fill.
 */
export function canvasScale(devicePixelRatio: number): number {
  return Math.min(devicePixelRatio, 2);
}
