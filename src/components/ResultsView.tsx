import { useMemo, useState } from 'react';
import type { RunResult } from '../lib/runScenario';
import { parseSurvey, measuresPresent, surveysPresent } from '../lib/parseSurvey';
import { parseCts } from '../lib/parseCts';
import { MeasureChart } from './MeasureChart';
import { CtsChart } from './CtsChart';
import { ResultsTable } from './ResultsTable';

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-tile">
      <span className="stat-value mono">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

export function ResultsView({ result, scenarioName, runMs }: { result: RunResult; scenarioName: string; runMs: number }) {
  const rows = useMemo(() => parseSurvey(result.output), [result.output]);
  const cts = useMemo(() => (result.cts ? parseCts(result.cts) : null), [result.cts]);
  const [tab, setTab] = useState<'charts' | 'table'>('charts');

  const nSurveys = useMemo(() => surveysPresent(rows).length, [rows]);
  const nMeasures = useMemo(() => measuresPresent(rows).length, [rows]);

  return (
    <div className="results">
      <header className="results-head">
        <div>
          <p className="eyebrow">Results</p>
          <h2 className="results-title">{scenarioName}</h2>
        </div>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'charts'} className={`tab ${tab === 'charts' ? 'tab-on' : ''}`} onClick={() => setTab('charts')}>
            Charts
          </button>
          <button role="tab" aria-selected={tab === 'table'} className={`tab ${tab === 'table' ? 'tab-on' : ''}`} onClick={() => setTab('table')}>
            Table
          </button>
        </div>
      </header>

      <div className="stat-row">
        <StatTile label="Surveys" value={nSurveys} />
        <StatTile label="Measures" value={nMeasures} />
        <StatTile label="Data points" value={rows.length.toLocaleString()} />
        <StatTile label="Run time" value={`${(runMs / 1000).toFixed(1)}s`} />
      </div>

      {tab === 'charts' ? (
        <div className="stack">
          <MeasureChart rows={rows} />
          {cts && cts.rows.length > 0 && <CtsChart table={cts} />}
        </div>
      ) : (
        <ResultsTable rows={rows} rawOutput={result.output} />
      )}
    </div>
  );
}
