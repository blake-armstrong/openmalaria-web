import type { TooltipProps } from 'recharts';

// Custom tooltip styled with design tokens. Values are monospaced/tabular so
// columns line up; identity is carried by a color swatch beside a text label
// (text itself stays in ink, never the series color).
export function ChartTooltip({ active, payload, label, xLabel }: TooltipProps<number, string> & { xLabel: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="tooltip">
      <div className="tooltip-head mono">
        {xLabel} {label}
      </div>
      {payload
        .filter((p) => p.value != null)
        .map((p) => (
          <div className="tooltip-row" key={String(p.dataKey)}>
            <span className="tooltip-swatch" style={{ background: p.color }} />
            <span className="tooltip-name">{p.name}</span>
            <span className="tooltip-val mono">{formatNum(p.value as number)}</span>
          </div>
        ))}
    </div>
  );
}

export function formatNum(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Number.isInteger(n)) return n.toLocaleString();
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e6)) return n.toExponential(3);
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
