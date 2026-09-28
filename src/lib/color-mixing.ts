/*
 * Mixing colors in OKLab, a color space built so that equal steps look
 * like equal changes. Mixing plain sRGB values makes blends that look too
 * light or pass through grey on the way between two bright colors.
 */

/** A color placed along a ramp, `at` 0 at the start and 1 at the end. */
export interface RampStop {
  at: number;
  color: string;
}

type Triple = [number, number, number];

function hexToRgb(hex: string): Triple {
  const digits = hex.trim();
  // Anything else would parse as black, and draw black without a word.
  if (!/^#[0-9a-f]{6}$/i.test(digits)) {
    throw new Error(`Can't mix "${hex}": colors are written like #e15614`);
  }
  const value = parseInt(digits.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex(rgb: Triple): string {
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/** `color` written the way every function here returns colors. */
function tidyHex(color: string): string {
  return rgbToHex(hexToRgb(color));
}

function toLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function fromLinear(value: number): number {
  const channel =
    value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
  return Math.min(Math.max(Math.round(channel * 255), 0), 255);
}

// The conversions and their constants are Björn Ottosson's, who defined
// OKLab: https://bottosson.github.io/posts/oklab/
function rgbToOklab(rgb: Triple): Triple {
  const [r, g, b] = rgb.map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToRgb([lightness, a, b]: Triple): Triple {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/**
 * `from` mixed `amount` of the way to `to`, as a lowercase hex color.
 * Both take hex colors like `#e15614`.
 */
export function mixColors(from: string, to: string, amount: number): string {
  const start = rgbToOklab(hexToRgb(from));
  const end = rgbToOklab(hexToRgb(to));
  const mixed = start.map(
    (value, i) => value + (end[i] - value) * amount,
  ) as Triple;
  return rgbToHex(oklabToRgb(mixed));
}

/**
 * The color `at` a point along `ramp`, whose stops run in order from 0
 * to 1: a mix of the stops either side, and the end colors past the ends.
 */
export function rampColor(ramp: RampStop[], at: number): string {
  const next = ramp.findIndex((stop) => stop.at >= at);
  if (next === -1) return tidyHex(ramp[ramp.length - 1].color);
  if (next === 0) return tidyHex(ramp[0].color);
  const before = ramp[next - 1];
  const after = ramp[next];
  const amount = (at - before.at) / (after.at - before.at);
  return mixColors(before.color, after.color, amount);
}

/**
 * The color `turn` of the way round a wheel of `colors`, spaced evenly
 * from the first at 0, mixing neighbours and wrapping past the last.
 */
export function wheelColor(colors: string[], turn: number): string {
  const position = (((turn % 1) + 1) % 1) * colors.length;
  const before = Math.floor(position);
  return mixColors(
    colors[before],
    colors[(before + 1) % colors.length],
    position - before,
  );
}
