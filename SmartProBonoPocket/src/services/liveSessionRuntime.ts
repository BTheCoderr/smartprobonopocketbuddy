import * as Location from 'expo-location';
import type { LiveSessionMode, LiveSessionRecord, RoutePoint } from '../types/session';
import {
  clearPersistedActiveSession,
  getPersistedActiveSession,
  persistActiveSession,
} from '../storage/liveSessionStorage';
import { trackEvent } from '../lib/analytics';

const MAX_ROUTE_POINTS = 4000;
const PERSIST_EVERY_MS = 8000;
const PERSIST_EVERY_POINTS = 12;

type Subscriber = (state: LiveSessionRuntimeState) => void;

export type LiveSessionRuntimeState = {
  sessionId: string;
  mode: LiveSessionMode;
  startedAt: string;
  pointCount: number;
  lastPoint?: RoutePoint;
  initialLocationLink?: string;
};

let current: LiveSessionRecord | null = null;
let subscription: Location.LocationSubscription | null = null;
let persistTimer: ReturnType<typeof setInterval> | null = null;
const subscribers = new Set<Subscriber>();

function notify(): void {
  if (!current) return;
  const state: LiveSessionRuntimeState = {
    sessionId: current.id,
    mode: current.mode,
    startedAt: current.startedAt,
    pointCount: current.route.length,
    lastPoint: current.route[current.route.length - 1],
    initialLocationLink: current.initialLocationLink,
  };
  subscribers.forEach((cb) => {
    try {
      cb(state);
    } catch {
      // ignore subscriber errors
    }
  });
}

function pushPoint(loc: Location.LocationObject): void {
  if (!current || current.status !== 'active') return;
  const p: RoutePoint = {
    t: new Date(loc.timestamp).toISOString(),
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    accuracy: loc.coords.accuracy ?? undefined,
    speed: loc.coords.speed ?? null,
    heading: loc.coords.heading ?? null,
  };
  current.route.push(p);
  if (current.route.length > MAX_ROUTE_POINTS) {
    current.route = current.route.slice(-MAX_ROUTE_POINTS);
  }
  notify();
}

let pointsSincePersist = 0;

async function maybePersist(): Promise<void> {
  if (!current || current.status !== 'active') return;
  pointsSincePersist += 1;
  if (pointsSincePersist >= PERSIST_EVERY_POINTS) {
    pointsSincePersist = 0;
    await persistActiveSession(current);
  }
}

function startPersistTimer(): void {
  stopPersistTimer();
  persistTimer = setInterval(() => {
    if (current?.status === 'active') {
      void persistActiveSession(current);
    }
  }, PERSIST_EVERY_MS);
}

function stopPersistTimer(): void {
  if (persistTimer) {
    clearInterval(persistTimer);
    persistTimer = null;
  }
}

/**
 * Starts continuous foreground location for the current session.
 * Clears any orphaned persisted "active" session from a previous crash.
 */
/** Safety Mode on Active screen: foreground GPS session + persistence. */
export function startSafetySessionTracking(initialLocationLink?: string): Promise<string> {
  return ensureLiveSession({ mode: 'safety', initialLocationLink });
}

/** Travel Mode on Active screen: route tracking + optional arrival check metadata. */
export function startTravelSessionTracking(
  initialLocationLink?: string,
  arrivalCheckMinutes?: number | null
): Promise<string> {
  return ensureLiveSession({ mode: 'travel', initialLocationLink, arrivalCheckMinutes });
}

/** Kid Track: same GPS session shape as Safety; optional arrival metadata like Travel. */
export function startKidTrackSessionTracking(
  initialLocationLink?: string,
  arrivalCheckMinutes?: number | null
): Promise<string> {
  return ensureLiveSession({ mode: 'kid_track', initialLocationLink, arrivalCheckMinutes });
}

/**
 * Starts live GPS tracking only if there is no matching active session.
 * Use after Home `startSession` so Active does not discard an already-running session.
 */
export async function ensureLiveSession(config: {
  mode: LiveSessionMode;
  initialLocationLink?: string;
  arrivalCheckMinutes?: number | null;
}): Promise<string> {
  if (
    current?.status === 'active' &&
    current.mode === config.mode &&
    (config.mode === 'travel' || config.mode === 'kid_track'
      ? (current.arrivalCheckMinutes ?? null) === (config.arrivalCheckMinutes ?? null)
      : true)
  ) {
    return current.id;
  }
  return startLiveSession(config);
}

export async function startLiveSession(config: {
  mode: LiveSessionMode;
  initialLocationLink?: string;
  arrivalCheckMinutes?: number | null;
}): Promise<string> {
  await stopLiveSession({ discard: true });
  pointsSincePersist = 0;

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    current = {
      id: `ls_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      mode: config.mode,
      status: 'active',
      startedAt: new Date().toISOString(),
      initialLocationLink: config.initialLocationLink,
      arrivalCheckMinutes: config.arrivalCheckMinutes ?? null,
      route: [],
    };
    await persistActiveSession(current);
    notify();
    return current.id;
  }

  current = {
    id: `ls_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    mode: config.mode,
    status: 'active',
    startedAt: new Date().toISOString(),
    initialLocationLink: config.initialLocationLink,
    arrivalCheckMinutes: config.arrivalCheckMinutes ?? null,
    route: [],
  };
  await persistActiveSession(current);
  notify();

  subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 4000,
      distanceInterval: 12,
    },
    (loc) => {
      pushPoint(loc);
      void maybePersist();
    }
  );

  startPersistTimer();
  return current.id;
}

export type StopOptions = {
  /** If true, do not return a record (abandon session). */
  discard?: boolean;
};

/**
 * Stops the watch, marks session ended, clears persisted active blob.
 * Returns the final record for attaching to Safety history / route playback.
 */
export async function stopLiveSession(options?: StopOptions): Promise<LiveSessionRecord | null> {
  stopPersistTimer();
  if (subscription) {
    try {
      subscription.remove();
    } catch {
      // ignore
    }
    subscription = null;
  }

  if (!current) {
    await clearPersistedActiveSession();
    return null;
  }

  if (options?.discard) {
    current = null;
    await clearPersistedActiveSession();
    return null;
  }

  const ended: LiveSessionRecord = {
    ...current,
    status: 'ended',
    endedAt: new Date().toISOString(),
  };
  current = null;
  await clearPersistedActiveSession();
  notify();
  return ended;
}

export function subscribeLiveSession(cb: Subscriber): () => void {
  subscribers.add(cb);
  if (current) {
    cb({
      sessionId: current.id,
      mode: current.mode,
      startedAt: current.startedAt,
      pointCount: current.route.length,
      lastPoint: current.route[current.route.length - 1],
      initialLocationLink: current.initialLocationLink,
    });
  }
  return () => subscribers.delete(cb);
}

/** Recover after app restart: if storage has active session, clear it (watch cannot resume same session). */
export async function discardStalePersistedSession(): Promise<void> {
  const stale = await getPersistedActiveSession();
  if (stale?.status === 'active') {
    trackEvent('session.stale_discarded', { mode: stale.mode, id: stale.id });
    await clearPersistedActiveSession();
  }
}
