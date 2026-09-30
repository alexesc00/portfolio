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
  writeUp: [
    'Plots is a phone app for finding events and buying tickets.',
    'I designed a Payouts page for all of a host’s events.',
  ],
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
  showcase: {
    app: '/showcase/missionml/?view=sampler',
    stock: stills('stock'),
    brand: stills('brand'),
  },
};

let html = '';
let htmlWithLink = '';
let htmlWithShowcase = '';

beforeAll(async () => {
  const container = await AstroContainer.create();
  const render = (props: Project) =>
    container.renderToString(WorksTableOpenedRow, {
      props: { project: props, id: 'works-plots' },
    });
  html = await render(project);
  htmlWithLink = await render(withLink);
  htmlWithShowcase = await render(showcaseProject);
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

  it('shows both paragraphs of the write-up, in order', () => {
    const paragraphs = html.match(/<p[\s>][\s\S]*?<\/p>/g) ?? [];

    expect(paragraphs.map(textOf)).toEqual(project.writeUp);
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

  it('has no link when the project has none', () => {
    expect(html).not.toContain('<a ');
  });

  it('links out with the project’s own words, the arrow kept from screen readers', () => {
    const link = /<a [\s\S]*?<\/a>/.exec(htmlWithLink)?.[0] ?? '';

    expect(link).toContain('href="https://apps.apple.com/us/app/plots"');
    expect(link).toMatch(/<span[^>]* aria-hidden="true"[^>]*>↗<\/span>/);
    expect(
      textOf(link.replace(/<span[^>]* aria-hidden="true"[^>]*>↗<\/span>/, '')),
    ).toBe('On the App Store');
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

  it('offers to run the app, and a choice of seam or lens', () => {
    const buttons = (
      htmlWithShowcase.match(/<button[\s\S]*?<\/button>/g) ?? []
    ).map(textOf);

    expect(buttons).toEqual(['Run live', 'Seam', 'Lens']);
    expect(htmlWithShowcase).toMatch(
      /<button[^>]* aria-pressed="true"[^>]*>\s*Seam/,
    );
  });
});
