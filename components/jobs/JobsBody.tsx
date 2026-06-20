"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getMyWork } from "@/lib/api/contracts";
import type { JobsFilter, JobsSort } from "./constants";
import JobAssignmentCard from "./JobAssignmentCard";
import JobsFilterPanel from "./JobsFilterPanel";
import JobsListSkeleton from "./JobsListSkeleton";
import JobsResultBar from "./JobsResultBar";
import JobsSearchBar from "./JobsSearchBar";
import {
  assignmentToListItem,
  clientJobToListItem,
  filterJobsItems,
  searchJobsItems,
  sortJobsItems,
  type JobsListItem,
} from "./jobs-filter";

export default function JobsBody() {
  const { t } = useTranslation();
  const [items, setItems] = useState<JobsListItem[]>([]);
  const [role, setRole] = useState<"freelancer" | "client" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<JobsFilter>("all");
  const [sort, setSort] = useState<JobsSort>("recent");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMyWork();
      setRole(data.role);
      const rows: JobsListItem[] =
        data.role === "freelancer"
          ? (data.assignments ?? []).map(assignmentToListItem)
          : (data.jobs ?? []).map(clientJobToListItem);
      setItems(rows);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải danh sách việc làm.";
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => filterJobsItems(items, filter), [items, filter]);

  const visibleItems = useMemo(() => {
    let list = filteredItems;
    list = searchJobsItems(list, searchQuery);
    return sortJobsItems(list, sort);
  }, [filteredItems, searchQuery, sort]);

  const showSafepayNote =
    filter === "safepay" || filter === "archived_safepay";

  function applySearch() {
  const t = tUi;
    setSearchQuery(searchInput.trim());
  }

  function handleSearchInputChange(value: string) {
  const t = tUi;
    setSearchInput(value);
    if (!value.trim()) setSearchQuery("");
  }

  return (
    <div className="jobs-layout">
      <header className="jobs-header">
        <div>
          <h1 className="jobs-title">{t("Việc làm")}</h1>
          <p className="jobs-header__lead">
            {role === "client"
              ? "Quản lý công việc bạn đã đăng và hợp đồng với freelancer."
              : "Theo dõi các công việc bạn đã nhận và đang thực hiện."}
          </p>
        </div>
        {!loading && items.length > 0 ? (
          <span className="jobs-header__badge">{items.length} tổng</span>
        ) : null}
      </header>

      <div className="jobs-workspace">
        <div className="jobs-workspace__main">
          <div className="jobs-controls-row">
            <JobsSearchBar
              value={searchInput}
              onChange={handleSearchInputChange}
              onSubmit={applySearch}
            />
            <JobsFilterPanel
              filter={filter}
              sort={sort}
              onFilterApply={setFilter}
              onSortChange={setSort}
            />
          </div>

          {loading ? (
            <JobsListSkeleton />
          ) : error ? (
            <div className="jobs-state jobs-state--error" role="alert">
              <p>{error}</p>
              <button type="button" className="jobs-filter__apply" onClick={() => void load()}>
                {t("Thử lại")}
              </button>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="jobs-empty">
              {items.length === 0 ? (
                <>
                  <p className="jobs-empty__title">
                    {role === "client"
                      ? "Bạn chưa đăng hoặc chưa có freelancer nhận việc nào."
                      : "Bạn chưa được nhận vào bất kỳ công việc nào."}
                  </p>
                  <p>
                    {role === "client" ? (
                      <>
                        {t("Hãy")} <Link href="/findwork">{t("đăng tin")}</Link> {t("hoặc chờ freelancer gửi báo giá.")}
                      </>
                    ) : (
                      <>
                        {t("Hãy")} <Link href="/findwork">{t("tìm việc")}</Link> và nộp đơn hoặc{" "}
                        <Link href="/findwork">{t("theo dõi")}</Link> {t("những công việc bạn thích.")}
                      </>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <p className="jobs-empty__title">{t("Không có kết quả phù hợp")}</p>
                  <p>{t("Thử đổi bộ lọc hoặc từ khóa tìm kiếm.")}</p>
                  <button
                    type="button"
                    className="jobs-empty__reset"
                    onClick={() => {
                      setFilter("all");
                      setSearchInput("");
                      setSearchQuery("");
                    }}
                  >
                    {t("Xóa bộ lọc & tìm kiếm")}
                  </button>
                </>
              )}
              {showSafepayNote ? (
                <p className="jobs-safepay-note">
                  {t("Bộ lọc SafePay sẽ hiển thị khi hợp đồng có quỹ ký quỹ được ghi nhận trên hệ thống.")}
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <JobsResultBar
                total={filteredItems.length}
                showing={visibleItems.length}
                filter={filter}
                role={role}
                onRefresh={() => void load()}
                refreshing={loading}
              />
              <div className="jobs-list">
                {visibleItems.map((item) => (
                  <JobAssignmentCard key={item.id} item={item} role={role} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
