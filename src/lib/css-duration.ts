/**
 * A CSS duration, like a `--transition-duration-*` token's value, in
 * milliseconds. The production build writes a duration in seconds when
 * that's shorter (533ms becomes .533s), so both have to be read.
 */
export function millisecondsOf(value: string) {
  const duration = value.trim();
  return duration.endsWith('ms')
    ? parseFloat(duration)
    : parseFloat(duration) * 1000;
}
