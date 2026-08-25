// Main-thread wrapper around the OpenMalaria worker. Spawns a fresh worker
// per run (matching openmalaria-wasm's one-instance-per-call model), streams
// stderr lines back via onStderr, and resolves with the raw output strings.

import OMWorker from '../worker/om.worker.ts?worker';
import type { RunRequest, WorkerMessage } from '../worker/protocol';

export class OpenMalariaError extends Error {
  code?: number;
  stderr: string[];
  constructor(message: string, code: number | undefined, stderr: string[]) {
    super(message);
    this.name = 'OpenMalariaError';
    this.code = code;
    this.stderr = stderr;
  }
}

export interface RunResult {
  output?: string;
  cts?: string;
  warnings: string[];
}

export interface RunOptions {
  validateOnly?: boolean;
  onStderr?: (line: string) => void;
  onStdout?: (line: string) => void;
  signal?: AbortSignal;
}

export function runScenario(xml: string, opts: RunOptions = {}): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    if (typeof xml !== 'string' || xml.length === 0) {
      reject(new TypeError('runScenario: scenarioXml must be a non-empty string'));
      return;
    }

    const id = crypto.randomUUID();
    const worker = new OMWorker();
    const cleanup = () => {
      worker.terminate();
      opts.signal?.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(new DOMException('Simulation aborted', 'AbortError'));
    };
    if (opts.signal) {
      if (opts.signal.aborted) {
        worker.terminate();
        reject(new DOMException('Simulation aborted', 'AbortError'));
        return;
      }
      opts.signal.addEventListener('abort', onAbort);
    }

    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const msg = e.data;
      if (msg.id !== id) return; // stale reply from a superseded run
      switch (msg.type) {
        case 'stderr':
          opts.onStderr?.(msg.line);
          break;
        case 'stdout':
          opts.onStdout?.(msg.line);
          break;
        case 'done':
          cleanup();
          resolve({ output: msg.output, cts: msg.cts, warnings: msg.warnings });
          break;
        case 'error':
          cleanup();
          reject(new OpenMalariaError(msg.message, msg.code, msg.stderr ?? []));
          break;
      }
    };
    worker.onerror = (e) => {
      cleanup();
      reject(new OpenMalariaError(e.message || 'Worker error', undefined, []));
    };

    const req: RunRequest = { type: 'run', id, xml, validateOnly: opts.validateOnly ?? false };
    worker.postMessage(req);
  });
}
