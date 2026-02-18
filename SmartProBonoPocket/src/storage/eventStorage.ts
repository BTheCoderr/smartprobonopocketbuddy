import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScenarioType } from '../types';

const EVENTS_KEY = '@smartprobono_safety_events';
const MAX_EVENTS = 10;

export interface SafetyEvent {
  id: string;
  scenario: ScenarioType;
  timestamp: string;
  locationLink?: string;
  recordingUri?: string;
  status: 'completed' | 'partial';
}

export async function getSafetyEvents(): Promise<SafetyEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(EVENTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function addSafetyEvent(event: Omit<SafetyEvent, 'id'>): Promise<void> {
  const events = await getSafetyEvents();
  const newEvent: SafetyEvent = {
    ...event,
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  };
  const updated = [newEvent, ...events].slice(0, MAX_EVENTS);
  await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
}

/** Remove recordingUri from all events (used when deleting all recordings) */
export async function clearRecordingRefsFromEvents(): Promise<void> {
  const events = await getSafetyEvents();
  const cleaned = events.map(({ recordingUri, ...rest }) => rest);
  await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(cleaned));
}
