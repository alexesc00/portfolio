import { describe, expect, it } from 'vitest';
import { mixColors, rampColor } from './color-mixing';
import {
  createTrails,
  heatColorIndex,
  heatColors,
  heatColorCount,
  heatStops,
  isGlowing,
  isStreak,
  smearColorCount,
  smearColorIndex,
  smearColors,
  sortByColor,
  stepTrails,
  streakTail,
  type Trails,
} from './dot-colors';
import { sampleDots, type Dots } from './dot-mark';

const frame60 = 1000 / 60;
const afterglow = { heat: 900, smear: 700 };
const foreground = '#f7f7f3';

const heatRamp = [
  '#335ada',
  '#2d76ff',
  '#19e7ff',
  '#f4fbff',
  '#fcfbcb',
  '#fcfb6b',
  '#fff112',
  '#ffd817',
  '#f39f09',
  '#de4b00',
  '#ec1b00',
  '#ca392c',
  '#b71b10',
].map((color, i) => ({ at: heatStops[i], color }));

const smearWheel = [
  '#e15614',
  '#d8c42c',
  '#6b9041',
  '#0f7166',
  '#1f6fc0',
  '#db4578',
];

/** One dot whose home is the origin, at (x, y) moving at (vx, vy). */
function oneDot(x = 0, y = 0, vx = 0, vy = 0): Dots {
  const dots = sampleDots({
    box: { x: -3, y: -3, width: 6, height: 6 },
    spacing: 6,
    isInside: () => true,
  });
  dots.x[0] = x;
  dots.y[0] = y;
  dots.vx[0] = vx;
  dots.vy[0] = vy;
  return dots;
}

/**
 * Runs the trails for `duration` milliseconds of 60Hz frames, with the dots
 * held as they are, and returns whether they settled.
 */
function run(trails: Trails, dots: Dots, duration: number) {
  let isSettled = false;
  for (let time = 0; time < duration; time += frame60) {
    isSettled = stepTrails(trails, dots, frame60, afterglow);
  }
  return isSettled;
}

describe('heatStops', () => {
  it('places the thirteen signed-off colors from 0% to 100%', () => {
    expect(heatStops).toHaveLength(13);
    expect(heatStops[0]).toBe(0);
    expect(heatStops[3]).toBe(0.5);
    expect(heatStops[12]).toBe(1);
  });
});

describe('heatColors', () => {
  const colors = heatColors(heatRamp, foreground);

  it('makes a color for every step of heat, too fine to see the steps', () => {
    expect(heatColorCount).toBeGreaterThanOrEqual(64);
    expect(colors).toHaveLength(heatColorCount);
  });

  it('is the foreground color at rest, matching the still', () => {
    expect(colors[heatColorIndex(0)]).toBe(foreground);
  });

  it('runs to the hot end of the ramp for a dot pushed away fast', () => {
    expect(colors[heatColorIndex(1)]).toBe('#b71b10');
  });

  it('runs to the cold end of the ramp for a dot springing home fast', () => {
    expect(colors[heatColorIndex(-1)]).toBe('#335ada');
  });

  it('mixes a gently pushed dot partway from the foreground to warm', () => {
    // Heat 0.25 is three eighths of the way along the ramp, and takes
    // 40% of its color.
    const warm = rampColor(heatRamp, 0.625);

    expect(colors[heatColorIndex(0.25)]).toBe(mixColors(foreground, warm, 0.4));
  });
});

describe('heatColorIndex', () => {
  it('holds the ends for heat past either end', () => {
    expect(heatColorIndex(1)).not.toBe(heatColorIndex(-1));
    expect(heatColorIndex(3)).toBe(heatColorIndex(1));
    expect(heatColorIndex(-3)).toBe(heatColorIndex(-1));
  });
});

