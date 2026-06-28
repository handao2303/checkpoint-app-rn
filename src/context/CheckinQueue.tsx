// Processes POST /checkpoints in the background after R2 uploads complete.
// Lives at app root so it survives screen unmounts. Jobs are persisted to
// AsyncStorage so they survive app kills — recovered and retried on next open.
//
// Triggers processing on:
//   - New job enqueued
//   - App returns to foreground (AppState)
//   - Network reconnects (NetInfo listener)
//
// No expo-background-fetch — AppState + NetInfo is sufficient for MVP.

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import {
  ApiError,
  createCheckpoint,
  type Badge,
  type CheckinInput,
  type User,
} from '../lib/api';
import { trackError, trackEvent } from '../lib/observability';

// ---- persistence ----------------------------------------------------------

interface PendingJob {
  id: string;
  input: CheckinInput;
  enqueuedAt: number;
  attempts: number;
}

const AS_KEY = 'cp_checkin_queue';

async function loadJobs(): Promise<PendingJob[]> {
  try {
    const raw = await AsyncStorage.getItem(AS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as PendingJob[];
  } catch {
    return [];
  }
}

async function saveJobs(jobs: PendingJob[]): Promise<void> {
  try {
    await AsyncStorage.setItem(AS_KEY, JSON.stringify(jobs));
  } catch {
    // AsyncStorage full or unavailable — proceed without persistence
  }
}

async function persistAddJob(job: PendingJob): Promise<void> {
  const existing = await loadJobs();
  const updated = [...existing.filter((j) => j.id !== job.id), job];
  await saveJobs(updated);
}

async function persistRemoveJob(id: string): Promise<void> {
  const existing = await loadJobs();
  await saveJobs(existing.filter((j) => j.id !== id));
}

// ---- retry ----------------------------------------------------------------

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [0, 2000, 5000];

function isRetryable(err: unknown): boolean {
  if (err instanceof ApiError) return err.status >= 500;
  return true; // network error (fetch threw, no status)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- context --------------------------------------------------------------

interface CheckinQueueContextValue {
  enqueueCheckin: (job: CheckinInput) => Promise<void>;
  queue: PendingJob[];
  processing: boolean;
  failedCount: number;
}

const CheckinQueueCtx = createContext<CheckinQueueContextValue | null>(null);

export function useCheckinQueue(): CheckinQueueContextValue {
  const ctx = useContext(CheckinQueueCtx);
  if (!ctx) throw new Error('useCheckinQueue must be inside CheckinQueueProvider');
  return ctx;
}

export function useOptionalCheckinQueue(): CheckinQueueContextValue | null {
  return useContext(CheckinQueueCtx);
}

// ---- provider -------------------------------------------------------------

export function CheckinQueueProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [queue, setQueue] = useState<PendingJob[]>([]);
  const [processing, setProcessing] = useState(false);
  const [failedCount, setFailedCount] = useState(0);
  const processingRef = useRef(false);
  const queueRef = useRef<PendingJob[]>([]);

  // Keep ref in sync so callbacks always see current queue without stale closure
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Load persisted jobs on mount
  useEffect(() => {
    loadJobs().then((jobs) => {
      if (jobs.length > 0) {
        setQueue(jobs);
      }
    });
  }, []);

  // ---- process loop -------------------------------------------------------

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;

    // Check connectivity first
    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected === true && netState.isInternetReachable !== false;
    if (!isOnline) return;

    const currentQueue = queueRef.current;
    if (currentQueue.length === 0) return;

    processingRef.current = true;
    setProcessing(true);

    // Process jobs one at a time, front to back
    const [job, ...remaining] = currentQueue;

    try {
      let succeeded = false;

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (attempt > 0) {
          trackEvent('checkin_retry', { attempt: attempt + 1 });
          await sleep(RETRY_DELAYS_MS[attempt]);
        }

        try {
          const prevUser = qc.getQueryData<User>(['me']);
          const res = await createCheckpoint(job.input);

          await persistRemoveJob(job.id);
          setQueue(remaining);

          void Promise.all([
            qc.invalidateQueries({ queryKey: ['me'] }),
            qc.invalidateQueries({ queryKey: ['checkpoints'] }),
            qc.invalidateQueries({ queryKey: ['feed'] }),
            qc.invalidateQueries({ queryKey: ['place'] }),
            qc.invalidateQueries({ queryKey: ['places', 'nearby'] }),
            qc.invalidateQueries({ queryKey: ['places', 'popular'] }),
            qc.invalidateQueries({ queryKey: ['places-nearby-app'] }),
            qc.invalidateQueries({ queryKey: ['passport'] }),
            qc.invalidateQueries({ queryKey: ['badges'] }),
          ]);

          const didLevelUp = res.level > (prevUser?.level ?? res.level);
          trackEvent('checkin_create_success', {
            checkpoint_id: res.checkpoint.id,
            category: res.checkpoint.category,
            xp: res.xp_awarded,
            did_level_up: didLevelUp,
            badge_count: res.new_badges?.length ?? 0,
            duplicate: !!res.duplicate,
          });

          if (didLevelUp) trackEvent('checkin_level_up', { level: res.level });
          if (res.new_badges?.length) {
            trackEvent('checkin_badge_unlocked', { badge_count: res.new_badges.length });
          }

          succeeded = true;
          break;
        } catch (err) {
          const canRetry = isRetryable(err) && attempt < MAX_ATTEMPTS - 1;
          if (!canRetry) {
            await persistRemoveJob(job.id);
            setQueue(remaining);
            trackError(err, { feature: 'checkin', action: 'checkin_create', attempt: attempt + 1 });
            trackEvent('checkin_create_failed', { attempt: attempt + 1 });
            setFailedCount((n) => n + 1);
            break;
          }
        }
      }

      void succeeded; // consumed above
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }
  }, [qc]);

  // Trigger processing when queue changes
  useEffect(() => {
    if (queue.length > 0) {
      void processQueue();
    }
  }, [queue, processQueue]);

  // Trigger processing when app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void processQueue();
      }
    });
    return () => sub.remove();
  }, [processQueue]);

  // Trigger processing when network reconnects
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      if (online) {
        void processQueue();
      }
    });
    return () => unsub();
  }, [processQueue]);

  // ---- enqueue ------------------------------------------------------------

  const enqueueCheckin = useCallback(
    async (input: CheckinInput): Promise<void> => {
      const job: PendingJob = {
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        input,
        enqueuedAt: Date.now(),
        attempts: 0,
      };
      await persistAddJob(job);
      setQueue((q) => [...q, job]);
      trackEvent('checkin_enqueue', {
        image_count: input.images.length,
        category: input.category,
        has_journey: !!input.journey_id,
        has_place: !!input.place_id,
      });
    },
    [],
  );

  return (
    <CheckinQueueCtx.Provider
      value={{ enqueueCheckin, queue, processing, failedCount }}
    >
      {children}
    </CheckinQueueCtx.Provider>
  );
}
