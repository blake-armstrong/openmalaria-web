import { useCallback, useEffect, useRef, useState } from 'react';
import { EXAMPLES } from './scenarios';
import { runScenario, OpenMalariaError, type RunResult } from './lib/runScenario';
import { ScenarioPicker } from './components/ScenarioPicker';
import { RunPanel, type RunError } from './components/RunPanel';
import { ResultsView } from './components/ResultsView';

interface Loaded {
  name: string;
  xml: string;
  exampleId: string | null;
}

export default function App() {
  const [loaded, setLoaded] = useState<Loaded>(() => ({
    name: EXAMPLES[0].name,
    xml: EXAMPLES[0].xml,
    exampleId: EXAMPLES[0].id,
  }));
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<RunError | null>(null);
  const [result, setResult] = useState<{ data: RunResult; name: string; ms: number } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    abortRef.current?.abort();
  }, []);

  const selectExample = useCallback((id: string) => {
    const ex = EXAMPLES.find((e) => e.id === id);
    if (!ex) return;
    setLoaded({ name: ex.name, xml: ex.xml, exampleId: ex.id });
    setError(null);
  }, []);

  const upload = useCallback((name: string, xml: string) => {
    setLoaded({ name, xml, exampleId: null });
    setError(null);
  }, []);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    setWarnings([]);
    setElapsedMs(0);

    const start = performance.now();
    timerRef.current = window.setInterval(() => setElapsedMs(performance.now() - start), 100);
    const controller = new AbortController();
    abortRef.current = controller;

    const collected: string[] = [];
    try {
      const data = await runScenario(loaded.xml, {
        signal: controller.signal,
        onStderr: (line) => {
          collected.push(line);
          setWarnings([...collected]);
        },
      });
      setResult({ data, name: loaded.name, ms: performance.now() - start });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        // user cancelled — leave prior result in place
      } else if (e instanceof OpenMalariaError) {
        setError({ message: e.message, code: e.code, stderr: e.stderr });
      } else if (e instanceof TypeError) {
        setError({ message: e.message });
      } else {
        setError({ message: e instanceof Error ? e.message : String(e) });
      }
    } finally {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      abortRef.current = null;
      setRunning(false);
    }
  }, [loaded]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">OpenMalaria</span>
          <span className="brand-tag mono">in-browser simulation console</span>
        </div>
        <a className="topbar-link mono" href="https://swisstph.github.io/openmalaria/" target="_blank" rel="noreferrer">
          schema docs ↗
        </a>
      </header>

      <main className="layout">
        <aside className="console card">
          <ScenarioPicker
            examples={EXAMPLES}
            selectedId={loaded.exampleId}
            uploadedName={loaded.exampleId === null ? loaded.name : null}
            disabled={running}
            onSelectExample={selectExample}
            onUpload={upload}
          />
          <div className="console-divider" />
          <RunPanel
            canRun={!!loaded.xml && !running}
            running={running}
            elapsedMs={elapsedMs}
            warnings={warnings}
            error={error}
            onRun={run}
            onCancel={cancel}
          />
        </aside>

        <div className="output-col">
          {result ? (
            <ResultsView result={result.data} scenarioName={result.name} runMs={result.ms} />
          ) : (
            <EmptyState running={running} />
          )}
        </div>
      </main>

      <footer className="footer mono">
        OpenMalaria compiled to WebAssembly · results are deterministic per scenario seed
      </footer>
    </div>
  );
}

function EmptyState({ running }: { running: boolean }) {
  return (
    <div className="empty card">
      <span className="empty-mark" aria-hidden="true" />
      <h2 className="empty-title">{running ? 'Running the simulator…' : 'No results yet'}</h2>
      <p className="empty-body">
        {running
          ? 'The model is stepping through the scenario in a background worker. This takes a few seconds.'
          : 'Choose a scenario on the left — or upload your own — and press Run simulation. Survey results and time-series will appear here.'}
      </p>
    </div>
  );
}
