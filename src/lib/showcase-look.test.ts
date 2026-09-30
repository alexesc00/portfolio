import { describe, expect, it } from 'vitest';
import {
  parseEntrypoint,
  parseLook,
  parseLookMessage,
  parseStreamlitTheme,
  stockTheme,
  themeMessage,
} from './showcase-look';

describe('parseLook', () => {
  it('reads stock', () => {
    expect(parseLook('stock')).toBe('stock');
  });

  it('falls back to the brand look for anything else', () => {
    expect(parseLook('brand')).toBe('brand');
    expect(parseLook('raw')).toBe('brand');
    expect(parseLook('')).toBe('brand');
    expect(parseLook(null)).toBe('brand');
  });
});

describe('parseEntrypoint', () => {
  it('runs the one-screen sampler for view=sampler', () => {
    expect(parseEntrypoint('sampler')).toBe('sampler.py');
  });

  it('runs the whole catalog otherwise', () => {
    expect(parseEntrypoint(null)).toBe('app.py');
    expect(parseEntrypoint('')).toBe('app.py');
    expect(parseEntrypoint('../secrets')).toBe('app.py');
  });
});

describe('parseLookMessage', () => {
  it('reads a look message from the parent page', () => {
    expect(parseLookMessage({ showcase: 'look', look: 'stock' })).toBe('stock');
    expect(parseLookMessage({ showcase: 'look', look: 'brand' })).toBe('brand');
  });

  it('ignores other messages', () => {
    expect(parseLookMessage({ showcase: 'look', look: 'purple' })).toBeNull();
    expect(parseLookMessage({ showcase: 'ready' })).toBeNull();
    expect(parseLookMessage({ stCommVersion: 1 })).toBeNull();
    expect(parseLookMessage('look')).toBeNull();
    expect(parseLookMessage(null)).toBeNull();
  });
});

const showcaseConfig = `[theme]
base = "light"
primaryColor = "#5A6378"
backgroundColor = "#F8F8F8"
secondaryBackgroundColor = "#E8EAEC"
textColor = "#2A2F35"
font = "sans-serif"

[theme.sidebar]
backgroundColor = "#E1E4E8"
linkColor = "#1D1F23"

[client]
toolbarMode = "minimal"
`;

describe('parseStreamlitTheme', () => {
  it('reads the colors from the top-level theme table', () => {
    expect(parseStreamlitTheme(showcaseConfig)).toEqual({
      base: 0,
      primaryColor: '#5A6378',
      backgroundColor: '#F8F8F8',
      secondaryBackgroundColor: '#E8EAEC',
      textColor: '#2A2F35',
    });
  });

  it('ignores the sidebar table, even with the same keys', () => {
    expect(parseStreamlitTheme(showcaseConfig).backgroundColor).toBe('#F8F8F8');
  });

  it('reads a dark base', () => {
    expect(parseStreamlitTheme('[theme]\nbase = "dark"\n').base).toBe(1);
  });

  it('returns nothing when there is no theme table', () => {
    expect(parseStreamlitTheme('[client]\ntoolbarMode = "minimal"\n')).toEqual(
      {},
    );
  });
});

describe('themeMessage', () => {
  it('builds the message Streamlit accepts to change its theme', () => {
    expect(themeMessage(stockTheme)).toEqual({
      stCommVersion: 1,
      type: 'SET_CUSTOM_THEME_CONFIG',
      themeName: 'Custom Theme',
      themeInfo: { base: 0 },
    });
  });
});
