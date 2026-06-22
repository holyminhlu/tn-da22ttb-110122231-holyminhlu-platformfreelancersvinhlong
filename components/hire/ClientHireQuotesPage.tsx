"use client";

import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaChevronDown, FaListUl, FaSearch, FaSortAmountDown } from "react-icons/fa";
import DashboardPagination from "@/components/dashboard/DashboardPagination";
import "@/components/dashboard/dashboardPagination.css";
import { getMyWork, type MyWorkClientJob } from "@/lib/api/contracts";
import {
  listMyJobQuotes,
  patchJobQuote,
  type PatchJobQuoteAction,
  type JobQuoteRow,
  type JobQuoteStatus,
} from "@/lib/api/jobQuotes";
import { useClientIdentityVerification } from "@/hooks/useClientIdentityVerification";
import FreelancerChatWidget from "@/components/chat/FreelancerChatWidget";
import { jobStatusLabel } from "@/lib/jobsDisplay";
import HireQuoteGridCard from "./HireQuoteGridCard";
import HireQuoteAiCompareModal from "./HireQuoteAiCompareModal";
import HireShell from "./HireShell";
import { sortJobQuotes, type QuoteSort } from "@/lib/hire/quoteDisplay";
import "./hire.css";

const PAGE_SIZE = 18;

type QuoteFilter = "all" | JobQuoteStatus;

const ACTIVE_JOB_STATUSES = new Set(["open", "in_progress"]);

function isActiveClientJob(job: MyWorkClientJob): boolean {
  return ACTIVE_JOB_STATUSES.has(String(job.job_status).toLowerCase());
}

function sortActiveJobs(
  jobs: MyWorkClientJob[],
  pendingByJob: Map<string, number>,
  quoteCountByJob: Map<string, number>,
): MyWorkClientJob[] {
  return [...jobs].sort((a, b) => {
    const pendingDiff = (pendingByJob.get(b.job_id) ?? 0) - (pendingByJob.get(a.job_id) ?? 0);
    if (pendingDiff !== 0) return pendingDiff;

    const quoteDiff = (quoteCountByJob.get(b.job_id) ?? 0) - (quoteCountByJob.get(a.job_id) ?? 0);
    if (quoteDiff !== 0) return quoteDiff;

    return new Date(b.job_updated_at).getTime() - new Date(a.job_updated_at).getTime();
  });
}

function pickDefaultJobId(
  jobs: MyWorkClientJob[],
  pendingByJob: Map<string, number>,
  quoteCountByJob: Map<string, number>,
  preferredId: string | null,
): string | null {
  if (jobs.length === 0) return null;
  if (preferredId && jobs.some((job) => job.job_id === preferredId)) return preferredId;

  const sorted = sortActiveJobs(jobs, pendingByJob, quoteCountByJob);
  return sorted[0]?.job_id ?? null;
}

