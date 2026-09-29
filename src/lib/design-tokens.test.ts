import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  compareWithFigma,
  readCssTokens,
  type FigmaSnapshot,
} from './design-tokens';

/** A small global.css with one of each kind of token. */
const css = `
@theme inline {
  --font-sans: var(--font-grotesk);
}

@theme static {
  --color-*: initial;
  --color-background: #10100f;
  --color-foreground: #f7f7f3;
  --color-text: var(--color-foreground);
  /* Every color is the foreground at an opacity. */
  --color-text-muted: color-mix(
    in oklab,
    var(--color-foreground) 60%,
    transparent
  );
  --text-interface: 0.875rem;
  --text-interface--letter-spacing: 0.01em;
  --text-interface--font-weight: var(--weight-interface);
  --text-mark: min(60svh, 97.8vw);
  --breakpoint-2xl: 90rem;
  --spacing-page: 1rem;
  --ease-out: cubic-bezier(0.19, 1, 0.22, 1);
  --transition-duration-reveal: 700ms;
}

@layer base {
  :root {
    color-scheme: dark;
    --weight-interface: 500;

    @variant md {
      --spacing-page: 3rem;
    }

    @variant light {
      color-scheme: light;
      --color-background: #f7f7f3;
      --color-foreground: #10100f;
      --weight-interface: 400;
    }
  }
}
`;

/** What Figma exports for the CSS above, when the two match. */
function matchingSnapshot(): FigmaSnapshot {
  return {
    collections: [
      {
        name: 'Color',
        modes: ['Dark', 'Light'],
        variables: [
          {
            name: 'background',
            css: '--color-background',
            type: 'COLOR',
            values: { Dark: '#10100f', Light: '#f7f7f3' },
          },
          {
            name: 'foreground',
            css: '--color-foreground',
            type: 'COLOR',
            values: { Dark: '#f7f7f3', Light: '#10100f' },
          },
          {
            name: 'text',
            css: '--color-text',
            type: 'COLOR',
            values: {
              Dark: { alias: '--color-foreground' },
              Light: { alias: '--color-foreground' },
            },
          },
          {
            name: 'text-muted',
            css: '--color-text-muted',
            type: 'COLOR',
            values: { Dark: '#f7f7f399', Light: '#10100f99' },
          },
          {
            name: 'weight-interface',
            css: '--weight-interface',
            type: 'FLOAT',
            values: { Dark: 500, Light: 400 },
          },
        ],
      },
      {
        name: 'Layout',
        modes: ['Desktop', 'Phone'],
        variables: [
          {
            name: 'text/interface',
            css: '--text-interface',
            type: 'FLOAT',
            values: { Desktop: 14, Phone: 14 },
          },
          {
            name: 'text/interface-letter-spacing',
            css: '--text-interface--letter-spacing',
            type: 'FLOAT',
            values: { Desktop: 1, Phone: 1 },
          },
          {
            name: 'text/interface-weight',
            css: '--text-interface--font-weight',
            type: 'FLOAT',
            values: {
              Desktop: { alias: '--weight-interface' },
              Phone: { alias: '--weight-interface' },
            },
          },
          {
            name: 'spacing/page',
            css: '--spacing-page',
            type: 'FLOAT',
            values: { Desktop: 48, Phone: 16 },
          },
        ],
      },
      {
        name: 'Motion',
        modes: ['Default'],
        variables: [
          {
            name: 'ease/out',
            css: '--ease-out',
            type: 'EASING',
            values: { Default: [0.19, 1, 0.22, 1] },
          },
          {
            name: 'duration/reveal',
            css: '--transition-duration-reveal',
            type: 'TIMING',
            values: { Default: 0.7 },
          },
        ],
      },
    ],
  };
}

/** The snapshot's variable for the token `css`, to change in a test. */
function variableFor(snapshot: FigmaSnapshot, css: string) {
  const variable = snapshot.collections
    .flatMap((collection) => collection.variables)
    .find((candidate) => candidate.css === css);
  if (!variable) throw new Error(`No ${css} in the snapshot`);
  return variable;
}

