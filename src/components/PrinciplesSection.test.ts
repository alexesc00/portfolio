import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import PrinciplesSection from './PrinciplesSection.astro';

let html = '';

beforeAll(async () => {
  const container = await AstroContainer.create();
  html = await container.renderToString(PrinciplesSection);
});

const labels = ['Purpose first', 'Past good enough', 'Needs no explaining'];

const claims = [
  'Every part earns its place.',
  'Most work stops at good enough.',
  'It makes sense the first time.',
];

const bodies = [
  'A product, a screen or a single chip has a job to do. Anything without one stays out, however new or fashionable it is.',
  'The gap between good and great sits in the parts nobody will point at. Those parts decide whether the whole thing feels right.',
  'A product has to make sense the moment it opens. Anything that needs explaining is a design problem that is still open.',
];

/** The text of every element with the attribute, in page order. */
const allWith = (attribute: string) =>
  [
    ...html.matchAll(
      new RegExp(`<(\\w+)[^>]* ${attribute}(?=[\\s>=])[^>]*>`, 'g'),
    ),
  ].map((match) => html.slice(match.index));

describe('the principles section', () => {
  it('is a section named by its heading, at least one screen tall', () => {
    const section = /^<section[^>]*>/.exec(html)?.[0] ?? '';
    const labelledBy = /aria-labelledby="([^"]+)"/.exec(section)?.[1];
    expect(labelledBy).toBeTruthy();
    expect(html).toMatch(
      new RegExp(`<h2[^>]* id="${labelledBy}"[^>]*>\\s*Principles\\s*</h2>`),
    );
    expect(section).toMatch(/\bmin-h-plate\b/);
  });

  it('sits in the 1440 page frame', () => {
    const section = /^<section[^>]*>/.exec(html)?.[0] ?? '';
    expect(section).toMatch(/\bmax-w-\(--breakpoint-2xl\)/);
    expect(section).toMatch(/\bpx-page\b/);
  });

  it('puts its name top left on phones and top right from 1024 up', () => {
    const headRow = /<div[^>]*>\s*<h2/.exec(html)?.[0] ?? '';
    expect(headRow).toMatch(/\bjustify-between\b/);
    expect(headRow).toMatch(/\blg:flex-row-reverse\b/);
  });

  it('names each principle with a heading under Principles, in order', () => {
    const headings = [...html.matchAll(/<h3[^>]*>([^<]*)<\/h3>/g)].map(
      (match) => match[1].trim(),
    );
    expect(headings).toEqual(labels);
  });

  it('keeps all three principles in the page, in order', () => {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    let from = 0;
    for (const [i, claim] of claims.entries()) {
      const at = text.indexOf(claim, from);
      expect(at, claim).toBeGreaterThan(-1);
      expect(text.indexOf(bodies[i], at), bodies[i]).toBeGreaterThan(at);
      from = at;
    }
  });

  it('sets the claim as a statement and the body in reading text at 60%', () => {
    for (const claim of claims) {
      expect(html).toMatch(
        new RegExp(
          `<p[^>]* class="[^"]*\\btext-statement\\b[^"]*"[^>]*>${claim}</p>`,
        ),
      );
    }
    for (const body of bodies) {
      const tag = new RegExp(`<p[^>]* class="([^"]*)"[^>]*>${body}</p>`).exec(
        html,
      )?.[1];
      expect(tag).toMatch(/\btext-reading\b/);
      expect(tag).toMatch(/\btext-text-muted\b/);
    }
  });

  it('starts each principle at the works table’s Solution column', () => {
    const principles = allWith('data-principle');
    expect(principles).toHaveLength(3);
    for (const principle of principles) {
      const tag = /^<[^>]*>/.exec(principle)?.[0] ?? '';
      expect(tag).toMatch(/\bmd:col-start-2\b/);
      expect(tag).toMatch(/\blg:col-start-5\b/);
    }
  });

  it('gives each principle an id the index links to', () => {
    const ids = allWith('data-principle').map(
      (principle) => / id="([^"]+)"/.exec(principle.slice(0, 400))?.[1],
    );
    const nav = /<nav[^>]*>[\s\S]*?<\/nav>/.exec(html)?.[0] ?? '';
    const hrefs = [...nav.matchAll(/<a[^>]* href="#([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(ids.every(Boolean)).toBe(true);
    expect(hrefs).toEqual(ids);
  });

  it('lays the index along the bottom on the works table’s grid', () => {
    const nav = /<nav[^>]*>[\s\S]*?<\/nav>/.exec(html)?.[0] ?? '';
    expect(nav).toMatch(/^<nav[^>]* aria-label="[^"]+"/);
    expect(nav).toMatch(
      /<ol[^>]* class="[^"]*\bgrid-cols-6\b[^"]*\blg:grid-cols-12\b/,
    );
    const items = [...nav.matchAll(/<li[^>]* class="([^"]*)"/g)];
    expect(items).toHaveLength(3);
    for (const [, classes] of items) {
      expect(classes).toMatch(/\bcol-span-2\b/);
      expect(classes).toMatch(/\blg:col-span-4\b/);
    }
  });

  it('numbers the index, and hides the labels from sight only on phones', () => {
    const nav = /<nav[^>]*>[\s\S]*?<\/nav>/.exec(html)?.[0] ?? '';
    const links = [...nav.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/g)].map(
      (match) => match[1],
    );
    for (const [i, link] of links.entries()) {
      expect(
        link
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
      ).toBe(`${i + 1} ${labels[i]}`);
      expect(link).toMatch(/class="max-md:sr-only"/);
    }
  });

  it('draws a line over each index label that can fill', () => {
    const nav = /<nav[^>]*>[\s\S]*?<\/nav>/.exec(html)?.[0] ?? '';
    const links = [...nav.matchAll(/<a[^>]* class="([^"]*)"/g)];
    for (const [, classes] of links) expect(classes).toMatch(/\bborder-t\b/);
    const fills = nav.match(/\bscale-x-\(--progress\)/g) ?? [];
    expect(fills).toHaveLength(3);
  });

  it('gives each index link a tap area at least 44 tall', () => {
    const nav = /<nav[^>]*>[\s\S]*?<\/nav>/.exec(html)?.[0] ?? '';
    const links = [...nav.matchAll(/<a[^>]* class="([^"]*)"/g)];
    for (const [, classes] of links) {
      // A 16 gap, a 20 line of text and a 24 gap: 60.
      expect(classes).toMatch(/\bpt-4\b/);
      expect(classes).toMatch(/\bpb-6\b/);
    }
  });

  it('shows a counter only once the stage is on', () => {
    const counter = allWith('data-principles-counter')[0] ?? '';
    const tag = /^<[^>]*>/.exec(counter)?.[0] ?? '';
    expect(tag).toMatch(/\bhidden\b/);
    expect(tag).toMatch(/\bgroup-data-staged:block\b/);
    expect(counter).toMatch(/^<[^>]*>\s*1 \/ 3\s*</);
  });

  it('stacks the principles until the stage is on', () => {
    const section = /^<section[^>]*>/.exec(html)?.[0] ?? '';
    expect(section).toMatch(/\bgroup\b/);
    expect(section).not.toMatch(/ data-staged/);
    for (const principle of allWith('data-principle')) {
      const tag = /^<[^>]*>/.exec(principle)?.[0] ?? '';
      expect(tag).toMatch(/\bgroup-data-staged:row-start-1\b/);
      expect(tag).toMatch(/\bgroup-data-staged:not-data-current:invisible\b/);
    }
  });
});
