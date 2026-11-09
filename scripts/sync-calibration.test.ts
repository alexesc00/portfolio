import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildPages,
  license,
  pages,
  rewritePage,
  syncCalibration,
} from './sync-calibration.mjs';

const script = fileURLToPath(new URL('sync-calibration.mjs', import.meta.url));

// A page as the exercise folder has it: links to the other pages by file
// name, and the font's license named in a stylesheet comment.
function sourcePage(title: string) {
  return `<!doctype html>
<html lang="en">
<head>
<title>${title}</title>
<style>/* License in fonts/OFL.txt. */</style>
</head>
<body>
<a href="Calibration%20blueprint.html">Blueprint</a>
<a href="Calibration%20decide%20record.html#q2">Decide record</a>
</body>
</html>
`;
}

let folder = '';
beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'calibration-'));
});
afterEach(() => rmSync(folder, { recursive: true, force: true }));

/** An exercise folder with every page and the license in it. */
function makeSource() {
  const source = join(folder, 'exercise');
  mkdirSync(join(source, 'fonts'), { recursive: true });
  for (const file of Object.keys(pages)) {
    writeFileSync(join(source, file), sourcePage(file));
  }
  writeFileSync(join(source, license), 'SIL Open Font License');
  return source;
}

/** Runs the script the way npm does, from a folder standing in for the repo. */
function runScript(source: string) {
  return execFileSync(process.execPath, [script, source], {
    cwd: folder,
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

describe('a Calibration page, as the site serves it', () => {
  const page = rewritePage(
    'Calibration author.html',
    sourcePage('Calibration Author'),
  );

  it('links to the other pages by their paths in the site', () => {
    expect(page).toContain('href="/calibration/"');
    expect(page).toContain('href="/calibration/decide/#q2"');
    expect(page).not.toContain('.html"');
  });

  it('stays out of search results', () => {
    expect(page).toContain(
      '<meta name="robots" content="noindex">\n<title>Calibration Author</title>',
    );
  });

  it('names the license by its path in the site', () => {
    expect(page).toContain('License in /calibration/fonts/OFL.txt.');
  });

  it('refuses a link to a page that isn’t copied', () => {
    expect(() =>
      rewritePage(
        'a.html',
        '<title>A</title><a href="Calibration%20drafts.html">Drafts</a>',
      ),
    ).toThrow("a.html links to Calibration%20drafts.html, which isn't copied.");
  });

  it('refuses a page without a title', () => {
    expect(() => rewritePage('a.html', '<p>No head</p>')).toThrow(
      'a.html has no <title>',
    );
  });
});

describe('syncing the pages', () => {
  it('writes each page at its path, with the license beside them', () => {
    const source = makeSource();
    const target = join(folder, 'site');
    expect(syncCalibration(source, target)).toBe(5);
    for (const path of Object.values(pages)) {
      const html = readFileSync(join(target, path, 'index.html'), 'utf8');
      expect(html).toContain('<meta name="robots" content="noindex">');
    }
    expect(readFileSync(join(target, license), 'utf8')).toBe(
      'SIL Open Font License',
    );
  });

  it('checks the license is there before writing anything', () => {
    const source = makeSource();
    rmSync(join(source, license));
    expect(() => buildPages(source)).toThrow('fonts/OFL.txt is missing');
  });

  it('runs from the command line, into public/calibration', () => {
    const output = runScript(makeSource());
    expect(output).toBe(
      'Copied 5 pages and the font license to public/calibration\n',
    );
    expect(
      existsSync(join(folder, 'public/calibration/write/index.html')),
    ).toBe(true);
  });

  // A failed run must leave the site with the pages it had, not half of them.
  it('leaves the copies in the site alone when a page is missing', () => {
    const source = makeSource();
    runScript(source);
    rmSync(join(source, 'Calibration promotion.html'));

    expect(() => runScript(source)).toThrow();
    for (const path of Object.values(pages)) {
      expect(
        existsSync(join(folder, 'public/calibration', path, 'index.html')),
      ).toBe(true);
    }
  });

  it('leaves them alone when a page links to one that isn’t copied', () => {
    const source = makeSource();
    runScript(source);
    writeFileSync(
      join(source, 'Calibration author.html'),
      sourcePage('Write').replace('blueprint.html', 'drafts.html'),
    );

    expect(() => runScript(source)).toThrow();
    const write = join(folder, 'public/calibration/write/index.html');
    expect(readFileSync(write, 'utf8')).toContain('href="/calibration/"');
  });
});
