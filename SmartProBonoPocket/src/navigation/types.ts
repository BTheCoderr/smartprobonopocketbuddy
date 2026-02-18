import { ScenarioType } from '../types';

export type RootStackParamList = {
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
