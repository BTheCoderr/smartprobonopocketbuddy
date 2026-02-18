export type ScenarioType =
  | 'pulled_over'
  | 'stopped_questioned'
  | 'calling_police'
  | 'other';

export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface SafetySession {
  id: string;
  scenario: ScenarioType;
  timestamp: string;
  location?: LocationCoords;
  notes?: string;
}
