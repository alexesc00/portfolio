import { describe, expect, it } from 'vitest';
import { imagesThatWillShow } from './row-images';

/** A stand-in element: hidden by its own styles or not, inside a parent. */
function element(isHidden: boolean, parentElement: FakeElement | null) {
  return { isHidden, parentElement };
}
type FakeElement = ReturnType<typeof element>;

function rowWith(build: (row: FakeElement) => FakeElement[]) {
  const row = element(true, null);
  const images = build(row);
  return {
    row: { ...row, querySelectorAll: () => images },
    images,
  };
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
