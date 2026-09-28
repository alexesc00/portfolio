import { describe, expect, it } from 'vitest';
import { mixColors, rampColor, wheelColor } from './color-mixing';

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

describe('wheelColor', () => {
  const wheel = ['#e15614', '#d8c42c', '#6b9041', '#0f7166'];

  it('spaces the colors evenly round one turn', () => {
    expect(wheelColor(wheel, 0)).toBe('#e15614');
    expect(wheelColor(wheel, 0.25)).toBe('#d8c42c');
    expect(wheelColor(wheel, 0.5)).toBe('#6b9041');
  });

  it('mixes the two neighbours between them', () => {
    const between = wheelColor(wheel, 0.125);

    expect(between).toMatch(/^#[0-9a-f]{6}$/);
    expect(between).toBe(mixColors('#e15614', '#d8c42c', 0.5));
    expect(between).not.toBe('#e15614');
    expect(between).not.toBe('#d8c42c');
  });

  it('wraps from the last color back to the first', () => {
    expect(wheelColor(wheel, 0.875)).toBe(mixColors('#0f7166', '#e15614', 0.5));
    expect(wheelColor(wheel, 1)).toBe('#e15614');
    expect(wheelColor(wheel, -0.25)).toBe('#0f7166');
  });
});
