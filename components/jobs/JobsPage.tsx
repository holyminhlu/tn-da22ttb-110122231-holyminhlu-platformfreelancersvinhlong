"use client";

import { useStoredUser } from "@/hooks/useStoredUser";
import ClientJobContractsPage from "./ClientJobContractsPage";
import FreelancerJobContractsPage from "./FreelancerJobContractsPage";

export default function JobsPage() {
  const { ready, isClient } = useStoredUser({ refreshFromApi: false });

  if (!ready) {
    return <FreelancerJobContractsPage />;
  }

  if (isClient) {
    return <ClientJobContractsPage />;
  }

  return <FreelancerJobContractsPage />;
}
