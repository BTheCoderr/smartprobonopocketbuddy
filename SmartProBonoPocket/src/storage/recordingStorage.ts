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
  options?: { scenario?: string; locationLink?: string; shareStatus?: RecordingShareStatus }
): Promise<string> {
  const filename = `recording_${Date.now()}.m4a`;
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
  };
  const list = await getRecordings();
  const updated = [meta, ...list].slice(0, MAX_RECORDINGS);
  await AsyncStorage.setItem(RECORDINGS_KEY, JSON.stringify(updated));
  setCurrentSessionRecording(destUri);
  return destUri;
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