describe('isGlowing', () => {
  it('leaves dots at rest and barely moving without a glow', () => {
    expect(isGlowing(0)).toBe(false);
    expect(isGlowing(0.05)).toBe(false);
  });

  it('glows around hot and cold dots', () => {
    expect(isGlowing(0.5)).toBe(true);
    expect(isGlowing(-0.5)).toBe(true);
  });
});

describe('smearColors', () => {
  const colors = smearColors(smearWheel, foreground);

  it('makes a color for every direction and strength', () => {
    expect(smearColorCount).toBeGreaterThanOrEqual(64);
    expect(colors).toHaveLength(smearColorCount);
  });

  it('gives every still dot the foreground color, whatever its last heading', () => {
    expect(colors[smearColorIndex(0, 0)]).toBe(foreground);
    expect(smearColorIndex(0.0001, 0)).toBe(smearColorIndex(0, 0));
    expect(smearColorIndex(0, -0.0001)).toBe(smearColorIndex(0, 0));
  });

  it('colors a fast dot by its heading, 0° being travelling right', () => {
    expect(colors[smearColorIndex(5, 0)]).toBe('#e15614');
    expect(colors[smearColorIndex(-5, 0)]).toBe('#0f7166');
  });

  it('turns clockwise on screen, where y grows downwards', () => {
    // Straight down is 90°, halfway between the 60° and 120° colors.
    expect(colors[smearColorIndex(0, 5)]).toBe(
      mixColors('#d8c42c', '#6b9041', 0.5),
    );
  });

  it('mixes a slow dot only partway into its heading color', () => {
    const slow = colors[smearColorIndex(0.15, 0)];

    expect(slow).toMatch(/^#[0-9a-f]{6}$/);
    expect(slow).not.toBe(foreground);
    expect(slow).not.toBe('#e15614');
  });
});

describe('streakTail', () => {
  /** The tail for a dot moving at (`vx`, `vy`). */
  function tailFor(vx: number, vy: number) {
    return streakTail(vx, vy, { x: 0, y: 0 });
  }

  it('has no tail on a still dot, so it draws as a plain dot', () => {
    const tail = tailFor(0, 0);

    expect(Math.hypot(tail.x, tail.y)).toBe(0);
  });

  it('trails behind the way the dot came from', () => {
    expect(tailFor(1, 0).x).toBeLessThan(0);
    expect(tailFor(0, 1).y).toBeLessThan(0);
  });

  it('grows longer the faster the dot moves', () => {
    expect(Math.abs(tailFor(2, 0).x)).toBeGreaterThan(
      Math.abs(tailFor(1, 0).x),
    );
  });

  it('stretches sideways more than up and down', () => {
    const sideways = Math.abs(tailFor(1, 0).x);
    const upright = Math.abs(tailFor(0, 1).y);

    expect(sideways).toBeGreaterThan(upright * 2);
  });

  it('fills in the point it is given, so a frame makes no new objects', () => {
    const tail = { x: 0, y: 0 };

    expect(streakTail(1, 0, tail)).toBe(tail);
    expect(tail.x).toBeLessThan(0);
  });
});

describe('isStreak', () => {
  it('draws a dot whose tail would be under half a pixel as a plain dot', () => {
    // It would look the same, and a line costs more to draw than a dot.
    expect(isStreak(0, 0)).toBe(false);
    expect(isStreak(0.05, 0)).toBe(false);
    expect(isStreak(0, 0.3)).toBe(false);
  });

  it('draws a dot moving faster than that as a streak', () => {
    expect(isStreak(1, 0)).toBe(true);
    expect(isStreak(0, 1)).toBe(true);
  });
});

describe('stepTrails', () => {
  it('leaves a dot at rest cold and settled', () => {
    const trails = createTrails(1);

    expect(stepTrails(trails, oneDot(), frame60, afterglow)).toBe(true);
    expect(trails.heat[0]).toBe(0);
  });

  it('heats a dot moving away from home', () => {
    const trails = createTrails(1);

    stepTrails(trails, oneDot(10, 0, 2, 0), frame60, afterglow);

    expect(trails.heat[0]).toBeGreaterThan(0);
  });

  it('cools a dot springing back home', () => {
    const trails = createTrails(1);

    stepTrails(trails, oneDot(10, 0, -2, 0), frame60, afterglow);

    expect(trails.heat[0]).toBeLessThan(0);
  });

  it('heats up within a few frames', () => {
    const trails = createTrails(1);

    run(trails, oneDot(10, 0, 3, 0), 200);

    expect(trails.heat[0]).toBeGreaterThan(0.9);
  });

  it('fades over the afterglow once the dot stops', () => {
    const trails = createTrails(1);
    trails.heat[0] = 1;

    run(trails, oneDot(), afterglow.heat);

    // One afterglow is one time constant: about 37% left.
    expect(trails.heat[0]).toBeGreaterThan(0.3);
    expect(trails.heat[0]).toBeLessThan(0.45);
  });

  it('follows the dot’s velocity, smoothed', () => {
    const trails = createTrails(1);
    const dots = oneDot(10, 0, 4, -1);

    stepTrails(trails, dots, frame60, afterglow);
    expect(trails.vx[0]).toBeGreaterThan(0);
    expect(trails.vx[0]).toBeLessThan(4);

    run(trails, dots, 3000);
    expect(trails.vx[0]).toBeCloseTo(4, 1);
    expect(trails.vy[0]).toBeCloseTo(-1, 1);
  });

  it('is not settled while a dot still shows color', () => {
    const trails = createTrails(1);
    trails.heat[0] = 0.5;

    expect(stepTrails(trails, oneDot(), frame60, afterglow)).toBe(false);
  });

  it('settles only once every dot is back to the foreground color', () => {
    const trails = createTrails(1);
    trails.heat[0] = 1;
    trails.vx[0] = 5;
    const dots = oneDot();

    // Capped at a minute, so a trail that never settles fails the test
    // instead of hanging it.
    let frames = 0;
    let isSettled = false;
    while (!isSettled && frames < 3600) {
      isSettled = stepTrails(trails, dots, frame60, afterglow);
      frames++;
    }

    expect(isSettled).toBe(true);
    expect(frames).toBeGreaterThan(1);
    expect(heatColorIndex(trails.heat[0])).toBe(heatColorIndex(0));
    expect(smearColorIndex(trails.vx[0], trails.vy[0])).toBe(
      smearColorIndex(0, 0),
    );
  });

  it('treats a long pause like a 50ms frame', () => {
    const paused = createTrails(1);
    const capped = createTrails(1);
    paused.heat[0] = 1;
    capped.heat[0] = 1;

    stepTrails(paused, oneDot(), 5000, afterglow);
    stepTrails(capped, oneDot(), 50, afterglow);

    expect(paused.heat[0]).toBeLessThan(1);
    expect(paused.heat[0]).toBe(capped.heat[0]);
  });

  it('changes nothing when the clock steps backwards', () => {
    const trails = createTrails(1);
    trails.heat[0] = 1;

    stepTrails(trails, oneDot(10, 0, -2, 0), -16, afterglow);

    expect(trails.heat[0]).toBe(1);
    expect(trails.vx[0]).toBe(0);
  });
});

describe('sortByColor', () => {
  it('puts dots of the same color next to each other, in dot order', () => {
    const colors = new Uint16Array([2, 0, 2, 1, 0]);
    const order = new Uint32Array(colors.length);
    // One more than the three colors.
    const starts = new Uint32Array(4);

    sortByColor(colors, order, starts);

    expect(Array.from(order)).toEqual([1, 4, 3, 0, 2]);
  });

  it('can reuse its counts from one frame to the next', () => {
    const order = new Uint32Array(3);
    const starts = new Uint32Array(3);

    sortByColor(new Uint16Array([1, 0, 1]), order, starts);
    sortByColor(new Uint16Array([0, 1, 0]), order, starts);

    expect(Array.from(order)).toEqual([0, 2, 1]);
  });
});
