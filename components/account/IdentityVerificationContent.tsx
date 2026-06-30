"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaCamera,
  FaCheck,
  FaEnvelope,
  FaIdCard,
  FaMapMarkerAlt,
  FaPhoneAlt,
} from "react-icons/fa";
import { getMe, type MeUser } from "@/lib/api/users";
import {
  getIdentityVerification,
  patchIdentityVerification,
  cancelCardVerifyPayment,
  type IdentityVerificationResponse,
} from "@/lib/api/identityVerification";
import CreditCardVerifyPanel from "./identity-verification/CreditCardVerifyPanel";
import IdentityReviewStatusBanner, {
  getAdminReviewStatus,
} from "./identity-verification/IdentityReviewStatusBanner";
import VerifyDetailPanel from "./identity-verification/VerifyDetailPanel";
import {
  buildVerifyItems,
  defaultSelectedId,
  type VerifyItemId,
} from "./identity-verification/types";
import "./identity-verification.css";

export type { VerifyItemId };

type VerifyStep = 1 | 2 | 3;

const STEPS: { id: VerifyStep; title: string }[] = [
  { id: 1, title: "Thông tin nhận dạng" },
  { id: 2, title: "Xác minh thẻ tín dụng" },
  { id: 3, title: "Gửi để xem xét" },
];

function resolveVerifyStep(
  items: ReturnType<typeof buildVerifyItems>,
  idv: IdentityVerificationResponse,
): VerifyStep {
  const submitted = Boolean(idv.verification?.submitted_for_review_at);
  const allDone = items.every((i) => i.completed);
  const cardVerified = Boolean(idv.verification?.card_verified_at);

  if (submitted) return 3;
  if (cardVerified && allDone) return 3;
  if (allDone) return 2;
  return 1;
}

const RING_RADIUS = 14;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const CARD_ICONS: Record<VerifyItemId, (done: boolean) => React.ReactNode> = {
  phone: (done) =>
    done ? (
      <FaCheck className="idv-card__icon--done" aria-hidden />
    ) : (
      <FaPhoneAlt className="idv-card__icon--muted" aria-hidden />
    ),
  contact: () => <FaEnvelope className="idv-card__icon--active" aria-hidden />,
  photo: () => <FaCamera className="idv-card__icon--muted" aria-hidden />,
  id_document: () => <FaIdCard className="idv-card__icon--muted" aria-hidden />,
  address_proof: () => <FaMapMarkerAlt className="idv-card__icon--muted" aria-hidden />,
};

