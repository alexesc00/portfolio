import type { SchemaContext } from 'astro:content';
import { z } from 'astro/zod';

/*
 * Character limits measured in Figma with the real fonts. Each column's
 * text fits on one line at the narrowest screen that shows the column,
 * and the write-up fits beside the image box at 1280 wide, the tightest
 * width for it. The approach and the outcome share the room the second
 * paragraph had before the write-up was split into chapters.
 */
const maxLength = {
  category: 22,
  solution: 60,
  whatIDid: 56,
  problem: 270,
  approach: 290,
  outcome: 90,
  approachAndOutcome: 310,
};

/** The fields of one project in the works table, top row first by `order`. */
export function projectSchema({ image }: SchemaContext) {
  const text = z.string().trim().min(1);

  // Dark and light versions of one image, which show the same thing.
  const themedImage = z.object({
    dark: image(),
    light: image(),
    alt: text,
  });

  const row = {
    order: z.number().int(),
    category: text.max(maxLength.category),
    solution: text.max(maxLength.solution),
    // The "What I did" column, shown as a comma-separated list.
    practices: z
      .array(text)
      .min(2)
      .max(3)
      .refine(
        (practices) => practices.join(', ').length <= maxLength.whatIDid,
        `What I did is longer than ${maxLength.whatIDid} characters`,
      ),
    segment: z.enum(['Consumer', 'Business', 'Government']),
  };

  // Screenshots of a live app in one look, one for each size it's shown.
  const stills = z.object({
    // Drawn 872 wide: the box from 1440 wide up.
    large: image(),
    // Drawn 766 wide: the box below 1440, scaled down to fit.
    medium: image(),
    // A crop of the large one, for phones.
    phone: image(),
    alt: text,
  });

  const opened = {
    ...row,
    locked: z.literal(false),
    // Shown as the write-up's heading and in the button's name.
    name: text,
    // Each chapter shows under its label. Not every project has a result
    // to report, so the outcome can be left out.
    writeUp: z
      .object({
        problem: text.max(maxLength.problem),
        approach: text.max(maxLength.approach),
        outcome: text.max(maxLength.outcome).optional(),
      })
      .refine(
        ({ approach, outcome = '' }) =>
          approach.length + outcome.length <= maxLength.approachAndOutcome,
        `The approach and outcome are longer than ${maxLength.approachAndOutcome} characters together`,
      ),
    // The page adds a ↗ after the text.
    link: z.object({ url: z.url({ protocol: /^https$/ }), text }).optional(),
  };

  // Strict, so a project can't have both images and a showcase.
  return z.union([
    // Under NDA: the row shows its columns and can't be opened.
    z.object({ ...row, locked: z.literal(true) }),
    z.strictObject({
      ...opened,
      images: z.object({
        // From 768 wide up, scaled to fit the image box.
        wide: themedImage,
        phone: themedImage,
      }),
    }),
    // The box runs the project's app live, comparing two looks of it.
    z.strictObject({
      ...opened,
      showcase: z.object({
        // A page on this site that runs the app alone, for an iframe.
        app: z.string().regex(/^\/(?!\/)/),
        stock: stills,
        brand: stills,
      }),
    }),
  ]);
}
