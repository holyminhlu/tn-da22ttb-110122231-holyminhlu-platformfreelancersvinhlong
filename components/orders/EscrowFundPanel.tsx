"use client";

import { formatDateUi, formatVndUi, tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaClipboardList,
  FaHandHoldingUsd,
  FaInfoCircle,
  FaLock,
  FaShieldAlt,
  FaUserClock,
  FaWallet,
} from "react-icons/fa";
import type { ContractMilestone, WorkflowContract } from "@/lib/api/contracts";
import { formatPackagePrice } from "@/lib/hire/servicePackages";
import { formatTimelineDisplay, parseProposalSections } from "@/lib/orders/proposalDisplay";
import WorkflowDeadlineBanner from "./WorkflowDeadlineBanner";
import ClientVerifyNotice from "@/components/hire/ClientVerifyNotice";
import { CLIENT_VERIFY_PAYMENT_LEAD } from "@/lib/hire/clientVerification";

type EscrowFundPanelProps = {
  contract: WorkflowContract;
  milestones: ContractMilestone[];
  isClient: boolean;
  busy: boolean;
  actionError?: string;
  paymentBlocked?: boolean;
  counterpartyName: string;
  onFundEscrow: () => void;
  onCancelOrder?: () => void;
};

function milestoneStatusLabel(status: string) {
  const s = String(status).toLowerCase();
  if (s === "funded") return "Đã ký quỹ";
  if (s === "pending") return "Chờ nạp";
  if (s === "in_progress") return "Đang làm";
  if (s === "submitted") return "Đã nộp";
  if (s === "approved" || s === "paid") return "Hoàn tất";
  return status;
}

