import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import Colophon from './Colophon.astro';

let html = '';

beforeAll(async () => {
  const container = await AstroContainer.create();
  html = await container.renderToString(Colophon);
});

/** The link whose text starts with `name`, from its opening tag to its end. */
function linkNamed(name: string) {
  const match = new RegExp(
    `<a [^>]*>\\s*<span[^>]*>${name}</span>[\\s\\S]*?</a>`,
  ).exec(html);
  return match?.[0] ?? '';
}

describe('the colophon', () => {
  it('links "Figma" to the design file', () => {
    expect(linkNamed('Figma')).toContain(
      'href="https://www.figma.com/design/esBGpA3T7eNNwb5iqeb23G/Portfolio-DS"',
    );
  });

  it('styles the Figma link like the GitHub link', () => {
    const classes = (link: string) => /class="([^"]*)"/.exec(link)?.[1];

    expect(classes(linkNamed('Figma'))).toBe(classes(linkNamed('GitHub')));
  });
});
