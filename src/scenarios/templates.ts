// All 53 example scenarios from openmalaria-wasm-port/test/ (schema v49,
// same fixtures the model's own test suite exercises), served as static
// files under public/scenarios/ and fetched on demand — 1.6MB total across
// all of them, which is not worth eagerly bundling into the JS.

export interface ScenarioTemplate {
  id: string;
  name: string;
  file: string;
}

// scenario1 is the default "new scenario" template: a small (100-person)
// scenario that exercises both output.txt (SurveyOptions) and ctsout.txt
// (<continuous>), good for a first look at the whole app.
export const DEFAULT_TEMPLATE_ID = 'scenario1';

const FILES = [
  'scenario1.xml', 'scenario2ITNs.xml', 'scenario4.xml', 'scenario5.xml', 'scenario6.xml',
  'scenario9.xml', 'scenario10.xml', 'scenario11.xml', 'scenario12.xml', 'scenario12a.xml',
  'scenarioAvailabilityFilter.xml', 'scenarioBSV.xml', 'scenarioCohort.xml',
  'scenarioDecisionTree5DayDielmo.xml', 'scenarioEffectiveDrug.xml', 'scenarioEmpirical.xml',
  'scenarioESTS.xml', 'scenarioExactNv0.xml', 'scenarioGaussianCopulaGamma.xml',
  'scenarioGaussianCopulaLognormal.xml', 'scenarioGenotypes.xml', 'scenarioHetVecDailyEIR.xml',
  'scenarioInfectionOrigin.xml', 'scenarioIRS30.xml', 'scenarioKK_20150612.xml',
  'scenarioLifeNet1.xml', 'scenarioLifeNet2.xml', 'scenarioModelNameManyOverrides.xml',
  'scenarioModelNameModelOptionOverrides.xml', 'scenarioModelNameNoOverrides.xml',
  'scenarioModelNameParamOverrides.xml', 'scenarioMolineaux.xml', 'scenarioMolPairwise.xml',
  'scenarioMonitoringAll.xml', 'scenarioMSAT.xml', 'scenarioMSAT_HRP2.xml',
  'scenarioNamawalaArabiensis.xml', 'scenarioNoInterv.xml', 'scenarioNoMPDLarviciding.xml',
  'scenarioNonHumanHosts.xml', 'scenarioPenny.xml', 'scenarioPEV.xml', 'scenarioRach5IC.xml',
  'scenarioSimpleMPDLarviciding.xml', 'scenarioSimpleMPDTest.xml', 'scenarioSubPopRemoval.xml',
  'scenarioTBV.xml', 'scenarioTrapTest.xml', 'scenarioTriggeredMSAT.xml', 'scenarioVecFullTest.xml',
  'scenarioVecMonthly.xml', 'scenarioVecTest.xml', 'scenarioVivax.xml',
];

function humanize(file: string): string {
  const base = file.replace(/\.xml$/i, '');
  let name = base.replace(/^scenario/i, '') || base;
  name = name
    .replace(/_/g, ' ')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // e.g. "MPDLarviciding" -> "MPD Larviciding"
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    .trim();
  return /^\d/.test(name) ? `Scenario ${name}` : name;
}

export const TEMPLATES: ScenarioTemplate[] = FILES.map((file) => ({
  id: file.replace(/\.xml$/i, ''),
  name: humanize(file),
  file,
})).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

export function templateUrl(file: string): string {
  return `${import.meta.env.BASE_URL}scenarios/${file}`;
}

export async function loadTemplateXml(id: string): Promise<string> {
  const template = TEMPLATES.find((t) => t.id === id);
  if (!template) throw new Error(`Unknown scenario template: ${id}`);
  const res = await fetch(templateUrl(template.file));
  if (!res.ok) throw new Error(`Failed to load ${template.file}: ${res.status}`);
  return res.text();
}
