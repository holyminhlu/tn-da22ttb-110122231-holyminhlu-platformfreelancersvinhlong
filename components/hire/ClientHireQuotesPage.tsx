"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaChevronDown, FaListUl, FaSearch } from "react-icons/fa";
import { getMyWork, type MyWorkClientJob } from "@/lib/api/contracts";
import WorkDetailGallery from "@/components/findwork/WorkDetailGallery";
import { contractStatusLabel, searchJobsItems } from "@/components/jobs/jobs-filter";
import { formatDate, formatVnd } from "@/lib/format";
import { parseJobImages } from "@/lib/jobsDisplay";
import HireShell from "./HireShell";
import "./hire.css";

type JobTypeFilter = "all" | "open" | "closed" | "has_contract";

const JOB_TYPE_OPTIONS: { value: JobTypeFilter; label: string }[] = [
  { value: "all", label: "Tất cả loại công việc" },
  { value: "open", label: "Đang mở" },
  { value: "closed", label: "Đã đóng" },
  { value: "has_contract", label: "Có hợp đồng" },
];

function HireQuotesDetailPanel({ job }: { job: MyWorkClientJob }) {
  const images = parseJobImages(job.job_images);
  const hasMedia = images.length > 0;

  return (
    <div
      className={`hire-quotes__panel-grid${hasMedia ? " hire-quotes__panel-grid--media" : ""}`}
    >
      <div className="hire-quotes__panel-main">
        <h2 className="hire-quotes__panel-title">{job.title}</h2>
        <dl className="hire-quotes__detail-meta">
          <div>
            <dt>Trạng thái</dt>
            <dd>{contractStatusLabel(job.job_status)}</dd>
          </div>
          {job.budget != null ? (
            <div>
              <dt>Ngân sách</dt>
              <dd>{formatVnd(job.budget)}</dd>
            </div>
          ) : null}
          <div>
            <dt>Đăng ngày</dt>
            <dd>{formatDate(job.job_created_at)}</dd>
          </div>
          {job.job_due_at ? (
            <div>
              <dt>Hạn hoàn thành</dt>
              <dd>{formatDate(job.job_due_at)}</dd>
            </div>
          ) : null}
        </dl>
        {job.description?.trim() ? (
          <p className="hire-quotes__detail-desc">{job.description.trim()}</p>
        ) : null}
        <p className="hire-quotes__panel-empty">
          Chưa có báo giá nào cho công việc này. Freelancer sẽ gửi báo giá sau khi bạn đăng tin
          hoặc mời họ — tính năng đang được phát triển.
        </p>
      </div>
      {hasMedia ? (
        <aside className="hire-quotes__panel-media" aria-label="Ảnh đính kèm">
          <WorkDetailGallery images={images} title={job.title} />
        </aside>
      ) : null}
    </div>
  );
}

function filterByJobType(jobs: MyWorkClientJob[], filter: JobTypeFilter): MyWorkClientJob[] {
  if (filter === "all") return jobs;
  if (filter === "open") return jobs.filter((j) => String(j.job_status).toLowerCase() === "open");
  if (filter === "closed") return jobs.filter((j) => String(j.job_status).toLowerCase() === "closed");
  if (filter === "has_contract") return jobs.filter((j) => Boolean(j.contract_id));
  return jobs;
}

