/*
 * The self-statement's clauses rise into place once most of its screen
 * is showing. They stay in place while it leaves, and wait again once it
 * has left the screen entirely, so they rise whenever the visitor comes
 * back to it.
 */

/** How much of the statement's screen has to show for it to arrive. */
export const arrivesAt = 0.6;

/** Whether the statement has arrived, with `visibleRatio` of it showing. */
export function hasArrived(wasArrived: boolean, visibleRatio: number) {
  if (visibleRatio >= arrivesAt) return true;
  if (visibleRatio <= 0) return false;
  return wasArrived;
}
