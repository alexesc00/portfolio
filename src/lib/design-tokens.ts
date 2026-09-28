/*
 * Checks that the Figma file's variables match the design tokens in
 * global.css. Figma only lets Enterprise plans read variables from
 * outside the app, so the variables are exported into a snapshot file
 * that lives next to global.css, and the two are compared here.
 */

/** A token's value, and the light mode and desktop values replacing it. */
export interface CssToken {
  base: string;
  light?: string;
  desktop?: string;
}

/** A variable's value in one mode: a value, or a pointer to another token. */
export type FigmaValue = string | number | number[] | { alias: string };

export interface FigmaVariable {
  name: string;
  /** The token it stands for, from the variable's CSS code syntax. */
  css: string;
  type: 'COLOR' | 'FLOAT' | 'TIMING' | 'EASING';
  values: Record<string, FigmaValue>;
}

export interface FigmaSnapshot {
  collections: {
    name: string;
    modes: string[];
    variables: FigmaVariable[];
  }[];
}
