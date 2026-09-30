import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import type { KidSchedule } from '../storage/kidScheduleStorage';

const KID_NOTIFICATION_IDS_KEY = '@smartprobono_kid_notification_ids_v1';
const TRAVEL_NOTIFICATION_ID_KEY = '@smartprobono_travel_notification_id_v1';
const REMINDER_CHANNEL_ID = 'smartprobono-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'SmartProBono reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  try {
    await ensureAndroidChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

async function cancelIds(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map(async (id) => {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {
        // Notification may already have fired or been removed by the OS.
      }
    })
  );
}

export async function clearKidScheduleNotifications(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KID_NOTIFICATION_IDS_KEY);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    await cancelIds(Array.isArray(ids) ? ids : []);
  } finally {
    await AsyncStorage.removeItem(KID_NOTIFICATION_IDS_KEY);
  }
}

export async function syncKidScheduleNotifications(schedule: KidSchedule): Promise<boolean> {
  await clearKidScheduleNotifications();

  if (!schedule.enabled || schedule.weekDays.length === 0) return true;
  if (!(await ensureNotificationPermissions())) return false;

  const ids: string[] = [];
  try {
    for (const day of schedule.weekDays) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Kid Track reminder',
          body: 'It’s time for your scheduled check-in. Open SmartProBono to start Kid Track.',
          data: { kind: 'kid_track' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: day + 1,
          hour: schedule.hour,
          minute: schedule.minute,
          channelId: REMINDER_CHANNEL_ID,
        },
      });
      ids.push(id);
    }
    await AsyncStorage.setItem(KID_NOTIFICATION_IDS_KEY, JSON.stringify(ids));
    return true;
  } catch {
    await cancelIds(ids);
    return false;
  }
}

export async function cancelTravelArrivalCheck(): Promise<void> {
  try {
    const id = await AsyncStorage.getItem(TRAVEL_NOTIFICATION_ID_KEY);
    if (id) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {
        // It may have already fired.
      }
    }
  } finally {
    await AsyncStorage.removeItem(TRAVEL_NOTIFICATION_ID_KEY);
  }
}

export async function scheduleTravelArrivalCheck(minutes: number | null): Promise<boolean> {
  await cancelTravelArrivalCheck();
  if (!minutes || minutes <= 0) return true;
  if (!(await ensureNotificationPermissions())) return false;

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Travel check-in',
        body: 'You asked SmartProBono to check in. Are you okay?',
        data: { kind: 'travel_check_in' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(60, Math.round(minutes * 60)),
        repeats: false,
        channelId: REMINDER_CHANNEL_ID,
      },
    });
    await AsyncStorage.setItem(TRAVEL_NOTIFICATION_ID_KEY, id);
    return true;
  } catch {
    return false;
  }
}
