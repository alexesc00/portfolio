/*
 * The Streamlit showcase has two looks: the MissionML brand, and stock
 * Streamlit with the brand taken off. The switch happens in the browser,
 * without rerunning the Python script:
 *
 * - CSS: the showcase tags every brand <style> block with data-brand-css,
 *   and the stock look disables them. Blocks tagged "component" stay on,
 *   because those components have no stock version to fall back to.
 * - Theme: Streamlit accepts a theme from the page hosting it, as a
 *   message. Streamlit only reapplies its own theme when that theme
 *   changes, so the host's choice survives reruns.
 */

export type Look = 'brand' | 'stock';

/** The look named in the page's `look` URL flag; the brand if none. */
export function parseLook(value: string | null): Look {
  return value === 'stock' ? 'stock' : 'brand';
}

/**
 * The Python file the page's `view` URL flag asks for: the one-screen
 * sampler the works table shows, or else the whole catalog. Only these
 * two, so the flag can't point the app at any other file.
 */
export function parseEntrypoint(view: string | null) {
  return view === 'sampler' ? 'sampler.py' : 'app.py';
}

/**
 * The parent page switches the look with `{ showcase: 'look', look }`.
 * Returns that look, or null for any other message.
 */
export function parseLookMessage(data: unknown): Look | null {
  if (typeof data !== 'object' || data === null) return null;
  const { showcase, look } = data as Record<string, unknown>;
  if (showcase !== 'look') return null;
  return look === 'brand' || look === 'stock' ? look : null;
}

/** The brand style blocks the stock look turns off. */
export const brandStyleSelector =
  'style[data-brand-css]:not([data-brand-css="component"])';

/** A theme as Streamlit's frontend accepts it. `base` is 0 light, 1 dark. */
export interface StreamlitTheme {
  base?: number;
  primaryColor?: string;
  backgroundColor?: string;
  secondaryBackgroundColor?: string;
  textColor?: string;
}

export const stockTheme: StreamlitTheme = { base: 0 };

const colorKeys = [
  'primaryColor',
  'backgroundColor',
  'secondaryBackgroundColor',
  'textColor',
] as const;

/**
 * The brand theme from the showcase's `.streamlit/config.toml`: the
 * top-level [theme] table only. stlite doesn't read that file, so the
 * theme is sent to Streamlit by hand. `font` is left out: "sans-serif" is
 * already Streamlit's default.
 */
export function parseStreamlitTheme(toml: string): StreamlitTheme {
  const theme: StreamlitTheme = {};
  let isThemeTable = false;
  for (const line of toml.split('\n')) {
    const table = line.match(/^\s*\[([^\]]+)\]/);
    if (table) {
      isThemeTable = table[1].trim() === 'theme';
      continue;
    }
    if (!isThemeTable) continue;
    const entry = line.match(/^\s*(\w+)\s*=\s*"([^"]*)"/);
    if (!entry) continue;
    const [, key, value] = entry;
    if (key === 'base') theme.base = value === 'dark' ? 1 : 0;
    const colorKey = colorKeys.find((colorKey) => colorKey === key);
    if (colorKey) theme[colorKey] = value;
  }
  return theme;
}

/** The message that sets Streamlit's theme from the hosting page. */
export function themeMessage(theme: StreamlitTheme) {
  return {
    stCommVersion: 1,
    type: 'SET_CUSTOM_THEME_CONFIG',
    themeName: 'Custom Theme',
    themeInfo: theme,
  };
}
