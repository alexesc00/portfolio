import { describe, expect, it } from 'vitest';
import { principlesStage, stepStart } from './principles-stage';

/** One step is one screen of scrolling; this screen is 900 tall. */
const step = 900;
const count = 3;

describe('the principles stage', () => {
  it('shows the first principle, no lines filled, before the stage pins', () => {
    expect(principlesStage(-400, step, count)).toEqual({
      current: 0,
      progress: [0, 0, 0],
    });
  });

  it('fills the first line as the visitor scrolls through the first step', () => {
    expect(principlesStage(450, step, count)).toEqual({
      current: 0,
      progress: [0.5, 0, 0],
    });
  });

  it('hands the stage to the next principle as its step begins', () => {
    expect(principlesStage(899, step, count).current).toBe(0);
    expect(principlesStage(900, step, count)).toEqual({
      current: 1,
      progress: [1, 0, 0],
    });
  });

  it('keeps the lines already passed full', () => {
    expect(principlesStage(2025, step, count)).toEqual({
      current: 2,
      progress: [1, 1, 0.25],
    });
  });

  it('holds the last principle, every line full, once the stage lets go', () => {
    expect(principlesStage(4000, step, count)).toEqual({
      current: 2,
      progress: [1, 1, 1],
    });
  });

  it('shows the first principle on a screen with no height yet', () => {
    expect(principlesStage(0, 0, count)).toEqual({
      current: 0,
      progress: [0, 0, 0],
    });
  });
});

describe('where each principle’s step starts', () => {
  it('is one screen of scrolling after the one before', () => {
    expect([0, 1, 2].map((i) => stepStart(i, step))).toEqual([0, 900, 1800]);
  });
});
