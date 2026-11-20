import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readCssTokens } from './design-tokens';
import {
  aeSpring,
  settleSpring,
  springCurve,
  springProgress,
  landedProgress,
  springStep,
  stepConstants,
} from './spring';

describe('springProgress', () => {
  it('starts at 0 and comes to rest at 1', () => {
    expect(springProgress(aeSpring, 0)).toBe(0);
    expect(springProgress(aeSpring, 3000)).toBeCloseTo(1, 3);
  });

  it('never passes the target with no bounce', () => {
    for (let time = 0; time <= 2000; time += 10) {
      expect(springProgress(settleSpring, time)).toBeLessThanOrEqual(1);
    }
  });

  // A bounce of 0.7 is a damping ratio of 0.3, which overshoots by
  // e^(−π × 0.3 / √(1 − 0.3²)), about 37%.
  it('overshoots by about 37% with a bounce of 0.7', () => {
    let highest = 0;
    for (let time = 0; time <= 1000; time += 1) {
      highest = Math.max(highest, springProgress(aeSpring, time));
    }

    expect(highest).toBeCloseTo(1.372, 2);
  });
});

describe('springCurve', () => {
  const curve = springCurve(settleSpring);
  const points = /^linear\((.+)\)$/.exec(curve.easing)?.[1].split(', ');

  it('draws the spring as a CSS linear() curve from 0 to 1', () => {
    expect(points?.at(0)).toBe('0');
    expect(points?.at(-1)).toBe('1');
  });

  it('takes a point every 60th of a second, for as long as it runs', () => {
    expect(curve.duration).toBe(
      Math.round(((points?.length ?? 0) - 1) * (1000 / 60)),
    );
  });

  // Ending the curve early snaps the rest of the way; within 0.2% that's
  // under a tenth of a pixel on the table's 20px lines.
  it('runs until the spring stays within 0.2% of rest', () => {
    for (let time = curve.duration; time < 3000; time += 10) {
      expect(Math.abs(1 - springProgress(settleSpring, time))).toBeLessThan(
        0.002,
      );
    }
    expect(
      Math.abs(1 - springProgress(settleSpring, curve.duration - 20)),
    ).toBeGreaterThanOrEqual(0.002);
  });
});

describe('springCurve’s ending', () => {
  // Stopping 0.2% short of rest and snapping the rest of the way leaves a
  // step at the very end: 1.4px on a 700px drawer that's by then moving
  // well under a pixel a frame.
  it('lands on rest without a step', () => {
    for (const spring of [settleSpring, aeSpring]) {
      const values = (
        /^linear\((.+)\)$/.exec(springCurve(spring).easing)?.[1] ?? ''
      )
        .split(', ')
        .map(Number);
      const steps = values
        .slice(1)
        .map((value, i) => Math.abs(value - (values[i] ?? 0)));
      const ending = steps.slice(-6);
      const before = steps.slice(-12, -6);

      // Nothing at the end moves faster than the curve already was...
      expect(Math.max(...ending)).toBeLessThanOrEqual(
        Math.max(...before) + 0.0001,
      );
      // ...and the last step is under half a pixel on that drawer.
      expect(ending.at(-1)).toBeLessThan(0.0007);
    }
  });
});

describe('landedProgress', () => {
  const { duration } = springCurve(settleSpring);

  it('follows the same curve CSS draws, landed on rest', () => {
    expect(landedProgress(settleSpring, 0)).toBe(0);
    expect(landedProgress(settleSpring, 100)).toBeCloseTo(
      springProgress(settleSpring, 100),
      3,
    );
    expect(landedProgress(settleSpring, duration)).toBe(1);
    expect(landedProgress(settleSpring, duration + 500)).toBe(1);
  });

  // A frame's timestamp is when the frame began, which can be a moment
  // before the click that started the motion.
  it('holds at the start for a time just before the start', () => {
    expect(landedProgress(settleSpring, -5)).toBe(0);
  });

  it('only ever moves forward with no bounce', () => {
    let last = 0;
    for (let time = 0; time <= duration; time += 1) {
      const progress = landedProgress(settleSpring, time);
      expect(progress).toBeGreaterThanOrEqual(last);
      last = progress;
    }
  });
});

describe('stepConstants', () => {
  // The Æ's dots were first tuned by hand: each 60th of a second, a dot's
  // speed gains 0.08 of its distance from home and keeps 0.85 of itself.
  it('turns the Æ spring back into the dots’ hand-tuned physics', () => {
    const { springStrength, damping } = stepConstants(aeSpring, 1000 / 60);

    expect(springStrength).toBeCloseTo(0.08, 3);
    expect(damping).toBeCloseTo(0.85, 2);
  });
});

describe('springStep', () => {
  // Script-driven motion steps the spring a frame at a time, carrying
  // its speed, so a thing already moving keeps going rather than
  // starting over from a standstill.
  it('moves a thing at rest along the same curve CSS draws', () => {
    for (const spring of [aeSpring, settleSpring]) {
      for (const time of [16, 100, 250, 500]) {
        const { offset } = springStep(spring, 100, 0, time);
        expect(offset).toBeCloseTo(100 * (1 - springProgress(spring, time)), 6);
      }
    }
  });

  it('leaves a thing at rest on its target where it is', () => {
    expect(springStep(settleSpring, 0, 0, 16)).toEqual({
      offset: 0,
      velocity: 0,
    });
  });

  it('carries a thing already moving onward', () => {
    const { offset, velocity } = springStep(settleSpring, 0, 1000, 16);

    // A 60th of a second at 1,000 px/s is about 16px, less what the
    // spring has pulled back already.
    expect(offset).toBeGreaterThan(10);
    expect(offset).toBeLessThan(16);
    expect(velocity).toBeLessThan(1000);
  });

  it('lands in the same place however the time is cut into frames', () => {
    const once = springStep(settleSpring, 68, -900, 48);
    let stepped = { offset: 68, velocity: -900 };
    for (let frame = 0; frame < 3; frame++) {
      stepped = springStep(settleSpring, stepped.offset, stepped.velocity, 16);
    }

    expect(stepped.offset).toBeCloseTo(once.offset, 6);
    expect(stepped.velocity).toBeCloseTo(once.velocity, 6);
  });

  it('comes to rest from a flick', () => {
    const { offset, velocity } = springStep(settleSpring, 40, 2000, 2000);

    expect(Math.abs(offset)).toBeLessThan(0.01);
    expect(Math.abs(velocity)).toBeLessThan(0.1);
  });
});

describe('the site’s springs', () => {
  it('share one duration, the Æ’s, and differ only in bounce', () => {
    expect(settleSpring.duration).toBe(aeSpring.duration);
    expect(settleSpring.bounce).toBe(0);
  });

  it('draw the Æ spring’s curve into global.css', () => {
    const tokens = readCssTokens(readFileSync('src/styles/global.css', 'utf8'));
    const curve = springCurve(aeSpring);

    expect(tokens.get('--ease-spring')?.base).toBe(curve.easing);
    expect(tokens.get('--transition-duration-spring')?.base).toBe(
      `${curve.duration}ms`,
    );
  });

  it('use the duration in global.css', () => {
    const tokens = readCssTokens(readFileSync('src/styles/global.css', 'utf8'));

    expect(tokens.get('--spring-duration')?.base).toBe(
      `${aeSpring.duration}ms`,
    );
  });
});
