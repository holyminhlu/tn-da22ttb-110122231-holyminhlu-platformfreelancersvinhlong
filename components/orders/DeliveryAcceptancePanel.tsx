"use client";

import { formatDateUi, formatVndUi, tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { useMemo, useState } from "react";
import {
  FaBoxOpen,
  FaCheckCircle,
  FaClipboardCheck,
  FaExternalLinkAlt,
  FaInfoCircle,
  FaLink,
  FaPauseCircle,
  FaThumbsUp,
  FaUserClock,
} from "react-icons/fa";
import type { CancelRequest, ContractMilestone, WorkflowContract } from "@/lib/api/contracts";
import { formatPackagePrice } from "@/lib/hire/servicePackages";
import { formatTimelineDisplay, parseProposalSections } from "@/lib/orders/proposalDisplay";
import WorkflowDeadlineBanner from "./WorkflowDeadlineBanner";
import ClientVerifyNotice from "@/components/hire/ClientVerifyNotice";
import { CLIENT_VERIFY_PAYMENT_LEAD } from "@/lib/hire/clientVerification";
import ResolutionActionChooser from "./ResolutionActionChooser";
import type { OpenDisputePayload } from "@/lib/api/resolution";
import { formatDeadlineCountdown } from "@/lib/orders/workflowSlaDisplay";

type DeliveryAcceptancePanelProps = {
  contract: WorkflowContract;
  milestones: ContractMilestone[];
  isClient: boolean;
  busy: boolean;
  actionError?: string;
  paymentBlocked?: boolean;
  counterpartyName: string;
  /** Khách hàng vẫn ở giai đoạn 3 khi freelancer đã bàn giao, chưa nghiệm thu. */
  clientPendingInStage3?: boolean;
  cancelRequest?: CancelRequest | null;
  onMarkDelivered: () => void;
  onAcceptDelivery: () => void;
  onRespondCancelRequest?: (agree: boolean, responseNote?: string) => void;
  onOpenDispute?: (payload: OpenDisputePayload) => void;
};

function milestoneStatusLabel(status: string) {
  const s = String(status).toLowerCase();
  if (s === "submitted") return "Đã bàn giao";
  if (s === "approved" || s === "paid") return "Đã duyệt";
  if (s === "in_progress") return "Đang làm";
  if (s === "funded") return "Sẵn sàng";
  return status;
}

export default function DeliveryAcceptancePanel({
  contract,
  milestones,
  isClient,
  busy,
  actionError,
  paymentBlocked = false,
  counterpartyName,
  clientPendingInStage3 = false,
  cancelRequest = null,
  onMarkDelivered,
  onAcceptDelivery,
  onRespondCancelRequest,
  onOpenDispute,
}: DeliveryAcceptancePanelProps) {  const { t, formatVnd, formatDate } = useTranslation();

  const [acceptConfirmed, setAcceptConfirmed] = useState(false);
  const [deliverConfirmed, setDeliverConfirmed] = useState(false);

  const isDelivered = Boolean(contract.delivered_at);
  const progressNote = contract.progress_note?.trim() || "";
  const demoUrl = contract.demo_url?.trim() || "";
  const agreedDisplay =
    contract.agreed_price != null ? formatVndUi(contract.agreed_price) : "Thỏa thuận";

  const proposal = useMemo(
    () => parseProposalSections(contract.proposal_text || ""),
    [contract.proposal_text],
  );
  const timelineLabel = formatTimelineDisplay(proposal.timeline);

  const workFrozen = Boolean(cancelRequest);

  const stageEyebrow = clientPendingInStage3 ? "Giai đoạn 3" : "Giai đoạn 4";
  const stageTitle = clientPendingInStage3 ? "Thực hiện & Kiểm tra" : "Bàn giao & Nghiệm thu";
  const stageLead = workFrozen
    ? isClient
      ? "Đơn đang tạm dừng trong lúc chờ xử lý hoàn tiền. Bạn có thể xem bàn giao đã gửi nhưng chưa thể nghiệm thu."
      : "Đơn đang tạm dừng. Vui lòng phản hồi yêu cầu hoàn tiền của Khách hàng trước khi tiếp tục."
    : clientPendingInStage3
      ? "Freelancer đã gửi sản phẩm cuối. Kiểm tra kỹ và nghiệm thu để chuyển sang giai đoạn tiếp theo."
      : isClient
        ? "Kiểm tra sản phẩm bàn giao, xác nhận đạt yêu cầu để chuyển sang hoàn tất và giải ngân."
        : "Khách hàng đang rà soát bàn giao. Chờ nghiệm thu để kết thúc hợp đồng.";

  return (
    <div className="hire-delivery">
      {paymentBlocked && isClient ? (
        <ClientVerifyNotice message={CLIENT_VERIFY_PAYMENT_LEAD} />
      ) : null}
      {cancelRequest ? (
        <div className="hire-sla-banner hire-sla-banner--warn" role="alert">
          <strong>
            {isClient
              ? "Đơn tạm dừng — chờ Freelancer phản hồi hoàn tiền"
              : "Đơn tạm dừng — Khách hàng yêu cầu hủy & hoàn tiền"}
          </strong>
          <span>
            Bàn giao, nghiệm thu và tranh chấp bị khóa cho đến khi có quyết định.{" "}
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
                onClick={() => onRespondCancelRequest(false, "Phản đối — chuyển tranh chấp")}
              >
                Từ chối → Tranh chấp
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      {contract.delivered_at && !contract.accepted_at && !workFrozen ? (
        <WorkflowDeadlineBanner
          deadlineAt={contract.delivery_review_deadline_at}
          label={
            isClient
              ? "Hạn nghiệm thu — sau đó hệ thống tự nghiệm thu & giải ngân"
              : "Khách hàng cần nghiệm thu trước hạn"
          }
          variant="warn"
        />
      ) : null}
      {contract.auto_accepted_at ? (
        <div className="hire-sla-banner hire-sla-banner--info" role="status">
          <strong>{t("Đã tự động nghiệm thu")}</strong>
          <span>Lúc {formatDateUi(contract.auto_accepted_at)}</span>
        </div>
      ) : null}
      <div className="hire-delivery__hero">
        <div className="hire-delivery__hero-text">
          <span className="hire-delivery__eyebrow">{stageEyebrow}</span>
          <h2 className="hire-delivery__title">{stageTitle}</h2>
          <p className="hire-delivery__lead">{stageLead}</p>
        </div>
        <ul className="hire-delivery__steps" aria-label={t("Tiến trình bàn giao")}>
          <li className="hire-delivery__step hire-delivery__step--done">
            <span className="hire-delivery__step-icon" aria-hidden>
              <FaCheckCircle />
            </span>
            <span>{t("Đã thực hiện xong")}</span>
          </li>
          <li
            className={`hire-delivery__step${isDelivered ? " hire-delivery__step--done" : " hire-delivery__step--current"}`}
          >
            <span className="hire-delivery__step-icon" aria-hidden>
              {isDelivered ? <FaCheckCircle /> : "2"}
            </span>
            <span>{t("Freelancer bàn giao")}</span>
          </li>
          <li
            className={`hire-delivery__step${isDelivered && isClient ? " hire-delivery__step--current" : ""}${!isDelivered ? " hire-delivery__step--muted" : ""}`}
          >
            <span className="hire-delivery__step-icon" aria-hidden>3</span>
            <span>{t("Khách hàng nghiệm thu")}</span>
          </li>
        </ul>
      </div>

      <div className="hire-delivery__grid">
        <aside className="hire-delivery__aside">
          <div className="hire-delivery__summary-card">
            <span className="hire-delivery__summary-label">{t("Giá trị hợp đồng")}</span>
            <strong className="hire-delivery__summary-value">{agreedDisplay}</strong>
            {isDelivered && contract.delivered_at ? (
              <span className="hire-delivery__summary-meta">
                Bàn giao lúc {formatDateUi(contract.delivered_at)}
              </span>
            ) : null}
          </div>

          <div className="hire-delivery__context-card">
            <h3 className="hire-delivery__context-title">
              <FaInfoCircle aria-hidden />
              Thông tin
            </h3>
            <dl className="hire-delivery__meta">
              <div>
                <dt>{isClient ? "Freelancer" : "Khách hàng"}</dt>
                <dd>{counterpartyName || "—"}</dd>
              </div>
              {timelineLabel !== "—" ? (
                <div>
                  <dt>{t("Thời gian cam kết")}</dt>
                  <dd>{timelineLabel}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          {(progressNote || demoUrl) && (
            <div className="hire-delivery__context-card">
              <h3 className="hire-delivery__context-title">
                <FaClipboardCheck aria-hidden />
                Bàn giao gần nhất
              </h3>
              {progressNote ? (
                <p className="hire-delivery__brief">{progressNote}</p>
              ) : null}
              {demoUrl ? (
                <a
                  href={demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hire-delivery__demo-link"
                >
                  {demoUrl}
                  <FaExternalLinkAlt aria-hidden />
                </a>
              ) : null}
            </div>
          )}

          {milestones.length > 0 ? (
            <div className="hire-delivery__context-card">
              <h3 className="hire-delivery__context-title">
                <FaBoxOpen aria-hidden />
                Cột mốc
              </h3>
              <ul className="hire-delivery__milestones">
                {milestones.map((m, idx) => (
                  <li key={m.id}>
                    <span className="hire-delivery__milestone-num">{idx + 1}</span>
                    <span className="hire-delivery__milestone-body">
                      <strong>{m.title}</strong>
                      <span>{formatPackagePrice(Number(m.amount))}</span>
                    </span>
                    <span
                      className={`hire-delivery__milestone-badge hire-delivery__milestone-badge--${m.status}`}
                    >
                      {milestoneStatusLabel(m.status)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>

        <div className="hire-delivery__main">
          {!isClient && isDelivered ? (
            <div className="hire-delivery__state-card hire-delivery__state-card--sent">
              <FaUserClock className="hire-delivery__state-icon" aria-hidden />
              <h3 className="hire-delivery__state-title">{t("Đã gửi bàn giao")}</h3>
              <p className="hire-delivery__state-desc">
                Khách hàng đang kiểm tra sản phẩm và tài liệu bàn giao. Bạn sẽ được thông báo khi họ
                nghiệm thu.
              </p>
              {contract.delivered_at ? (
                <p className="hire-delivery__state-meta">
                  Gửi lúc {formatDateUi(contract.delivered_at)}
                </p>
              ) : null}
            </div>
          ) : null}

          {!isClient && workFrozen && !isDelivered ? (
            <div className="hire-execution__frozen-card">
              <FaPauseCircle className="hire-execution__frozen-icon" aria-hidden />
              <h3 className="hire-execution__frozen-title">{t("Công việc tạm dừng")}</h3>
              <p className="hire-execution__frozen-desc">
                Khách hàng đã gửi yêu cầu hoàn tiền. Bạn không thể xác nhận bàn giao cho đến khi phản
                hồi ở banner phía trên.
              </p>
            </div>
          ) : null}

          {!isClient && !isDelivered && !workFrozen ? (
            <div className="hire-delivery__work-card">
              <header className="hire-delivery__work-head">
                <FaBoxOpen className="hire-delivery__work-head-icon" aria-hidden />
                <div>
                  <h3 className="hire-delivery__work-title">{t("Xác nhận bàn giao")}</h3>
                  <p className="hire-delivery__work-sub">
                    Gửi thông báo bàn giao chính thức khi đã chuyển đủ file, mã nguồn hoặc triển khai
                    production.
                  </p>
                </div>
              </header>
              <label className="hire-delivery__confirm">
                <input
                  type="checkbox"
                  checked={deliverConfirmed}
                  onChange={(e) => setDeliverConfirmed(e.target.checked)}
                />
                <span>{t("Tôi xác nhận đã bàn giao đầy đủ theo thỏa thuận.")}</span>
              </label>
              <button
                type="button"
                className="hire-delivery__btn hire-delivery__btn--primary"
                disabled={busy || !deliverConfirmed}
                onClick={onMarkDelivered}
              >
                {busy ? "Đang gửi..." : "Xác nhận đã bàn giao"}
              </button>
            </div>
          ) : null}

          {isClient && !isDelivered ? (
            <div className="hire-delivery__state-card hire-delivery__state-card--wait">
              <FaUserClock className="hire-delivery__state-icon" aria-hidden />
              <h3 className="hire-delivery__state-title">{t("Chờ freelancer bàn giao")}</h3>
              <p className="hire-delivery__state-desc">
                Freelancer chưa gửi xác nhận bàn giao. Bạn có thể nhắc họ hoàn tất và gửi tài liệu
                cuối cùng.
              </p>
            </div>
          ) : null}

          {isClient && isDelivered ? (
            <div className="hire-delivery__accept-card">
              <header className="hire-delivery__accept-head">
                <FaThumbsUp className="hire-delivery__accept-head-icon" aria-hidden />
                <div>
                  <h3 className="hire-delivery__work-title">{t("Nghiệm thu bàn giao")}</h3>
                  <p className="hire-delivery__work-sub">
                    {workFrozen
                      ? "Không thể nghiệm thu khi đang chờ xử lý yêu cầu hoàn tiền."
                      : "Kiểm tra kỹ sản phẩm, demo và tài liệu. Nghiệm thu đồng nghĩa với chấp nhận hoàn thành — bước tiếp theo là giải ngân Escrow."}
                  </p>
                </div>
              </header>

              <ul className="hire-delivery__checklist">
                <li>
                  <FaCheckCircle aria-hidden />
                  Đã xem qua link demo / bản chạy thử (nếu có)
                </li>
                <li>
                  <FaCheckCircle aria-hidden />
                  Sản phẩm đáp ứng phạm vi đã thỏa thuận
                </li>
                <li>
                  <FaCheckCircle aria-hidden />
                  Không còn lỗi nghiêm trọng cần sửa trong gói
                </li>
              </ul>

              {demoUrl ? (
                <div className="hire-delivery__demo-box">
                  <span className="hire-delivery__demo-label">
                    <FaLink aria-hidden />
                    Link kiểm tra
                  </span>
                  <a
                    href={demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hire-delivery__demo-link hire-delivery__demo-link--large"
                  >
                    Mở bản demo
                    <FaExternalLinkAlt aria-hidden />
                  </a>
                </div>
              ) : null}

              {progressNote ? (
                <div className="hire-delivery__note-box">
                  <span className="hire-delivery__note-label">{t("Ghi chú từ freelancer")}</span>
                  <p>{progressNote}</p>
                </div>
              ) : null}

              <label className="hire-delivery__confirm">
                <input
                  type="checkbox"
                  checked={acceptConfirmed}
                  disabled={paymentBlocked || workFrozen}
                  onChange={(e) => setAcceptConfirmed(e.target.checked)}
                />
                <span>
                  Tôi xác nhận đã kiểm tra và <strong>{t("nghiệm thu")}</strong> bàn giao — chấp nhận
                  chuyển sang giai đoạn hoàn tất.
                </span>
              </label>

              <footer className="hire-delivery__accept-foot">
                <button
                  type="button"
                  className="hire-delivery__btn hire-delivery__btn--success"
                  disabled={busy || !acceptConfirmed || paymentBlocked || workFrozen}
                  onClick={onAcceptDelivery}
                >
                  {busy
                    ? "Đang xử lý..."
                    : clientPendingInStage3
                      ? "Nghiệm thu → Giai đoạn 4"
                      : "Nghiệm thu → Hoàn tất"}
                </button>
              </footer>
            </div>
          ) : null}

          {isClient && onOpenDispute && !workFrozen ? (
            <div className="hire-execution__cancel-box">
              <ResolutionActionChooser
                busy={busy || paymentBlocked}
                showDispute
                onOpenDispute={onOpenDispute}
              />
            </div>
          ) : null}

          {actionError ? (
            <p className="hire-delivery__error" role="alert">
              {actionError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
