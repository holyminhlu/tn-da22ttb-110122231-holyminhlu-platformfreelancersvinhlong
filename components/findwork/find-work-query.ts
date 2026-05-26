import type { ListJobsParams } from "@/lib/api/jobs";
import type { ClientCriteria } from "./constants";
import type { FindWorkQueryState } from "./FindWorkToolbar";

export const INITIAL_FIND_WORK_QUERY: FindWorkQueryState = {
  q: "",
  category: null,
  location: "",
  clientCriteria: "all",
  budgetMin: "",
  budgetMax: "",
  hasDue: false,
  sort: "newest",
};

function parseBudgetField(raw: string): number | undefined {
  const trimmed = raw.trim().replace(/\s/g, "");
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

export function queryToListJobsParams(
  query: FindWorkQueryState,
  paging: { limit: number; offset: number },
): ListJobsParams {
  const budgetMin = parseBudgetField(query.budgetMin);
  const budgetMax = parseBudgetField(query.budgetMax);

  return {
    limit: paging.limit,
    offset: paging.offset,
    q: query.q.trim() || undefined,
    category: query.category ?? undefined,
    location: query.location.trim() || undefined,
    verified: query.clientCriteria === "verified" ? true : undefined,
    has_location: query.clientCriteria === "with_location" ? true : undefined,
    has_due: query.hasDue || undefined,
    budget_min: budgetMin,
    budget_max: budgetMax,
    sort: query.sort,
  };
}

export function countActiveFilters(query: FindWorkQueryState): number {
  let n = 0;
  if (query.category) n += 1;
  if (query.q.trim()) n += 1;
  if (query.location.trim()) n += 1;
  if (query.clientCriteria !== "all") n += 1;
  if (query.budgetMin.trim()) n += 1;
  if (query.budgetMax.trim()) n += 1;
  if (query.hasDue) n += 1;
  return n;
}
