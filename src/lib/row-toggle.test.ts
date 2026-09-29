import { describe, expect, it } from 'vitest';
import { toggleRow, toggleWord } from './row-toggle';

/** Stand-ins for the button and its visible word. */
function closedRow() {
  const attributes = new Map([['aria-expanded', 'false']]);
  return {
    button: {
      getAttribute: (name: string) => attributes.get(name) ?? null,
      setAttribute: (name: string, value: string) =>
        void attributes.set(name, value),
    },
    word: { textContent: toggleWord.closed },
  };
}

describe('toggleRow', () => {
  it('opens a closed row', () => {
    const row = closedRow();

    const isOpen = toggleRow(row);

    expect(isOpen).toBe(true);
    expect(row.button.getAttribute('aria-expanded')).toBe('true');
    expect(row.word.textContent).toBe('Close');
  });

  it('closes an open row', () => {
    const row = closedRow();

    toggleRow(row);
    const isOpen = toggleRow(row);

    expect(isOpen).toBe(false);
    expect(row.button.getAttribute('aria-expanded')).toBe('false');
    expect(row.word.textContent).toBe('Open');
  });
});
