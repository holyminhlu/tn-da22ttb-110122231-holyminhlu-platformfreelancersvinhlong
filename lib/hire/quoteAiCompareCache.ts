import type { JobQuoteRow } from "@/lib/api/jobQuotes";
import type { AiQuoteCompareResult } from "@/lib/api/quoteAiCompare";

const STORAGE_KEY = "vlc_quote_ai_compare_cache";
const MAX_ENTRIES = 24;

export type QuoteAiCompareCacheEntry = {
  focusedQuoteId: string;
  jobId: string;
  quotesFingerprint: string;
  cachedAt: string;
  result: AiQuoteCompareResult;
};

type QuoteAiCompareCacheStore = Record<string, QuoteAiCompareCacheEntry>;

/** Dấu vết dữ liệu — đổi khi báo giá/công việc thay đổi thì cache tự vô hiệu. */
export function buildQuotesFingerprint(
  quotes: JobQuoteRow[],
  jobUpdatedAt?: string | null,
): string {
  const quotePart = [...quotes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(
      (quote) =>
        `${quote.id}:${quote.updated_at}:${quote.status}:${quote.amount ?? ""}:${quote.message ?? ""}`,
    )
    .join("|");

  return jobUpdatedAt ? `${jobUpdatedAt}::${quotePart}` : quotePart;
}

function readStore(): QuoteAiCompareCacheStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as QuoteAiCompareCacheStore;
  } catch {
    return {};
  }
}

function writeStore(store: QuoteAiCompareCacheStore) {
  if (typeof window === "undefined") return;

  const entries = Object.entries(store).sort(
    ([, a], [, b]) => new Date(b.cachedAt).getTime() - new Date(a.cachedAt).getTime(),
  );

  const trimmed = Object.fromEntries(entries.slice(0, MAX_ENTRIES)) as QuoteAiCompareCacheStore;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function getCachedQuoteAiCompare(
  focusedQuoteId: string,
  jobId: string,
  quotesFingerprint: string,
): QuoteAiCompareCacheEntry | null {
  const entry = readStore()[focusedQuoteId];
  if (!entry) return null;
  if (entry.jobId !== jobId) return null;
  if (entry.quotesFingerprint !== quotesFingerprint) return null;
  return entry;
}

export function setCachedQuoteAiCompare(
  focusedQuoteId: string,
  jobId: string,
  quotesFingerprint: string,
  result: AiQuoteCompareResult,
) {
  const store = readStore();
  store[focusedQuoteId] = {
    focusedQuoteId,
    jobId,
    quotesFingerprint,
    cachedAt: new Date().toISOString(),
    result,
  };
  writeStore(store);
}

export function clearCachedQuoteAiCompare(focusedQuoteId: string) {
  const store = readStore();
  if (!store[focusedQuoteId]) return;
  delete store[focusedQuoteId];
  writeStore(store);
}

export function invalidateQuoteAiCompareForJob(jobId: string) {
  const store = readStore();
  let changed = false;

  for (const [key, entry] of Object.entries(store)) {
    if (entry.jobId === jobId) {
      delete store[key];
      changed = true;
    }
  }

  if (changed) writeStore(store);
}

export function formatQuoteAiCacheTime(cachedAt: string): string {
  const date = new Date(cachedAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}
