"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import {
  getContractWorkflow,
  patchContractWorkflow,
  reviewContract,
  type ContractWorkflowResponse,
} from "@/lib/api/contracts";
import { formatPackagePrice } from "@/lib/hire/servicePackages";
import { formatDate } from "@/lib/format";
import { useClientIdentityVerification } from "@/hooks/useClientIdentityVerification";
import EscrowFundPanel from "./EscrowFundPanel";
import CompletionReviewPanel from "./CompletionReviewPanel";
import DeliveryAcceptancePanel from "./DeliveryAcceptancePanel";
import ExecutionReviewPanel from "./ExecutionReviewPanel";
import SelectionAgreementPanel from "./SelectionAgreementPanel";
import { cancelTypeLabel, isContractDisputed, isOrderExpiredOrCancelled } from "@/lib/orders/workflowSlaDisplay";
import { disputeCenterPath } from "@/lib/orders/resolutionLinks";
import "../hire/hire.css";
import "../hire/hire-freelancer-detail.css";
import "../hire/hire-order-workflow.css";
import "../manage/manage.css";

type ServiceOrderWorkflowProps = {
  backHref: string;
  backLabel: string;
};

const STAGES = [
  {
    id: "selection",
    label: "Giai đoạn 1",
    title: "Tiếp cận & Chốt thỏa thuận",
    clientHint:
      "Chờ freelancer gửi đề xuất (proposal). Trao đổi qua chat/call để làm rõ yêu cầu, sau đó chấp nhận đề xuất.",
    freelancerHint: "Gửi đề xuất kỹ thuật, tiến độ và ngân sách cho Client.",
  },
  {
    id: "escrow",
    label: "Giai đoạn 2",
    title: "Khởi tạo hợp đồng & Ký quỹ",
    clientHint: "Nạp tiền Escrow vào sàn. Freelancer chỉ bắt đầu khi trạng thái Funded.",
    freelancerHint: "Chờ Client nạp ký quỹ. Khi Funded bạn có thể bắt đầu làm việc.",
  },
  {
    id: "execution",
    label: "Giai đoạn 3",
    title: "Thực hiện & Kiểm tra",
    clientHint: "Theo dõi tiến độ, xem demo staging, yêu cầu chỉnh sửa trong giới hạn gói.",
    freelancerHint: "Cập nhật tiến độ, gửi link demo. Điều chỉnh theo phản hồi Client.",
  },
  {
    id: "delivery",
    label: "Giai đoạn 4",
    title: "Bàn giao & Nghiệm thu",
    clientHint: "Kiểm tra sản phẩm cuối, báo lỗi nếu có, sau đó nghiệm thu.",
    freelancerHint: "Đóng gói bàn giao (mã nguồn, tài liệu, triển khai) và gửi cho Client.",
  },
  {
    id: "completion",
    label: "Giai đoạn 5",
    title: "Kết thúc & Đánh giá",
    clientHint: "Giải ngân cho Freelancer và để lại đánh giá công khai.",
    freelancerHint: "Chờ Client giải ngân và đánh giá.",
  },
] as const;

function stageIndex(stage: string) {
  const normalized = String(stage || "selection").toLowerCase();
  const i = STAGES.findIndex((s) => s.id === normalized);
  return i >= 0 ? i : 0;
}

