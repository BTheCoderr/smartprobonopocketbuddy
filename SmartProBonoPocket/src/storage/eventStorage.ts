import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScenarioType } from '../types';
import type { RoutePoint } from '../types/session';

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
  /** Continuous GPS samples during the session (live tracking). */
  route?: RoutePoint[];
}

function isRoutePoint(x: unknown): x is RoutePoint {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.t === 'string' &&
    typeof o.lat === 'number' &&
    typeof o.lng === 'number'
  );
}

function parseStoredEvent(raw: unknown): SafetyEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (typeof e.id !== 'string' || typeof e.timestamp !== 'string') return null;
  const scenario = e.scenario;
  if (typeof scenario !== 'string') return null;
  let route: RoutePoint[] | undefined;
  if (Array.isArray(e.route)) {
    const pts = e.route.filter(isRoutePoint);
    if (pts.length > 0) route = pts;
  }
  const status = e.status === 'completed' || e.status === 'partial' ? e.status : 'partial';
  return {
    id: e.id,
    scenario: scenario as ScenarioType,
    timestamp: e.timestamp,
    locationLink: typeof e.locationLink === 'string' ? e.locationLink : undefined,
    recordingUri: typeof e.recordingUri === 'string' ? e.recordingUri : undefined,
    status,
    label: typeof e.label === 'string' ? e.label : undefined,
    route,
  };
}

/** One-line summary for History (point count + start/end coordinates). */
export function summarizeRouteForHistory(route?: RoutePoint[] | null): string | null {
  if (!route?.length) return null;
  const n = route.length;
  const first = route[0];
  const last = route[n - 1];
  return `${n} pts · ${first.lat.toFixed(3)},${first.lng.toFixed(3)} → ${last.lat.toFixed(3)},${last.lng.toFixed(3)}`;
}

export async function getSafetyEvents(): Promise<SafetyEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(EVENTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list.map(parseStoredEvent).filter((x): x is SafetyEvent => x !== null);
  } catch {
    return [];
  }
}

export async function addSafetyEvent(event: Omit<SafetyEvent, 'id'>): Promise<string> {
  const events = await getSafetyEvents();
  const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const newEvent: SafetyEvent = {
    ...event,
    id,
  };
  const updated = [newEvent, ...events].slice(0, MAX_EVENTS);
  await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
  return id;
}

/** Safety Mode session ended: append history row (scenario fixed to `other` for this flow). */
export async function saveSafetySessionEvent(
  event: Omit<SafetyEvent, 'id' | 'scenario'>
): Promise<string> {
  return addSafetyEvent({ ...event, scenario: 'other' });
}

/** Travel Mode session ended: route + optional video recording ref. */
export async function saveTravelSessionEvent(
  event: Omit<SafetyEvent, 'id' | 'scenario'>
): Promise<string> {
  return addSafetyEvent({ ...event, scenario: 'travel' });
}

/** Kid Track session ended (same device; reuses Safety-style audio + route). */
export async function saveKidTrackSessionEvent(
  event: Omit<SafetyEvent, 'id' | 'scenario'>
): Promise<string> {
  return addSafetyEvent({ ...event, scenario: 'kid_track' });
}

/** Unified history write: safety → scenario `other` (existing convention). */
export async function saveSessionHistoryEvent(
  type: 'safety' | 'travel' | 'kid_track',
  event: Omit<SafetyEvent, 'id' | 'scenario'>
): Promise<string> {
  const scenario = type === 'safety' ? 'other' : type;
  return addSafetyEvent({ ...event, scenario });
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
