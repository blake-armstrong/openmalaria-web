export interface RunRequest {
  type: 'run';
  id: string;
  xml: string;
  validateOnly: boolean;
}

export type WorkerMessage =
  | { type: 'stdout'; id: string; line: string }
  | { type: 'stderr'; id: string; line: string }
  | { type: 'done'; id: string; output?: string; cts?: string; warnings: string[] }
  | { type: 'error'; id: string; message: string; code?: number; stderr?: string[] };
