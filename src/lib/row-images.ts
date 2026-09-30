/** The parts of an element the search walks through. */
interface Nested<T> {
  parentElement: T | null;
}

/**
 * The images a shut works table row will show once it opens. Each image
 * comes in versions for wide screens and phones, dark and light, and all
 * but one are hidden by their own styles or their wrapper's. The row is
 * hidden too while shut, so the walk up from each image stops below it.
 */
export function imagesThatWillShow<T extends Nested<T>, I extends T>(
  row: T & { querySelectorAll: (selector: 'img') => Iterable<I> },
  isHidden: (element: T) => boolean,
) {
  return [...row.querySelectorAll('img')].filter((image) => {
    for (
      let element: T | null = image;
      element && element !== row;
      element = element.parentElement
    ) {
      if (isHidden(element)) return false;
    }
    return true;
  });
}
