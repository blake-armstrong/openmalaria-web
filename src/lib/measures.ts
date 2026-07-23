// Survey measure catalog. Names come from OpenMalaria's model/mon/OutputMeasures.h;
// short labels/descriptions follow js/API.md §5. A scenario emits only the measures
// it enables, and may emit ids not listed here — labelFor() falls back to "measure #N"
// rather than failing (per API.md guidance).

export interface MeasureInfo {
  /** OpenMalaria's internal name, e.g. "nHost". */
  name: string;
  /** Human-friendly label for UI. */
  label: string;
  /** One-line meaning. */
  description?: string;
  /** True for the entomological vector measures where `ageGroup` is a species index. */
  vector?: boolean;
}

export const MEASURES: Record<number, MeasureInfo> = {
  0: { name: 'nHost', label: 'Hosts', description: 'Number of humans in the age group' },
  1: { name: 'nInfect', label: 'Infected hosts', description: 'Number of infected humans' },
  2: { name: 'nExpectd', label: 'Expected infected', description: 'Expected number infected' },
  3: { name: 'nPatent', label: 'Patent hosts', description: 'Humans with detectable parasitaemia' },
  5: { name: 'sumlogDens', label: 'Σ log density', description: 'Sum of log parasite densities' },
  6: { name: 'totalInfs', label: 'Total infections', description: 'Total number of infections' },
  7: { name: 'nTransmit', label: 'Transmitting hosts', description: 'Humans contributing to transmission (not age-grouped)' },
  8: { name: 'totalPatentInf', label: 'Total patent infections', description: 'Total patent infections' },
  9: { name: 'contrib', label: 'Contribution', description: 'Contribution to transmission' },
  11: { name: 'nTreatments1', label: 'Treatments (1)', description: 'Treatments, level 1' },
  12: { name: 'nTreatments2', label: 'Treatments (2)', description: 'Treatments, level 2' },
  13: { name: 'nTreatments3', label: 'Treatments (3)', description: 'Treatments, level 3' },
  14: { name: 'nUncomp', label: 'Uncomplicated', description: 'Uncomplicated malaria episodes' },
  15: { name: 'nSevere', label: 'Severe', description: 'Severe malaria episodes' },
  16: { name: 'nSeq', label: 'Sequelae', description: 'Cases with sequelae' },
  17: { name: 'nHospitalDeaths', label: 'Hospital deaths', description: 'Deaths in hospital' },
  18: { name: 'nIndDeaths', label: 'Indirect deaths', description: 'Indirect malaria deaths' },
  19: { name: 'nDirDeaths', label: 'Direct deaths', description: 'Direct malaria deaths' },
  25: { name: 'nIPTDoses', label: 'IPT doses', description: 'Intermittent preventive treatment doses' },
  26: { name: 'annAvgK', label: 'Annual avg κ', description: 'Annual average kappa (infectiousness)' },
  31: { name: 'Vector_Nv0', label: 'Emergence rate N_v0', description: 'Mosquito emergence rate (per species)', vector: true },
  32: { name: 'Vector_Nv', label: 'Host-seeking N_v', description: 'Host-seeking mosquitoes (per species)', vector: true },
  33: { name: 'Vector_Ov', label: 'Infected O_v', description: 'Infected mosquitoes (per species)', vector: true },
  34: { name: 'Vector_Sv', label: 'Infectious S_v', description: 'Infectious mosquitoes (per species)', vector: true },
  35: { name: 'inputEIR', label: 'Input EIR', description: 'Input entomological inoculation rate' },
  36: { name: 'simulatedEIR', label: 'Simulated EIR', description: 'Simulated EIR' },
  39: { name: 'Clinical_RDTs', label: 'RDTs', description: 'Rapid diagnostic tests used' },
  40: { name: 'Clinical_DrugUsage', label: 'Drug usage', description: 'Drug doses administered' },
  43: { name: 'nNewInfections', label: 'New infections', description: 'New infections this survey' },
  47: { name: 'nMassVA', label: 'Mass vaccinations', description: 'Mass vaccine administrations' },
  48: { name: 'Clinical_Microscopy', label: 'Microscopy', description: 'Microscopy tests used' },
  49: { name: 'Clinical_DrugUsageIV', label: 'IV drug usage', description: 'Intravenous drug doses' },
  50: { name: 'nAddedToCohort', label: 'Added to cohort', description: 'Humans added to a cohort' },
  51: { name: 'nRemovedFromCohort', label: 'Removed from cohort', description: 'Humans removed from a cohort' },
  53: { name: 'nNmfDeaths', label: 'NMF deaths', description: 'Non-malaria-fever deaths' },
  54: { name: 'nAntibioticTreatments', label: 'Antibiotics', description: 'Antibiotic treatments' },
};

export function measureInfo(id: number): MeasureInfo | undefined {
  return MEASURES[id];
}

export function labelFor(id: number): string {
  return MEASURES[id]?.label ?? `Measure #${id}`;
}

export function isVectorMeasure(id: number): boolean {
  return MEASURES[id]?.vector === true;
}
