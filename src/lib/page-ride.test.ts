import { describe, expect, it } from 'vitest';
import { rideDuration, ridePosition, rideStart } from './page-ride';
import { settleSpring, springCurve } from './spring';

const screen = 900;

describe('rideStart', () => {
  it('rides the whole way when the section is a screen away or less', () => {
    expect(rideStart(1000, 1600, screen)).toBe(1000);
    expect(rideStart(1600, 1000, screen)).toBe(1600);
    expect(rideStart(1000, 1900, screen)).toBe(1000);
  });

  it('jumps to one screen above a section far down the page', () => {
    expect(rideStart(1000, 5000, screen)).toBe(4100);
  });

  it('jumps to one screen below a section far up the page', () => {
    expect(rideStart(5000, 0, screen)).toBe(900);
  });
});

describe('ridePosition', () => {
  it('runs as long as the settle curve', () => {
    expect(rideDuration).toBe(springCurve(settleSpring).duration);
  });

  it('starts where the ride starts and lands on the section', () => {
    expect(ridePosition(4100, 5000, 0)).toBe(4100);
    expect(ridePosition(4100, 5000, rideDuration)).toBe(5000);
  });

  it('never rides past the section', () => {
    for (let time = 0; time <= rideDuration; time += 5) {
      expect(ridePosition(900, 0, time)).toBeGreaterThanOrEqual(0);
      expect(ridePosition(4100, 5000, time)).toBeLessThanOrEqual(5000);
    }
  });
});
