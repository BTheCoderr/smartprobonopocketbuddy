import { Linking, Platform } from 'react-native';
import { ScenarioType } from '../types';

const SAFETY_MODE_MESSAGE = (locationUrl: string) =>
  `I'm in Safety Mode. My location: ${locationUrl}. Please stay available.`;

const SCENARIO_SMS_LABELS: Record<ScenarioType, string> = {
  pulled_over: 'pulled over',
  stopped_questioned: 'stopped and questioned',
  calling_police: 'calling police',
  other: 'in a legal situation',
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
