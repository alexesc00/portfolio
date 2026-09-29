import { describe, expect, it } from 'vitest';
import { toggleRow, toggleWord } from './row-toggle';

/** Stand-ins for the button, its visible word and the opened row. */
function closedRow() {
  const attributes = new Map([['aria-expanded', 'false']]);
  return {
    button: {
      getAttribute: (name: string) => attributes.get(name) ?? null,
      setAttribute: (name: string, value: string) =>
        void attributes.set(name, value),
    },
    word: { textContent: toggleWord.closed },
    panel: { hidden: true },
  };
}

describe('toggleRow', () => {
  it('opens a closed row', () => {
    const row = closedRow();

    toggleRow(row);

    expect(row.button.getAttribute('aria-expanded')).toBe('true');
    expect(row.panel.hidden).toBe(false);
    expect(row.word.textContent).toBe('Close');
  });

  it('closes an open row', () => {
    const row = closedRow();

    toggleRow(row);
    toggleRow(row);

    expect(row.button.getAttribute('aria-expanded')).toBe('false');
    expect(row.panel.hidden).toBe(true);
    expect(row.word.textContent).toBe('Open');
  });
});
