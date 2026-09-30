import { describe, expect, it } from 'vitest';
import { imagesThatWillShow } from './row-images';

/** A stand-in element: hidden by its own styles or not, inside a parent. */
interface FakeElement {
  isHidden: boolean;
  parentElement: FakeElement | null;
}

function element(
  isHidden: boolean,
  parentElement: FakeElement | null,
): FakeElement {
  return { isHidden, parentElement };
}

function rowWith(build: (row: FakeElement) => FakeElement[]) {
  const row = Object.assign(element(true, null), {
    querySelectorAll: () => images,
  });
  const images = build(row);
  return { row, images };
}

const isHidden = (candidate: FakeElement) => candidate.isHidden;

describe('imagesThatWillShow', () => {
  it('picks the images the row will show, though the row itself is shut', () => {
    const { row, images } = rowWith((row) => [
      element(false, row),
      element(true, row),
    ]);
    expect(imagesThatWillShow(row, isHidden)).toEqual([images[0]]);
  });

  it('skips an image whose wrapper is hidden', () => {
    const { row, images } = rowWith((row) => {
      const shownWrapper = element(false, row);
      const hiddenWrapper = element(true, row);
      return [element(false, shownWrapper), element(false, hiddenWrapper)];
    });
    expect(imagesThatWillShow(row, isHidden)).toEqual([images[0]]);
  });

  it('finds none in a row with nothing that will show', () => {
    const { row } = rowWith((row) => [element(true, row)]);
    expect(imagesThatWillShow(row, isHidden)).toEqual([]);
  });
});
