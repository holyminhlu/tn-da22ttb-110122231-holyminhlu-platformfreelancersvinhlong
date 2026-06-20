"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBriefcase,
  FaSearch,
  FaSortAmountDown,
  FaSortAlphaDown,
} from "react-icons/fa";
import DashboardPagination from "@/components/dashboard/DashboardPagination";
import { getMyWork } from "@/lib/api/contracts";
import { usePagedList } from "@/hooks/usePagedList";
import {
  clientJobToListItem,
  isWorkspaceArchived,
  searchJobsItems,
  sortJobsItems,
  type JobsListItem,
} from "@/components/jobs/jobs-filter";
import ManageWorkspaceCard from "./ManageWorkspaceCard";
import ManageShell from "./ManageShell";
import "@/components/hire/hire.css";
import "@/components/dashboard/dashboardPagination.css";
import "./manage.css";

const PAGE_SIZE = 5;

type DisplayFilter = "all" | "active" | "archived";

const DISPLAY_FILTERS: { value: DisplayFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang hoạt động" },
  { value: "archived", label: "Đã lưu trữ" },
];

export default function ClientManagePage() {
  const { t } = useTranslation();

  const [items, setItems] = useState<JobsListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [displayFilter, setDisplayFilter] = useState<DisplayFilter>("all");
  const [recentActivity, setRecentActivity] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMyWork();
      if (data.role !== "client") {
        setError("Trang này dành cho tài khoản client.");
        setItems([]);
        return;
      }
      setItems((data.jobs ?? []).map(clientJobToListItem));
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải danh sách phòng làm việc.";
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const active = items.filter(
      (i) => !isWorkspaceArchived(i.contractStatus, i.jobStatus),
    ).length;
    const archived = items.filter((i) =>
      isWorkspaceArchived(i.contractStatus, i.jobStatus),
    ).length;
    return { all: items.length, active, archived };
  }, [items]);

  const proposalPendingCount = useMemo(
    () =>
      items.filter(
        (i) =>
          Boolean(i.serviceId) &&
          Boolean(i.proposalText?.trim()) &&
          String(i.workflowStage || "").toLowerCase() === "selection",
      ).length,
    [items],
  );

  const filteredItems = useMemo(() => {
    let list = items;
    if (displayFilter === "active") {
      list = list.filter((i) => !isWorkspaceArchived(i.contractStatus, i.jobStatus));
    } else if (displayFilter === "archived") {
      list = list.filter((i) => isWorkspaceArchived(i.contractStatus, i.jobStatus));
    }
    list = searchJobsItems(list, searchQuery);
    return sortJobsItems(list, recentActivity ? "recent" : "title");
  }, [items, displayFilter, searchQuery, recentActivity]);

  const {
    items: pagedItems,
    page,
    totalPages,
    total: filteredTotal,
    setPage,
  } = usePagedList(filteredItems, PAGE_SIZE);

  function applySearch() {
  const t = tUi;
    setSearchQuery(searchInput.trim());
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
  const t = tUi;
    if (event.key === "Enter") {
      event.preventDefault();
      applySearch();
    }
  }

  const emptyWorkspace = !loading && !error && filteredItems.length === 0;
  const noItemsAtAll = !loading && !error && items.length === 0;
  const filteredEmpty = emptyWorkspace && !noItemsAtAll;

  return (
    <ManageShell>
      <div className="manage-page manage-page--full-width">
        <header className="hire-page__head manage-page__head">
          <div>
            <h1 className="hire-page__title">Phòng làm việc</h1>
            <p className="hire-page__lead">
              Theo dõi tiến độ công việc, trao đổi và quản lý hợp đồng với freelancer.
            </p>
          </div>
          <Link href="/hire/post" className="hire-page__post-btn">
            Đăng tin tuyển dụng
          </Link>
        </header>

        {proposalPendingCount > 0 ? (
          <p className="hire-page__banner hire-page__banner--success manage-page__banner" role="status">
            Bạn có {proposalPendingCount} đề xuất từ freelancer chờ xem xét. Mở thẻ có nhãn{" "}
            <strong>Đề xuất mới</strong> hoặc vào{" "}
            <Link href="/hire/orders">Đơn dịch vụ</Link> trong menu Thuê.
          </p>
        ) : null}

        <div className="manage-page__toolbar">
          <div className="hire-page__search-group manage-page__search">
            <input
              type="search"
              className="hire-page__search-input"
              placeholder="Tìm theo tiêu đề hoặc mã công việc..."
              value={searchInput}
              onChange={(e) => {
                const value = e.target.value;
                setSearchInput(value);
                if (!value.trim()) setSearchQuery("");
              }}
              onKeyDown={handleSearchKeyDown}
              aria-label="Tìm theo tiêu đề hoặc mã công việc"
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

          <div className="manage-page__filters" role="group" aria-label="Lọc phòng làm việc">
            {DISPLAY_FILTERS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`manage-page__filter${displayFilter === opt.value ? " manage-page__filter--active" : ""}`}
                aria-pressed={displayFilter === opt.value}
                onClick={() => setDisplayFilter(opt.value)}
              >
                {opt.label}
                <span className="manage-page__filter-count">{counts[opt.value]}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`manage-page__sort${recentActivity ? " manage-page__sort--active" : ""}`}
            onClick={() => setRecentActivity((prev) => !prev)}
            aria-pressed={recentActivity}
            title={recentActivity ? "Sắp xếp theo hoạt động gần đây" : "Sắp xếp theo tên"}
          >
            {recentActivity ? (
              <>
                <FaSortAmountDown aria-hidden />
                Hoạt động gần đây
              </>
            ) : (
              <>
                <FaSortAlphaDown aria-hidden />
                Theo tên
              </>
            )}
          </button>
        </div>

        {!loading && !error && items.length > 0 ? (
          <p className="manage-page__summary" aria-live="polite">
            Hiển thị <strong>{filteredTotal}</strong>
            {filteredTotal === 1 ? " phòng làm việc" : " phòng làm việc"}
            {searchQuery ? ` cho “${searchQuery}”` : ""}
            {totalPages > 1 ? ` · trang ${page}/${totalPages}` : ""}
          </p>
        ) : null}

        {loading ? (
          <div className="manage-page__loading" aria-busy="true">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="manage-page__skeleton" />
            ))}
          </div>
        ) : error ? (
          <p className="hire-page__state hire-page__state--error" role="alert">
            {error}
          </p>
        ) : noItemsAtAll ? (
          <div className="manage-page__empty">
            <div className="manage-page__empty-icon" aria-hidden>
              <FaBriefcase />
            </div>
            <h2 className="manage-page__empty-title">Chưa có phòng làm việc</h2>
            <p className="manage-page__empty-text">
              Khi bạn đăng tin tuyển dụng hoặc bắt đầu hợp đồng với freelancer, phòng làm việc sẽ
              xuất hiện tại đây để bạn theo dõi tiến độ và trao đổi.
            </p>
            <div className="manage-page__empty-actions">
              <Link href="/hire/post" className="hire-page__post-btn">
                Đăng tin tuyển dụng (miễn phí)
              </Link>
              <Link href="/hire" className="manage-page__empty-link">
                Đi tới Tuyển dụng
              </Link>
            </div>
          </div>
        ) : filteredEmpty ? (
          <div className="manage-page__empty manage-page__empty--compact">
            <p className="manage-page__empty-text">
              {searchQuery
                ? `Không tìm thấy phòng làm việc phù hợp với “${searchQuery}”.`
                : "Không có phòng làm việc trong bộ lọc này."}
            </p>
            {searchQuery ? (
              <button
                type="button"
                className="manage-page__empty-link manage-page__empty-link--btn"
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                }}
              >
                Xóa tìm kiếm
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <ul className="manage-page__list">
              {pagedItems.map((item) => (
                <li key={`${item.jobId}-${item.id}`}>
                  <ManageWorkspaceCard item={item} onChanged={load} />
                </li>
              ))}
            </ul>
            <DashboardPagination
              page={page}
              totalPages={totalPages}
              total={filteredTotal}
              onPageChange={setPage}
              className="manage-page__pagination"
            />
          </>
        )}
      </div>
    </ManageShell>
  );
}
