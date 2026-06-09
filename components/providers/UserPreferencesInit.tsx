"use client";

import { useEffect } from "react";
import { applyStoredUserPreferences } from "@/lib/userPreferences";

export default function UserPreferencesInit() {
  useEffect(() => {
    applyStoredUserPreferences();
  }, []);

  return null;
}
