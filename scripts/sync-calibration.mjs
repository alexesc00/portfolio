/*
 * Copies the Calibration design exercise (a service blueprint and four
 * wireframes) into the site, at /calibration/.
 *
 * Each page is a single HTML file with its styles, script and font inlined,
 * built in its own folder outside this repo, which stays the source of
 * truth. This gives the pages short paths, points their links at those
 * paths, and keeps them out of search results: they're shared by link and
 * not listed anywhere on the site. To update them, run this again.
 *
 *   npm run sync-calibration -- <path to the exercise folder>
 *
 * Every page is read and checked before anything is written, so a run that
 * fails leaves the copies already in the site as they were.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const destination = 'public/calibration';
const sitePath = '/calibration/';

// Each page's file name, and the path it's served at under /calibration/.
// The blueprint is the way in, so it takes the folder's own path.
export const pages = {
  'Calibration blueprint.html': '',
  'Calibration author.html': 'write/',
  'Calibration decide record.html': 'decide/',
  'Calibration promotion.html': 'promotion/',
  'Calibration question history.html': 'history/',
};

// The font's license, which has to travel with the font
export const license = 'fonts/OFL.txt';

// The pages link to each other by file name, as they sit side by side
const pathByLink = new Map(
  Object.entries(pages).map(([file, path]) => [
    encodeURI(file),
    sitePath + path,
  ]),
);

/**
 * One page as the site serves it. Throws if the page links to a page that
 * isn't copied, or has no <title> to put the robots tag before.
 *
 * @param {string} file the page's file name, for messages
 * @param {string} html the page as built
 */
export function rewritePage(file, html) {
  let page = html.replace(
    /href="([^"#]+\.html)(#[^"]*)?"/g,
    (_, link, hash) => {
      const linkedPath = pathByLink.get(link);
      if (!linkedPath) {
        throw new Error(`${file} links to ${link}, which isn't copied.`);
      }
      return `href="${linkedPath}${hash ?? ''}"`;
    },
  );

  if (!page.includes('<title>')) {
    throw new Error(`${file} has no <title> to put the robots tag before.`);
  }
  page = page.replace(
    '<title>',
    '<meta name="robots" content="noindex">\n<title>',
  );

  // The license is named in a stylesheet comment, by its path next to the
  // page. From a subfolder that path would point nowhere, so use the copy's
  // path in the site.
  return page.replaceAll(license, sitePath + license);
}

/**
 * Every page as the site serves it, keyed by its path under the destination.
 * Reads and checks everything, and writes nothing.
 *
 * @param {string} source the exercise folder
 */
export function buildPages(source) {
  const files = new Map();
  for (const [file, path] of Object.entries(pages)) {
    const html = readFileSync(join(source, file), 'utf8');
    files.set(join(path, 'index.html'), rewritePage(file, html));
  }
  if (!existsSync(join(source, license))) {
    throw new Error(`${license} is missing from ${source}.`);
  }
  return files;
}

/**
 * Replaces the copies in the site with freshly built ones.
 *
 * @param {string} source the exercise folder
 * @param {string} [target] where the copies go
 */
export function syncCalibration(source, target = destination) {
  const files = buildPages(source);
  rmSync(target, { recursive: true, force: true });
  for (const [path, html] of files) {
    const file = join(target, path);
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, html);
  }
  mkdirSync(join(target, 'fonts'), { recursive: true });
  copyFileSync(join(source, license), join(target, license));
  return files.size;
}

// Run as a script, not when a test imports it
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [source] = process.argv.slice(2);
  if (!source) {
    console.error(
      'Usage: npm run sync-calibration -- <path to the exercise folder>',
    );
    process.exit(1);
  }
  const count = syncCalibration(source);
  process.stdout.write(
    `Copied ${count} pages and the font license to ${destination}\n`,
  );
}
