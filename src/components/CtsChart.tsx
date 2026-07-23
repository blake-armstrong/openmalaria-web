import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { CtsTable } from '../lib/parseCts';
import { useThemeColors, seriesColor } from '../lib/useThemeColors';
import { ChartTooltip, formatNum } from './ChartTooltip';

const MAX_SERIES = 8;

export function CtsChart({ table }: { table: CtsTable }) {
  const colors = useThemeColors();
  const timeKey = table.columns[0] ?? 'timestep';
  const measures = useMemo(() => table.columns.slice(1), [table.columns]);

  const [selected, setSelected] = useState<string[]>(() => measures.slice(0, 3));

  const active = selected.slice(0, MAX_SERIES);
  const series = active.map((key, i) => ({ key, color: seriesColor(colors, i) }));

  function toggle(col: string) {
    setSelected((prev) => {
      if (prev.includes(col)) return prev.filter((c) => c !== col);
      if (prev.length >= MAX_SERIES) return prev;
      return [...prev, col];
    });
  }

  if (measures.length === 0) return null;

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Continuous monitoring</p>
          <h3 className="panel-title">Time-series over model timesteps</h3>
        </div>
      </div>

      <div className="chip-row">
        {measures.map((col, i) => {
          const on = active.includes(col);
          const color = seriesColor(colors, active.indexOf(col) >= 0 ? active.indexOf(col) : i);
          return (
            <button
              key={col}
              type="button"
              className={`chip ${on ? 'chip-on' : ''}`}
              onClick={() => toggle(col)}
              aria-pressed={on}
            >
              <span className="chip-dot" style={{ background: on ? color : 'var(--line-strong)' }} />
              {col}
            </button>
          );
        })}
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={table.rows} margin={{ top: 8, right: 16, bottom: 8, left: 4 }}>
            <CartesianGrid stroke={colors.grid} vertical={false} />
            <XAxis
              dataKey={timeKey}
              stroke={colors.axis}
              tick={{ fill: colors.muted, fontSize: 12, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              label={{ value: 'timestep', position: 'insideBottom', offset: -2, fill: colors.muted, fontSize: 11 }}
            />
            <YAxis
              stroke={colors.axis}
              tick={{ fill: colors.muted, fontSize: 12, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              width={64}
              tickFormatter={(v) => formatNum(v as number)}
            />
            <Tooltip content={<ChartTooltip xLabel="Timestep" />} cursor={{ stroke: colors.axis }} />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.key}
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
      {active.length === 0 && <p className="note">Pick one or more columns above to plot.</p>}
    </section>
  );
}
