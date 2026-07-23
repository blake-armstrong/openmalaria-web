import { useMemo, useState } from 'react';
import type { SurveyRow } from '../lib/parseSurvey';
import { measuresPresent } from '../lib/parseSurvey';
import { labelFor } from '../lib/measures';
import { surveyToCsv, downloadText } from '../lib/download';
import { formatNum } from './ChartTooltip';

type SortKey = 'survey' | 'ageGroup' | 'measureId' | 'value';
const PAGE_SIZE = 50;

export function ResultsTable({ rows, rawOutput }: { rows: SurveyRow[]; rawOutput: string }) {
  const measures = useMemo(() => measuresPresent(rows), [rows]);
  const [measureFilter, setMeasureFilter] = useState<'all' | number>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'survey', dir: 1 });
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const base = measureFilter === 'all' ? rows : rows.filter((r) => r.measureId === measureFilter);
    const sorted = [...base].sort((a, b) => {
      const d = a[sort.key] - b[sort.key];
      return (d !== 0 ? d : a.survey - b.survey) * sort.dir;
    });
    return sorted;
  }, [rows, measureFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);

  function sortBy(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));
  }
  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === 1 ? '↑' : '↓') : '');

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Decoded survey data</p>
          <h3 className="panel-title">
            {filtered.length.toLocaleString()} <span className="panel-title-sub">rows</span>
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
          <button className="btn" onClick={() => downloadText('openmalaria-results.csv', surveyToCsv(filtered), 'text/csv')}>
            Download CSV
          </button>
          <button className="btn" onClick={() => downloadText('output.txt', rawOutput, 'text/plain')}>
            output.txt
          </button>
        </div>
      </div>

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
          <tbody>
            {pageRows.map((r, i) => (
              <tr key={i}>
                <td className="num mono">{r.survey}</td>
                <td className="num mono">{r.ageGroup}</td>
                <td className="num mono">{r.cohort}</td>
                <td className="num mono">{r.genotype}</td>
                <td>
                  {labelFor(r.measureId)} <span className="muted-id mono">#{r.measureId}</span>
                </td>
                <td className="num mono">{formatNum(r.value)}</td>
              </tr>
            ))}
          </tbody>
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
