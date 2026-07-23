// Copy the openmalaria-wasm build artifacts (glue + binary) into public/wasm/ so
// they are served as plain static assets. The worker loads the glue at runtime via
// a @vite-ignore dynamic import and points the module's locateFile at the binary,
// which keeps the Emscripten glue (with its node:* branches) out of Vite's bundler.
//
// Runs automatically before `dev` and `build` (see package.json predev/prebuild).

import { copyFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const destDir = resolve(root, 'public/wasm');

// Prefer the installed package; fall back to the sibling fork checkout.
const candidates = [
  resolve(root, 'node_modules/openmalaria-wasm/wasm'),
  resolve(root, '../openmalaria-fork/js/wasm'),
];

const FILES = ['openMalaria.mjs', 'openMalaria.wasm'];

async function firstExisting(dirs, file) {
  for (const dir of dirs) {
    const p = resolve(dir, file);
    try {
      await access(p);
      return p;
    } catch {
      /* try next */
    }
  }
  return null;
}

await mkdir(destDir, { recursive: true });

for (const file of FILES) {
  const src = await firstExisting(candidates, file);
  if (!src) {
    console.error(
      `[copy-wasm] Could not find ${file}. Looked in:\n  ${candidates.join('\n  ')}\n` +
        `Ensure openmalaria-wasm is installed and its .wasm was built (see js/API.md §8).`,
    );
    process.exit(1);
  }
  const dest = resolve(destDir, file);
  await copyFile(src, dest);
  console.log(`[copy-wasm] ${file} -> public/wasm/${file}`);
}
