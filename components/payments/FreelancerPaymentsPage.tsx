"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import FreelancerShell from "@/components/layout/FreelancerShell";
import DashboardPagination from "@/components/dashboard/DashboardPagination";
import { usePagedList } from "@/hooks/usePagedList";
import { useStoredUser } from "@/hooks/useStoredUser";
import {
  freelancerTransactionCategoryLabel,
  getFreelancerBillingOverview,
  withdrawFreelancerFunds,
  type FreelancerBillingOverview,
  type FreelancerTransaction,
} from "@/lib/api/payments";
import { formatDate, formatVnd } from "@/lib/format";
import {
  contractDetailHref,
  filterFreelancerTransactions,
  pendingStageLabel,
  type FreelancerTxFilter,
} from "@/lib/payments/freelancerPaymentsDisplay";
import "@/components/hire/hire.css";
import "@/components/dashboard/dashboardPagination.css";
import "./payments.css";
import "./freelancer-payments.css";

const TX_PAGE_SIZE = 8;
const WITHDRAW_PRESETS = [500_000, 1_000_000, 2_000_000, 5_000_000];

const TX_FILTERS: { value: FreelancerTxFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "income", label: "Thu nhập" },
  { value: "withdraw", label: "Rút tiền" },
  { value: "other", label: "Khác" },
];

