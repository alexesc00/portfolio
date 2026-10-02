import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { CollectionEntry } from 'astro:content';
import { beforeAll, describe, expect, it } from 'vitest';
import WorksSection from './WorksSection.astro';

const projects: CollectionEntry<'projects'>['data'][] = [
  {
    order: 1,
    locked: true,
    category: 'Government AI',
    solution: 'AI application for a federal workforce program',
    practices: ['Product design', 'Development'],
    segment: 'Government',
  },
];

let html = '';

beforeAll(async () => {
  const container = await AstroContainer.create();
  html = await container.renderToString(WorksSection, { props: { projects } });
});

describe('the works section', () => {
  it('is where the hero’s Work link lands', () => {
    expect(html).toMatch(/^<section[^>]* id="work"/);
  });

  it('is named by its heading', () => {
    const labelledBy = /<section[^>]* aria-labelledby="([^"]+)"/.exec(
      html,
    )?.[1];
    const heading = /<h2[^>]* id="([^"]+)"[^>]*>\s*Selected work\s*<\/h2>/.exec(
      html,
    )?.[1];

    expect(labelledBy).toBeDefined();
    expect(labelledBy).toBe(heading);
  });

  it('stops growing at 1440, in line with the hero', () => {
    expect(html).toMatch(
      /^<section[^>]* class="[^"]*max-w-\(--breakpoint-2xl\)/,
    );
  });

  it('opens with the self-statement, the last clause at full strength', () => {
    const statement = /<p[^>]* class="([^"]*)"[^>]*>([\s\S]*?)<\/p>/.exec(html);
    const text = statement?.[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ');

    expect(text?.trim()).toBe(
      'Designs change on the way to launch. I design products and build them in code, so what ships is what was meant.',
    );
    expect(statement?.[1]).toMatch(/\btext-lead\b/);
    expect(statement?.[1]).toMatch(/\btext-text-muted\b/);
    expect(statement?.[2]).toMatch(
      /<span[^>]* class="[^"]*\btext-text\b[^"]*"[^>]*>so what ships is what was meant\.<\/span>/,
    );
  });

  // Hand-set line breaks only fit one phone width. From 768 up each
  // clause gets its own line; narrower, the lines balance themselves.
  it('breaks the statement by clause from 768 up, and balances it below', () => {
    const statement = /<p[^>]* class="([^"]*)"[^>]*>([\s\S]*?)<\/p>/.exec(html);
    const clauses = [
      ...(statement?.[2] ?? '').matchAll(/<span[^>]* class="([^"]*)"/g),
    ];

    expect(statement?.[1]).toMatch(/\btext-balance\b/);
    expect(clauses).toHaveLength(3);
    for (const [, classes] of clauses) expect(classes).toMatch(/\bmd:block\b/);
  });

  // Screen readers meet the section's name before its first words, even
  // where the name sits to the right of them.
  it('puts the heading before the statement in reading order', () => {
    expect(html.indexOf('<h2')).toBeLessThan(html.indexOf('Designs change'));
  });

  it('shows the works table under the heading', () => {
    expect(html.indexOf('<table')).toBeGreaterThan(html.indexOf('<h2'));
    expect(html).toContain('AI application for a federal workforce program');
  });
});
