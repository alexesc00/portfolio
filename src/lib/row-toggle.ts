/** The word the button shows, which starts its name: "Open Plots". */
export const toggleWord = { closed: 'Open', open: 'Close' };

/** The parts of a works table row that change when it opens or closes. */
interface ToggleableRow {
  button: Pick<Element, 'getAttribute' | 'setAttribute'>;
  word: { textContent: string | null };
  /** The row under it that holds the write-up and images. */
  panel: Pick<HTMLElement, 'hidden'>;
}

/** Opens the row if it's closed, and closes it if it's open. */
export function toggleRow({ button, word, panel }: ToggleableRow) {
  const isOpen = button.getAttribute('aria-expanded') !== 'true';
  button.setAttribute('aria-expanded', String(isOpen));
  word.textContent = isOpen ? toggleWord.open : toggleWord.closed;
  panel.hidden = !isOpen;
}
