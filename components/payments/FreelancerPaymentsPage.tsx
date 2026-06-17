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
  type FreelancerBillingOverview,
  type FreelancerTransaction,
} from "@/lib/api/payments";
import { formatDate, formatVnd } from "@/lib/format";
import { maskAccountNumber } from "@/lib/payments/bankDisplay";
import {
  contractDetailHref,
  filterFreelancerTransactions,
  pendingStageLabel,
  type FreelancerTxFilter,
} from "@/lib/payments/freelancerPaymentsDisplay";
import PaymentsBalanceCard from "@/components/payments/PaymentsBalanceCard";
import PaymentsMoneyInput from "@/components/payments/PaymentsMoneyInput";
import PaymentsSectionTitle from "@/components/payments/PaymentsSectionTitle";
import BankBadgeIcon, { BankNameWithLogo } from "@/components/payments/BankBadgeIcon";
import FreelancerPayoutAccountPanel from "@/components/payments/FreelancerPayoutAccountPanel";
import FreelancerWithdrawModal from "@/components/payments/FreelancerWithdrawModal";
import { FaChartLine, FaHistory } from "react-icons/fa";
import "@/components/hire/hire.css";
import "@/components/dashboard/dashboardPagination.css";
import "./payments.css";
import "./freelancer-payments.css";

import {
  MIN_WITHDRAW_VND,
  WITHDRAW_AMOUNT_PRESETS,
} from "@/lib/payments/withdrawLimits";

const TX_PAGE_SIZE = 8;

const TX_FILTERS: { value: FreelancerTxFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "income", label: "Thu nhập" },
  { value: "withdraw", label: "Rút tiền" },
  { value: "other", label: "Khác" },
];

function withdrawalStatusLabel(status?: FreelancerTransaction["withdrawalStatus"] | string) {
  switch (status) {
    case "PENDING_AUTH":
      return "Chờ xác nhận";
    case "PROCESSING":
      return "Đang xử lý";
    case "SUCCEEDED":
      return "Thành công";
    case "FAILED":
      return "Bị từ chối";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return "—";
  }
}

function withdrawalStatusClass(status?: FreelancerTransaction["withdrawalStatus"] | string) {
  switch (status) {
    case "SUCCEEDED":
      return "fl-payments__tx-status fl-payments__tx-status--ok";
    case "FAILED":
    case "CANCELLED":
      return "fl-payments__tx-status fl-payments__tx-status--fail";
    case "PENDING_AUTH":
    case "PROCESSING":
      return "fl-payments__tx-status fl-payments__tx-status--pending";
    default:
      return "fl-payments__tx-status";
  }
}

