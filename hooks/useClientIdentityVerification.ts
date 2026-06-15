"use client";

import { useCallback, useEffect, useState } from "react";
import { getIdentityVerification, type IdentityVerificationResponse } from "@/lib/api/identityVerification";
import { getMe, type MeUser } from "@/lib/api/users";
import { isClientIdentityVerified } from "@/lib/hire/clientVerification";
import { isClientRole } from "@/hooks/useStoredUser";

type UseClientIdentityVerificationOptions = {
  enabled?: boolean;
  refreshOnVisible?: boolean;
};

export function useClientIdentityVerification(options?: UseClientIdentityVerificationOptions) {
  const enabled = options?.enabled ?? true;
  const refreshOnVisible = options?.refreshOnVisible ?? true;
  const [loading, setLoading] = useState(enabled);
  const [verified, setVerified] = useState(false);
  const [user, setUser] = useState<MeUser | null>(null);
  const [idv, setIdv] = useState<IdentityVerificationResponse | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("vlc_access_token") : null;
    if (!token) {
      setLoading(false);
      setVerified(false);
      setUser(null);
      setIdv(null);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [me, identity] = await Promise.all([getMe(), getIdentityVerification()]);
      if (!isClientRole(me.user?.role)) {
        setUser(me.user);
        setIdv(identity);
        setVerified(true);
        return;
      }
      setUser(me.user);
      setIdv(identity);
      setVerified(isClientIdentityVerified(me.user, identity));
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải trạng thái xác minh.";
      setError(message);
      setVerified(false);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!refreshOnVisible || !enabled) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [enabled, load, refreshOnVisible]);

  return { loading, verified, user, idv, error, reload: load };
}
