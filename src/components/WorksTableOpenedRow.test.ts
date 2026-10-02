import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { CollectionEntry } from 'astro:content';
import { beforeAll, describe, expect, it } from 'vitest';
import WorksTableOpenedRow from './WorksTableOpenedRow.astro';

type Project = Extract<CollectionEntry<'projects'>['data'], { locked: false }>;

function picture(name: string, height: number) {
  return { src: `/${name}.png`, width: 1776, height, format: 'png' as const };
}

const project: Project = {
  order: 3,
  locked: false,
  name: 'Plots',
  category: 'Events',
  solution: 'Payouts page that shows event hosts when money arrives',
  practices: ['Product design', 'Strategy'],
  segment: 'Consumer',
  writeUp: {
    problem: 'Plots is a phone app for finding events and buying tickets.',
    approach: 'I designed a Payouts page for all of a host’s events.',
    outcome: 'The page shipped with those APIs.',
  },
  isLive: true,
  isOpenByDefault: false,
  tools: ['Figma'],
  images: {
    wide: {
      dark: picture('wide-dark', 1240),
      light: picture('wide-light', 1240),
      alt: 'The Payouts page, wide.',
    },
    phone: {
      dark: picture('phone-dark', 576),
      light: picture('phone-light', 576),
      alt: 'The Payouts page, on a phone.',
    },
  },
};

const withLink: Project = {
  ...project,
  link: {
    url: 'https://apps.apple.com/us/app/plots',
    text: 'On the App Store',
  },
};

/** Screenshots of the app in one look, at each size the box shows it. */
function stills(look: string) {
  return {
    large: picture(`${look}-large`, 1104),
    medium: picture(`${look}-medium`, 956),
    phone: picture(`${look}-phone`, 768),
    alt: `The sampler, ${look}.`,
  };
}

const showcaseProject: Project = {
  order: 2,
  locked: false,
  name: 'MissionML design system',
  category: 'Government AI',
  solution: 'Branded design system for prototyping AI apps in Streamlit',
  practices: ['Design systems', 'Development'],
  segment: 'Government',
  writeUp: project.writeUp,
  isLive: true,
  isOpenByDefault: false,
  tools: ['Figma', 'Cursor'],
  showcase: {
    app: '/showcase/missionml/?view=sampler',
    stock: stills('stock'),
    brand: stills('brand'),
  },
};

const ndaProject: Project = {
  order: 1,
  locked: false,
  name: 'CAT',
  category: 'Government AI',
  solution: 'AI application for a federal workforce program',
  practices: ['Product design', 'Development'],
  segment: 'Government',
  writeUp: project.writeUp,
  isLive: false,
  isOpenByDefault: false,
  tools: ['Cursor'],
  isUnderNda: true,
};

const notLive: Project = { ...project, isLive: false };

const withoutOutcome: Project = {
  ...project,
  writeUp: {
    problem: project.writeUp.problem,
    approach: project.writeUp.approach,
  },
};

let html = '';
let htmlWithoutOutcome = '';
let htmlWithLink = '';
let htmlWithShowcase = '';
let htmlNotLive = '';
let htmlUnderNda = '';

beforeAll(async () => {
  const container = await AstroContainer.create();
  const render = (props: Project) =>
    container.renderToString(WorksTableOpenedRow, {
      props: { project: props, id: 'works-plots' },
    });
  html = await render(project);
  htmlWithoutOutcome = await render(withoutOutcome);
  htmlWithLink = await render(withLink);
  htmlWithShowcase = await render(showcaseProject);
  htmlNotLive = await render(notLive);
  htmlUnderNda = await render(ndaProject);
});

