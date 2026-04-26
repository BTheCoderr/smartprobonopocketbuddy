import AsyncStorage from '@react-native-async-storage/async-storage';

const SCHEDULE_KEY = '@smartprobono_kid_schedule_v1';
const LAST_PROMPT_KEY = '@smartprobono_kid_schedule_last_prompt';

/** 0 = Sunday … 6 = Saturday (matches `Date.getDay()`). */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface KidSchedule {
  enabled: boolean;
  /** Selected weekdays; empty means schedule is incomplete when enabled. */
  weekDays: number[];
  hour: number;
  minute: number;
}

const DEFAULT_SCHEDULE: KidSchedule = {
  enabled: false,
  weekDays: [],
  hour: 8,
  minute: 0,
};

function clampHour(h: number): number {
  if (Number.isNaN(h)) return 8;
  return Math.min(23, Math.max(0, Math.floor(h)));
}

function clampMinute(m: number): number {
  if (Number.isNaN(m)) return 0;
  return Math.min(59, Math.max(0, Math.floor(m)));
}

function normalizeWeekDays(days: number[]): number[] {
  const set = new Set<number>();
  for (const d of days) {
    if (typeof d === 'number' && d >= 0 && d <= 6) set.add(d);
  }
  return Array.from(set).sort((a, b) => a - b);
}

export async function getKidSchedule(): Promise<KidSchedule> {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULE_KEY);
    if (!raw) return { ...DEFAULT_SCHEDULE };
    const parsed = JSON.parse(raw) as Partial<KidSchedule>;
    return {
      enabled: !!parsed.enabled,
      weekDays: normalizeWeekDays(Array.isArray(parsed.weekDays) ? parsed.weekDays : []),
      hour: clampHour(Number(parsed.hour)),
      minute: clampMinute(Number(parsed.minute)),
    };
  } catch {
    return { ...DEFAULT_SCHEDULE };
  }
}

export async function saveKidSchedule(schedule: KidSchedule): Promise<void> {
  const normalized: KidSchedule = {
    enabled: schedule.enabled,
    weekDays: normalizeWeekDays(schedule.weekDays ?? []),
    hour: clampHour(schedule.hour),
    minute: clampMinute(schedule.minute),
  };
  await AsyncStorage.setItem(SCHEDULE_KEY, JSON.stringify(normalized));
}

function slotKeyForNow(schedule: KidSchedule): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${schedule.hour}_${schedule.minute}`;
}

/**
 * True when schedule is enabled, today is selected, current clock matches hour:minute,
 * and we have not already prompted for this calendar slot.
 */
export async function shouldPromptKidSchedule(): Promise<boolean> {
  const s = await getKidSchedule();
  if (!s.enabled || s.weekDays.length === 0) return false;
  const now = new Date();
  if (!s.weekDays.includes(now.getDay())) return false;
  if (now.getHours() !== s.hour || now.getMinutes() !== s.minute) return false;
  const slot = slotKeyForNow(s);
  const last = await AsyncStorage.getItem(LAST_PROMPT_KEY);
  if (last === slot) return false;
  return true;
}

/** Call when showing the prompt or after user dismisses, so the same slot is not re-prompted. */
export async function markKidSchedulePromptShown(): Promise<void> {
  const s = await getKidSchedule();
  await AsyncStorage.setItem(LAST_PROMPT_KEY, slotKeyForNow(s));
}
