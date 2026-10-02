/*
 * A works table row opens like a drawer: the rows under it slide down to
 * uncover its write-up, and slide back up over it to close. How open a
 * drawer is runs from 0, shut, to 1, open.
 */

/** Where a drawer's slide starts and ends, in openness. */
export interface DrawerSlide {
  from: number;
  to: number;
}

/**
 * The slide for opening or closing a drawer. `openness` is where a drawer
 * still moving has got to, or null for one at rest.
 */
export function planDrawer({
  isOpening,
  openness,
}: {
  isOpening: boolean;
  openness: number | null;
}): DrawerSlide {
  const to = isOpening ? 1 : 0;
  return { from: openness ?? 1 - to, to };
}

/** How open the drawer is at eased `progress` through `slide`. */
export function opennessAt({ from, to }: DrawerSlide, progress: number) {
  return from + (to - from) * progress;
}

/**
 * How far above where the page puts them the rows under a drawer sit, in
 * pixels, to cover the part of a `height`-tall write-up that's shut.
 */
export function coverOffset(openness: number, height: number) {
  return (openness - 1) * height;
}
