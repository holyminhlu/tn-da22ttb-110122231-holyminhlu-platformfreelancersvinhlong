"use client";

import { useMemo, useState } from "react";
import {
  FaBoxOpen,
  FaCheckCircle,
  FaClipboardCheck,
  FaExternalLinkAlt,
  FaInfoCircle,
  FaLink,
  FaThumbsUp,
  FaUserClock,
} from "react-icons/fa";
import type { ContractMilestone, WorkflowContract } from "@/lib/api/contracts";
import { formatPackagePrice } from "@/lib/hire/servicePackages";
import { formatDate, formatVnd } from "@/lib/format";
import { formatTimelineDisplay, parseProposalSections } from "@/lib/orders/proposalDisplay";
import WorkflowDeadlineBanner from "./WorkflowDeadlineBanner";

type DeliveryAcceptancePanelProps = {
  contract: WorkflowContract;
  milestones: ContractMilestone[];
  isClient: boolean;
  busy: boolean;
  actionError?: string;
  counterpartyName: string;
  onMarkDelivered: () => void;
  onAcceptDelivery: () => void;
  onOpenDispute?: (reason: string) => void;
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
  counterpartyName,
  onMarkDelivered,
  onAcceptDelivery,
  onOpenDispute,
}: DeliveryAcceptancePanelProps) {
  const [acceptConfirmed, setAcceptConfirmed] = useState(false);
  const [deliverConfirmed, setDeliverConfirmed] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const isDelivered = Boolean(contract.delivered_at);
  const progressNote = contract.progress_note?.trim() || "";
  const demoUrl = contract.demo_url?.trim() || "";
  const agreedDisplay =
    contract.agreed_price != null ? formatVnd(contract.agreed_price) : "Thỏa thuận";

  const proposal = useMemo(
    () => parseProposalSections(contract.proposal_text || ""),
    [contract.proposal_text],
  );
  const timelineLabel = formatTimelineDisplay(proposal.timeline);

  return (
    <div className="hire-delivery">
      {contract.delivered_at && !contract.accepted_at ? (
        <WorkflowDeadlineBanner
          deadlineAt={contract.delivery_review_deadline_at}
          label={
            isClient
              ? "Hạn nghiệm thu — sau đó hệ thống tự nghiệm thu & giải ngân"
              : "Client cần nghiệm thu trước hạn"
          }
          variant="warn"
        />
      ) : null}
      {contract.auto_accepted_at ? (
        <div className="hire-sla-banner hire-sla-banner--info" role="status">
          <strong>Đã tự động nghiệm thu</strong>
          <span>Lúc {formatDate(contract.auto_accepted_at)}</span>
        </div>
      ) : null}
      <div className="hire-delivery__hero">
        <div className="hire-delivery__hero-text">
          <span className="hire-delivery__eyebrow">Giai đoạn 4</span>
          <h2 className="hire-delivery__title">Bàn giao & Nghiệm thu</h2>
          <p className="hire-delivery__lead">
            {isClient
              ? "Kiểm tra sản phẩm bàn giao, xác nhận đạt yêu cầu để chuyển sang hoàn tất và giải ngân."
              : "Client đang rà soát bàn giao. Chờ nghiệm thu để kết thúc hợp đồng."}
          </p>
        </div>
        <ul className="hire-delivery__steps" aria-label="Tiến trình bàn giao">
          <li className="hire-delivery__step hire-delivery__step--done">
            <span className="hire-delivery__step-icon" aria-hidden>
              <FaCheckCircle />
            </span>
            <span>Đã thực hiện xong</span>
          </li>
          <li
            className={`hire-delivery__step${isDelivered ? " hire-delivery__step--done" : " hire-delivery__step--current"}`}
          >
            <span className="hire-delivery__step-icon" aria-hidden>
              {isDelivered ? <FaCheckCircle /> : "2"}
            </span>
            <span>Freelancer bàn giao</span>
          </li>
          <li
            className={`hire-delivery__step${isDelivered && isClient ? " hire-delivery__step--current" : ""}${!isDelivered ? " hire-delivery__step--muted" : ""}`}
          >
            <span className="hire-delivery__step-icon" aria-hidden>3</span>
            <span>Client nghiệm thu</span>
          </li>
        </ul>
      </div>

      <div className="hire-delivery__grid">
        <aside className="hire-delivery__aside">
          <div className="hire-delivery__summary-card">
            <span className="hire-delivery__summary-label">Giá trị hợp đồng</span>
            <strong className="hire-delivery__summary-value">{agreedDisplay}</strong>
            {isDelivered && contract.delivered_at ? (
              <span className="hire-delivery__summary-meta">
                Bàn giao lúc {formatDate(contract.delivered_at)}
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
                  <dt>Thời gian cam kết</dt>
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
              <h3 className="hire-delivery__state-title">Đã gửi bàn giao</h3>
              <p className="hire-delivery__state-desc">
                Client đang kiểm tra sản phẩm và tài liệu bàn giao. Bạn sẽ được thông báo khi họ
                nghiệm thu.
              </p>
              {contract.delivered_at ? (
                <p className="hire-delivery__state-meta">
                  Gửi lúc {formatDate(contract.delivered_at)}
                </p>
              ) : null}
            </div>
          ) : null}

          {!isClient && !isDelivered ? (
            <div className="hire-delivery__work-card">
              <header className="hire-delivery__work-head">
                <FaBoxOpen className="hire-delivery__work-head-icon" aria-hidden />
                <div>
                  <h3 className="hire-delivery__work-title">Xác nhận bàn giao</h3>
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
                <span>Tôi xác nhận đã bàn giao đầy đủ theo thỏa thuận.</span>
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
              <h3 className="hire-delivery__state-title">Chờ freelancer bàn giao</h3>
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
                  <h3 className="hire-delivery__work-title">Nghiệm thu bàn giao</h3>
                  <p className="hire-delivery__work-sub">
                    Kiểm tra kỹ sản phẩm, demo và tài liệu. Nghiệm thu đồng nghĩa với chấp nhận
                    hoàn thành — bước tiếp theo là giải ngân Escrow.
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
                  <span className="hire-delivery__note-label">Ghi chú từ freelancer</span>
                  <p>{progressNote}</p>
                </div>
              ) : null}

              <label className="hire-delivery__confirm">
                <input
                  type="checkbox"
                  checked={acceptConfirmed}
                  onChange={(e) => setAcceptConfirmed(e.target.checked)}
                />
                <span>
                  Tôi xác nhận đã kiểm tra và <strong>nghiệm thu</strong> bàn giao — chấp nhận
                  chuyển sang giai đoạn hoàn tất.
                </span>
              </label>

              <footer className="hire-delivery__accept-foot">
                <button
                  type="button"
                  className="hire-delivery__btn hire-delivery__btn--success"
                  disabled={busy || !acceptConfirmed}
                  onClick={onAcceptDelivery}
                >
                  {busy ? "Đang xử lý..." : "Nghiệm thu → Hoàn tất"}
                </button>
              </footer>
            </div>
          ) : null}

          {isClient && onOpenDispute ? (
            <div className="hire-execution__cancel-box">
              <h4 className="hire-execution__revision-title">Mở tranh chấp</h4>
              <p className="hire-execution__revision-sub">
                Dùng khi sản phẩm không đạt thỏa thuận hoặc Freelancer không phản hồi yêu cầu sửa.
              </p>
              <textarea
                className="hire-execution__textarea"
                rows={2}
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
              />
              <button
                type="button"
                className="hire-execution__btn hire-execution__btn--outline"
                disabled={busy || disputeReason.trim().length < 10}
                onClick={() => onOpenDispute(disputeReason.trim())}
              >
                Mở tranh chấp
              </button>
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
