"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useStoredUser } from "@/hooks/useStoredUser";
import { listSavedJobIds, saveJob as saveJobApi, unsaveJob as unsaveJobApi } from "@/lib/api/jobs";
import {
  notifySavedJobsUpdated,
  VLC_SAVED_JOBS_UPDATED_EVENT,
} from "@/lib/findwork/savedJobsEvents";

function normalizeJobId(jobId: string): string {
  return String(jobId || "").trim().toLowerCase();
}

type SavedJobsContextValue = {
  canSave: boolean;
  savedIds: Set<string>;
  savedCount: number;
  loading: boolean;
  busyId: string;
  lastError: { jobId: string; message: string } | null;
  isSaved: (jobId: string) => boolean;
  toggleSave: (jobId: string) => Promise<boolean>;
  reload: () => Promise<void>;
  clearError: () => void;
};

const SavedJobsContext = createContext<SavedJobsContextValue | null>(null);

export function SavedJobsProvider({ children }: { children: ReactNode }) {
  const { user, ready, isFreelancer } = useStoredUser({ refreshFromApi: false });
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [lastError, setLastError] = useState<{ jobId: string; message: string } | null>(null);

  const canSave = ready && Boolean(user) && isFreelancer;

  const reload = useCallback(async () => {
    if (!canSave) {
      setSavedIds(new Set());
      return;
    }
    setLoading(true);
    try {
      const ids = await listSavedJobIds();
      setSavedIds(new Set(ids.map((id) => normalizeJobId(id))));
    } catch {
      setSavedIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [canSave]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const onUpdate = () => void reload();
    window.addEventListener(VLC_SAVED_JOBS_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(VLC_SAVED_JOBS_UPDATED_EVENT, onUpdate);
  }, [reload]);

  const isSaved = useCallback(
    (jobId: string) => savedIds.has(normalizeJobId(jobId)),
    [savedIds],
  );

  const toggleSave = useCallback(
    async (jobId: string) => {
      if (!canSave) return false;
      const id = normalizeJobId(jobId);
      const wasSaved = savedIds.has(id);
      setBusyId(id);
      setLastError(null);
      try {
        if (wasSaved) {
          await unsaveJobApi(id);
          setSavedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        } else {
          await saveJobApi(id);
          setSavedIds((prev) => new Set(prev).add(id));
        }
        notifySavedJobsUpdated();
        return !wasSaved;
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : wasSaved
              ? "Không thể bỏ lưu công việc."
              : "Không thể lưu công việc.";
        setLastError({ jobId: id, message });
        await reload();
        return wasSaved;
      } finally {
        setBusyId("");
      }
    },
    [canSave, savedIds, reload],
  );

  const clearError = useCallback(() => setLastError(null), []);

  const value = useMemo(
    () => ({
      canSave,
      savedIds,
      savedCount: savedIds.size,
      loading,
      busyId,
      lastError,
      isSaved,
      toggleSave,
      reload,
      clearError,
    }),
    [canSave, savedIds, loading, busyId, lastError, isSaved, toggleSave, reload, clearError],
  );

  return <SavedJobsContext.Provider value={value}>{children}</SavedJobsContext.Provider>;
}

export function useSavedJobsContext(): SavedJobsContextValue {
  const ctx = useContext(SavedJobsContext);
  if (!ctx) {
    throw new Error("useSavedJobs phải dùng trong SavedJobsProvider.");
  }
  return ctx;
}