function monthKey(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function exportFreelancerCsv(rows: FreelancerTransaction[]) {
  const header = ["Ngày", "Dự án", "Client", "Loại", "Số tiền", "Mã tham chiếu"];
  const lines = rows.map((r) =>
    [
      formatDate(r.occurredAt),
      r.projectTitle,
      r.clientName,
      freelancerTransactionCategoryLabel(r.category),
      String(r.amount),
      r.reference || "",
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([`\uFEFF${[header.join(","), ...lines].join("\n")}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `thu-nhap-freelancer-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FreelancerPaymentsPage() {
  const { user, ready, isFreelancer } = useStoredUser({ refreshFromApi: false });
  const isGuest = ready && !user;

  const [data, setData] = useState<FreelancerBillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(String(WITHDRAW_PRESETS[0]));
  const [withdrawMessage, setWithdrawMessage] = useState("");
  const [txFilter, setTxFilter] = useState<FreelancerTxFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [filterJobId, setFilterJobId] = useState("");
  const [filterClientId, setFilterClientId] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  const load = useCallback(async () => {
    if (!user || !isFreelancer) {
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const overview = await getFreelancerBillingOverview();
      setData(overview);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải dữ liệu thanh toán.";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user, isFreelancer]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredTransactions = useMemo(() => {
    if (!data) return [];
    return filterFreelancerTransactions(
      data.transactions,
      txFilter,
      searchInput,
      filterJobId,
      filterClientId,
      filterMonth,
    );
  }, [data, txFilter, searchInput, filterJobId, filterClientId, filterMonth]);

  const txPage = usePagedList(filteredTransactions, TX_PAGE_SIZE);

  async function handleWithdraw() {
    const amount = Number(withdrawAmount.replace(/\D/g, ""));
    if (!Number.isFinite(amount) || amount < 100000) {
      alert("Số tiền rút tối thiểu 100.000 VND.");
      return;
    }
    if (!data?.payoutProfile.isConfigured) {
      const ok = window.confirm(
        "Bạn chưa thiết lập tài khoản nhận tiền. Vẫn tiếp tục ghi nhận yêu cầu rút (demo)?",
      );
      if (!ok) return;
    }
    setWithdrawBusy(true);
    setWithdrawMessage("");
    try {
      const result = await withdrawFreelancerFunds(amount);
      setData((prev) =>
        prev ? { ...prev, account: result.account } : prev,
      );
      setWithdrawMessage(result.message);
      await load();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể rút tiền.";
      alert(message);
    } finally {
      setWithdrawBusy(false);
    }
  }

  return (
    <FreelancerShell>
      <div className="payments-page payments-page--full-width fl-payments">
        <header className="hire-page__head payments-page__head">
          <div>
            <h1 className="hire-page__title">Thanh toán</h1>
            <p className="hire-page__lead">
              Theo dõi thu nhập từ hợp đồng, số dư khả dụng, tiền đang chờ giải ngân và lịch sử
              rút tiền.
            </p>
          </div>
          <Link href="/edit-account" className="hire-page__post-btn">
            Tài khoản nhận tiền
          </Link>
        </header>

        {isGuest ? (
          <div className="fl-payments__guest">
            <p>Đăng nhập freelancer để xem thu nhập và rút tiền.</p>
            <Link href="/dang-nhap" className="hire-page__post-btn">
              Đăng nhập
            </Link>
          </div>
        ) : ready && user && !isFreelancer ? (
          <p className="hire-page__state hire-page__state--error" role="alert">
            Trang này dành cho tài khoản freelancer.
          </p>
        ) : loading ? (
          <div className="payments-page__loading" aria-busy="true">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="payments-page__skeleton" />
            ))}
          </div>
        ) : error ? (
          <p className="hire-page__state hire-page__state--error" role="alert">
            {error}
          </p>
        ) : data ? (
          <>
            <section className="payments-panel">
              <h2 className="payments-panel__title">Thu nhập &amp; số dư</h2>
              <div className="payments-balance-grid fl-payments__balance-grid">
                <article className="payments-balance-card payments-balance-card--primary">
                  <p className="payments-balance-card__label">Số dư khả dụng</p>
                  <p className="payments-balance-card__amount">
                    {formatVnd(data.account.balance)}
                  </p>
                  <p className="payments-balance-card__hint">Có thể rút về tài khoản ngân hàng</p>
                </article>
                <article className="payments-balance-card fl-payments__balance-card--pending">
                  <p className="payments-balance-card__label">Chờ giải ngân</p>
                  <p className="payments-balance-card__amount">
                    {formatVnd(data.account.pendingBalance)}
                  </p>
                  <p className="payments-balance-card__hint">
                    Escrow đã nạp, chưa chuyển vào ví của bạn
                  </p>
                </article>
                <article className="payments-balance-card">
                  <p className="payments-balance-card__label">Tổng đã nhận</p>
                  <p className="payments-balance-card__amount">
                    {formatVnd(data.account.totalEarned)}
                  </p>
                  <p className="payments-balance-card__hint">Tích lũy từ các hợp đồng đã giải ngân</p>
                </article>
              </div>

              <div className="payments-deposit fl-payments__withdraw">
                <label className="payments-deposit__label" htmlFor="withdraw-amount">
                  Rút tiền về tài khoản (VND)
                </label>
                <div className="payments-deposit__row">
                  <input
                    id="withdraw-amount"
                    type="text"
                    inputMode="numeric"
                    className="payments-deposit__input"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value.replace(/[^\d]/g, ""))}
                  />
                  <button
                    type="button"
                    className="payments-btn payments-btn--primary"
                    disabled={withdrawBusy || data.account.balance < 100000}
                    onClick={() => void handleWithdraw()}
                  >
                    {withdrawBusy ? "Đang xử lý..." : "Rút tiền"}
                  </button>
                </div>
                <div className="payments-deposit__presets">
                  {WITHDRAW_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className="payments-chip"
                      onClick={() => setWithdrawAmount(String(preset))}
                    >
                      {formatVnd(preset)}
                    </button>
                  ))}
                </div>
                {withdrawMessage ? (
                  <p className="payments-form-message" role="status">
                    {withdrawMessage}
                  </p>
                ) : null}
                <p className="payments-muted fl-payments__note">{data.platformFeeNote}</p>
              </div>
            </section>

            <section className="payments-panel">
              <div className="payments-panel__head">
                <h2 className="payments-panel__title">Tài khoản nhận tiền</h2>
                <Link href="/edit-account" className="payments-link-btn">
                  Cập nhật
                </Link>
              </div>
              {data.payoutProfile.isConfigured ? (
                <p className="payments-muted">
                  {data.payoutProfile.bankName} • **** {data.payoutProfile.accountLast4}
                </p>
              ) : (
                <p className="payments-muted">
                  Chưa liên kết tài khoản ngân hàng. Cập nhật tại{" "}
                  <Link href="/edit-account">Chỉnh sửa tài khoản</Link> để nhận tiền rút.
                  {data.payoutProfile.contactEmail
                    ? ` Liên hệ: ${data.payoutProfile.contactEmail}.`
                    : ""}
                </p>
              )}
            </section>

            {data.pendingItems.length > 0 ? (
              <section className="payments-panel">
                <h2 className="payments-panel__title">Đang chờ giải ngân</h2>
                <ul className="fl-payments__pending-list">
                  {data.pendingItems.map((item) => (
                    <li key={item.contractId}>
                      <Link
                        href={contractDetailHref(item.contractId)}
                        className="fl-payments__pending-card"
                      >
                        <div>
                          <p className="fl-payments__pending-title">{item.projectTitle}</p>
                          <p className="fl-payments__pending-meta">
                            Client: {item.clientName}
                            {item.fundedAt ? ` · Escrow ${formatDate(item.fundedAt)}` : ""}
                          </p>
                        </div>
                        <div className="fl-payments__pending-aside">
                          <span className="fl-payments__pending-amount">
                            {formatVnd(item.amount)}
                          </span>
                          <span className="fl-payments__pending-badge">
                            {pendingStageLabel(item.workflowStage)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="payments-panel">
              <div className="payments-panel__head">
                <h2 className="payments-panel__title">Lịch sử giao dịch</h2>
                <button
                  type="button"
                  className="payments-btn payments-btn--secondary"
                  disabled={filteredTransactions.length === 0}
                  onClick={() => exportFreelancerCsv(filteredTransactions)}
                >
                  Xuất CSV
                </button>
              </div>

              <div className="fl-payments__tx-filters">
                <div className="fl-payments__tx-tabs" role="tablist" aria-label="Lọc loại giao dịch">
                  {TX_FILTERS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      role="tab"
                      aria-selected={txFilter === item.value}
                      className={`fl-payments__tx-tab${txFilter === item.value ? " fl-payments__tx-tab--active" : ""}`}
                      onClick={() => setTxFilter(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <input
                  type="search"
                  className="fl-payments__search"
                  placeholder="Tìm dự án, client..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  aria-label="Tìm giao dịch"
                />
              </div>

              <div className="payments-filters">
                <select
                  aria-label="Lọc theo dự án"
                  value={filterJobId}
                  onChange={(e) => setFilterJobId(e.target.value)}
                >
                  <option value="">Tất cả dự án</option>
                  {data.filterOptions.jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Lọc theo client"
                  value={filterClientId}
                  onChange={(e) => setFilterClientId(e.target.value)}
                >
                  <option value="">Tất cả client</option>
                  {data.filterOptions.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  type="month"
                  aria-label="Lọc theo tháng"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                />
              </div>

              {filteredTransactions.length === 0 ? (
                <p className="payments-muted">
                  Chưa có giao dịch. Thu nhập sẽ hiển thị khi client giải ngân Escrow sau nghiệm thu.
                </p>
              ) : (
                <>
                  <div className="payments-table-wrap">
                    <table className="payments-table">
                      <thead>
                        <tr>
                          <th>Ngày</th>
                          <th>Dự án</th>
                          <th>Client</th>
                          <th>Loại</th>
                          <th>Số tiền</th>
                          <th>Tham chiếu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {txPage.items.map((item) => (
                          <tr key={item.id}>
                            <td>{formatDate(item.occurredAt)}</td>
                            <td className="payments-table__project">
                              {item.contractId ? (
                                <Link href={contractDetailHref(item.contractId)}>
                                  {item.projectTitle}
                                </Link>
                              ) : (
                                item.projectTitle
                              )}
                            </td>
                            <td>{item.clientName}</td>
                            <td>{freelancerTransactionCategoryLabel(item.category)}</td>
                            <td className={item.amount < 0 ? "payments-neg" : "payments-pos"}>
                              {item.amount >= 0 ? "+" : ""}
                              {formatVnd(item.amount)}
                            </td>
                            <td>{item.reference || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <DashboardPagination
                    page={txPage.page}
                    totalPages={txPage.totalPages}
                    total={txPage.total}
                    onPageChange={txPage.setPage}
                  />
                </>
              )}
            </section>

            <p className="payments-muted fl-payments__footer-note">
              Đơn đặt gói dịch vụ (gig) cũng giải ngân qua Escrow — xem chi tiết tại{" "}
              <Link href="/dich-vu/don-hang">Đơn hàng dịch vụ</Link>.
            </p>
          </>
        ) : null}
      </div>
    </FreelancerShell>
  );
}
