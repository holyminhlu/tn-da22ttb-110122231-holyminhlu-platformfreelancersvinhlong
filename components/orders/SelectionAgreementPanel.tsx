"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClipboardList,
  FaInfoCircle,
  FaPaperPlane,
  FaUserClock,
} from "react-icons/fa";
import type { ContractMilestone, WorkflowContract } from "@/lib/api/contracts";
import { formatPackagePrice } from "@/lib/hire/servicePackages";
import { formatDate, formatVnd } from "@/lib/format";
import WorkflowDeadlineBanner from "./WorkflowDeadlineBanner";
import {
  formatTimelineDisplay,
  parseProposalSections,
  parseTimelineDays,
} from "@/lib/orders/proposalDisplay";

type SelectionAgreementPanelProps = {
  contract: WorkflowContract;
  milestones: ContractMilestone[];
  isClient: boolean;
  hasProposal: boolean;
  busy: boolean;
  actionError?: string;
  counterpartyName: string;
  onSubmitProposal: (payload: { proposalText: string }) => void;
  onAcceptProposal: () => void;
  onWithdrawProposal?: () => void;
  onRejectProposal?: () => void;
  onCancelOrder?: () => void;
};

/** Số ngày làm việc / bàn giao dự kiến — người dùng chọn một mức */
const DELIVERY_DAY_OPTIONS = [1, 3, 5, 7, 10, 15, 20] as const;

const SECTION_MARKERS = {
  scope: "## Phạm vi & giải pháp",
  timeline: "## Tiến độ dự kiến",
} as const;

function formatTimelineLabel(days: number) {
  return `${days} ngày làm việc (dự kiến bàn giao)`;
}

function buildProposalText(scope: string, deliveryDays: number) {
  const blocks: string[] = [];
  const s = scope.trim();
  if (s) blocks.push(`${SECTION_MARKERS.scope}\n${s}`);
  blocks.push(`${SECTION_MARKERS.timeline}\n${formatTimelineLabel(deliveryDays)}`);
  return blocks.join("\n\n");
}

function ProposalSectionView({ title, body }: { title: string; body: string }) {
  if (!body.trim()) return null;
  return (
    <div className="hire-selection__proposal-block">
      <h4 className="hire-selection__proposal-block-title">{title}</h4>
      <p className="hire-selection__proposal-block-body">{body}</p>
    </div>
  );
}

