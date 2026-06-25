"use client";

import { tUi, formatVndUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { FaCheckCircle, FaShieldAlt, FaSpinner, FaTimesCircle, FaUniversity } from "react-icons/fa";
import type {
  FreelancerBillingOverview,
  FreelancerPayoutProfile,
  FreelancerWithdrawalOrder,
  FreelancerWithdrawalPinStatus,
} from "@/lib/api/payments";
import {
  confirmFreelancerWithdrawal,
  getFreelancerWithdrawalStatus,
  requestFreelancerWithdrawal,
} from "@/lib/api/payments";
import { maskAccountNumber, resolveBankVisual } from "@/lib/payments/bankDisplay";
import {
  MIN_WITHDRAW_VND,
  WITHDRAW_AMOUNT_PRESETS,
} from "@/lib/payments/withdrawLimits";
import BankBadgeIcon from "./BankBadgeIcon";
import PinInput from "./PinInput";
import PaymentsMoneyInput from "./PaymentsMoneyInput";
import "./payment-method-modal.css";
import "@/components/account/withdrawal-pin-settings.css";

const POLL_MS = 2500;

type Step = "amount" | "verify" | "processing" | "done" | "no_pin";

type FreelancerWithdrawModalProps = {
  open: boolean;
  balance: number;
  initialAmount?: string;
  payoutProfile: FreelancerPayoutProfile;
  withdrawalPin: FreelancerWithdrawalPinStatus;
  onClose: () => void;
  onCompleted: (account: FreelancerBillingOverview["account"]) => void;
};

function isTerminalStatus(status: FreelancerWithdrawalOrder["status"]) {
  return status === "SUCCEEDED" || status === "FAILED" || status === "CANCELLED";
}

export default function FreelancerWithdrawModal({
  open,
  balance,
  initialAmount,
  payoutProfile,
  withdrawalPin,
  onClose,
  onCompleted,
}: FreelancerWithdrawModalProps) {  const { t, formatVnd } = useTranslation();

  const [step, setStep] = useState<Step>("amount");
  const [amountDigits, setAmountDigits] = useState(String(WITHDRAW_AMOUNT_PRESETS[1]));
  const [pin, setPin] = useState("");
  const [order, setOrder] = useState<FreelancerWithdrawalOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [autoCloseIn, setAutoCloseIn] = useState(5);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCloseRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefetchedAmountRef = useRef<string | null>(null);

  const amount = Number(amountDigits.replace(/\D/g, "") || 0);
  const bankVisual = useMemo(
    () => resolveBankVisual(payoutProfile.bankName),
    [payoutProfile.bankName],
  );

  useEffect(() => {
    if (!open) {
      prefetchedAmountRef.current = null;
      return;
    }

    stopPolling();
    if (!withdrawalPin.isConfigured) {
      setStep("no_pin");
      return;
    }

    const digits = initialAmount?.replace(/\D/g, "") || "";
    setAmountDigits(digits || String(WITHDRAW_AMOUNT_PRESETS[1]));
    setPin("");
    setOrder(null);
    setError("");
    setResultMessage("");
    setAutoCloseIn(5);

    const parsed = Number(digits || 0);
    const canPrefetch =
      Boolean(digits) &&
      parsed >= MIN_WITHDRAW_VND &&
      parsed <= balance &&
      payoutProfile.isConfigured &&
      prefetchedAmountRef.current !== digits;
    if (canPrefetch) {
      // Không tự tạo lệnh rút trong lúc mở modal.
      // Chỉ tạo khi freelancer bấm "Tiếp tục".
      prefetchedAmountRef.current = digits;
    }

    setStep("amount");
    setBusy(false);
  }, [open, initialAmount, balance, payoutProfile.isConfigured, withdrawalPin.isConfigured]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy && step !== "processing") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, busy, step]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (autoCloseRef.current) clearInterval(autoCloseRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (autoCloseRef.current) {
      clearInterval(autoCloseRef.current);
      autoCloseRef.current = null;
    }
    if (!open || step !== "done" || !order) return;

    setAutoCloseIn(5);
    autoCloseRef.current = setInterval(() => {
      setAutoCloseIn((current) => {
        if (current <= 1) {
          if (autoCloseRef.current) {
            clearInterval(autoCloseRef.current);
            autoCloseRef.current = null;
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      if (autoCloseRef.current) {
        clearInterval(autoCloseRef.current);
        autoCloseRef.current = null;
      }
    };
  }, [open, step, order]);

  useEffect(() => {
    if (!open || step !== "done" || !order || autoCloseIn !== 0) return;
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    closeTimeoutRef.current = setTimeout(() => {
      onClose();
    }, 0);
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, [autoCloseIn, open, step, order, onClose]);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling(orderId: string) {
    stopPolling();
    pollRef.current = setInterval(() => {
      void (async () => {
        try {
          const status = await getFreelancerWithdrawalStatus(orderId);
          setOrder(status.order);
          if (isTerminalStatus(status.order.status)) {
            stopPolling();
            setStep("done");
            setBusy(false);
            if (status.order.status === "SUCCEEDED") {
              setResultMessage("Rút tiền thành công. Tiền đã chuyển vào tài khoản ngân hàng của bạn.");
            } else {
              setResultMessage(
                status.order.failureReason || "Lệnh rút tiền thất bại. Số dư đã được hoàn lại ví.",
              );
            }
            onCompleted(status.account);
          }
        } catch {
          /* giữ polling */
        }
      })();
    }, POLL_MS);
  }

  async function handleAmountSubmit(event: FormEvent) {  event.preventDefault();
    setError("");
    if (amount < MIN_WITHDRAW_VND) {
      setError(`${t("Số tiền rút tối thiểu ")}${formatVndUi(MIN_WITHDRAW_VND)}.`);
      return;
    }
    if (amount > balance) {
      setError(`${t("Số dư khả dụng không đủ (hiện có ")}${formatVndUi(balance)}).`);
      return;
    }
    if (!payoutProfile.isConfigured) {
      setError(t("Bạn chưa liên kết tài khoản ngân hàng."));
      return;
    }

    setBusy(true);
    try {
      const result = await requestFreelancerWithdrawal(amount);
      setOrder(result.order);
      setStep("done");
      setResultMessage(
        `Đã tạo yêu cầu rút ${formatVndUi(result.order.amount)}. Dự kiến nhận tiền trong 5-30 phút sau khi hệ thống xử lý.`,
      );
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tạo lệnh rút tiền.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifySubmit(event: FormEvent) {
  event.preventDefault();
    if (!order) return;
    setError("");
    if (!pin || pin.length !== 6) {
      setError(t("Vui lòng nhập đủ 6 chữ số PIN."));
      return;
    }

    setBusy(true);
    setStep("processing");
    try {
      const result = await confirmFreelancerWithdrawal(order.id, pin);
      setOrder(result.order);
      onCompleted(result.account);

      if (result.order.status === "SUCCEEDED") {
        setStep("done");
        setResultMessage(result.message);
        setBusy(false);
        return;
      }

      if (result.order.status === "FAILED") {
        setStep("done");
        setResultMessage(result.order.failureReason || result.message);
        setBusy(false);
        return;
      }

      startPolling(result.order.id);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể xác nhận lệnh rút tiền.";
      setError(message);
      setStep("verify");
      setBusy(false);
    }
  }

  if (!open) return null;

  const canClose = !busy && step !== "processing";

  return (
    <div className="pay-method-modal__backdrop" role="presentation">
      <div
        className="pay-method-modal fl-withdraw-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fl-withdraw-title"
      >
        <header className="pay-method-modal__header">
          <div>
            <h2 id="fl-withdraw-title" className="pay-method-modal__title">
              {t("Rút tiền về ngân hàng")}
            </h2>
            <p className="fl-withdraw-modal__subtitle">
              {step === "amount" && "Bước 1: Nhập số tiền và chọn tài khoản nhận"}
              {step === "verify" && "Bước 2: Nhập mã PIN 6 số"}
              {step === "processing" && "Bước 3: Đang xử lý lệnh rút"}
              {step === "done" && "Kết quả lệnh rút tiền"}
              {step === "no_pin" && "Cần thiết lập PIN rút tiền"}
            </p>
          </div>
          {canClose ? (
            <button
              type="button"
              className="pay-method-modal__close"
              aria-label={t("Đóng")}
              onClick={onClose}
            >
              ×
            </button>
          ) : null}
        </header>

        <div className="pay-method-modal__body">
          {step === "amount" ? (
            <form onSubmit={(e) => void handleAmountSubmit(e)} className="fl-withdraw-modal__form">
              <label className="pay-method-modal__label" htmlFor="fl-withdraw-amount">
                {t("Số tiền muốn rút")}
              </label>
              <PaymentsMoneyInput
                id="fl-withdraw-amount"
                value={amountDigits}
                onChange={setAmountDigits}
                disabled={busy}
              />
              <div className="payments-deposit__presets fl-withdraw-modal__presets">
                {WITHDRAW_AMOUNT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="payments-chip"
                    disabled={busy || preset > balance}
                    onClick={() => setAmountDigits(String(preset))}
                  >
                    {formatVndUi(preset)}
                  </button>
                ))}
              </div>
              <p className="payments-muted">
                {t("Số dư khả dụng:")} <strong>{formatVndUi(balance)}</strong>
              </p>

              <div className="fl-withdraw-modal__bank-card">
                <div className="fl-withdraw-modal__bank-head">
                  <FaUniversity aria-hidden />
                  <span>{t("Tài khoản nhận tiền")}</span>
                </div>
                {payoutProfile.isConfigured ? (
                  <div className="fl-withdraw-modal__bank-body">
                    <BankBadgeIcon bankName={payoutProfile.bankName} size={44} />
                    <div>
                      <p className="fl-withdraw-modal__bank-name">{t(bankVisual.name)}</p>
                      <p className="fl-withdraw-modal__bank-meta">
                        {payoutProfile.accountHolderName}
                        {" · "}
                        {maskAccountNumber("", payoutProfile.accountLast4)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="payments-muted">{t("Chưa liên kết tài khoản ngân hàng.")}</p>
                )}
              </div>

              {error ? (
                <p className="pay-method-modal__error" role="alert">
                  {error}
                </p>
              ) : null}

              <footer className="pay-method-modal__footer">
                <button type="button" className="payments-btn payments-btn--secondary" onClick={onClose}>
                  {t("Hủy")}
                </button>
                <button
                  type="submit"
                  className="payments-btn payments-btn--primary"
                  disabled={busy || !payoutProfile.isConfigured || balance < MIN_WITHDRAW_VND}
                >
                  {busy ? "Đang tạo lệnh..." : "Tiếp tục"}
                </button>
              </footer>
            </form>
          ) : null}

          {step === "verify" && order ? (
            <form onSubmit={(e) => void handleVerifySubmit(e)} className="fl-withdraw-modal__form">
              <div className="fl-withdraw-modal__summary">
                <p>
                  {t("Số tiền:")} <strong>{formatVndUi(order.amount)}</strong>
                </p>
                <p>
                  {t("Ngân hàng:")} <strong>{order.bankName}</strong> ·{" "}
                  {maskAccountNumber("", order.accountLast4)}
                </p>
              </div>

              <label className="pay-method-modal__label">
                <FaShieldAlt aria-hidden /> {t("Mã PIN rút tiền (6 số)")}
              </label>
              <PinInput id="fl-withdraw-pin" value={pin} onChange={setPin} disabled={busy} autoFocus />
              <p className="payments-muted fl-withdraw-modal__hint">
                {t("Hệ thống sẽ chuyển tiền vào tài khoản ngân hàng sau khi PIN đúng.")}
              </p>

              {error ? (
                <p className="pay-method-modal__error" role="alert">
                  {error}
                </p>
              ) : null}

              <footer className="pay-method-modal__footer">
                <button
                  type="button"
                  className="payments-btn payments-btn--secondary"
                  disabled={busy}
                  onClick={() => {
                    setStep("amount");
                    setError("");
                  }}
                >
                  {t("Quay lại")}
                </button>
                <button type="submit" className="payments-btn payments-btn--primary" disabled={busy}>
                  {busy ? "Đang gửi..." : "Xác nhận rút tiền"}
                </button>
              </footer>
            </form>
          ) : null}

          {step === "no_pin" ? (
            <div className="fl-withdraw-modal__status">
              <FaShieldAlt className="fl-withdraw-modal__icon" aria-hidden style={{ color: "#2563eb" }} />
              <p className="fl-withdraw-modal__status-title">{t("Chưa có mã PIN rút tiền")}</p>
              <p className="payments-muted">
                {t("Vào")} <strong>{t("Cài đặt tài khoản")}</strong> để thiết lập PIN 6 số trước khi rút tiền.
                {withdrawalPin.requiresAppPasswordSetup
                  ? " Tài khoản Google cần đặt thêm mật khẩu ứng dụng khi tạo PIN lần đầu."
                  : " Bạn cần nhập mật khẩu đăng nhập để xác minh khi tạo PIN."}
              </p>
              <footer className="pay-method-modal__footer">
                <button type="button" className="payments-btn payments-btn--secondary" onClick={onClose}>
                  {t("Đóng")}
                </button>
                <Link href="/edit-account/cai-dat#withdrawal-pin" className="payments-btn payments-btn--primary">
                  {t("Thiết lập PIN")}
                </Link>
              </footer>
            </div>
          ) : null}

          {step === "processing" ? (
            <div className="fl-withdraw-modal__status" aria-live="polite">
              <FaSpinner className="fl-withdraw-modal__spinner" aria-hidden />
              <p className="fl-withdraw-modal__status-title">{t("Đang xử lý lệnh rút")}</p>
              <p className="payments-muted">
                {t("Hệ thống đang chuyển tiền vào tài khoản ngân hàng của bạn. Thao tác của bạn đã hoàn tất — vui lòng đợi trong giây lát.")}
              </p>
              {order ? (
                <p className="fl-withdraw-modal__ref">
                  {t("Mã tham chiếu:")} <code>{order.referenceId}</code>
                </p>
              ) : null}
            </div>
          ) : null}

          {step === "done" && order ? (
            <div className="fl-withdraw-modal__status" aria-live="polite">
              {order.status === "SUCCEEDED" ? (
                <FaCheckCircle className="fl-withdraw-modal__icon fl-withdraw-modal__icon--ok" aria-hidden />
              ) : order.status === "FAILED" || order.status === "CANCELLED" ? (
                <FaTimesCircle className="fl-withdraw-modal__icon fl-withdraw-modal__icon--fail" aria-hidden />
              ) : (
                <FaSpinner className="fl-withdraw-modal__spinner" aria-hidden />
              )}
              <p className="fl-withdraw-modal__status-title">
                {order.status === "SUCCEEDED"
                  ? "Rút tiền thành công"
                  : order.status === "FAILED" || order.status === "CANCELLED"
                    ? "Rút tiền thất bại"
                    : "Đã tạo yêu cầu rút tiền"}
              </p>
              <p className="payments-muted">{resultMessage}</p>
              <p className="fl-withdraw-modal__summary">
                {formatVndUi(order.amount)} → {order.bankName} ·{" "}
                {maskAccountNumber("", order.accountLast4)}
              </p>
              {order.status !== "SUCCEEDED" &&
              order.status !== "FAILED" &&
              order.status !== "CANCELLED" ? (
                <p className="payments-muted">{t("Thời gian dự kiến nhận: 5-30 phút.")}</p>
              ) : null}
              <footer className="pay-method-modal__footer">
                <p className="payments-muted">Tự động đóng sau {autoCloseIn}s.</p>
                <button type="button" className="payments-btn payments-btn--primary" onClick={onClose}>
                  {t("Đóng")}
                </button>
              </footer>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
