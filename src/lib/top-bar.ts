/**
 * How far, in pixels, the page has to scroll one way before the top bar
 * reacts, so a jittery trackpad or a resting thumb doesn't make it flicker.
 */
export const scrollSlack = 8;

/**
 * Whether the top bar is in view, and the scroll position where it last
 * changed. Scrolls are measured from there, so small steps add up.
 */
export interface TopBar {
  isShown: boolean;
  anchor: number;
}

export const topBarAtTop: TopBar = { isShown: true, anchor: 0 };

/**
 * The top bar after the page scrolls to `scrollY`: hidden on the way down,
 * back on any way up, and always shown at the very top.
 */
export function nextTopBar(
  bar: TopBar,
  scrollY: number,
  maxScrollY: number,
): TopBar {
  if (scrollY <= 0) return topBarAtTop;

  // Past the bottom is Safari stretching the page; springing back from
  // there isn't a scroll up.
  const position = Math.min(scrollY, maxScrollY);
  const distance = position - bar.anchor;
  if (Math.abs(distance) < scrollSlack) return bar;

  return { isShown: distance < 0, anchor: position };
}

/** The top bar after a link jumps the page to `scrollY`. */
export function landedTopBar(scrollY: number): TopBar {
  return scrollY <= 0 ? topBarAtTop : { isShown: false, anchor: scrollY };
}
