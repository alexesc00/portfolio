import { describe, expect, it } from 'vitest';
import {
  clampSeam,
  fitApp,
  narrowestAppWidth,
  seamAfterKey,
} from './showcase-compare';

describe('fitApp', () => {
  it('draws the app at the screen’s own size when there’s room', () => {
    expect(fitApp(872, 552)).toEqual({ width: 872, height: 552, scale: 1 });
    expect(fitApp(narrowestAppWidth, 478)).toEqual({
      width: narrowestAppWidth,
      height: 478,
      scale: 1,
    });
  });

  it('draws a narrower screen at the narrowest layout, scaled to fit', () => {
    // 1024 wide: Figma's 597 × 360 screen, at 0.78
    const fit = fitApp(597, 360);
    expect(fit.width).toBe(narrowestAppWidth);
    expect(fit.scale).toBeCloseTo(0.78, 2);
    expect(fit.height * fit.scale).toBeCloseTo(360);
  });

  it('draws nothing for a screen with no size yet', () => {
    expect(fitApp(0, 0)).toEqual({ width: 0, height: 0, scale: 1 });
  });
});

describe('clampSeam', () => {
  it('keeps the seam inside the screen', () => {
    expect(clampSeam(-5)).toBe(0);
    expect(clampSeam(40)).toBe(40);
    expect(clampSeam(120)).toBe(100);
  });
});

describe('seamAfterKey', () => {
  it('moves the seam with the arrow keys, further with Shift', () => {
    expect(seamAfterKey(50, 'ArrowLeft', false)).toBe(48);
    expect(seamAfterKey(50, 'ArrowRight', false)).toBe(52);
    expect(seamAfterKey(50, 'ArrowLeft', true)).toBe(40);
    expect(seamAfterKey(50, 'ArrowRight', true)).toBe(60);
  });

  it('jumps to the ends with Home and End', () => {
    expect(seamAfterKey(50, 'Home', false)).toBe(0);
    expect(seamAfterKey(50, 'End', false)).toBe(100);
  });

  it('stops at the ends', () => {
    expect(seamAfterKey(1, 'ArrowLeft', false)).toBe(0);
    expect(seamAfterKey(95, 'ArrowRight', true)).toBe(100);
  });

  it('ignores other keys', () => {
    expect(seamAfterKey(50, 'Enter', false)).toBeNull();
    expect(seamAfterKey(50, 'ArrowUp', false)).toBeNull();
  });
});
