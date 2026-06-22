"use client";

import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStoredUser } from "@/hooks/useStoredUser";
import { getMyWork } from "@/lib/api/contracts";
import FreelancerWorkShell from "@/components/findwork/FreelancerWorkShell";
import {
  countJobContractsByFilter,
  filterJobContracts,
  isJobOnlyContract,
  type JobContractFilter,
} from "@/lib/findwork/jobContractsDisplay";
import { clientJobToListItem, sortJobsItems, type JobsListItem } from "./jobs-filter";
import JobContractCard from "./JobContractCard";
import "./findwork-contracts.css";

const FILTERS: { value: JobContractFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang có HĐ" },
  { value: "completed", label: "Hoàn thành" },
  { value: "archived", label: "Đã đóng" },
];

export default function ClientJobContractsPage() {
  const { t } = useTranslation();

  const { user, ready, isClient } = useStoredUser({ refreshFromApi: false });
  const isGuest = ready && !user;

  const [items, setItems] = useState<JobsListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<JobContractFilter>("all");
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(async () => {
    if (!user || !isClient) {
      setLoading(false);
      setItems([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await getMyWork();
      if (data.role !== "client") {
        setError(t("Trang này dành cho tài khoản khách hàng."));
        setItems([]);
        return;
      }
      const rows = (data.jobs ?? []).map(clientJobToListItem);
      setItems(rows.filter((r) => r.id && isJobOnlyContract(r)));
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải hợp đồng việc.";
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user, isClient]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => countJobContractsByFilter(items), [items]);
  const withContract = items.filter((i) => i.contractStatus && i.id !== i.jobId);
  const visibleItems = useMemo(() => {
    const filtered = filterJobContracts(withContract, filter, searchInput);
    return sortJobsItems(filtered, "recent");
  }, [withContract, filter, searchInput]);

  return (
    <FreelancerWorkShell>
      <div className="fw-contracts">
        <header className="fw-contracts__head">
          <div>
            <h1 className="fw-contracts__title">{t("Hợp đồng việc")}</h1>
            <p className="fw-contracts__lead">
              {t("Các hợp đồng đã chốt với freelancer từ báo giá job — mở chi tiết để theo dõi tiến độ và nghiệm thu.")}
            </p>
          </div>
          <Link href="/hire/joblist" className="fw-contracts__cta">
            {t("Danh sách việc")}
          </Link>
        </header>

        {isGuest ? (
          <div className="fw-contracts__guest">
            <p>{t("Đăng nhập khách hàng để xem hợp đồng việc.")}</p>
            <Link href="/dang-nhap" className="fw-contracts__cta">
              {t("Đăng nhập")}
            </Link>
          </div>
        ) : ready && user && !isClient ? (
          <p className="fw-contracts__error" role="alert">
            {t("Khách hàng đăng nhập để xem hợp đồng. Freelancer xem tại cùng trang với tài khoản FL.")}
          </p>
        ) : (
          <>
            <div className="fw-contracts__stats" aria-label={t("Tóm tắt hợp đồng")}>
              <div className="fw-contracts__stat">
                <span className="fw-contracts__stat-value">{counts.all}</span>
                <span className="fw-contracts__stat-label">{t("Có hợp đồng")}</span>
              </div>
              <div className="fw-contracts__stat">
                <span className="fw-contracts__stat-value">{counts.active}</span>
                <span className="fw-contracts__stat-label">{t("Đang thực hiện")}</span>
              </div>
              <div className="fw-contracts__stat">
                <span className="fw-contracts__stat-value">{counts.completed}</span>
                <span className="fw-contracts__stat-label">{t("Hoàn thành")}</span>
              </div>
              <div className="fw-contracts__stat">
                <span className="fw-contracts__stat-value">{counts.archived}</span>
                <span className="fw-contracts__stat-label">{t("Đã đóng")}</span>
              </div>
            </div>

            <div className="fw-contracts__toolbar">
              <input
                type="search"
                className="fw-contracts__search"
                placeholder={t("Tìm việc, freelancer...")}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label={t("Tìm hợp đồng")}
              />
              <div className="fw-contracts__filters" role="tablist" aria-label={t("Lọc hợp đồng")}>
                {FILTERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    role="tab"
                    aria-selected={filter === item.value}
                    className={`fw-contracts__filter${filter === item.value ? " fw-contracts__filter--active" : ""}`}
                    onClick={() => setFilter(item.value)}
                  >
                    {t(item.label)}
                    <span className="fw-contracts__filter-count">{counts[item.value]}</span>
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <p className="text-sm text-gray-500">{t("Đang tải...")}</p>
            ) : error ? (
              <p className="fw-contracts__error" role="alert">
                {error}
              </p>
            ) : visibleItems.length === 0 ? (
              <div className="fw-contracts__empty">
                {withContract.length === 0
                  ? "Chưa có hợp đồng nào. Đăng việc và chốt tuyển từ mục Báo giá."
                  : "Không có hợp đồng trong bộ lọc này."}
                <br />
                <Link href="/hire/quotes" style={{ marginTop: "0.75rem", display: "inline-block" }}>
                  {t("Xem báo giá")}
                </Link>
              </div>
            ) : (
              <>
                <p className="fw-contracts__summary">{visibleItems.length} hợp đồng hiển thị</p>
                <ul className="fw-contracts__list" role="list">
                  {visibleItems.map((item) => (
                    <JobContractCard
                      key={item.id}
                      item={item}
                      counterpartyLabel="Freelancer"
                      viewerRole="client"
                    />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </FreelancerWorkShell>
  );
}
