import AsyncStorage from '@react-native-async-storage/async-storage';

const EMERGENCY_CONTACT_KEY = '@smartprobono_emergency_contact';
const SECONDARY_CONTACT_KEY = '@smartprobono_secondary_contact';
const MEDICAL_NOTES_KEY = '@smartprobono_medical_notes';

export interface StoredContact {
  name: string;
  phone: string;
}

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

export async function getSecondaryContact(): Promise<StoredContact | null> {
  try {
    const raw = await AsyncStorage.getItem(SECONDARY_CONTACT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveSecondaryContact(contact: StoredContact | null): Promise<void> {
  if (contact) {
    await AsyncStorage.setItem(SECONDARY_CONTACT_KEY, JSON.stringify(contact));
  } else {
    await AsyncStorage.removeItem(SECONDARY_CONTACT_KEY);
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
