/*
 * Color for the dotted Æ while it moves. The dots rest in the foreground
 * color and take color from what they're doing:
 *
 * - Heat, in dark mode: warm while pushed away from home, cold while
 *   springing back, from a ramp with the foreground color in the middle.
 * - Smear, in light mode: the direction each dot travels, from a wheel
 *   of colors, with moving dots drawn as short streaks.
 *
 * Each palette is mixed once into a table of colors, so drawing a frame
 * only looks colors up. No DOM here; the DotMark component draws.
 */
import {
  mixColors,
  rampColor,
  wheelColor,
  type RampStop,
} from './color-mixing';
import { clampElapsed, type Dots, type Point } from './dot-mark';

/**
 * What each dot's color follows. It trails the dot's motion, so color
 * builds up and fades away rather than flickering from frame to frame.
 */
export interface Trails {
  /** From -1, springing home fast, through 0 at rest to 1, pushed away fast. */
  heat: Float32Array;
  /** The dot's velocity, smoothed, in pixels per 60Hz frame. */
  vx: Float32Array;
  vy: Float32Array;
}

/** Where the tokens heat-1 to heat-13 sit along the Heat ramp. */
export const heatStops = [
  0, 0.14, 0.32, 0.5, 0.56, 0.62, 0.68, 0.74, 0.8, 0.86, 0.91, 0.96, 1,
] as const;

/** Odd, so a dot at rest, heat 0, has a step of its own. */
export const heatColorCount = 129;
/** Speed away from home, in pixels per 60Hz frame, that is fully hot. */
const hottestSpeed = 3;
/** Heat takes on color faster than it moves along the ramp. */
const heatColorGain = 1.6;
/** How fast a dot heats up, in ms; it cools over the heat afterglow. */
const heatRise = 40;
/** Closer to home than this, in pixels, which way is away is just noise. */
const heatDeadZone = 0.3;
/** Fainter than this, a glow reads as haze rather than light. */
const glowFrom = 0.25;

/** One every 5°: a multiple of six, so each wheel color gets a step. */
const smearDirections = 72;
/** Steps from the foreground color to fully colored. */
const smearStrengths = 12;
export const smearColorCount = smearDirections * smearStrengths;
/** Smoothed speed, in pixels per 60Hz frame, that is fully colored. */
const smearFullSpeed = 0.6;
/** The shortest smoothing, in ms, however short the smear afterglow. */
const shortestSmoothing = 60;

/*
 * A streak's tail, in 60Hz frames of travel: long sideways and short
 * upright, like the horizontal smears in the glitched frog picture it
 * takes its colors from.
 */
const streakSideways = 5;
const streakUpright = 1.2;
/** Upright motion bends the tail sideways by this much more. */
const streakBend = 3;

function heatAmount(heat: number): number {
  return Math.min(Math.abs(heat) * heatColorGain, 1);
}

/** The step of the Heat table for `heat`. */
export function heatColorIndex(heat: number): number {
  const clamped = Math.min(Math.max(heat, -1), 1);
  return Math.round(((clamped + 1) / 2) * (heatColorCount - 1));
}

const restingHeat = heatColorIndex(0);

/**
 * Every Heat color, from coldest to hottest. Heat picks a point along
 * `ramp`, the middle at rest, and mixes it into the foreground by how hot
 * the dot is, so a dot at rest is exactly the foreground color.
 */
export function heatColors(ramp: RampStop[], foreground: string): string[] {
  return Array.from({ length: heatColorCount }, (_, i) => {
    const heat = (i / (heatColorCount - 1)) * 2 - 1;
    const color = rampColor(ramp, 0.5 + heat / 2);
    return mixColors(foreground, color, heatAmount(heat));
  });
}

/** Whether a dot this hot or cold gets a glow around it. */
export function isGlowing(heat: number): boolean {
  return heatAmount(heat) >= glowFrom;
}

/**
 * The step of the Smear table for a dot moving at (`vx`, `vy`). Every
 * still dot gets step 0, whichever way it last moved, so still dots are
 * drawn together in one color.
 */