function monthKey(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function exportFreelancerCsv(rows: FreelancerTransaction[]) {
  const header = ["Ngày", "Dự án", "Khách hàng", "Loại", "Số tiền", "Mã tham chiếu"];
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
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(String(WITHDRAW_AMOUNT_PRESETS[1]));
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

  const txResetKey = `${txFilter}|${searchInput}|${filterJobId}|${filterClientId}|${filterMonth}`;
  const txPage = usePagedList(filteredTransactions, TX_PAGE_SIZE, txResetKey);

  const withdrawNumeric = Number(withdrawAmount.replace(/\D/g, "") || 0);
  const activeWithdrawPreset = WITHDRAW_AMOUNT_PRESETS.includes(
    withdrawNumeric as (typeof WITHDRAW_AMOUNT_PRESETS)[number],
  )
    ? withdrawNumeric
    : null;

  function openWithdrawFlow() {
    if (!data?.payoutProfile.isConfigured) {
      alert("Bạn chưa liên kết tài khoản ngân hàng. Vui lòng liên kết trước khi rút tiền.");
      return;
    }
    if (withdrawNumeric < MIN_WITHDRAW_VND) {
      alert(`Số tiền rút tối thiểu ${formatVnd(MIN_WITHDRAW_VND)}.`);
      return;
    }
    if (!data.withdrawalPin?.isConfigured) {
      alert("Bạn chưa thiết lập mã PIN rút tiền. Vào Cài đặt tài khoản để tạo PIN.");
      return;
    }
    if (data && withdrawNumeric > data.account.balance) {
      alert(`Số dư khả dụng không đủ (hiện có ${formatVnd(data.account.balance)}).`);
      return;
    }
    setWithdrawOpen(true);
  }

  function handleWithdrawCompleted(account: FreelancerBillingOverview["account"]) {
    setData((prev) => (prev ? { ...prev, account } : prev));
    void load();
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
          <Link href="/payments#payout-account" className="hire-page__post-btn">
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
              <PaymentsSectionTitle icon={<FaChartLine />}>
                Thu nhập &amp; số dư
              </PaymentsSectionTitle>
              <div className="payments-balance-grid fl-payments__balance-grid">
                <PaymentsBalanceCard
                  variant="available"
                  featured
                  label="Số dư khả dụng"
                  amount={formatVnd(data.account.balance)}
                  hint="Có thể rút về tài khoản ngân hàng"
                />
                <PaymentsBalanceCard
                  variant="pending"
                  label="Chờ giải ngân"
                  amount={formatVnd(data.account.pendingBalance)}
                  hint="Escrow đã nạp, chưa chuyển vào ví của bạn"
                />
                <PaymentsBalanceCard
                  variant="earned"
                  label="Tổng đã nhận"
                  amount={formatVnd(data.account.totalEarned)}
                  hint="Tích lũy từ các hợp đồng đã giải ngân"
                />
              </div>

              <div className="payments-deposit-card fl-payments__withdraw-card">
                <div className="payments-deposit-card__head">
                  <h3 className="payments-deposit-card__title">Rút tiền về tài khoản ngân hàng</h3>
                  <p className="payments-deposit-card__hint">
                    Chi hộ Napas 24/7 — xác nhận bằng PIN 6 số, tối thiểu {formatVnd(MIN_WITHDRAW_VND)}.
                  </p>
                </div>

                <div className="payments-deposit__controls">
                  <label className="payments-deposit__label sr-only" htmlFor="withdraw-amount">
                    Số tiền rút
                  </label>
                  <PaymentsMoneyInput
                    id="withdraw-amount"
                    className="payments-money-input--deposit"
                    value={withdrawAmount}
                    onChange={setWithdrawAmount}
                    disabled={data.account.balance < MIN_WITHDRAW_VND}
                    aria-label="Số tiền rút về ngân hàng"
                  />
                  <div className="payments-deposit__presets">
                    {WITHDRAW_AMOUNT_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={
                          activeWithdrawPreset === preset
                            ? "payments-chip payments-chip--active"
                            : "payments-chip"
                        }
                        aria-pressed={activeWithdrawPreset === preset}
                        disabled={preset > data.account.balance}
                        onClick={() => setWithdrawAmount(String(preset))}
                      >
                        {formatVnd(preset)}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="payments-btn payments-btn--primary payments-deposit__submit"
                    disabled={data.account.balance < MIN_WITHDRAW_VND}
                    onClick={openWithdrawFlow}
                  >
                    Rút tiền
                  </button>
                </div>

                {data.payoutProfile.isConfigured ? (
                  <div className="fl-payments__withdraw-bank">
                    <BankBadgeIcon bankName={data.payoutProfile.bankName} size={36} />
                    <div>
                      <p className="fl-payments__withdraw-bank-name">{data.payoutProfile.bankName}</p>
                      <p className="fl-payments__withdraw-bank-meta">
                        {data.payoutProfile.accountHolderName}
                        {" · "}
                        {maskAccountNumber("", data.payoutProfile.accountLast4)}
                      </p>
                    </div>
                    <Link href="/payments#payout-account" className="fl-payments__withdraw-bank-link">
                      Đổi TK
                    </Link>
                  </div>
                ) : (
                  <p className="fl-payments__withdraw-unlinked">
                    Chưa liên kết tài khoản nhận tiền.{" "}
                    <Link href="/payments#payout-account">Liên kết ngay</Link>
                  </p>
                )}

                {!data.withdrawalPin?.isConfigured ? (
                  <p className="fl-payments__withdraw-pin-hint">
                    Chưa có PIN rút tiền.{" "}
                    <Link href="/edit-account/cai-dat">Thiết lập tại Cài đặt</Link>
                    {data.withdrawalPin?.requiresAppPasswordSetup
                      ? " (tài khoản Google cần đặt mật khẩu ứng dụng khi tạo PIN)."
                      : "."}
                  </p>
                ) : null}

                <p className="payments-muted fl-payments__note">
                  Tiền chuyển vào tài khoản đã liên kết sau khi giao dịch được xác nhận thành công.
                </p>
              </div>

              <p className="payments-muted fl-payments__fee-note">{data.platformFeeNote}</p>
            </section>

            <FreelancerWithdrawModal
              open={withdrawOpen}
              balance={data.account.balance}
              initialAmount={withdrawAmount}
              payoutProfile={data.payoutProfile}
              withdrawalPin={data.withdrawalPin}
              onClose={() => setWithdrawOpen(false)}
              onCompleted={handleWithdrawCompleted}
            />

            <section className="payments-panel" id="payout-account">
              <div className="payments-panel__head">
                <h2 className="payments-panel__title">Tài khoản nhận tiền</h2>
              </div>
              <FreelancerPayoutAccountPanel profile={data.payoutProfile} onUpdated={load} />
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

            {(data.activeWithdrawals?.length ?? 0) > 0 ? (
              <section className="payments-panel" id="withdrawals">
                <h2 className="payments-panel__title">Yêu cầu rút tiền</h2>
                <ul className="fl-payments__withdraw-list">
                  {data.activeWithdrawals.map((item) => (
                    <li key={item.id} className="fl-payments__withdraw-item">
                      <div className="fl-payments__withdraw-item-main">
                        <p className="fl-payments__withdraw-item-amount">{formatVnd(item.amount)}</p>
                        <p className="fl-payments__withdraw-item-meta">
                          <BankNameWithLogo
                            bankName={item.bankName}
                            size={20}
                            suffix={`${item.accountLast4 ? ` · ****${item.accountLast4}` : ""} · ${formatDate(item.createdAt)}`}
                          />
                        </p>
                        <p className="fl-payments__withdraw-item-ref">{item.referenceId}</p>
                      </div>
                      <span className={withdrawalStatusClass(item.status)}>
                        {withdrawalStatusLabel(item.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="payments-panel">
              <div className="payments-panel__head payments-tx-panel__head">
                <PaymentsSectionTitle icon={<FaHistory />}>
                  Lịch sử giao dịch
                </PaymentsSectionTitle>
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
                          <th>Ngân hàng</th>
                          <th>Trạng thái</th>
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
                            <td>
                              {item.category === "withdraw" && item.withdrawalBankName ? (
                                <BankNameWithLogo
                                  bankName={item.withdrawalBankName}
                                  size={20}
                                  showName
                                />
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>
                              {item.category === "withdraw" ? (
                                <div className="fl-payments__tx-status-wrap">
                                  <span className={withdrawalStatusClass(item.withdrawalStatus)}>
                                    {withdrawalStatusLabel(item.withdrawalStatus)}
                                  </span>
                                  {item.withdrawalFailureReason ? (
                                    <span
                                      className="fl-payments__tx-fail-reason"
                                      title={item.withdrawalFailureReason}
                                    >
                                      {item.withdrawalFailureReason}
                                    </span>
                                  ) : null}
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className={item.amount < 0 ? "payments-neg" : "payments-pos"}>
                              {item.amount >= 0 ? "+" : ""}
                              {formatVnd(item.amount)}
                            </td>
                            <td>{item.withdrawalReferenceId || item.reference || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <DashboardPagination
                    className="payments-pagination"
                    alwaysShow
                    pageSize={TX_PAGE_SIZE}
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
