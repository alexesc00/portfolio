import { describe, expect, it } from 'vitest';
import { mixColors, rampColor } from './color-mixing';

describe('mixColors', () => {
  it('returns the first color at 0 and the second at 1', () => {
    expect(mixColors('#e15614', '#0f7166', 0)).toBe('#e15614');
    expect(mixColors('#e15614', '#0f7166', 1)).toBe('#0f7166');
  });

  it('mixes in OKLab, so black and white meet at an even mid grey', () => {
    // A plain average of the sRGB values would give #808080, which looks
    // lighter than halfway.
    expect(mixColors('#000000', '#ffffff', 0.5)).toBe('#636363');
  });

  it('reads colors written in capitals or with space around them', () => {
    expect(mixColors(' #E15614 ', '#0F7166', 0)).toBe('#e15614');
  });

  it('refuses a color it can’t read, rather than mixing it as black', () => {
    // A missing token reads as an empty string.
    expect(() => mixColors('', '#0f7166', 0.5)).toThrow();
    expect(() => mixColors('#e15614', 'red', 0.5)).toThrow();
  });
});

describe('rampColor', () => {
  const ramp = [
    { at: 0, color: '#000000' },
    { at: 0.8, color: '#ffffff' },
    { at: 1, color: '#e15614' },
  ];

  it('is the stop color on a stop', () => {
    expect(rampColor(ramp, 0)).toBe('#000000');
    expect(rampColor(ramp, 0.8)).toBe('#ffffff');
    expect(rampColor(ramp, 1)).toBe('#e15614');
  });

  it('mixes the two stops either side, by how far between them it is', () => {
    expect(rampColor(ramp, 0.4)).toBe('#636363');
    expect(rampColor(ramp, 0.9)).toBe(mixColors('#ffffff', '#e15614', 0.5));
  });

  it('holds the end colors past either end', () => {
    expect(rampColor(ramp, -0.5)).toBe('#000000');
    expect(rampColor(ramp, 1.5)).toBe('#e15614');
  });
});
