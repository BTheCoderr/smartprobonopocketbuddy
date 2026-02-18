import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRecordings } from '../storage/recordingStorage';
import { clearRecordingRefsFromEvents } from '../storage/eventStorage';

const RECORDINGS_KEY = '@smartpocketbuddy_recordings';

/**
 * Safely delete all recordings from disk and remove metadata.
 * Also clears recordingUri from event history.
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
