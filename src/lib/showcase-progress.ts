/*
 * How far the showcase has got starting up, as a percentage. stlite
 * downloads Python in a web worker the page can't see into, so there are
 * no bytes to count, and a return visit downloads nothing at all. What it
 * does report is each start-up step, by name. Each step is placed at the
 * share of the wait that had passed when it began, timed on the live site
 * on first and return visits; the app drawing is 100%.
 */
const stepPercents: Record<string, number> = {
  'Loading Pyodide': 15,
  'Mounting files': 40,
  'Unpacking archives': 42,
  'Mocking some packages': 45,
  'Installing packages': 47,
  'Loading streamlit package': 80,
  'Setting up the loggers': 88,
  'Mocking some Streamlit functions for the browser environment': 89,
  'Booting up the Streamlit server': 90,
};

/** Where the stlite step named in `message` begins, or null if it isn't one. */
export function stepProgress(message: string) {
  return stepPercents[message.trim().replace(/\.$/, '')] ?? null;
}

/**
 * A copy of the app tells the page `{ showcase: 'progress', percent }` as
 * it starts. Returns that percentage, or null for any other message.
 */
export function parseProgressMessage(data: unknown) {
  if (typeof data !== 'object' || data === null) return null;
  const { showcase, percent } = data as Record<string, unknown>;
  if (showcase !== 'progress' || typeof percent !== 'number') return null;
  return percent >= 0 && percent <= 100 ? percent : null;
}
