/*
 * The works table shows the MissionML Streamlit showcase as a comparison:
 * two copies of the app, stock Streamlit and the MissionML brand, one over
 * the other, split by a seam the visitor drags. Stills of both show first;
 * the live app runs in their place once Python has started.
 */

/**
 * The narrowest the app is drawn at, in pixels: its width in the box at
 * 1280 wide. Streamlit lays its columns out by the width it's drawn at and
 * stacks them below 640, so a narrower box draws the app at this width and
 * scales it down, keeping the same layout.
 */
export const narrowestAppWidth = 766;

/** How to draw the app to fill a screen `width` × `height` pixels. */
export function fitApp(width: number, height: number) {
  if (width <= 0 || height <= 0) return { width: 0, height: 0, scale: 1 };
  const scale = Math.min(1, width / narrowestAppWidth);
  return { width: width / scale, height: height / scale, scale };
}

/** The seam's position, as a percentage of the screen from the left. */
export function clampSeam(percent: number) {
  return Math.min(100, Math.max(0, percent));
}

/**
 * How much of each tag shows, from 0 to 1, with the seam `seamX` pixels
 * from the screen's left. A tag names the look on its side of the seam,
 * so as the seam comes within `reach` of it the tag fades out, gone by
 * the time the seam touches it: the look it names is mostly covered.
 */
export function shownTags(
  seamX: number,
  tags: { stockRight: number; brandLeft: number },
  reach: number,
) {
  const shown = (distance: number) =>
    Math.min(1, Math.max(0, distance / reach));
  return {
    stock: shown(seamX - tags.stockRight),
    brand: shown(tags.brandLeft - seamX),
  };
}

/**
 * Where the seam goes when `key` is pressed on it, or null for a key that
 * doesn't move it. `isBigStep` is Shift held down.
 */
export function seamAfterKey(percent: number, key: string, isBigStep: boolean) {
  const step = isBigStep ? 10 : 2;
  switch (key) {
    case 'ArrowLeft':
      return clampSeam(percent - step);
    case 'ArrowRight':
      return clampSeam(percent + step);
    case 'Home':
      return 0;
    case 'End':
      return 100;
    default:
      return null;
  }
}

export type ShowcaseStatus = 'still' | 'starting' | 'live';
