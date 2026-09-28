import { existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import { themeColors } from '../lib/theme';
import Layout from './Layout.astro';

/*
 * The script in the page's head picks the theme before anything is drawn.
 * It's inline, so it can't import anything to test in isolation; instead
 * the layout is rendered and the script it ships is run against a stand-in
 * browser.
 */
let html = '';
let themeScript = '';

beforeAll(async () => {
  const container = await AstroContainer.create();
  html = await container.renderToString(Layout, {
    props: { title: 'Test', description: 'A page for testing.' },
  });
  const script = html.match(/<script>(.*?)<\/script>/s)?.[1];
  if (!script) throw new Error('The layout has no inline head script');
  themeScript = script;
});

/** The attributes of every `tagName` tag in the page. */
function tags(tagName: string): Record<string, string>[] {
  const pattern = new RegExp(`<${tagName}\\b([^>]*)>`, 'g');
  return [...html.matchAll(pattern)].map(([, attributes]) =>
    Object.fromEntries(
      [...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, name, value]) => [
        name,
        value,
      ]),
    ),
  );
}

/*
 * The site is served from a base path on GitHub Pages. The test renderer
 * doesn't apply it, so links are checked against whichever base is in use;
 * the build puts /portfolio in front.
 */
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

describe('the page head', () => {
  it('describes the page for search results and link previews', () => {
    expect(tags('meta')).toContainEqual({
      name: 'description',
      content: 'A page for testing.',
    });
  });

  it('gives browser tabs the icon as SVG, with a PNG for browsers without SVG icons', () => {
    const links = tags('link');

    expect(links).toContainEqual({
      rel: 'icon',
      href: `${base}/favicon.svg`,
      type: 'image/svg+xml',
    });
    expect(links).toContainEqual({
      rel: 'icon',
      href: `${base}/favicon-32.png`,
      sizes: '32x32',
    });
  });

  it('gives phones the icon for their home screen', () => {
    expect(tags('link')).toContainEqual({
      rel: 'apple-touch-icon',
      href: `${base}/apple-touch-icon.png`,
    });
  });

  it('links only icons that are in public/', () => {
    const icons = tags('link').filter((link) => link.rel.includes('icon'));

    expect(icons.length).toBeGreaterThan(0);
    for (const { href } of icons) {
      const file = new URL(
        `../../public${href.slice(base.length)}`,
        import.meta.url,
      );
      expect(existsSync(file), href).toBe(true);
    }
  });

  it('colors the browser bar to match each theme, even without scripts', () => {
    const barColors = tags('meta').filter(
      (meta) => meta.name === 'theme-color',
    );

    expect(barColors).toContainEqual({
      name: 'theme-color',
      content: themeColors.dark,
      media: '(prefers-color-scheme: dark)',
    });
    expect(barColors).toContainEqual({
      name: 'theme-color',
      content: themeColors.light,
      media: '(prefers-color-scheme: light)',
    });
  });
});

/**
 * Runs the head script and returns the theme it set on the page, and the
 * colors it left on the browser bar's two tags.
 */
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
  const barColors = [
    { content: themeColors.dark },
    { content: themeColors.light },
  ];
  const browser = {
    document: {
      documentElement: { dataset },
      querySelectorAll: (selector: string) =>
        selector === 'meta[name="theme-color"]' ? barColors : [],
    },
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
  return {
    theme: dataset.theme,
    barColors: barColors.map((meta) => meta.content),
  };
}

describe('the theme picked before first paint', () => {
  it('uses the theme the visitor chose last time', () => {
    expect(pickTheme({ saved: 'light', systemPrefersLight: false }).theme).toBe(
      'light',
    );
    expect(pickTheme({ saved: 'dark', systemPrefersLight: true }).theme).toBe(
      'dark',
    );
  });

  it('follows the system setting when nothing is saved', () => {
    expect(pickTheme({ saved: null, systemPrefersLight: true }).theme).toBe(
      'light',
    );
    expect(pickTheme({ saved: null, systemPrefersLight: false }).theme).toBe(
      'dark',
    );
  });

  it('ignores a saved value that is not a theme', () => {
    expect(pickTheme({ saved: 'purple', systemPrefersLight: true }).theme).toBe(
      'light',
    );
  });

  it('follows the system setting when storage is blocked', () => {
    expect(
      pickTheme({
        saved: 'dark',
        systemPrefersLight: true,
        isStorageBlocked: true,
      }).theme,
    ).toBe('light');
  });

  it('colors the browser bar for a theme chosen against the system', () => {
    // Both tags, since the browser picks one by the system setting.
    const { barColors } = pickTheme({
      saved: 'dark',
      systemPrefersLight: true,
    });

    expect(barColors).toEqual([themeColors.dark, themeColors.dark]);
  });
});
