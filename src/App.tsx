import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type StoredScenario,
  listScenarios,
  createScenario,
  saveScenario,
  renameScenario,
  duplicateScenario,
  deleteScenario,
  getLastOpenId,
  setLastOpenId,
} from './lib/scenarioStore';
import { DEFAULT_TEMPLATE_ID, TEMPLATES, loadTemplateXml } from './scenarios/templates';
import { runScenario, OpenMalariaError } from './lib/runScenario';
import { parseValidationErrors, type XmlValidationError } from './lib/parseValidationErrors';
import type { RunError } from './components/RunControls';
import { XmlEditor } from './components/XmlEditor';
import { ScenarioManager } from './components/ScenarioManager';
import { RunControls } from './components/RunControls';
import { ValidateResult } from './components/ValidateResult';
import { ResultsView } from './components/ResultsView';

type RunKind = 'run' | 'validate';

export default function App() {
  const [scenarios, setScenarios] = useState<StoredScenario[]>(() => listScenarios());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [xml, setXml] = useState('');

  const [running, setRunning] = useState<RunKind | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<RunError | null>(null);
  const [editorErrors, setEditorErrors] = useState<XmlValidationError[]>([]);
  const [runResult, setRunResult] = useState<{ output: string; cts?: string; ms: number } | null>(null);
  const [validateResult, setValidateResult] = useState<{ ms: number } | null>(null);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const bootstrapped = useRef(false);

  // Bootstrap: load the last-open scenario, or seed one from the default
  // template if this is the first visit / storage was cleared. Guarded by a
  // ref (not just the empty dep array) because StrictMode's dev-mode double
  // effect invocation would otherwise fire the async seed-creation twice,
  // leaving two "Scenario 1" entries behind — the ref makes it idempotent
  // even though `createScenario` itself isn't.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const existing = listScenarios();
    if (existing.length > 0) {
      const lastId = getLastOpenId();
      const initial = existing.find((s) => s.id === lastId) ?? existing[0];
      setScenarios(existing);
      setSelectedId(initial.id);
      setXml(initial.xml);
      return;
    }
    const defaultName = TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID)?.name ?? DEFAULT_TEMPLATE_ID;
    loadTemplateXml(DEFAULT_TEMPLATE_ID)
      .then((xmlText) => {
        const seeded = createScenario(defaultName, xmlText);
        setScenarios([seeded]);
        setSelectedId(seeded.id);
        setXml(seeded.xml);
        setLastOpenId(seeded.id);
      })
      .catch((e) => setTemplateError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      abortRef.current?.abort();
    },
    [],
  );

  const selected = useMemo(() => scenarios.find((s) => s.id === selectedId) ?? null, [scenarios, selectedId]);
  const dirty = selected != null && xml !== selected.xml;

  // Diagnostics point at specific line/col offsets in whatever XML produced
  // them — once the user edits the document those offsets are stale, so any
  // edit clears them.
  const changeXml = useCallback((next: string) => {
    setXml(next);
    setEditorErrors([]);
  }, []);

  const selectScenario = useCallback((id: string) => {
    const s = listScenarios().find((sc) => sc.id === id);
    if (!s) return;
    setSelectedId(id);
    setXml(s.xml);
    setLastOpenId(id);
    setError(null);
    setEditorErrors([]);
    setRunResult(null);
    setValidateResult(null);
  }, []);

  const newScenario = useCallback((templateId: string) => {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    setTemplateError(null);
    setCreatingTemplate(true);
    loadTemplateXml(templateId)
      .then((xmlText) => {
        const s = createScenario(template.name, xmlText);
        setScenarios(listScenarios());
        selectScenario(s.id);
      })
      .catch((e) => setTemplateError(e instanceof Error ? e.message : String(e)))
      .finally(() => setCreatingTemplate(false));
  }, [selectScenario]);

  const save = useCallback(() => {
    if (!selected) return;
    saveScenario(selected.id, xml);
    setScenarios(listScenarios());
  }, [selected, xml]);

  const rename = useCallback((name: string) => {
    if (!selected) return;
    renameScenario(selected.id, name);
    setScenarios(listScenarios());
  }, [selected]);

  const duplicate = useCallback(() => {
    if (!selected) return;
    const copy = duplicateScenario(selected.id);
    setScenarios(listScenarios());
    if (copy) selectScenario(copy.id);
  }, [selected, selectScenario]);

  const remove = useCallback(() => {
    if (!selected) return;
    deleteScenario(selected.id);
    const remaining = listScenarios();
    setScenarios(remaining);
    if (remaining.length > 0) selectScenario(remaining[0].id);
    else {
      setSelectedId(null);
      setXml('');
      setEditorErrors([]);
    }
  }, [selected, selectScenario]);

  const upload = useCallback((name: string, uploadedXml: string) => {
    const s = createScenario(name, uploadedXml);
    setScenarios(listScenarios());
    selectScenario(s.id);
  }, [selectScenario]);

  const run = useCallback(async (kind: RunKind) => {
    setRunning(kind);
    setError(null);
    setEditorErrors([]);
    setWarnings([]);
    setElapsedMs(0);
    if (kind === 'run') setRunResult(null);
    else setValidateResult(null);

    const start = performance.now();
    timerRef.current = window.setInterval(() => setElapsedMs(performance.now() - start), 100);
    const controller = new AbortController();
    abortRef.current = controller;

    const collected: string[] = [];
    try {
      const data = await runScenario(xml, {
        validateOnly: kind === 'validate',
        signal: controller.signal,
        onStderr: (line) => {
          collected.push(line);
          setWarnings([...collected]);
        },
      });
      const ms = performance.now() - start;
      if (kind === 'run') setRunResult({ output: data.output!, cts: data.cts, ms });
      else setValidateResult({ ms });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        // user cancelled — leave prior result in place
      } else if (e instanceof OpenMalariaError) {
        setError({ message: e.message, code: e.code, stderr: e.stderr });
        setEditorErrors(parseValidationErrors(e.stderr));
      } else if (e instanceof TypeError) {
        setError({ message: e.message });
      } else {
        setError({ message: e instanceof Error ? e.message : String(e) });
      }
    } finally {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      abortRef.current = null;
      setRunning(null);
    }
  }, [xml]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-name">OpenMalaria</span>
          <span className="brand-tag mono">scenario editor &amp; run console</span>
        </div>
      </header>

      <main className="layout">
        <aside className="sidebar">
          <ScenarioManager
            scenarios={scenarios}
            selected={selected}
            dirty={dirty}
            disabled={running !== null}
            creatingTemplate={creatingTemplate}
            templateError={templateError}
            onSelect={selectScenario}
            onNew={newScenario}
            onSave={save}
            onRename={rename}
            onDuplicate={duplicate}
            onDelete={remove}
            onUpload={upload}
          />
          <RunControls
            canRun={!!xml && running === null}
            running={running}
            elapsedMs={elapsedMs}
            warnings={warnings}
            error={error}
            editorErrorCount={editorErrors.length}
            onRun={() => run('run')}
            onValidate={() => run('validate')}
            onCancel={cancel}
          />
        </aside>

        <div className="main-col">
          {selected ? (
            <XmlEditor value={xml} onChange={changeXml} readOnly={running !== null} errors={editorErrors} />
          ) : (
            <p className="note">Create or upload a scenario to begin.</p>
          )}

          {validateResult && <ValidateResult ms={validateResult.ms} />}
          {runResult && <ResultsView result={runResult} scenarioName={selected?.name ?? ''} runMs={runResult.ms} />}
        </div>
      </main>
    </div>
  );
}
