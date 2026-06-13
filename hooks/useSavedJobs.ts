"use client";

import { useCallback, useEffect, useState } from "react";
import { useStoredUser } from "@/hooks/useStoredUser";
import { listSavedJobIds, saveJob as saveJobApi, unsaveJob as unsaveJobApi } from "@/lib/api/jobs";
import {
  notifySavedJobsUpdated,
  VLC_SAVED_JOBS_UPDATED_EVENT,
} from "@/lib/findwork/savedJobsEvents";

export function useSavedJobs() {
  const { user, ready, isFreelancer } = useStoredUser({ refreshFromApi: false });
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");

  const canSave = ready && Boolean(user) && isFreelancer;

  const reload = useCallback(async () => {
    if (!canSave) {
      setSavedIds(new Set());
      return;
    }
    setLoading(true);
    try {
      const ids = await listSavedJobIds();
      setSavedIds(new Set(ids.map(String)));
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

  const isSaved = useCallback((jobId: string) => savedIds.has(jobId), [savedIds]);

  const toggleSave = useCallback(
    async (jobId: string) => {
      if (!canSave) return false;
      const wasSaved = savedIds.has(jobId);
      setBusyId(jobId);
      try {
        if (wasSaved) {
          await unsaveJobApi(jobId);
          setSavedIds((prev) => {
            const next = new Set(prev);
            next.delete(jobId);
            return next;
          });
        } else {
          await saveJobApi(jobId);
          setSavedIds((prev) => new Set(prev).add(jobId));
        }
        notifySavedJobsUpdated();
        return !wasSaved;
      } catch {
        await reload();
        return wasSaved;
      } finally {
        setBusyId("");
      }
    },
    [canSave, savedIds, reload],
  );

  return {
    canSave,
    savedIds,
    savedCount: savedIds.size,
    loading,
    busyId,
    isSaved,
    toggleSave,
    reload,
  };
}
