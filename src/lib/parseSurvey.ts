// Parse the OpenMalaria survey table (result.output). It is TSV with NO header,
// four columns: survey \t group \t measureId \t value. The `group` integer packs
// genotype/cohort/ageGroup — decode per js/API.md §5.

export interface SurveyRow {
  survey: number;
  /** Raw packed group id. */
  group: number;
  genotype: number;
  cohort: number;
  /** Age-group index, or a vector-species index for vector measures (31–34). */
  ageGroup: number;
  measureId: number;
  value: number;
}

export function decodeGroup(group: number): {
  genotype: number;
  cohort: number;
  ageGroup: number;
} {
  return {
    genotype: Math.floor(group / 1_000_000),
    cohort: Math.floor((group % 1_000_000) / 1000),
    ageGroup: group % 1000,
  };
}

export function parseSurvey(output: string): SurveyRow[] {
  const rows: SurveyRow[] = [];
  for (const line of output.split('\n')) {
    if (!line) continue;
    const parts = line.split('\t');
    if (parts.length < 4) continue;
    const group = Number(parts[1]);
    const { genotype, cohort, ageGroup } = decodeGroup(group);
    rows.push({
      survey: Number(parts[0]),
      group,
      genotype,
      cohort,
      ageGroup,
      measureId: Number(parts[2]),
      value: Number(parts[3]),
    });
  }
  return rows;
}

/** Distinct measure ids present, in ascending order. */
export function measuresPresent(rows: SurveyRow[]): number[] {
  return [...new Set(rows.map((r) => r.measureId))].sort((a, b) => a - b);
}

/** Distinct survey numbers, ascending. */
export function surveysPresent(rows: SurveyRow[]): number[] {
  return [...new Set(rows.map((r) => r.survey))].sort((a, b) => a - b);
}

/** Distinct age-group / species indices for a given measure, ascending. */
export function ageGroupsForMeasure(rows: SurveyRow[], measureId: number): number[] {
  const set = new Set<number>();
  for (const r of rows) if (r.measureId === measureId) set.add(r.ageGroup);
  return [...set].sort((a, b) => a - b);
}
