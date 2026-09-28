import type { RampStop } from './color-mixing';
import type { Dots, Point } from './dot-mark';

export interface Trails {
  heat: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
}

export const heatStops: readonly number[] = [];
export const heatColorCount = 0;
export const smearColorCount = 0;

export const heatColors: (
  ramp: RampStop[],
  foreground: string,
) => string[] = () => [];
export const heatColorIndex: (heat: number) => number = () => -1;
export const isGlowing: (heat: number) => boolean = () => false;

export const smearColors: (
  wheel: string[],
  foreground: string,
) => string[] = () => [];
export const smearColorIndex: (vx: number, vy: number) => number = () => -1;

export const streakTail: (vx: number, vy: number) => Point = () => ({
  x: 1,
  y: 1,
});

export const createTrails: (count: number) => Trails = () => ({
  heat: new Float32Array(1),
  vx: new Float32Array(1),
  vy: new Float32Array(1),
});
export const stepTrails: (
  trails: Trails,
  dots: Dots,
  elapsed: number,
  afterglow: { heat: number; smear: number },
) => boolean = () => false;

export const sortByColor: (
  colors: Uint16Array,
  colorCount: number,
  order: Uint32Array,
) => void = () => undefined;
