#!/usr/bin/env bash
# Populates public/pyodide/ with the self-hosted Pyodide runtime + the
# pandas/matplotlib wheel closure the Explore/Charts/Table tabs need
# (src/lib/pyodide.ts). Not run automatically by npm install/build — the
# output is gitignored (public/pyodide/, ~32MB) and only needs regenerating
# when the `pyodide` dependency version changes.
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(node -p "require('pyodide/package.json').version")
OUT="public/pyodide"
BASE="https://cdn.jsdelivr.net/pyodide/v${VERSION}/full"

mkdir -p "$OUT"
cp "node_modules/pyodide/pyodide.asm.wasm" \
   "node_modules/pyodide/pyodide.asm.mjs" \
   "node_modules/pyodide/python_stdlib.zip" \
   "node_modules/pyodide/pyodide-lock.json" \
   "$OUT/"

# Full transitive dependency closure of the "pandas" and "matplotlib"
# packages, per node_modules/pyodide/pyodide-lock.json.
node -e "
const lock = require('./node_modules/pyodide/pyodide-lock.json');
const needed = new Set();
function add(name) {
  name = name.toLowerCase();
  if (needed.has(name)) return;
  const pkg = lock.packages[name];
  if (!pkg) { console.error('missing package in lock file:', name); process.exit(1); }
  needed.add(name);
  for (const dep of pkg.depends || []) add(dep);
}
add('pandas');
add('matplotlib');
for (const name of needed) console.log(lock.packages[name].file_name);
" | while read -r file; do
  echo "fetching $file"
  curl -sf "${BASE}/${file}" -o "${OUT}/${file}"
done

echo "done: $(du -sh "$OUT" | cut -f1) in $OUT"
