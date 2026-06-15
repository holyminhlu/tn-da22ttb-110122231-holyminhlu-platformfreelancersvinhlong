"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { FaRedo, FaSearch } from "react-icons/fa";
import { formatDate } from "@/lib/format";
import {
  approveFreelancerAccount,
  listFreelancerApprovals,
  rejectFreelancerAccount,
  type AdminReviewStatus,
  type AdminRoleFilter,
  type FreelancerApprovalItem,
} from "@/lib/api/admin";
import "./admin.css";

const TABS: { id: AdminReviewStatus; label: string }[] = [
  { id: "pending", label: "Chờ duyệt" },
  { id: "approved", label: "Đã duyệt" },
  { id: "rejected", label: "Từ chối" },
];

const ROLE_OPTIONS: { id: AdminRoleFilter; label: string }[] = [
  { id: "all", label: "Tất cả vai trò" },
  { id: "client", label: "Client" },
  { id: "freelancer", label: "Freelancer" },
];

function stepBadge(done: boolean) {
  return (
    <span className={`admin-badge ${done ? "admin-badge--ok" : "admin-badge--bad"}`}>
      {done ? "Xong" : "Thiếu"}
    </span>
  );
}

function reviewBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "approved") return <span className="admin-badge admin-badge--ok">Đã duyệt</span>;
  if (s === "rejected") return <span className="admin-badge admin-badge--bad">Từ chối</span>;
  return <span className="admin-badge admin-badge--pending">Chờ duyệt</span>;
}

