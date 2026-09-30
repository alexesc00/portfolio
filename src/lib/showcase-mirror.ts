/*
 * Keeps two live copies of the showcase in step by replaying what the
 * visitor does in one onto the other. Both copies draw the same page,
 * element for element (only the CSS differs), so an element is found in
 * the other copy by its position in the page, not by where it sits on
 * screen: the brand changes sizes, so screen points drift. A pointer's
 * position is carried over as a fraction of the element under it.
 *
 * Replayed events are synthetic (isTrusted is false), which is how the
 * other copy's listeners tell them apart and don't send them back.
 */

const pointerTypes = [
  'pointerdown',
  'mousedown',
  'pointermove',
  'mousemove',
  'pointerup',
  'mouseup',
  'click',
  'dblclick',
] as const;
const keyTypes = ['keydown', 'keypress', 'keyup'] as const;

/** Where `element` sits in its page, as child indexes from the root. */
function pathOf(element: Element) {
  const path: number[] = [];
  for (let node = element; node.parentElement; node = node.parentElement) {
    path.unshift([...node.parentElement.children].indexOf(node));
  }
  return path;
}

function elementAt(document: Document, path: number[]) {
  let node: Element | undefined = document.documentElement;
  for (const index of path) {
    node = node.children[index];
    if (!node) return null;
  }
  return node;
}

// The events come from inside an iframe, whose Element and PointerEvent
// aren't this page's, so `instanceof` can't be used on them.
const isElement = (target: EventTarget | null): target is Element =>
  (target as Node | null)?.nodeType === 1;

/** Replays the visitor's input in document `from` onto document `to`. */
export function mirror(from: Document, to: Document) {
  const window = to.defaultView;
  if (!window) return;
  // The element a press started on, so a drag maps from where it began
  let anchor: Element | null = null;

  const counterpart = (target: EventTarget | null) =>
    isElement(target) ? elementAt(to, pathOf(target)) : null;

  function mapPoint(event: MouseEvent, reference: Element) {
    const a = reference.getBoundingClientRect();
    const b = counterpart(reference)?.getBoundingClientRect();
    if (!b || !a.width || !a.height) {
      return { x: event.clientX, y: event.clientY };
    }
    return {
      x: b.left + ((event.clientX - a.left) / a.width) * b.width,
      y: b.top + ((event.clientY - a.top) / a.height) * b.height,
    };
  }

  for (const type of pointerTypes) {
    from.addEventListener(
      type,
      (event: MouseEvent) => {
        if (!event.isTrusted) return;
        const isMove = type.endsWith('move');
        const isRelease = type.endsWith('up');
        // Hover moves change nothing; only drags need carrying over
        if (isMove && !event.buttons) return;
        if (type === 'pointerdown' || type === 'mousedown') {
          anchor = isElement(event.target) ? event.target : null;
        }
        const reference =
          isMove || isRelease ? (anchor ?? event.target) : event.target;
        if (!isElement(reference)) return;
        const { x, y } = mapPoint(event, reference);
        // Mid-drag the pointer can leave the element it pressed. Streamlit's
        // sliders listen on the whole page, so the page gets it there.
        const target =
          (isMove || isRelease) && event.target === from.documentElement
            ? to.documentElement
            : (counterpart(event.target) ?? to.elementFromPoint(x, y));
        if (!target) return;
        const init: PointerEventInit = {
          bubbles: true,
          cancelable: true,
          composed: true,
          view: window,
          clientX: x,
          clientY: y,
          screenX: x,
          screenY: y,
          button: event.button,
          buttons: event.buttons,
          detail: event.detail,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
        };
        if ('pointerId' in event) {
          const { pointerId, pointerType, isPrimary } = event as PointerEvent;
          Object.assign(init, { pointerId, pointerType, isPrimary });
        }
        target.dispatchEvent(
          type.startsWith('pointer')
            ? new window.PointerEvent(type, init)
            : new window.MouseEvent(type, init),
        );
        if (type === 'pointerup' || type === 'mouseup') {
          // After this release's click has gone through too
          setTimeout(() => (anchor = null));
        }
      },
      true,
    );
  }

  for (const type of keyTypes) {
    from.addEventListener(
      type,
      (event: KeyboardEvent) => {
        if (!event.isTrusted) return;
        counterpart(event.target)?.dispatchEvent(
          new window.KeyboardEvent(type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: window,
            key: event.key,
            code: event.code,
            // Streamlit still reads these older fields on some widgets
            keyCode: event.keyCode,
            charCode: event.charCode,
            which: event.which,
            repeat: event.repeat,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            metaKey: event.metaKey,
            ctrlKey: event.ctrlKey,
          }),
        );
      },
      true,
    );
  }

  // Replayed keys can't type, so text carries its value instead
  from.addEventListener(
    'input',
    (event) => {
      if (!event.isTrusted) return;
      const source = event.target as HTMLInputElement | null;
      const target = counterpart(source);
      if (
        typeof source?.value !== 'string' ||
        !(
          target instanceof window.HTMLInputElement ||
          target instanceof window.HTMLTextAreaElement
        )
      ) {
        return;
      }
      // React tracks a field's value itself; setting it through the
      // prototype's setter is what makes it notice the change
      const prototype =
        target instanceof window.HTMLTextAreaElement
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(
        target,
        source.value,
      );
      target.dispatchEvent(new window.Event('input', { bubbles: true }));
    },
    true,
  );

  // Leaving a field commits it in Streamlit. The other copy's field never
  // had focus, so it's told the field was left.
  from.addEventListener(
    'focusout',
    (event) => {
      if (!event.isTrusted) return;
      counterpart(event.target)?.dispatchEvent(
        new window.FocusEvent('focusout', { bubbles: true, composed: true }),
      );
    },
    true,
  );

  // The element that scrolls is the same element in both
  from.addEventListener(
    'scroll',
    (event) => {
      const source =
        event.target === from ? from.scrollingElement : event.target;
      const target =
        event.target === from ? to.scrollingElement : counterpart(event.target);
      if (!isElement(source) || !target) return;
      if (Math.abs(target.scrollTop - source.scrollTop) > 1) {
        target.scrollTop = source.scrollTop;
      }
    },
    true,
  );
}
