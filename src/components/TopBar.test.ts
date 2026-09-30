import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import TopBar from './TopBar.astro';

let html = '';

beforeAll(async () => {
  const container = await AstroContainer.create();
  html = await container.renderToString(TopBar);
});

/** The class list of the bar itself. */
function barClasses() {
  return /<div[^>]* class="([^"]*)"[^>]* data-top-bar/.exec(html)?.[1] ?? '';
}

describe('the top bar', () => {
  it('stays at the top of the screen, over everything that passes under it', () => {
    expect(barClasses()).toMatch(/\bfixed\b/);
    expect(barClasses()).toMatch(/\btop-0\b/);
    expect(barClasses()).toMatch(/\bz-\d+\b/);
    expect(barClasses()).toMatch(/\bbg-background\b/);
  });

  it('keeps its contents in a frame that stops growing at 1440', () => {
    expect(html).toMatch(/class="[^"]*max-w-\(--breakpoint-2xl\)[^"]*px-page/);
  });

  // Moving by transform never makes the browser lay the page out again.
  it('slides out of view by transform only', () => {
    expect(barClasses()).toMatch(/\bdata-hidden:-translate-y-full\b/);
    expect(barClasses()).toMatch(/\bmotion-safe:transition-transform\b/);
    expect(barClasses()).not.toMatch(/\btransition-all\b/);
  });

  // The Æ's bounce would swing the bar a third of its height past its
  // place, so it settles both ways.
  it('arrives and leaves settling, without a bounce', () => {
    expect(barClasses()).toMatch(/(^| )duration-settle\b/);
    expect(barClasses()).toMatch(/(^| )ease-settle\b/);
    expect(barClasses()).not.toMatch(/-spring\b/);
  });

  it('holds the name, then Work and Contact', () => {
    const nav = /<nav[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] ?? '';

    expect(html.indexOf('<h1')).toBeLessThan(html.indexOf('<nav'));
    expect(html).toMatch(/<h1[^>]*>\s*Alex Escudero\s*<\/h1>/);
    expect(nav).toMatch(/<a[^>]* href="#work"[^>]*>\s*Work\s*<\/a>/);
    expect(nav).toMatch(
      /<a[^>]* href="mailto:hello@alexescudero\.design"[^>]*>\s*Contact\s*<\/a>/,
    );
  });
});
