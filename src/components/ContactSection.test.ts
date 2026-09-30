import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import ContactSection from './ContactSection.astro';

let html = '';

beforeAll(async () => {
  const container = await AstroContainer.create();
  html = await container.renderToString(ContactSection);
});

const section = () => /^<section[^>]*>/.exec(html)?.[0] ?? '';

/** The text of a link, as a screen reader would read it. */
const linkText = (inner: string) =>
  inner
    .replace(/<span[^>]* aria-hidden="true"[^>]*>[^<]*<\/span>/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const links = () =>
  [...html.matchAll(/<a ([^>]*)>([\s\S]*?)<\/a>/g)].map(
    ([, attributes, inner]) => ({ attributes, inner, text: linkText(inner) }),
  );

describe('the closing plate', () => {
  it('is where the top bar’s Contact link lands', () => {
    expect(section()).toMatch(/ id="contact"/);
  });

  it('is named by its heading, and at least one screen tall', () => {
    const labelledBy = /aria-labelledby="([^"]+)"/.exec(section())?.[1];
    expect(labelledBy).toBeTruthy();
    expect(html).toMatch(
      new RegExp(`<h2[^>]* id="${labelledBy}"[^>]*>\\s*Contact\\s*</h2>`),
    );
    expect(section()).toMatch(/\bmin-h-plate\b/);
  });

  it('sits in the 1440 page frame', () => {
    expect(section()).toMatch(/\bmax-w-\(--breakpoint-2xl\)/);
    expect(section()).toMatch(/\bpx-page\b/);
  });

  it('puts its name before the address, top right from 1024 up', () => {
    const heading = html.indexOf('<h2');
    expect(heading).toBeGreaterThan(-1);
    expect(heading).toBeLessThan(html.indexOf('mailto:'));
    expect(html).toMatch(
      /<div[^>]* class="[^"]*\blg:flex-row-reverse\b[^"]*"[^>]*>\s*<h2/,
    );
  });

  it('sets the address as a statement that emails it', () => {
    const address = links().find(({ attributes }) =>
      attributes.includes('href="mailto:hello@alexescudero.design"'),
    );
    expect(address?.text).toBe('hello@alexescudero.design');
    expect(address?.attributes).toMatch(/\btext-statement\b/);
  });

  it('breaks the address after the @ on phones only', () => {
    expect(html).toMatch(
      /<span[^>]* class="max-md:block"[^>]*>hello@<\/span>alexescudero\.design/,
    );
  });

  it('links to LinkedIn, in the interface style at 60%', () => {
    const linkedIn = links().find(({ text }) => text === 'LinkedIn');
    expect(linkedIn?.attributes).toMatch(
      /href="https:\/\/www\.linkedin\.com\/in\/alexesc1111\/"/,
    );
    expect(linkedIn?.attributes).toMatch(/\btext-text-muted\b/);
    expect(linkedIn?.inner).toMatch(/<span aria-hidden="true"[^>]*>↗<\/span>/);
  });

  it('ends with a way back to the top, at the bottom right', () => {
    const top = links().at(-1);
    expect(top?.attributes).toMatch(/href="#top"/);
    expect(top?.text).toBe('Back to Top');
    expect(top?.inner).toMatch(/<span aria-hidden="true"[^>]*>↑<\/span>/);
    expect(top?.attributes).toMatch(/\bself-end\b/);
  });

  it('keeps the page’s bottom edge an inset away', () => {
    expect(section()).toMatch(/\bpb-inset\b/);
  });
});
