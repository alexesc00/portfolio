import { describe, expect, it } from 'vitest';
import {
  oppositeTheme,
  parseTheme,
  readSavedTheme,
  revealRadius,
  saveTheme,
  systemTheme,
  themeStorageKey,
} from './theme';

/** A working stand-in for localStorage. */
function memoryStorage(entries: Record<string, string> = {}) {
  const items = new Map(Object.entries(entries));
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
}

/** Some browsers throw as soon as a blocked localStorage is touched. */
function blockedStorage(): never {
  throw new Error('SecurityError');
}

describe('parseTheme', () => {
  it('accepts the two themes', () => {
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('light')).toBe('light');
  });

  it('rejects anything else', () => {
    expect(parseTheme('purple')).toBeNull();
    expect(parseTheme('')).toBeNull();
    expect(parseTheme(null)).toBeNull();
    expect(parseTheme(undefined)).toBeNull();
  });
});

describe('oppositeTheme', () => {
  it('switches dark to light and back', () => {
    expect(oppositeTheme('dark')).toBe('light');
    expect(oppositeTheme('light')).toBe('dark');
  });
});

describe('systemTheme', () => {
  it('follows whether the system prefers light', () => {
    expect(systemTheme(true)).toBe('light');
    expect(systemTheme(false)).toBe('dark');
  });
});

describe('readSavedTheme', () => {
  it('returns the theme the visitor chose', () => {
    const storage = memoryStorage({ [themeStorageKey]: 'light' });

    expect(readSavedTheme(() => storage)).toBe('light');
  });

  it('returns nothing when no choice is saved', () => {
    expect(readSavedTheme(() => memoryStorage())).toBeNull();
  });

  it('ignores a saved value that is not a theme', () => {
    const storage = memoryStorage({ [themeStorageKey]: 'purple' });

    expect(readSavedTheme(() => storage)).toBeNull();
  });

  it('returns nothing when storage is blocked', () => {
    expect(readSavedTheme(blockedStorage)).toBeNull();
  });
});

describe('saveTheme', () => {
  it('remembers the choice for the next visit', () => {
    const storage = memoryStorage();

    saveTheme(() => storage, 'light');

    expect(storage.getItem(themeStorageKey)).toBe('light');
  });

  it('carries on without remembering when storage is blocked', () => {
    expect(() => saveTheme(blockedStorage, 'light')).not.toThrow();
  });
});

describe('revealRadius', () => {
  const viewport = { width: 800, height: 600 };

  it('reaches the corners from the middle of the screen', () => {
    expect(revealRadius({ x: 400, y: 300 }, viewport)).toBe(500);
  });

  it('reaches the opposite corner from a corner', () => {
    expect(revealRadius({ x: 0, y: 0 }, viewport)).toBe(1000);
  });

  it('reaches the furthest corner from near the top right', () => {
    expect(revealRadius({ x: 780, y: 20 }, viewport)).toBeCloseTo(
      Math.hypot(780, 580),
    );
  });
});
