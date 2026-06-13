"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaChevronDown, FaListUl, FaSearch, FaSortAmountDown } from "react-icons/fa";
import DashboardPagination from "@/components/dashboard/DashboardPagination";
import "@/components/dashboard/dashboardPagination.css";
import { getMyWork } from "@/lib/api/contracts";
import {
  listMyJobQuotes,
  patchJobQuote,
  type PatchJobQuoteAction,
  type JobQuoteRow,
  type JobQuoteStatus,
} from "@/lib/api/jobQuotes";
import FreelancerChatWidget from "@/components/chat/FreelancerChatWidget";
import HireQuoteGridCard from "./HireQuoteGridCard";
import HireShell from "./HireShell";
import { sortJobQuotes, type QuoteSort } from "@/lib/hire/quoteDisplay";
import "./hire.css";

const PAGE_SIZE = 18;

type QuoteFilter = "all" | JobQuoteStatus;

const QUOTE_FILTER_OPTIONS: { value: QuoteFilter; label: string }[] = [
  { value: "all", label: "Tất cả báo giá" },
  { value: "pending", label: "Đang chờ" },
  { value: "interviewing", label: "Phỏng vấn" },
  { value: "offered", label: "Đã gửi offer" },
  { value: "accepted", label: "Đã tuyển" },
  { value: "declined", label: "Đã từ chối" },
];

const QUOTE_SORT_OPTIONS: { value: QuoteSort; label: string }[] = [
  { value: "priority", label: "Ưu tiên xử lý" },
  { value: "newest", label: "Mới nhất" },
  { value: "price_asc", label: "Giá thấp → cao" },
  { value: "rating_desc", label: "Đánh giá cao nhất" },
];

export default function ClientHireQuotesPage() {
  const [hasJobs, setHasJobs] = useState(true);
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
          : "Không thể tải danh sách báo giá.";
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
        setError("Trang này dành cho tài khoản client.");
        setHasJobs(false);
        return;
      }
      setHasJobs((data.jobs ?? []).length > 0);
      await loadQuotes();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải danh sách công việc.";
      setError(message);
      setHasJobs(false);
    } finally {
      setLoading(false);
    }
  }, [loadQuotes]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [quoteFilter, searchQuery, quoteSort]);

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

  const visibleQuotes = useMemo(() => {
    let list = quotes;
    if (quoteFilter !== "all") {
      list = list.filter((q) => String(q.status).toLowerCase() === quoteFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (item) =>
          item.freelancer_name?.toLowerCase().includes(q) ||
          item.message?.toLowerCase().includes(q) ||
          item.freelancer_title?.toLowerCase().includes(q) ||
          item.job_title?.toLowerCase().includes(q),
      );
    }
    return sortJobQuotes(list, quoteSort);
  }, [quotes, quoteFilter, searchQuery, quoteSort]);

  const totalPages = Math.max(1, Math.ceil(visibleQuotes.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedQuotes = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return visibleQuotes.slice(start, start + PAGE_SIZE);
  }, [visibleQuotes, safePage]);

  const pendingCount = quotes.filter((q) => String(q.status).toLowerCase() === "pending").length;

  const quoteFilterLabel =
    quoteFilter === "all"
      ? "Lọc báo giá"
      : (QUOTE_FILTER_OPTIONS.find((o) => o.value === quoteFilter)?.label ?? "Lọc báo giá");

  const quoteSortLabel =
    QUOTE_SORT_OPTIONS.find((o) => o.value === quoteSort)?.label ?? "Sắp xếp";

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
      if (action === "interview") {
        const row = rows.find((q) => q.id === quoteId);
        if (row) setChatQuote(row);
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể cập nhật trạng thái báo giá.";
      setQuotesError(message);
    } finally {
      setActionBusyId("");
    }
  }

  const hasNoJobs = !loading && !error && !hasJobs;

  return (
    <HireShell>
      <div className="hire-page hire-quotes hire-quotes--full-width">
        <header className="hire-page__head">
          <div>
            <h1 className="hire-page__title">Báo giá</h1>
            <p className="hire-page__lead">
              Chọn báo giá để xem chi tiết đề xuất và quyết định thuê freelancer.
            </p>
          </div>
          <Link href="/hire/post" className="hire-page__post-btn">
            Đăng tuyển dụng
          </Link>
        </header>

        <div className="hire-page__toolbar hire-quotes__toolbar">
          <div className="hire-page__search-group">
            <input
              type="search"
              className="hire-page__search-input"
              placeholder="Tìm việc hoặc freelancer"
              value={searchInput}
              onChange={(e) => {
                const value = e.target.value;
                setSearchInput(value);
                if (!value.trim()) setSearchQuery("");
              }}
              onKeyDown={handleSearchKeyDown}
              aria-label="Tìm việc hoặc freelancer"
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
              <div className="hire-page__filter-panel" role="listbox" aria-label="Lọc báo giá">
                {QUOTE_FILTER_OPTIONS.map((opt) => (
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
              <div className="hire-page__filter-panel" role="listbox" aria-label="Sắp xếp báo giá">
                {QUOTE_SORT_OPTIONS.map((opt) => (
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

        {loading ? (
          <p className="hire-page__state">Đang tải...</p>
        ) : error ? (
          <p className="hire-page__state hire-page__state--error" role="alert">
            {error}
          </p>
        ) : hasNoJobs ? (
          <div className="hire-page__empty hire-quotes__empty">
            <h2 className="hire-quotes__empty-title">Bạn chưa đăng công việc nào</h2>
            <p className="hire-page__empty-text">
              Đăng tin tuyển dụng để nhận báo giá và đề xuất từ freelancer tại Vĩnh Long.
            </p>
            <Link href="/hire/post" className="hire-page__post-btn">
              Đăng tuyển dụng
            </Link>
          </div>
        ) : (
          <>
            {visibleQuotes.length > 0 ? (
              <p className="hire-quotes__summary-inline">
                {visibleQuotes.length} báo giá
                {pendingCount > 0 ? ` · ${pendingCount} chờ xử lý` : ""}
              </p>
            ) : null}

            {quotesError ? (
              <p className="hire-quotes__action-error" role="alert">
                {quotesError}
              </p>
            ) : null}

            {quotesLoading ? (
              <p className="hire-page__state">Đang tải báo giá...</p>
            ) : visibleQuotes.length === 0 ? (
              <div className="hire-quotes__no-quotes">
                <p className="hire-quotes__panel-empty">
                  Chưa có báo giá nào. Freelancer gửi báo giá sau khi ứng tuyển từ trang Tìm việc.
                </p>
                <Link href="/hire/search" className="hire-quotes__invite-link">
                  Mời freelancer từ danh sách
                </Link>
              </div>
            ) : (
              <>
                <div className="hire-quotes__grid" role="list">
                  {pagedQuotes.map((quote) => (
                    <HireQuoteGridCard
                      key={quote.id}
                      quote={quote}
                      showJobTitle
                      busy={actionBusyId === quote.id}
                      onAction={(id, action) => void handleQuoteAction(id, action)}
                      onChat={(row) => setChatQuote(row)}
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
          </>
        )}
      </div>

      {chatQuote ? (
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
    </HireShell>
  );
}