export default function SelectionAgreementPanel({
  contract,
  milestones,
  isClient,
  hasProposal,
  busy,
  actionError,
  counterpartyName,
  onSubmitProposal,
  onAcceptProposal,
  onWithdrawProposal,
  onRejectProposal,
  onCancelOrder,
}: SelectionAgreementPanelProps) {
  const parsed = useMemo(
    () => parseProposalSections(contract.proposal_text || ""),
    [contract.proposal_text],
  );

  const [scope, setScope] = useState(parsed.scope);
  const [deliveryDays, setDeliveryDays] = useState<number | null>(() =>
    parseTimelineDays(parsed.timeline),
  );

  const agreedDisplay =
    contract.agreed_price != null ? formatVnd(contract.agreed_price) : "Thỏa thuận";

  const proposalSections = hasProposal ? parsed : null;
  const canSubmit = scope.trim().length >= 20 && deliveryDays != null;

  function handleSubmit() {
    if (deliveryDays == null) return;
    onSubmitProposal({ proposalText: buildProposalText(scope, deliveryDays) });
  }

  return (
    <div className="hire-selection">
      <WorkflowDeadlineBanner
        deadlineAt={contract.stage_deadline_at}
        label={
          hasProposal
            ? "Hạn Client chấp nhận đề xuất"
            : "Hạn Freelancer gửi đề xuất"
        }
      />
      <div className="hire-selection__hero">
        <div className="hire-selection__hero-text">
          <span className="hire-selection__eyebrow">Giai đoạn 1</span>
          <h2 className="hire-selection__title">Tiếp cận & Chốt thỏa thuận</h2>
          <p className="hire-selection__lead">
            {isClient
              ? "Xem đề xuất từ freelancer, trao đổi làm rõ yêu cầu, sau đó chấp nhận để chuyển sang ký quỹ (Escrow)."
              : "Trình bày phạm vi công việc và chọn thời gian hoàn thành dự kiến."}
          </p>
        </div>
        <ul className="hire-selection__steps" aria-label="Các bước trong giai đoạn">
          <li className={`hire-selection__step${hasProposal ? " hire-selection__step--done" : " hire-selection__step--current"}`}>
            <span className="hire-selection__step-icon" aria-hidden>
              {hasProposal ? <FaCheckCircle /> : "1"}
            </span>
            <span>Freelancer gửi đề xuất</span>
          </li>
          <li className={`hire-selection__step${hasProposal && isClient ? " hire-selection__step--current" : ""}${!hasProposal ? " hire-selection__step--muted" : ""}`}>
            <span className="hire-selection__step-icon" aria-hidden>2</span>
            <span>Client xem & chấp nhận</span>
          </li>
          <li className="hire-selection__step hire-selection__step--muted">
            <span className="hire-selection__step-icon" aria-hidden>3</span>
            <span>Nạp Escrow & bắt đầu</span>
          </li>
        </ul>
      </div>

      <div className="hire-selection__grid">
        <aside className="hire-selection__aside">
          <div className="hire-selection__context-card">
            <h3 className="hire-selection__context-title">
              <FaInfoCircle aria-hidden />
              Thông tin đơn hàng
            </h3>
            <dl className="hire-selection__meta">
              <div>
                <dt>{isClient ? "Freelancer" : "Khách hàng"}</dt>
                <dd>{counterpartyName || "—"}</dd>
              </div>
              <div>
                <dt>Giá tham chiếu</dt>
                <dd>{agreedDisplay}</dd>
              </div>
              {contract.proposal_submitted_at ? (
                <div>
                  <dt>Đề xuất gửi lúc</dt>
                  <dd>{formatDate(contract.proposal_submitted_at)}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          {contract.client_brief ? (
            <div className="hire-selection__context-card">
              <h3 className="hire-selection__context-title">
                <FaClipboardList aria-hidden />
                Yêu cầu từ Client
              </h3>
              <p className="hire-selection__brief">{contract.client_brief}</p>
            </div>
          ) : null}

          {milestones.length > 0 ? (
            <div className="hire-selection__context-card">
              <h3 className="hire-selection__context-title">Cột mốc dự kiến</h3>
              <ul className="hire-selection__milestones">
                {milestones.map((m, idx) => (
                  <li key={m.id}>
                    <span className="hire-selection__milestone-num">{idx + 1}</span>
                    <span className="hire-selection__milestone-body">
                      <strong>{m.title}</strong>
                      <span>{formatPackagePrice(Number(m.amount))}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>

        <div className="hire-selection__main">
          {!isClient && !hasProposal ? (
            <form
              className="hire-selection__form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <header className="hire-selection__form-head">
                <FaPaperPlane className="hire-selection__form-head-icon" aria-hidden />
                <div>
                  <h3 className="hire-selection__form-title">Gửi đề xuất cho Client</h3>
                  <p className="hire-selection__form-sub">
                    Mô tả phạm vi công việc và chọn số ngày bàn giao dự kiến.
                  </p>
                </div>
              </header>

              <div className="hire-selection__fields">
                <div className="hire-selection__field">
                  <label htmlFor="sel-scope">
                    <FaClipboardList aria-hidden />
                    Phạm vi & giải pháp <span className="hire-selection__required">*</span>
                  </label>
                  <span className="hire-selection__hint">
                    Mô tả cách làm, deliverables, công nghệ hoặc phương án triển khai.
                  </span>
                  <textarea
                    id="sel-scope"
                    className="hire-selection__textarea"
                    rows={5}
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    placeholder="Ví dụ: Thiết kế UI 5 màn, API Node.js, triển khai VPS..."
                    required
                    minLength={20}
                  />
                  <span className="hire-selection__counter">{scope.trim().length} ký tự (tối thiểu 20)</span>
                </div>

                <fieldset className="hire-selection__field">
                  <legend className="hire-selection__legend">
                    <FaCalendarAlt aria-hidden />
                    Tiến độ dự kiến <span className="hire-selection__required">*</span>
                  </legend>
                  <span className="hire-selection__hint">
                    Chọn thời gian hoàn thành dự kiến (ngày làm việc).
                  </span>
                  <div className="hire-selection__day-picker" role="radiogroup" aria-label="Số ngày dự kiến">
                    {DELIVERY_DAY_OPTIONS.map((days) => (
                      <button
                        key={days}
                        type="button"
                        role="radio"
                        aria-checked={deliveryDays === days}
                        className={`hire-selection__day-option${deliveryDays === days ? " hire-selection__day-option--active" : ""}`}
                        onClick={() => setDeliveryDays(days)}
                      >
                        {days} ngày
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>

              <footer className="hire-selection__form-foot">
                <button
                  type="submit"
                  className="hire-selection__btn hire-selection__btn--primary"
                  disabled={busy || !canSubmit}
                >
                  {busy ? "Đang gửi..." : "Gửi đề xuất cho Client"}
                </button>
                <p className="hire-selection__form-note">
                  Sau khi gửi, bạn có thể trao đổi thêm trước khi client chấp nhận.
                </p>
              </footer>
            </form>
          ) : null}

          {!isClient && hasProposal ? (
            <div className="hire-selection__state-card hire-selection__state-card--sent">
              <FaUserClock className="hire-selection__state-icon" aria-hidden />
              <h3 className="hire-selection__state-title">Đề xuất đã gửi</h3>
              <p className="hire-selection__state-desc">
                Client đang xem xét. Bạn có thể trao đổi thêm qua tin nhắn hoặc cuộc gọi trong lúc chờ phản hồi.
              </p>
              {contract.proposal_submitted_at ? (
                <p className="hire-selection__state-meta">
                  Gửi lúc {formatDate(contract.proposal_submitted_at)}
                </p>
              ) : null}
              {onWithdrawProposal ? (
                <button
                  type="button"
                  className="hire-selection__btn hire-selection__btn--outline"
                  disabled={busy}
                  onClick={onWithdrawProposal}
                >
                  Rút đề xuất
                </button>
              ) : null}
              <div className="hire-selection__proposal-preview">
                <ProposalSectionView title="Phạm vi & giải pháp" body={proposalSections?.scope ?? ""} />
                <ProposalSectionView
                  title="Tiến độ dự kiến"
                  body={formatTimelineDisplay(proposalSections?.timeline ?? "")}
                />
              </div>
            </div>
          ) : null}

          {isClient && !hasProposal ? (
            <div className="hire-selection__state-card hire-selection__state-card--wait">
              <FaUserClock className="hire-selection__state-icon" aria-hidden />
              <h3 className="hire-selection__state-title">Đang chờ đề xuất</h3>
              <p className="hire-selection__state-desc">
                Freelancer chưa gửi đề xuất. Bạn có thể nhắn hoặc gọi để làm rõ yêu cầu trước khi họ gửi form
                bên dưới.
              </p>
              <Link href="/help/employer" className="hire-selection__btn hire-selection__btn--outline">
                Hướng dẫn trao đổi với freelancer
              </Link>
            </div>
          ) : null}

          {isClient && hasProposal ? (
            <div className="hire-selection__review">
              <header className="hire-selection__review-head">
                <div>
                  <h3 className="hire-selection__form-title">Đề xuất từ Freelancer</h3>
                  <p className="hire-selection__form-sub">
                    Kiểm tra phạm vi và thời gian dự kiến trước khi chấp nhận — bước tiếp theo là nạp ký
                    quỹ Escrow.
                  </p>
                </div>
                {proposalSections?.timeline ? (
                  <div className="hire-selection__days-chip">
                    <span className="hire-selection__days-chip-label">Thời gian</span>
                    <strong>{formatTimelineDisplay(proposalSections.timeline)}</strong>
                  </div>
                ) : null}
              </header>

              <div className="hire-selection__proposal-doc">
                <ProposalSectionView title="Phạm vi & giải pháp" body={proposalSections?.scope ?? ""} />
                <ProposalSectionView
                  title="Tiến độ dự kiến"
                  body={formatTimelineDisplay(proposalSections?.timeline ?? "")}
                />
                {!proposalSections?.scope && contract.proposal_text ? (
                  <p className="hire-selection__proposal-block-body">{contract.proposal_text}</p>
                ) : null}
              </div>

              {contract.proposal_submitted_at ? (
                <p className="hire-selection__review-meta">
                  Nhận lúc {formatDate(contract.proposal_submitted_at)}
                </p>
              ) : null}

              <div className="hire-selection__review-actions">
                <button
                  type="button"
                  className="hire-selection__btn hire-selection__btn--primary"
                  disabled={busy}
                  onClick={onAcceptProposal}
                >
                  {busy ? "Đang xử lý..." : "Chấp nhận đề xuất"}
                </button>
                {onRejectProposal ? (
                  <button
                    type="button"
                    className="hire-selection__btn hire-selection__btn--outline"
                    disabled={busy}
                    onClick={onRejectProposal}
                  >
                    Từ chối đề xuất
                  </button>
                ) : null}
                {onCancelOrder ? (
                  <button
                    type="button"
                    className="hire-selection__btn hire-selection__btn--ghost"
                    disabled={busy}
                    onClick={onCancelOrder}
                  >
                    Hủy đơn
                  </button>
                ) : null}
                <Link href="/help/employer" className="hire-selection__btn hire-selection__btn--outline">
                  Cần trao đổi thêm?
                </Link>
              </div>
            </div>
          ) : null}

          {actionError ? (
            <p className="hire-selection__error" role="alert">
              {actionError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