export default function EscrowFundPanel({
  contract,
  milestones,
  isClient,
  busy,
  actionError,
  paymentBlocked = false,
  counterpartyName,
  onFundEscrow,
  onCancelOrder,
}: EscrowFundPanelProps) {  const { t, formatVnd, formatDate } = useTranslation();

  const [confirmed, setConfirmed] = useState(false);

  const escrowStatus = String(contract.escrow_status || "none").toLowerCase();
  const isFunded = escrowStatus === "funded" || escrowStatus === "released";

  const agreedAmount = Number(contract.agreed_price) || 0;
  const agreedDisplay = agreedAmount > 0 ? formatVndUi(agreedAmount) : "Thỏa thuận";

  const milestoneTotal = useMemo(
    () => milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0),
    [milestones],
  );

  const proposal = useMemo(
    () => parseProposalSections(contract.proposal_text || ""),
    [contract.proposal_text],
  );

  const timelineLabel = formatTimelineDisplay(proposal.timeline);

  return (
    <div className="hire-escrow">
      {paymentBlocked ? <ClientVerifyNotice message={CLIENT_VERIFY_PAYMENT_LEAD} /> : null}
      <WorkflowDeadlineBanner
        deadlineAt={contract.stage_deadline_at || contract.escrow_deadline_at}
        label={t("Hạn nạp ký quỹ Escrow")}
        variant="warn"
      />
      <div className="hire-escrow__hero">
        <div className="hire-escrow__hero-text">
          <span className="hire-escrow__eyebrow">{t("Giai đoạn 2")}</span>
          <h2 className="hire-escrow__title">{t("Khởi tạo hợp đồng & Ký quỹ")}</h2>
          <p className="hire-escrow__lead">
            {isClient
              ? "Nạp tiền vào ký quỹ (Escrow) để khóa ngân sách — freelancer chỉ bắt đầu khi trạng thái Funded."
              : "Client sẽ nạp ký quỹ theo giá đã thỏa thuận. Bạn chỉ bắt đầu làm việc sau khi Escrow được xác nhận."}
          </p>
        </div>
        <ul className="hire-escrow__steps" aria-label={t("Tiến trình ký quỹ")}>
          <li className="hire-escrow__step hire-escrow__step--done">
            <span className="hire-escrow__step-icon" aria-hidden>
              <FaCheckCircle />
            </span>
            <span>{t("Đã chốt thỏa thuận")}</span>
          </li>
          <li
            className={`hire-escrow__step${isFunded ? " hire-escrow__step--done" : " hire-escrow__step--current"}`}
          >
            <span className="hire-escrow__step-icon" aria-hidden>
              {isFunded ? <FaCheckCircle /> : "2"}
            </span>
            <span>{t("Nạp ký quỹ Escrow")}</span>
          </li>
          <li className={`hire-escrow__step${isFunded ? " hire-escrow__step--current" : " hire-escrow__step--muted"}`}>
            <span className="hire-escrow__step-icon" aria-hidden>3</span>
            <span>{t("Bắt đầu thực hiện")}</span>
          </li>
        </ul>
      </div>

      <div className="hire-escrow__grid">
        <aside className="hire-escrow__aside">
          <div className="hire-escrow__summary-card hire-escrow__summary-card--amount">
            <span className="hire-escrow__summary-label">{t("Số tiền ký quỹ")}</span>
            <strong className="hire-escrow__summary-amount">{agreedDisplay}</strong>
            {milestoneTotal > 0 && milestoneTotal !== agreedAmount ? (
              <span className="hire-escrow__summary-note">
                Tổng cột mốc: {formatPackagePrice(milestoneTotal)}
              </span>
            ) : null}
          </div>

          <div className="hire-escrow__context-card">
            <h3 className="hire-escrow__context-title">
              <FaInfoCircle aria-hidden />
              Hợp đồng
            </h3>
            <dl className="hire-escrow__meta">
              <div>
                <dt>{isClient ? "Freelancer" : "Khách hàng"}</dt>
                <dd>{counterpartyName || "—"}</dd>
              </div>
              {timelineLabel !== "—" ? (
                <div>
                  <dt>{t("Thời gian dự kiến")}</dt>
                  <dd>{timelineLabel}</dd>
                </div>
              ) : null}
              {contract.funded_at ? (
                <div>
                  <dt>{t("Đã nạp lúc")}</dt>
                  <dd>{formatDateUi(contract.funded_at)}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          {proposal.scope ? (
            <div className="hire-escrow__context-card">
              <h3 className="hire-escrow__context-title">
                <FaClipboardList aria-hidden />
                Phạm vi đã thỏa thuận
              </h3>
              <p className="hire-escrow__brief">{proposal.scope}</p>
            </div>
          ) : null}

          <div className="hire-escrow__safepay">
            <FaShieldAlt className="hire-escrow__safepay-icon" aria-hidden />
            <div>
              <strong>SafePay / Escrow</strong>
              <p>
                Tiền được giữ an toàn trên sàn cho đến khi bạn nghiệm thu. Freelancer nhận thanh toán
                sau khi hoàn tất đúng cam kết.
              </p>
            </div>
          </div>
        </aside>

        <div className="hire-escrow__main">
          {isClient && !isFunded ? (
            <div className="hire-escrow__fund-card">
              <header className="hire-escrow__fund-head">
                <FaWallet className="hire-escrow__fund-head-icon" aria-hidden />
                <div>
                  <h3 className="hire-escrow__fund-title">{t("Nạp ký quỹ cho hợp đồng")}</h3>
                  <p className="hire-escrow__fund-sub">
                    Số tiền sẽ trừ từ số dư tài khoản VND của bạn và chuyển sang trạng thái ký quỹ.
                  </p>
                </div>
              </header>

              <div className="hire-escrow__amount-box">
                <span className="hire-escrow__amount-label">{t("Bạn sẽ nạp")}</span>
                <span className="hire-escrow__amount-value">{agreedDisplay}</span>
              </div>

              {milestones.length > 0 ? (
                <div className="hire-escrow__milestones-block">
                  <h4 className="hire-escrow__milestones-title">{t("Phân bổ theo cột mốc")}</h4>
                  <ul className="hire-escrow__milestones-list">
                    {milestones.map((m, idx) => (
                      <li key={m.id}>
                        <span className="hire-escrow__milestone-idx">{idx + 1}</span>
                        <span className="hire-escrow__milestone-info">
                          <strong>{m.title}</strong>
                          <span>{formatPackagePrice(Number(m.amount))}</span>
                        </span>
                        <span className={`hire-escrow__milestone-badge hire-escrow__milestone-badge--${m.status}`}>
                          {milestoneStatusLabel(m.status)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <ul className="hire-escrow__checklist">
                <li>
                  <FaLock aria-hidden />
                  Tiền được khóa trong Escrow, không chuyển thẳng cho freelancer
                </li>
                <li>
                  <FaHandHoldingUsd aria-hidden />
                  Freelancer bắt đầu làm khi trạng thái chuyển sang <strong>Funded</strong>
                </li>
                <li>
                  <FaCheckCircle aria-hidden />
                  Bạn giải ngân sau khi nghiệm thu ở giai đoạn cuối
                </li>
              </ul>

              <label className="hire-escrow__confirm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={paymentBlocked}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <span>
                  Tôi xác nhận nạp <strong>{agreedDisplay}</strong> vào ký quỹ Escrow cho hợp đồng
                  này.
                </span>
              </label>

              <footer className="hire-escrow__fund-foot">
                <button
                  type="button"
                  className="hire-escrow__btn hire-escrow__btn--primary"
                  disabled={busy || !confirmed || agreedAmount <= 0 || paymentBlocked}
                  onClick={onFundEscrow}
                >
                  {busy ? "Đang xử lý..." : "Xác nhận nạp ký quỹ"}
                </button>
                <Link href="/payments" className="hire-escrow__btn hire-escrow__btn--outline">
                  Nạp thêm số dư tài khoản
                </Link>
                {onCancelOrder ? (
                  <button
                    type="button"
                    className="hire-escrow__btn hire-escrow__btn--outline"
                    disabled={busy}
                    onClick={onCancelOrder}
                  >
                    Hủy đơn (chưa nạp — không phạt uy tín)
                  </button>
                ) : null}
                <p className="hire-escrow__fund-note">
                  Cần đủ số dư VND trong ví. Nếu thiếu, nạp tiền tại trang Thanh toán rồi quay lại.
                </p>
              </footer>
            </div>
          ) : null}

          {isClient && isFunded ? (
            <div className="hire-escrow__state-card hire-escrow__state-card--success">
              <FaCheckCircle className="hire-escrow__state-icon" aria-hidden />
              <h3 className="hire-escrow__state-title">{t("Đã nạp ký quỹ thành công")}</h3>
              <p className="hire-escrow__state-desc">
                Freelancer có thể bắt đầu thực hiện. Bạn theo dõi tiến độ ở giai đoạn Thực hiện &
                Kiểm tra.
              </p>
              {contract.funded_at ? (
                <p className="hire-escrow__state-meta">Nạp lúc {formatDateUi(contract.funded_at)}</p>
              ) : null}
            </div>
          ) : null}

          {!isClient && !isFunded ? (
            <div className="hire-escrow__state-card hire-escrow__state-card--wait">
              <FaUserClock className="hire-escrow__state-icon" aria-hidden />
              <h3 className="hire-escrow__state-title">{t("Chờ Client nạp ký quỹ")}</h3>
              <p className="hire-escrow__state-desc">
                Client cần nạp <strong>{agreedDisplay}</strong> vào Escrow. Sau khi Funded, hệ thống
                chuyển sang giai đoạn thực hiện — bạn có thể cập nhật tiến độ và gửi demo.
              </p>
              <div className="hire-escrow__wait-amount">
                <span>{t("Số tiền ký quỹ dự kiến")}</span>
                <strong>{agreedDisplay}</strong>
              </div>
              <ul className="hire-escrow__wait-tips">
                <li>{t("Chuẩn bị sẵn kế hoạch làm việc theo thời gian đã thỏa thuận")}</li>
                <li>{t("Trao đổi thêm với Client nếu cần làm rõ trước khi bắt đầu")}</li>
              </ul>
            </div>
          ) : null}

          {!isClient && isFunded ? (
            <div className="hire-escrow__state-card hire-escrow__state-card--success">
              <FaCheckCircle className="hire-escrow__state-icon" aria-hidden />
              <h3 className="hire-escrow__state-title">{t("Escrow đã được nạp")}</h3>
              <p className="hire-escrow__state-desc">
                Client đã nạp ký quỹ. Bạn có thể bắt đầu làm việc — chuyển sang tab tiến trình
                Thực hiện để cập nhật tiến độ.
              </p>
            </div>
          ) : null}

          {actionError ? (
            <p className="hire-escrow__error" role="alert">
              {actionError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
