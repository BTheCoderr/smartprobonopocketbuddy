/** Single GPS sample during an active PocketBuddy session (Safety, Travel, or Kid Track). */
export interface RoutePoint {
  t: string;
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number | null;
  heading?: number | null;
}

export type LiveSessionMode = 'safety' | 'travel' | 'kid_track';

/** Persisted live session document (active or ended). */
export interface LiveSessionRecord {
  id: string;
  mode: LiveSessionMode;
  status: 'active' | 'ended';
  startedAt: string;
  endedAt?: string;
  /** Map link from the initial SMS ping (same as Home → Active). */
  initialLocationLink?: string;
  /** Travel Mode: optional arrival check (minutes); None = no timer. */
  arrivalCheckMinutes?: number | null;
  route: RoutePoint[];
}
