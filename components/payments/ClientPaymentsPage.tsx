"use client";

import { useTranslation } from "@/hooks/useTranslation";
import type { TranslationParams } from "@/lib/i18n/types";
import { formatDateUi, formatVndUi } from "@/lib/i18n/runtime";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import FreelancerPayoutAccountPanel from "@/components/payments/FreelancerPayoutAccountPanel";
import FreelancerWithdrawModal from "@/components/payments/FreelancerWithdrawModal";
import { BankNameWithLogo } from "@/components/payments/BankBadgeIcon";
import {
  validateBillingProfile,
  type BillingProfileErrors,
  type BillingProfileField,
} from "@/lib/payments/billingProfileValidation";
import { groupClientBillingTransactions } from "@/lib/payments/clientTransactionDisplay";
import { MIN_WITHDRAW_VND, WITHDRAW_AMOUNT_PRESETS } from "@/lib/payments/withdrawLimits";
import { FaCalendarAlt, FaChartPie, FaHistory, FaPlus, FaSpinner } from "react-icons/fa";
import "@/components/hire/hire.css";
import "@/components/dashboard/dashboardPagination.css";
import "./payments.css";
import "./freelancer-payments.css";

const TX_PAGE_SIZE = 8;
const DEPOSIT_PRESETS = [500_000, 1_000_000, 2_000_000, 5_000_000];

type TFn = (keyOrVi: string, params?: TranslationParams) => string;

function withdrawalStatusLabel(t: TFn, status?: string) {
  switch (status) {
    case "PENDING_AUTH":
      return t("paymentPage.withdrawPendingAuth");
    case "PROCESSING":
      return t("paymentPage.withdrawProcessing");
    case "SUCCEEDED":
      return t("paymentPage.withdrawSucceeded");
    case "FAILED":
      return t("paymentPage.withdrawFailed");
    case "CANCELLED":
      return t("paymentPage.withdrawCancelled");
    default:
      return "—";
  }
}

