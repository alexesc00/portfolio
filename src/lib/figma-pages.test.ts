import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  compareComponents,
  compareWording,
  visibleText,
  type FigmaPagesSnapshot,
} from './figma-pages';

describe('visibleText', () => {
  it('lists each run of text a visitor can see, in page order', () => {
    expect(
      visibleText(
        '<h2>Selected   work</h2><p>Designed in <a href="#">Figma ↗</a>, built</p>',
      ),
    ).toEqual(['Selected work', 'Designed in', 'Figma ↗', ', built']);
  });

  it('skips scripts, styles, drawings and the page’s head', () => {
    expect(
      visibleText(
        '<!DOCTYPE html><head><title>Alex Escudero</title></head><script>const a = 1;</script><style>p{}</style><svg><text>Æ</text></svg><p>Work</p>',
      ),
    ).toEqual(['Work']);
  });

  it('skips text written only for screen readers', () => {
    expect(
      visibleText(
        '<button><span class="sr-only">Open MissionML design system</span>Open</button>',
      ),
    ).toEqual(['Open']);
  });

  it('turns character references back into the characters they stand for', () => {
    expect(
      visibleText('<p>Schools&#39; programs &amp; MissionML&rsquo;s</p>'),
    ).toEqual(["Schools' programs & MissionML’s"]);
  });
});

describe('compareWording', () => {
  const site = [
    'Selected work',
    'Designs change on the way to launch.',
    'hello@alexescudero.design',
  ];

  it('finds no difference when Figma draws exactly what the site renders', () => {
    expect(compareWording(site, [...site])).toEqual([]);
  });

  it('accepts Figma joining runs of text the site renders separately', () => {
    expect(
      compareWording(
        ['Designed in', 'Figma ↗', ', built'],
        ['Designed in Figma ↗, built'],
      ),
    ).toEqual([]);
  });

  it('accepts a line break drawn where the site has none', () => {
    expect(
      compareWording(site, [
        'Selected work',
        'Designs change on the way to launch.',
        'hello@ alexescudero.design',
      ]),
    ).toEqual([]);
  });

  // Wording the audit of 2026-10-02 found on drawings the site had moved past.
  it('reports wording Figma draws that the site no longer renders', () => {
    expect(
      compareWording(site, [
        ...site,
        'Design engineer',
        '↓ Work',
        'Run live',
        'Couldn’t start · Try again',
        'More ↗',
        'Shipped',
      ]),
    ).toEqual([
      'Figma shows “Design engineer”, which the site doesn’t render',
      'Figma shows “↓ Work”, which the site doesn’t render',
      'Figma shows “Run live”, which the site doesn’t render',
      'Figma shows “Couldn’t start · Try again”, which the site doesn’t render',
      'Figma shows “More ↗”, which the site doesn’t render',
      'Figma shows “Shipped”, which the site doesn’t render',
    ]);
  });

  it('reports wording the site renders that Figma doesn’t show', () => {
    expect(
      compareWording([...site, 'Cyber Academic Management System'], site),
    ).toEqual([
      'The site renders “Cyber Academic Management System”, which Figma doesn’t show',
    ]);
  });

  it('allows listed wording on only one side', () => {
    expect(
      compareWording([...site, 'Close'], [...site, '2 / 3'], {
        onlyInFigma: ['2 / 3'],
        onlyOnSite: ['Close'],
      }),
    ).toEqual([]);
  });
});

describe('compareComponents', () => {
  const files = ['Hero.astro', 'WorksTable.astro', 'WorksTableToggle.astro'];

  it('matches each file to the component named after it, and its parts', () => {
    expect(
      compareComponents(
        ['Hero', 'WorksTable', 'WorksTable / Row', 'WorksTableToggle'],
        files,
      ),
    ).toEqual([]);
  });

  // The audit found the home page's sections drawn as loose frames, and
  // works table pieces named unlike their files.
  it('reports a file with no component in Figma', () => {
    expect(
      compareComponents(
        ['Hero', 'WorksTableToggle'],
        [...files, 'TopBar.astro'],
      ),
    ).toEqual([
      'src/components/WorksTable.astro has no component in Figma',
      'src/components/TopBar.astro has no component in Figma',
    ]);
  });

  it('reports a component that matches no file', () => {
    expect(
      compareComponents(
        ['Hero', 'WorksTable', 'WorksTableToggle', 'Works table / Toggle'],
        files,
      ),
    ).toEqual([
      'Figma’s “Works table / Toggle” matches no file in src/components',
    ]);
  });

  it('allows listed components without a file, and files without a component', () => {
    expect(
      compareComponents(
        ['Hero', 'WorksTable', 'Works table / Composition'],
        files,
        {
          withoutFile: ['Works table / Composition'],
          withoutComponent: ['WorksTableToggle.astro'],
        },
      ),
    ).toEqual([]);
  });
});

describe('the Figma file’s current pages', () => {
  const snapshot = JSON.parse(
    readFileSync('src/styles/figma-pages.json', 'utf8'),
  ) as FigmaPagesSnapshot;

  // The built page, because rendering it here would need the content
  // cache that only a build or the dev server writes.
  it('draw the wording the built home page renders, and only that', () => {
    const builtPage = 'dist/index.html';
    if (!existsSync(builtPage)) {
      throw new Error('Build the site first: npm run build');
    }
    const html = readFileSync(builtPage, 'utf8');

    expect(
      compareWording(visibleText(html), snapshot.siteText, {
        onlyOnSite: [
          // The mark's stand-in until its dots are drawn. Figma draws the dots.
          'Æ',
          // A row's toggle word shows only on hover or keyboard focus, which
          // the Components page draws.
          'Open',
          'Close',
          // The showcase's progress while its app starts.
          '0%',
          'Loading Python',
        ],
      }),
    ).toEqual([]);
  });

  it('have one component for each file in src/components', () => {
    const files = readdirSync('src/components').filter(
      (file) => file.endsWith('.astro') || file.endsWith('.tsx'),
    );

    expect(
      compareComponents(
        snapshot.components.map((component) => component.name),
        files,
        {
          // Images exported from Figma into the works table, with no code.
          withoutFile: [
            'Works table / Device frame',
            'Works table / Composition',
          ],
          // Renders no markup: it only makes in-page links scroll smoothly.
          withoutComponent: ['InPageLinks.astro'],
        },
      ),
    ).toEqual([]);
  });
});
