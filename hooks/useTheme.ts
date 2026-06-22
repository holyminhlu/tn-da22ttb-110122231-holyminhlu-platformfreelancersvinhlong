"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getThemePreference,
  setThemePreference,
  subscribeToSystemThemeChange,
  type ThemePreference,
} from "@/lib/userPreferences";

/** Hook quản lý theme Sáng / Tối / Theo hệ thống — đồng bộ với localStorage và class `.dark` trên `<html>`. */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>("light");

  useEffect(() => {
    setThemeState(getThemePreference());
    return subscribeToSystemThemeChange(() => {
      setThemeState(getThemePreference());
    });
  }, []);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    setThemePreference(next);
  }, []);

  return { theme, setTheme };
}
