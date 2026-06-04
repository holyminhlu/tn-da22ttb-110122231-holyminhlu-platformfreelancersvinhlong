"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardPagination from "@/components/dashboard/DashboardPagination";
import "@/components/dashboard/dashboardPagination.css";
import { useStoredUser } from "@/hooks/useStoredUser";
import { listMyJobQuotes, withdrawJobQuote, type JobQuoteRow } from "@/lib/api/jobQuotes";
import {
  countFreelancerQuotesByFilter,
  filterFreelancerQuotes,
  isActiveFreelancerQuote,
  sortFreelancerQuotes,
  type FreelancerQuoteFilter,
  type FreelancerQuoteSort,
} from "@/lib/findwork/jobQuotesDisplay";
import FindworkQuoteCard from "./FindworkQuoteCard";
import FreelancerWorkShell from "./FreelancerWorkShell";
import "./findwork-quotes.css";

const PAGE_SIZE = 12;

const FILTERS: { value: FreelancerQuoteFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang mở" },
  { value: "pending", label: "Đang chờ" },
  { value: "shortlisted", label: "Shortlist" },
  { value: "interviewing", label: "Phỏng vấn" },
  { value: "offered", label: "Offer" },
  { value: "accepted", label: "Đã tuyển" },
  { value: "declined", label: "Từ chối" },
];

const SORT_OPTIONS: { value: FreelancerQuoteSort; label: string }[] = [
  { value: "newest", label: "Ưu tiên trạng thái" },
  { value: "updated", label: "Cập nhật mới" },
  { value: "price_desc", label: "Giá cao → thấp" },
  { value: "price_asc", label: "Giá thấp → cao" },
];

