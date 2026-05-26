"use client";

import { useStoredUser } from "@/hooks/useStoredUser";

export default function HomeNavbarCta() {
  const { user, ready, isFreelancer } = useStoredUser({ refreshFromApi: false });

  if (!ready || (user && isFreelancer)) {
    return null;
  }

  return (
    <button
      type="button"
      className="rounded bg-[#0066cc] px-5 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
    >
      Post a Job
    </button>
  );
}
