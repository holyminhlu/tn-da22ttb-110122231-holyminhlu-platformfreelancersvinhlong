"use client";

import { useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaClipboardCheck,
  FaExternalLinkAlt,
  FaInfoCircle,
  FaLink,
  FaPaperPlane,
  FaRedo,
  FaTasks,
} from "react-icons/fa";
import type { ContractMilestone, WorkflowContract } from "@/lib/api/contracts";
import { formatPackagePrice } from "@/lib/hire/servicePackages";
import { formatDate } from "@/lib/format";
import { formatTimelineDisplay, parseProposalSections } from "@/lib/orders/proposalDisplay";
import type { CancelRequest, ProgressHistoryEntry } from "@/lib/api/contracts";
import WorkflowDeadlineBanner from "./WorkflowDeadlineBanner";
import ProgressHistoryTimeline from "./ProgressHistoryTimeline";
import ClientVerifyNotice from "@/components/hire/ClientVerifyNotice";
import { CLIENT_VERIFY_PAYMENT_LEAD } from "@/lib/hire/clientVerification";
import { formatDeadlineCountdown } from "@/lib/orders/workflowSlaDisplay";
import RefundRequestForm from "./RefundRequestForm";
import DisputeOpenForm from "./DisputeOpenForm";
import type { OpenDisputePayload, RefundRequestPayload } from "@/lib/api/resolution";
import { isQuickRefundEligible } from "@/lib/orders/refundDisputeData";

type ExecutionReviewPanelProps = {
  contract: WorkflowContract;
  milestones: ContractMilestone[];
  isClient: boolean;
  busy: boolean;
  actionError?: string;
  paymentBlocked?: boolean;
  counterpartyName: string;
  progressHistory?: ProgressHistoryEntry[];
  cancelRequest?: CancelRequest | null;
  onUpdateProgress: (payload: { progressNote: string; demoUrl: string }) => void;
  onMarkDelivered: () => void;
  onRequestRevision: (revisionNote: string) => void;
  onRequestCancelRefund?: (payload: RefundRequestPayload) => void;
  onRespondCancelRequest?: (agree: boolean, responseNote?: string) => void;
  onOpenDispute?: (payload: OpenDisputePayload) => void;
};

function milestoneStatusLabel(status: string) {
  const s = String(status).toLowerCase();
  if (s === "funded") return "Sẵn sàng";
  if (s === "in_progress") return "Đang làm";
  if (s === "submitted") return "Đã nộp";
  if (s === "pending") return "Chờ";
  if (s === "approved" || s === "paid") return "Xong";
  return status;
}

