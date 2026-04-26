import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRecordings, removeRecordingByUri } from '../storage/recordingStorage';
import {
  clearRecordingFromEvent,
  clearRecordingRefsFromEvents,
  deleteAllEvents,
} from '../storage/eventStorage';
import { updateRecordingEventLink } from '../storage/recordingStorage';

const RECORDINGS_KEY = '@smartpocketbuddy_recordings';

/** Min bytes per second for M4A AAC (~16KB/sec at 128kbps) */
const MIN_BYTES_PER_SEC = 8000;
/** Rough floor for H.264/AAC MP4 while recording (conservative). */
const MIN_VIDEO_BYTES_PER_SEC = 40000;

/**
 * Wait for the recording file to be fully written after stop().
 * iOS can return the URI before the file is finalized; polling avoids truncated recordings.
 */
export async function waitForRecordingFinalized(
  uri: string | undefined,
  expectedDurationSec: number
): Promise<void> {
  if (!uri) return;
  await new Promise((r) => setTimeout(r, 800));
  const minSize = Math.max(1024, expectedDurationSec * MIN_BYTES_PER_SEC);
  const deadline = Date.now() + 2500;
  let lastSize = 0;
  let stableCount = 0;
  while (Date.now() < deadline) {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      const size = (info as { size?: number }).size ?? 0;
      if (size >= minSize) return;
      if (size === lastSize && size > 0) {
        stableCount++;
        if (stableCount >= 2) return;
      } else {
        stableCount = 0;
      }
      lastSize = size;
    } catch {
      // File may not exist yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}

/**
 * Wait for MP4 to finish writing after CameraView stop (iOS can finalize late).
 */
export async function waitForVideoRecordingFinalized(
  uri: string | undefined,
  expectedDurationSec: number
): Promise<void> {
  if (!uri) return;
  await new Promise((r) => setTimeout(r, 800));
  const minSize = Math.max(512 * 1024, expectedDurationSec * MIN_VIDEO_BYTES_PER_SEC);
  const deadline = Date.now() + 5000;
  let lastSize = 0;
  let stableCount = 0;
  while (Date.now() < deadline) {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      const size = (info as { size?: number }).size ?? 0;
      if (size >= minSize) return;
      if (size === lastSize && size > 0) {
        stableCount++;
        if (stableCount >= 2) return;
      } else {
        stableCount = 0;
      }
      lastSize = size;
    } catch {
      // File may not exist yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
}

/**
 * Delete a single recording (file + metadata + event ref).
 * Call with eventId when deleting from History to clear the event's recording ref.
 */
/** After `saveRecording` + `addSafetyEvent` / save*Session, attach the history row id to recording metadata. */
export async function linkRecordingToSessionEvent(recordingUri: string, eventId: string): Promise<void> {
  await updateRecordingEventLink(recordingUri, eventId);
}

export async function deleteSingleRecording(uri: string, eventId?: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri);
    }
  } catch {
    // File may already be gone
  }
  await removeRecordingByUri(uri);
  if (eventId) {
    await clearRecordingFromEvent(eventId);
  }
}

/**
 * Delete all recording files and clear recordings list.
 * Keeps event history (timestamps, locations) but removes recording refs.
 */
export async function deleteAllRecordings(): Promise<void> {
  const recordings = await getRecordings();
  for (const rec of recordings) {
    try {
      const info = await FileSystem.getInfoAsync(rec.uri);
      if (info.exists) {
        await FileSystem.deleteAsync(rec.uri);
      }
    } catch {
      // Continue if file already gone
    }
  }
  await AsyncStorage.setItem(RECORDINGS_KEY, '[]');
  await clearRecordingRefsFromEvents();
}

/**
 * Erase everything: delete all recordings AND clear entire event history.
 */
export async function eraseEverything(): Promise<void> {
  await deleteAllRecordings();
  await deleteAllEvents();
}

/**
 * Reset app to first-run state: wipes all data and clears onboarding.
 * Use this before taking App Store screenshots.
 */
export async function resetAppForScreenshots(): Promise<void> {
  await deleteAllRecordings();
  await deleteAllEvents();
  const keys = await AsyncStorage.getAllKeys();
  const appKeys = keys.filter(
    (k) =>
      k.startsWith('@smartpocketbuddy') ||
      k.startsWith('@smartprobono') ||
      k.startsWith('@pocketbuddy')
  );
  if (appKeys.length > 0) {
    await AsyncStorage.multiRemove(appKeys);
  }
}
