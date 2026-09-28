import { describe, expect, it } from 'vitest';
import {
  canStopDrawing,
  canvasScale,
  choosePusher,
  idleBeforeWander,
  pushRadiusFor,
  sampleDots,
  stepDots,
  wanderPoint,
  type Box,
  type Dots,
} from './dot-mark';

const frame60 = 1000 / 60;

/** One dot whose home is the origin, held still at (x, y). */
function oneDot(x = 0, y = 0): Dots {
  const dots = sampleDots({
    box: { x: -3, y: -3, width: 6, height: 6 },
    spacing: 6,
    isInside: () => true,
  });
  dots.x[0] = x;
  dots.y[0] = y;
  return dots;
}

/** Runs the physics for `duration` milliseconds in frames of `frame`. */
function run(
  dots: Dots,
  duration: number,
  frame = frame60,
  pusher: { x: number; y: number } | null = null,
) {
  let isSettled = false;
  for (let time = 0; time < duration; time += frame) {
    isSettled = stepDots(dots, frame, pusher, 120);
  }
  return isSettled;
}

describe('sampleDots', () => {
  it('puts a dot in the middle of every tile the letter covers', () => {
    const dots = sampleDots({
      box: { x: 10, y: 20, width: 12, height: 12 },
      spacing: 6,
      isInside: () => true,
    });

    expect(Array.from(dots.homeX)).toEqual([13, 19, 13, 19]);
    expect(Array.from(dots.homeY)).toEqual([23, 23, 29, 29]);
  });

  it('leaves out tiles whose middle falls outside the letter', () => {
    const dots = sampleDots({
      box: { x: 0, y: 0, width: 12, height: 6 },
      spacing: 6,
      isInside: (x) => x < 6,
    });

    expect(Array.from(dots.homeX)).toEqual([3]);
  });

  it('starts every dot at rest on its home', () => {
    const dots = sampleDots({
      box: { x: 0, y: 0, width: 12, height: 12 },
      spacing: 6,
      isInside: () => true,
    });

    expect(dots.x).toHaveLength(4);
    expect(dots.x).toEqual(dots.homeX);
    expect(dots.y).toEqual(dots.homeY);
    expect(dots.vx.every((v) => v === 0)).toBe(true);
    expect(dots.vy.every((v) => v === 0)).toBe(true);
  });
});

describe('stepDots', () => {
  it('leaves dots at rest when nothing pushes them', () => {
    const dots = oneDot();

    expect(stepDots(dots, frame60, null, 120)).toBe(true);
    expect(dots.x[0]).toBe(0);
    expect(dots.y[0]).toBe(0);
  });

  it('pushes a dot inside the radius away from the pusher', () => {
    const dots = oneDot();

    stepDots(dots, frame60, { x: 50, y: 0 }, 120);

    expect(dots.x[0]).toBeLessThan(0);
    expect(dots.y[0]).toBeCloseTo(0);
  });

  it('leaves a dot beyond the radius alone', () => {
    const dots = oneDot();

    expect(stepDots(dots, frame60, { x: 121, y: 0 }, 120)).toBe(true);
    expect(dots.x[0]).toBe(0);
  });

  it('reports that dots are still moving', () => {
    const dots = oneDot(20, 0);

    expect(stepDots(dots, frame60, null, 120)).toBe(false);
  });

  it('springs a displaced dot back home and settles', () => {
    const dots = oneDot(20, -10);

    const isSettled = run(dots, 2000);

    expect(isSettled).toBe(true);
    expect(dots.x[0]).toBeCloseTo(0, 1);
    expect(dots.y[0]).toBeCloseTo(0, 1);
  });

  it('moves dots within a pixel of the same path at 60 and 120 frames a second', () => {
    const at60 = oneDot(20, 0);
    const at120 = oneDot(20, 0);

    run(at60, 200, 1000 / 60);
    run(at120, 200, 1000 / 120);

    expect(Math.abs(at120.x[0] - at60.x[0])).toBeLessThan(1);
  });

  it('treats a long pause like a 50ms frame, so dots are not flung', () => {
    const paused = oneDot(20, 0);
    const capped = oneDot(20, 0);

    stepDots(paused, 5000, null, 120);
    stepDots(capped, 50, null, 120);

    expect(paused.x[0]).toBeLessThan(20);
    expect(paused.x[0]).toBe(capped.x[0]);
  });

  it('does not move dots when the clock steps backwards', () => {
    const dots = oneDot(20, 0);

    stepDots(dots, -16, null, 120);

    expect(dots.x[0]).toBe(20);
  });
});

