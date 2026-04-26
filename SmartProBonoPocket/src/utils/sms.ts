import { Linking, Platform } from 'react-native';
import { ScenarioType } from '../types';
import { getAlertPhoneNumbers } from '../storage/contactStorage';

const SAFETY_MODE_MESSAGE = (locationUrl: string) =>
  `I'm in Safety Mode. My location: ${locationUrl}. Please stay available.`;

const KID_TRACK_MESSAGE = (locationUrl: string) =>
  `Kid Track is on. My location: ${locationUrl}. Please stay available.`;

const SCENARIO_SMS_LABELS: Record<ScenarioType, string> = {
  pulled_over: 'pulled over',
  stopped_questioned: 'stopped and questioned',
  calling_police: 'calling police',
  other: 'in a legal situation',
  travel: 'traveling',
  kid_track: 'using Kid Track',
};

const LEGACY_MESSAGE = (locationUrl: string, scenario: ScenarioType) =>
  `I'm in Safety Mode. I've been ${SCENARIO_SMS_LABELS[scenario]}. My location: ${locationUrl}`;

export function buildSmsUrl(phone: string, message: string): string {
  const encoded = encodeURIComponent(message);
  const cleanPhone = phone.replace(/\D/g, '');
  if (Platform.OS === 'ios') {
    return `sms:${cleanPhone}&body=${encoded}`;
  }
  return `sms:${cleanPhone}?body=${encoded}`;
}

/** Opens SMS with Safety Mode message. Used by streamlined 2-tap flow. */
export async function openSmsSafetyMode(phone: string, locationUrl: string): Promise<boolean> {
  const message = SAFETY_MODE_MESSAGE(locationUrl);
  const url = buildSmsUrl(phone, message);
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Kid Track SMS (same Trusted Circle list, distinct body). */
export async function openSmsKidTrackMode(phone: string, locationUrl: string): Promise<boolean> {
  const message = KID_TRACK_MESSAGE(locationUrl);
  const url = buildSmsUrl(phone, message);
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Opens Safety Mode SMS for each number in call order.
 * Dedupes by normalized digits (first wins). Small delay between opens so composers can appear.
 */
export async function openSmsSafetyModeForPhones(
  phones: string[],
  locationUrl: string
): Promise<void> {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const p of phones) {
    const n = p.replace(/\D/g, '');
    if (!n || seen.has(n)) continue;
    seen.add(n);
    ordered.push(n);
  }
  for (let i = 0; i < ordered.length; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 600));
    }
    await openSmsSafetyMode(ordered[i], locationUrl);
  }
}

/**
 * Kid Track: SMS each trusted number in order (deduped), Kid Track body.
 */
export async function openSmsKidTrackModeForPhones(
  phones: string[],
  locationUrl: string
): Promise<void> {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const p of phones) {
    const n = p.replace(/\D/g, '');
    if (!n || seen.has(n)) continue;
    seen.add(n);
    ordered.push(n);
  }
  for (let i = 0; i < ordered.length; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 600));
    }
    await openSmsKidTrackMode(ordered[i], locationUrl);
  }
}

/** Open SMS for all Trusted Circle numbers — Safety or Kid Track wording. */
export async function alertTrustedContacts(
  locationUrl: string,
  options?: { kidTrack?: boolean }
): Promise<void> {
  const phones = await getAlertPhoneNumbers();
  if (phones.length === 0) return;
  if (options?.kidTrack) {
    await openSmsKidTrackModeForPhones(phones, locationUrl);
    return;
  }
  await openSmsSafetyModeForPhones(phones, locationUrl);
}

export async function openSmsToContact(phone: string, locationUrl: string, scenario: ScenarioType): Promise<boolean> {
  const message = LEGACY_MESSAGE(locationUrl, scenario);
  const url = buildSmsUrl(phone, message);
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
