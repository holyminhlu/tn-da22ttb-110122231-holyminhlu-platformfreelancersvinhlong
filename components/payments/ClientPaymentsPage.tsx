"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import ClientShell from "@/components/layout/ClientShell";
import DashboardPagination from "@/components/dashboard/DashboardPagination";
import { usePagedList } from "@/hooks/usePagedList";
import {
  billingMethodTypeLabel,
  depositFunds,
  getClientBillingOverview,
  transactionCategoryLabel,
  updateBillingProfile,
  type BillingOverview,
  type BillingProfile,
  type BillingTransaction,
} from "@/lib/api/payments";
import { formatDate, formatVnd } from "@/lib/format";
import "@/components/hire/hire.css";
import "@/components/dashboard/dashboardPagination.css";
import "./payments.css";

const TX_PAGE_SIZE = 8;
const DEPOSIT_PRESETS = [500_000, 1_000_000, 2_000_000, 5_000_000];

function monthKey(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function exportCsv(rows: BillingTransaction[]) {
  const header = ["Ngày", "Dự án", "Freelancer", "Loại", "Số tiền", "Mã hóa đơn"];
  const lines = rows.map((r) =>
    [
      formatDate(r.occurredAt),
      r.projectTitle,
      r.freelancerName,
      transactionCategoryLabel(r.category),
      String(r.amount),
      r.invoiceNumber || "",
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
  a.download = `saoke-thanh-toan-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ClientPaymentsPage() {
  const [data, setData] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [depositBusy, setDepositBusy] = useState(false);
  const [depositAmount, setDepositAmount] = useState(String(DEPOSIT_PRESETS[1]));
  const [profileForm, setProfileForm] = useState<BillingProfile>({
    companyName: "",
    companyAddress: "",
    taxId: "",
    billingEmail: "",
    contactName: "",
  });
  const [profileMessage, setProfileMessage] = useState("");
  const [filterJobId, setFilterJobId] = useState("");
  const [filterFreelancerId, setFilterFreelancerId] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const overview = await getClientBillingOverview();
      setData(overview);
      setProfileForm(overview.billingProfile);
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
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredTransactions = useMemo(() => {
    const list = data?.transactions ?? [];
    return list.filter((t) => {
      if (filterJobId && t.jobId !== filterJobId) return false;
      if (filterFreelancerId && t.freelancerId !== filterFreelancerId) return false;
      if (filterMonth && monthKey(t.occurredAt) !== filterMonth) return false;
      return true;
    });
  }, [data?.transactions, filterJobId, filterFreelancerId, filterMonth]);

  const txPage = usePagedList(filteredTransactions, TX_PAGE_SIZE);

  const defaultMethod = data?.defaultMethod;
  const autoBillingOn = Boolean(defaultMethod?.isAutoBillingEnabled);

  async function handleDeposit() {
    const amount = Number(depositAmount.replace(/\D/g, ""));
    if (!Number.isFinite(amount) || amount < 10000) {
      alert("Số tiền nạp tối thiểu 10.000 VND.");
      return;
    }
    setDepositBusy(true);
    try {
      const result = await depositFunds(amount);
      setData((prev) =>
        prev ? { ...prev, account: result.account } : prev,
      );
      await load();
      alert(result.message);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể nạp tiền.";
      alert(message);
    } finally {
      setDepositBusy(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage("");
    try {
      const result = await updateBillingProfile(profileForm);
      setProfileMessage(result.message);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể lưu thông tin.";
      setProfileMessage(message);
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <ClientShell>
      <div className="payments-page payments-page--full-width">
        <header className="hire-page__head payments-page__head">
          <div>
            <h1 className="hire-page__title">Thanh toán</h1>
            <p className="hire-page__lead">
              Quản lý số dư ví, ký quỹ Escrow, phương thức thanh toán và lịch sử giao dịch từ hệ thống.
            </p>
          </div>
          <Link href="/payments/phuong-thuc" className="hire-page__post-btn">
            Quản lý phương thức
          </Link>
        </header>

        {loading ? (
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
              <h2 className="payments-panel__title">Số dư &amp; ký quỹ</h2>
              <div className="payments-balance-grid">
                <article className="payments-balance-card payments-balance-card--primary">
                  <p className="payments-balance-card__label">Số dư khả dụng</p>
                  <p className="payments-balance-card__amount">{formatVnd(data.account.balance)}</p>
                  <p className="payments-balance-card__hint">Dùng để nạp ký quỹ cho hợp đồng</p>
                </article>
                <article className="payments-balance-card">
                  <p className="payments-balance-card__label">Tiền đang ký quỹ</p>
                  <p className="payments-balance-card__amount">{formatVnd(data.account.escrowBalance)}</p>
                  <p className="payments-balance-card__hint">Hợp đồng đã nạp Escrow, chưa giải ngân</p>
                </article>
              </div>

              <div className="payments-deposit">
                <label className="payments-deposit__label" htmlFor="deposit-amount">
                  Nạp tiền vào ví (VND)
                </label>
                <div className="payments-deposit__row">
                  <input
                    id="deposit-amount"
                    type="text"
                    inputMode="numeric"
                    className="payments-deposit__input"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value.replace(/[^\d]/g, ""))}
                  />
                  <button
                    type="button"
                    className="payments-btn payments-btn--primary"
                    disabled={depositBusy}
                    onClick={() => void handleDeposit()}
                  >
                    {depositBusy ? "Đang xử lý..." : "Nạp tiền"}
                  </button>
                </div>
                <div className="payments-deposit__presets">
                  {DEPOSIT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className="payments-chip"
                      onClick={() => setDepositAmount(String(preset))}
                    >
                      {formatVnd(preset)}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="payments-panel">
              <div className="payments-panel__head">
                <h2 className="payments-panel__title">Phương thức thanh toán</h2>
                <Link href="/payments/phuong-thuc" className="payments-link-btn">
                  + Thêm / chỉnh sửa
                </Link>
              </div>

              {data.billingMethods.length === 0 ? (
                <p className="payments-muted">
                  Chưa có phương thức thanh toán. Thêm thẻ khi{" "}
                  <Link href="/xac-minh-danh-tinh">xác minh danh tính</Link> hoặc tại trang phương thức.
                </p>
              ) : (
                <ul className="payments-method-list">
                  {data.billingMethods.map((method) => (
                    <li key={method.id} className="payments-method-item">
                      <div>
                        <p className="payments-method-item__title">{method.label}</p>
                        <p className="payments-method-item__detail">
                          {billingMethodTypeLabel(method.type)} • {method.detail}
                        </p>
                      </div>
                      <div className="payments-method-item__aside">
                        {method.isPrimary ? (
                          <span className="payments-badge">Mặc định</span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {defaultMethod?.autoTopupThreshold != null && defaultMethod.autoTopupAmount != null ? (
                <div className="payments-auto">
                  <h3 className="payments-auto__title">Tự động nạp tiền</h3>
                  <p className="payments-muted">
                    {autoBillingOn
                      ? `Khi số dư dưới ${formatVnd(defaultMethod.autoTopupThreshold)}, hệ thống tự nạp ${formatVnd(defaultMethod.autoTopupAmount)} từ phương thức mặc định.`
                      : "Tự động nạp tiền đang tắt."}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="payments-panel">
              <div className="payments-panel__head">
                <h2 className="payments-panel__title">Lịch sử giao dịch &amp; hóa đơn</h2>
                <button
                  type="button"
                  className="payments-btn payments-btn--secondary"
                  disabled={filteredTransactions.length === 0}
                  onClick={() => exportCsv(filteredTransactions)}
                >
                  Xuất sao kê (CSV)
                </button>
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
                  aria-label="Lọc theo freelancer"
                  value={filterFreelancerId}
                  onChange={(e) => setFilterFreelancerId(e.target.value)}
                >
                  <option value="">Tất cả freelancer</option>
                  {data.filterOptions.freelancers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
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
                <p className="payments-muted">Chưa có giao dịch nào phù hợp bộ lọc.</p>
              ) : (
                <>
                  <div className="payments-table-wrap">
                    <table className="payments-table">
                      <thead>
                        <tr>
                          <th>Ngày</th>
                          <th>Dự án / mô tả</th>
                          <th>Freelancer</th>
                          <th>Loại</th>
                          <th>Số tiền</th>
                          <th>Hóa đơn</th>
                        </tr>
                      </thead>
                      <tbody>
                        {txPage.items.map((item) => (
                          <tr key={item.id}>
                            <td>{formatDate(item.occurredAt)}</td>
                            <td className="payments-table__project">{item.projectTitle}</td>
                            <td>{item.freelancerName}</td>
                            <td>{transactionCategoryLabel(item.category)}</td>
                            <td className={item.amount < 0 ? "payments-neg" : "payments-pos"}>
                              {formatVnd(item.amount)}
                            </td>
                            <td>{item.invoiceNumber || "—"}</td>
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

            <section className="payments-panel">
              <h2 className="payments-panel__title">Thông tin xuất hóa đơn</h2>
              <p className="payments-muted">Thông tin này dùng khi xuất hóa đơn / sao kê.</p>
              <form className="payments-form-grid" onSubmit={(e) => void handleSaveProfile(e)}>
                <label>
                  <span>Tên công ty</span>
                  <input
                    type="text"
                    value={profileForm.companyName}
                    onChange={(e) => setProfileForm((p) => ({ ...p, companyName: e.target.value }))}
                  />
                </label>
                <label>
                  <span>Mã số thuế</span>
                  <input
                    type="text"
                    value={profileForm.taxId}
                    onChange={(e) => setProfileForm((p) => ({ ...p, taxId: e.target.value }))}
                  />
                </label>
                <label className="payments-form-grid__full">
                  <span>Địa chỉ công ty</span>
                  <input
                    type="text"
                    value={profileForm.companyAddress}
                    onChange={(e) => setProfileForm((p) => ({ ...p, companyAddress: e.target.value }))}
                  />
                </label>
                <label>
                  <span>Email nhận hóa đơn</span>
                  <input
                    type="email"
                    value={profileForm.billingEmail}
                    onChange={(e) => setProfileForm((p) => ({ ...p, billingEmail: e.target.value }))}
                  />
                </label>
                <label>
                  <span>Người liên hệ kế toán</span>
                  <input
                    type="text"
                    value={profileForm.contactName}
                    onChange={(e) => setProfileForm((p) => ({ ...p, contactName: e.target.value }))}
                  />
                </label>
                <div className="payments-form-grid__actions">
                  <button
                    type="submit"
                    className="payments-btn payments-btn--primary"
                    disabled={savingProfile}
                  >
                    {savingProfile ? "Đang lưu..." : "Lưu thông tin"}
                  </button>
                  {profileMessage ? (
                    <p className="payments-form-message" role="status">
                      {profileMessage}
                    </p>
                  ) : null}
                </div>
              </form>
            </section>
          </>
        ) : null}
      </div>
    </ClientShell>
  );
}
