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
  const start = html.search(/<div[^>]* data-page-frame/);
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
  // The closing plate's ↑ Top link brings the visitor and their focus
  // back here.
  it('is the top of the page, where focus can return', () => {
    expect(html).toMatch(/^<header[^>]* id="top"/);
    expect(html).toMatch(/^<header[^>]* tabindex="-1"/);
  });

  // So on screens wider than 1440 the hero's corners stay on the same
  // edges as everything under them.
  it('keeps its corners in a frame that stops growing at 1440', () => {
    const frame = pageFrame();

    expect(frame).toMatch(/^<div[^>]* class="[^"]*max-w-\(--breakpoint-2xl\)/);
    expect(frame).toContain('Designed in');
    expect(frame).toContain('data-theme-switch');
  });

  it('lets the dotted Æ use the whole screen, outside the frame', () => {
    const markStart = html.indexOf('text-mark');

    expect(markStart).toBeGreaterThan(-1);
    expect(markStart).toBeLessThan(html.search(/<div[^>]* data-page-frame/));
  });

  // The works section below is the page's main content, so the hero is
  // the page's header rather than a main of its own.
  it('is the page’s header, with no main inside it', () => {
    expect(html.match(/<header/g)).toHaveLength(1);
    expect(html).not.toContain('<main');
  });

  it('opens with the top bar', () => {
    expect(html.indexOf('data-top-bar')).toBeGreaterThan(-1);
    expect(html.indexOf('data-top-bar')).toBeLessThan(
      html.indexOf('text-mark'),
    );
  });

  // The hero is its own layer, so the Æ can sit behind its text. A fixed
  // bar inside that layer could never rise above the sections after it.
  it('keeps the top bar outside the hero’s layer', () => {
    expect(html.search(/class="[^"]*\bisolate\b/)).toBeGreaterThan(
      html.indexOf('data-top-bar'),
    );
    expect(html.indexOf('</nav>')).toBeLessThan(
      html.search(/class="[^"]*\bisolate\b/),
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
