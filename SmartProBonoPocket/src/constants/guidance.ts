import { ScenarioType } from '../types';

export const SCENARIO_LABELS: Record<ScenarioType, string> = {
  pulled_over: 'Pulled Over',
  stopped_questioned: 'Stopped & Questioned',
  calling_police: 'Calling Police',
  other: 'Other',
  travel: 'Travel Mode',
  kid_track: 'Kid Track',
};
