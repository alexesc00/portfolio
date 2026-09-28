export type Theme = 'dark' | 'light';

/**
 * The browser bar color for each theme: the background, so the bar and
 * the page read as one. Written out because the head script needs them
 * before the stylesheet loads; a test keeps them matching the tokens.
 */
export const themeColors: Record<Theme, string> = {
  dark: '#10100f',
  light: '#f7f7f3',
};

/** The localStorage key that remembers a visitor's chosen theme. */
export const themeStorageKey = 'theme';

/** The theme `value` names, or null if it isn't one. */
export function parseTheme(value: string | null | undefined): Theme | null {
  return value === 'dark' || value === 'light' ? value : null;
}

export function oppositeTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark';
}

export function systemTheme(prefersLight: boolean): Theme {
  return prefersLight ? 'light' : 'dark';
}

/*
 * Storage is passed in as a function because some browsers throw as soon
 * as a blocked localStorage is touched, so even reaching it has to happen
 * inside the try.
 */

/** The theme the visitor chose last time, if storage has one. */
export function readSavedTheme(
  getStorage: () => Pick<Storage, 'getItem'>,
): Theme | null {
  try {
    return parseTheme(getStorage().getItem(themeStorageKey));
  } catch {
    return null;
  }
}

/** Remembers the visitor's choice for their next visit, where allowed. */
export function saveTheme(
  getStorage: () => Pick<Storage, 'setItem'>,
  theme: Theme,
) {
  try {
    getStorage().setItem(themeStorageKey, theme);
  } catch {
    // Some browsers block storage in private windows. The switch still
    // works; the choice just isn't remembered on the next visit.
  }
}

/**
 * Just far enough to reach the furthest corner of `viewport` from `center`,
 * so the reveal takes the same time to fill the screen wherever it starts.
 */
export function revealRadius(
  center: { x: number; y: number },
  viewport: { width: number; height: number },
): number {
  return Math.hypot(
    Math.max(center.x, viewport.width - center.x),
    Math.max(center.y, viewport.height - center.y),
  );
}
