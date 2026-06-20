"use client";

import { tUi, formatVndUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { useEffect, useId, useState } from "react";
import { FaCheckCircle, FaTimes } from "react-icons/fa";
import { isClientCannotQuoteError } from "@/components/findwork/ClientCannotQuoteModal";
import { acceptJob, type JobListing, type SubmitJobQuotePayload } from "@/lib/api/jobs";
import { formatJobBudgetLine } from "@/lib/jobsDisplay";
import "./job-proposal-form.css";

type Step = "form" | "confirm";

type JobProposalFormModalProps = {
  job: JobListing;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isOwnJob?: boolean;
  onClientBlocked?: () => void;
};

function defaultPricingType(job: JobListing): "fixed" | "hourly" {
  return String(job.budget_type || "").toLowerCase() === "hourly" ? "hourly" : "fixed";
}

function defaultAmountInput(job: JobListing): string {
  if (job.budget == null || job.budget === "") return "";
  const n = Number(job.budget);
  return Number.isFinite(n) ? String(n) : "";
}

function parseBudgetNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatQuoteAmount(amount: number | null, pricingType: "fixed" | "hourly"): string {

  if (amount == null || !Number.isFinite(amount)) return "Theo ngân sách client";
  const base = formatVndUi(amount);
  return pricingType === "hourly" ? `${base}/giờ` : base;
}

function pricingTypeLabel(type: "fixed" | "hourly"): string {
  return type === "hourly" ? "Theo giờ" : "Trọn gói";
}

export default function JobProposalFormModal({
  job,
  open,
  onClose,
  onSuccess,
  onClientBlocked,
}: JobProposalFormModalProps) {  const { t, formatVnd } = useTranslation();

  const titleId = useId();
  const [step, setStep] = useState<Step>("form");
  const fixedPricingType = defaultPricingType(job);
  const [amountInput, setAmountInput] = useState(() => defaultAmountInput(job));
  const [message, setMessage] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const minBudget = parseBudgetNumber(job.budget);
  const maxBudget = parseBudgetNumber(job.budget_max);
  const hasBudgetRange = minBudget != null && maxBudget != null && maxBudget > minBudget;

  useEffect(() => {
    if (!open) return;
    setStep("form");
    setAmountInput(defaultAmountInput(job));
    setMessage("");
    setFieldError("");
    setSubmitError("");
    setSubmitting(false);
  }, [open, job]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
  const t = tUi;
  const formatVnd = formatVndUi;
      if (e.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, submitting]);

  if (!open) return null;

  const parsedAmount =
    amountInput.trim() === "" ? null : Number(amountInput.replace(/[^\d.]/g, ""));

  function validateForm(): boolean {
    if (message.trim().length < 20) {
      setFieldError("Thư đề xuất cần ít nhất 20 ký tự để client hiểu rõ cách bạn làm việc.");
      return false;
    }
    if (amountInput.trim() !== "" && (parsedAmount == null || !Number.isFinite(parsedAmount) || parsedAmount < 0)) {
      setFieldError("Mức giá báo không hợp lệ.");
      return false;
    }
    if (hasBudgetRange && parsedAmount != null && (parsedAmount < minBudget || parsedAmount > maxBudget)) {
      setFieldError(`Mức giá phải nằm trong khoảng ${formatVndUi(minBudget)} - ${formatVndUi(maxBudget)}.`);
      return false;
    }
    setFieldError("");
    return true;
  }

  function handleContinue() {
  const t = tUi;
  const formatVnd = formatVndUi;
    if (!validateForm()) return;
    setSubmitError("");
    setStep("confirm");
  }

  async function handleSubmit() {
  const t = tUi;
  const formatVnd = formatVndUi;
    if (!validateForm()) {
      setStep("form");
      return;
    }
    setSubmitError("");
    setSubmitting(true);
    const payload: SubmitJobQuotePayload = {
      message: message.trim(),
      pricing_type: fixedPricingType,
    };
    if (parsedAmount != null && Number.isFinite(parsedAmount)) {
      payload.amount = parsedAmount;
    }
    try {
      await acceptJob(job.id, payload);
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể gửi báo giá lúc này.";
      if (isClientCannotQuoteError(msg)) {
        onClientBlocked?.();
        return;
      }
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const clientBudget = formatJobBudgetLine(job);

  return (
    <div className="job-proposal-modal" role="presentation">
      <div
        className="job-proposal-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          type="button"
          className="job-proposal-modal__close"
          onClick={onClose}
          disabled={submitting}
          aria-label={t("Đóng")}
        >
          <FaTimes aria-hidden />
        </button>

        <header className="job-proposal-modal__header">
          <p className="job-proposal-modal__eyebrow">{t("Mẫu đề xuất")}</p>
          <h2 id={titleId} className="job-proposal-modal__title">
            {step === "form" ? "Chuẩn bị báo giá" : "Xác nhận chi tiết báo giá"}
          </h2>
          <p className="job-proposal-modal__subtitle">{job.title}</p>
        </header>

        <ol className="job-proposal-modal__steps" aria-label={t("Các bước gửi báo giá")}>
          <li className={step === "form" ? "is-active" : step === "confirm" ? "is-done" : ""}>
            <span>1</span> Soạn đề xuất
          </li>
          <li className={step === "confirm" ? "is-active" : ""}>
            <span>2</span> Xác nhận
          </li>
        </ol>

        {step === "form" ? (
          <div className="job-proposal-modal__body">
            <div className="job-proposal-modal__job-ref">
              <span>{t("Ngân sách client")}</span>
              <strong>{clientBudget}</strong>
            </div>

            <fieldset className="job-proposal-field">
              <legend>{t("Hình thức báo giá")}</legend>
              <div className="job-proposal-field__radios">
                <label className="job-proposal-radio">
                  <input
                    type="radio"
                    name="pricing_type"
                    value="fixed"
                    checked={fixedPricingType === "fixed"}
                    readOnly
                    disabled
                  />
                  Trọn gói
                </label>
                <label className="job-proposal-radio">
                  <input
                    type="radio"
                    name="pricing_type"
                    value="hourly"
                    checked={fixedPricingType === "hourly"}
                    readOnly
                    disabled
                  />
                  Theo giờ
                </label>
              </div>
              <span className="job-proposal-field__hint">
                Loại báo giá được cố định theo cấu hình ngân sách của job.
              </span>
            </fieldset>

            <label className="job-proposal-field">
              <span className="job-proposal-field__label">
                Mức giá của bạn (VND)
                {fixedPricingType === "hourly" ? " / giờ" : ""}
              </span>
              <input
                type="text"
                inputMode="numeric"
                className="job-proposal-field__input"
                placeholder={
                  job.budget != null ? defaultAmountInput(job) || t("Nhập số tiền") : "Nhập số tiền"
                }
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                disabled={!hasBudgetRange && minBudget != null}
              />
              <span className="job-proposal-field__hint">
                {hasBudgetRange
                  ? `Nhập trong khoảng ${formatVndUi(minBudget)} - ${formatVndUi(maxBudget)}.`
                  : minBudget != null
                    ? "Giá được cố định theo ngân sách client."
                    : "Để trống nếu muốn dùng ngân sách client làm mức báo giá mặc định."}
              </span>
            </label>

            <label className="job-proposal-field">
              <span className="job-proposal-field__label">{t("Thư đề xuất")}</span>
              <textarea
                className="job-proposal-field__textarea"
                rows={6}
                placeholder={t("Giới thiệu kinh nghiệm, cách tiếp cận, thời gian hoàn thành và lý do client nên chọn bạn...")}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <span className="job-proposal-field__hint">
                Tối thiểu 20 ký tự · {message.trim().length} ký tự
              </span>
            </label>

            {fieldError ? (
              <p className="job-proposal-modal__error" role="alert">
                {fieldError}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="job-proposal-modal__body">
            <div className="job-proposal-review">
              <div className="job-proposal-review__row">
                <dt>{t("Công việc")}</dt>
                <dd>{job.title}</dd>
              </div>
              <div className="job-proposal-review__row">
                <dt>{t("Hình thức")}</dt>
                <dd>{pricingTypeLabel(fixedPricingType)}</dd>
              </div>
              <div className="job-proposal-review__row">
                <dt>{t("Mức báo giá")}</dt>
                <dd>{formatQuoteAmount(parsedAmount ?? minBudget, fixedPricingType)}</dd>
              </div>
              <div className="job-proposal-review__row">
                <dt>{t("Ngân sách client")}</dt>
                <dd>{clientBudget}</dd>
              </div>
              <div className="job-proposal-review__message">
                <dt>{t("Thư đề xuất")}</dt>
                <dd>{message.trim()}</dd>
              </div>
            </div>

            <p className="job-proposal-modal__confirm-note">
              <FaCheckCircle aria-hidden />
              Sau khi xác nhận, báo giá sẽ được gửi tới client và hiển thị trong mục quản lý báo
              giá của họ.
            </p>

            {submitError ? (
              <p className="job-proposal-modal__error" role="alert">
                {submitError}
              </p>
            ) : null}
          </div>
        )}

        <footer className="job-proposal-modal__footer">
          {step === "form" ? (
            <>
              <button
                type="button"
                className="job-proposal-btn job-proposal-btn--ghost"
                onClick={onClose}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="job-proposal-btn job-proposal-btn--primary"
                onClick={handleContinue}
              >
                Tiếp tục — xem lại
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="job-proposal-btn job-proposal-btn--ghost"
                onClick={() => {
                  setSubmitError("");
                  setStep("form");
                }}
                disabled={submitting}
              >
                Quay lại chỉnh sửa
              </button>
              <button
                type="button"
                className="job-proposal-btn job-proposal-btn--primary"
                onClick={() => void handleSubmit()}
                disabled={submitting}
              >
                {submitting ? "Đang gửi..." : "Xác nhận gửi báo giá"}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
