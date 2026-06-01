"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaStar } from "react-icons/fa";
import {
  getContractWorkflow,
  patchContractWorkflow,
  reviewContract,
  type ContractWorkflowResponse,
} from "@/lib/api/contracts";
import { formatPackagePrice } from "@/lib/hire/servicePackages";
import { formatDate } from "@/lib/format";
import "../hire/hire.css";
import "../hire/hire-freelancer-detail.css";
import "../hire/hire-order-workflow.css";

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

function parsePackageSnapshot(raw: unknown): { name?: string; price?: number } {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  return {
    name: typeof o.name === "string" ? o.name : undefined,
    price: Number(o.price) || undefined,
  };
}

export default function ServiceOrderWorkflow({ backHref, backLabel }: ServiceOrderWorkflowProps) {
  const params = useParams();
  const contractId = String(params?.contractId ?? "");

  const [data, setData] = useState<ContractWorkflowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const [proposalText, setProposalText] = useState("");
  const [progressNote, setProgressNote] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [revisionNote, setRevisionNote] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

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
      setProposalText(payload.contract.proposal_text || "");
      setProgressNote(payload.contract.progress_note || "");
      setDemoUrl(payload.contract.demo_url || "");
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
  const pkg = parsePackageSnapshot(contract?.package_snapshot);

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

  async function handleReview() {
    setBusy(true);
    setActionError("");
    try {
      await reviewContract(contractId, { rating, comment: reviewComment.trim() || undefined });
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
  }

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

  return (
    <div className="hire-page hire-order hire-order--full-width">
      <Link href={backHref} className="hire-fl-detail__back">
        <FaArrowLeft aria-hidden /> {backLabel}
      </Link>

        <header className="hire-page__head">
          <div>
            <h1 className="hire-page__title">
              {contract.service_title || contract.job_title || "Đơn đặt dịch vụ"}
            </h1>
            <p className="hire-page__lead">
              {isClient
                ? `Freelancer: ${contract.freelancer_name || "—"}`
                : `Client: ${contract.client_name || "—"}`}
              {pkg.name ? ` · Gói ${pkg.name}` : ""}
              {pkg.price ? ` · ${formatPackagePrice(pkg.price)}` : ""}
            </p>
          </div>
        </header>

        <div
          className={`hire-order__status-banner hire-order__status-banner--${contract.escrow_status === "funded" || contract.escrow_status === "released" ? "success" : "info"}`}
        >
          Escrow: <strong>{escrowLabel}</strong>
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

          {hasProposal ? (
            <>
              <h3 className="hire-quote__section-title">Đề xuất từ Freelancer</h3>
              <div className="hire-order__info-box">{contract.proposal_text}</div>
              {contract.proposal_budget != null ? (
                <p className="hire-order__panel-desc">
                  Ngân sách đề xuất:{" "}
                  <strong>{formatPackagePrice(Number(contract.proposal_budget))}</strong>
                </p>
              ) : null}
              {contract.proposal_submitted_at ? (
                <p className="hire-order__panel-desc">
                  Gửi lúc {formatDate(contract.proposal_submitted_at)}
                </p>
              ) : null}
            </>
          ) : null}

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

          {workflowStage === "selection" && !isClient && !hasProposal ? (
            <>
              <label className="hire-quote__section-title" htmlFor="proposal-text">
                Gửi đề xuất cho Client
              </label>
              <textarea
                id="proposal-text"
                className="hire-order__field hire-order__field--area"
                value={proposalText}
                onChange={(e) => setProposalText(e.target.value)}
                placeholder="Giải pháp kỹ thuật, timeline, phạm vi, điều khoản..."
              />
              <div className="hire-order__actions">
                <button
                  type="button"
                  className="hire-order__btn hire-order__btn--primary"
                  disabled={busy || !proposalText.trim()}
                  onClick={() =>
                    void runAction({ action: "submit_proposal", proposalText: proposalText.trim() })
                  }
                >
                  Gửi đề xuất
                </button>
              </div>
            </>
          ) : null}

          {workflowStage === "selection" && isClient && hasProposal ? (
            <div className="hire-order__actions">
              <button
                type="button"
                className="hire-order__btn hire-order__btn--primary"
                disabled={busy}
                onClick={() => void runAction({ action: "accept_proposal" })}
              >
                Chấp nhận đề xuất → Sang Escrow
              </button>
              <Link href="/help/employer" className="hire-order__btn hire-order__btn--outline">
                Trao đổi / Phỏng vấn (hướng dẫn)
              </Link>
            </div>
          ) : null}

          {workflowStage === "selection" && isClient && !hasProposal ? (
            <p className="hire-order__panel-desc">Đang chờ freelancer gửi đề xuất...</p>
          ) : null}

          {workflowStage === "selection" && isClient && hasProposal ? (
            <p className="hire-order__status-banner hire-order__status-banner--success" role="status">
              Freelancer đã gửi đề xuất — xem nội dung bên trên và bấm chấp nhận để tiếp tục nạp
              Escrow.
            </p>
          ) : null}

          {workflowStage === "selection" && !isClient && hasProposal ? (
            <p className="hire-order__status-banner hire-order__status-banner--info">
              Bạn đã gửi đề xuất. Đang chờ Client xem xét và chấp nhận — có thể trao đổi thêm qua
              tin nhắn hoặc cuộc gọi.
            </p>
          ) : null}

          {workflowStage === "escrow" && isClient ? (
            <div className="hire-order__actions">
              <button
                type="button"
                className="hire-order__btn hire-order__btn--primary"
                disabled={busy}
                onClick={() => void runAction({ action: "fund_escrow" })}
              >
                Nạp ký quỹ (Escrow)
              </button>
              <Link href="/payments" className="hire-order__btn hire-order__btn--outline">
                Nạp số dư tài khoản
              </Link>
            </div>
          ) : null}

          {workflowStage === "escrow" && !isClient ? (
            <p className="hire-order__status-banner hire-order__status-banner--info">
              {contract.escrow_status === "funded"
                ? "Client đã nạp Escrow. Chuyển sang giai đoạn Thực hiện để cập nhật tiến độ."
                : "Đang chờ Client nạp tiền ký quỹ (Escrow). Chỉ bắt đầu làm khi trạng thái Funded."}
            </p>
          ) : null}

          {workflowStage === "execution" && !isClient ? (
            <>
              <label className="hire-quote__section-title" htmlFor="progress-note">
                Cập nhật tiến độ
              </label>
              <textarea
                id="progress-note"
                className="hire-order__field hire-order__field--area"
                value={progressNote}
                onChange={(e) => setProgressNote(e.target.value)}
              />
              <label className="hire-quote__section-title" htmlFor="demo-url">
                Link demo (staging)
              </label>
              <input
                id="demo-url"
                type="url"
                className="hire-order__field"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                placeholder="https://..."
              />
              <div className="hire-order__actions">
                <button
                  type="button"
                  className="hire-order__btn hire-order__btn--primary"
                  disabled={busy}
                  onClick={() =>
                    void runAction({
                      action: "update_progress",
                      progressNote: progressNote.trim(),
                      demoUrl: demoUrl.trim(),
                    })
                  }
                >
                  Lưu tiến độ & demo
                </button>
                <button
                  type="button"
                  className="hire-order__btn hire-order__btn--outline"
                  disabled={busy}
                  onClick={() => void runAction({ action: "mark_delivered" })}
                >
                  Gửi bàn giao cuối
                </button>
              </div>
            </>
          ) : null}

          {workflowStage === "execution" && isClient ? (
            <>
              {contract.demo_url ? (
                <p className="hire-order__panel-desc">
                  Demo:{" "}
                  <a href={contract.demo_url} target="_blank" rel="noopener noreferrer">
                    {contract.demo_url}
                  </a>
                </p>
              ) : null}
              {contract.progress_note ? (
                <div className="hire-order__info-box">{contract.progress_note}</div>
              ) : null}
              <p className="hire-order__panel-desc">
                Chỉnh sửa còn lại: {contract.revisions_limit - contract.revisions_used} /{" "}
                {contract.revisions_limit}
              </p>
              <textarea
                className="hire-order__field hire-order__field--area"
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                placeholder="Phản hồi chỉnh sửa..."
              />
              <div className="hire-order__actions">
                <button
                  type="button"
                  className="hire-order__btn hire-order__btn--outline"
                  disabled={busy}
                  onClick={() =>
                    void runAction({
                      action: "request_revision",
                      revisionNote: revisionNote.trim(),
                    })
                  }
                >
                  Yêu cầu chỉnh sửa
                </button>
              </div>
            </>
          ) : null}

          {workflowStage === "delivery" && !isClient && contract.delivered_at ? (
            <p className="hire-order__status-banner hire-order__status-banner--info">
              Đã gửi bàn giao. Chờ Client kiểm tra và nghiệm thu.
            </p>
          ) : null}

          {workflowStage === "delivery" && !isClient && !contract.delivered_at ? (
            <div className="hire-order__actions">
              <button
                type="button"
                className="hire-order__btn hire-order__btn--primary"
                disabled={busy}
                onClick={() => void runAction({ action: "mark_delivered" })}
              >
                Xác nhận đã bàn giao
              </button>
            </div>
          ) : null}

          {workflowStage === "delivery" && isClient ? (
            <div className="hire-order__actions">
              <button
                type="button"
                className="hire-order__btn hire-order__btn--primary"
                disabled={busy}
                onClick={() => void runAction({ action: "accept_delivery" })}
              >
                Nghiệm thu — Chuyển sang hoàn tất
              </button>
            </div>
          ) : null}

          {workflowStage === "completion" && !isClient ? (
            <p
              className={`hire-order__status-banner hire-order__status-banner--${contract.escrow_status === "released" ? "success" : "info"}`}
            >
              {contract.escrow_status === "released"
                ? "Client đã giải ngân. Cảm ơn bạn đã hoàn thành dự án!"
                : "Chờ Client nghiệm thu, giải ngân và (nếu có) đánh giá công khai."}
            </p>
          ) : null}

          {workflowStage === "completion" && isClient ? (
            <>
              {contract.escrow_status !== "released" ? (
                <div className="hire-order__actions">
                  <button
                    type="button"
                    className="hire-order__btn hire-order__btn--primary"
                    disabled={busy}
                    onClick={() => void runAction({ action: "release_payment" })}
                  >
                    Giải ngân (Payment Release)
                  </button>
                </div>
              ) : (
                <p className="hire-order__status-banner hire-order__status-banner--success">
                  Đã giải ngân cho freelancer.
                </p>
              )}

              {!data.review ? (
                <div className="hire-order__review-form">
                  <h3 className="hire-quote__section-title">Đánh giá freelancer</h3>
                  <div className="hire-order__stars-input" role="group" aria-label="Số sao">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`hire-order__star-btn${n <= rating ? " hire-order__star-btn--on" : ""}`}
                        onClick={() => setRating(n)}
                        aria-label={`${n} sao`}
                      >
                        <FaStar aria-hidden />
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="hire-order__field hire-order__field--area"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Nhận xét công khai (tùy chọn)"
                  />
                  <button
                    type="button"
                    className="hire-order__btn hire-order__btn--primary"
                    disabled={busy}
                    onClick={() => void handleReview()}
                  >
                    Gửi đánh giá
                  </button>
                </div>
              ) : (
                <p className="hire-order__status-banner hire-order__status-banner--success">
                  Đã đánh giá {data.review.rating}/5 sao.
                </p>
              )}
            </>
          ) : null}

          {actionError ? (
            <p className="hire-page__state hire-page__state--error" role="alert" style={{ marginTop: "1rem" }}>
              {actionError}
            </p>
          ) : null}
        </section>
    </div>
  );
}
