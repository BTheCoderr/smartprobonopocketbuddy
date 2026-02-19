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
  label?: string;
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

/** Remove recordingUri from a single event */
export async function clearRecordingFromEvent(eventId: string): Promise<void> {
  const events = await getSafetyEvents();
  const updated = events.map((evt) =>
    evt.id === eventId ? { ...evt, recordingUri: undefined } : evt
  );
  await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
}

/** Delete all events (erase entire history) */
export async function deleteAllEvents(): Promise<void> {
  await AsyncStorage.setItem(EVENTS_KEY, '[]');
}

/** Delete a single event by id */
export async function deleteEvent(eventId: string): Promise<void> {
  const events = await getSafetyEvents();
  const updated = events.filter((evt) => evt.id !== eventId);
  await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
}

/** Update an event's label (custom name) */
export async function updateEventLabel(eventId: string, label: string): Promise<void> {
  const events = await getSafetyEvents();
  const updated = events.map((evt) =>
    evt.id === eventId ? { ...evt, label: label.trim() || undefined } : evt
  );
  await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
}
