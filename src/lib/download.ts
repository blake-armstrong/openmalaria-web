// Small client-side download helpers for exporting results.

import type { SurveyRow } from './parseSurvey';
import { labelFor } from './measures';

export function downloadText(filename: string, text: string, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Decoded survey rows -> CSV with a header, including a readable measure name. */
export function surveyToCsv(rows: SurveyRow[]): string {
  const header = ['survey', 'genotype', 'cohort', 'ageGroup', 'measureId', 'measure', 'value'];
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [r.survey, r.genotype, r.cohort, r.ageGroup, r.measureId, escape(labelFor(r.measureId)), r.value].join(','),
    );
  }
  return lines.join('\n');
}
