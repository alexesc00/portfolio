import { describe, expect, it } from 'vitest';
import { coverOffset, opennessAt, planDrawer, revealClip } from './row-drawer';

describe('planDrawer', () => {
  it('opens a closed row all the way from shut', () => {
    expect(planDrawer({ isOpening: true, openness: null })).toEqual({
      from: 0,
      to: 1,
    });
  });

  it('closes an open row all the way from open', () => {
    expect(planDrawer({ isOpening: false, openness: null })).toEqual({
      from: 1,
      to: 0,
    });
  });

  // A second click mid-way turns the drawer round where it is, so nothing
  // jumps back to either end first.
  it('turns round from wherever a drawer still moving has got to', () => {
    expect(planDrawer({ isOpening: false, openness: 0.4 })).toEqual({
      from: 0.4,
      to: 0,
    });
    expect(planDrawer({ isOpening: true, openness: 0.4 })).toEqual({
      from: 0.4,
      to: 1,
    });
  });
});

describe('opennessAt', () => {
  it('follows the drawer from where it started to where it’s going', () => {
    const closing = { from: 0.8, to: 0 };

    expect(opennessAt(closing, 0)).toBe(0.8);
    expect(opennessAt(closing, 0.5)).toBeCloseTo(0.4);
    expect(opennessAt(closing, 1)).toBe(0);
  });
});

describe('coverOffset', () => {
  // The rows under a shut drawer sit a write-up's height up, over it;
  // under an open one they're where the page puts them.
  it('moves the rows under a drawer up by the part of it that’s shut', () => {
    expect(coverOffset(0, 500)).toBe(-500);
    expect(coverOffset(0.25, 500)).toBe(-375);
    expect(coverOffset(1, 500)).toBe(0);
  });
});

describe('revealClip', () => {
  // The rows under a drawer can be shorter than its write-up, so the
  // write-up shows only down to their top edge, never past them.
  it('clips the write-up to the part the rows have uncovered', () => {
    expect(revealClip(0, 500)).toBe('inset(0 0 500px)');
    expect(revealClip(0.25, 500)).toBe('inset(0 0 375px)');
    expect(revealClip(1, 500)).toBe('inset(0 0 0px)');
  });
});
