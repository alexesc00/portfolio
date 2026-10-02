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

  // The statement has its own screen before this section now.
  it('leaves the self-statement to its own section', () => {
    expect(html).not.toContain('Designs change');
  });

  // Every section opens on its name at the top left, an inset down, with
  // its content 48 below on phones and 64 from 768 up.
  it('opens on its name in Display at the top left, the table under it', () => {
    const section = /^<section[^>]*>/.exec(html)?.[0] ?? '';
    const heading = /<h2[^>]*>/.exec(html)?.[0] ?? '';

    expect(heading).toMatch(/\btext-display\b/);
    expect(heading).not.toMatch(/text-right/);
    expect(heading).toMatch(/\bmb-12\b/);
    expect(heading).toMatch(/\bmd:mb-16\b/);
    expect(section).toMatch(/\bpt-inset\b/);
  });

  it('shows the works table under the heading', () => {
    expect(html.indexOf('<table')).toBeGreaterThan(html.indexOf('<h2'));
    expect(html).toContain('AI application for a federal workforce program');
  });
});
