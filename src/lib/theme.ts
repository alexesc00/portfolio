export type Theme = 'dark' | 'light';

/** The localStorage key that remembers a visitor's chosen theme. */
export const themeStorageKey = 'theme';

export const parseTheme: (
  value: string | null | undefined,
) => Theme | null = () => null;

export const oppositeTheme: (theme: Theme) => Theme = () => 'dark';

export const systemTheme: (prefersLight: boolean) => Theme = () => 'dark';

export const readSavedTheme: (
  getStorage: () => Pick<Storage, 'getItem'>,
) => Theme | null = () => null;

export const saveTheme: (
  getStorage: () => Pick<Storage, 'setItem'>,
  theme: Theme,
) => void = () => undefined;

export const revealRadius: (
  center: { x: number; y: number },
  viewport: { width: number; height: number },
) => number = () => 0;