export default function ClientHireQuotesPage() {
  const { t } = useTranslation();

  const quoteFilterOptions = useMemo(
    () => [
      { value: "all" as const, label: t("hireQuotes.filterAllQuotes") },
      { value: "pending" as const, label: t("hireQuotes.filterPending") },
      { value: "offered" as const, label: t("hireQuotes.filterOffered") },
      { value: "accepted" as const, label: t("hireQuotes.filterAccepted") },
      { value: "declined" as const, label: t("hireQuotes.filterDeclined") },
    ],
    [t],
  );

  const quoteSortOptions = useMemo(
    () => [
      { value: "priority" as const, label: t("hireQuotes.sortPriority") },
      { value: "newest" as const, label: t("hireQuotes.sortNewest") },
      { value: "price_asc" as const, label: t("hireQuotes.sortPriceAsc") },
      { value: "rating_desc" as const, label: t("hireQuotes.sortRatingDesc") },
    ],
    [t],
  );

  const router = useRouter();
  const searchParams = useSearchParams();
  const { verified: clientIdentityVerified, loading: clientIdentityLoading } =
    useClientIdentityVerification({ refreshOnVisible: false });
  const [clientJobs, setClientJobs] = useState<MyWorkClientJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<JobQuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState("");
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [quoteFilter, setQuoteFilter] = useState<QuoteFilter>("all");
  const [quoteFilterOpen, setQuoteFilterOpen] = useState(false);
  const [quoteSort, setQuoteSort] = useState<QuoteSort>("priority");
  const [quoteSortOpen, setQuoteSortOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [actionBusyId, setActionBusyId] = useState("");
  const [chatQuote, setChatQuote] = useState<JobQuoteRow | null>(null);
  const [aiCompareQuote, setAiCompareQuote] = useState<JobQuoteRow | null>(null);
  const quoteFilterRef = useRef<HTMLDivElement>(null);
  const quoteSortRef = useRef<HTMLDivElement>(null);

  const loadQuotes = useCallback(async () => {
    setQuotesLoading(true);
    setQuotesError("");
    try {
      const rows = await listMyJobQuotes();
      setQuotes(rows);
    } catch (err) {
      setQuotes([]);
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : t("hirePage.loadQuotesError");
      setQuotesError(message);
    } finally {
      setQuotesLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMyWork();
      if (data.role !== "client") {
        setError(t("hirePage.clientOnly"));
        setClientJobs([]);
        return;
      }
      setClientJobs(data.jobs ?? []);
      await loadQuotes();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : t("hirePage.loadJobsError");
      setError(message);
      setClientJobs([]);
    } finally {
      setLoading(false);
    }
  }, [loadQuotes]);

  useEffect(() => {
    void load();
  }, [load]);

  const quoteCountByJob = useMemo(() => {
    const map = new Map<string, number>();
    for (const quote of quotes) {
      map.set(quote.job_id, (map.get(quote.job_id) ?? 0) + 1);
    }
    return map;
  }, [quotes]);

  const pendingByJob = useMemo(() => {
    const map = new Map<string, number>();
    for (const quote of quotes) {
      if (String(quote.status).toLowerCase() !== "pending") continue;
      map.set(quote.job_id, (map.get(quote.job_id) ?? 0) + 1);
    }
    return map;
  }, [quotes]);

  const activeJobs = useMemo(
    () => sortActiveJobs(clientJobs.filter(isActiveClientJob), pendingByJob, quoteCountByJob),
    [clientJobs, pendingByJob, quoteCountByJob],
  );

  const selectedJob = useMemo(
    () => activeJobs.find((job) => job.job_id === selectedJobId) ?? null,
    [activeJobs, selectedJobId],
  );

  useEffect(() => {
    if (activeJobs.length === 0) {
      setSelectedJobId(null);
      return;
    }

    const fromUrl = searchParams.get("job");
    if (fromUrl && activeJobs.some((job) => job.job_id === fromUrl)) {
      setSelectedJobId(fromUrl);
      return;
    }

    setSelectedJobId((current) => {
      if (current && activeJobs.some((job) => job.job_id === current)) return current;
      return pickDefaultJobId(activeJobs, pendingByJob, quoteCountByJob, null);
    });
  }, [activeJobs, searchParams, pendingByJob, quoteCountByJob]);

  useEffect(() => {
    setPage(1);
  }, [quoteFilter, searchQuery, quoteSort, selectedJobId]);

  useEffect(() => {
    if (!quoteFilterOpen && !quoteSortOpen) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!quoteFilterRef.current?.contains(target)) {
        setQuoteFilterOpen(false);
      }
      if (!quoteSortRef.current?.contains(target)) {
        setQuoteSortOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [quoteFilterOpen, quoteSortOpen]);

  const jobQuotes = useMemo(() => {
    if (!selectedJobId) return [];
    return quotes.filter((quote) => quote.job_id === selectedJobId);
  }, [quotes, selectedJobId]);

  const visibleQuotes = useMemo(() => {
    let list = jobQuotes;
    if (quoteFilter !== "all") {
      list = list.filter((q) => String(q.status).toLowerCase() === quoteFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (item) =>
          item.freelancer_name?.toLowerCase().includes(q) ||
          item.message?.toLowerCase().includes(q) ||
          item.freelancer_title?.toLowerCase().includes(q),
      );
    }
    return sortJobQuotes(list, quoteSort);
  }, [jobQuotes, quoteFilter, searchQuery, quoteSort]);

  const totalPages = Math.max(1, Math.ceil(visibleQuotes.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedQuotes = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return visibleQuotes.slice(start, start + PAGE_SIZE);
  }, [visibleQuotes, safePage]);

  const pendingForSelectedJob = selectedJobId ? (pendingByJob.get(selectedJobId) ?? 0) : 0;
  const canAiCompareQuotes = jobQuotes.length >= 2;

  const quoteFilterLabel =
    quoteFilter === "all"
      ? t("hireQuotes.filterQuotes")
      : (quoteFilterOptions.find((o) => o.value === quoteFilter)?.label ?? t("hireQuotes.filterQuotes"));

  const quoteSortLabel =
    quoteSortOptions.find((o) => o.value === quoteSort)?.label ?? t("hireQuotes.sort");

  function selectJob(jobId: string) {
    setSelectedJobId(jobId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("job", jobId);
    router.replace(`/hire/quotes?${params.toString()}`, { scroll: false });
  }

  function applySearch() {
    setSearchQuery(searchInput.trim());
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      applySearch();
    }
  }

  async function handleQuoteAction(quoteId: string, action: PatchJobQuoteAction) {
    setQuotesError("");
    setActionBusyId(quoteId);
    try {
      await patchJobQuote(quoteId, action);
      const rows = await listMyJobQuotes();
      setQuotes(rows);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : t("hirePage.updateQuoteError");
      setQuotesError(message);
    } finally {
      setActionBusyId("");
    }
  }

  function renderJobNavItem(job: MyWorkClientJob, compact = false) {
    const active = job.job_id === selectedJobId;
    const quoteCount = quoteCountByJob.get(job.job_id) ?? 0;
    const pendingCount = pendingByJob.get(job.job_id) ?? 0;
    const title = job.title?.trim() || t("hirePage.job");

    if (compact) {
      return (
        <button
          key={job.job_id}
          type="button"
          className={`hire-quotes__job-chip${active ? " hire-quotes__job-chip--active" : ""}`}
          aria-current={active ? "true" : undefined}
          onClick={() => selectJob(job.job_id)}
        >
          <span className="hire-quotes__job-chip-title" title={title}>
            {title}
          </span>
          <span
            className={`hire-quotes__job-chip-badge${
              quoteCount === 0 ? " hire-quotes__job-chip-badge--muted" : ""
            }`}
          >
            {quoteCount}
          </span>
        </button>
      );
    }

    return (
      <button
        key={job.job_id}
        type="button"
        className={`hire-quotes__job${active ? " hire-quotes__job--active" : ""}`}
        aria-current={active ? "true" : undefined}
        onClick={() => selectJob(job.job_id)}
      >
        <p className="hire-quotes__job-title" title={title}>
          {title}
        </p>
        <p className="hire-quotes__job-meta">
          {jobStatusLabel(job.job_status)}
          {" · "}
          {quoteCount} {t("hirePage.quotes")}
          {pendingCount > 0 ? (
            <>
              {" · "}
              <span className="hire-quotes__job-pending">
                {t("hirePage.pendingCount", { count: pendingCount })}
              </span>
            </>
          ) : null}
        </p>
      </button>
    );
  }

  const hasNoJobs = !loading && !error && clientJobs.length === 0;
  const hasNoActiveJobs = !loading && !error && clientJobs.length > 0 && activeJobs.length === 0;

  return (
    <HireShell>
      <div className="hire-page hire-quotes hire-quotes--full-width">
        <header className="hire-page__head">
          <div>
            <h1 className="hire-page__title">{t("hireQuotes.title")}</h1>
            <p className="hire-page__lead">{t("hireQuotes.lead")}</p>
          </div>
          <Link href="/hire/post" className="hire-page__post-btn">
            {t("hirePage.postJob")}
          </Link>
        </header>

        {loading ? (
          <p className="hire-page__state">{t("common.loading")}</p>
        ) : error ? (
          <p className="hire-page__state hire-page__state--error" role="alert">
            {error}
          </p>
        ) : hasNoJobs ? (
          <div className="hire-page__empty hire-quotes__empty">
            <h2 className="hire-quotes__empty-title">{t("hireQuotes.noJobs")}</h2>
            <p className="hire-page__empty-text">{t("hireQuotes.noJobsHint")}</p>
            <Link href="/hire/post" className="hire-page__post-btn">
              {t("hirePage.postJob")}
            </Link>
          </div>
        ) : hasNoActiveJobs ? (
          <div className="hire-quotes__no-active">
            <h2 className="hire-quotes__no-active-title">{t("hireQuotes.noActiveJobs")}</h2>
            <p className="hire-page__empty-text">{t("hireQuotes.noActiveJobsHint")}</p>
            <Link href="/hire/joblist" className="hire-page__post-btn" style={{ marginTop: "1rem" }}>
              {t("hireQuotes.viewJobList")}
            </Link>
          </div>
        ) : (
          <>
            {activeJobs.length > 1 ? (
              <div
                className="hire-quotes__job-strip hire-quotes__job-strip--responsive"
                role="tablist"
                aria-label={t("hireQuotes.selectJobAria")}
              >
                {activeJobs.map((job) => renderJobNavItem(job, true))}
              </div>
            ) : null}

            <div className="hire-quotes__layout">
              {activeJobs.length > 1 ? (
                <nav className="hire-quotes__jobs hire-quotes__jobs--responsive" aria-label={t("hireQuotes.activeJobs")}>
                  <p className="hire-quotes__jobs-heading">{t("hireQuotes.activeJobs")}</p>
                  {activeJobs.map((job) => renderJobNavItem(job))}
                </nav>
              ) : null}

              <div className="hire-quotes__panel">
                {selectedJob ? (
                  <div className="hire-quotes__job-summary hire-quotes__job-summary--bar">
                    <div>
                      <h2 className="hire-quotes__panel-title">{selectedJob.title}</h2>
                      <p className="hire-quotes__job-summary-meta">
                        {jobStatusLabel(selectedJob.job_status)}
                        {" · "}
                        {jobQuotes.length} {t("hirePage.quotes")}
                        {pendingForSelectedJob > 0
                          ? ` · ${t("hirePage.pendingReview", { count: pendingForSelectedJob })}`
                          : ""}
                      </p>
                    </div>
                    <Link href={`/hire/joblist/${selectedJob.job_id}`} className="hire-quotes__job-link">
                      {t("hireQuotes.manageJob")}
                    </Link>
                  </div>
                ) : null}

                <div className="hire-page__toolbar hire-quotes__toolbar">
                  <div className="hire-page__search-group">
                    <input
                      type="search"
                      className="hire-page__search-input"
                      placeholder={t("hireQuotes.searchInJob")}
                      value={searchInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSearchInput(value);
                        if (!value.trim()) setSearchQuery("");
                      }}
                      onKeyDown={handleSearchKeyDown}
                      aria-label={t("hireQuotes.searchFreelancer")}
                    />
                    <button
                      type="button"
                      className="hire-page__search-btn"
                      aria-label={t("hirePage.search")}
                      onClick={applySearch}
                    >
                      <FaSearch aria-hidden />
                    </button>
                  </div>

                  <div className="hire-page__filter-wrap" ref={quoteFilterRef}>
                    <button
                      type="button"
                      className="hire-page__filter-btn"
                      aria-expanded={quoteFilterOpen}
                      aria-haspopup="listbox"
                      onClick={() => setQuoteFilterOpen((prev) => !prev)}
                    >
                      <span className="hire-page__filter-label">
                        <FaListUl aria-hidden className="text-gray-500" />
                        <span>{quoteFilterLabel}</span>
                      </span>
                      <FaChevronDown className="text-xs text-gray-400" aria-hidden />
                    </button>
                    {quoteFilterOpen ? (
                      <div className="hire-page__filter-panel" role="listbox" aria-label={t("hireQuotes.filterQuotes")}>
                        {quoteFilterOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            role="option"
                            aria-selected={quoteFilter === opt.value}
                            className={`hire-page__filter-option${
                              quoteFilter === opt.value ? " hire-page__filter-option--active" : ""
                            }`}
                            onClick={() => {
                              setQuoteFilter(opt.value);
                              setQuoteFilterOpen(false);
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="hire-page__filter-wrap" ref={quoteSortRef}>
                    <button
                      type="button"
                      className="hire-page__filter-btn"
                      aria-expanded={quoteSortOpen}
                      aria-haspopup="listbox"
                      onClick={() => setQuoteSortOpen((prev) => !prev)}
                    >
                      <span className="hire-page__filter-label">
                        <FaSortAmountDown aria-hidden className="text-gray-500" />
                        <span>{quoteSortLabel}</span>
                      </span>
                      <FaChevronDown className="text-xs text-gray-400" aria-hidden />
                    </button>
                    {quoteSortOpen ? (
                      <div className="hire-page__filter-panel" role="listbox" aria-label={t("hireQuotes.sortQuotes")}>
                        {quoteSortOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            role="option"
                            aria-selected={quoteSort === opt.value}
                            className={`hire-page__filter-option${
                              quoteSort === opt.value ? " hire-page__filter-option--active" : ""
                            }`}
                            onClick={() => {
                              setQuoteSort(opt.value);
                              setQuoteSortOpen(false);
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                {visibleQuotes.length > 0 ? (
                  <p className="hire-quotes__summary-inline">
                    {t("hireQuotes.summary", { count: visibleQuotes.length })}
                    {pendingForSelectedJob > 0
                      ? ` · ${t("hirePage.pendingReview", { count: pendingForSelectedJob })}`
                      : ""}
                  </p>
                ) : null}

                {quotesError ? (
                  <p className="hire-quotes__action-error" role="alert">
                    {quotesError}
                  </p>
                ) : null}

                {quotesLoading ? (
                  <p className="hire-page__state">{t("hireQuotes.loadingQuotes")}</p>
                ) : visibleQuotes.length === 0 ? (
                  <div className="hire-quotes__no-quotes">
                    <p className="hire-quotes__panel-empty">{t("hireQuotes.noQuotesHint")}</p>
                    <Link href="/hire/search" className="hire-quotes__invite-link">
                      {t("hireQuotes.inviteFreelancers")}
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="hire-quotes__grid" role="list">
                      {pagedQuotes.map((quote) => (
                        <HireQuoteGridCard
                          key={quote.id}
                          quote={quote}
                          busy={actionBusyId === quote.id}
                          onAction={(id, action) => void handleQuoteAction(id, action)}
                          onChat={clientIdentityVerified ? (row) => setChatQuote(row) : undefined}
                          onAiCompare={(row) => setAiCompareQuote(row)}
                          canAiCompare={canAiCompareQuotes}
                          aiCompareBusy={aiCompareQuote?.id === quote.id}
                          clientIdentityVerified={clientIdentityVerified}
                          clientIdentityLoading={clientIdentityLoading}
                        />
                      ))}
                    </div>

                    <DashboardPagination
                      page={safePage}
                      totalPages={totalPages}
                      total={visibleQuotes.length}
                      onPageChange={setPage}
                      className="hire-quotes__pagination"
                    />
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {chatQuote && clientIdentityVerified ? (
        <FreelancerChatWidget
          key={chatQuote.id}
          freelancerId={chatQuote.freelancer_id}
          freelancerName={chatQuote.freelancer_name?.trim() || "Freelancer"}
          jobQuoteId={chatQuote.id}
          contextTitle={chatQuote.job_title}
          initialOpen
          onClose={() => setChatQuote(null)}
        />
      ) : null}

      {aiCompareQuote ? (
        <HireQuoteAiCompareModal
          key={aiCompareQuote.id}
          quote={aiCompareQuote}
          jobId={aiCompareQuote.job_id}
          jobQuotes={jobQuotes}
          jobTitle={selectedJob?.title}
          jobUpdatedAt={selectedJob?.job_updated_at}
          totalQuotes={jobQuotes.length}
          onClose={() => setAiCompareQuote(null)}
        />
      ) : null}
    </HireShell>
  );
}
