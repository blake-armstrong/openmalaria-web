// Runs one scenario off the main thread so the multi-second, CPU-bound wasm
// call never freezes the page. Imports the real openmalaria-wasm package
// directly rather than reimplementing its FS/callMain dance, so validateOnly
// and future API changes come for free.
import { runScenario, OpenMalariaError } from 'openmalaria-wasm';
import type { RunRequest, WorkerMessage } from './protocol';

const post = (msg: WorkerMessage) => self.postMessage(msg);

self.onmessage = async (e: MessageEvent<RunRequest>) => {
  const req = e.data;
  if (!req || req.type !== 'run') return;

  try {
    const result = await runScenario(req.xml, {
      validateOnly: req.validateOnly,
      onStdout: (line) => post({ type: 'stdout', id: req.id, line }),
      onStderr: (line) => post({ type: 'stderr', id: req.id, line }),
    });
    post({ type: 'done', id: req.id, ...result });
  } catch (err) {
    if (err instanceof OpenMalariaError) {
      post({ type: 'error', id: req.id, message: err.message, code: err.code, stderr: err.stderr });
    } else {
      post({ type: 'error', id: req.id, message: err instanceof Error ? err.message : String(err) });
    }
  }
};
