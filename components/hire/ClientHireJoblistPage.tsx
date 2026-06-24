"use client";

import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaChevronDown, FaChevronLeft, FaChevronRight, FaSearch } from "react-icons/fa";
import { listMyJobs, type JobListing } from "@/lib/api/jobs";
import HireJoblistCard from "./HireJoblistCard";
import HireShell from "./HireShell";
import "./hire.css";

const PAGE_SIZE = 12;
const ALL_STATUS = "all";

export default function ClientHireJoblistPage() {
  const { t } = useTranslation();

  const statusOptions = useMemo(
    () => [
      { value: ALL_STATUS, label: t("hirePage.jobStatusAll") },
      { value: "open", label: t("hirePage.jobStatusFilterOpen") },
      { value: "in_progress", label: t("hirePage.jobStatusInProgress") },
      { value: "closed", label: t("hirePage.jobStatusClosed") },
      { value: "cancelled", label: t("hirePage.jobStatusCancelled") },
    ],
    [t],
  );

  const searchParams = useSearchParams();
  const postedSuccess = Boolean(searchParams.get("posted"));

  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS);
  const [statusOpen, setStatusOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listMyJobs({
        q: searchQuery || undefined,
        status: statusFilter !== ALL_STATUS ? statusFilter : undefined,
        limit: PAGE_SIZE,
        offset,
      });
      setJobs(data.jobs ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : t("hirePage.loadJobsError");
      setError(message);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  const statusLabel =
    statusOptions.find((o) => o.value === statusFilter)?.label ?? t("hirePage.jobStatusAll");

  const allSelectedOnPage = useMemo(
    () => jobs.length > 0 && jobs.every((j) => selectedIds.has(j.id)),
    [jobs, selectedIds],
  );

  function applySearch() {
    setSearchQuery(searchInput.trim());
    setOffset(0);
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      applySearch();
    }
  }

  function handleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleSelectAllOnPage(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const job of jobs) {
        if (checked) next.add(job.id);
        else next.delete(job.id);
      }
      return next;
    });
  }

  return (
    <HireShell>
      <div className="hire-page hire-joblist hire-joblist--full-width">
        <header className="hire-page__head">
          <div>
            <h1 className="hire-page__title">{t("hireJoblist.title")}</h1>
            <p className="hire-page__lead">{t("hireJoblist.lead")}</p>
          </div>
          <Link href="/hire/post" className="hire-page__post-btn">
            {t("hirePage.postJob")}
          </Link>
        </header>

        {postedSuccess ? (
          <p className="hire-page__banner hire-page__banner--success" role="status">
            {t("hireJoblist.postedSuccess")}
          </p>
        ) : null}

        <div className="hire-page__toolbar hire-joblist__toolbar">
          <div className="hire-page__search-group">
            <input
              type="search"
              className="hire-page__search-input"
              placeholder={t("hireJoblist.searchPlaceholder")}
              value={searchInput}
              onChange={(e) => {
                const value = e.target.value;
                setSearchInput(value);
                if (!value.trim()) {
                  setSearchQuery("");
                  setOffset(0);
                }
              }}
              onKeyDown={handleSearchKeyDown}
              aria-label={t("hireJoblist.searchAria")}
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

          <div className="hire-page__filter-wrap">
            <button
              type="button"
              className="hire-page__filter-btn"
              aria-expanded={statusOpen}
              onClick={() => setStatusOpen((v) => !v)}
            >
              <span>{statusLabel}</span>
              <FaChevronDown className="text-xs text-gray-400" aria-hidden />
            </button>
            {statusOpen ? (
              <div className="hire-page__filter-panel" role="listbox">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`hire-page__filter-option${
                      statusFilter === opt.value ? " hire-page__filter-option--active" : ""
                    }`}
                    onClick={() => {
                      setStatusFilter(opt.value);
                      setStatusOpen(false);
                      setOffset(0);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="hire-joblist__results-bar">
          <label className="hire-joblist__select-all">
            <input
              type="checkbox"
              checked={allSelectedOnPage}
              onChange={(e) => handleSelectAllOnPage(e.target.checked)}
            />
            <span>
              {total === 1
                ? t("hirePage.jobsCount", { count: total })
                : t("hirePage.jobsCountPlural", { count: total })}
              {selectedIds.size > 0 ? ` · ${t("hirePage.selected", { count: selectedIds.size })}` : ""}
            </span>
          </label>
        </div>

        {loading ? (
          <p className="hire-page__state">{t("common.loading")}</p>
        ) : error ? (
          <p className="hire-page__state hire-page__state--error" role="alert">
            {error}
          </p>
        ) : jobs.length === 0 ? (
          <div className="hire-page__empty">
            <p className="hire-page__empty-text">{t("hireJoblist.emptyFilter")}</p>
            <Link href="/hire/post" className="hire-page__post-btn" style={{ marginTop: "1rem" }}>
              {t("hirePage.postJobNew")}
            </Link>
          </div>
        ) : (
          <>
            <div className="hire-joblist__list">
              {jobs.map((job) => (
                <HireJoblistCard
                  key={job.id}
                  job={job}
                  selected={selectedIds.has(job.id)}
                  onSelect={handleSelect}
                />
              ))}
            </div>

            {totalPages > 1 ? (
              <nav className="hire-search__pagination" aria-label={t("hirePage.pagination")}>
                <button
                  type="button"
                  className="hire-search__page-btn"
                  disabled={!canPrev}
                  onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                >
                  <FaChevronLeft aria-hidden />
                  {t("hirePage.prev")}
                </button>
                <span className="hire-search__page-label">
                  {t("hirePage.pageOf", { page, totalPages })}
                </span>
                <button
                  type="button"
                  className="hire-search__page-btn"
                  disabled={!canNext}
                  onClick={() => setOffset((o) => o + PAGE_SIZE)}
                >
                  {t("hirePage.next")}
                  <FaChevronRight aria-hidden />
                </button>
              </nav>
            ) : null}
          </>
        )}
      </div>
    </HireShell>
  );
}
