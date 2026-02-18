import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@smartpocketbuddy_';
const KEY_RECORDING_ENABLED = `${PREFIX}recording_enabled`;
const KEY_AUTO_SHARE = `${PREFIX}auto_share`;
const KEY_FIRST_RUN_DISCLOSURE = `${PREFIX}has_seen_recording_disclosure`;

/** Safe get - returns null if native module fails (e.g. NativeSharedObjectNotFoundException after bridge reset) */
async function safeGet(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Safe set - no-op if native module fails */
async function safeSet(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // Ignore
  }
}

export async function getRecordingEnabled(): Promise<boolean> {
  const v = await safeGet(KEY_RECORDING_ENABLED);
  return v === null ? true : v === 'true';
}

export async function setRecordingEnabled(enabled: boolean): Promise<void> {
  await safeSet(KEY_RECORDING_ENABLED, enabled.toString());
}

export async function getAutoShare(): Promise<boolean> {
  const v = await safeGet(KEY_AUTO_SHARE);
  return v === 'true';
}

export async function setAutoShare(enabled: boolean): Promise<void> {
  await safeSet(KEY_AUTO_SHARE, enabled.toString());
}

export async function hasSeenRecordingDisclosure(): Promise<boolean> {
  const v = await safeGet(KEY_FIRST_RUN_DISCLOSURE);
  return v === 'true';
}

export async function setRecordingDisclosureSeen(): Promise<void> {
  await safeSet(KEY_FIRST_RUN_DISCLOSURE, 'true');
}
