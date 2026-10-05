import { describe, expect, it } from 'vitest';
import { mixColors, rampColor } from './color-mixing';
import {
  colorAmount,
  createTrails,
  heatColorIndex,
  heatColors,
  heatColorCount,
  heatLightStops,
  heatPaletteColors,
  heatStops,
  isGlowing,
  snapHeatColors,
  sortByColor,
  stepTrails,
  type Trails,
} from './dot-colors';
import { sampleDots, type Dots } from './dot-mark';

const frame60 = 1000 / 60;
const afterglow = 900;
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

const heatLightRamp = [
  '#335ada',
  '#2d76ff',
  '#009cbd',
  '#d57700',
  '#de4b00',
  '#ec1b00',
  '#ca392c',
  '#b71b10',
].map((color, i) => ({ at: heatLightStops[i], color }));
/** The light-mode foreground at 60% over the light background. */
const restingGray = '#6c6c6a';

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

describe('heatLightStops', () => {
  it('places the eight signed-off light-mode colors from 0% to 100%', () => {
    expect(heatLightStops).toHaveLength(8);
    expect(heatLightStops[0]).toBe(0);
    expect(heatLightStops[7]).toBe(1);
  });

  it('leaves the middle of the ramp, where a dot rests, without a color', () => {
    expect(heatLightStops).not.toContain(0.5);
    expect(heatLightStops.filter((at) => at < 0.5)).toHaveLength(3);
  });
});

describe('heatPaletteColors', () => {
  const colors = heatPaletteColors(heatLightRamp);

  it('makes a color for every step of heat', () => {
    expect(colors).toHaveLength(heatColorCount);
  });

  it('gives gentle motion the palest color on its side, with no gray in it', () => {
    expect(colors[heatColorIndex(0.05)]).toBe('#d57700');
    expect(colors[heatColorIndex(-0.05)]).toBe('#009cbd');
  });

  it('runs to the ends of the ramp for hard motion', () => {
    expect(colors[heatColorIndex(1)]).toBe('#b71b10');
    expect(colors[heatColorIndex(-1)]).toBe('#335ada');
  });
});

describe('snapHeatColors', () => {
  const colors = snapHeatColors(heatLightRamp, restingGray);
  const palette = heatPaletteColors(heatLightRamp);

  it('makes a color for every step of heat', () => {
    expect(colors).toHaveLength(heatColorCount);
  });

  it('is exactly the resting color at rest, matching the still', () => {
    expect(colors[heatColorIndex(0)]).toBe(restingGray);
  });

  it('keeps the resting color below a tenth of full color', () => {
    // Heat 0.05 takes 8% of its color; 0.08 takes 13%.
    expect(colors[heatColorIndex(0.05)]).toBe(restingGray);
    expect(colors[heatColorIndex(-0.05)]).toBe(restingGray);
  });

  it('snaps to full color from a tenth of full color on', () => {
    expect(colors[heatColorIndex(0.08)]).toBe('#d57700');
    expect(colors[heatColorIndex(-0.08)]).toBe('#009cbd');
  });

  it('shows the resting color or the palette’s own, never a mix of the two', () => {
    colors.forEach((color, step) => {
      expect([restingGray, palette[step]]).toContain(color);
    });
  });

  it('runs to the ends of the ramp for hard motion', () => {
    expect(colors[heatColorIndex(1)]).toBe('#b71b10');
    expect(colors[heatColorIndex(-1)]).toBe('#335ada');
  });
});

describe('colorAmount', () => {
  it('is nothing at rest and full well before the fastest motion', () => {
    expect(colorAmount(0)).toBe(0);
    expect(colorAmount(0.25)).toBeCloseTo(0.4);
    expect(colorAmount(-0.25)).toBeCloseTo(0.4);
    expect(colorAmount(0.8)).toBe(1);
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

    run(trails, oneDot(), afterglow);

    // One afterglow is one time constant: about 37% left.
    expect(trails.heat[0]).toBeGreaterThan(0.3);
    expect(trails.heat[0]).toBeLessThan(0.45);
  });

  it('is not settled while a dot still shows color', () => {
    const trails = createTrails(1);
    trails.heat[0] = 0.5;

    expect(stepTrails(trails, oneDot(), frame60, afterglow)).toBe(false);
  });

  it('settles only once every dot is back to its resting color', () => {
    const trails = createTrails(1);
    trails.heat[0] = 1;
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
