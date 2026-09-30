import type { ImageFunction } from 'astro:content';
import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';
import { projectSchema } from './project-schema';

/** Stands in for Astro's image(), which only runs inside a build. */
const image: ImageFunction = () =>
  z.object({
    src: z.string(),
    width: z.number(),
    height: z.number(),
    format: z.union([
      z.literal('png'),
      z.literal('jpg'),
      z.literal('jpeg'),
      z.literal('tiff'),
      z.literal('webp'),
      z.literal('gif'),
      z.literal('svg'),
      z.literal('avif'),
      z.literal('apng'),
    ]),
  });

const schema = projectSchema({ image });

function picture(name: string) {
  return { src: `${name}.png`, width: 1776, height: 1240, format: 'png' };
}

/** A copy of `project` with `field` left out. */
function without(project: Record<string, unknown>, field: string) {
  return Object.fromEntries(
    Object.entries(project).filter(([key]) => key !== field),
  );
}

/** A project that can be opened, with every field filled in. */
function openProject(): Record<string, unknown> {
  return {
    name: 'Plots',
    order: 3,
    locked: false,
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
        dark: picture('plots-wide-dark'),
        light: picture('plots-wide-light'),
        alt: 'The Payouts page on a phone, with an alert about a paused payout.',
      },
      phone: {
        dark: picture('plots-phone-dark'),
        light: picture('plots-phone-light'),
        alt: 'The Payouts page on a phone.',
      },
    },
  };
}

/** Screenshots of the app in one look, at each size the box shows it. */
function stills(look: string) {
  return {
    large: picture(`${look}-large`),
    medium: picture(`${look}-medium`),
    phone: picture(`${look}-phone`),
    alt: `The app in the ${look} look.`,
  };
}

/** A project whose box runs its app live instead of showing images. */
function showcaseProject(): Record<string, unknown> {
  return {
    ...without(openProject(), 'images'),
    showcase: {
      app: '/showcase/missionml/?view=sampler',
      stock: stills('stock'),
      brand: stills('brand'),
    },
  };
}

/** A project under NDA: row text only, and no name, which never shows. */
function lockedProject(): Record<string, unknown> {
  return {
    order: 1,
    locked: true,
    category: 'Government AI',
    solution: 'AI application for a federal workforce program',
    practices: ['Product design', 'Development'],
    segment: 'Government',
  };
}

describe('projectSchema', () => {
  it('accepts a project with every field filled in', () => {
    expect(schema.safeParse(openProject()).success).toBe(true);
  });

  it.each(['category', 'solution', 'practices', 'segment'])(
    'rejects a project with no %s',
    (field) => {
      expect(schema.safeParse(without(openProject(), field)).success).toBe(
        false,
      );
    },
  );

  it('accepts a locked project with no name, write-up or images', () => {
    expect(schema.safeParse(lockedProject()).success).toBe(true);
  });

  it.each(['name', 'writeUp', 'images'])(
    'rejects a project that can be opened but has no %s',
    (field) => {
      expect(schema.safeParse(without(openProject(), field)).success).toBe(
        false,
      );
    },
  );

  it('accepts a live showcase in place of images', () => {
    expect(schema.safeParse(showcaseProject()).success).toBe(true);
  });

  it('rejects a project with both images and a live showcase', () => {
    const project = { ...showcaseProject(), images: openProject().images };

    expect(schema.safeParse(project).success).toBe(false);
  });

  it('rejects a showcase missing a still or its alt text', () => {
    const project = showcaseProject();
    const noPhone = without(stills('stock'), 'phone');
    const noAlt = without(stills('stock'), 'alt');
    const showcase = project.showcase as Record<string, unknown>;

    for (const stock of [noPhone, noAlt]) {
      expect(
        schema.safeParse({ ...project, showcase: { ...showcase, stock } })
          .success,
      ).toBe(false);
    }
  });

  it('rejects a showcase app that isn’t a page on this site', () => {
    const project = showcaseProject();
    const showcase = project.showcase as Record<string, unknown>;

    expect(
      schema.safeParse({
        ...project,
        showcase: { ...showcase, app: 'https://example.com/app' },
      }).success,
    ).toBe(false);
  });

  it('rejects an image with no alt text', () => {
    const project = openProject();
    project.images = {
      wide: { dark: picture('a'), light: picture('b') },
      phone: { dark: picture('c'), light: picture('d'), alt: 'A phone.' },
    };

    expect(schema.safeParse(project).success).toBe(false);
  });

  it('rejects a write-up that isn’t two paragraphs', () => {
    const project = openProject();
    project.writeUp = ['One paragraph only.'];

    expect(schema.safeParse(project).success).toBe(false);
  });

  it('takes two or three practices', () => {
    const one = { ...lockedProject(), practices: ['Product design'] };
    const four = {
      ...lockedProject(),
      practices: ['Research', 'Strategy', 'Product design', 'Development'],
    };

    expect(schema.safeParse(one).success).toBe(false);
    expect(schema.safeParse(four).success).toBe(false);
  });

  it('takes only Consumer, Business or Government as the segment', () => {
    const project = { ...lockedProject(), segment: 'Enterprise' };

    expect(schema.safeParse(project).success).toBe(false);
  });

  // The limits keep each column to one line at the narrowest screen it
  // shows on, and the write-up inside the image box's height.
  it.each([
    ['category', 'x'.repeat(23)],
    ['solution', 'x'.repeat(61)],
    ['practices', ['x'.repeat(30), 'x'.repeat(25)]],
    ['segment', 'x'.repeat(21)],
    ['writeUp', ['x'.repeat(271), 'Short.']],
    ['writeUp', ['Short.', 'x'.repeat(311)]],
  ])('rejects a %s longer than it has room for', (field, value) => {
    const project = { ...openProject(), [field]: value };

    expect(schema.safeParse(project).success).toBe(false);
  });

  it('accepts a link with its own text', () => {
    const project = {
      ...openProject(),
      link: {
        url: 'https://apps.apple.com/us/app/misunshine/id1579611279',
        text: 'On the App Store ↗',
      },
    };

    expect(schema.safeParse(project).success).toBe(true);
  });

  it('rejects a link that isn’t a web address', () => {
    const project = {
      ...openProject(),
      link: { url: 'apps.apple.com', text: 'On the App Store ↗' },
    };

    expect(schema.safeParse(project).success).toBe(false);
  });
});
