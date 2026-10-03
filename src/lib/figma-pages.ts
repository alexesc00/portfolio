/*
 * Checks that the Figma file's current pages match the site: the wording
 * drawn on the Site page against what the home page renders, and the
 * components against the files in src/components. Like the variables,
 * the pages are exported into a snapshot file, compared here.
 */

export interface FigmaComponent {
  name: string;
  page: string;
  /** Each property's name and kind, with a variant's options. */
  properties: Record<string, string>;
}

export interface FigmaPagesSnapshot {
  /** The day the snapshot was exported, as YYYY-MM-DD. */
  exported: string;
  components: FigmaComponent[];
  /** Every distinct piece of text inside component instances on Site. */
  siteText: string[];
}

/** Elements whose contents a visitor never reads as text. */
const unreadElements = new Set(['head', 'script', 'style', 'svg', 'template']);
const voidElements = new Set([
  'area',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);
const namedCharacters: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
  rsquo: '’',
};

function decodeCharacters(text: string): string {
  return text.replace(
    /&(#x[\da-f]+|#\d+|[a-z]+);/gi,
    (reference, name: string) => {
      if (name.startsWith('#x') || name.startsWith('#X'))
        return String.fromCodePoint(parseInt(name.slice(2), 16));
      if (name.startsWith('#'))
        return String.fromCodePoint(Number(name.slice(1)));
      return namedCharacters[name.toLowerCase()] ?? reference;
    },
  );
}

/**
 * Whether a tag is only for screen readers at every width. A class like
 * `sr-only xl:not-sr-only` still shows on wide screens, so it counts as
 * visible.
 */
function isScreenReaderOnly(attributes: string): boolean {
  const classes = /\sclass="([^"]*)"/.exec(attributes)?.[1].split(/\s+/) ?? [];
  return (
    classes.includes('sr-only') &&
    !classes.some((name) => name.endsWith(':not-sr-only'))
  );
}

/** Collapses whitespace, and the space a line break leaves before a comma. */
function tidy(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/ ([,.;:])/g, '$1')
    .trim();
}

const withoutSpaces = (text: string) => text.replace(/\s/g, '');

/**
 * The runs of text in rendered HTML that a visitor can read, in page
 * order. Text in elements hidden until the visitor opens them counts.
 */
export function visibleText(html: string): string[] {
  const runs: string[] = [];
  // Each open element, and whether its contents are left out.
  const open: { name: string; isUnread: boolean }[] = [];
  const tag = /<(\/?)([a-z][\w-]*)([^>]*)>|<!--[\s\S]*?-->|<![^>]*>/gi;
  let from = 0;

  function addText(text: string) {
    if (open.some((element) => element.isUnread)) return;
    const run = tidy(decodeCharacters(text));
    if (run) runs.push(run);
  }

  for (const match of html.matchAll(tag)) {
    addText(html.slice(from, match.index));
    from = match.index + match[0].length;
    const [, closing, rawName, attributes] = match;
    if (!rawName) continue;
    const name = rawName.toLowerCase();
    if (closing) {
      const at = open.findLastIndex((element) => element.name === name);
      if (at !== -1) open.length = at;
    } else if (!voidElements.has(name) && !attributes.endsWith('/')) {
      open.push({
        name,
        isUnread: unreadElements.has(name) || isScreenReaderOnly(attributes),
      });
    }
  }
  addText(html.slice(from));
  return runs;
}

/** Lists each item once, keeping the first one's place. */
const once = (items: string[]) => [...new Set(items)];

/**
 * The wording Figma draws that the site doesn't render, and the reverse.
 * Figma may join runs of text the site renders separately, or break a
 * line where the site doesn't, so each side is looked for inside the
 * other's text as a whole.
 */
export function compareWording(
  site: string[],
  figma: string[],
  allowed: { onlyInFigma?: string[]; onlyOnSite?: string[] } = {},
): string[] {
  const contains = (whole: string) => {
    const squeezed = withoutSpaces(whole);
    return (part: string) =>
      whole.includes(part) || squeezed.includes(withoutSpaces(part));
  };
  const siteHas = contains(tidy(site.join(' ')));
  const figmaHas = contains(tidy(figma.join('\n')));
  const onlyInFigma = new Set(allowed.onlyInFigma);
  const onlyOnSite = new Set(allowed.onlyOnSite);

  return [
    ...once(figma.map(tidy))
      .filter((text) => !onlyInFigma.has(text) && !siteHas(text))
      .map((text) => `Figma shows “${text}”, which the site doesn’t render`),
    ...once(site.map(tidy))
      .filter((text) => !onlyOnSite.has(text) && !figmaHas(text))
      .map((text) => `The site renders “${text}”, which Figma doesn’t show`),
  ];
}

/**
 * Files in src/components with no component in Figma, and the reverse.
 * A component matches the file it is named after; one named "File / Part"
 * is a piece of that file.
 */
export function compareComponents(
  figmaNames: string[],
  files: string[],
  allowed: { withoutFile?: string[]; withoutComponent?: string[] } = {},
): string[] {
  const fileName = (file: string) => file.replace(/\.\w+$/, '');
  const fileNames = new Set(files.map(fileName));
  const drawnFiles = new Set(figmaNames.map((name) => name.split(' / ')[0]));

  return [
    ...files
      .filter(
        (file) =>
          !drawnFiles.has(fileName(file)) &&
          !allowed.withoutComponent?.includes(file),
      )
      .map((file) => `src/components/${file} has no component in Figma`),
    ...figmaNames
      .filter(
        (name) =>
          !fileNames.has(name.split(' / ')[0]) &&
          !allowed.withoutFile?.includes(name),
      )
      .map((name) => `Figma’s “${name}” matches no file in src/components`),
  ];
}