export default function ServiceOrderWorkflow({ backHref, backLabel }: ServiceOrderWorkflowProps) {
  const params = useParams();
  const contractId = String(params?.contractId ?? "");
  const { verified: identityVerified, loading: identityLoading } = useClientIdentityVerification({
    refreshOnVisible: false,
  });
  const paymentBlocked = !identityLoading && !identityVerified;

  const [data, setData] = useState<ContractWorkflowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    if (!contractId) {
      setError("Mã đơn hàng không hợp lệ.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = await getContractWorkflow(contractId);
      setData(payload);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải đơn hàng.";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    void load();
  }, [load]);

  const contract = data?.contract;
  const role = data?.role;
  const currentIdx = stageIndex(contract?.workflow_stage ?? "selection");
  const runAction = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      setActionError("");
      try {
        await patchContractWorkflow(contractId, body as { action: string });
        await load();
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Thao tác thất bại.";
        setActionError(message);
      } finally {
        setBusy(false);
      }
    },
    [contractId, load],
  );

  const escrowLabel = useMemo(() => {
    const s = contract?.escrow_status || "none";
    if (s === "funded") return "Đã nạp (Funded)";
    if (s === "released") return "Đã giải ngân";
    return "Chưa nạp";
  }, [contract?.escrow_status]);

  if (loading) {
    return (
      <div className="hire-page hire-order hire-order--full-width">
        <p className="hire-page__state">Đang tải tiến trình đơn hàng...</p>
      </div>
    );
  }

  if (error || !contract || !data) {
    return (
      <div className="hire-page hire-order hire-order--full-width">
        <Link href={backHref} className="hire-fl-detail__back">
          <FaArrowLeft aria-hidden /> {backLabel}
        </Link>
        <p className="hire-page__state hire-page__state--error" role="alert">
          {error || "Không tìm thấy đơn hàng."}
        </p>
      </div>
    );
  }

  const stageMeta = STAGES[currentIdx];
  const isClient = role === "client";
  const workflowStage = String(contract.workflow_stage || "selection").toLowerCase();
  const hasProposal = Boolean(contract.proposal_text?.trim());
  const isTerminal = isOrderExpiredOrCancelled(contract.status, contract.cancel_type);
  const isDisputed = isContractDisputed(contract.status);
  const disputeCenterHref = disputeCenterPath(isClient ? "client" : "freelancer", {
    disputeId: data.dispute?.id,
    contractId,
  });

  function confirmCancelOrder() {
    const reason = window.prompt("Lý do hủy đơn (tùy chọn):", "") ?? "";
    void runAction({ action: "cancel_order", reason });
  }

  if (isDisputed) {
    return (
      <div className="hire-page hire-order hire-order--full-width">
        <Link href={backHref} className="hire-fl-detail__back">
          <FaArrowLeft aria-hidden /> {backLabel}
        </Link>
        <div className="hire-sla-banner hire-sla-banner--info" role="status">
          <strong>Đơn đang trong tranh chấp</strong>
          <span>
            Workflow tạm dừng trong lúc xử lý. Trao đổi và theo dõi tiến trình tại Trung tâm giải
            quyết tranh chấp.
          </span>
        </div>
        <div className="hire-order__disputed-summary">
          <p>
            <strong>{contract.service_title || contract.job_title || "Đơn hàng"}</strong>
          </p>
          <p>
            Giai đoạn lúc mở tranh chấp: {stageMeta.title} · Ký quỹ: {escrowLabel}
          </p>
          <Link href={disputeCenterHref} className="resolution-card__link">
            Đi tới Xử lý tranh chấp
          </Link>
        </div>
      </div>
    );
  }

  if (isTerminal) {
    return (
      <div className="hire-page hire-order hire-order--full-width">
        <Link href={backHref} className="hire-fl-detail__back">
          <FaArrowLeft aria-hidden /> {backLabel}
        </Link>
        <div className="hire-sla-banner hire-sla-banner--warn" role="alert">
          <strong>Đơn đã kết thúc: {cancelTypeLabel(contract.cancel_type)}</strong>
          <span>{contract.cancel_reason || "Không thể tiếp tục workflow."}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="hire-page hire-order hire-order--full-width">
      <Link href={backHref} className="hire-fl-detail__back">
        <FaArrowLeft aria-hidden /> {backLabel}
      </Link>

        <div
          className={`hire-order__status-banner hire-order__status-banner--${contract.escrow_status === "funded" || contract.escrow_status === "released" ? "success" : "info"}`}
        >
          Ký quỹ: <strong>{escrowLabel}</strong>
          {contract.funded_at ? ` · Nạp lúc ${formatDate(contract.funded_at)}` : ""}
          {contract.released_at ? ` · Giải ngân ${formatDate(contract.released_at)}` : ""}
        </div>

        <nav className="hire-order__stepper" aria-label="Tiến trình đặt dịch vụ">
          {STAGES.map((stage, idx) => (
            <div
              key={stage.id}
              className={`hire-order__step${idx < currentIdx ? " hire-order__step--done" : ""}${idx === currentIdx ? " hire-order__step--current" : ""}`}
            >
              <span className="hire-order__step-num">{stage.label}</span>
              {stage.title}
            </div>
          ))}
        </nav>

        {workflowStage === "selection" ? (
          <SelectionAgreementPanel
            contract={contract}
            milestones={data.milestones}
            isClient={isClient}
            hasProposal={hasProposal}
            busy={busy}
            actionError={actionError}
            counterpartyName={
              isClient
                ? contract.freelancer_name || "—"
                : contract.client_name || "—"
            }
            onSubmitProposal={(payload) =>
              void runAction({
                action: "submit_proposal",
                proposalText: payload.proposalText,
              })
            }
            onAcceptProposal={() => void runAction({ action: "accept_proposal" })}
            onWithdrawProposal={() => void runAction({ action: "withdraw_proposal" })}
            onRejectProposal={() => {
              const reason = window.prompt("Lý do từ chối (tùy chọn):", "") ?? "";
              void runAction({ action: "reject_proposal", reason });
            }}
            onCancelOrder={confirmCancelOrder}
          />
        ) : workflowStage === "escrow" ? (
          <EscrowFundPanel
            contract={contract}
            milestones={data.milestones}
            isClient={isClient}
            busy={busy}
            actionError={actionError}
            paymentBlocked={isClient && paymentBlocked}
            counterpartyName={
              isClient
                ? contract.freelancer_name || "—"
                : contract.client_name || "—"
            }
            onFundEscrow={() => void runAction({ action: "fund_escrow" })}
            onCancelOrder={confirmCancelOrder}
          />
        ) : workflowStage === "execution" ? (
          <ExecutionReviewPanel
            contract={contract}
            milestones={data.milestones}
            isClient={isClient}
            busy={busy}
            actionError={actionError}
            paymentBlocked={isClient && paymentBlocked}
            progressHistory={data.progressHistory ?? []}
            cancelRequest={data.cancelRequest}
            counterpartyName={
              isClient
                ? contract.freelancer_name || "—"
                : contract.client_name || "—"
            }
            onUpdateProgress={(payload) =>
              void runAction({
                action: "update_progress",
                progressNote: payload.progressNote,
                demoUrl: payload.demoUrl,
              })
            }
            onMarkDelivered={() => void runAction({ action: "mark_delivered" })}
            onRequestRevision={(note) =>
              void runAction({ action: "request_revision", revisionNote: note })
            }
            onRequestCancelRefund={(payload) =>
              void runAction({
                action: "request_cancel_refund",
                reasonCode: payload.reasonCode,
                detail: payload.detail,
                refundMethod: payload.refundMethod,
              })
            }
            onRespondCancelRequest={(agree, responseNote) =>
              void runAction({
                action: "respond_cancel_request",
                agree,
                responseNote,
              })
            }
            onOpenDispute={(payload) =>
              void runAction({
                action: "open_dispute",
                issueCategory: payload.issueCategory,
                desiredResolution: payload.desiredResolution,
                resolutionNote: payload.resolutionNote,
                detail: payload.detail,
                evidenceUrls: payload.evidenceUrls,
              })
            }
          />
        ) : workflowStage === "delivery" ? (
          <DeliveryAcceptancePanel
            contract={contract}
            milestones={data.milestones}
            isClient={isClient}
            busy={busy}
            actionError={actionError}
            paymentBlocked={isClient && paymentBlocked}
            counterpartyName={
              isClient
                ? contract.freelancer_name || "—"
                : contract.client_name || "—"
            }
            onMarkDelivered={() => void runAction({ action: "mark_delivered" })}
            onAcceptDelivery={() => void runAction({ action: "accept_delivery" })}
            onOpenDispute={(payload) =>
              void runAction({
                action: "open_dispute",
                issueCategory: payload.issueCategory,
                desiredResolution: payload.desiredResolution,
                resolutionNote: payload.resolutionNote,
                detail: payload.detail,
                evidenceUrls: payload.evidenceUrls,
              })
            }
          />
        ) : workflowStage === "completion" ? (
          <CompletionReviewPanel
            contract={contract}
            milestones={data.milestones}
            isClient={isClient}
            busy={busy}
            actionError={actionError}
            paymentBlocked={isClient && paymentBlocked}
            counterpartyName={
              isClient
                ? contract.freelancer_name || "—"
                : contract.client_name || "—"
            }
            review={data.review}
            onReleasePayment={() => void runAction({ action: "release_payment" })}
            onSubmitReview={async (payload) => {
              setBusy(true);
              setActionError("");
              try {
                await reviewContract(contractId, payload);
                await load();
              } catch (err) {
                const message =
                  err && typeof err === "object" && "message" in err
                    ? String((err as { message: string }).message)
                    : "Không thể lưu đánh giá.";
                setActionError(message);
              } finally {
                setBusy(false);
              }
            }}
          />
        ) : (
        <section className="hire-order__panel" aria-labelledby="order-stage-title">
          <h2 id="order-stage-title" className="hire-order__panel-title">
            {stageMeta.title}
          </h2>
          <p className="hire-order__panel-desc">
            {isClient ? stageMeta.clientHint : stageMeta.freelancerHint}
          </p>

          {contract.client_brief ? (
            <>
              <h3 className="hire-quote__section-title">Yêu cầu ban đầu của Client</h3>
              <div className="hire-order__info-box">{contract.client_brief}</div>
            </>
          ) : null}

          {hasProposal && workflowStage !== "selection" ? (
            <>
              <h3 className="hire-quote__section-title">Đề xuất từ Freelancer</h3>
              <div className="hire-order__info-box">{contract.proposal_text}</div>
              {contract.proposal_budget != null ? (
                <p className="hire-order__panel-desc">
                  Ngân sách đề xuất:{" "}
                  <strong>{formatPackagePrice(Number(contract.proposal_budget))}</strong>
                </p>
              ) : null}
            </>
          ) : null}

          {data.milestones.length > 0 ? (
            <>
              <h3 className="hire-quote__section-title">Cột mốc (Milestones)</h3>
              <ul className="hire-order__milestones">
                {data.milestones.map((m) => (
                  <li key={m.id} className="hire-order__milestone">
                    <span>
                      {m.title} — {formatPackagePrice(Number(m.amount))}
                    </span>
                    <span
                      className={`hire-order__milestone-status hire-order__milestone-status--${m.status}`}
                    >
                      {m.status}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {actionError ? (
            <p className="hire-page__state hire-page__state--error" role="alert" style={{ marginTop: "1rem" }}>
              {actionError}
            </p>
          ) : null}
        </section>
        )}
    </div>
  );
}
