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

/** Each project's own row, the first in its group; an opened row follows it. */
const bodyRows = () =>
  elements(html, 'tbody').map((group) => elements(group, 'tr')[0] ?? '');

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

  it('gives each row that can be opened a button named after the project', () => {
    const [button] = elements(bodyRows()[1], 'button');

    expect(button).toContain('type="button"');
    expect(textOf(button)).toBe('Open Project 2');
  });

  it('starts every row closed, with the row it opens hidden', () => {
    const [group] = elements(html, 'tbody').slice(1);
    const [button] = elements(group, 'button');
    const controls = /aria-controls="([^"]+)"/.exec(button ?? '')?.[1];

    expect(button).toContain('aria-expanded="false"');
    expect(controls).toBeTruthy();
    expect(group).toMatch(new RegExp(`<tr[^>]* id="${controls}"[^>]* hidden`));
  });

  // The button's name already says it, so screen readers hear it once.
  it('keeps the project name beside Category for sighted visitors only', () => {
    const [, category] = elements(bodyRows()[1], 'td');

    expect(category).toMatch(
      /<span[^>]* aria-hidden="true"[^>]*>\s*Project 2\s*<\/span>/,
    );
  });

  // not-sr-only, which shows a column once the screen is wide enough,
  // also sets padding to 0, so a cell that uses it would lose its
  // padding and sit higher than the rest of the row.
  it('keeps every row cell’s padding where showing a column can’t undo it', () => {
    const cells = bodyRows().flatMap((row) => elements(row, 'td'));
    const openingTags = cells.map((cell) => /^<td[^>]*>/.exec(cell)?.[0] ?? '');

    for (const tag of openingTags.filter((tag) =>
      tag.includes('not-sr-only'),
    )) {
      expect(tag).not.toMatch(/\bp[xytblr]?-/);
    }
    for (const cell of cells.filter((cell) => cell.includes('not-sr-only'))) {
      expect(cell).toMatch(/<td[^>]*>\s*<[^>]* class="[^"]*\bpy-3\.5/);
    }
  });
});
