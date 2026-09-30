import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import Hero from './Hero.astro';

let html = '';

beforeAll(async () => {
  const container = await AstroContainer.create();
  html = await container.renderToString(Hero);
});

/** The page frame's opening tag and everything inside it. */
function pageFrame() {
  const start = html.search(/<header[^>]* data-page-frame/);
  return start === -1 ? '' : html.slice(start);
}

/** The links in the order a keyboard reaches them, by their text. */
function linkTexts() {
  return [...html.matchAll(/<a [^>]*>([\s\S]*?)<\/a>/g)].map(([, inner]) =>
    inner
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

describe('the hero', () => {
  // So on screens wider than 1440 the hero's corners stay on the same
  // edges as everything under them.
  it('keeps its corners in a frame that stops growing at 1440', () => {
    const frame = pageFrame();

    expect(frame).toMatch(
      /^<header[^>]* class="[^"]*max-w-\(--breakpoint-2xl\)/,
    );
    expect(frame).toContain('Alex Escudero');
    expect(frame).toContain('data-theme-switch');
  });

  it('lets the dotted Æ use the whole screen, outside the frame', () => {
    const markStart = html.indexOf('text-mark');

    expect(markStart).toBeGreaterThan(-1);
    expect(markStart).toBeLessThan(html.search(/<header[^>]* data-page-frame/));
  });

  // The works section below is the page's main content, so the hero is
  // the page's header rather than a main of its own.
  it('is the page’s header, with no main inside it', () => {
    expect(html.match(/<header/g)).toHaveLength(1);
    expect(html).not.toContain('<main');
  });

  it('puts Work and Contact in a nav beside the name', () => {
    const nav = /<nav[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] ?? '';

    expect(html.indexOf('<nav')).toBeGreaterThan(html.indexOf('Alex Escudero'));
    expect(nav).toMatch(/<a[^>]* href="#work"[^>]*>\s*Work\s*<\/a>/);
    expect(nav).toMatch(
      /<a[^>]* href="mailto:hello@alexescudero\.design"[^>]*>\s*Contact\s*<\/a>/,
    );
  });

  // The page says what Alex does without a label, and Work is in the bar.
  it('drops the tagline and the link down to the work', () => {
    expect(html).not.toContain('Product designer');
    expect(html).not.toContain('↓');
  });

  it('is reached by keyboard from the top bar to the theme switch', () => {
    expect(linkTexts()).toEqual(['Work', 'Contact', 'Figma ↗', 'GitHub ↗']);
    expect(html.indexOf('data-theme-switch')).toBeGreaterThan(
      html.lastIndexOf('</a>'),
    );
  });
});