function textOf(markup = '') {
  return markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('the opened row', () => {
  it('starts hidden, under the id its button points at', () => {
    expect(html).toMatch(/^\s*<tr[^>]* id="works-plots"[^>]* hidden/);
  });

  // The line under it belongs to the group below, so it slides with it.
  it('leaves the line under it to the group below', () => {
    expect(/^\s*<tr[^>]*>/.exec(html)?.[0]).not.toMatch(/\bborder-b\b/);
  });

  // One level under the section's own heading.
  it('heads the write-up with the project’s name', () => {
    expect(html).toMatch(/<h3[^>]*>\s*Plots\s*<\/h3>/);
  });

  /** Each chapter's label and text, in the order they show. */
  function chaptersOf(markup: string) {
    return [
      ...markup.matchAll(
        /<h4[^>]*>([\s\S]*?)<\/h4>\s*<p[^>]*>([\s\S]*?)<\/p>/g,
      ),
    ].map(([, label, text]) => [textOf(label), textOf(text)]);
  }

  it('tells the problem, the approach and the outcome, each under its label', () => {
    expect(chaptersOf(html)).toEqual([
      ['Problem', project.writeUp.problem],
      ['Approach', project.writeUp.approach],
      ['Outcome', project.writeUp.outcome],
    ]);
  });

  it('leaves the outcome out when the project has none', () => {
    expect(chaptersOf(htmlWithoutOutcome)).toEqual([
      ['Problem', project.writeUp.problem],
      ['Approach', project.writeUp.approach],
    ]);
  });

  // There are no case studies on the site yet, so the ask goes to Contact.
  it('asks for the full case study by pointing to the contact section', () => {
    const ask = /<a[^>]* href="#contact"[^>]*>[\s\S]*?<\/a>/.exec(html)?.[0];

    expect(textOf(ask)).toBe('Ask for the full case study ↓');
  });

  // Like the site's other links, the arrow follows the words, and it
  // points down because the contact is further down the page.
  it('follows the ask with a down arrow kept from screen readers', () => {
    const ask =
      /<a[^>]* href="#contact"[^>]*>[\s\S]*?<\/a>/.exec(html)?.[0] ?? '';

    expect(ask).not.toContain('<svg');
    expect(ask).toMatch(
      /<span[^>]* aria-hidden="true"[^>]*>↓<\/span>\s*<\/a>$/,
    );
  });

  // Above the image on narrower screens, so the row ends on the ask, and
  // screen readers hear the write-up, the image, then the ask.
  it('ends with the ask, after the image', () => {
    const lastImage = html.lastIndexOf('<img');
    const ask = html.indexOf('href="#contact"');

    expect(lastImage).toBeGreaterThan(-1);
    expect(ask).toBeGreaterThan(lastImage);
  });

  it('shows the wide and phone images in both themes', () => {
    const images = html.match(/<img[^>]*>/g) ?? [];

    expect(images).toHaveLength(4);
    expect(
      images.filter((image) => image.includes('alt="The Payouts page, wide."')),
    ).toHaveLength(2);
    expect(
      images.filter((image) =>
        image.includes('alt="The Payouts page, on a phone."'),
      ),
    ).toHaveLength(2);
  });

  // So the page doesn't jump as they load, and hidden ones never load.
  it('gives every image its size and loads it only when shown', () => {
    for (const image of html.match(/<img[^>]*>/g) ?? []) {
      expect(image).toMatch(/ width="\d+"/);
      expect(image).toMatch(/ height="\d+"/);
      expect(image).toContain('loading="lazy"');
    }
  });

  it('has no link out when the project has none', () => {
    expect(html).not.toMatch(/<a[^>]* href="https:/);
  });

  it('links out with the project’s own words, the arrow kept from screen readers', () => {
    const link =
      /<a [^>]*href="https:[\s\S]*?<\/a>/.exec(htmlWithLink)?.[0] ?? '';

    expect(link).toContain('href="https://apps.apple.com/us/app/plots"');
    expect(link).toMatch(/<span[^>]* aria-hidden="true"[^>]*>↗<\/span>/);
    expect(
      textOf(link.replace(/<span[^>]* aria-hidden="true"[^>]*>↗<\/span>/, '')),
    ).toBe('On the App Store');
  });

  // The link is the proof of the outcome, so it follows it.
  it('puts the link right after the outcome', () => {
    const outcome = htmlWithLink.indexOf(project.writeUp.outcome ?? '');
    const link = htmlWithLink.indexOf('href="https://apps.apple.com');
    const ask = htmlWithLink.indexOf('href="#contact"');

    expect(outcome).toBeGreaterThan(-1);
    expect(link).toBeGreaterThan(outcome);
    expect(ask).toBeGreaterThan(link);
  });
});

/** The strip under the image or showcase. */
function stripOf(markup: string) {
  const start = markup.indexOf('data-strip');
  const open = markup.lastIndexOf('<div', start);
  const ask = markup.indexOf('href="#contact"');
  return markup.slice(open, markup.lastIndexOf('<a', ask));
}

describe('the strip under the image', () => {
  it('sits between the image and the ask', () => {
    const lastImage = html.lastIndexOf('<img');
    const strip = html.indexOf('data-strip');
    const ask = html.indexOf('href="#contact"');

    expect(strip).toBeGreaterThan(lastImage);
    expect(ask).toBeGreaterThan(strip);
  });

  it('says Live on a project that shipped', () => {
    expect(textOf(stripOf(html))).toMatch(/^Live /);
  });

  // It looks like the pill the table uses for controls, but only says
  // something, so a keyboard never stops on it.
  it('makes Live a label, not a control', () => {
    const strip = stripOf(html);

    expect(strip).not.toMatch(/<(button|a)\b/);
    expect(strip).not.toContain('tabindex');
  });

  it('leaves Live out on a project that didn’t ship', () => {
    expect(textOf(stripOf(htmlNotLive))).toBe('Built with Figma');
  });

  it('names each tool for screen readers, its logo kept from them', () => {
    const strip = stripOf(html);

    expect(textOf(strip)).toMatch(/Built with Figma$/);
    for (const logo of strip.match(/<svg[^>]*>/g) ?? []) {
      expect(logo).toContain('aria-hidden="true"');
    }
    expect(strip.match(/<svg/g)).toHaveLength(1);
  });
});

describe('the opened row with a live showcase', () => {
  it('shows the stills of both looks, at every size, in place of images', () => {
    const images = htmlWithShowcase.match(/<img[^>]*>/g) ?? [];

    expect(images).toHaveLength(6);
    for (const look of ['stock', 'brand']) {
      expect(
        images.filter((image) => image.includes(`alt="The sampler, ${look}."`)),
      ).toHaveLength(3);
    }
    for (const image of images) expect(image).toContain('loading="lazy"');
  });

  it('points at the app it runs, but starts nothing until asked', () => {
    expect(htmlWithShowcase).toContain(
      'data-app="/showcase/missionml/?view=sampler"',
    );
    expect(htmlWithShowcase).not.toContain('<iframe');
  });

  it('has a seam a keyboard can move', () => {
    const seam = /<[^>]* role="slider"[^>]*>/.exec(htmlWithShowcase)?.[0] ?? '';

    expect(seam).toContain('tabindex="0"');
    expect(seam).toContain('aria-valuenow="33"');
    expect(seam).toMatch(/aria-label="[^"]+"/);
  });

  it('labels each side', () => {
    const text = textOf(htmlWithShowcase);

    expect(text).toContain('Stock Streamlit');
    expect(text).toContain('MissionML');
  });

  // The seam is the only control: no run button, no second way to compare.
  it('has no buttons of its own', () => {
    expect(htmlWithShowcase).not.toMatch(/<button/);
    expect(textOf(htmlWithShowcase)).not.toMatch(/Run live|Lens/);
  });

  it('ends on the same strip as every row, under the showcase', () => {
    const seam = htmlWithShowcase.indexOf('role="slider"');
    const strip = htmlWithShowcase.indexOf('data-strip');

    expect(seam).toBeGreaterThan(-1);
    expect(strip).toBeGreaterThan(seam);
    expect(textOf(stripOf(htmlWithShowcase))).toBe(
      'Live Built with Figma Cursor',
    );
  });
});

describe('the opened row under NDA', () => {
  const boxOf = (markup: string) =>
    /<div[^>]* data-nda-box[^>]*>[\s\S]*?<\/div>/.exec(markup)?.[0] ?? '';

  it('shows an empty box marked NDA in place of images', () => {
    expect(htmlUnderNda).not.toMatch(/<img/);
    expect(textOf(boxOf(htmlUnderNda))).toBe('NDA');
  });

  it('tells screen readers the images are withheld, its lock kept from them', () => {
    const box = boxOf(htmlUnderNda);

    expect(box).toMatch(/role="img"/);
    expect(box).toContain('aria-label="Images withheld under NDA"');
    expect(box).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  it('keeps the write-up, the strip and the ask', () => {
    const text = textOf(htmlUnderNda);

    expect(text).toContain('Problem');
    expect(textOf(stripOf(htmlUnderNda))).toBe('Built with Cursor');
    expect(text).toMatch(/Ask for the full case study/);
  });
});
