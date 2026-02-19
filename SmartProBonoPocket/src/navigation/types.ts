import { ScenarioType } from '../types';

export type RootStackParamList = {
  Gate: undefined;
  Onboarding: undefined;
  Main: undefined;
  SetupContact: undefined;
  Active: { locationLink?: string };
  Recording: { scenario?: ScenarioType };
};

export type TabParamList = {
  Home: undefined;
  Record: { scenario?: ScenarioType };
  History: undefined;
  Settings: undefined;
};
