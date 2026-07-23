// OpenMalaria worker: runs one scenario off the main thread so the multi-second,
// CPU-bound wasm call never freezes the page (js/API.md §8).
//
// The Emscripten glue (openMalaria.mjs) ships node:* branches guarded by an env
// check; to keep it out of Vite's bundler we load it at runtime with a
// @vite-ignore dynamic import from public/wasm/ and override locateFile so it
// fetches the sibling .wasm. This mirrors the reference wrapper in
// openmalaria-wasm/src/index.mjs (runScenario) exactly, minus the packaging.

import type { RunRequest, WorkerMessage } from './protocol';

const WORK = '/work';
const SCENARIO = 'scenario.xml';
const OUTPUT = 'output.txt';
const CTS = 'ctsout.txt';

interface EmscriptenFS {
  chdir(path: string): void;
  writeFile(path: string, data: string): void;
  readFile(path: string, opts: { encoding: 'utf8' }): string;
}
interface OMModule {
  FS: EmscriptenFS;
  callMain(args: string[]): number;
}
type OMFactory = (opts: {
  locateFile?: (path: string) => string;
  print?: (line: string) => void;
  printErr?: (line: string) => void;
}) => Promise<OMModule>;

const post = (msg: WorkerMessage) => self.postMessage(msg);

self.onmessage = async (e: MessageEvent<RunRequest>) => {
  const req = e.data;
  if (!req || req.type !== 'run') return;

  try {
    if (typeof req.xml !== 'string' || req.xml.length === 0) {
      throw new TypeError('scenarioXml must be a non-empty string');
    }

    const mod = (await import(/* @vite-ignore */ req.glueUrl)) as { default: OMFactory };
    const createOpenMalaria = mod.default;

    const warnings: string[] = [];
    const Module = await createOpenMalaria({
      locateFile: (path) => (path.endsWith('.wasm') ? req.wasmUrl : path),
      print: (line) => post({ type: 'stdout', line }),
      printErr: (line) => {
        warnings.push(line);
        post({ type: 'stderr', line });
      },
    });

    const FS = Module.FS;
    FS.chdir(WORK); // embedded scenario_current.xsd + densities.csv live here
    FS.writeFile(SCENARIO, req.xml);

    const code = Module.callMain(['-s', SCENARIO, '-o', OUTPUT]);
    if (code !== 0) {
      post({
        type: 'error',
        message: `OpenMalaria exited with code ${code}`,
        code,
        stderr: warnings,
      });
      return;
    }

    const output = FS.readFile(OUTPUT, { encoding: 'utf8' });
    let cts: string | undefined;
    try {
      cts = FS.readFile(CTS, { encoding: 'utf8' });
    } catch {
      /* no continuous output produced */
    }

    post({ type: 'done', output, cts, warnings });
  } catch (err) {
    post({
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
