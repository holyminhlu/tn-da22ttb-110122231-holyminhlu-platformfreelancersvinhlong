import { ROUTES } from "@/lib/routes/paths";

export function disputeCenterPath(
  audience: "client" | "freelancer",
  opts?: { disputeId?: string | null; contractId?: string | null },
): string {
  const base =
    audience === "client" ? ROUTES.manage.disputes : ROUTES.services.disputes;
  const params = new URLSearchParams();
  if (opts?.disputeId) {
    params.set("dispute", opts.disputeId);
  } else if (opts?.contractId) {
    params.set("contract", opts.contractId);
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
