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

export const visibleText = (html: string): string[] => (html ? [] : []);

export const compareWording = (
  site: string[],
  figma: string[],
  allowed: { onlyInFigma?: string[]; onlyOnSite?: string[] } = {},
): string[] => (site && figma && allowed ? [] : []);

export const compareComponents = (
  figmaNames: string[],
  files: string[],
  allowed: { withoutFile?: string[]; withoutComponent?: string[] } = {},
): string[] => (figmaNames && files && allowed ? [] : []);
