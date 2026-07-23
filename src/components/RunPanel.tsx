import { useState } from 'react';

export interface RunError {
  message: string;
  code?: number;
  stderr?: string[];
}

interface Props {
  canRun: boolean;
  running: boolean;
  elapsedMs: number;
  warnings: string[];
  error: RunError | null;
  onRun: () => void;
  onCancel: () => void;
}

export function RunPanel({ canRun, running, elapsedMs, warnings, error, onRun, onCancel }: Props) {
  const [showWarnings, setShowWarnings] = useState(false);
  const secs = (elapsedMs / 1000).toFixed(1);

  return (
    <section className="runpanel">
      <div className="run-status">
        <span className={`run-dot ${running ? 'run-dot-live' : canRun ? 'run-dot-ready' : ''}`} />
        <span className="run-state mono">
          {running ? 'RUNNING' : error ? 'FAILED' : canRun ? 'READY' : 'IDLE'}
        </span>
        {(running || elapsedMs > 0) && <span className="run-timer mono">{secs}s</span>}
      </div>

      {running ? (
        <button className="btn-run btn-run-cancel" onClick={onCancel}>
          Cancel run
        </button>
      ) : (
        <button className="btn-run" onClick={onRun} disabled={!canRun}>
          Run simulation
        </button>
      )}

      <p className="run-hint">
        Runs in a background worker — expect a few seconds. The wasm module bundles the schema and
        reference data, so you only supply the scenario.
      </p>

      {warnings.length > 0 && (
        <div className="warnings">
          <button className="warnings-toggle" onClick={() => setShowWarnings((v) => !v)}>
            <span className="tag tag-warn">{warnings.length} model note{warnings.length === 1 ? '' : 's'}</span>
            <span className="warnings-caret">{showWarnings ? '▾' : '▸'}</span>
          </button>
          {showWarnings && (
            <pre className="warnings-body mono">{warnings.join('\n')}</pre>
          )}
        </div>
      )}

      {error && (
        <div className="run-error">
          <p className="run-error-head">
            Simulation failed{error.code != null ? ` · exit ${error.code}` : ''}
          </p>
          <p className="run-error-msg">{error.message}</p>
          {error.stderr && error.stderr.length > 0 && (
            <pre className="run-error-body mono">{error.stderr.slice(-12).join('\n')}</pre>
          )}
        </div>
      )}
    </section>
  );
}
