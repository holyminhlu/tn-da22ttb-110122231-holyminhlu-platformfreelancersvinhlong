"use client";

import type { ReactNode } from "react";
import { SavedJobsProvider } from "./SavedJobsProvider";

export default function FindWorkProviders({ children }: { children: ReactNode }) {
  return <SavedJobsProvider>{children}</SavedJobsProvider>;
}
