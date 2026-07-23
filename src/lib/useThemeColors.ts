// Resolves CSS custom properties to concrete hex strings for Recharts (SVG
// presentation attributes like `stroke` don't accept var()). Re-reads on
// color-scheme change so charts follow light/dark automatically.

import { useEffect, useState } from 'react';

export interface ThemeColors {
  series: string[];
  grid: string;
  axis: string;
  ink: string;
  muted: string;
  surface: string;
  line: string;
}

function read(): ThemeColors {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  return {
    series: [
      v('--s1'), v('--s2'), v('--s3'), v('--s4'),
      v('--s5'), v('--s6'), v('--s7'), v('--s8'),
    ],
    grid: v('--grid'),
    axis: v('--line-strong'),
    ink: v('--ink'),
    muted: v('--muted'),
    surface: v('--surface'),
    line: v('--line'),
  };
}

export function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState<ThemeColors>(read);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setColors(read());
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return colors;
}

/** Categorical color for a series index, cycling only as a last resort. */
export function seriesColor(colors: ThemeColors, i: number): string {
  return colors.series[i % colors.series.length];
}
