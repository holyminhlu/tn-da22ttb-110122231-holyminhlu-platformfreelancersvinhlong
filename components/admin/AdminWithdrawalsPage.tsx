"use client";

import { useCallback, useEffect, useState } from "react";
import { FaCheckCircle, FaQrcode, FaRedo, FaSearch, FaTimesCircle } from "react-icons/fa";
import {
  getAdminWithdrawalDetail,
  listAdminWithdrawals,
  resolveAdminWithdrawal,
  type AdminWithdrawalRow,
  type AdminWithdrawalStatusFilter,
} from "@/lib/api/admin";
import { formatDate, formatVnd } from "@/lib/format";
import "./admin.css";

const STATUS_TABS: { id: AdminWithdrawalStatusFilter; label: string }[] = [
  { id: "pending", label: "Đang chờ" },
  { id: "completed", label: "Đã duyệt" },
  { id: "failed", label: "Đã từ chối" },
  { id: "all", label: "Tất cả" },
];

function statusLabel(status: string) {
  const s = String(status).toUpperCase();
  if (s === "PENDING_AUTH" || s === "PROCESSING") return "Pending";
  if (s === "SUCCEEDED") return "Completed";
  if (s === "FAILED" || s === "CANCELLED") return "Rejected";
  return s;
}

export default function AdminWithdrawalsPage() {
  const [statusTab, setStatusTab] = useState<AdminWithdrawalStatusFilter>("pending");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [rows, setRows] = useState<AdminWithdrawalRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ request: AdminWithdrawalRow } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [resolveBusy, setResolveBusy] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [toast, setToast] = useState<{ type: "ok" | "err"; message: string } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAdminWithdrawals({ status: statusTab, q: searchQuery });
      const nextRows = data.requests ?? [];
      setRows(nextRows);
      setTotal(data.total ?? 0);
      if (!nextRows.length) {
        setSelectedId(null);
        setDetail(null);
      } else if (!selectedId || !nextRows.some((row) => row.id === selectedId)) {
        setSelectedId(nextRows[0].id);
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải yêu cầu rút tiền.";
      setToast({ type: "err", message });
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [statusTab, searchQuery, selectedId]);

  const loadDetail = useCallback(async (withdrawalId: string) => {
    setDetailLoading(true);
    try {
      const data = await getAdminWithdrawalDetail(withdrawalId);
      setDetail(data);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải chi tiết yêu cầu.";
      setToast({ type: "err", message });
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const selected = rows.find((r) => r.id === selectedId) ?? rows[0];
  const isPending =
    String(selected?.status || "").toUpperCase() === "PENDING_AUTH" ||
    String(selected?.status || "").toUpperCase() === "PROCESSING";

  async function handleResolve(resolution: "approve" | "reject") {
    if (!selected) return;
    const label = resolution === "approve" ? "Approve" : "Reject";
    if (!window.confirm(`Xác nhận ${label} yêu cầu rút tiền này?`)) return;
    setResolveBusy(true);
    try {
      const result = await resolveAdminWithdrawal(selected.id, {
        resolution,
        adminNote: adminNote.trim() || undefined,
      });
      setToast({ type: "ok", message: result.message });
      setAdminNote("");
      await load();
      await loadDetail(selected.id);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể xử lý yêu cầu.";
      setToast({ type: "err", message });
    } finally {
      setResolveBusy(false);
    }
  }

  return (
    <div className="admin-page admin-refunds-page admin-withdrawals-page">
      <header className="admin-page__head admin-refunds-page__head admin-withdrawals-page__head">
        <h1 className="admin-page__title">Yêu cầu rút tiền từ Freelancer</h1>
        <p className="admin-page__lead">
          Theo dõi các lệnh rút tiền pending, thực hiện chuyển khoản tay và bấm Approve khi hoàn tất.
        </p>
      </header>

      {toast ? (
        <p className={`admin-toast admin-toast--${toast.type === "ok" ? "ok" : "err"}`} role="status">
          {toast.message}
        </p>
      ) : null}

      <div className="admin-refunds-toolbar admin-withdrawals-toolbar" aria-label="Bộ lọc rút tiền">
        <button type="button" className="admin-btn admin-btn--ghost admin-refunds-toolbar__refresh" onClick={() => void load()}>
          <FaRedo aria-hidden /> Làm mới
        </button>
        <div className="admin-tabs admin-tabs--inline">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`admin-tab${statusTab === tab.id ? " admin-tab--active" : ""}`}
              onClick={() => setStatusTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <label className="admin-refunds-toolbar__field admin-refunds-toolbar__field--search">
          <span className="admin-filters__label">Tìm kiếm</span>
          <div className="admin-filters__search-wrap">
            <FaSearch className="admin-filters__search-icon" aria-hidden />
            <input
              type="search"
              className="admin-filters__input"
              placeholder="Mã, freelancer, email, ngân hàng..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </label>
        <p className="admin-refunds-toolbar__count">{loading ? "Đang tải..." : `${total} yêu cầu`}</p>
      </div>

      {loading ? (
        <p className="admin-page__state">Đang tải danh sách yêu cầu rút tiền...</p>
      ) : (
        <div className="admin-refunds-split admin-withdrawals-split">
          <aside className="admin-refunds-list admin-withdrawals-list" aria-label="Danh sách yêu cầu rút tiền">
            <ul className="resolution-list resolution-list--compact admin-refunds-list__inner admin-withdrawals-list__inner">
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className={`resolution-card resolution-card--selectable admin-withdrawals-card${row.id === selected?.id ? " resolution-card--active" : ""}`}
                    onClick={() => setSelectedId(row.id)}
                  >
                    <div className="admin-withdrawals-card__top">
                      <h3 className="resolution-card__title admin-withdrawals-card__title">
                        {row.freelancer_name || row.freelancer_email || "Freelancer"}
                      </h3>
                      <strong className="admin-withdrawals-card__amount">{formatVnd(row.amount)}</strong>
                    </div>
                    <p className="resolution-card__meta admin-withdrawals-card__meta admin-withdrawals-card__meta--ref">
                      {row.reference_id}
                    </p>
                    <p className="resolution-card__meta admin-withdrawals-card__meta">
                      {row.bank_name} · ****{row.account_last4 || "----"}
                    </p>
                    <span
                      className={`resolution-card__status admin-withdrawals-card__status admin-withdrawals-card__status--${String(row.status).toUpperCase()}`}
                    >
                      {statusLabel(row.status)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="admin-refunds-detail admin-withdrawals-detail">
            {selected ? (
              <div className="admin-withdrawal-workspace">
                <div className="resolution-card resolution-card--flat admin-withdrawal-summary-card">
                  <h3 className="resolution-card__title">Chi tiết yêu cầu rút tiền</h3>
                  <p className="resolution-card__meta">
                    Freelancer: <strong>{selected.freelancer_name || "—"}</strong> ({selected.freelancer_email || "—"})
                  </p>
                  <dl className="resolution-card__details admin-refund-case__details admin-withdrawal-summary-card__details">
                    <div>
                      <dt>Mã yêu cầu</dt>
                      <dd>{selected.reference_id}</dd>
                    </div>
                    <div>
                      <dt>Số tiền</dt>
                      <dd>{formatVnd(selected.amount)}</dd>
                    </div>
                    <div>
                      <dt>Trạng thái</dt>
                      <dd>{statusLabel(selected.status)}</dd>
                    </div>
                    <div>
                      <dt>Tạo lúc</dt>
                      <dd>{formatDate(selected.created_at)}</dd>
                    </div>
                    {selected.paid_at ? (
                      <div>
                        <dt>Hoàn tất lúc</dt>
                        <dd>{formatDate(selected.paid_at)}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>

                <section className="admin-withdrawal-transfer-card" aria-label="Chuyển khoản cho freelancer">
                  <header className="admin-withdrawal-transfer-card__head">
                    <h4 className="admin-withdrawal-transfer-card__title">Thực hiện chuyển khoản</h4>
                    <strong className="admin-withdrawal-transfer-card__amount">{formatVnd(selected.amount)}</strong>
                  </header>
                  <div className="admin-withdrawal-transfer-card__grid">
                    <dl className="admin-withdrawal-transfer-card__bank">
                      <div>
                        <dt>Ngân hàng</dt>
                        <dd>{selected.bank_name}</dd>
                      </div>
                      <div>
                        <dt>Chủ tài khoản</dt>
                        <dd>{selected.account_holder_name}</dd>
                      </div>
                      <div>
                        <dt>Số tài khoản</dt>
                        <dd>{selected.to_account_number}</dd>
                      </div>
                      <div>
                        <dt>Nội dung chuyển khoản</dt>
                        <dd>WD {selected.reference_id}</dd>
                      </div>
                    </dl>
                    {selected.qr_url ? (
                      <div className="admin-withdrawal-transfer-card__qr">
                        <p className="admin-withdrawal-transfer-card__qr-label">
                          <FaQrcode aria-hidden /> QR để admin quét và chuyển tiền
                        </p>
                        <img src={selected.qr_url} alt="QR chuyển khoản" />
                      </div>
                    ) : null}
                  </div>
                </section>

                <div className="resolution-card resolution-card--flat">
                  <h4 className="resolution-card__title">Thông tin nhận tiền</h4>
                  <dl className="resolution-card__details admin-refund-case__details admin-withdrawal-bank-card__details">
                    <div>
                      <dt>Ngân hàng nhận</dt>
                      <dd>{selected.bank_name}</dd>
                    </div>
                    <div>
                      <dt>Chủ tài khoản</dt>
                      <dd>{selected.account_holder_name}</dd>
                    </div>
                    <div>
                      <dt>Số tài khoản</dt>
                      <dd>{selected.to_account_number}</dd>
                    </div>
                  </dl>
                </div>

                {isPending ? (
                  <div className="admin-resolve-panel">
                    <h4 className="admin-resolve-panel__title">Quyết định của Admin</h4>
                    <p className="admin-resolve-panel__hint">
                      Luồng giống nạp tiền: admin là người thao tác chuyển khoản thực tế rồi xác nhận trên hệ thống.
                    </p>
                    <label className="admin-field">
                      <span className="admin-field__label">Ghi chú (tùy chọn)</span>
                      <textarea
                        className="admin-textarea"
                        rows={3}
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        placeholder="Mã giao dịch ngân hàng, lý do reject..."
                        disabled={resolveBusy}
                      />
                    </label>
                    <div className="admin-resolve-panel__actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn--primary"
                        disabled={resolveBusy}
                        onClick={() => void handleResolve("approve")}
                      >
                        <FaCheckCircle aria-hidden /> Approve sau khi đã chuyển khoản
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--ghost"
                        disabled={resolveBusy}
                        onClick={() => void handleResolve("reject")}
                      >
                        <FaTimesCircle aria-hidden /> Reject và hoàn lại ví
                      </button>
                    </div>
                  </div>
                ) : null}

                {detailLoading ? <p className="admin-page__state">Đang tải chi tiết...</p> : null}
                {detail?.request?.id === selected?.id &&
                (String(selected?.status || "").toUpperCase() === "FAILED" ||
                  String(selected?.status || "").toUpperCase() === "CANCELLED") &&
                detail?.request?.failure_reason ? (
                  <p className="admin-toast admin-toast--err" role="alert">
                    {detail.request.failure_reason}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