export default function ClientHireQuotesPage() {
  const [jobs, setJobs] = useState<MyWorkClientJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState<JobTypeFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMyWork();
      if (data.role !== "client") {
        setError("Trang này dành cho tài khoản client.");
        setJobs([]);
        return;
      }
      const rows = data.jobs ?? [];
      setJobs(rows);
      setSelectedJobId((prev) => {
        if (prev && rows.some((j) => j.job_id === prev)) return prev;
        return rows[0]?.job_id ?? null;
      });
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
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!filterOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!filterRef.current?.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [filterOpen]);

  const filteredJobs = useMemo(() => {
    let list = filterByJobType(jobs, jobTypeFilter);
    const searchable = list.map((j) => ({
      id: j.job_id,
      jobId: j.job_id,
      title: j.title,
      counterparty: j.freelancer_name || j.freelancer_email,
      contractStatus: j.contract_status || j.job_status,
      jobStatus: j.job_status,
      agreedPrice: j.agreed_price,
      budget: j.budget,
      activityAt: j.job_updated_at || j.job_created_at,
      hasSafepay: false,
    }));
    const ids = new Set(searchJobsItems(searchable, searchQuery).map((i) => i.jobId));
    list = list.filter((j) => ids.has(j.job_id));
    return list;
  }, [jobs, jobTypeFilter, searchQuery]);

  const selectedJob = filteredJobs.find((j) => j.job_id === selectedJobId) ?? null;

  const jobTypeLabel =
    jobTypeFilter === "all"
      ? "Loại công việc"
      : (JOB_TYPE_OPTIONS.find((o) => o.value === jobTypeFilter)?.label ?? "Loại công việc");

  function applySearch() {
    setSearchQuery(searchInput.trim());
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      applySearch();
    }
  }

  const hasNoJobs = !loading && !error && jobs.length === 0;
  const noMatches = !loading && !error && jobs.length > 0 && filteredJobs.length === 0;

  return (
    <HireShell>
      <div className="hire-page hire-quotes hire-quotes--full-width">
        <header className="hire-page__head">
          <div>
            <h1 className="hire-page__title">Trích dẫn</h1>
            <p className="hire-page__lead">Chọn một công việc để xem báo giá.</p>
          </div>
          <Link href="/hire/post" className="hire-page__post-btn">
            Đăng tuyển dụng
          </Link>
        </header>

        <div className="hire-page__toolbar">
          <div className="hire-page__search-group">
            <input
              type="search"
              className="hire-page__search-input"
              placeholder="Tìm việc làm"
              value={searchInput}
              onChange={(e) => {
                const value = e.target.value;
                setSearchInput(value);
                if (!value.trim()) setSearchQuery("");
              }}
              onKeyDown={handleSearchKeyDown}
              aria-label="Tìm việc làm"
            />
            <button
              type="button"
              className="hire-page__search-btn"
              aria-label="Tìm kiếm"
              onClick={applySearch}
            >
              <FaSearch aria-hidden />
            </button>
          </div>

          <div className="hire-page__filter-wrap" ref={filterRef}>
            <button
              type="button"
              className="hire-page__filter-btn"
              aria-expanded={filterOpen}
              aria-haspopup="listbox"
              onClick={() => setFilterOpen((prev) => !prev)}
            >
              <span className="hire-page__filter-label">
                <FaListUl aria-hidden className="text-gray-500" />
                <span>{jobTypeLabel}</span>
              </span>
              <FaChevronDown className="text-xs text-gray-400" aria-hidden />
            </button>
            {filterOpen ? (
              <div className="hire-page__filter-panel" role="listbox" aria-label="Loại công việc">
                {JOB_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={jobTypeFilter === opt.value}
                    className={`hire-page__filter-option${
                      jobTypeFilter === opt.value ? " hire-page__filter-option--active" : ""
                    }`}
                    onClick={() => {
                      setJobTypeFilter(opt.value);
                      setFilterOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {loading ? (
          <p className="hire-page__state">Đang tải...</p>
        ) : error ? (
          <p className="hire-page__state hire-page__state--error" role="alert">
            {error}
          </p>
        ) : hasNoJobs ? (
          <div className="hire-page__empty">
            <p className="hire-page__empty-text">Bạn chưa đăng bất kỳ công việc nào.</p>
          </div>
        ) : noMatches ? (
          <div className="hire-page__empty">
            <p className="hire-page__empty-text">Không tìm thấy công việc phù hợp.</p>
          </div>
        ) : (
          <div className="hire-quotes__layout">
            <div className="hire-quotes__jobs" role="list" aria-label="Danh sách công việc">
              {filteredJobs.map((job) => {
                const active = job.job_id === selectedJobId;
                return (
                  <button
                    key={job.job_id}
                    type="button"
                    role="listitem"
                    className={`hire-quotes__job${active ? " hire-quotes__job--active" : ""}`}
                    aria-pressed={active}
                    onClick={() => setSelectedJobId(job.job_id)}
                  >
                    <p className="hire-quotes__job-title">{job.title}</p>
                    <p className="hire-quotes__job-meta">
                      {contractStatusLabel(job.job_status)}
                      {job.budget != null ? ` · ${formatVnd(job.budget)}` : ""}
                      {" · "}
                      {formatDate(job.job_created_at)}
                    </p>
                  </button>
                );
              })}
            </div>

            <section className="hire-quotes__panel" aria-live="polite">
              {selectedJob ? (
                <HireQuotesDetailPanel job={selectedJob} />
              ) : (
                <p className="hire-quotes__panel-empty">Chọn một công việc để xem báo giá.</p>
              )}
            </section>
          </div>
        )}
      </div>
    </HireShell>
  );
}
