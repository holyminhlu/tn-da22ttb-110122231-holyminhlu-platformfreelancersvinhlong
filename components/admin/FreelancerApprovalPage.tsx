"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { formatDate } from "@/lib/format";
import {
  approveFreelancerAccount,
  listFreelancerApprovals,
  rejectFreelancerAccount,
  type AdminReviewStatus,
  type FreelancerApprovalItem,
} from "@/lib/api/admin";
import "./admin.css";

const TABS: { id: AdminReviewStatus; label: string }[] = [
  { id: "pending", label: "Chờ duyệt" },
  { id: "approved", label: "Đã duyệt" },
  { id: "rejected", label: "Từ chối" },
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
  const [items, setItems] = useState<FreelancerApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; message: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listFreelancerApprovals(tab);
      setItems(data.items);
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải danh sách.";
      setToast({ type: "err", message: msg });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApprove(userId: string) {
    if (!window.confirm("Duyệt tài khoản freelancer này? Họ sẽ có thể báo giá và thao tác với job.")) {
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
        <h1 className="admin-page__title">Duyệt tài khoản Freelancer</h1>
        <p className="admin-page__lead">
          Freelancer phải hoàn thành 3 bước xác minh danh tính (thông tin nhận dạng, thẻ tín dụng,
          gửi xem xét) trước khi admin duyệt. Sau khi duyệt, họ mới được báo giá và thao tác với
          job.
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

      <div className="admin-table-wrap">
        {loading ? (
          <p className="admin-empty">Đang tải…</p>
        ) : items.length === 0 ? (
          <p className="admin-empty">Không có hồ sơ nào trong mục này.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Freelancer</th>
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
                      <span style={{ color: "#64748b", fontSize: "0.8125rem" }}>{item.email}</span>
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
                          onClick={() => void handleApprove(item.userId)}
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
                      <td colSpan={7}>
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
                            <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.8125rem" }}>
                              {item.blockers.map((b) => (
                                <li key={b}>{b}</li>
                              ))}
                            </ul>
                          ) : (
                            <p style={{ margin: 0, fontSize: "0.8125rem", color: "#166534" }}>
                              Đủ điều kiện duyệt.
                            </p>
                          )}
                          {item.adminReviewNote ? (
                            <p style={{ marginTop: "0.75rem", fontSize: "0.8125rem" }}>
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
