import { ScenarioType } from '../types';

export type RootStackParamList = {
  Gate: undefined;
  Onboarding: undefined;
  Main: undefined;
  FamilyHub: undefined;
  SetupContact: undefined;
  KidSchedule: undefined;
  Active: {
    locationLink?: string;
    sessionMode?: 'safety' | 'travel' | 'kid_track';
    arrivalCheckMinutes?: number | null;
  };
  HealthCheck: undefined;
};

export type TabParamList = {
  Home: undefined;
  Record: { scenario?: ScenarioType };
  History: undefined;
  Settings: undefined;
};
