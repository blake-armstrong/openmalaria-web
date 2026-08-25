import { lazy, Suspense, useMemo } from 'react';
import { parseSurvey, measuresPresent, surveysPresent } from '../lib/parseSurvey';
import { parseCts } from '../lib/parseCts';

// Charts/Table/Explore are all rendered via Pyodide (pandas + matplotlib),
// which pulls in ~32MB of runtime + packages; load it only once a full run
// actually needs displaying, not with the rest of the app.
const PyResults = lazy(() => import('./PyResults').then((m) => ({ default: m.PyResults })));

// A full (non-validateOnly) run always produces output.txt.
interface FullRunResult {
  output: string;
  cts?: string;
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-tile">
      <span className="stat-value mono">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

export function ResultsView({ result, scenarioName, runMs }: { result: FullRunResult; scenarioName: string; runMs: number }) {
  const rows = useMemo(() => parseSurvey(result.output), [result.output]);
  const cts = useMemo(() => (result.cts ? parseCts(result.cts) : null), [result.cts]);

  const nSurveys = useMemo(() => surveysPresent(rows).length, [rows]);
  const nMeasures = useMemo(() => measuresPresent(rows).length, [rows]);

  return (
    <div className="results">
      <header className="results-head">
        <div>
          <p className="eyebrow">Results</p>
          <h2 className="results-title">{scenarioName}</h2>
        </div>
      </header>

      <div className="stat-row">
        <StatTile label="Surveys" value={nSurveys} />
        <StatTile label="Measures" value={nMeasures} />
        <StatTile label="Data points" value={rows.length.toLocaleString()} />
        <StatTile label="Run time" value={`${(runMs / 1000).toFixed(1)}s`} />
      </div>

      <Suspense fallback={<p className="note">Loading Python (pandas + matplotlib)…</p>}>
        <PyResults rows={rows} cts={cts} rawOutput={result.output} />
      </Suspense>
    </div>
  );
}
