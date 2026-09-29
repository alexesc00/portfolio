import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { CollectionEntry } from 'astro:content';
import { beforeAll, describe, expect, it } from 'vitest';
import WorksTable from './WorksTable.astro';

type Project = CollectionEntry<'projects'>['data'];

function picture(name: string) {
  return {
    src: `/${name}.png`,
    width: 1776,
    height: 1240,
    format: 'png' as const,
  };
}

/** A project that can be opened, with made-up text. */
function openProject(order: number, solution: string): Project {
  const images = {
    dark: picture('dark'),
    light: picture('light'),
    alt: 'A screen.',
  };
  return {
    order,
    locked: false,
    name: `Project ${order}`,
    category: 'Events',
    solution,
    practices: ['Product design', 'Strategy'],
    segment: 'Consumer',
    writeUp: ['First paragraph.', 'Second paragraph.'],
    images: { wide: images, phone: images },
  };
}

const lockedProject: Project = {
  order: 1,
  locked: true,
  category: 'Government AI',
  solution: 'AI application for a federal workforce program',
  practices: ['Product design', 'Development'],
  segment: 'Government',
};

// Out of order on purpose: the table sorts by `order`.
const projects = [
  openProject(3, 'Payouts page for event hosts'),
  lockedProject,
  openProject(2, 'Carbon tracking for builders'),
];

let html = '';

beforeAll(async () => {
  const container = await AstroContainer.create();
  html = await container.renderToString(WorksTable, { props: { projects } });
});

/** The text a screen reader would read in `markup`, tags removed. */
function textOf(markup = '') {
  return markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Each `<tag>` element in `markup`, whole. */
function elements(markup: string | undefined, tag: string) {
  if (!markup) return [];
  return (
    markup.match(new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, 'g')) ?? []
  );
}

const bodyRows = () => elements(elements(html, 'tbody')[0], 'tr');

describe('the works table', () => {
  it('names each column in a header row', () => {
    const headers = elements(elements(html, 'thead')[0], 'th');

    expect(headers.map(textOf)).toEqual([
      'Details',
      'Category',
      'Solution',
      'What I did',
      'Segment',
    ]);
    for (const header of headers) expect(header).toContain('scope="col"');
  });

  it('shows one row per project, top row first by order', () => {
    const rows = bodyRows();

    expect(rows).toHaveLength(3);
    expect(textOf(rows[0])).toContain(lockedProject.solution);
    expect(textOf(rows[1])).toContain('Carbon tracking for builders');
    expect(textOf(rows[2])).toContain('Payouts page for event hosts');
  });

  it('gives each row a cell per column, in the header’s order', () => {
    const cells = elements(bodyRows()[0], 'td');

    expect(cells.map(textOf)).toEqual([
      expect.stringContaining('Locked'),
      'Government AI',
      'AI application for a federal workforce program',
      'Product design, Development',
      'Government',
    ]);
  });

  it('says a locked row is locked, in words as well as the padlock', () => {
    const [padlockCell] = elements(bodyRows()[0], 'td');

    expect(padlockCell).toContain('<svg');
    expect(padlockCell).toContain('aria-hidden="true"');
    expect(textOf(padlockCell)).toBe('Locked, under NDA');
  });

  it('gives a locked row nothing to open it with', () => {
    expect(bodyRows()[0]).not.toContain('<button');
  });
});
