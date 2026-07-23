import { describe, it, expect } from 'vitest';
import { parseSurvey, decodeGroup, measuresPresent, ageGroupsForMeasure } from './parseSurvey';
import { parseCts } from './parseCts';

describe('decodeGroup', () => {
  it('unpacks genotype/cohort/ageGroup per API.md §5', () => {
    expect(decodeGroup(1)).toEqual({ genotype: 0, cohort: 0, ageGroup: 1 });
    expect(decodeGroup(0)).toEqual({ genotype: 0, cohort: 0, ageGroup: 0 });
    // genotype=2, cohort=3, ageGroup=4
    expect(decodeGroup(2 * 1_000_000 + 3 * 1000 + 4)).toEqual({
      genotype: 2,
      cohort: 3,
      ageGroup: 4,
    });
  });
});

describe('parseSurvey', () => {
  const sample = ['1\t1\t0\t4', '1\t2\t0\t5', '1\t3\t3\t2', ''].join('\n');

  it('parses the 4-column TSV and decodes groups (API.md example rows)', () => {
    const rows = parseSurvey(sample);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ survey: 1, ageGroup: 1, measureId: 0, value: 4 });
    expect(rows[2]).toMatchObject({ survey: 1, ageGroup: 3, measureId: 3, value: 2 });
  });

  it('ignores blank lines', () => {
    expect(parseSurvey('\n\n')).toHaveLength(0);
  });

  it('reports measures and age groups present', () => {
    const rows = parseSurvey(sample);
    expect(measuresPresent(rows)).toEqual([0, 3]);
    expect(ageGroupsForMeasure(rows, 0)).toEqual([1, 2]);
  });
});

describe('parseCts', () => {
  it('parses a header-prefixed wide TSV keyed by column', () => {
    const cts = ['##\t##', 'timestep\tinput EIR\tsimulated EIR', '1\t0.5\t0.4', '2\t0.6\t0.55'].join('\n');
    const table = parseCts(cts);
    expect(table).not.toBeNull();
    expect(table!.columns).toEqual(['timestep', 'input EIR', 'simulated EIR']);
    expect(table!.rows).toHaveLength(2);
    expect(table!.rows[0]).toEqual({ timestep: 1, 'input EIR': 0.5, 'simulated EIR': 0.4 });
  });

  it('returns null for empty input', () => {
    expect(parseCts('')).toBeNull();
  });
});
