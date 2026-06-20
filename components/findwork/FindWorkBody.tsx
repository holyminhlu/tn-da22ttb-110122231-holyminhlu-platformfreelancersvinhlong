"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useStoredUser } from "@/hooks/useStoredUser";
import { listJobCategories, listJobs, type JobListing } from "@/lib/api/jobs";
import JobCard from "./JobCard";
import FindWorkToolbar, {
  FindWorkActiveChips,
  type FindWorkQueryState,
} from "./FindWorkToolbar";
import {
  countActiveFilters,
  INITIAL_FIND_WORK_QUERY,
  queryToListJobsParams,
} from "./find-work-query";

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 400;

type PageItem = number | "ellipsis";

function buildPageItems(current: number, totalPages: number): PageItem[] {
  if (totalPages <= 1) return totalPages === 1 ? [1] : [];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: PageItem[] = [1];
  if (current > 3) items.push("ellipsis");
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  for (let p = start; p <= end; p += 1) items.push(p);
  if (current < totalPages - 2) items.push("ellipsis");
  items.push(totalPages);
  return items;
}

export default function FindWorkBody() {
  const { t } = useTranslation();

  const { user, ready } = useStoredUser({ refreshFromApi: false });
  const isGuest = ready && !user;

  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState<FindWorkQueryState>(INITIAL_FIND_WORK_QUERY);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categories, setCategories] = useState<{ name: string; jobCount?: number }[]>([]);

  useEffect(() => {
    listJobCategories()
      .then((rows) =>
        setCategories(
          rows.map((r) => ({
            name: r.name,
            jobCount: r.job_count,
          })),
        ),
      )
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery((prev) => ({ ...prev, q: searchInput.trim() }));
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const patchQuery = useCallback((patch: Partial<FindWorkQueryState>) => {
    setQuery((prev) => ({ ...prev, ...patch }));
    if ("q" in patch) setSearchInput(patch.q ?? "");
    setPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setQuery(INITIAL_FIND_WORK_QUERY);
    setSearchInput("");
    setPage(1);
    setFiltersOpen(false);
  }, []);

  const activeFilterCount = useMemo(() => countActiveFilters(query), [query]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = useMemo(() => buildPageItems(page, totalPages), [page, totalPages]);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    const offset = (page - 1) * PAGE_SIZE;
    try {
      const data = await listJobs(
        queryToListJobsParams(query, { limit: PAGE_SIZE, offset }),
      );
      setJobs(data.jobs ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải danh sách việc.";
      setError(message);
      setJobs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const handleSearchSubmit = useCallback(() => {
    const q = searchInput.trim();
    setQuery((prev) => ({ ...prev, q }));
    setPage(1);
  }, [searchInput]);

  const handleAccepted = useCallback((jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    setTotal((t) => Math.max(0, t - 1));
  }, []);

  return (
    <div className="fw-main">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold text-gray-800">{t("Tìm việc làm tự do")}</h1>
        <p className="text-sm text-gray-600">
          {isGuest
            ? `Khám phá ${total > 0 ? total.toLocaleString("vi-VN") : "các"} công việc đang mở tại Vĩnh Long. Đăng nhập để gửi báo giá và nhận việc.`
            : `Chúng tôi có ${total.toLocaleString("vi-VN")} việc làm tự do trực tuyến. Hãy gửi yêu cầu báo giá ngay để được tuyển dụng.`}
        </p>
      </div>

      {isGuest ? (
        <div className="fw-guest-banner mb-6">
          <p className="fw-guest-banner__text">
            Bạn đang xem danh sách công việc công khai. Đăng nhập để gửi báo giá và theo dõi đơn của bạn.
          </p>
          <div className="fw-guest-banner__actions">
            <Link href="/dang-nhap?next=/findwork" className="fw-btn-primary rounded px-4 py-2 text-sm font-semibold text-white">
              Đăng nhập
            </Link>
            <Link
              href="/dang-ky"
              className="rounded border border-[#0066cc] px-4 py-2 text-sm font-semibold text-[#0066cc] transition hover:bg-blue-50"
            >
              Đăng ký
            </Link>
          </div>
        </div>
      ) : null}

      <FindWorkToolbar
        query={query}
        searchInput={searchInput}
        categories={categories}
        filtersOpen={filtersOpen}
        activeFilterCount={activeFilterCount}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
        onQueryChange={patchQuery}
        onFiltersOpenChange={setFiltersOpen}
        onClearFilters={clearAllFilters}
      />

      <FindWorkActiveChips
        query={query}
        onQueryChange={patchQuery}
        onClearAll={clearAllFilters}
      />

      <div className="fw-results-count flex items-center justify-between">
        <label className="flex items-center space-x-2 text-sm text-gray-600">
          <input type="checkbox" className="mr-1" />
          <span className="font-semibold text-gray-800">
            {loading ? "…" : total.toLocaleString("vi-VN")} Kết quả
          </span>
        </label>
      </div>

      {loading ? (
        <p className="text-gray-500">{t("Đang tải việc làm...")}</p>
      ) : error ? (
        <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : jobs.length === 0 ? (
        <p className="text-gray-500">{t("Không có việc làm phù hợp với bộ lọc hiện tại.")}</p>
      ) : (
        jobs.map((job) => (
          <JobCard key={job.id} job={job} onAccepted={handleAccepted} guestMode={isGuest} />
        ))
      )}

      {!loading && !error && totalPages > 1 ? (
        <nav className="mt-8 flex justify-center" aria-label={t("Phân trang")}>
          <div className="flex items-center space-x-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border px-3 py-1 text-gray-400 hover:bg-gray-50 disabled:opacity-40"
              aria-label={t("Trang trước")}
            >
              &lt;
            </button>
            {pageItems.map((item, idx) =>
              item === "ellipsis" ? (
                <span key={`e-${idx}`} className="px-2 text-gray-400" aria-hidden>
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  className={`rounded border px-3 py-1 ${
                    item === page ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
                  }`}
                  aria-current={item === page ? "page" : undefined}
                >
                  {item}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded border px-3 py-1 text-gray-400 hover:bg-gray-50 disabled:opacity-40"
              aria-label="Trang sau"
            >
              &gt;
            </button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
