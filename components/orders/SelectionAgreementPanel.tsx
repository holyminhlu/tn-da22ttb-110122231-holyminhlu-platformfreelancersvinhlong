"use client";

import { formatDateUi, tUi, formatVndUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaClipboardList,
  FaInfoCircle,
  FaPaperPlane,
  FaTimesCircle,
  FaUserClock,
} from "react-icons/fa";
import type { ContractMilestone, WorkflowContract } from "@/lib/api/contracts";
import { formatPackagePrice } from "@/lib/hire/servicePackages";
import WorkflowDeadlineBanner from "./WorkflowDeadlineBanner";
import ProposalDocumentView from "./ProposalDocumentView";
import ProposalSectionView from "./ProposalSectionView";
import {
  parseProposalSections,
  parseTimelineDays,
  resolveProposalTimelineLabel,
} from "@/lib/orders/proposalDisplay";

type SelectionAgreementPanelProps = {
  contract: WorkflowContract;
  milestones: ContractMilestone[];
  isClient: boolean;
  hasProposal: boolean;
  busy: boolean;
  actionError?: string;
  counterpartyName: string;
  onSubmitProposal: (payload: { proposalText: string; deliveryDays: number }) => void;
  onAcceptProposal: () => void;
  onWithdrawProposal?: () => void;
  onRejectProposal?: (reason: string) => void;
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
}: SelectionAgreementPanelProps) {  const { t, formatVnd, formatDate } = useTranslation();

  const parsed = useMemo(
    () => parseProposalSections(contract.proposal_text || ""),
    [contract.proposal_text],
  );

  const hasRejection =
    !isClient && !hasProposal && Boolean(contract.last_rejected_proposal_text?.trim());

  const rejectedParsed = useMemo(
    () => parseProposalSections(contract.last_rejected_proposal_text || ""),
    [contract.last_rejected_proposal_text],
  );

  const [scope, setScope] = useState(parsed.scope);
  const [deliveryDays, setDeliveryDays] = useState<number | null>(() =>
    parseTimelineDays(parsed.timeline),
  );
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (hasProposal || isClient) return;
    const next = parseProposalSections(contract.proposal_text || "");
    setScope(next.scope);
    setDeliveryDays(parseTimelineDays(next.timeline));
  }, [contract.proposal_text, hasProposal, isClient]);

  useEffect(() => {
    if (!hasProposal) {
      setRejectOpen(false);
      setRejectReason("");
    }
  }, [hasProposal]);

  const agreedDisplay =
    contract.agreed_price != null ? formatVndUi(contract.agreed_price) : "Thỏa thuận";

  const proposalSections = hasProposal ? parsed : null;
  const timelineLabel = hasProposal
    ? resolveProposalTimelineLabel(
        contract.proposal_text || "",
        parsed,
        contract.proposal_delivery_days,
      )
    : "—";
  const canSubmit = scope.trim().length >= 20 && deliveryDays != null;

  function handleSubmit() {
    if (deliveryDays == null) return;
    onSubmitProposal({ proposalText: buildProposalText(scope, deliveryDays), deliveryDays });
  }

  return (
    <div className="hire-selection">
      <WorkflowDeadlineBanner
        deadlineAt={contract.stage_deadline_at}
        label={
          hasProposal
            ? "Hạn Khách hàng chấp nhận đề xuất"
            : "Hạn Freelancer gửi đề xuất"
        }
      />
      <div className="hire-selection__hero">
        <div className="hire-selection__hero-text">
          <span className="hire-selection__eyebrow">{t("Giai đoạn 1")}</span>
          <h2 className="hire-selection__title">{t("Tiếp cận & Chốt thỏa thuận")}</h2>
          <p className="hire-selection__lead">
            {isClient
              ? "Xem đề xuất từ freelancer, trao đổi làm rõ yêu cầu, sau đó chấp nhận để chuyển sang ký quỹ (Escrow)."
              : hasRejection
                ? "Khách hàng đã từ chối đề xuất trước. Xem lý do và nội dung cũ, sau đó gửi đề xuất mới."
                : "Trình bày phạm vi công việc và chọn thời gian hoàn thành dự kiến."}
          </p>
        </div>
        <ul className="hire-selection__steps" aria-label={t("Các bước trong giai đoạn")}>
          <li className={`hire-selection__step${hasProposal ? " hire-selection__step--done" : hasRejection ? " hire-selection__step--rejected" : " hire-selection__step--current"}`}>
            <span className="hire-selection__step-icon" aria-hidden>
              {hasProposal ? <FaCheckCircle /> : hasRejection ? <FaTimesCircle /> : "1"}
            </span>
            <span>{t("Freelancer gửi đề xuất")}</span>
          </li>
          <li className={`hire-selection__step${hasProposal && isClient ? " hire-selection__step--current" : ""}${!hasProposal ? " hire-selection__step--muted" : ""}`}>
            <span className="hire-selection__step-icon" aria-hidden>2</span>
            <span>{t("Khách hàng xem & chấp nhận")}</span>
          </li>
          <li className="hire-selection__step hire-selection__step--muted">
            <span className="hire-selection__step-icon" aria-hidden>3</span>
            <span>{t("Nạp Escrow & bắt đầu")}</span>
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
                <dt>{t("Giá tham chiếu")}</dt>
                <dd>{agreedDisplay}</dd>
              </div>
              {contract.proposal_submitted_at ? (
                <div>
                  <dt>{t("Đề xuất gửi lúc")}</dt>
                  <dd>{formatDateUi(contract.proposal_submitted_at)}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          {contract.client_brief ? (
            <div className="hire-selection__context-card">
              <h3 className="hire-selection__context-title">
                <FaClipboardList aria-hidden />
                Yêu cầu từ Khách hàng
              </h3>
              <p className="hire-selection__brief">{contract.client_brief}</p>
            </div>
          ) : null}

          {milestones.length > 0 ? (
            <div className="hire-selection__context-card">
              <h3 className="hire-selection__context-title">{t("Cột mốc dự kiến")}</h3>
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
          {!isClient && !hasProposal && hasRejection ? (
            <div className="hire-selection__state-card hire-selection__state-card--rejected">
              <FaTimesCircle className="hire-selection__state-icon" aria-hidden />
              <h3 className="hire-selection__state-title">{t("Đề xuất trước bị Khách hàng từ chối")}</h3>
              {contract.last_rejected_proposal_at ? (
                <p className="hire-selection__state-meta">
                  Từ chối lúc {formatDateUi(contract.last_rejected_proposal_at)}
                </p>
              ) : null}
              <div className="hire-selection__rejection-reason">
                <h4 className="hire-selection__rejection-reason-title">{t("Lý do từ chối")}</h4>
                <p className="hire-selection__rejection-reason-body">
                  {contract.proposal_rejection_note?.trim()
                    ? contract.proposal_rejection_note
                    : "Khách hàng không ghi lý do cụ thể. Bạn có thể trao đổi thêm qua tin nhắn trước khi gửi đề xuất mới."}
                </p>
              </div>
              <div className="hire-selection__proposal-preview">
                <p className="hire-selection__rejection-preview-label">{t("Nội dung đề xuất đã gửi")}</p>
                <ProposalSectionView title={t("Phạm vi & giải pháp")} body={rejectedParsed.scope} />
                <ProposalSectionView
                  title={t("Tiến độ dự kiến")}
                  body={resolveProposalTimelineLabel(
                    contract.last_rejected_proposal_text || "",
                    rejectedParsed,
                  )}
                  collapsible={false}
                />
                {!rejectedParsed.scope && contract.last_rejected_proposal_text ? (
                  <p className="hire-selection__proposal-block-body">
                    {contract.last_rejected_proposal_text}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

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
                  <h3 className="hire-selection__form-title">
                    {hasRejection ? "Gửi đề xuất mới" : "Gửi đề xuất cho Khách hàng"}
                  </h3>
                  <p className="hire-selection__form-sub">
                    {hasRejection
                      ? "Điều chỉnh phạm vi hoặc tiến độ theo phản hồi của Khách hàng, rồi gửi lại."
                      : "Mô tả phạm vi công việc và chọn số ngày bàn giao dự kiến."}
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
                    placeholder={t("Ví dụ: Thiết kế UI 5 màn, API Node.js, triển khai VPS...")}
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
                  <div className="hire-selection__day-picker" role="radiogroup" aria-label={t("Số ngày dự kiến")}>
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
                  {busy ? "Đang gửi..." : hasRejection ? "Gửi đề xuất mới" : "Gửi đề xuất cho Khách hàng"}
                </button>
                <p className="hire-selection__form-note">
                  Sau khi gửi, bạn có thể trao đổi thêm trước khi khách hàng chấp nhận.
                </p>
              </footer>
            </form>
          ) : null}

          {!isClient && hasProposal ? (
            <div className="hire-selection__state-card hire-selection__state-card--sent">
              <FaUserClock className="hire-selection__state-icon" aria-hidden />
              <h3 className="hire-selection__state-title">{t("Đề xuất đã gửi")}</h3>
              <p className="hire-selection__state-desc">
                Khách hàng đang xem xét. Bạn có thể trao đổi thêm qua tin nhắn hoặc cuộc gọi trong lúc chờ phản hồi.
              </p>
              {contract.proposal_submitted_at ? (
                <p className="hire-selection__state-meta">
                  Gửi lúc {formatDateUi(contract.proposal_submitted_at)}
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
                <ProposalDocumentView
                  proposalText={contract.proposal_text || ""}
                  deliveryDays={contract.proposal_delivery_days}
                />
              </div>
            </div>
          ) : null}

          {isClient && !hasProposal ? (
            <div className="hire-selection__state-card hire-selection__state-card--wait">
              <FaUserClock className="hire-selection__state-icon" aria-hidden />
              <h3 className="hire-selection__state-title">{t("Đang chờ đề xuất")}</h3>
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
            <div className="hire-selection__review" id="de-xuat">
              <header className="hire-selection__review-head">
                <div>
                  <h3 className="hire-selection__form-title">{t("Đề xuất từ Freelancer")}</h3>
                  <p className="hire-selection__form-sub">
                    Kiểm tra phạm vi và thời gian dự kiến trước khi chấp nhận — bước tiếp theo là nạp ký
                    quỹ Escrow.
                  </p>
                </div>
                {timelineLabel !== "—" ? (
                  <div className="hire-selection__days-chip">
                    <span className="hire-selection__days-chip-label">{t("Thời gian dự kiến")}</span>
                    <strong>{timelineLabel}</strong>
                  </div>
                ) : null}
              </header>

              <div className="hire-selection__proposal-doc">
                <ProposalDocumentView
                  proposalText={contract.proposal_text || ""}
                  deliveryDays={contract.proposal_delivery_days}
                />
              </div>

              {contract.proposal_submitted_at ? (
                <p className="hire-selection__review-meta">
                  Nhận lúc {formatDateUi(contract.proposal_submitted_at)}
                </p>
              ) : null}

              {rejectOpen && onRejectProposal ? (
                <form
                  className="hire-selection__reject-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    onRejectProposal(rejectReason.trim());
                  }}
                >
                  <button
                    type="button"
                    className="hire-selection__reject-back"
                    disabled={busy}
                    onClick={() => {
                      setRejectOpen(false);
                      setRejectReason("");
                    }}
                  >
                    <FaArrowLeft aria-hidden />
                    Quay lại
                  </button>
                  <h4 className="hire-selection__reject-title">{t("Từ chối đề xuất")}</h4>
                  <p className="hire-selection__reject-lead">
                    Ghi rõ lý do để freelancer điều chỉnh và gửi đề xuất mới. Bạn có thể để trống nếu
                    muốn trao đổi trực tiếp qua tin nhắn.
                  </p>
                  <label className="hire-selection__field" htmlFor="sel-reject-reason">
                    <span>{t("Lý do từ chối (tùy chọn)")}</span>
                    <textarea
                      id="sel-reject-reason"
                      className="hire-selection__textarea"
                      rows={4}
                      maxLength={2000}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder={t("Ví dụ: Tiến độ 5 ngày quá gấp, cần bổ sung phần bảo trì sau bàn giao...")}
                      disabled={busy}
                    />
                    <span className="hire-selection__counter">{rejectReason.length}/2000</span>
                  </label>
                  <div className="hire-selection__reject-actions">
                    <button
                      type="submit"
                      className="hire-selection__btn hire-selection__btn--danger"
                      disabled={busy}
                    >
                      {busy ? "Đang xử lý..." : "Xác nhận từ chối"}
                    </button>
                    <button
                      type="button"
                      className="hire-selection__btn hire-selection__btn--outline"
                      disabled={busy}
                      onClick={() => {
                        setRejectOpen(false);
                        setRejectReason("");
                      }}
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              ) : (
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
                      onClick={() => setRejectOpen(true)}
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
              )}
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
