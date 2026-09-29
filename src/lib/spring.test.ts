import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readCssTokens } from './design-tokens';
import {
  aeSpring,
  settleSpring,
  springCurve,
  springProgress,
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

describe('stepConstants', () => {
  // The Æ's dots were first tuned by hand: each 60th of a second, a dot's
  // speed gains 0.08 of its distance from home and keeps 0.85 of itself.
  it('turns the Æ spring back into the dots’ hand-tuned physics', () => {
    const { springStrength, damping } = stepConstants(aeSpring, 1000 / 60);

    expect(springStrength).toBeCloseTo(0.08, 3);
    expect(damping).toBeCloseTo(0.85, 2);
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
