import * as Location from 'expo-location';
import { LocationCoords } from '../types';

export async function getCurrentLocation(): Promise<LocationCoords | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
  } catch {
    return null;
  }
}

export function formatLocationForMaps(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

export type StartSafetySessionResult = {
  locationLink: string | undefined;
};

/** Resolve GPS + map link for Safety Mode confirm flow (before SMS + navigation). */
export async function startSafetySession(): Promise<StartSafetySessionResult> {
  const loc = await getCurrentLocation();
  const locationLink = loc ? formatLocationForMaps(loc.latitude, loc.longitude) : undefined;
  return { locationLink };
}
