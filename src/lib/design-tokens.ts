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

/*
 * Tokens Figma has no variable for, on purpose. The font family is set
 * in Figma's text styles instead, and the Æ's size is a formula of the
 * screen size, which a variable can't hold.
 */
const notInFigma = [/^--font-/, /^--text-mark/];

const tolerance = 0.001;

/**
 * Every design token in `css`: each custom property, with the value it
 * takes in light mode and on desktop where those replace it.
 */
export function readCssTokens(css: string): Map<string, CssToken> {
  const tokens = new Map<string, CssToken>();
  const blocks: string[] = [];
  let text = '';

  function record() {
    const match = /^\s*(--[\w-]+)\s*:([\s\S]+)$/.exec(text);
    text = '';
    if (!match) return;
    const [, name, raw] = match;
    const value = raw
      .replace(/\s+/g, ' ')
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      .trim();
    const token = tokens.get(name) ?? { base: '' };
    if (blocks.includes('@variant light')) token.light = value;
    else if (blocks.includes('@variant md')) token.desktop = value;
    else token.base = value;
    tokens.set(name, token);
  }

  for (const char of css.replace(/\/\*[\s\S]*?\*\//g, '')) {
    if (char === '{') {
      blocks.push(text.trim());
      text = '';
    } else if (char === '}') {
      record();
      blocks.pop();
    } else if (char === ';') {
      record();
    } else {
      text += char;
    }
  }
  // A reset like --color-*: initial clears Tailwind's defaults; it isn't a token.
  for (const name of tokens.keys()) if (name.includes('*')) tokens.delete(name);
  return tokens;
}

/** The token's value in a Figma mode: dark, phone and default are the base. */
function valueInMode(token: CssToken, mode: string): string {
  if (mode === 'Light') return token.light ?? token.base;
  if (mode === 'Desktop') return token.desktop ?? token.base;
  return token.base;
}

/** A color as Figma exports it: hex, with two more digits for opacity. */
function cssColor(
  value: string,
  resolve: (name: string) => string,
): string | null {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  const mix =
    /^color-mix\(in oklab, var\((--[\w-]+)\) ([\d.]+)%, transparent\)$/.exec(
      value,
    );
  if (!mix) return null;
  const base = cssColor(resolve(mix[1]), resolve);
  if (!base) return null;
  const alpha = Math.round((Number(mix[2]) / 100) * 255);
  return base + alpha.toString(16).padStart(2, '0');
}

/**
 * A size as Figma holds it: pixels, or for letter spacing a percentage
 * of the text size, which is what an em is.
 */
function cssNumber(value: string): number | null {
  const match = /^(-?[\d.]+)(rem|px|em)?$/.exec(value);
  if (!match) return null;
  const number = Number(match[1]);
  if (match[2] === 'rem') return number * 16;
  if (match[2] === 'em') return number * 100;
  return number;
}

/** A duration as Figma holds it, in seconds. */
function cssSeconds(value: string): number | null {
  const match = /^([\d.]+)(ms|s)$/.exec(value);
  if (!match) return null;
  return match[2] === 'ms' ? Number(match[1]) / 1000 : Number(match[1]);
}

function cssBezier(value: string): number[] | null {
  const match = /^cubic-bezier\(([^)]+)\)$/.exec(value);
  return match ? match[1].split(',').map(Number) : null;
}

function isClose(a: number, b: number | null): boolean {
  return b !== null && Math.abs(a - b) < tolerance;
}

function matches(
  variable: FigmaVariable,
  figma: FigmaValue,
  css: string,
  resolve: (name: string) => string,
): boolean {
  if (typeof figma === 'object' && !Array.isArray(figma)) {
    return css === `var(${figma.alias})`;
  }
  if (variable.type === 'COLOR' && typeof figma === 'string') {
    return figma.toLowerCase() === cssColor(css, resolve);
  }
  if (variable.type === 'FLOAT' && typeof figma === 'number') {
    return isClose(figma, cssNumber(css));
  }
  if (variable.type === 'TIMING' && typeof figma === 'number') {
    return isClose(figma, cssSeconds(css));
  }
  if (variable.type === 'EASING' && Array.isArray(figma)) {
    const bezier = cssBezier(css);
    return (
      bezier !== null &&
      bezier.length === figma.length &&
      figma.every((number, i) => isClose(number, bezier[i]))
    );
  }
  return false;
}

function describe(value: FigmaValue): string {
  if (Array.isArray(value)) return `cubic-bezier(${value.join(', ')})`;
  if (typeof value === 'object') return `var(${value.alias})`;
  return String(value);
}

/**
 * Every difference between the design tokens and the Figma variables,
 * in words. Nothing is right by default: a person fixes whichever side
 * is wrong.
 */
export function compareWithFigma(
  tokens: Map<string, CssToken>,
  snapshot: FigmaSnapshot,
): string[] {
  const differences: string[] = [];
  const inFigma = new Set<string>();

  for (const collection of snapshot.collections) {
    for (const variable of collection.variables) {
      inFigma.add(variable.css);
      const token = tokens.get(variable.css);
      if (!token) {
        differences.push(`${variable.css} is in Figma but not in global.css`);
        continue;
      }
      for (const mode of collection.modes) {
        const figma = variable.values[mode];
        const css = valueInMode(token, mode);
        const resolve = (name: string) => {
          const referenced = tokens.get(name);
          return referenced ? valueInMode(referenced, mode) : '';
        };
        if (!matches(variable, figma, css, resolve)) {
          differences.push(
            `${variable.css}, ${mode}: Figma has ${describe(figma)}, global.css has ${css}`,
          );
        }
      }
    }
  }

  for (const name of tokens.keys()) {
    if (inFigma.has(name) || notInFigma.some((skip) => skip.test(name))) {
      continue;
    }
    differences.push(`${name} is in global.css but not in Figma`);
  }
  return differences;
}
