import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import StatementSection from './StatementSection.astro';

let html = '';

beforeAll(async () => {
  const container = await AstroContainer.create();
  html = await container.renderToString(StatementSection);
});

/** The statement's paragraph: its classes and what's inside it. */
function statement() {
  const [, classes = '', inside = ''] =
    /<p[^>]* class="([^"]*)"[^>]*>([\s\S]*?)<\/p>/.exec(html) ?? [];
  return { classes, inside };
}

/** The opening tag of the element marked with `attribute`. */
function tagWith(attribute: string) {
  return new RegExp(`<[a-z]+[^>]* ${attribute}(?:[ =>][^>]*)?>`).exec(
    html,
  )?.[0];
}

describe('the statement section', () => {
  it('says the statement, the last clause at full strength', () => {
    const { classes, inside } = statement();
    const text = inside.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ');

    expect(text.trim()).toBe(
      'Designs change on the way to launch. I design products and build them in code, so what ships is what was meant.',
    );
    expect(classes).toMatch(/\btext-text-muted\b/);
    expect(inside).toMatch(
      /<span[^>]* class="[^"]*\btext-text\b[^"]*"[^>]*>so what ships is what was meant\.<\/span>/,
    );
  });

  it('sets it in Display', () => {
    expect(statement().classes).toMatch(/\btext-display\b/);
  });

  // Hand-set line breaks only fit one phone width. From 768 up each
  // clause gets its own line; narrower, the lines balance themselves.
  it('breaks it by clause from 768 up, and balances it below', () => {
    const { classes, inside } = statement();
    const clauses = [...inside.matchAll(/<span[^>]* class="([^"]*)"/g)];

    expect(classes).toMatch(/\btext-balance\b/);
    expect(clauses).toHaveLength(3);
    for (const [, clauseClasses] of clauses) {
      expect(clauseClasses).toMatch(/\bmd:block\b/);
    }
  });

  // It's the page's opening words under the name, not a named section.
  it('has no heading, so the page’s headings stay in order', () => {
    expect(html).not.toMatch(/<h[1-6]/);
  });

  // In the middle, it's clear of the top bar when that slides back.
  it('sits in the middle of its own screen, in line with the hero', () => {
    const screen = tagWith('data-statement-screen') ?? '';

    expect(screen).toMatch(/\bh-plate\b/);
    expect(screen).toMatch(/\bitems-center\b/);
    expect(screen).toMatch(/\bmax-w-\(--breakpoint-2xl\)/);
  });

  // The extra half screen is scrolling the screen holds still for.
  it('holds still for half a screen of scrolling, unless motion is reduced', () => {
    const track = tagWith('data-statement') ?? '';
    const screen = tagWith('data-statement-screen') ?? '';

    expect(track).toMatch(
      /\bmotion-safe:h-\[calc\(var\(--spacing-plate\)\*1\.5\)\]/,
    );
    expect(track).not.toMatch(/(?<!motion-safe:)\bh-\[/);
    expect(screen).toMatch(/\bsticky\b/);
    expect(screen).toMatch(/\btop-0\b/);
  });

  // The clauses only wait to rise once a script has said it will run
  // them, so without scripts the statement is simply there.
  it('shows the statement as rendered, before any script runs', () => {
    expect(tagWith('data-statement')).not.toContain('data-waiting');
  });
});
