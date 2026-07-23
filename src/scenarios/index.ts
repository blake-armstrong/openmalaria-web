// Curated, bundled example scenarios (schema 49). Imported as raw XML strings so
// they can be handed straight to runScenario. Users can also upload their own XML.

import noInterv from './noInterv.xml?raw';
import namawala from './namawalaArabiensis.xml?raw';
import msat from './msat.xml?raw';
import irs30 from './irs30.xml?raw';

export interface Example {
  id: string;
  name: string;
  blurb: string;
  /** Rough character of the run, shown as a tag. */
  tag: 'baseline' | 'entomology' | 'intervention';
  xml: string;
}

export const EXAMPLES: Example[] = [
  {
    id: 'noInterv',
    name: 'No interventions',
    blurb: 'A clean baseline: Ifakara demography, quarterly surveys, nothing deployed. Good first run.',
    tag: 'baseline',
    xml: noInterv,
  },
  {
    id: 'namawala',
    name: 'Namawala · A. arabiensis',
    blurb: 'Entomological setting with a single vector species — produces the mosquito (N_v, O_v, S_v) measures.',
    tag: 'entomology',
    xml: namawala,
  },
  {
    id: 'msat',
    name: 'Mass screen-and-treat + ITNs',
    blurb: 'Combines mass screen-and-treat rounds with insecticide-treated nets.',
    tag: 'intervention',
    xml: msat,
  },
  {
    id: 'irs30',
    name: 'IRS intervention cohort',
    blurb: 'Indoor residual spraying over a 5-day case-management cohort (larger population).',
    tag: 'intervention',
    xml: irs30,
  },
];
