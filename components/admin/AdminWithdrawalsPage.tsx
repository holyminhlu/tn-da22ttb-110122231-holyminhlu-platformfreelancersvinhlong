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
import { BankNameWithLogo } from "@/components/payments/BankBadgeIcon";
import {
  WITHDRAWAL_REJECT_REASONS,
  type WithdrawalRejectReasonCode,
} from "@/lib/payments/withdrawalRejectReasons";
import "./admin.css";

const STATUS_TABS: { id: AdminWithdrawalStatusFilter; label: string }[] = [
  { id: "pending", label: "Đang chờ" },
  { id: "completed", label: "Đã duyệt" },
  { id: "failed", label: "Đã từ chối" },
  { id: "all", label: "Tất cả" },
];

function statusLabel(status: string) {
  const s = String(status).toUpperCase();
  if (s === "PENDING_AUTH" || s === "PROCESSING") return "Đang chờ";
  if (s === "SUCCEEDED") return "Đã duyệt";
  if (s === "FAILED" || s === "CANCELLED") return "Đã từ chối";
  return s;
}

export default function AdminWithdrawalsPage({
  audience = "freelancer",
}: {
  audience?: "freelancer" | "client";
}) {
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
  const [approveNote, setApproveNote] = useState("");
  const [rejectReason, setRejectReason] = useState<WithdrawalRejectReasonCode | "">("");
  const [rejectNote, setRejectNote] = useState("");
  const [toast, setToast] = useState<{ type: "ok" | "err"; message: string } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAdminWithdrawals({ status: statusTab, q: searchQuery, audience });
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
  }, [statusTab, searchQuery, selectedId, audience]);

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
    setApproveNote("");
    setRejectReason("");
    setRejectNote("");
  }, [selectedId, loadDetail]);

  const selected = rows.find((r) => r.id === selectedId) ?? rows[0];
  const isPending =
    String(selected?.status || "").toUpperCase() === "PENDING_AUTH" ||
    String(selected?.status || "").toUpperCase() === "PROCESSING";

  async function handleResolve(resolution: "approve" | "reject") {
    if (!selected) return;

    if (resolution === "reject") {
      if (!rejectReason) {
        setToast({ type: "err", message: "Vui lòng chọn lý do từ chối." });
        return;
      }
      if (rejectReason === "other" && !rejectNote.trim()) {
        setToast({ type: "err", message: "Vui lòng nhập ghi chú khi chọn lý do Khác." });
        return;
      }
      if (
        !window.confirm(
          "Xác nhận từ chối yêu cầu rút tiền? Freelancer sẽ nhận thông báo và được hoàn tiền vào ví.",
        )
      ) {
        return;
      }
    } else if (!window.confirm("Xác nhận duyệt yêu cầu rút tiền sau khi đã chuyển khoản?")) {
      return;
    }

    setResolveBusy(true);
    try {
      const result = await resolveAdminWithdrawal(selected.id, {
        resolution,
        adminNote:
          resolution === "reject"
            ? rejectNote.trim() || undefined
            : approveNote.trim() || undefined,
        rejectReason: resolution === "reject" ? rejectReason : undefined,
      });
      setToast({ type: "ok", message: result.message });
      setApproveNote("");
      setRejectReason("");
      setRejectNote("");
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
        <h1 className="admin-page__title">
          Yêu cầu rút tiền từ {audience === "client" ? "Client" : "Freelancer"}
        </h1>
        <p className="admin-page__lead">
          Theo dõi các lệnh rút tiền đang chờ, thực hiện chuyển khoản thủ công và duyệt khi hoàn tất.
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
                    <div className="admin-withdrawals-card__row">
                      <h3 className="admin-withdrawals-card__title">
                        {row.requester_name || row.requester_email || "Người dùng"}
                      </h3>
                      <span
                        className={`admin-withdrawals-card__status admin-withdrawals-card__status--${String(row.status).toUpperCase()}`}
                      >
                        {statusLabel(row.status)}
                      </span>
                    </div>
                    <strong className="admin-withdrawals-card__amount">{formatVnd(row.amount)}</strong>
                    <p className="admin-withdrawals-card__meta" title={row.reference_id}>
                      <span className="admin-withdrawals-card__ref">{row.reference_id}</span>
                      <span className="admin-withdrawals-card__meta-sep" aria-hidden>
                        ·
                      </span>
                      <span className="admin-withdrawals-card__bank">
                        <BankNameWithLogo
                          bankName={row.bank_name}
                          size={18}
                          suffix={` · ****${row.account_last4 || "----"}`}
                        />
                      </span>
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="admin-refunds-detail admin-withdrawals-detail">
            {selected ? (
              <div className="admin-withdrawal-workspace">
                <section className="admin-withdrawal-summary-card" aria-label="Chi tiết yêu cầu rút tiền">
                  <header className="admin-withdrawal-summary-card__head">
                    <h3 className="admin-withdrawal-summary-card__title">Chi tiết yêu cầu rút tiền</h3>
                    <p className="admin-withdrawal-summary-card__freelancer">
                      <strong>{selected.requester_name || "—"}</strong>
                      {selected.requester_email ? ` · ${selected.requester_email}` : ""}
                    </p>
                  </header>
                  <dl className="admin-withdrawal-summary-card__grid">
                    <div className="admin-withdrawal-summary-card__item">
                      <dt>Mã yêu cầu</dt>
                      <dd className="admin-withdrawal-summary-card__ref" title={selected.reference_id}>
                        {selected.reference_id}
                      </dd>
                    </div>
                    <div className="admin-withdrawal-summary-card__item">
                      <dt>Số tiền</dt>
                      <dd className="admin-withdrawal-summary-card__amount">{formatVnd(selected.amount)}</dd>
                    </div>
                    <div className="admin-withdrawal-summary-card__item">
                      <dt>Trạng thái</dt>
                      <dd>
                        <span
                          className={`admin-withdrawals-card__status admin-withdrawals-card__status--${String(selected.status).toUpperCase()}`}
                        >
                          {statusLabel(selected.status)}
                        </span>
                      </dd>
                    </div>
                    <div className="admin-withdrawal-summary-card__item">
                      <dt>Tạo lúc</dt>
                      <dd>{formatDate(selected.created_at)}</dd>
                    </div>
                    {selected.paid_at ? (
                      <div className="admin-withdrawal-summary-card__item admin-withdrawal-summary-card__item--wide">
                        <dt>Hoàn tất lúc</dt>
                        <dd>{formatDate(selected.paid_at)}</dd>
                      </div>
                    ) : null}
                  </dl>
                </section>

                <section className="admin-withdrawal-transfer-card" aria-label="Chuyển khoản cho freelancer">
                  <header className="admin-withdrawal-transfer-card__head">
                    <h4 className="admin-withdrawal-transfer-card__title">Thực hiện chuyển khoản</h4>
                    <strong className="admin-withdrawal-transfer-card__amount">{formatVnd(selected.amount)}</strong>
                  </header>
                  <div className="admin-withdrawal-transfer-card__grid">
                    <dl className="admin-withdrawal-transfer-card__bank">
                      <div>
                        <dt>Ngân hàng</dt>
                        <dd>
                          <BankNameWithLogo bankName={selected.bank_name} size={24} showName />
                        </dd>
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

                <section className="admin-withdrawal-bank-card" aria-label="Thông tin nhận tiền">
                  <header className="admin-withdrawal-bank-card__head">
                    <h4 className="admin-withdrawal-bank-card__title">Thông tin nhận tiền</h4>
                  </header>
                  <dl className="admin-withdrawal-bank-card__grid">
                    <div className="admin-withdrawal-bank-card__item">
                      <dt>Ngân hàng nhận</dt>
                      <dd>
                        <BankNameWithLogo bankName={selected.bank_name} size={24} showName />
                      </dd>
                    </div>
                    <div className="admin-withdrawal-bank-card__item">
                      <dt>Chủ tài khoản</dt>
                      <dd>{selected.account_holder_name}</dd>
                    </div>
                    <div className="admin-withdrawal-bank-card__item admin-withdrawal-bank-card__item--wide">
                      <dt>Số tài khoản</dt>
                      <dd className="admin-withdrawal-bank-card__account">{selected.to_account_number}</dd>
                    </div>
                  </dl>
                </section>

                {isPending ? (
                  <section className="admin-withdrawal-resolve-card" aria-label="Quyết định của Admin">
                    <header className="admin-withdrawal-resolve-card__head">
                      <h4 className="admin-withdrawal-resolve-card__title">Quyết định của Admin</h4>
                    </header>
                    <div className="admin-withdrawal-resolve-card__body">
                      <p className="admin-withdrawal-resolve-card__hint">
                        Luồng giống nạp tiền: admin là người thao tác chuyển khoản thực tế rồi xác nhận trên hệ
                        thống.
                      </p>
                      <label className="admin-withdrawal-resolve-card__field">
                        <span className="admin-withdrawal-resolve-card__label">
                          Ghi chú khi duyệt (tùy chọn)
                        </span>
                        <textarea
                          className="admin-withdrawal-resolve-card__textarea"
                          rows={2}
                          value={approveNote}
                          onChange={(e) => setApproveNote(e.target.value)}
                          placeholder="Mã giao dịch ngân hàng, ghi chú nội bộ..."
                          disabled={resolveBusy}
                        />
                      </label>
                      <label className="admin-withdrawal-resolve-card__field">
                        <span className="admin-withdrawal-resolve-card__label">Lý do từ chối</span>
                        <select
                          className="admin-withdrawal-resolve-card__select"
                          value={rejectReason}
                          onChange={(e) =>
                            setRejectReason(e.target.value as WithdrawalRejectReasonCode | "")
                          }
                          disabled={resolveBusy}
                        >
                          <option value="">— Chọn khi từ chối —</option>
                          {WITHDRAWAL_REJECT_REASONS.map((reason) => (
                            <option key={reason.code} value={reason.code}>
                              {reason.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      {rejectReason ? (
                        <label className="admin-withdrawal-resolve-card__field">
                          <span className="admin-withdrawal-resolve-card__label">
                            {rejectReason === "other"
                              ? "Ghi chú gửi cho freelancer"
                              : "Ghi chú thêm (tùy chọn)"}
                          </span>
                          <textarea
                            className="admin-withdrawal-resolve-card__textarea"
                            rows={2}
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                            placeholder={
                              rejectReason === "other"
                                ? "Mô tả lý do từ chối để freelancer biết..."
                                : "Bổ sung chi tiết gửi cho freelancer..."
                            }
                            disabled={resolveBusy}
                          />
                        </label>
                      ) : null}
                      <div className="admin-withdrawal-resolve-card__actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn--primary"
                          disabled={resolveBusy}
                          onClick={() => void handleResolve("approve")}
                        >
                          <FaCheckCircle aria-hidden /> Duyệt sau khi đã chuyển khoản
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost"
                          disabled={resolveBusy || !rejectReason}
                          onClick={() => void handleResolve("reject")}
                        >
                          <FaTimesCircle aria-hidden /> Từ chối và hoàn lại ví
                        </button>
                      </div>
                    </div>
                  </section>
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

