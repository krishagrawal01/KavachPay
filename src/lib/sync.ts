const SYNC_CHANNEL = 'kavach_sync';
const SYNC_STORAGE_KEY = 'kavach_last_sync';

export interface SyncPayload {
  rawUri: string;
  parsed: {
    pa: string;
    pn: string;
    am: string;
    tn: string;
    mc: string;
  } | null;
  assessment: {
    compositeScore: number;
    level: string;
    latencyMs: number;
    vectors: { id: string; label: string; weight: number; triggered: boolean }[];
  } | null;
  telemetry: {
    callState: string;
    displaySecurity: string;
  };
  scenarioId: string | null;
  timestamp: number;
}

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!('BroadcastChannel' in window)) return null;
  if (!channel) {
    channel = new BroadcastChannel(SYNC_CHANNEL);
  }
  return channel;
}

export function broadcastSync(payload: Omit<SyncPayload, 'timestamp'>): void {
  const full: SyncPayload = { ...payload, timestamp: Date.now() };

  const ch = getChannel();
  if (ch) {
    ch.postMessage(full);
  }

  try {
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(full));
  } catch {
    // ignore quota errors
  }
}

export function onSyncUpdate(callback: (payload: SyncPayload) => void): () => void {
  const ch = getChannel();
  if (!ch) return () => {};

  const handler = (e: MessageEvent) => {
    callback(e.data as SyncPayload);
  };
  ch.addEventListener('message', handler);

  return () => {
    ch.removeEventListener('message', handler);
  };
}

export function getLastSync(): SyncPayload | null {
  try {
    const raw = localStorage.getItem(SYNC_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SyncPayload;
  } catch {
    return null;
  }
}

export function onStorageSyncUpdate(callback: (payload: SyncPayload) => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === SYNC_STORAGE_KEY && e.newValue) {
      try {
        callback(JSON.parse(e.newValue) as SyncPayload);
      } catch {
        // ignore
      }
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