export default function ExecutionReviewPanel({
  contract,
  milestones,
  isClient,
  busy,
  actionError,
  paymentBlocked = false,
  counterpartyName,
  progressHistory = [],
  onUpdateProgress,
  onMarkDelivered,
  onRequestRevision,
  cancelRequest,
  onRequestCancelRefund,
  onRespondCancelRequest,
  onOpenDispute,
}: ExecutionReviewPanelProps) {
  const [progressNote, setProgressNote] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [revisionNote, setRevisionNote] = useState("");
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);

  const latestProgressEntry = useMemo(() => {
    for (let i = progressHistory.length - 1; i >= 0; i -= 1) {
      if (progressHistory[i]?.entry_type === "progress") return progressHistory[i];
    }
    return null;
  }, [progressHistory]);

  const displayProgressNote =
    latestProgressEntry?.note?.trim() || contract.progress_note?.trim() || "";
  const displayDemoUrl = latestProgressEntry?.demo_url?.trim() || contract.demo_url?.trim() || "";

  const revisionsLimit = Number(contract.revisions_limit) || 2;
  const revisionsUsed = Number(contract.revisions_used) || 0;
  const revisionsLeft = Math.max(0, revisionsLimit - revisionsUsed);

  const proposal = useMemo(
    () => parseProposalSections(contract.proposal_text || ""),
    [contract.proposal_text],
  );
  const timelineLabel = formatTimelineDisplay(proposal.timeline);

  const hasProgress = Boolean(displayProgressNote);
  const hasDemo = Boolean(displayDemoUrl);
  const canRequestRevision = revisionsLeft > 0;

  const milestonesInProgress = milestones.filter((m) =>
    ["funded", "in_progress"].includes(String(m.status).toLowerCase()),
  );
  const milestonesDone = milestones.filter((m) =>
    ["submitted", "approved", "paid"].includes(String(m.status).toLowerCase()),
  );

  const quickRefundEligible = isQuickRefundEligible({
    escrow_status: contract.escrow_status,
    workflow_stage: contract.workflow_stage,
    delivered_at: contract.delivered_at,
    progress_entry_count: progressHistory.filter((e) => e.entry_type === "progress").length,
  });

  return (
    <div className="hire-execution">
      {paymentBlocked && isClient ? (
        <ClientVerifyNotice message={CLIENT_VERIFY_PAYMENT_LEAD} />
      ) : null}
      {cancelRequest ? (
        <div className="hire-sla-banner hire-sla-banner--warn" role="alert">
          <strong>
            {isClient ? "Yêu cầu hủy đang chờ Freelancer" : "Client yêu cầu hủy & hoàn tiền"}
          </strong>
          <span>
            {formatDeadlineCountdown(cancelRequest.respond_by_at) || "—"} · {cancelRequest.reason}
          </span>
          {!isClient && onRespondCancelRequest ? (
            <div className="hire-sla-banner__actions">
              <button
                type="button"
                className="hire-execution__btn hire-execution__btn--outline"
                disabled={busy}
                onClick={() => onRespondCancelRequest(true)}
              >
                Đồng ý hủy
              </button>
              <button
                type="button"
                className="hire-execution__btn hire-execution__btn--outline"
                disabled={busy}
                onClick={() => onRespondCancelRequest(false, "Phản đối — tiếp tục thực hiện")}
              >
                Phản đối
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="hire-execution__hero">
        <div className="hire-execution__hero-text">
          <span className="hire-execution__eyebrow">Giai đoạn 3</span>
          <h2 className="hire-execution__title">Thực hiện & Kiểm tra</h2>
          <p className="hire-execution__lead">
            {isClient
              ? "Theo dõi tiến độ, mở link demo staging và gửi phản hồi chỉnh sửa trong giới hạn gói."
              : "Cập nhật tiến độ thường xuyên, gửi link demo để client kiểm tra trước khi bàn giao."}
          </p>
        </div>
        <ul className="hire-execution__steps" aria-label="Tiến trình thực hiện">
          <li className="hire-execution__step hire-execution__step--done">
            <span className="hire-execution__step-icon" aria-hidden>
              <FaCheckCircle />
            </span>
            <span>Escrow đã nạp</span>
          </li>
          <li className="hire-execution__step hire-execution__step--current">
            <span className="hire-execution__step-icon" aria-hidden>2</span>
            <span>Thực hiện & kiểm tra</span>
          </li>
          <li className="hire-execution__step hire-execution__step--muted">
            <span className="hire-execution__step-icon" aria-hidden>3</span>
            <span>Bàn giao</span>
          </li>
        </ul>
      </div>

      <div className="hire-execution__grid">
        <aside className="hire-execution__aside">
          <div className="hire-execution__context-card">
            <h3 className="hire-execution__context-title">
              <FaInfoCircle aria-hidden />
              Hợp đồng
            </h3>
            <dl className="hire-execution__meta">
              <div>
                <dt>{isClient ? "Freelancer" : "Khách hàng"}</dt>
                <dd>{counterpartyName || "—"}</dd>
              </div>
              {timelineLabel !== "—" ? (
                <div>
                  <dt>Thời gian cam kết</dt>
                  <dd>{timelineLabel}</dd>
                </div>
              ) : null}
              {contract.funded_at ? (
                <div>
                  <dt>Bắt đầu từ</dt>
                  <dd>{formatDate(contract.funded_at)}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          {isClient ? (
            <div className="hire-execution__revision-card">
              <span className="hire-execution__revision-label">Lượt chỉnh sửa còn lại</span>
              <strong className="hire-execution__revision-value">
                {revisionsLeft}
                <span className="hire-execution__revision-total"> / {revisionsLimit}</span>
              </strong>
              <div
                className="hire-execution__revision-bar"
                role="progressbar"
                aria-valuenow={revisionsLeft}
                aria-valuemin={0}
                aria-valuemax={revisionsLimit}
              >
                <span
                  className="hire-execution__revision-fill"
                  style={{ width: `${(revisionsLeft / revisionsLimit) * 100}%` }}
                />
              </div>
            </div>
          ) : null}

          {milestones.length > 0 ? (
            <div className="hire-execution__context-card">
              <h3 className="hire-execution__context-title">
                <FaTasks aria-hidden />
                Cột mốc
              </h3>
              <ul className="hire-execution__milestones">
                {milestones.map((m, idx) => (
                  <li key={m.id}>
                    <span className="hire-execution__milestone-num">{idx + 1}</span>
                    <span className="hire-execution__milestone-body">
                      <strong>{m.title}</strong>
                      <span>{formatPackagePrice(Number(m.amount))}</span>
                    </span>
                    <span
                      className={`hire-execution__milestone-badge hire-execution__milestone-badge--${m.status}`}
                    >
                      {milestoneStatusLabel(m.status)}
                    </span>
                  </li>
                ))}
              </ul>
              {milestonesInProgress.length > 0 ? (
                <p className="hire-execution__milestone-hint">
                  {milestonesInProgress.length} mốc đang thực hiện
                  {milestonesDone.length > 0 ? ` · ${milestonesDone.length} đã hoàn thành` : ""}
                </p>
              ) : null}
            </div>
          ) : null}
        </aside>

        <div className="hire-execution__main">
          {progressHistory.length > 0 ? (
            <ProgressHistoryTimeline entries={progressHistory} highlightLatest />
          ) : null}

          {!isClient ? (
            <div className="hire-execution__work-card">
              <header className="hire-execution__work-head">
                <FaPaperPlane className="hire-execution__work-head-icon" aria-hidden />
                <div>
                  <h3 className="hire-execution__work-title">Cập nhật tiến độ</h3>
                  <p className="hire-execution__work-sub">
                    {progressHistory.length > 0
                      ? "Gửi bản cập nhật mới — lịch sử các lần trước vẫn được giữ bên trên."
                      : "Ghi chú những gì đã làm và gửi link demo (staging) để client kiểm tra."}
                  </p>
                </div>
              </header>

              <div className="hire-execution__fields">
                <div className="hire-execution__field">
                  <label htmlFor="exec-progress">
                    <FaClipboardCheck aria-hidden />
                    Ghi chú tiến độ
                  </label>
                  <span className="hire-execution__hint">
                    Ví dụ: Hoàn thành trang chủ, đang tích hợp API thanh toán…
                  </span>
                  <textarea
                    id="exec-progress"
                    className="hire-execution__textarea"
                    rows={5}
                    value={progressNote}
                    onChange={(e) => setProgressNote(e.target.value)}
                    placeholder="Mô tả ngắn gọn công việc đã hoàn thành và bước tiếp theo..."
                  />
                </div>

                <div className="hire-execution__field">
                  <label htmlFor="exec-demo">
                    <FaLink aria-hidden />
                    Link demo (staging)
                  </label>
                  <span className="hire-execution__hint">URL bản xem trước — client mở trực tiếp.</span>
                  <input
                    id="exec-demo"
                    type="url"
                    className="hire-execution__input"
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    placeholder="https://staging.example.com"
                  />
                </div>
              </div>

              <footer className="hire-execution__work-foot">
                <button
                  type="button"
                  className="hire-execution__btn hire-execution__btn--primary"
                  disabled={busy || (!hasProgress && !hasDemo)}
                  onClick={() => {
                    onUpdateProgress({
                      progressNote: progressNote.trim(),
                      demoUrl: demoUrl.trim(),
                    });
                    setProgressNote("");
                    setDemoUrl("");
                  }}
                >
                  {busy ? "Đang lưu..." : "Lưu tiến độ & demo"}
                </button>
              </footer>

              <div className="hire-execution__delivery-block">
                <h4 className="hire-execution__delivery-title">Sẵn sàng bàn giao?</h4>
                <p className="hire-execution__delivery-desc">
                  Chỉ gửi bàn giao khi client đã duyệt qua demo và không còn chỉnh sửa lớn. Bước tiếp
                  theo là giai đoạn Nghiệm thu.
                </p>
                <label className="hire-execution__confirm">
                  <input
                    type="checkbox"
                    checked={deliveryConfirmed}
                    onChange={(e) => setDeliveryConfirmed(e.target.checked)}
                  />
                  <span>Tôi xác nhận sản phẩm đã sẵn sàng bàn giao cho Client.</span>
                </label>
                <button
                  type="button"
                  className="hire-execution__btn hire-execution__btn--success"
                  disabled={busy || !deliveryConfirmed}
                  onClick={onMarkDelivered}
                >
                  {busy ? "Đang gửi..." : "Gửi bàn giao → Sang nghiệm thu"}
                </button>
              </div>
            </div>
          ) : null}

          {isClient ? (
            <div className="hire-execution__review-card">
              <header className="hire-execution__review-head">
                <h3 className="hire-execution__work-title">Tiến độ từ Freelancer</h3>
                <p className="hire-execution__work-sub">
                  Xem các bản cập nhật theo thời gian và phản hồi nếu cần chỉnh sửa trước khi bàn
                  giao.
                </p>
              </header>

              {progressHistory.length === 0 && (hasProgress || hasDemo) ? (
                <div className="hire-execution__status-feed hire-execution__status-feed--latest">
                  <p className="hire-execution__latest-label">Bản cập nhật mới nhất</p>
                  {hasProgress ? (
                    <div className="hire-execution__feed-item">
                      <span className="hire-execution__feed-label">Ghi chú tiến độ</span>
                      <p className="hire-execution__feed-body">{displayProgressNote}</p>
                    </div>
                  ) : null}
                  {hasDemo ? (
                    <div className="hire-execution__feed-item hire-execution__feed-item--demo">
                      <span className="hire-execution__feed-label">Link demo</span>
                      <a
                        href={displayDemoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hire-execution__demo-link"
                      >
                        {displayDemoUrl}
                        <FaExternalLinkAlt aria-hidden />
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : progressHistory.length === 0 ? (
                <div className="hire-execution__empty-feed">
                  <p>Freelancer chưa cập nhật tiến độ hoặc chưa gửi link demo.</p>
                </div>
              ) : null}

              <div className="hire-execution__revision-form">
                <header className="hire-execution__revision-head">
                  <FaRedo aria-hidden />
                  <div>
                    <h4 className="hire-execution__revision-title">Yêu cầu chỉnh sửa</h4>
                    <p className="hire-execution__revision-sub">
                      {canRequestRevision
                        ? `Bạn còn ${revisionsLeft} lượt trong gói. Mô tả rõ phần cần sửa.`
                        : "Đã hết lượt chỉnh sửa trong gói. Trao đổi trực tiếp hoặc chuyển sang bàn giao."}
                    </p>
                  </div>
                </header>
                <textarea
                  className="hire-execution__textarea"
                  rows={4}
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  placeholder="Ví dụ: Nút Đăng ký chưa đúng màu brand, form liên hệ thiếu validation..."
                  disabled={!canRequestRevision}
                />
                <button
                  type="button"
                  className="hire-execution__btn hire-execution__btn--outline"
                  disabled={busy || !canRequestRevision || !revisionNote.trim()}
                  onClick={() => onRequestRevision(revisionNote.trim())}
                >
                  {busy ? "Đang gửi..." : "Gửi yêu cầu chỉnh sửa"}
                </button>
              </div>
            </div>
          ) : null}

          {isClient && !cancelRequest && onRequestCancelRefund ? (
            <div className="hire-execution__cancel-box">
              <RefundRequestForm
                agreedPrice={contract.agreed_price}
                eligible={quickRefundEligible}
                busy={busy || paymentBlocked}
                onSubmit={onRequestCancelRefund}
              />
            </div>
          ) : null}

          {onOpenDispute ? (
            <div className="hire-execution__cancel-box">
              <DisputeOpenForm busy={busy} onSubmit={onOpenDispute} />
            </div>
          ) : null}

          {actionError ? (
            <p className="hire-execution__error" role="alert">
              {actionError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