export default function FreelancerApprovalPage() {
  const [tab, setTab] = useState<AdminReviewStatus>("pending");
  const [roleFilter, setRoleFilter] = useState<AdminRoleFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [readyOnly, setReadyOnly] = useState(false);
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [items, setItems] = useState<FreelancerApprovalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; message: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listFreelancerApprovals({
        status: tab,
        role: roleFilter,
        q: searchQuery,
        readyOnly,
        incompleteOnly,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải danh sách.";
      setToast({ type: "err", message: msg });
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [tab, roleFilter, searchQuery, readyOnly, incompleteOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  function resetFilters() {
    setRoleFilter("all");
    setSearchInput("");
    setSearchQuery("");
    setReadyOnly(false);
    setIncompleteOnly(false);
  }

  const hasActiveFilters =
    roleFilter !== "all" || searchQuery !== "" || readyOnly || incompleteOnly;

  async function handleApprove(userId: string, role: string) {
    const label = role === "client" ? "client" : "freelancer";
    if (
      !window.confirm(
        `Duyệt hồ sơ xác minh ${label} này?${role === "freelancer" ? " Họ sẽ có thể báo giá và thao tác với job." : ""}`,
      )
    ) {
      return;
    }
    setBusyId(userId);
    setToast(null);
    try {
      const result = await approveFreelancerAccount(userId);
      setToast({ type: "ok", message: result.message });
      await load();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể duyệt.";
      setToast({ type: "err", message: msg });
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(userId: string) {
    const note = window.prompt("Lý do từ chối (tuỳ chọn):");
    if (note === null) return;
    setBusyId(userId);
    setToast(null);
    try {
      const result = await rejectFreelancerAccount(userId, note || undefined);
      setToast({ type: "ok", message: result.message });
      await load();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể từ chối.";
      setToast({ type: "err", message: msg });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <h1 className="admin-page__title">Duyệt xác minh danh tính</h1>
        <p className="admin-page__lead">
          Client và Freelancer phải hoàn thành 3 bước (thông tin nhận dạng, thẻ tín dụng, gửi xem
          xét) trước khi admin duyệt. Freelancer cần được duyệt để báo giá và thao tác với job.
        </p>
      </header>

      {toast ? (
        <div className={`admin-toast admin-toast--${toast.type === "ok" ? "ok" : "err"}`} role="status">
          {toast.message}
        </div>
      ) : null}

      <div className="admin-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className={`admin-tab${tab === t.id ? " admin-tab--active" : ""}`}
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="admin-filters" aria-label="Bộ lọc hồ sơ">
        <div className="admin-filters__row">
          <label className="admin-filters__field admin-filters__field--search">
            <span className="admin-filters__label">Tìm kiếm</span>
            <div className="admin-filters__search-wrap">
              <FaSearch className="admin-filters__search-icon" aria-hidden />
              <input
                type="search"
                className="admin-filters__input"
                placeholder="Email, tên hồ sơ…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </label>

          <label className="admin-filters__field">
            <span className="admin-filters__label">Vai trò</span>
            <select
              className="admin-filters__select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as AdminRoleFilter)}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div className="admin-filters__checks">
            <label className="admin-filters__check">
              <input
                type="checkbox"
                checked={readyOnly}
                onChange={(e) => {
                  setReadyOnly(e.target.checked);
                  if (e.target.checked) setIncompleteOnly(false);
                }}
              />
              <span>Đủ điều kiện duyệt</span>
            </label>
            <label className="admin-filters__check">
              <input
                type="checkbox"
                checked={incompleteOnly}
                onChange={(e) => {
                  setIncompleteOnly(e.target.checked);
                  if (e.target.checked) setReadyOnly(false);
                }}
              />
              <span>Thiếu bước xác minh</span>
            </label>
          </div>
        </div>

        <div className="admin-filters__meta">
          <p className="admin-filters__count" role="status">
            {loading ? "Đang tải…" : `Hiển thị ${total} hồ sơ`}
          </p>
          <div className="admin-filters__actions">
            {hasActiveFilters ? (
              <button type="button" className="admin-btn admin-btn--ghost" onClick={resetFilters}>
                Xóa bộ lọc
              </button>
            ) : null}
            <button
              type="button"
              className="admin-btn"
              onClick={() => void load()}
              disabled={loading}
            >
              <FaRedo aria-hidden /> Làm mới
            </button>
          </div>
        </div>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <p className="admin-empty">Đang tải…</p>
        ) : items.length === 0 ? (
          <p className="admin-empty">
            {hasActiveFilters
              ? "Không có hồ sơ phù hợp bộ lọc. Thử đổi điều kiện hoặc xóa bộ lọc."
              : "Không có hồ sơ nào trong mục này."}
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Vai trò</th>
                <th>Bước 1</th>
                <th>Bước 2</th>
                <th>Bước 3</th>
                <th>Trạng thái</th>
                <th>Gửi lúc</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <Fragment key={item.userId}>
                  <tr>
                    <td>
                      <strong>{item.fullName || "—"}</strong>
                      <br />
                      <span className="admin-table__email">{item.email}</span>
                    </td>
                    <td>
                      <span className="admin-badge admin-badge--role">
                        {item.role === "client" ? "Client" : "Freelancer"}
                      </span>
                    </td>
                    <td>{stepBadge(item.step1Complete)}</td>
                    <td>{stepBadge(item.step2Complete)}</td>
                    <td>{stepBadge(item.step3Complete)}</td>
                    <td>{reviewBadge(item.adminReviewStatus)}</td>
                    <td>{item.submittedAt ? formatDate(item.submittedAt) : "—"}</td>
                    <td>
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn--primary"
                          disabled={busyId === item.userId || tab !== "pending" || !item.canApprove}
                          onClick={() => void handleApprove(item.userId, item.role)}
                        >
                          Duyệt
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--danger"
                          disabled={busyId === item.userId || tab !== "pending"}
                          onClick={() => void handleReject(item.userId)}
                        >
                          Từ chối
                        </button>
                        <button
                          type="button"
                          className="admin-btn"
                          onClick={() =>
                            setExpandedId((prev) => (prev === item.userId ? null : item.userId))
                          }
                        >
                          Chi tiết
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === item.userId ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="admin-detail">
                          <div className="admin-detail__grid">
                            <div>
                              <span className="admin-detail__label">Điện thoại</span>
                              {item.phone || "—"}
                            </div>
                            <div>
                              <span className="admin-detail__label">Thẻ (last4)</span>
                              {item.cardLast4 ? `**** ${item.cardLast4}` : "—"}
                            </div>
                            <div>
                              <span className="admin-detail__label">Xác minh thẻ</span>
                              {item.cardVerifiedAt ? formatDate(item.cardVerifiedAt) : "—"}
                            </div>
                            <div>
                              <span className="admin-detail__label">Trạng thái user</span>
                              {item.userStatus}
                            </div>
                          </div>
                          {item.blockers.length > 0 ? (
                            <ul className="admin-detail__list">
                              {item.blockers.map((b) => (
                                <li key={b}>{b}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="admin-detail__ok">Đủ điều kiện duyệt.</p>
                          )}
                          {item.adminReviewNote ? (
                            <p className="admin-detail__note">
                              <strong>Ghi chú:</strong> {item.adminReviewNote}
                            </p>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
