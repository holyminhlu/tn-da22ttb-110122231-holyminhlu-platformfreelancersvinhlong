"use client";

import { useCallback, useEffect, useState } from "react";
import { getMe } from "@/lib/api/users";
import {
  getStoredUser,
  persistStoredUser,
  toStoredUser,
  VLC_USER_UPDATED_EVENT,
  type StoredUser,
} from "@/lib/authSession";

export function isFreelancerRole(role?: string | null): boolean {
  return String(role || "").toLowerCase() === "freelancer";
}

export function isClientRole(role?: string | null): boolean {
  return String(role || "").toLowerCase() === "client";
}

export function isAdminRole(role?: string | null): boolean {
  const r = String(role || "").toLowerCase();
  return r === "admin" || r === "administrator";
}

export function useStoredUser(options?: { refreshFromApi?: boolean }) {
  const refreshFromApi = options?.refreshFromApi ?? true;
  const [user, setUser] = useState<StoredUser | null>(null);
  const [ready, setReady] = useState(false);

  const syncFromStorage = useCallback(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    syncFromStorage();
    setReady(true);

    const onUserUpdated = () => syncFromStorage();
    window.addEventListener(VLC_USER_UPDATED_EVENT, onUserUpdated);
    window.addEventListener("storage", onUserUpdated);

    if (!refreshFromApi) {
      return () => {
        window.removeEventListener(VLC_USER_UPDATED_EVENT, onUserUpdated);
        window.removeEventListener("storage", onUserUpdated);
      };
    }

    const token = window.localStorage.getItem("vlc_access_token");
    if (!token) {
      return () => {
        window.removeEventListener(VLC_USER_UPDATED_EVENT, onUserUpdated);
        window.removeEventListener("storage", onUserUpdated);
      };
    }

    let cancelled = false;
    getMe()
      .then((data) => {
        if (cancelled || !data.user) return;
        const prev = getStoredUser();
        const next = toStoredUser(data.user);
        if (!next.avatarUrl && prev?.avatarUrl) {
          next.avatarUrl = prev.avatarUrl;
        }
        persistStoredUser(next);
        if (!cancelled) setUser(next);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      window.removeEventListener(VLC_USER_UPDATED_EVENT, onUserUpdated);
      window.removeEventListener("storage", onUserUpdated);
    };
  }, [refreshFromApi, syncFromStorage]);

  return {
    user,
    ready,
    isFreelancer: isFreelancerRole(user?.role),
    isClient: isClientRole(user?.role),
    isAdmin: isAdminRole(user?.role),
  };
}
