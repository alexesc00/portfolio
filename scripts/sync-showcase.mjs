/*
 * Copies the MissionML Streamlit showcase's Python app into the site, so
 * stlite (Streamlit running in the browser) can fetch its files by URL.
 *
 * The showcase lives in its own repo, which stays the source of truth.
 * This copies it at one commit, pinned in src/lib/missionml-showcase.json,
 * so the two can't drift: to update the showcase, run this again.
 *
 *   npm run sync-showcase -- <path to a showcase checkout> [commit]
 *
 * The commit defaults to origin/main, and it has to be on GitHub already.
 */
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import * as prettier from 'prettier';

const repository = 'alexesc00/mml-hacked-streamlit-showcase';
const destination = 'public/showcase/missionml/app';
const manifestPath = 'src/lib/missionml-showcase.json';

// Only what the app reads at runtime; its tooling and docs stay behind
const appPaths = [
  'app.py',
  'params.yaml',
  '.streamlit/config.toml',
  'assets',
  'components',
  'page_logic',
  'polydelta_streamlit_helpers',
];

const [checkout, commitName = 'origin/main'] = process.argv.slice(2);
if (!checkout) {
  console.error(
    'Usage: npm run sync-showcase -- <path to a showcase checkout> [commit]',
  );
  process.exit(1);
}

const git = (...args) =>
  execFileSync('git', ['-C', checkout, ...args], { encoding: 'utf8' }).trim();

git('fetch', '--quiet', 'origin');
const commit = git('rev-parse', '--verify', `${commitName}^{commit}`);
if (!git('branch', '--remotes', '--contains', commit)) {
  console.error(`${commit} isn't on GitHub yet. Push it first.`);
  process.exit(1);
}

rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
const archive = execFileSync('git', [
  '-C',
  checkout,
  'archive',
  '--format=tar',
  commit,
  ...appPaths,
]);
execFileSync('tar', ['-x', '-C', destination], { input: archive });

const files = [];
const collect = (directory) => {
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) collect(path);
    else files.push(relative(destination, path));
  }
};
collect(destination);

const manifest = JSON.stringify({ repository, commit, files });
writeFileSync(
  manifestPath,
  await prettier.format(manifest, { filepath: manifestPath }),
);
process.stdout.write(
  `Copied ${files.length} files from ${repository} at ${commit.slice(0, 7)}\n`,
);
