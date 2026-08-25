import { useEffect, useMemo, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import type { SurveyRow } from '../lib/parseSurvey';
import { measuresPresent, ageGroupsForMeasure } from '../lib/parseSurvey';
import type { CtsTable } from '../lib/parseCts';
import { labelFor, isVectorMeasure } from '../lib/measures';
import { downloadText } from '../lib/download';
import {
  loadResultTables,
  renderMeasureChart,
  renderCtsChart,
  renderTable,
  exportCsv,
  runExplore,
  type ExploreResult,
} from '../lib/pyodide';

type Tab = 'charts' | 'table' | 'explore';

export function PyResults({
  rows,
  cts,
  rawOutput,
}: {
  rows: SurveyRow[];
  cts: CtsTable | null;
  rawOutput: string;
}) {
  const [tab, setTab] = useState<Tab>('charts');
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setLoadError(null);
    loadResultTables(rows, cts)
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [rows, cts]);

  return (
    <div>
      <div className="tabs" role="tablist" style={{ marginBottom: '0.75rem' }}>
        <button role="tab" aria-selected={tab === 'charts'} className={`tab ${tab === 'charts' ? 'tab-on' : ''}`} onClick={() => setTab('charts')}>
          Charts
        </button>
        <button role="tab" aria-selected={tab === 'table'} className={`tab ${tab === 'table' ? 'tab-on' : ''}`} onClick={() => setTab('table')}>
          Table
        </button>
        <button role="tab" aria-selected={tab === 'explore'} className={`tab ${tab === 'explore' ? 'tab-on' : ''}`} onClick={() => setTab('explore')}>
          Explore
        </button>
      </div>

      {loadError && (
        <div className="run-error">
          <p className="run-error-head">Failed to load Python engine</p>
          <p className="run-error-msg mono">{loadError}</p>
        </div>
      )}
      {!ready && !loadError && <p className="note">Loading Python (pandas + matplotlib)…</p>}

      {ready && (
        <>
          {tab === 'charts' && <ChartsTab rows={rows} cts={cts} />}
          {tab === 'table' && <TableTab rows={rows} rawOutput={rawOutput} />}
          {tab === 'explore' && <ExploreTab hasCts={!!cts && cts.rows.length > 0} />}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Charts

function ChartsTab({ rows, cts }: { rows: SurveyRow[]; cts: CtsTable | null }) {
  const measures = useMemo(() => measuresPresent(rows), [rows]);
  const preferred = [3, 1, 43, 0].find((m) => measures.includes(m));
  const [measureId, setMeasureId] = useState<number>(preferred ?? measures[0] ?? 0);
  const active = measures.includes(measureId) ? measureId : (measures[0] ?? 0);

  const [png, setPng] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hiddenCount = useMemo(() => Math.max(0, ageGroupsForMeasure(rows, active).length - 8), [rows, active]);

  useEffect(() => {
    if (measures.length === 0) return;
    let cancelled = false;
    setPng(null);
    setError(null);
    renderMeasureChart(active, labelFor(active), isVectorMeasure(active))
      .then((b64) => {
        if (!cancelled) setPng(b64);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [active, measures.length]);

  const hasCts = !!cts && cts.rows.length > 0;

  return (
    <div className="stack">
      {measures.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Survey time-series</p>
              <h3 className="panel-title">{labelFor(active)}</h3>
            </div>
            <label className="field">
              <span className="field-label">Measure</span>
              <select className="select" value={active} onChange={(e) => setMeasureId(Number(e.target.value))}>
                {measures.map((m) => (
                  <option key={m} value={m}>
                    {labelFor(m)} · #{m}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="chart-wrap">
            {error && <p className="note">Chart failed: {error}</p>}
            {!error && png && <img src={`data:image/png;base64,${png}`} alt={labelFor(active)} style={{ maxWidth: '100%' }} />}
            {!error && !png && <p className="note">Rendering…</p>}
          </div>
          {hiddenCount > 0 && <p className="note">Showing the first 8 age groups. See the table for the rest.</p>}
        </section>
      )}
      {hasCts && <CtsChartPanel cts={cts!} />}
    </div>
  );
}

function CtsChartPanel({ cts }: { cts: CtsTable }) {
  const columns = useMemo(() => cts.columns.filter((c) => c !== 'timestep'), [cts]);
  const [selected, setSelected] = useState<string[]>(() => columns.slice(0, 3));
  const [png, setPng] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selected.length === 0) {
      setPng(null);
      return;
    }
    let cancelled = false;
    setError(null);
    renderCtsChart(selected)
      .then((b64) => {
        if (!cancelled) setPng(b64);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  function toggle(col: string) {
    setSelected((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : prev.length >= 8 ? prev : [...prev, col]));
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Continuous monitoring</p>
          <h3 className="panel-title">Time-series over model timesteps</h3>
        </div>
      </div>
      <div className="chip-row">
        {columns.map((col) => (
          <button key={col} type="button" className={`chip ${selected.includes(col) ? 'chip-on' : ''}`} onClick={() => toggle(col)} aria-pressed={selected.includes(col)}>
            {col}
          </button>
        ))}
      </div>
      <div className="chart-wrap">
        {error && <p className="note">Chart failed: {error}</p>}
        {!error && selected.length === 0 && <p className="note">Pick one or more columns above to plot.</p>}
        {!error && selected.length > 0 && !png && <p className="note">Rendering…</p>}
        {!error && png && <img src={`data:image/png;base64,${png}`} alt="Continuous monitoring" style={{ maxWidth: '100%' }} />}
      </div>
    </section>
  );
}

// ----------------------------------------------------------------- Table

const PAGE_SIZE = 50;
type SortKey = 'survey' | 'ageGroup' | 'measureId' | 'value';

function TableTab({ rows, rawOutput }: { rows: SurveyRow[]; rawOutput: string }) {
  const measures = useMemo(() => measuresPresent(rows), [rows]);
  const [measureFilter, setMeasureFilter] = useState<'all' | number>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'survey', dir: 1 });
  const [page, setPage] = useState(0);
  const [rowsHtml, setRowsHtml] = useState('');
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    renderTable(measureFilter === 'all' ? null : measureFilter, sort.key, sort.dir, page)
      .then((r) => {
        if (!cancelled) {
          setRowsHtml(r.rowsHtml);
          setTotal(r.total);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [measureFilter, sort, page]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);

  function sortBy(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));
    setPage(0);
  }
  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === 1 ? '↑' : '↓') : '');

  async function downloadCsv() {
    const csv = await exportCsv(measureFilter === 'all' ? null : measureFilter);
    downloadText('openmalaria-results.csv', csv, 'text/csv');
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Decoded survey data</p>
          <h3 className="panel-title">
            {total.toLocaleString()} <span className="panel-title-sub">rows</span>
          </h3>
        </div>
        <div className="table-actions">
          <label className="field">
            <span className="field-label">Measure</span>
            <select
              className="select mono"
              value={String(measureFilter)}
              onChange={(e) => {
                setMeasureFilter(e.target.value === 'all' ? 'all' : Number(e.target.value));
                setPage(0);
              }}
            >
              <option value="all">All measures</option>
              {measures.map((m) => (
                <option key={m} value={m}>
                  {labelFor(m)} · #{m}
                </option>
              ))}
            </select>
          </label>
          <button className="btn" onClick={downloadCsv}>
            Download CSV
          </button>
          <button className="btn" onClick={() => downloadText('output.txt', rawOutput, 'text/plain')}>
            output.txt
          </button>
        </div>
      </div>

      {error && (
        <div className="run-error">
          <p className="run-error-head">Table failed</p>
          <p className="run-error-msg mono">{error}</p>
        </div>
      )}

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th className="num" onClick={() => sortBy('survey')}>Survey {arrow('survey')}</th>
              <th className="num" onClick={() => sortBy('ageGroup')}>Age grp {arrow('ageGroup')}</th>
              <th className="num">Cohort</th>
              <th className="num">Genotype</th>
              <th onClick={() => sortBy('measureId')}>Measure {arrow('measureId')}</th>
              <th className="num" onClick={() => sortBy('value')}>Value {arrow('value')}</th>
            </tr>
          </thead>
          <tbody dangerouslySetInnerHTML={{ __html: rowsHtml }} />
        </table>
      </div>

      <div className="pager">
        <button className="btn" disabled={clampedPage === 0} onClick={() => setPage(clampedPage - 1)}>
          Prev
        </button>
        <span className="mono pager-info">
          {clampedPage + 1} / {pageCount}
        </span>
        <button className="btn" disabled={clampedPage >= pageCount - 1} onClick={() => setPage(clampedPage + 1)}>
          Next
        </button>
      </div>
    </section>
  );
}

// --------------------------------------------------------------- Explore

interface ExampleQuery {
  label: string;
  code: string;
  requiresCts?: boolean;
}

const EXAMPLES: ExampleQuery[] = [
  { label: 'Average by age group', code: "survey_df[survey_df.measureId == 3].groupby('ageGroup')['value'].mean()" },
  {
    label: 'Compare measures over time',
    code: "survey_df.groupby(['survey', 'measureLabel'])['value'].sum().unstack().plot(marker='o')",
  },
  { label: 'Top values', code: "survey_df.sort_values('value', ascending=False).head(20)" },
  { label: 'EIR over time', code: "cts_df.plot(x='timestep', y=['simulated EIR', 'input EIR'])", requiresCts: true },
];

const DEFAULT_CODE = 'survey_df.head(20)';

function ExploreTab({ hasCts }: { hasCts: boolean }) {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [result, setResult] = useState<ExploreResult | null>(null);
  const [running, setRunning] = useState(false);
  const ranOnce = useRef(false);

  const examples = useMemo(() => EXAMPLES.filter((e) => !e.requiresCts || hasCts), [hasCts]);

  async function run(codeToRun: string) {
    setRunning(true);
    try {
      const r = await runExplore(codeToRun);
      setResult(r);
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    run(DEFAULT_CODE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Explore</p>
          <h3 className="panel-title">Ad hoc pandas over this run's data</h3>
        </div>
      </div>

      <p className="note">
        Variables: <code className="mono">survey_df</code> {hasCts && (<>and <code className="mono">cts_df</code> </>)}
        (pandas DataFrames). The last expression's value is shown — a DataFrame/Series as a table, a matplotlib figure as an
        image, otherwise as text.
      </p>

      <div className="chip-row">
        {examples.map((ex) => (
          <button key={ex.label} type="button" className="chip" onClick={() => setCode(ex.code)}>
            {ex.label}
          </button>
        ))}
      </div>

      <CodeMirror value={code} height="140px" extensions={[python()]} onChange={setCode} basicSetup={{ lineNumbers: true }} />

      <div className="run-buttons" style={{ marginTop: '0.5rem' }}>
        <button className="btn btn-primary" disabled={running} onClick={() => run(code)}>
          {running ? 'Running…' : 'Run'}
        </button>
      </div>

      {result?.kind === 'error' && (
        <div className="run-error">
          <p className="run-error-head">Code failed</p>
          <p className="run-error-msg mono">{result.message}</p>
        </div>
      )}
      {result?.kind === 'image' && (
        <div className="chart-wrap" style={{ marginTop: '0.75rem' }}>
          <img src={`data:image/png;base64,${result.image}`} alt="Explore chart" style={{ maxWidth: '100%' }} />
        </div>
      )}
      {result?.kind === 'table' && (
        <div className="table-scroll" style={{ marginTop: '0.75rem' }} dangerouslySetInnerHTML={{ __html: result.html }} />
      )}
      {result?.kind === 'text' && (
        <pre className="warnings-body mono" style={{ marginTop: '0.75rem' }}>
          {result.text}
        </pre>
      )}
      {result?.kind === 'none' && <p className="note">No displayable result (nothing returned, no figure created).</p>}
    </section>
  );
}
