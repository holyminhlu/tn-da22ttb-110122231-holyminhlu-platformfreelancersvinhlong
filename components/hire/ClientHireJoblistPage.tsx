"use client";

import { tUi } from "@/lib/i18n/runtime";
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

const STATUS_OPTIONS = [
  { value: ALL_STATUS, label: tUi("Tất cả trạng thái") },
  { value: "open", label: tUi("Đang mở") },
  { value: "in_progress", label: tUi("Đang thực hiện") },
  { value: "closed", label: tUi("Đã đóng") },
  { value: "cancelled", label: tUi("Đã hủy") },
];

export default function ClientHireJoblistPage() {
  const { t } = useTranslation();

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
          : "Không thể tải danh sách công việc.";
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
    STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? "Tất cả trạng thái";

  const allSelectedOnPage = useMemo(
    () => jobs.length > 0 && jobs.every((j) => selectedIds.has(j.id)),
    [jobs, selectedIds],
  );

  function applySearch() {
  const t = tUi;
    setSearchQuery(searchInput.trim());
    setOffset(0);
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
  const t = tUi;
    if (event.key === "Enter") {
      event.preventDefault();
      applySearch();
    }
  }

  function handleSelect(id: string, checked: boolean) {
  const t = tUi;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleSelectAllOnPage(checked: boolean) {
  const t = tUi;
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
            <h1 className="hire-page__title">{t("Danh sách việc làm")}</h1>
            <p className="hire-page__lead">
              Quản lý các công việc bạn đã đăng — theo dõi báo giá và trạng thái từng dự án.
            </p>
          </div>
          <Link href="/hire/post" className="hire-page__post-btn">
            Đăng tuyển dụng
          </Link>
        </header>

        {postedSuccess ? (
          <p className="hire-page__banner hire-page__banner--success" role="status">
            Đăng tin tuyển dụng thành công. Công việc đã xuất hiện trong danh sách bên dưới.
          </p>
        ) : null}

        <div className="hire-page__toolbar hire-joblist__toolbar">
          <div className="hire-page__search-group">
            <input
              type="search"
              className="hire-page__search-input"
              placeholder={t("Tìm công việc đã đăng")}
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
              aria-label={t("Tìm công việc")}
            />
            <button
              type="button"
              className="hire-page__search-btn"
              aria-label={t("Tìm kiếm")}
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
                {STATUS_OPTIONS.map((opt) => (
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
              {total.toLocaleString("en-US")} job{total === 1 ? "" : "s"}
              {selectedIds.size > 0 ? ` · ${selectedIds.size} đã chọn` : ""}
            </span>
          </label>
        </div>

        {loading ? (
          <p className="hire-page__state">{t("Đang tải...")}</p>
        ) : error ? (
          <p className="hire-page__state hire-page__state--error" role="alert">
            {error}
          </p>
        ) : jobs.length === 0 ? (
          <div className="hire-page__empty">
            <p className="hire-page__empty-text">{t("Bạn chưa đăng công việc nào phù hợp bộ lọc.")}</p>
            <p className="hire-favorites__lead-sub">
              Chạy <code>backend/sql/hire_joblist_columns.sql</code> nếu API báo thiếu cột hoặc bảng{" "}
              <code>job_quotes</code>.
            </p>
            <Link href="/hire/post" className="hire-page__post-btn" style={{ marginTop: "1rem" }}>
              Đăng công việc mới
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
              <nav className="hire-search__pagination" aria-label={t("Phân trang")}>
                <button
                  type="button"
                  className="hire-search__page-btn"
                  disabled={!canPrev}
                  onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                >
                  <FaChevronLeft aria-hidden />
                  Trước
                </button>
                <span className="hire-search__page-label">
                  Trang {page} / {totalPages}
                </span>
                <button
                  type="button"
                  className="hire-search__page-btn"
                  disabled={!canNext}
                  onClick={() => setOffset((o) => o + PAGE_SIZE)}
                >
                  Sau
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
