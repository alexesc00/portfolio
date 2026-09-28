import { runInNewContext } from 'node:vm';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import Layout from './Layout.astro';

/*
 * The script in the page's head picks the theme before anything is drawn.
 * It's inline, so it can't import anything to test in isolation; instead
 * the layout is rendered and the script it ships is run against a stand-in
 * browser.
 */
let themeScript = '';

beforeAll(async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Layout, {
    props: { title: 'Test' },
  });
  const script = html.match(/<script>(.*?)<\/script>/s)?.[1];
  if (!script) throw new Error('The layout has no inline head script');
  themeScript = script;
});

/** Runs the head script and returns the theme it set on the page. */
function pickTheme({
  saved,
  systemPrefersLight,
  isStorageBlocked = false,
}: {
  saved: string | null;
  systemPrefersLight: boolean;
  isStorageBlocked?: boolean;
}) {
  const dataset: Record<string, string> = {};
  const browser = {
    document: { documentElement: { dataset } },
    matchMedia: (query: string) => ({
      matches: query === '(prefers-color-scheme: light)' && systemPrefersLight,
    }),
  };
  // Some browsers throw as soon as a blocked localStorage is touched.
  Object.defineProperty(browser, 'localStorage', {
    get() {
      if (isStorageBlocked) throw new Error('SecurityError');
      return { getItem: (key: string) => (key === 'theme' ? saved : null) };
    },
  });
  runInNewContext(themeScript, browser);
  return dataset.theme;
}

describe('the theme picked before first paint', () => {
  it('uses the theme the visitor chose last time', () => {
    expect(pickTheme({ saved: 'light', systemPrefersLight: false })).toBe(
      'light',
    );
    expect(pickTheme({ saved: 'dark', systemPrefersLight: true })).toBe('dark');
  });

  it('follows the system setting when nothing is saved', () => {
    expect(pickTheme({ saved: null, systemPrefersLight: true })).toBe('light');
    expect(pickTheme({ saved: null, systemPrefersLight: false })).toBe('dark');
  });

  it('ignores a saved value that is not a theme', () => {
    expect(pickTheme({ saved: 'purple', systemPrefersLight: true })).toBe(
      'light',
    );
  });

  it('follows the system setting when storage is blocked', () => {
    expect(
      pickTheme({
        saved: 'dark',
        systemPrefersLight: true,
        isStorageBlocked: true,
      }),
    ).toBe('light');
  });
});
