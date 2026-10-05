/*
 * Color for the dotted Æ while it moves: Heat. A dot turns warm while
 * pushed away from home and cold while springing back, picking a color
 * along a ramp from cold to hot. At rest it's the letter's resting color.
 * Each theme has its own ramp: dark mode's runs through white and yellow
 * in the middle, which light mode leaves out, as they vanish on a light
 * background.
 *
 * Each palette is mixed once into a table of colors, so drawing a frame
 * only looks colors up. No DOM here; the DotMark component draws.
 */
import { mixColors, rampColor, type RampStop } from './color-mixing';
import { clampElapsed, type Dots } from './dot-mark';

/**
 * What each dot's color follows. It trails the dot's motion, so color
 * builds up and fades away rather than flickering from frame to frame.
 */
export interface Trails {
  /** From -1, springing home fast, through 0 at rest to 1, pushed away fast. */
  heat: Float32Array;
}

/** Where the tokens heat-1 to heat-13 sit along the Heat ramp. */
export const heatStops = [
  0, 0.14, 0.32, 0.5, 0.56, 0.62, 0.68, 0.74, 0.8, 0.86, 0.91, 0.96, 1,
] as const;

/**
 * Where the tokens heat-light-1 to heat-light-8 sit along light mode's
 * Heat ramp. The middle, where a dot rests, has no color of its own.
 */
export const heatLightStops = [
  0, 0.22, 0.38, 0.62, 0.74, 0.86, 0.93, 1,
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
/**
 * In light mode, a dot takes on color once it has this much of its full
 * color. Below it, the dot keeps the resting color.
 */
const snapFrom = 0.1;

/** How much of its color a dot this hot or cold shows, from 0 to 1. */
export function colorAmount(heat: number): number {
  return Math.min(Math.abs(heat) * heatColorGain, 1);
}

/** The heat a step of the Heat table stands for, from -1 to 1. */
export function stepHeat(step: number): number {
  return (step / (heatColorCount - 1)) * 2 - 1;
}

/** The step of the Heat table for `heat`. */
export function heatColorIndex(heat: number): number {
  const clamped = Math.min(Math.max(heat, -1), 1);
  return Math.round(((clamped + 1) / 2) * (heatColorCount - 1));
}

const restingHeat = heatColorIndex(0);

/**
 * Every Heat color for dark mode, from coldest to hottest. Heat picks a
 * point along `ramp`, the middle at rest, and mixes it into the
 * foreground by how hot the dot is, so a dot at rest is exactly the
 * foreground color.
 */
export function heatColors(ramp: RampStop[], foreground: string): string[] {
  return Array.from({ length: heatColorCount }, (_, i) => {
    const heat = stepHeat(i);
    const color = rampColor(ramp, 0.5 + heat / 2);
    return mixColors(foreground, color, colorAmount(heat));
  });
}

/**
 * Every step's color straight from `ramp`, with no resting color mixed
 * in. Near the middle the ramp has no color of its own, so gentle motion
 * takes the palest color on its side.
 */
export function heatPaletteColors(ramp: RampStop[]): string[] {
  const coolest = ramp.findLast((stop) => stop.at < 0.5)?.at ?? 0;
  const warmest = ramp.find((stop) => stop.at > 0.5)?.at ?? 1;
  return Array.from({ length: heatColorCount }, (_, i) => {
    const at = 0.5 + stepHeat(i) / 2;
    return rampColor(
      ramp,
      at < 0.5 ? Math.min(at, coolest) : Math.max(at, warmest),
    );
  });
}

/**
 * Every Heat color for light mode: `rest` until a dot shows a tenth of
 * its color, then its full palette color. A little color mixed into the
 * resting gray reads as mud; dark mode gets away with mixing because its
 * resting color is near white.
 */
export function snapHeatColors(ramp: RampStop[], rest: string): string[] {
  return heatPaletteColors(ramp).map((color, i) =>
    colorAmount(stepHeat(i)) >= snapFrom ? color : rest,
  );
}

/** Whether a dot this hot or cold gets a glow around it. */
export function isGlowing(heat: number): boolean {
  return colorAmount(heat) >= glowFrom;
}

export function createTrails(count: number): Trails {
  return { heat: new Float32Array(count) };
}

/**
 * Moves the trails on by `elapsed` milliseconds towards what `dots` are
 * doing now, fading over `afterglow` milliseconds. Returns whether every
 * dot is back to its resting color.
 */
export function stepTrails(
  trails: Trails,
  dots: Dots,
  elapsed: number,
  afterglow: number,
): boolean {
  const time = clampElapsed(elapsed);
  const rise = 1 - Math.exp(-time / heatRise);
  const fade = 1 - Math.exp(-time / afterglow);
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

    // Once one dot shows color, the rest needn't be checked.
    isSettled &&= heatColorIndex(heat[i]) === restingHeat;
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
