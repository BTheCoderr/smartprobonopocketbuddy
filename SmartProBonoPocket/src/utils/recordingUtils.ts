import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRecordings, removeRecordingByUri } from '../storage/recordingStorage';
import {
  clearRecordingFromEvent,
  clearRecordingRefsFromEvents,
  deleteAllEvents,
} from '../storage/eventStorage';

const RECORDINGS_KEY = '@smartpocketbuddy_recordings';

/** Min bytes per second for M4A AAC (~16KB/sec at 128kbps) */
const MIN_BYTES_PER_SEC = 8000;

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
      const info = await FileSystem.getInfoAsync(uri, { size: true });
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
 * Delete a single recording (file + metadata + event ref).
 * Call with eventId when deleting from History to clear the event's recording ref.
 */
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
