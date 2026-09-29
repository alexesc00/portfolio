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

describe('the hero', () => {
  // So on screens wider than 1440 the hero's corners stay on the same
  // edges as everything under them.
  it('keeps its corners in a frame that stops growing at 1440', () => {
    const frame = pageFrame();

    expect(frame).toMatch(
      /^<header[^>]* class="[^"]*max-w-\(--breakpoint-2xl\)/,
    );
    expect(frame).toContain('Alex Escudero');
    expect(frame).toContain('Design engineer');
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

  it('links down to the work, the arrow kept from screen readers', () => {
    expect(html).toMatch(
      /<a[^>]* href="#work"[^>]*>\s*<span aria-hidden="true">↓<\/span>\s*Work\s*<\/a>/,
    );
  });

  it('puts the link in the corner across from the tagline', () => {
    expect(html.indexOf('href="#work"')).toBeGreaterThan(
      html.indexOf('Design engineer'),
    );
  });
});