describe('readCssTokens', () => {
  const tokens = readCssTokens(css);

  it('reads each token’s value', () => {
    expect(tokens.get('--color-background')?.base).toBe('#10100f');
    expect(tokens.get('--transition-duration-reveal')?.base).toBe('700ms');
  });

  it('reads the light mode and desktop values that replace it', () => {
    expect(tokens.get('--color-background')?.light).toBe('#f7f7f3');
    expect(tokens.get('--spacing-page')).toEqual({
      base: '1rem',
      desktop: '3rem',
    });
  });

  it('reads tokens set outside the theme block', () => {
    expect(tokens.get('--weight-interface')).toEqual({
      base: '500',
      light: '400',
    });
  });

  it('keeps a value written over several lines whole', () => {
    expect(tokens.get('--color-text-muted')?.base).toBe(
      'color-mix(in oklab, var(--color-foreground) 60%, transparent)',
    );
  });

  it('skips resets and properties that aren’t tokens', () => {
    expect(tokens.has('--color-*')).toBe(false);
    expect(tokens.has('color-scheme')).toBe(false);
  });
});

describe('compareWithFigma', () => {
  const tokens = readCssTokens(css);

  it('finds no difference when Figma matches, whatever the units', () => {
    expect(compareWithFigma(tokens, matchingSnapshot())).toEqual([]);
  });

  it('reports a value that differs, with both sides', () => {
    const snapshot = matchingSnapshot();
    variableFor(snapshot, '--spacing-page').values.Desktop = 40;

    expect(compareWithFigma(tokens, snapshot)).toEqual([
      '--spacing-page, Desktop: Figma has 40, global.css has 3rem',
    ]);
  });

  it('reports a color whose opacity differs', () => {
    const snapshot = matchingSnapshot();
    variableFor(snapshot, '--color-text-muted').values.Light = '#10100f66';

    expect(compareWithFigma(tokens, snapshot)).toEqual([
      '--color-text-muted, Light: Figma has #10100f66, global.css has color-mix(in oklab, var(--color-foreground) 60%, transparent)',
    ]);
  });

  it('reports a token Figma doesn’t have', () => {
    const snapshot = matchingSnapshot();
    snapshot.collections[2].variables.pop();

    expect(compareWithFigma(tokens, snapshot)).toEqual([
      '--transition-duration-reveal is in global.css but not in Figma',
    ]);
  });

  it('reports a Figma variable global.css doesn’t have', () => {
    const snapshot = matchingSnapshot();
    snapshot.collections[0].variables.push({
      name: 'accent',
      css: '--color-accent',
      type: 'COLOR',
      values: { Dark: '#ff0000', Light: '#ff0000' },
    });

    expect(compareWithFigma(tokens, snapshot)).toEqual([
      '--color-accent is in Figma but not in global.css',
    ]);
  });

  it('doesn’t expect Figma to hold the font family or the Æ’s screen-based size', () => {
    const differences = compareWithFigma(tokens, matchingSnapshot());

    expect(differences.join('\n')).not.toContain('--font-sans');
    expect(differences.join('\n')).not.toContain('--text-mark');
  });

  it('doesn’t expect Figma to hold the breakpoints', () => {
    const differences = compareWithFigma(tokens, matchingSnapshot());

    expect(differences.join('\n')).not.toContain('--breakpoint-');
  });
});

describe('the Figma file', () => {
  it('has variables that match every design token in global.css', () => {
    const globalCss = readFileSync('src/styles/global.css', 'utf8');
    const snapshot = JSON.parse(
      readFileSync('src/styles/figma-variables.json', 'utf8'),
    ) as FigmaSnapshot;

    expect(compareWithFigma(readCssTokens(globalCss), snapshot)).toEqual([]);
  });
});
