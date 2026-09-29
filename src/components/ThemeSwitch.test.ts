import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import MoonIcon from './MoonIcon.astro';
import SunIcon from './SunIcon.astro';
import ThemeSwitch from './ThemeSwitch.astro';

/*
 * The switch holds a label for each theme, and CSS shows the one for the
 * theme in use: the dark label first, then the light one, which is hidden
 * until light mode.
 */
let darkLabel = '';
let lightLabel = '';
let moon = '';
let sun = '';

beforeAll(async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(ThemeSwitch);
  const lightStart = html.indexOf('<span class="hidden light:inline"');
  darkLabel = html.slice(
    html.indexOf('<span class="light:hidden"'),
    lightStart,
  );
  lightLabel = html.slice(lightStart, html.indexOf('</button>'));
  moon = await container.renderToString(MoonIcon);
  sun = await container.renderToString(SunIcon);
});

/** An icon's drawing, without its opening tag, which the switch sizes. */
function drawing(svg: string) {
  return svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'));
}

/** What a screen reader says for a label: its text, without hidden parts. */
function spoken(label: string) {
  return label
    .replace(/<svg[^>]*aria-hidden="true"[\s\S]*?<\/svg>/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('the theme switch', () => {
  it('shows a moon before "dark"', () => {
    const iconAt = darkLabel.indexOf(drawing(moon));

    expect(iconAt).toBeGreaterThan(-1);
    expect(iconAt).toBeLessThan(darkLabel.indexOf('dark<'));
  });

  it('shows a sun before "light"', () => {
    const iconAt = lightLabel.indexOf(drawing(sun));

    expect(iconAt).toBeGreaterThan(-1);
    expect(iconAt).toBeLessThan(lightLabel.indexOf('light<'));
  });

  it('keeps the icons out of what screen readers say', () => {
    expect(moon).toContain('aria-hidden="true"');
    expect(sun).toContain('aria-hidden="true"');
  });

  it('is named by the visible word first, for voice control', () => {
    expect(spoken(darkLabel)).toBe('dark, switch to light mode');
    expect(spoken(lightLabel)).toBe('light, switch to dark mode');
  });

  // The circle grows on the site's calm spring: the Æ's spring without
  // its bounce, so it settles instead of overshooting the screen's edge.
  it('reveals the new theme on the calm spring', () => {
    const source = readFileSync('src/components/ThemeSwitch.astro', 'utf8');

    expect(source).toMatch(
      /animation:\s*theme-reveal\s+var\(--transition-duration-settle\)\s+var\(--ease-settle\)/,
    );
  });
});
