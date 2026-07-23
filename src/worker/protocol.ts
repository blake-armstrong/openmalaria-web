// Message protocol between the main thread and the OpenMalaria worker.
// One worker instance handles one run (a fresh wasm instance per call is the
// package's own model); the main thread wrapper terminates it when done.

export interface RunRequest {
  type: 'run';
  xml: string;
  /** Absolute URL of the Emscripten glue (public/wasm/openMalaria.mjs). */
  glueUrl: string;
  /** Absolute URL of the wasm binary (public/wasm/openMalaria.wasm). */
  wasmUrl: string;
}

export type WorkerMessage =
  | { type: 'stderr'; line: string }
  | { type: 'stdout'; line: string }
  | { type: 'done'; output: string; cts?: string; warnings: string[] }
  | { type: 'error'; message: string; code?: number; stderr?: string[] };
