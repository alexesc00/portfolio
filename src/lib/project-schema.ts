import type { SchemaContext } from 'astro:content';
import { z } from 'astro/zod';

/*
 * Character limits measured in Figma with the real fonts. Each column's
 * text fits on one line at the narrowest screen that shows the column,
 * and the two paragraphs fit beside the image box at 1280 wide, the
 * tightest width for them.
 */
const maxLength = {
  category: 22,
  solution: 60,
  whatIDid: 56,
  firstParagraph: 270,
  secondParagraph: 310,
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

  return z.discriminatedUnion('locked', [
    // Under NDA: the row shows its columns and can't be opened.
    z.object({ ...row, locked: z.literal(true) }),
    z.object({
      ...row,
      locked: z.literal(false),
      // Shown as the write-up's heading and in the button's name.
      name: text,
      writeUp: z.tuple([
        text.max(maxLength.firstParagraph),
        text.max(maxLength.secondParagraph),
      ]),
      images: z.object({
        // From 768 wide up, scaled to fit the image box.
        wide: themedImage,
        phone: themedImage,
      }),
      link: z.object({ url: z.url({ protocol: /^https$/ }), text }).optional(),
    }),
  ]);
}
