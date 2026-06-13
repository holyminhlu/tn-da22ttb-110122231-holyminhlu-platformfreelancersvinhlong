export const VLC_SAVED_JOBS_UPDATED_EVENT = "vlc_saved_jobs_updated";

export function notifySavedJobsUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(VLC_SAVED_JOBS_UPDATED_EVENT));
}
