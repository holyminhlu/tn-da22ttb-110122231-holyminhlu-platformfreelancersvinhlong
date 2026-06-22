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
import { assignmentToListItem, sortJobsItems, type JobsListItem } from "./jobs-filter";
import JobContractCard from "./JobContractCard";
import "./findwork-contracts.css";

const FILTERS: { value: JobContractFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang thực hiện" },
  { value: "completed", label: "Hoàn thành" },
  { value: "archived", label: "Đã đóng / hủy" },
];

export default function FreelancerJobContractsPage() {
  const { t } = useTranslation();

  const { user, ready, isFreelancer } = useStoredUser({ refreshFromApi: false });
  const isGuest = ready && !user;

  const [items, setItems] = useState<JobsListItem[]>([]);
  const [serviceOrderCount, setServiceOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<JobContractFilter>("active");
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(async () => {
    if (!user || !isFreelancer) {
      setLoading(false);
      setItems([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await getMyWork();
      if (data.role !== "freelancer") {
        setError(t("Trang này dành cho tài khoản freelancer."));
        setItems([]);
        return;
      }
      const rows = (data.assignments ?? []).map(assignmentToListItem);
      setServiceOrderCount(rows.filter((r) => !isJobOnlyContract(r)).length);
      setItems(rows.filter(isJobOnlyContract));
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
  }, [user, isFreelancer]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => countJobContractsByFilter(items), [items]);
  const visibleItems = useMemo(() => {
    const filtered = filterJobContracts(items, filter, searchInput);
    return sortJobsItems(filtered, "recent");
  }, [items, filter, searchInput]);

  return (
    <FreelancerWorkShell>
      <div className="fw-contracts">
        <header className="fw-contracts__head">
          <div>
            <h1 className="fw-contracts__title">{t("Hợp đồng việc")}</h1>
            <p className="fw-contracts__lead">
              {t("Các hợp đồng từ báo giá job được khách hàng chốt tuyển — theo dõi tiến độ, bàn giao và nghiệm thu. Đơn đặt gói dịch vụ (gig) nằm ở mục Đơn hàng dịch vụ.")}
            </p>
          </div>
          <Link href="/findwork/quotes" className="fw-contracts__cta">
            {t("Báo giá job")}
          </Link>
        </header>

        {isGuest ? (
          <div className="fw-contracts__guest">
            <p>{t("Đăng nhập freelancer để xem hợp đồng việc đã được tuyển.")}</p>
            <Link href="/dang-nhap" className="fw-contracts__cta">
              {t("Đăng nhập")}
            </Link>
          </div>
        ) : ready && user && !isFreelancer ? (
          <p className="fw-contracts__error" role="alert">
            Trang này dành cho tài khoản freelancer. Khách hàng quản lý việc tại{" "}
            <Link href="/hire/joblist">{t("Danh sách việc làm")}</Link>.
          </p>
        ) : (
          <>
            <div className="fw-contracts__stats" aria-label={t("Tóm tắt hợp đồng")}>
              <div className="fw-contracts__stat">
                <span className="fw-contracts__stat-value">{counts.all}</span>
                <span className="fw-contracts__stat-label">{t("Hợp đồng job")}</span>
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
                placeholder={t("Tìm theo việc, khách hàng, mã...")}
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
                {items.length === 0
                  ? "Chưa có hợp đồng việc nào. Gửi báo giá tại Tìm việc làm và chờ khách hàng chốt tuyển."
                  : "Không có hợp đồng trong bộ lọc này."}
                <br />
                <Link href="/findwork" style={{ marginTop: "0.75rem", display: "inline-block" }}>
                  {t("Tìm việc làm")}
                </Link>
              </div>
            ) : (
              <>
                <p className="fw-contracts__summary">{visibleItems.length} hợp đồng hiển thị</p>
                <ul className="fw-contracts__list" role="list">
                  {visibleItems.map((item) => (
                    <JobContractCard key={item.id} item={item} />
                  ))}
                </ul>
              </>
            )}

            {serviceOrderCount > 0 ? (
              <p className="fw-contracts__note">
                Bạn có {serviceOrderCount} đơn dịch vụ (gig) — xem tại{" "}
                <Link href="/dich-vu/don-hang">{t("Đơn hàng dịch vụ")}</Link>.
              </p>
            ) : null}
          </>
        )}
      </div>
    </FreelancerWorkShell>
  );
}