describe('pushRadiusFor', () => {
  it('is 120px for a mark 350px tall, as in Figma', () => {
    expect(pushRadiusFor(350)).toBe(120);
  });

  it('grows and shrinks with the mark', () => {
    expect(pushRadiusFor(280)).toBeCloseTo(96);
    expect(pushRadiusFor(420)).toBeCloseTo(144);
  });

  it('stays within limits on very small and very large marks', () => {
    expect(pushRadiusFor(50)).toBeCloseTo(66);
    expect(pushRadiusFor(2000)).toBeCloseTo(168);
  });
});

describe('wanderPoint', () => {
  const mark: Box = { x: 100, y: 200, width: 400, height: 300 };

  function pointsOverOneMinute() {
    return Array.from({ length: 600 }, (_, i) => wanderPoint(i * 100, mark));
  }

  it('stays over the mark', () => {
    for (const point of pointsOverOneMinute()) {
      expect(point.x).toBeGreaterThanOrEqual(mark.x);
      expect(point.x).toBeLessThanOrEqual(mark.x + mark.width);
      expect(point.y).toBeGreaterThanOrEqual(mark.y);
      expect(point.y).toBeLessThanOrEqual(mark.y + mark.height);
    }
  });

  it('travels across the whole width of the mark', () => {
    const xs = pointsOverOneMinute().map((point) => point.x);

    expect(Math.min(...xs)).toBeLessThan(mark.x + mark.width * 0.1);
    expect(Math.max(...xs)).toBeGreaterThan(mark.x + mark.width * 0.9);
  });

  it('crosses itself in the middle, like a figure of eight', () => {
    const middle = { x: mark.x + mark.width / 2, y: mark.y + mark.height / 2 };
    const nearMiddle = pointsOverOneMinute().filter(
      (point) =>
        Math.abs(point.x - middle.x) < mark.width * 0.05 &&
        Math.abs(point.y - middle.y) < mark.height * 0.25,
    );

    expect(nearMiddle.length).toBeGreaterThan(0);
  });
});

describe('choosePusher', () => {
  const mark: Box = { x: 0, y: 0, width: 400, height: 300 };

  it('follows the pointer while there is one', () => {
    const pointer = { x: 10, y: 20 };

    expect(choosePusher({ pointer, idleFor: 0, time: 0, mark })).toEqual(
      pointer,
    );
  });

  it('pushes nothing for a moment after the pointer leaves', () => {
    expect(
      choosePusher({
        pointer: null,
        idleFor: idleBeforeWander - 1,
        time: 0,
        mark,
      }),
    ).toBeNull();
  });

  it('wanders over the mark once the page has been idle a while', () => {
    expect(
      choosePusher({
        pointer: null,
        idleFor: idleBeforeWander + 1,
        time: 1234,
        mark,
      }),
    ).toEqual(wanderPoint(1234, mark));
  });
});

describe('canStopDrawing', () => {
  it('keeps drawing while dots are moving', () => {
    expect(canStopDrawing({ isSettled: false, hasPointer: true })).toBe(false);
  });

  it('keeps drawing without a pointer, so the stand-in can wander', () => {
    expect(canStopDrawing({ isSettled: true, hasPointer: false })).toBe(false);
  });

  it('stops once the dots have settled under a pointer', () => {
    expect(canStopDrawing({ isSettled: true, hasPointer: true })).toBe(true);
  });
});

describe('canvasScale', () => {
  it('matches the screen up to 2×', () => {
    expect(canvasScale(1)).toBe(1);
    expect(canvasScale(1.5)).toBe(1.5);
    expect(canvasScale(2)).toBe(2);
  });

  it('caps sharper screens at 2×, where more pixels are not visible', () => {
    expect(canvasScale(3)).toBe(2);
  });
});
