import {
  brandStyleSelector,
  parseEntrypoint,
  parseLook,
  parseLookMessage,
  parseStreamlitTheme,
  stockTheme,
  themeMessage,
  type Look,
} from './showcase-look';

/*
 * stlite runs Streamlit in the browser on Pyodide (Python compiled for the
 * web), so the showcase needs no Python server. It loads from jsDelivr, a
 * public CDN that caches a pinned version for good (GitHub Pages caches the
 * site's own files for only 10 minutes). Pinned exactly: 0.81.6 bundles
 * Streamlit 1.44.1, which the showcase's brand CSS is written against, and
 * later versions bundle a newer Streamlit.
 */
const stliteUrl = 'https://cdn.jsdelivr.net/npm/@stlite/browser@0.81.6/build';

// Python packages the app imports beyond what Streamlit already brings
const requirements = ['pyyaml'];

/*
 * Streamlit marks its root element with the script's state: "initial"
 * until the first run, then "running" and "notRunning". Pinned with
 * stlite above, so the attribute can't change under it.
 */
const scriptStateAttribute = 'data-test-script-state';
// Time for the theme to redraw the page before the parent looks
const settleMs = 400;

/** The parts of stlite's `mount` used here. */
type Mount = (
  options: {
    entrypoint: string;
    requirements: string[];
    files: Record<string, { url: string }>;
    hostConfig: { allowedOrigins: string[]; useExternalAuthToken: boolean };
  },
  container: HTMLElement,
) => unknown;

export interface ShowcaseApp {
  /** Where the app's files are served, ending in a slash. */
  baseUrl: string;
  /** Every file the app reads, relative to `baseUrl`. */
  files: string[];
}

/**
 * Runs the app in `container` and tells the parent page, if there is one,
 * `{ showcase: 'ready' }` once it has drawn, or `{ showcase: 'failed' }`.
 * The parent switches the look with `{ showcase: 'look', look }`, and the
 * `look` URL flag sets the starting one. The `view` URL flag picks the
 * one-screen sampler over the whole catalog.
 */
export async function mountShowcase(container: HTMLElement, app: ShowcaseApp) {
  const flags = new URLSearchParams(location.search);
  let look = parseLook(flags.get('look'));
  const appUrl = (path: string) =>
    new URL(path, new URL(app.baseUrl, location.href)).href;

  try {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = `${stliteUrl}/stlite.css`;
    document.head.append(stylesheet);

    const [{ mount }, config] = await Promise.all([
      import(/* @vite-ignore */ `${stliteUrl}/stlite.js`) as Promise<{
        mount: Mount;
      }>,
      fetchText(appUrl('.streamlit/config.toml')),
    ]);
    const brandTheme = parseStreamlitTheme(config);

    mount(
      {
        entrypoint: parseEntrypoint(flags.get('view')),
        requirements,
        files: Object.fromEntries(
          app.files.map((path) => [path, { url: appUrl(path) }]),
        ),
        // Lets this page send Streamlit the theme for the chosen look
        hostConfig: {
          allowedOrigins: [location.origin],
          useExternalAuthToken: false,
        },
      },
      container,
    );

    let isReady = false;
    const hasRunOnce = () =>
      container
        .querySelector('[data-testid="stApp"]')
        ?.getAttribute(scriptStateAttribute) === 'notRunning';
    const applyBrandCss = () => {
      for (const style of container.querySelectorAll<HTMLStyleElement>(
        brandStyleSelector,
      )) {
        style.disabled = look === 'stock';
      }
    };
    // Before the app has drawn, Streamlit's own first theme would replace
    // this one, so it's only sent once the app is ready.
    const applyTheme = () => {
      const theme = look === 'stock' ? stockTheme : brandTheme;
      window.postMessage(themeMessage(theme), location.origin);
    };

    // Style blocks keep arriving as the script runs and reruns. Streamlit
    // sets its own theme as the first run starts, so this one goes once
    // that run has finished.
    new MutationObserver(() => {
      applyBrandCss();
      if (isReady || !hasRunOnce()) return;
      isReady = true;
      applyTheme();
      window.setTimeout(() => tellParent('ready'), settleMs);
    }).observe(container, {
      childList: true,
      subtree: true,
      attributeFilter: [scriptStateAttribute],
    });

    window.addEventListener('message', (event) => {
      if (event.origin !== location.origin) return;
      const nextLook: Look | null = parseLookMessage(event.data);
      if (!nextLook || nextLook === look) return;
      look = nextLook;
      applyBrandCss();
      if (isReady) applyTheme();
    });
  } catch (error) {
    console.error(error);
    container.textContent =
      'The live app couldn’t start. Check the connection and reload the page.';
    tellParent('failed');
  }
}

async function fetchText(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response.text();
}

function tellParent(showcase: 'ready' | 'failed') {
  if (window.parent === window) return;
  window.parent.postMessage({ showcase }, location.origin);
}