export default function FreelancerJobQuotesPage() {
  const { user, ready, isFreelancer } = useStoredUser({ refreshFromApi: false });
  const isGuest = ready && !user;

  const [quotes, setQuotes] = useState<JobQuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [filter, setFilter] = useState<FreelancerQuoteFilter>("active");
  const [sort, setSort] = useState<FreelancerQuoteSort>("newest");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [actionBusyId, setActionBusyId] = useState("");
  const [showWithdrawn, setShowWithdrawn] = useState(false);

  const load = useCallback(async () => {
    if (!user || !isFreelancer) {
      setLoading(false);
      setQuotes([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const rows = await listMyJobQuotes({ includeWithdrawn: showWithdrawn });
      setQuotes(rows);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải báo giá job.";
      setError(message);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, [user, isFreelancer, showWithdrawn]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filter, searchInput, sort, showWithdrawn]);

  const counts = useMemo(() => countFreelancerQuotesByFilter(quotes), [quotes]);
  const activeCount = quotes.filter(isActiveFreelancerQuote).length;

  const visibleQuotes = useMemo(() => {
    const filtered = filterFreelancerQuotes(quotes, filter, searchInput);
    return sortFreelancerQuotes(filtered, sort);
  }, [quotes, filter, searchInput, sort]);

  const totalPages = Math.max(1, Math.ceil(visibleQuotes.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedQuotes = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return visibleQuotes.slice(start, start + PAGE_SIZE);
  }, [visibleQuotes, safePage]);

  async function handleWithdraw(quoteId: string) {
    if (!window.confirm("Rút báo giá này? Bạn có thể gửi lại sau nếu việc vẫn đang mở.")) {
      return;
    }
    setActionError("");
    setActionBusyId(quoteId);
    try {
      await withdrawJobQuote(quoteId);
      await load();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể rút báo giá.";
      setActionError(message);
    } finally {
      setActionBusyId("");
    }
  }

  return (
    <FreelancerWorkShell>
      <div className="fw-quotes">
        <header className="fw-quotes__head">
          <div>
            <h1 className="fw-quotes__title">Báo giá job</h1>
            <p className="fw-quotes__lead">
              Theo dõi báo giá bạn đã gửi cho client — trạng thái shortlist, phỏng vấn, offer và
              kết quả tuyển chọn.
              {activeCount > 0 ? ` Hiện có ${activeCount} báo giá đang mở.` : ""}
            </p>
          </div>
          <Link href="/findwork" className="fw-quotes__cta">
            Tìm việc mới
          </Link>
        </header>

        {isGuest ? (
          <div className="fw-quotes__guest">
            <p>Đăng nhập freelancer để xem và quản lý báo giá job đã gửi.</p>
            <Link href="/dang-nhap" className="fw-quotes__cta">
              Đăng nhập
            </Link>
          </div>
        ) : ready && user && !isFreelancer ? (
          <p className="fw-quotes__error" role="alert">
            Trang này dành cho tài khoản freelancer.
          </p>
        ) : (
          <>
            <div className="fw-quotes__stats" aria-label="Tóm tắt báo giá">
              <div className="fw-quotes__stat">
                <span className="fw-quotes__stat-value">{counts.all}</span>
                <span className="fw-quotes__stat-label">Tổng báo giá</span>
              </div>
              <div className="fw-quotes__stat">
                <span className="fw-quotes__stat-value">{counts.active}</span>
                <span className="fw-quotes__stat-label">Đang mở</span>
              </div>
              <div className="fw-quotes__stat">
                <span className="fw-quotes__stat-value">{counts.offered}</span>
                <span className="fw-quotes__stat-label">Có offer</span>
              </div>
              <div className="fw-quotes__stat">
                <span className="fw-quotes__stat-value">{counts.accepted}</span>
                <span className="fw-quotes__stat-label">Đã tuyển</span>
              </div>
            </div>

            <div className="fw-quotes__toolbar">
              <input
                type="search"
                className="fw-quotes__search"
                placeholder="Tìm theo việc, client, nội dung..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Tìm báo giá"
              />
              <select
                className="fw-quotes__sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as FreelancerQuoteSort)}
                aria-label="Sắp xếp"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={showWithdrawn}
                  onChange={(e) => setShowWithdrawn(e.target.checked)}
                />
                Hiện đã rút
              </label>
            </div>

            <div className="fw-quotes__filters" role="tablist" aria-label="Lọc báo giá">
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={filter === item.value}
                  className={`fw-quotes__filter${filter === item.value ? " fw-quotes__filter--active" : ""}`}
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                  <span className="fw-quotes__filter-count">
                    {counts[item.value] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            {actionError ? (
              <p className="fw-quotes__error" role="alert">
                {actionError}
              </p>
            ) : null}

            {loading ? (
              <p className="text-sm text-gray-500">Đang tải...</p>
            ) : error ? (
              <p className="fw-quotes__error" role="alert">
                {error}
              </p>
            ) : visibleQuotes.length === 0 ? (
              <div className="fw-quotes__empty">
                {filter === "all" || filter === "active"
                  ? "Chưa có báo giá job nào. Duyệt Tìm việc làm và gửi đề xuất cho client đang tuyển."
                  : "Không có báo giá trong bộ lọc này."}
                <br />
                <Link href="/findwork" className="fw-quotes__action" style={{ marginTop: "0.75rem" }}>
                  Đi tới Tìm việc làm
                </Link>
              </div>
            ) : (
              <>
                <p className="fw-quotes__summary">
                  {visibleQuotes.length} báo giá
                  {filter !== "all" ? ` · lọc: ${FILTERS.find((f) => f.value === filter)?.label}` : ""}
                </p>
                <ul className="fw-quotes__grid" role="list">
                  {pagedQuotes.map((quote) => (
                    <FindworkQuoteCard
                      key={quote.id}
                      quote={quote}
                      busy={actionBusyId === quote.id}
                      onWithdraw={(id) => void handleWithdraw(id)}
                    />
                  ))}
                </ul>
                <DashboardPagination
                  page={safePage}
                  totalPages={totalPages}
                  total={visibleQuotes.length}
                  onPageChange={setPage}
                  className="fw-quotes__pagination"
                />
              </>
            )}
          </>
        )}
      </div>
    </FreelancerWorkShell>
  );
}
