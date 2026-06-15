"use client";

import { useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaHandHoldingUsd,
  FaInfoCircle,
  FaMoneyCheckAlt,
  FaStar,
  FaTrophy,
  FaUserClock,
} from "react-icons/fa";
import type { ContractMilestone, WorkflowContract } from "@/lib/api/contracts";
import { formatDate, formatVnd } from "@/lib/format";
import ClientVerifyNotice from "@/components/hire/ClientVerifyNotice";
import { CLIENT_VERIFY_PAYMENT_LEAD } from "@/lib/hire/clientVerification";

type ContractReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

type CompletionReviewPanelProps = {
  contract: WorkflowContract;
  milestones: ContractMilestone[];
  isClient: boolean;
  busy: boolean;
  actionError?: string;
  paymentBlocked?: boolean;
  counterpartyName: string;
  review: ContractReview | null;
  onReleasePayment: () => void;
  onSubmitReview: (payload: { rating: number; comment?: string }) => void;
};

const STAR_LABELS = ["Rất tệ", "Tệ", "Ổn", "Tốt", "Xuất sắc"] as const;

export default function CompletionReviewPanel({
  contract,
  milestones,
  isClient,
  busy,
  actionError,
  paymentBlocked = false,
  counterpartyName,
  review,
  onReleasePayment,
  onSubmitReview,
}: CompletionReviewPanelProps) {
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [releaseConfirmed, setReleaseConfirmed] = useState(false);
  const [hoverStar, setHoverStar] = useState(0);

  const escrowStatus = String(contract.escrow_status || "none").toLowerCase();
  const isReleased = escrowStatus === "released";
  const hasReview = Boolean(review);

  const agreedAmount = Number(contract.agreed_price) || 0;
  const agreedDisplay = agreedAmount > 0 ? formatVnd(agreedAmount) : "Thỏa thuận";

  const milestonesPaid = useMemo(
    () => milestones.filter((m) => ["paid", "approved"].includes(String(m.status).toLowerCase())).length,
    [milestones],
  );

  const displayStar = hoverStar || rating;

  return (
    <div className="hire-completion">
      {paymentBlocked && isClient ? (
        <ClientVerifyNotice message={CLIENT_VERIFY_PAYMENT_LEAD} />
      ) : null}
      <div className="hire-completion__hero">
        <div className="hire-completion__hero-text">
          <span className="hire-completion__eyebrow">Giai đoạn 5</span>
          <h2 className="hire-completion__title">Kết thúc & Đánh giá</h2>
          <p className="hire-completion__lead">
            {isClient
              ? "Giải ngân Escrow cho freelancer và để lại đánh giá công khai để hoàn tất hợp đồng."
              : "Chờ client giải ngân và (nếu có) đánh giá. Cảm ơn bạn đã hoàn thành dự án!"}
          </p>
        </div>
        <ul className="hire-completion__steps" aria-label="Tiến trình kết thúc">
          <li className="hire-completion__step hire-completion__step--done">
            <span className="hire-completion__step-icon" aria-hidden>
              <FaCheckCircle />
            </span>
            <span>Đã nghiệm thu</span>
          </li>
          <li
            className={`hire-completion__step${isReleased ? " hire-completion__step--done" : " hire-completion__step--current"}`}
          >
            <span className="hire-completion__step-icon" aria-hidden>
              {isReleased ? <FaCheckCircle /> : "2"}
            </span>
            <span>Giải ngân</span>
          </li>
          <li
            className={`hire-completion__step${hasReview ? " hire-completion__step--done" : isReleased && isClient ? " hire-completion__step--current" : " hire-completion__step--muted"}`}
          >
            <span className="hire-completion__step-icon" aria-hidden>
              {hasReview ? <FaCheckCircle /> : "3"}
            </span>
            <span>Đánh giá</span>
          </li>
        </ul>
      </div>

      {contract.auto_accepted_at ? (
        <div className="hire-sla-banner hire-sla-banner--info" role="status">
          Đã tự động nghiệm thu lúc {formatDate(contract.auto_accepted_at)} — tiền Escrow có thể đã
          giải ngân theo SLA.
        </div>
      ) : null}

      <div className="hire-completion__grid">
        <aside className="hire-completion__aside">
          <div className="hire-completion__summary-card">
            <FaTrophy className="hire-completion__trophy" aria-hidden />
            <span className="hire-completion__summary-label">Hợp đồng hoàn tất</span>
            <strong className="hire-completion__summary-value">{agreedDisplay}</strong>
            {contract.accepted_at ? (
              <span className="hire-completion__summary-meta">
                Nghiệm thu {formatDate(contract.accepted_at)}
              </span>
            ) : null}
          </div>

          <div className="hire-completion__context-card">
            <h3 className="hire-completion__context-title">
              <FaInfoCircle aria-hidden />
              Tóm tắt
            </h3>
            <dl className="hire-completion__meta">
              <div>
                <dt>{isClient ? "Freelancer" : "Khách hàng"}</dt>
                <dd>{counterpartyName || "—"}</dd>
              </div>
              <div>
                <dt>Trạng thái Escrow</dt>
                <dd className={isReleased ? "hire-completion__meta--success" : ""}>
                  {isReleased ? "Đã giải ngân" : "Chờ giải ngân"}
                </dd>
              </div>
              {contract.released_at ? (
                <div>
                  <dt>Giải ngân lúc</dt>
                  <dd>{formatDate(contract.released_at)}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          {milestones.length > 0 ? (
            <div className="hire-completion__context-card">
              <h3 className="hire-completion__context-title">Cột mốc</h3>
              <p className="hire-completion__milestone-stat">
                {milestonesPaid}/{milestones.length} đã thanh toán
              </p>
            </div>
          ) : null}
        </aside>

        <div className="hire-completion__main">
          {isClient && !isReleased ? (
            <div className="hire-completion__release-card">
              <header className="hire-completion__card-head">
                <FaHandHoldingUsd className="hire-completion__card-icon" aria-hidden />
                <div>
                  <h3 className="hire-completion__card-title">Giải ngân cho Freelancer</h3>
                  <p className="hire-completion__card-sub">
                    Chuyển số tiền ký quỹ từ Escrow sang ví freelancer. Hành động này không thể hoàn
                    tác.
                  </p>
                </div>
              </header>

              <div className="hire-completion__amount-box">
                <span className="hire-completion__amount-label">Số tiền giải ngân</span>
                <span className="hire-completion__amount-value">{agreedDisplay}</span>
              </div>

              <ul className="hire-completion__checklist">
                <li>
                  <FaCheckCircle aria-hidden />
                  Bạn đã nghiệm thu bàn giao ở giai đoạn trước
                </li>
                <li>
                  <FaCheckCircle aria-hidden />
                  Tiền sẽ chuyển vào tài khoản VND của freelancer
                </li>
              </ul>

              <label className="hire-completion__confirm">
                <input
                  type="checkbox"
                  checked={releaseConfirmed}
                  disabled={paymentBlocked}
                  onChange={(e) => setReleaseConfirmed(e.target.checked)}
                />
                <span>
                  Tôi xác nhận giải ngân <strong>{agreedDisplay}</strong> cho freelancer.
                </span>
              </label>

              <button
                type="button"
                className="hire-completion__btn hire-completion__btn--primary"
                disabled={busy || !releaseConfirmed || agreedAmount <= 0 || paymentBlocked}
                onClick={onReleasePayment}
              >
                {busy ? "Đang xử lý..." : "Xác nhận giải ngân"}
              </button>
            </div>
          ) : null}

          {isClient && isReleased && !hasReview ? (
            <div className="hire-completion__review-card">
              <header className="hire-completion__card-head">
                <FaStar className="hire-completion__card-icon hire-completion__card-icon--star" aria-hidden />
                <div>
                  <h3 className="hire-completion__card-title">Đánh giá Freelancer</h3>
                  <p className="hire-completion__card-sub">
                    Đánh giá công khai giúp cộng đồng chọn freelancer phù hợp hơn (tùy chọn nhận
                    xét).
                  </p>
                </div>
              </header>

              <div className="hire-completion__stars" role="group" aria-label="Chọn số sao">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`hire-completion__star-btn${n <= displayStar ? " hire-completion__star-btn--on" : ""}`}
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverStar(n)}
                    onMouseLeave={() => setHoverStar(0)}
                    aria-label={`${n} sao — ${STAR_LABELS[n - 1]}`}
                    aria-pressed={rating === n}
                  >
                    <FaStar aria-hidden />
                  </button>
                ))}
                <span className="hire-completion__star-label">{STAR_LABELS[displayStar - 1]}</span>
              </div>

              <div className="hire-completion__field">
                <label htmlFor="completion-review-comment">Nhận xét (tùy chọn)</label>
                <textarea
                  id="completion-review-comment"
                  className="hire-completion__textarea"
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Chia sẻ trải nghiệm làm việc với freelancer này..."
                />
              </div>

              <button
                type="button"
                className="hire-completion__btn hire-completion__btn--success"
                disabled={busy || rating < 1}
                onClick={() =>
                  onSubmitReview({
                    rating,
                    comment: reviewComment.trim() || undefined,
                  })
                }
              >
                {busy ? "Đang gửi..." : "Gửi đánh giá"}
              </button>
            </div>
          ) : null}

          {isClient && isReleased && hasReview && review ? (
            <div className="hire-completion__done-card">
              <FaCheckCircle className="hire-completion__done-icon" aria-hidden />
              <h3 className="hire-completion__done-title">Đã hoàn tất toàn bộ</h3>
              <p className="hire-completion__done-desc">
                Đã giải ngân và gửi đánh giá. Cảm ơn bạn đã sử dụng nền tảng.
              </p>
              <div className="hire-completion__review-display">
                <div className="hire-completion__review-stars" aria-label={`${review.rating} trên 5 sao`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <FaStar
                      key={n}
                      className={n <= review.rating ? "hire-completion__star-filled" : "hire-completion__star-empty"}
                      aria-hidden
                    />
                  ))}
                </div>
                {review.comment ? <p className="hire-completion__review-comment">{review.comment}</p> : null}
                <span className="hire-completion__review-date">
                  Đánh giá lúc {formatDate(review.created_at)}
                </span>
              </div>
            </div>
          ) : null}

          {!isClient && !isReleased ? (
            <div className="hire-completion__state-card hire-completion__state-card--wait">
              <FaUserClock className="hire-completion__state-icon" aria-hidden />
              <h3 className="hire-completion__state-title">Chờ Client giải ngân</h3>
              <p className="hire-completion__state-desc">
                Client sẽ chuyển <strong>{agreedDisplay}</strong> từ Escrow sang ví của bạn. Sau đó
                họ có thể để lại đánh giá công khai.
              </p>
            </div>
          ) : null}

          {!isClient && isReleased && !hasReview ? (
            <div className="hire-completion__state-card hire-completion__state-card--success">
              <FaMoneyCheckAlt className="hire-completion__state-icon" aria-hidden />
              <h3 className="hire-completion__state-title">Đã nhận giải ngân</h3>
              <p className="hire-completion__state-desc">
                Client đã giải ngân thành công. Cảm ơn bạn đã hoàn thành dự án — đánh giá từ client
                có thể xuất hiện trên hồ sơ của bạn.
              </p>
              {contract.released_at ? (
                <p className="hire-completion__state-meta">
                  Giải ngân lúc {formatDate(contract.released_at)}
                </p>
              ) : null}
            </div>
          ) : null}

          {!isClient && isReleased && hasReview && review ? (
            <div className="hire-completion__state-card hire-completion__state-card--success">
              <FaStar className="hire-completion__state-icon hire-completion__state-icon--star" aria-hidden />
              <h3 className="hire-completion__state-title">Client đã đánh giá bạn</h3>
              <div className="hire-completion__review-display">
                <div className="hire-completion__review-stars" aria-label={`${review.rating} trên 5 sao`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <FaStar
                      key={n}
                      className={n <= review.rating ? "hire-completion__star-filled" : "hire-completion__star-empty"}
                      aria-hidden
                    />
                  ))}
                </div>
                {review.comment ? <p className="hire-completion__review-comment">{review.comment}</p> : null}
              </div>
            </div>
          ) : null}

          {actionError ? (
            <p className="hire-completion__error" role="alert">
              {actionError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
