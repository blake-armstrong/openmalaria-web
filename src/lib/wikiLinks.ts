// Maps XML element (tag) names to their documentation location in the
// OpenMalaria wiki (github.com/OpenMalaria-Org/openmalaria/wiki). Curated by
// hand against ScenarioDesign.md's own element table plus a few directly
// backtick-named sub-elements — not exhaustive (the schema has far more
// elements than are individually documented), but every entry here is a
// verified, working link rather than a guessed one. Unmapped tags simply
// get no hover tooltip.
//
// Anchors follow GitHub's heading-slug rule (lowercase; spaces -> hyphens;
// backticks/colons/punctuation stripped) confirmed directly against the
// wiki's own self-links, e.g. "### Scenario element: `scenario` ###" links
// to itself as "ScenarioDesign#scenario-element-scenario".

const WIKI_BASE = 'https://github.com/OpenMalaria-Org/openmalaria/wiki/';

export interface WikiLink {
  page: string;
  anchor?: string;
  label: string;
}

const LINKS: Record<string, WikiLink> = {
  scenario: { page: 'ScenarioDesign', anchor: 'scenario-element-scenario', label: 'Scenario root element' },
  demography: { page: 'ModelDemography', label: 'Human demography' },
  monitoring: { page: 'Monitoring', label: 'Monitoring' },
  interventions: { page: 'ModelInterventions', label: 'Interventions' },
  healthSystem: { page: 'ScenarioHealthSystem', label: 'Health system / case management' },
  entomology: { page: 'ScenarioTransmission', label: 'Transmission & entomology' },
  parasiteGenetics: { page: 'DrugResistanceGenotypes', label: 'Parasite genetics / drug resistance' },
  diagnostics: { page: 'ScenarioHealthSystem', anchor: 'diagnostics', label: 'Diagnostics' },
  pharmacology: { page: 'ScenarioPharmacology', label: 'Pharmacology / PK-PD' },
  model: { page: 'ScenarioDesign', anchor: 'model-parameters-model', label: 'Model parameters' },
  continuous: { page: 'ScenarioDesign', anchor: 'continuous-reporting-continuous', label: 'Continuous reporting' },
  SurveyOptions: { page: 'MonitoringOptions', anchor: 'survey-measures', label: 'Survey measures' },
  surveys: { page: 'ScenarioDesign', anchor: 'surveys-surveys-agegroup', label: 'Surveys & age groups' },
  ageGroup: { page: 'ScenarioDesign', anchor: 'surveys-surveys-agegroup', label: 'Age groups' },
  drug: { page: 'ScenarioPharmacology', label: 'Drug parameters' },
  ModelOptions: { page: 'ModelWithinHost', anchor: 'specification-of-model-variants', label: 'Model options' },
  clinical: { page: 'ScenarioDesign', anchor: 'clinical', label: 'Clinical / health system memory' },
};

export function wikiLinkFor(tagName: string): WikiLink | undefined {
  // XML tags may carry a namespace prefix, e.g. "om:scenario".
  const local = tagName.includes(':') ? tagName.slice(tagName.indexOf(':') + 1) : tagName;
  return LINKS[local];
}

export function wikiUrl(link: WikiLink): string {
  return WIKI_BASE + link.page + (link.anchor ? '#' + link.anchor : '');
}
