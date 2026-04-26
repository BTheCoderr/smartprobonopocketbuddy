import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LiveSessionRecord } from '../types/session';

const ACTIVE_KEY = '@pocketbuddy_active_live_session';

export async function getPersistedActiveSession(): Promise<LiveSessionRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LiveSessionRecord;
    if (!parsed?.id || !Array.isArray(parsed.route)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function persistActiveSession(session: LiveSessionRecord): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(session));
}

export async function clearPersistedActiveSession(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_KEY);
}