function withdrawalStatusClass(status?: string) {
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

function exportCsv(
  rows: BillingTransaction[],
  formatDate: (value: string | null | undefined) => string,
  t: TFn,
) {
  const header = [
    t("paymentPage.csvDate"),
    t("paymentPage.csvProject"),
    t("paymentPage.csvFreelancer"),
    t("paymentPage.csvType"),
    t("paymentPage.csvAmount"),
    t("paymentPage.csvInvoice"),
  ];
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
  const { t, formatVnd, formatDate } = useTranslation();
  const router = useRouter();

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
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(String(WITHDRAW_AMOUNT_PRESETS[1]));
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
          : t("paymentPage.loadError");
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
          : t("paymentPage.setDefaultError");
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
          : t("paymentPage.deleteMethodError");
      setToast({ message, variant: "error" });
    } finally {
      setDeleteMethodBusyId(null);
    }
  }

  async function handleDeposit() {
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount < 10000) {
      setToast({ message: t("paymentPage.minDepositError"), variant: "error" });
      return;
    }
    setDepositBusy(true);
    setDepositNeedsMethod(false);
    try {
      const result = await createPaymentLink(amount);
      if (!result.checkoutUrl) {
        setToast({ message: t("paymentPage.noPaymentLinkError"), variant: "error" });
        return;
      }
      window.location.href = result.checkoutUrl;
    } catch (err) {
      const apiErr = err as ApiError;
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : t("paymentPage.createDepositLinkError");
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
  const withdrawNumeric = Number(withdrawAmount.replace(/\D/g, "") || 0);
  const activeWithdrawPreset = WITHDRAW_AMOUNT_PRESETS.includes(
    withdrawNumeric as (typeof WITHDRAW_AMOUNT_PRESETS)[number],
  )
    ? withdrawNumeric
    : null;

  function openWithdrawFlow() {
    if (!data?.payoutProfile?.isConfigured) {
      setToast({ message: t("paymentPage.noBankAccount"), variant: "error" });
      return;
    }
    if (!data.withdrawalPin?.isConfigured) {
      setToast({ message: t("paymentPage.noPin"), variant: "error" });
      router.push("/edit-account/cai-dat#withdrawal-pin");
      return;
    }
    if (withdrawNumeric < MIN_WITHDRAW_VND) {
      setToast({ message: `Số tiền rút tối thiểu ${formatVndUi(MIN_WITHDRAW_VND)}.`, variant: "error" });
      return;
    }
    if (withdrawNumeric > data.account.balance) {
      setToast({ message: `Số dư khả dụng không đủ (${formatVndUi(data.account.balance)}).`, variant: "error" });
      return;
    }
    setWithdrawOpen(true);
  }

  function handleWithdrawCompleted(account: {
    balance: number;
    currency: string;
    pendingBalance?: number;
    totalEarned?: number;
  }) {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        account: {
          ...prev.account,
          balance: account.balance,
          currency: account.currency,
        },
      };
    });
    void load();
  }

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
      setToast({ message: t("paymentPage.validateFields"), variant: "error" });
      return;
    }

    setSavingProfile(true);
    try {
      const result = await updateBillingProfile(profileForm);
      setToast({ message: result.message || t("paymentPage.profileUpdateSuccess"), variant: "success" });
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : t("paymentPage.saveError");
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
            <h1 className="hire-page__title">{t("Thanh toán")}</h1>
            <p className="hire-page__lead">
              {t("Quản lý số dư ví, ký quỹ Escrow, phương thức thanh toán và lịch sử giao dịch từ hệ thống.")}
            </p>
          </div>
          {data && !loading && !error ? (
            <button
              type="button"
              className="payments-btn payments-btn--secondary payments-page__head-action"
              disabled={filteredTransactions.length === 0}
              onClick={() => exportCsv(filteredTransactions, formatDate, t)}
            >
              {t("Xuất sao kê (CSV)")}
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
                {t("Số dư & ký quỹ")}
              </PaymentsSectionTitle>
              <div className="payments-balance-layout">
                <div className="payments-balance-grid">
                  <PaymentsBalanceCard
                    variant="available"
                    featured
                    label={t("Số dư khả dụng")}
                    amount={formatVndUi(data.account.balance)}
                    hint={t("Dùng để nạp ký quỹ cho hợp đồng")}
                  />
                  <PaymentsBalanceCard
                    variant="escrow"
                    label={t("Tiền đang ký quỹ")}
                    amount={formatVndUi(data.account.escrowBalance)}
                    hint={t("Hợp đồng đã nạp Escrow, chưa giải ngân")}
                    tooltip={t("Đây là số tiền hệ thống đang tạm giữ an toàn cho dự án của bạn. Tiền chỉ được chuyển cho freelancer sau khi bạn nghiệm thu công việc thành công.")}
                  />
                </div>

                <div className={`payments-deposit-card${paymentBlocked ? " payments-deposit-card--blocked" : ""}`}>
                  <div className="payments-deposit-card__head">
                    <h3 className="payments-deposit-card__title">{t("Nạp tiền vào ví")}</h3>
                    {paymentBlocked ? (
                      <p className="payments-muted payments-deposit-card__blocked-hint">
                        {t("Cần xác minh danh tính trước khi nạp tiền.")}
                      </p>
                    ) : null}
                  </div>
                  <div className="payments-deposit__controls">
                    <label className="payments-deposit__label sr-only" htmlFor="deposit-amount">
                      {t("Số tiền nạp")}
                    </label>
                    <PaymentsMoneyInput
                      id="deposit-amount"
                      className="payments-money-input--deposit"
                      value={depositAmount}
                      onChange={setDepositAmount}
                      disabled={depositBusy || paymentBlocked}
                      aria-label={t("Số tiền nạp vào ví")}
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
                          {formatVndUi(preset)}
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
                          {t("Đang xử lý...")}
                        </>
                      ) : (
                        t("paymentPage.depositButton")
                      )}
                    </button>
                    {depositNeedsMethod ? (
                      <div className="payments-deposit__method-required" role="alert">
                        <p>
                          {t("Bạn cần thêm phương thức thanh toán trước khi nạp tiền vào ví.")}
                        </p>
                        <button
                          type="button"
                          className="payments-btn payments-btn--secondary"
                          disabled={paymentBlocked}
                          onClick={() => setMethodModalOpen(true)}
                        >
                          {t("Thêm phương thức thanh toán")}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="payments-panel fl-payments__withdraw-panel">
              <div className="payments-panel__head">
                <h2 className="payments-panel__title">{t("Rút tiền về tài khoản ngân hàng")}</h2>
              </div>
              <div className="payments-deposit-card fl-payments__withdraw-card">
                <div className="payments-deposit-card__head">
                  <h3 className="payments-deposit-card__title">{t("Yêu cầu rút tiền")}</h3>
                  <p className="payments-deposit-card__hint">
                    Dành cho số dư ví khả dụng, tối thiểu {formatVndUi(MIN_WITHDRAW_VND)}.
                  </p>
                </div>
                <div className="payments-deposit__controls">
                  <PaymentsMoneyInput
                    id="client-withdraw-amount"
                    className="payments-money-input--deposit"
                    value={withdrawAmount}
                    onChange={setWithdrawAmount}
                    disabled={
                      data.account.balance < MIN_WITHDRAW_VND ||
                      paymentBlocked ||
                      !data.withdrawalPin?.isConfigured
                    }
                    aria-label={t("Số tiền rút về ngân hàng")}
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
                        disabled={preset > data.account.balance || paymentBlocked}
                        onClick={() => setWithdrawAmount(String(preset))}
                      >
                        {formatVndUi(preset)}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="payments-btn payments-btn--primary payments-deposit__submit"
                    disabled={
                      data.account.balance < MIN_WITHDRAW_VND ||
                      paymentBlocked ||
                      !data.withdrawalPin?.isConfigured
                    }
                    onClick={openWithdrawFlow}
                  >
                    {t("Rút tiền")}
                  </button>
                </div>
                {!data.withdrawalPin?.isConfigured ? (
                  <p className="fl-payments__withdraw-pin-hint">
                    {t("paymentPage.noPin")}{" "}
                    <Link href="/edit-account/cai-dat#withdrawal-pin">{t("paymentPage.setupPinInSettings")}</Link>
                    {data.withdrawalPin?.requiresAppPasswordSetup
                      ? ` ${t("paymentPage.googleAppPasswordPinHint")}`
                      : "."}
                  </p>
                ) : null}
              </div>
            </section>

            {data.payoutProfile ? (
              <section className="payments-panel" id="payout-account">
                <div className="payments-panel__head">
                  <h2 className="payments-panel__title">{t("Tài khoản nhận tiền")}</h2>
                </div>
                <FreelancerPayoutAccountPanel
                  profile={data.payoutProfile}
                  onUpdated={load}
                  audience="client"
                />
              </section>
            ) : null}

            {(data.activeWithdrawals?.length ?? 0) > 0 ? (
              <section className="payments-panel" id="client-withdrawals">
                <h2 className="payments-panel__title">{t("Yêu cầu rút tiền đang xử lý")}</h2>
                <ul className="fl-payments__withdraw-list">
                  {data.activeWithdrawals?.map((item) => (
                    <li key={item.id} className="fl-payments__withdraw-item">
                      <div className="fl-payments__withdraw-item-main">
                        <p className="fl-payments__withdraw-item-amount">{formatVndUi(item.amount)}</p>
                        <p className="fl-payments__withdraw-item-meta">
                          <BankNameWithLogo
                            bankName={item.bankName}
                            size={20}
                            suffix={`${item.accountLast4 ? ` · ****${item.accountLast4}` : ""} · ${formatDateUi(item.createdAt)}`}
                          />
                        </p>
                        <p className="fl-payments__withdraw-item-ref">{item.referenceId}</p>
                      </div>
                      <span className={withdrawalStatusClass(item.status)}>
                        {withdrawalStatusLabel(t, item.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="payments-panel">
              <div className="payments-panel__head">
                <h2 className="payments-panel__title">{t("Phương thức thanh toán")}</h2>
                <button
                  type="button"
                  className="payments-btn payments-btn--primary payments-btn--with-icon"
                  disabled={paymentBlocked}
                  onClick={() => setMethodModalOpen(true)}
                >
                  <FaPlus aria-hidden />
                  {t("Thêm phương thức")}
                </button>
              </div>

              {data.billingMethods.length === 0 ? (
                <p className="payments-muted">
                  {t("Chưa có phương thức thanh toán. Nhấn")} <strong>{t("Thêm phương thức")}</strong> để thêm thẻ
                  hoặc ví, hoặc thêm thẻ khi{" "}
                  <Link href="/xac-minh-danh-tinh">{t("xác minh danh tính")}</Link>.
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
                              <p className="payments-method-item__title">{t(method.label)}</p>
                              <p className="payments-method-item__detail">
                                {billingMethodTypeLabel(method.type)} • {method.detail}
                              </p>
                            </div>
                          </div>
                          <div className="payments-method-item__aside">
                            {method.isPrimary ? (
                              <span className="payments-badge">{t("Mặc định")}</span>
                            ) : canSwitchDefault && canManage ? (
                              <button
                                type="button"
                                className="payments-method-item__set-default"
                                disabled={defaultMethodBusyId != null || isDeleting}
                                onClick={() => void handleSetDefaultMethod(method.id)}
                              >
                                {isSettingDefault ? t("paymentPage.settingDefault") : t("paymentPage.setAsDefault")}
                              </button>
                            ) : null}
                            {canManage ? (
                              <PaymentMethodMenu
                                methodLabel={t(method.label)}
                                disabled={isDeleting || defaultMethodBusyId === method.id}
                                onEdit={() => {
                                  setToast({
                                    message: t("paymentPage.cardUpdateHint"),
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
                  <h3 className="payments-auto__title">{t("Tự động nạp tiền")}</h3>
                  <p className="payments-muted">
                    {autoBillingOn
                      ? t("paymentPage.autoTopupOn", {
                          threshold: formatVnd(defaultMethod.autoTopupThreshold),
                          amount: formatVnd(defaultMethod.autoTopupAmount),
                        })
                      : t("paymentPage.autoTopupOff")}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="payments-panel">
              <PaymentsSectionTitle icon={<FaHistory />}>
                {t("Lịch sử giao dịch & hóa đơn")}
              </PaymentsSectionTitle>

              <div className="payments-filters">
                <select
                  aria-label={t("Lọc theo dự án")}
                  value={filterJobId}
                  onChange={(e) => setFilterJobId(e.target.value)}
                >
                  <option value="">{t("Tất cả dự án")}</option>
                  {data.filterOptions.jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {t(j.title)}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t("Lọc theo freelancer")}
                  value={filterFreelancerId}
                  onChange={(e) => setFilterFreelancerId(e.target.value)}
                >
                  <option value="">{t("Tất cả freelancer")}</option>
                  {data.filterOptions.freelancers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {t(f.name)}
                    </option>
                  ))}
                </select>
                <label
                  className={`payments-filter-month${filterMonth ? " payments-filter-month--has-value" : ""}`}
                >
                  <FaCalendarAlt className="payments-filter-month__icon" aria-hidden />
                  <span className="payments-filter-month__label" aria-hidden>
                    {filterMonth
                      ? t("paymentPage.monthLabel", {
                          month: filterMonth.slice(5, 7),
                          year: filterMonth.slice(0, 4),
                        })
                      : t("paymentPage.filterByMonth")}
                  </span>
                  <input
                    type="month"
                    className="payments-filter-month__input"
                    aria-label={t("Lọc theo tháng")}
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                  />
                  {filterMonth ? (
                    <button
                      type="button"
                      className="payments-filter-month__clear"
                      aria-label={t("Xóa lọc tháng")}
                      onClick={() => setFilterMonth("")}
                    >
                      ×
                    </button>
                  ) : null}
                </label>
              </div>

              {groupedTransactions.length === 0 ? (
                <p className="payments-muted">{t("Chưa có giao dịch nào phù hợp bộ lọc.")}</p>
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
              <h2 className="payments-panel__title">{t("Thông tin xuất hóa đơn")}</h2>
              <p className="payments-muted">{t("Thông tin này dùng khi xuất hóa đơn / sao kê.")}</p>
              <form
                className="payments-form-grid"
                onSubmit={(e) => void handleSaveProfile(e)}
                noValidate
              >
                <fieldset className="payments-form-grid__fieldset" disabled={paymentBlocked}>
                <div className="payments-form-field">
                  <label htmlFor="billing-company-name">
                    <span>
                      {t("Tên công ty")}
                      <span className="payments-form-field__required" aria-hidden>
                        {" "}
                        *
                      </span>
                    </span>
                    <input
                      id="billing-company-name"
                      type="text"
                      autoComplete="organization"
                      placeholder={t("VD: Công ty TNHH ABC")}
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
                      {t("Mã số thuế")}
                      <span className="payments-form-field__required" aria-hidden>
                        {" "}
                        *
                      </span>
                    </span>
                    <input
                      id="billing-tax-id"
                      type="text"
                      inputMode="numeric"
                      placeholder={t("Nhập 10–13 chữ số")}
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
                      {t("Địa chỉ công ty")}
                      <span className="payments-form-field__required" aria-hidden>
                        {" "}
                        *
                      </span>
                    </span>
                    <input
                      id="billing-company-address"
                      type="text"
                      autoComplete="street-address"
                      placeholder={t("Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố")}
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
                    <span>{t("Email nhận hóa đơn")}</span>
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
                    <span>{t("Người liên hệ kế toán")}</span>
                    <input
                      id="billing-contact-name"
                      type="text"
                      autoComplete="name"
                      placeholder={t("Họ và tên người nhận hóa đơn")}
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
                        {t("Đang lưu...")}
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

        {data?.payoutProfile && data?.withdrawalPin ? (
          <FreelancerWithdrawModal
            open={withdrawOpen}
            balance={data.account.balance}
            initialAmount={withdrawAmount}
            payoutProfile={data.payoutProfile}
            withdrawalPin={data.withdrawalPin}
            onClose={() => setWithdrawOpen(false)}
            onCompleted={handleWithdrawCompleted}
          />
        ) : null}

        {toast ? (
          <PaymentsToast
            message={t(toast.message)}
            variant={toast.variant}
            onClose={() => setToast(null)}
          />
        ) : null}
      </div>
    </ClientShell>
  );
}
