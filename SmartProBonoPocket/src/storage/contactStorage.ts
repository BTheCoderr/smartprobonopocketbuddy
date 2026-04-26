import AsyncStorage from '@react-native-async-storage/async-storage';

const EMERGENCY_CONTACT_KEY = '@smartprobono_emergency_contact';
const SECONDARY_CONTACT_KEY = '@smartprobono_secondary_contact';
const ADDITIONAL_CONTACTS_KEY = '@smartprobono_trusted_additional_v1';
const MEDICAL_NOTES_KEY = '@smartprobono_medical_notes';

/** Max additional contacts after primary (Trusted Circle). */
export const MAX_ADDITIONAL_CONTACTS = 5;

export interface StoredContact {
  name: string;
  phone: string;
}

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** Primary only. Share / auto-share flows use this for dialog titles (one system sheet, one named recipient); SMS alerts use `getAlertPhoneNumbers()`. */
export async function getEmergencyContact(): Promise<StoredContact | null> {
  try {
    const raw = await AsyncStorage.getItem(EMERGENCY_CONTACT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveEmergencyContact(contact: StoredContact): Promise<void> {
  await AsyncStorage.setItem(EMERGENCY_CONTACT_KEY, JSON.stringify(contact));
}

/** One-time migration: legacy single secondary → additional array. */
async function ensureAdditionalContactsMigrated(): Promise<void> {
  const has = await AsyncStorage.getItem(ADDITIONAL_CONTACTS_KEY);
  if (has !== null) return;

  const legacyRaw = await AsyncStorage.getItem(SECONDARY_CONTACT_KEY);
  if (!legacyRaw) {
    await AsyncStorage.setItem(ADDITIONAL_CONTACTS_KEY, '[]');
    return;
  }
  try {
    const legacy = JSON.parse(legacyRaw) as StoredContact;
    if (legacy?.phone?.trim()) {
      await AsyncStorage.setItem(ADDITIONAL_CONTACTS_KEY, JSON.stringify([legacy]));
    } else {
      await AsyncStorage.setItem(ADDITIONAL_CONTACTS_KEY, '[]');
    }
  } catch {
    await AsyncStorage.setItem(ADDITIONAL_CONTACTS_KEY, '[]');
  }
  await AsyncStorage.removeItem(SECONDARY_CONTACT_KEY);
}

/** Additional trusted contacts after primary, in priority order (max 5). */
export async function getAdditionalContacts(): Promise<StoredContact[]> {
  await ensureAdditionalContactsMigrated();
  try {
    const raw = await AsyncStorage.getItem(ADDITIONAL_CONTACTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as StoredContact[];
    if (!Array.isArray(list)) return [];
    return list
      .slice(0, MAX_ADDITIONAL_CONTACTS)
      .filter((c) => c && typeof c.phone === 'string' && c.phone.trim().length > 0)
      .map((c) => ({
        name: typeof c.name === 'string' ? c.name : '',
        phone: c.phone.trim(),
      }));
  } catch {
    return [];
  }
}

export async function saveAdditionalContacts(contacts: StoredContact[]): Promise<void> {
  const trimmed = contacts
    .slice(0, MAX_ADDITIONAL_CONTACTS)
    .map((c) => ({ name: (c.name ?? '').trim(), phone: (c.phone ?? '').trim() }))
    .filter((c) => c.phone.length > 0);
  await AsyncStorage.setItem(ADDITIONAL_CONTACTS_KEY, JSON.stringify(trimmed));
}

/** @deprecated Prefer getAdditionalContacts(); returns first additional if present. */
export async function getSecondaryContact(): Promise<StoredContact | null> {
  const add = await getAdditionalContacts();
  return add[0] ?? null;
}

/** @deprecated Prefer saveAdditionalContacts(); updates first additional slot only. */
export async function saveSecondaryContact(contact: StoredContact | null): Promise<void> {
  const existing = await getAdditionalContacts();
  if (contact?.phone?.trim()) {
    await saveAdditionalContacts([contact, ...existing.slice(1)]);
  } else {
    await saveAdditionalContacts(existing.slice(1));
  }
}

export async function getMedicalNotes(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(MEDICAL_NOTES_KEY)) ?? '';
  } catch {
    return '';
  }
}

export async function saveMedicalNotes(notes: string): Promise<void> {
  if (notes.trim()) {
    await AsyncStorage.setItem(MEDICAL_NOTES_KEY, notes.trim());
  } else {
    await AsyncStorage.removeItem(MEDICAL_NOTES_KEY);
  }
}

/**
 * Phone numbers for SMS alerts in priority order: primary first, then additional contacts.
 * Deduplicates by normalized digits; first occurrence wins.
 * (Share UI stays primary-only via `getEmergencyContact` — see its note.)
 */
export async function getAlertPhoneNumbers(): Promise<string[]> {
  const primary = await getEmergencyContact();
  const additional = await getAdditionalContacts();
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (raw: string) => {
    const n = normalizePhoneDigits(raw);
    if (!n || seen.has(n)) return;
    seen.add(n);
    out.push(n);
  };

  if (primary?.phone) push(primary.phone);
  for (const c of additional) {
    if (c?.phone) push(c.phone);
  }
  return out;
}

// Trusted-number order above is consumed by `utils/sms` and `sessionService.startSession` for alerts.