export default function IdentityVerificationContent() {
  const { t } = useTranslation();

  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<MeUser | null>(null);
  const [idvData, setIdvData] = useState<IdentityVerificationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<VerifyStep>(1);
  const [selectedId, setSelectedId] = useState<VerifyItemId>("contact");
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [pendingOrderCode, setPendingOrderCode] = useState<number | null>(null);
  const prevCompletedCountRef = useRef(0);
  const prevCardVerifiedRef = useRef(false);

  const verifyPayment = searchParams.get("verifyPayment");
  const returnOrderCode = Number(searchParams.get("orderCode"));

  const load = useCallback(async (opts?: { preserveStep?: boolean }) => {
    setLoading(true);
    setLoadError("");
    try {
      const [me, idv] = await Promise.all([getMe(), getIdentityVerification()]);
      setUser(me.user);
      setIdvData(idv);
      const items = buildVerifyItems(me.user, idv);
      setSelectedId(defaultSelectedId(items));
      if (!opts?.preserveStep) {
        setActiveStep(resolveVerifyStep(items, idv));
      }
      prevCompletedCountRef.current = items.filter((i) => i.completed).length;
      prevCardVerifiedRef.current = Boolean(idv.verification?.card_verified_at);
    } catch (err) {
      setUser(null);
      setIdvData(null);
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể kết nối API. Kiểm tra backend (port 5000) đang chạy.";
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("vlc_access_token") : null;
    if (!token) {
      router.replace("/dang-nhap");
      return;
    }
    void load();
  }, [load, router]);

  useEffect(() => {
    if (!Number.isFinite(returnOrderCode)) return;

    if (verifyPayment === "success") {
      setActiveStep(2);
      setPendingOrderCode(returnOrderCode);
      return;
    }

    if (verifyPayment === "cancel") {
      setActiveStep(2);
      void cancelCardVerifyPayment(returnOrderCode).catch(() => {});
      router.replace("/edit-account/xac-minh");
    }
  }, [verifyPayment, returnOrderCode, router]);

  const clearPaymentQuery = useCallback(() => {
    setPendingOrderCode(null);
    router.replace("/edit-account/xac-minh");
  }, [router]);

  const reloadPreservingStep = useCallback(() => void load({ preserveStep: true }), [load]);

  const items = useMemo(() => buildVerifyItems(user, idvData), [user, idvData]);
  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;
  const ringOffset = RING_CIRCUMFERENCE * (1 - completedCount / totalCount);
  const cardVerified = Boolean(idvData?.verification?.card_verified_at);
  const allItemsDone = completedCount === totalCount;

  useEffect(() => {
    if (loading || !idvData) return;

    const justFinishedItems =
      activeStep === 1 &&
      allItemsDone &&
      prevCompletedCountRef.current < totalCount &&
      completedCount >= totalCount;

    const justVerifiedCard =
      activeStep === 2 && cardVerified && !prevCardVerifiedRef.current;

    if (justFinishedItems) {
      setActiveStep(2);
    } else if (justVerifiedCard) {
      setActiveStep(3);
    }

    prevCompletedCountRef.current = completedCount;
    prevCardVerifiedRef.current = cardVerified;
  }, [
    activeStep,
    allItemsDone,
    cardVerified,
    completedCount,
    idvData,
    loading,
    totalCount,
  ]);

  const reviewStatus = getAdminReviewStatus(idvData);
  const submittedForReview = Boolean(idvData?.verification?.submitted_for_review_at);
  const isApproved = reviewStatus === "approved";
  const isPendingReview = submittedForReview && reviewStatus === "pending";
  const isRejected = reviewStatus === "rejected";

  async function handleSubmitReview() {
    if (isApproved) return;
    setSubmitting(true);
    try {
      await patchIdentityVerification({ submitForReview: true });
      await load({ preserveStep: true });
      setActiveStep(3);
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể gửi.";
      window.alert(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="idv-loading">Đang tải...</p>;
  }

  if (!idvData) {
    const isMissingTable =
      loadError.includes("identity_verifications") || loadError.includes("42P01");
    return (
      <div className="idv-error" role="alert">
        <p>Không thể tải dữ liệu xác minh.</p>
        {loadError ? <p style={{ marginTop: "0.5rem" }}>{loadError}</p> : null}
        {isMissingTable ? (
          <p style={{ marginTop: "0.5rem", fontSize: "0.8125rem" }}>
            Chạy <code>backend/sql/identity_verification.sql</code> và{" "}
            <code>backend/sql/identity_verification_credit_card.sql</code> trên PostgreSQL.
          </p>
        ) : (
          <p style={{ marginTop: "0.5rem", fontSize: "0.8125rem" }}>
            Thường do backend chưa chạy — kiểm tra terminal backend (port 5000).
          </p>
        )}
        <button
          type="button"
          className="idv-start idv-start--secondary"
          style={{ marginTop: "1rem" }}
          onClick={() => void load()}
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="idv-page">
      <IdentityReviewStatusBanner data={idvData} />

      <div className="idv-steps" role="list" aria-label="Các bước xác minh">
        {STEPS.map((step) => {
          const isActive = step.id === activeStep;
          const stepComplete =
            step.id === 1
              ? allItemsDone
              : step.id === 2
                ? cardVerified
                : submittedForReview;
          return (
            <button
              key={step.id}
              type="button"
              role="listitem"
              className={`idv-step${isActive ? " idv-step--active" : " idv-step--inactive"}${stepComplete ? " idv-step--done" : ""}`}
              onClick={() => setActiveStep(step.id)}
              aria-current={isActive ? "step" : undefined}
            >
              <span className="idv-step__num">{step.id}</span>
              <span className="idv-step__title">{step.title}</span>
            </button>
          );
        })}
      </div>

      {activeStep === 1 ? (
        <div className="idv-panel">
          <div className="idv-panel__head">
            <h1 className="idv-panel__title">Thông tin nhận dạng</h1>
            <div className="idv-progress">
              <svg className="idv-progress__ring" viewBox="0 0 32 32" aria-hidden>
                <circle className="idv-progress__track" cx="16" cy="16" r={RING_RADIUS} />
                <circle
                  className="idv-progress__fill"
                  cx="16"
                  cy="16"
                  r={RING_RADIUS}
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={ringOffset}
                />
              </svg>
              <span>
                Đã hoàn thành {completedCount}/{totalCount}
              </span>
            </div>
          </div>
          {isApproved ? (
            <p className="idv-intro idv-intro--muted">
              Hồ sơ đã được duyệt — bạn có thể xem lại thông tin bên dưới.
            </p>
          ) : submittedForReview ? (
            <p className="idv-intro idv-intro--muted">
              Hồ sơ đã gửi xem xét. Bạn vẫn có thể chỉnh sửa tại đây cho đến khi admin duyệt.
            </p>
          ) : null}
          {!isApproved && !submittedForReview ? (
            <p className="idv-intro">Vui lòng cung cấp các thông tin sau:</p>
          ) : null}

          <div className="idv-grid">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`idv-card${selectedId === item.id ? " idv-card--selected" : ""}${item.completed ? " idv-card--done" : ""}`}
                onClick={() => setSelectedId(item.id)}
                aria-pressed={selectedId === item.id}
              >
                {item.completed ? <span className="idv-card__badge">Đã xong</span> : null}
                <div className="idv-card__icon">{CARD_ICONS[item.id](item.completed)}</div>
                <h3 className="idv-card__title">{item.title}</h3>
                <p className="idv-card__desc">{item.description}</p>
              </button>
            ))}
          </div>

          <div className="idv-detail-wrap">
            <VerifyDetailPanel
              selectedId={selectedId}
              data={idvData}
              onSaved={reloadPreservingStep}
              readOnly={isApproved}
            />
          </div>

          {allItemsDone && !isApproved ? (
            <p className="idv-footer__hint idv-footer__hint--success" role="status">
              Đã hoàn thành tất cả mục nhận dạng. Chuyển sang bước xác minh thẻ tín dụng.
            </p>
          ) : null}

          {!isApproved ? (
          <div className="idv-footer">
            <button
              type="button"
              className="idv-start idv-start--secondary"
              onClick={() => {
                const el = document.querySelector(".idv-detail-wrap");
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Bắt đầu xác minh
            </button>
            <p className="idv-footer__hint">
              Quá trình xác minh dễ dàng hơn trên thiết bị di động.{" "}
              <Link href={`mailto:${user?.email ?? ""}`}>Hãy gửi đường dẫn đến email của chính bạn.</Link>
            </p>
          </div>
          ) : null}
        </div>
      ) : activeStep === 2 ? (
        <div className="idv-panel">
          <h1 className="idv-panel__title">Xác minh thẻ tín dụng</h1>
          {isApproved ? (
            <p className="idv-intro idv-intro--muted">
              Hồ sơ đã được duyệt — bạn có thể xem lại thông tin thẻ bên dưới.
            </p>
          ) : submittedForReview ? (
            <p className="idv-intro idv-intro--muted">
              Hồ sơ đã gửi xem xét. Bạn có thể xem lại thẻ cho đến khi admin duyệt.
            </p>
          ) : null}
          <CreditCardVerifyPanel
            data={idvData}
            onSaved={reloadPreservingStep}
            pendingOrderCode={pendingOrderCode}
            onPaymentPollComplete={clearPaymentQuery}
            readOnly={isApproved}
          />
          {cardVerified && !isApproved ? (
            <p className="idv-footer__hint idv-footer__hint--success" role="status">
              Thẻ đã xác minh. Chuyển sang bước gửi hồ sơ để xem xét.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="idv-panel">
          <h1 className="idv-panel__title">Gửi để xem xét</h1>

          {isApproved ? (
            <>
              <p className="idv-intro">
                Hồ sơ xác minh của bạn đã được admin phê duyệt. Không cần gửi lại trừ khi có yêu
                cầu cập nhật từ hệ thống.
              </p>
              <Link href="/findwork" className="idv-start idv-start--inline">
                Đi tìm việc ngay
              </Link>
            </>
          ) : isPendingReview ? (
            <>
              <p className="idv-intro">
                Hồ sơ của bạn đang trong hàng đợi duyệt. Bạn có thể quay lại bước 1 hoặc 2 để xem
                hoặc chỉnh sửa — mọi cập nhật sẽ được gửi lại cho admin. Hoàn thành{" "}
                {completedCount}/{totalCount} mục xác minh.
              </p>
              <button
                type="button"
                className="idv-start idv-start--secondary"
                disabled={submitting}
                onClick={() => void handleSubmitReview()}
              >
                {submitting ? "Đang gửi..." : "Gửi lại để xem xét"}
              </button>
            </>
          ) : (
            <>
              <p className="idv-intro">
                {isRejected
                  ? "Admin đã từ chối hồ sơ trước đó. Vui lòng kiểm tra ghi chú ở trên, cập nhật thông tin rồi gửi lại."
                  : "Hoàn thành 5 mục xác minh trước khi gửi."}{" "}
                Bạn đã hoàn thành {completedCount}/{totalCount} mục.
              </p>
              <button
                type="button"
                className="idv-start"
                disabled={completedCount < totalCount || !cardVerified || submitting}
                onClick={() => void handleSubmitReview()}
              >
                {submitting
                  ? "Đang gửi..."
                  : isRejected
                    ? "Gửi lại để xem xét"
                    : "Gửi để xem xét"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
