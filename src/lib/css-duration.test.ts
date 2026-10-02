import { describe, expect, it } from 'vitest';
import { millisecondsOf } from './css-duration';

describe('millisecondsOf', () => {
  it('reads a duration written in milliseconds', () => {
    expect(millisecondsOf('533ms')).toBe(533);
  });

  // The production build rewrites durations in seconds when that's
  // shorter, so the same token can arrive either way.
  it('reads a duration written in seconds', () => {
    expect(millisecondsOf('.533s')).toBe(533);
    expect(millisecondsOf('1.267s')).toBe(1267);
  });

  it('ignores space around the value', () => {
    expect(millisecondsOf(' 0.9s ')).toBe(900);
  });
});
