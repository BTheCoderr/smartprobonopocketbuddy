import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const RECORDINGS_KEY = '@smartpocketbuddy_recordings';
const MAX_RECORDINGS = 20;
let currentSessionUri: string | null = null;

export type RecordingShareStatus = 'saved' | 'shared' | 'deleted';

export interface RecordingMeta {
  id: string;
  uri: string;
  timestamp: string;
  durationSeconds: number;
  shareStatus?: RecordingShareStatus;
  scenario?: string;
  locationLink?: string;
  /** History event id when this file was saved as part of a session row. */
  eventId?: string;
  /** Live session engine id when saved during a visit. */
  liveSessionId?: string;
}

export function setCurrentSessionRecording(uri: string | null): void {
  currentSessionUri = uri;
}

export function getCurrentSessionRecording(): string | null {
  return currentSessionUri;
}

export function clearCurrentSessionRecording(): void {
  currentSessionUri = null;
}

export async function saveRecording(
  uri: string,
  durationSeconds: number,
  options?: {
    scenario?: string;
    locationLink?: string;
    shareStatus?: RecordingShareStatus;
    extension?: string;
    eventId?: string;
    liveSessionId?: string;
  }
): Promise<string> {
  const ext = options?.extension ?? (uri.toLowerCase().endsWith('.mp4') ? '.mp4' : '.m4a');
  const filename = `recording_${Date.now()}${ext}`;
  const destUri = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.copyAsync({ from: uri, to: destUri });
  const meta: RecordingMeta = {
    id: `rec_${Date.now()}`,
    uri: destUri,
    timestamp: new Date().toISOString(),
    durationSeconds,
    shareStatus: options?.shareStatus ?? 'saved',
    scenario: options?.scenario,
    locationLink: options?.locationLink,
    ...(options?.eventId ? { eventId: options.eventId } : {}),
    ...(options?.liveSessionId ? { liveSessionId: options.liveSessionId } : {}),
  };
  const list = await getRecordings();
  const updated = [meta, ...list].slice(0, MAX_RECORDINGS);
  await AsyncStorage.setItem(RECORDINGS_KEY, JSON.stringify(updated));
  setCurrentSessionRecording(destUri);
  return destUri;
}

/** Attach a history event id to an existing saved recording row (same uri as in events). */
export async function updateRecordingEventLink(uri: string, eventId: string): Promise<void> {
  const list = await getRecordings();
  const updated = list.map((r) => (r.uri === uri ? { ...r, eventId } : r));
  await AsyncStorage.setItem(RECORDINGS_KEY, JSON.stringify(updated));
}

export async function getRecordings(): Promise<RecordingMeta[]> {
  try {
    const raw = await AsyncStorage.getItem(RECORDINGS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Remove a recording from the list by URI */
export async function removeRecordingByUri(uri: string): Promise<void> {
  const list = await getRecordings();
  const updated = list.filter((r) => r.uri !== uri);
  await AsyncStorage.setItem(RECORDINGS_KEY, JSON.stringify(updated));
}
