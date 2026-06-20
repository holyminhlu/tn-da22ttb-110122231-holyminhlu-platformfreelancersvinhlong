"use client";

import { useEffect } from "react";
import {
  applyStoredUserPreferences,
  applyThemePreference,
  getThemePreference,
  subscribeToSystemThemeChange,
} from "@/lib/userPreferences";

export default function UserPreferencesInit() {
  useEffect(() => {
    applyStoredUserPreferences();
    return subscribeToSystemThemeChange(() => applyThemePreference(getThemePreference()));
  }, []);

  return null;
}
