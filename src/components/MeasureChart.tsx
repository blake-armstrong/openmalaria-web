import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { SurveyRow } from '../lib/parseSurvey';
import { measuresPresent, surveysPresent, ageGroupsForMeasure } from '../lib/parseSurvey';
import { labelFor, isVectorMeasure } from '../lib/measures';
import { useThemeColors, seriesColor } from '../lib/useThemeColors';
import { ChartTooltip, formatNum } from './ChartTooltip';

const MAX_SERIES = 8;

function seriesLabel(measureId: number, ageGroup: number, singleSeries: boolean): string {
  if (singleSeries) return labelFor(measureId);
  return isVectorMeasure(measureId) ? `Species ${ageGroup}` : `Age group ${ageGroup}`;
}

export function MeasureChart({ rows }: { rows: SurveyRow[] }) {
  const colors = useThemeColors();
  const measures = useMemo(() => measuresPresent(rows), [rows]);

  // Prefer a broken-down, meaningful default measure if present.
  const preferred = [3, 1, 43, 0].find((m) => measures.includes(m));
  const [measureId, setMeasureId] = useState<number>(preferred ?? measures[0] ?? 0);
  const active = measures.includes(measureId) ? measureId : (measures[0] ?? 0);

  const { data, series, hiddenCount } = useMemo(() => {
    const allAges = ageGroupsForMeasure(rows, active);
    const ages = allAges.slice(0, MAX_SERIES);
    const single = ages.length === 1;
    const surveys = surveysPresent(rows);

    const byKey = new Map<string, number>();
    for (const r of rows) if (r.measureId === active) byKey.set(`${r.survey}:${r.ageGroup}`, r.value);

    const data = surveys.map((s) => {
      const row: Record<string, number | null> = { survey: s };
      for (const a of ages) row[`a${a}`] = byKey.get(`${s}:${a}`) ?? null;
      return row;
    });
    const series = ages.map((a, i) => ({
      key: `a${a}`,
      label: seriesLabel(active, a, single),
      color: seriesColor(colors, i),
    }));
    return { data, series, hiddenCount: allAges.length - ages.length };
  }, [rows, active, colors]);

  if (measures.length === 0) return null;

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Survey time-series</p>
          <h3 className="panel-title">{labelFor(active)}</h3>
        </div>
        <label className="field">
          <span className="field-label">Measure</span>
          <select
            className="select mono"
            value={active}
            onChange={(e) => setMeasureId(Number(e.target.value))}
          >
            {measures.map((m) => (
              <option key={m} value={m}>
                {labelFor(m)} · #{m}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 4 }}>
            <CartesianGrid stroke={colors.grid} vertical={false} />
            <XAxis
              dataKey="survey"
              stroke={colors.axis}
              tick={{ fill: colors.muted, fontSize: 12, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              label={{ value: 'survey', position: 'insideBottom', offset: -2, fill: colors.muted, fontSize: 11 }}
            />
            <YAxis
              stroke={colors.axis}
              tick={{ fill: colors.muted, fontSize: 12, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              width={64}
              tickFormatter={(v) => formatNum(v as number)}
            />
            <Tooltip content={<ChartTooltip xLabel="Survey" />} cursor={{ stroke: colors.axis }} />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {series.length > 1 && (
        <ul className="legend">
          {series.map((s) => (
            <li key={s.key} className="legend-item">
              <span className="legend-swatch" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      {hiddenCount > 0 && (
        <p className="note">
          Showing the first {MAX_SERIES} of {series.length + hiddenCount} age groups. See the table for the rest.
        </p>
      )}
    </section>
  );
}
