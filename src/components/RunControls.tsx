import { useState } from 'react';

export interface RunError {
  message: string;
  code?: number;
  stderr?: string[];
}

interface Props {
  canRun: boolean;
  running: 'run' | 'validate' | null;
  elapsedMs: number;
  warnings: string[];
  error: RunError | null;
  editorErrorCount: number;
  onRun: () => void;
  onValidate: () => void;
  onCancel: () => void;
}

export function RunControls({
  canRun,
  running,
  elapsedMs,
  warnings,
  error,
  editorErrorCount,
  onRun,
  onValidate,
  onCancel,
}: Props) {
  const [showWarnings, setShowWarnings] = useState(false);
  const secs = (elapsedMs / 1000).toFixed(1);

  return (
    <section className="panel">
      <div className="run-status">
        <span className={`run-dot ${running ? 'run-dot-live' : canRun ? 'run-dot-ready' : ''}`} />
        <span className="run-state mono">
          {running === 'run' ? 'RUNNING' : running === 'validate' ? 'VALIDATING' : error ? 'FAILED' : 'READY'}
        </span>
        {(running || elapsedMs > 0) && <span className="run-timer mono">{secs}s</span>}
      </div>

      {running ? (
        <button className="btn btn-primary" onClick={onCancel}>
          Cancel
        </button>
      ) : (
        <div className="run-buttons">
          <button className="btn btn-primary" onClick={onRun} disabled={!canRun}>
            Run simulation
          </button>
          <button className="btn" onClick={onValidate} disabled={!canRun}>
            Validate only
          </button>
        </div>
      )}

      <p className="run-hint">
        Validate parses and schema-checks the scenario without running the timestep loop —
        much faster, good for iterating. Run executes the full simulation.
      </p>

      {warnings.length > 0 && (
        <div className="warnings">
          <button className="warnings-toggle" onClick={() => setShowWarnings((v) => !v)}>
            <span className="tag tag-warn">{warnings.length} model note{warnings.length === 1 ? '' : 's'}</span>
            <span className="warnings-caret">{showWarnings ? '▾' : '▸'}</span>
          </button>
          {showWarnings && <pre className="warnings-body mono">{warnings.join('\n')}</pre>}
        </div>
      )}

      {error && (
        <div className="run-error">
          <p className="run-error-head">Failed{error.code != null ? ` · exit ${error.code}` : ''}</p>
          <p className="run-error-msg">{error.message}</p>
          {editorErrorCount > 0 && (
            <p className="run-error-hint">
              {editorErrorCount === 1 ? '1 spot is' : `${editorErrorCount} spots are`} marked in the editor above.
            </p>
          )}
          {error.stderr && error.stderr.length > 0 && (
            <pre className="run-error-body mono">{error.stderr.slice(-12).join('\n')}</pre>
          )}
        </div>
      )}
    </section>
  );
}