export function smearColorIndex(vx: number, vy: number): number {
  // The square root switches dots into color quickly: a slow blend from
  // the foreground passes through muddy colors the palette never has.
  const amount = Math.min(Math.sqrt(Math.hypot(vx, vy) / smearFullSpeed), 1);
  const strength = Math.round(amount * (smearStrengths - 1));
  if (strength === 0) return 0;
  const turn = Math.atan2(vy, vx) / (Math.PI * 2);
  const direction = Math.round((turn + 1) * smearDirections) % smearDirections;
  return strength * smearDirections + direction;
}

/**
 * Every Smear color: for each strength, from none to full, the `wheel`
 * color for each direction mixed into the foreground. The wheel starts at
 * travelling right and turns clockwise on screen.
 */
export function smearColors(wheel: string[], foreground: string): string[] {
  return Array.from({ length: smearColorCount }, (_, i) => {
    const strength = Math.floor(i / smearDirections) / (smearStrengths - 1);
    const turn = (i % smearDirections) / smearDirections;
    return mixColors(foreground, wheelColor(wheel, turn), strength);
  });
}

/**
 * Where a streak's tail is, from the dot, for a dot moving at (`vx`,
 * `vy`) smoothed. A still dot has no tail, so it's drawn as a plain dot.
 */
export const streakTail: (vx: number, vy: number, tail: Point) => Point = (
  vx,
  vy,
) => ({
  x: -vx * streakSideways - Math.sign(vx) * Math.abs(vy) * streakBend,
  y: -vy * streakUpright,
});

export function createTrails(count: number): Trails {
  return {
    heat: new Float32Array(count),
    vx: new Float32Array(count),
    vy: new Float32Array(count),
  };
}

/**
 * Moves the trails on by `elapsed` milliseconds towards what `dots` are
 * doing now, fading over the `afterglow` durations in ms. Returns whether
 * every dot is back to the foreground color, in both palettes.
 */
export function stepTrails(
  trails: Trails,
  dots: Dots,
  elapsed: number,
  afterglow: { heat: number; smear: number },
): boolean {
  const time = clampElapsed(elapsed);
  const rise = 1 - Math.exp(-time / heatRise);
  const fade = 1 - Math.exp(-time / afterglow.heat);
  const smoothing =
    1 - Math.exp(-time / Math.max(shortestSmoothing, afterglow.smear / 2));
  const { homeX, homeY, x, y, vx, vy } = dots;
  const { heat } = trails;
  let isSettled = true;

  for (let i = 0; i < x.length; i++) {
    const offsetX = x[i] - homeX[i];
    const offsetY = y[i] - homeY[i];
    const offset = Math.hypot(offsetX, offsetY);
    const outward =
      offset > heatDeadZone ? (vx[i] * offsetX + vy[i] * offsetY) / offset : 0;
    const target = Math.min(Math.max(outward / hottestSpeed, -1), 1);
    const isHeating = Math.abs(target) > Math.abs(heat[i]);
    heat[i] += (target - heat[i]) * (isHeating ? rise : fade);

    trails.vx[i] += (vx[i] - trails.vx[i]) * smoothing;
    trails.vy[i] += (vy[i] - trails.vy[i]) * smoothing;

    // Once one dot shows color, the rest needn't be checked.
    isSettled &&=
      heatColorIndex(heat[i]) === restingHeat &&
      smearColorIndex(trails.vx[i], trails.vy[i]) === 0;
  }
  return isSettled;
}

/**
 * Fills `order` with the dots' numbers, grouped by their entry in
 * `colors`, so each color can be drawn as one path. Dots keep their
 * order within a color. `starts` holds one more entry than there are
 * colors; it's passed in so drawing a frame makes no new arrays.
 */
export function sortByColor(
  colors: Uint16Array,
  order: Uint32Array,
  starts: Uint32Array,
) {
  // A counting sort: linear in the dots, where a comparison sort isn't.
  starts.fill(0);
  for (const color of colors) starts[color + 1]++;
  for (let color = 1; color < starts.length; color++) {
    starts[color] += starts[color - 1];
  }
  for (let i = 0; i < colors.length; i++) order[starts[colors[i]]++] = i;
}
