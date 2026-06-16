"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import ClientShell from "@/components/layout/ClientShell";
import DashboardPagination from "@/components/dashboard/DashboardPagination";
import { usePagedList } from "@/hooks/usePagedList";
import {
  billingMethodTypeLabel,
  deleteBillingMethod,
  createPaymentLink,
  cancelDepositOrder,
  getDepositOrderStatus,
  getClientBillingOverview,
  setDefaultBillingMethod,
  transactionCategoryLabel,
  updateBillingProfile,
  type BillingOverview,
  type BillingProfile,
  type BillingTransaction,
} from "@/lib/api/payments";
import type { ApiError } from "@/lib/api/client";
import { formatDate, formatVnd } from "@/lib/format";
import { useClientIdentityVerification } from "@/hooks/useClientIdentityVerification";
import ClientVerifyNotice from "@/components/hire/ClientVerifyNotice";
import { CLIENT_VERIFY_PAYMENT_LEAD } from "@/lib/hire/clientVerification";
import PaymentsBalanceCard from "@/components/payments/PaymentsBalanceCard";
import PaymentsMoneyInput from "@/components/payments/PaymentsMoneyInput";
import AddPaymentMethodModal from "@/components/payments/AddPaymentMethodModal";
import ClientTransactionTable from "@/components/payments/ClientTransactionTable";
import PaymentMethodIcon from "@/components/payments/PaymentMethodIcon";
import PaymentMethodMenu from "@/components/payments/PaymentMethodMenu";
import PaymentsSectionTitle from "@/components/payments/PaymentsSectionTitle";
import PaymentsToast from "@/components/payments/PaymentsToast";
import {
  validateBillingProfile,
  type BillingProfileErrors,
  type BillingProfileField,
} from "@/lib/payments/billingProfileValidation";
import { groupClientBillingTransactions } from "@/lib/payments/clientTransactionDisplay";
import { FaCalendarAlt, FaChartPie, FaHistory, FaPlus, FaSpinner } from "react-icons/fa";
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
  const { verified: identityVerified, loading: identityLoading } = useClientIdentityVerification({
    refreshOnVisible: false,
  });
  const paymentBlocked = !identityLoading && !identityVerified;
  const [data, setData] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [depositBusy, setDepositBusy] = useState(false);
  const [depositNeedsMethod, setDepositNeedsMethod] = useState(false);
  const [depositAmount, setDepositAmount] = useState(String(DEPOSIT_PRESETS[1]));
  const [profileForm, setProfileForm] = useState<BillingProfile>({
    companyName: "",
    companyAddress: "",
    taxId: "",
    billingEmail: "",
    contactName: "",
  });
  const [profileErrors, setProfileErrors] = useState<BillingProfileErrors>({});
  const [filterJobId, setFilterJobId] = useState("");
  const [filterFreelancerId, setFilterFreelancerId] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [methodModalOpen, setMethodModalOpen] = useState(false);
  const [defaultMethodBusyId, setDefaultMethodBusyId] = useState<string | null>(null);
  const [deleteMethodBusyId, setDeleteMethodBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const overview = await getClientBillingOverview();
      setData(overview);
      setProfileForm(overview.billingProfile);
      if ((overview.billingMethods?.length ?? 0) > 0) {
        setDepositNeedsMethod(false);
      }
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

  const groupedTransactions = useMemo(
    () => groupClientBillingTransactions(filteredTransactions),
    [filteredTransactions],
  );

  const txResetKey = `${filterJobId}|${filterFreelancerId}|${filterMonth}`;
  const txPage = usePagedList(groupedTransactions, TX_PAGE_SIZE, txResetKey);

  const defaultMethod = data?.defaultMethod;
  const autoBillingOn = Boolean(defaultMethod?.isAutoBillingEnabled);
  const canSwitchDefault = (data?.billingMethods.length ?? 0) > 1;

  function applyDefaultMethod(methodId: string) {
    setData((prev) => {
      if (!prev) return prev;
      const billingMethods = prev.billingMethods.map((method) => ({
        ...method,
        isPrimary: method.id === methodId,
      }));
      const defaultMethod = billingMethods.find((method) => method.id === methodId) ?? null;
      return { ...prev, billingMethods, defaultMethod };
    });
  }

  async function handleSetDefaultMethod(methodId: string) {
    if (methodId === "identity-card") return;
    setDefaultMethodBusyId(methodId);
    try {
      const result = await setDefaultBillingMethod(methodId);
      applyDefaultMethod(result.method.id);
      setToast({ message: result.message, variant: "success" });
      void load();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể đổi phương thức mặc định.";
      setToast({ message, variant: "error" });
    } finally {
      setDefaultMethodBusyId(null);
    }
  }

  async function handleDeleteMethod(methodId: string) {
    if (methodId === "identity-card") return;
    setDeleteMethodBusyId(methodId);
    try {
      const result = await deleteBillingMethod(methodId);
      setToast({ message: result.message, variant: "success" });
      await load();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể xóa phương thức thanh toán.";
      setToast({ message, variant: "error" });
    } finally {
      setDeleteMethodBusyId(null);
    }
  }

  async function handleDeposit() {
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount < 10000) {
      setToast({ message: "Số tiền nạp tối thiểu 10.000 VND.", variant: "error" });
      return;
    }
    setDepositBusy(true);
    setDepositNeedsMethod(false);
    try {
      const result = await createPaymentLink(amount);
      if (!result.checkoutUrl) {
        setToast({ message: "Không nhận được link thanh toán.", variant: "error" });
        return;
      }
      window.location.href = result.checkoutUrl;
    } catch (err) {
      const apiErr = err as ApiError;
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tạo link nạp tiền.";
      if (apiErr?.code === "BILLING_METHOD_REQUIRED") {
        setDepositNeedsMethod(true);
      }
      setToast({ message, variant: "error" });
    } finally {
      setDepositBusy(false);
    }
  }

  const activeDepositPreset = DEPOSIT_PRESETS.find(
    (preset) => Number(depositAmount) === preset,
  );

  function updateProfileField(field: BillingProfileField, value: string) {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
    setProfileErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateBillingProfile(profileForm);
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      setToast({ message: "Vui lòng kiểm tra lại các trường bắt buộc.", variant: "error" });
      return;
    }

    setSavingProfile(true);
    try {
      const result = await updateBillingProfile(profileForm);
      setToast({ message: result.message || "Cập nhật thông tin thành công!", variant: "success" });
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể lưu thông tin.";
      setToast({ message, variant: "error" });
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
          {data && !loading && !error ? (
            <button
              type="button"
              className="payments-btn payments-btn--secondary payments-page__head-action"
              disabled={filteredTransactions.length === 0}
              onClick={() => exportCsv(filteredTransactions)}
            >
              Xuất sao kê (CSV)
            </button>
          ) : null}
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
            {paymentBlocked ? (
              <ClientVerifyNotice message={CLIENT_VERIFY_PAYMENT_LEAD} />
            ) : null}

            <section className="payments-panel">
              <PaymentsSectionTitle icon={<FaChartPie />}>
                Số dư &amp; ký quỹ
              </PaymentsSectionTitle>
              <div className="payments-balance-layout">
                <div className="payments-balance-grid">
                  <PaymentsBalanceCard
                    variant="available"
                    featured
                    label="Số dư khả dụng"
                    amount={formatVnd(data.account.balance)}
                    hint="Dùng để nạp ký quỹ cho hợp đồng"
                  />
                  <PaymentsBalanceCard
                    variant="escrow"
                    label="Tiền đang ký quỹ"
                    amount={formatVnd(data.account.escrowBalance)}
                    hint="Hợp đồng đã nạp Escrow, chưa giải ngân"
                    tooltip="Đây là số tiền hệ thống đang tạm giữ an toàn cho dự án của bạn. Tiền chỉ được chuyển cho freelancer sau khi bạn nghiệm thu công việc thành công."
                  />
                </div>

                <div className={`payments-deposit-card${paymentBlocked ? " payments-deposit-card--blocked" : ""}`}>
                  <div className="payments-deposit-card__head">
                    <h3 className="payments-deposit-card__title">Nạp tiền vào ví</h3>
                    {paymentBlocked ? (
                      <p className="payments-muted payments-deposit-card__blocked-hint">
                        Cần xác minh danh tính trước khi nạp tiền.
                      </p>
                    ) : null}
                  </div>
                  <div className="payments-deposit__controls">
                    <label className="payments-deposit__label sr-only" htmlFor="deposit-amount">
                      Số tiền nạp
                    </label>
                    <PaymentsMoneyInput
                      id="deposit-amount"
                      className="payments-money-input--deposit"
                      value={depositAmount}
                      onChange={setDepositAmount}
                      disabled={depositBusy || paymentBlocked}
                      aria-label="Số tiền nạp vào ví"
                    />
                    <div className="payments-deposit__presets">
                      {DEPOSIT_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className={
                            activeDepositPreset === preset
                              ? "payments-chip payments-chip--active"
                              : "payments-chip"
                          }
                          aria-pressed={activeDepositPreset === preset}
                          disabled={paymentBlocked}
                          onClick={() => setDepositAmount(String(preset))}
                        >
                          {formatVnd(preset)}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="payments-btn payments-btn--primary payments-btn--with-icon payments-deposit__submit"
                      disabled={depositBusy || paymentBlocked}
                      aria-busy={depositBusy}
                      onClick={() => void handleDeposit()}
                    >
                      {depositBusy ? (
                        <>
                          <FaSpinner className="payments-btn__spinner" aria-hidden />
                          Đang xử lý...
                        </>
                      ) : (
                        "Thanh toán"
                      )}
                    </button>
                    {depositNeedsMethod ? (
                      <div className="payments-deposit__method-required" role="alert">
                        <p>
                          Bạn cần thêm phương thức thanh toán trước khi nạp tiền vào ví.
                        </p>
                        <button
                          type="button"
                          className="payments-btn payments-btn--secondary"
                          disabled={paymentBlocked}
                          onClick={() => setMethodModalOpen(true)}
                        >
                          Thêm phương thức thanh toán
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="payments-panel">
              <div className="payments-panel__head">
                <h2 className="payments-panel__title">Phương thức thanh toán</h2>
                <button
                  type="button"
                  className="payments-btn payments-btn--primary payments-btn--with-icon"
                  disabled={paymentBlocked}
                  onClick={() => setMethodModalOpen(true)}
                >
                  <FaPlus aria-hidden />
                  Thêm phương thức
                </button>
              </div>

              {data.billingMethods.length === 0 ? (
                <p className="payments-muted">
                  Chưa có phương thức thanh toán. Nhấn <strong>Thêm phương thức</strong> để thêm thẻ
                  hoặc ví, hoặc thêm thẻ khi{" "}
                  <Link href="/xac-minh-danh-tinh">xác minh danh tính</Link>.
                </p>
              ) : (
                <>
                  <ul className="payments-method-list">
                    {data.billingMethods.map((method) => {
                      const isSettingDefault = defaultMethodBusyId === method.id;
                      const isDeleting = deleteMethodBusyId === method.id;
                      const canManage = method.id !== "identity-card" && !paymentBlocked;
                      return (
                        <li
                          key={method.id}
                          className={
                            method.isPrimary
                              ? "payments-method-item payments-method-item--primary"
                              : "payments-method-item"
                          }
                        >
                          <div className="payments-method-item__main">
                            <PaymentMethodIcon
                              method={method}
                              size={36}
                              className="payments-method-item__brand-icon"
                            />
                            <div>
                              <p className="payments-method-item__title">{method.label}</p>
                              <p className="payments-method-item__detail">
                                {billingMethodTypeLabel(method.type)} • {method.detail}
                              </p>
                            </div>
                          </div>
                          <div className="payments-method-item__aside">
                            {method.isPrimary ? (
                              <span className="payments-badge">Mặc định</span>
                            ) : canSwitchDefault && canManage ? (
                              <button
                                type="button"
                                className="payments-method-item__set-default"
                                disabled={defaultMethodBusyId != null || isDeleting}
                                onClick={() => void handleSetDefaultMethod(method.id)}
                              >
                                {isSettingDefault ? "Đang đặt..." : "Đặt làm mặc định"}
                              </button>
                            ) : null}
                            {canManage ? (
                              <PaymentMethodMenu
                                methodLabel={method.label}
                                disabled={isDeleting || defaultMethodBusyId === method.id}
                                onEdit={() => {
                                  setToast({
                                    message:
                                      "Để cập nhật thẻ, hãy xóa phương thức cũ rồi thêm lại thông tin mới.",
                                    variant: "success",
                                  });
                                }}
                                onDelete={() => void handleDeleteMethod(method.id)}
                              />
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
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
              <PaymentsSectionTitle icon={<FaHistory />}>
                Lịch sử giao dịch &amp; hóa đơn
              </PaymentsSectionTitle>

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
                <label
                  className={`payments-filter-month${filterMonth ? " payments-filter-month--has-value" : ""}`}
                >
                  <FaCalendarAlt className="payments-filter-month__icon" aria-hidden />
                  <span className="payments-filter-month__label" aria-hidden>
                    {filterMonth
                      ? `Tháng ${filterMonth.slice(5, 7)}/${filterMonth.slice(0, 4)}`
                      : "Lọc theo tháng"}
                  </span>
                  <input
                    type="month"
                    className="payments-filter-month__input"
                    aria-label="Lọc theo tháng"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                  />
                  {filterMonth ? (
                    <button
                      type="button"
                      className="payments-filter-month__clear"
                      aria-label="Xóa lọc tháng"
                      onClick={() => setFilterMonth("")}
                    >
                      ×
                    </button>
                  ) : null}
                </label>
              </div>

              {groupedTransactions.length === 0 ? (
                <p className="payments-muted">Chưa có giao dịch nào phù hợp bộ lọc.</p>
              ) : (
                <>
                  <ClientTransactionTable rows={txPage.items} />
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

            <section className="payments-panel">
              <h2 className="payments-panel__title">Thông tin xuất hóa đơn</h2>
              <p className="payments-muted">Thông tin này dùng khi xuất hóa đơn / sao kê.</p>
              <form
                className="payments-form-grid"
                onSubmit={(e) => void handleSaveProfile(e)}
                noValidate
              >
                <fieldset className="payments-form-grid__fieldset" disabled={paymentBlocked}>
                <div className="payments-form-field">
                  <label htmlFor="billing-company-name">
                    <span>
                      Tên công ty
                      <span className="payments-form-field__required" aria-hidden>
                        {" "}
                        *
                      </span>
                    </span>
                    <input
                      id="billing-company-name"
                      type="text"
                      autoComplete="organization"
                      placeholder="VD: Công ty TNHH ABC"
                      value={profileForm.companyName}
                      aria-invalid={Boolean(profileErrors.companyName)}
                      aria-describedby={
                        profileErrors.companyName ? "billing-company-name-error" : undefined
                      }
                      className={profileErrors.companyName ? "payments-form-field__input--error" : ""}
                      onChange={(e) => updateProfileField("companyName", e.target.value)}
                    />
                  </label>
                  {profileErrors.companyName ? (
                    <p id="billing-company-name-error" className="payments-form-field__error" role="alert">
                      {profileErrors.companyName}
                    </p>
                  ) : null}
                </div>
                <div className="payments-form-field">
                  <label htmlFor="billing-tax-id">
                    <span>
                      Mã số thuế
                      <span className="payments-form-field__required" aria-hidden>
                        {" "}
                        *
                      </span>
                    </span>
                    <input
                      id="billing-tax-id"
                      type="text"
                      inputMode="numeric"
                      placeholder="Nhập 10–13 chữ số"
                      value={profileForm.taxId}
                      aria-invalid={Boolean(profileErrors.taxId)}
                      aria-describedby={profileErrors.taxId ? "billing-tax-id-error" : undefined}
                      className={profileErrors.taxId ? "payments-form-field__input--error" : ""}
                      onChange={(e) =>
                        updateProfileField("taxId", e.target.value.replace(/\D/g, "").slice(0, 13))
                      }
                    />
                  </label>
                  {profileErrors.taxId ? (
                    <p id="billing-tax-id-error" className="payments-form-field__error" role="alert">
                      {profileErrors.taxId}
                    </p>
                  ) : null}
                </div>
                <div className="payments-form-field payments-form-grid__full">
                  <label htmlFor="billing-company-address">
                    <span>
                      Địa chỉ công ty
                      <span className="payments-form-field__required" aria-hidden>
                        {" "}
                        *
                      </span>
                    </span>
                    <input
                      id="billing-company-address"
                      type="text"
                      autoComplete="street-address"
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                      value={profileForm.companyAddress}
                      aria-invalid={Boolean(profileErrors.companyAddress)}
                      aria-describedby={
                        profileErrors.companyAddress ? "billing-company-address-error" : undefined
                      }
                      className={
                        profileErrors.companyAddress ? "payments-form-field__input--error" : ""
                      }
                      onChange={(e) => updateProfileField("companyAddress", e.target.value)}
                    />
                  </label>
                  {profileErrors.companyAddress ? (
                    <p
                      id="billing-company-address-error"
                      className="payments-form-field__error"
                      role="alert"
                    >
                      {profileErrors.companyAddress}
                    </p>
                  ) : null}
                </div>
                <div className="payments-form-field">
                  <label htmlFor="billing-email">
                    <span>Email nhận hóa đơn</span>
                    <input
                      id="billing-email"
                      type="email"
                      autoComplete="email"
                      placeholder="ketoan@congty.com"
                      value={profileForm.billingEmail}
                      aria-invalid={Boolean(profileErrors.billingEmail)}
                      aria-describedby={profileErrors.billingEmail ? "billing-email-error" : undefined}
                      className={profileErrors.billingEmail ? "payments-form-field__input--error" : ""}
                      onChange={(e) => updateProfileField("billingEmail", e.target.value)}
                    />
                  </label>
                  {profileErrors.billingEmail ? (
                    <p id="billing-email-error" className="payments-form-field__error" role="alert">
                      {profileErrors.billingEmail}
                    </p>
                  ) : null}
                </div>
                <div className="payments-form-field">
                  <label htmlFor="billing-contact-name">
                    <span>Người liên hệ kế toán</span>
                    <input
                      id="billing-contact-name"
                      type="text"
                      autoComplete="name"
                      placeholder="Họ và tên người nhận hóa đơn"
                      value={profileForm.contactName}
                      onChange={(e) => updateProfileField("contactName", e.target.value)}
                    />
                  </label>
                </div>
                </fieldset>
                <div className="payments-form-grid__actions">
                  <button
                    type="submit"
                    className="payments-btn payments-btn--primary payments-btn--with-icon"
                    disabled={savingProfile || paymentBlocked}
                    aria-busy={savingProfile}
                  >
                    {savingProfile ? (
                      <>
                        <FaSpinner className="payments-btn__spinner" aria-hidden />
                        Đang lưu...
                      </>
                    ) : (
                      "Lưu thông tin"
                    )}
                  </button>
                </div>
              </form>
            </section>
          </>
        ) : null}

        {methodModalOpen && !paymentBlocked ? (
          <AddPaymentMethodModal
            onClose={() => setMethodModalOpen(false)}
            onSaved={() => {
              setToast({ message: "Đã thêm phương thức thanh toán.", variant: "success" });
              void load();
            }}
          />
        ) : null}

        {toast ? (
          <PaymentsToast
            message={toast.message}
            variant={toast.variant}
            onClose={() => setToast(null)}
          />
        ) : null}
      </div>
    </ClientShell>
  );
}
