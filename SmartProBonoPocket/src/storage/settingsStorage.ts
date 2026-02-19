import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@smartpocketbuddy_';
const KEY_RECORDING_ENABLED = `${PREFIX}recording_enabled`;
const KEY_AUTO_SHARE = `${PREFIX}auto_share`;
const KEY_FIRST_RUN_DISCLOSURE = `${PREFIX}has_seen_recording_disclosure`;
const KEY_PRESET_MODE = `${PREFIX}preset_mode`;
const KEY_ONBOARDING_COMPLETE = `${PREFIX}onboarding_complete`;
const KEY_PIP_MODE = `${PREFIX}pip_mode`;

export type PresetMode = 'audio' | 'video' | 'both' | 'auto';

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

export async function getPresetMode(): Promise<PresetMode> {
  const v = await safeGet(KEY_PRESET_MODE);
  if (v === 'audio' || v === 'video' || v === 'both' || v === 'auto') return v;
  return 'audio';
}

export async function setPresetMode(mode: PresetMode): Promise<void> {
  await safeSet(KEY_PRESET_MODE, mode);
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  return (await safeGet(KEY_ONBOARDING_COMPLETE)) === 'true';
}

export async function setOnboardingComplete(): Promise<void> {
  await safeSet(KEY_ONBOARDING_COMPLETE, 'true');
}

/** Floating window (PiP) mode - shows recording in a small window when switching apps. Opt-in, off by default. */
export async function getPipModeEnabled(): Promise<boolean> {
  return (await safeGet(KEY_PIP_MODE)) === 'true';
}

export async function setPipModeEnabled(enabled: boolean): Promise<void> {
  await safeSet(KEY_PIP_MODE, enabled.toString());
}
