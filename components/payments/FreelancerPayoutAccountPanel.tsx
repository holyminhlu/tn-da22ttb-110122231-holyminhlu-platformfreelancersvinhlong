"use client";

import { useState } from "react";
import { FaCheckCircle, FaUniversity } from "react-icons/fa";
import {
  saveFreelancerPayoutAccount,
  unlinkFreelancerPayoutAccount,
  type FreelancerPayoutProfile,
} from "@/lib/api/payments";
import { formatDate } from "@/lib/format";
import { maskAccountNumber } from "@/lib/payments/bankDisplay";
import BankBadgeIcon from "./BankBadgeIcon";
import LinkPayoutAccountModal from "./LinkPayoutAccountModal";

type FreelancerPayoutAccountPanelProps = {
  profile: FreelancerPayoutProfile;
  onUpdated: () => void | Promise<void>;
};

export default function FreelancerPayoutAccountPanel({
  profile,
  onUpdated,
}: FreelancerPayoutAccountPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [unlinkBusy, setUnlinkBusy] = useState(false);

  async function handleUnlink() {
    const ok = window.confirm(
      "Hủy liên kết tài khoản ngân hàng? Bạn sẽ không thể rút tiền cho đến khi liên kết lại.",
    );
    if (!ok) return;
    setUnlinkBusy(true);
    try {
      await unlinkFreelancerPayoutAccount();
      await onUpdated();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể hủy liên kết.";
      window.alert(message);
    } finally {
      setUnlinkBusy(false);
    }
  }

  if (!profile.isConfigured) {
    return (
      <div className="fl-payout fl-payout--empty">
        <div className="fl-payout-empty-card">
          <span className="fl-payout-empty-card__icon" aria-hidden>
            <FaUniversity />
          </span>
          <h3 className="fl-payout-empty-card__title">Chưa liên kết tài khoản ngân hàng</h3>
          <p className="fl-payout-empty-card__text">
            Liên kết tài khoản nội địa để nhận tiền rút từ ví VLC. Thông tin được bảo mật và chỉ
            hiển thị một phần số tài khoản.
          </p>
          <button
            type="button"
            className="payments-btn payments-btn--primary payments-btn--with-icon fl-payout__cta"
            onClick={() => setModalOpen(true)}
          >
            Liên kết tài khoản ngân hàng
          </button>
          {profile.contactEmail ? (
            <p className="fl-payout__email">
              Email đối chiếu: <strong>{profile.contactEmail}</strong>
            </p>
          ) : null}
        </div>
        <LinkPayoutAccountModal
          open={modalOpen}
          profile={profile}
          onClose={() => setModalOpen(false)}
          onSaved={onUpdated}
          onSave={saveFreelancerPayoutAccount}
        />
      </div>
    );
  }

  const masked =
    profile.accountMasked || maskAccountNumber("", profile.accountLast4);
  const statusLabel = profile.isVerified ? "Đã xác minh" : "Đã liên kết";

  return (
    <div className="fl-payout fl-payout--linked">
      <div className="fl-payout__head">
        <span
          className={`fl-payout__badge${profile.isVerified ? " fl-payout__badge--verified" : ""}`}
        >
          {profile.isVerified ? (
            <FaCheckCircle aria-hidden className="fl-payout__badge-icon" />
          ) : null}
          {statusLabel}
        </span>
        <div className="fl-payout__actions">
          <button
            type="button"
            className="payments-link-btn"
            onClick={() => setModalOpen(true)}
          >
            Thay đổi tài khoản
          </button>
          <button
            type="button"
            className="payments-link-btn fl-payout__unlink"
            disabled={unlinkBusy}
            onClick={() => void handleUnlink()}
          >
            {unlinkBusy ? "Đang xử lý..." : "Hủy liên kết"}
          </button>
        </div>
      </div>

      <div className="fl-payout__card">
        <BankBadgeIcon bankName={profile.bankName} size={48} />
        <div className="fl-payout__details">
          <p className="fl-payout__bank">{profile.bankName}</p>
          <dl className="fl-payout__meta">
            <div>
              <dt>Chủ tài khoản</dt>
              <dd>{profile.accountHolderName || profile.contactName || "—"}</dd>
            </div>
            <div>
              <dt>Số tài khoản</dt>
              <dd className="fl-payout__account-num">{masked}</dd>
            </div>
            {profile.linkedAt ? (
              <div>
                <dt>Liên kết từ</dt>
                <dd>{formatDate(profile.linkedAt)}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      {profile.contactEmail ? (
        <p className="fl-payout__email">
          Email liên kết: <strong>{profile.contactEmail}</strong>
        </p>
      ) : null}

      <p className="fl-payout__footnote">
        Tiền rút sẽ được chuyển vào tài khoản này trong vòng 24–48 giờ làm việc sau khi yêu cầu
        được xử lý.
      </p>

      <LinkPayoutAccountModal
        open={modalOpen}
        profile={profile}
        onClose={() => setModalOpen(false)}
        onSaved={onUpdated}
        onSave={saveFreelancerPayoutAccount}
      />
    </div>
  );
}
