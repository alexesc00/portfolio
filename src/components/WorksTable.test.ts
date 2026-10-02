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
    writeUp: { problem: 'The problem.', approach: 'The approach.' },
    isLive: false,
    tools: ['Figma'],
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

  // The button's ::after stretches it over the whole row. Anything in the
  // row that's moved, masked or faded is painted above an ::after without
  // a z-index and takes the pointer from it, so the row stops opening.
  it('lays the button’s click area over everything else in its row', () => {
    const [button] = elements(bodyRows()[1], 'button');
    const openingTag = /^<button[^>]*>/.exec(button ?? '')?.[0] ?? '';

    expect(openingTag).toMatch(/\bafter:inset-0\b/);
    expect(openingTag).toMatch(/\bafter:z-\d+\b/);
  });

  it('starts every row closed, with the row it opens hidden', () => {
    const [group] = elements(html, 'tbody').slice(1);
    const [button] = elements(group, 'button');
    const controls = /aria-controls="([^"]+)"/.exec(button ?? '')?.[1];

    expect(button).toContain('aria-expanded="false"');
    expect(controls).toBeTruthy();
    expect(group).toMatch(new RegExp(`<tr[^>]* id="${controls}"[^>]* hidden`));
  });

  // A row that opens is uncovered by the rows under it sliding down, and
  // covered again as they slide back. So each group paints its own
  // background, and the line between two projects belongs to the group
  // below it, moving with it; no row's line has to switch on or off.
  it('draws the line between projects on the group below, which covers what it slides over', () => {
    const groups = elements(html, 'tbody');
    const headerRow = elements(elements(html, 'thead')[0], 'tr')[0] ?? '';

    for (const group of groups) {
      const openingTag = /^<tbody[^>]*>/.exec(group)?.[0] ?? '';
      expect(openingTag).toMatch(/\bborder-t\b/);
      expect(openingTag).toMatch(/\bbg-background\b/);
      expect(openingTag).toMatch(/\blast:border-b\b/);
    }
    for (const row of [headerRow, ...bodyRows()]) {
      expect(/^<tr[^>]*>/.exec(row)?.[0]).not.toMatch(/\bborder-b\b/);
    }
  });

  // Category's text and the project's name each need a box of their own
  // to roll up and out of the cell.
  it('gives Category and the name over it their own boxes to roll', () => {
    const [, category] = elements(bodyRows()[1], 'td');

    expect(category).toMatch(
      /<span[^>]* data-category[^>]*>\s*Events\s*<\/span>/,
    );
    expect(category).toMatch(
      /<span[^>]* data-name[^>]*>\s*Project 2\s*<\/span>/,
    );
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
    const shownByWidth = bodyRows()
      .flatMap((row) => elements(row, 'td'))
      .filter((cell) => /^<td[^>]*not-sr-only/.test(cell));

    expect(shownByWidth.length).toBeGreaterThan(0);
    for (const cell of shownByWidth) {
      expect(/^<td[^>]*>/.exec(cell)?.[0]).not.toMatch(/\bp[xytblr]?-/);
      expect(cell).toMatch(/^<td[^>]*>\s*<[^>]* class="[^"]*\bpy-3\.5/);
    }
  });
});
