/*
 * The principles section holds still at the top of the screen while the
 * visitor scrolls, one step per principle, each step one screen long.
 * The principle whose step the visitor is in has the stage, and the line
 * over its index label fills from 0 to 1 as they scroll through it.
 */

export interface PrinciplesStage {
  /** The index of the principle on the stage. */
  current: number;
  /** How full each principle's line is, from 0 to 1. */
  progress: number[];
}

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

/**
 * The stage after `scrolled` pixels of scrolling since the section
 * reached the top of the screen, which is negative before it gets there.
 */
export function principlesStage(
  scrolled: number,
  stepHeight: number,
  count: number,
): PrinciplesStage {
  if (stepHeight <= 0) {
    return { current: 0, progress: Array<number>(count).fill(0) };
  }
  const steps = scrolled / stepHeight;
  return {
    current: Math.min(Math.max(Math.floor(steps), 0), count - 1),
    progress: Array.from({ length: count }, (_, i) => clamp(steps - i)),
  };
}

/** How far past the section's top a principle's step starts. */
export function stepStart(index: number, stepHeight: number) {
  return index * stepHeight;
}
