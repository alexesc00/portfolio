/** The word the button shows, which starts its name: "Open Plots". */
export const toggleWord = { closed: 'Open', open: 'Close' };

/** The parts of a works table row that say whether it's open. */
interface ToggleableRow {
  button: Pick<Element, 'getAttribute' | 'setAttribute'>;
  word: { textContent: string | null };
}

/**
 * Marks the row open if it's closed, and closed if it's open, and returns
 * whether it's now open. Showing and hiding the write-up is the drawer's
 * job, since a closing one stays in view until it's covered.
 */
export function toggleRow({ button, word }: ToggleableRow) {
  const isOpen = button.getAttribute('aria-expanded') !== 'true';
  button.setAttribute('aria-expanded', String(isOpen));
  word.textContent = isOpen ? toggleWord.open : toggleWord.closed;
  return isOpen;
}
