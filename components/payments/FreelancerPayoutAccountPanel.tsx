"use client";

import { formatDateUi, tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { useState } from "react";
import { FaCheckCircle, FaUniversity } from "react-icons/fa";
import {
  saveFreelancerPayoutAccount,
  unlinkFreelancerPayoutAccount,
  type FreelancerPayoutProfile,
} from "@/lib/api/payments";
import { maskAccountNumber } from "@/lib/payments/bankDisplay";
import BankBadgeIcon from "./BankBadgeIcon";
import LinkPayoutAccountModal from "./LinkPayoutAccountModal";

type FreelancerPayoutAccountPanelProps = {
  profile: FreelancerPayoutProfile;
  onUpdated: () => void | Promise<void>;
  audience?: "freelancer" | "client";
};

export default function FreelancerPayoutAccountPanel({
  profile,
  onUpdated,
  audience = "freelancer",
}: FreelancerPayoutAccountPanelProps) {  const { t, formatDate } = useTranslation();

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
        <section className="fl-payout-card fl-payout-card--empty" aria-label={t("Chưa liên kết tài khoản")}>
          <div className="fl-payout-card__empty-body">
            <span className="fl-payout-card__empty-icon" aria-hidden>
              <FaUniversity />
            </span>
            <h3 className="fl-payout-card__empty-title">{t("Chưa liên kết tài khoản ngân hàng")}</h3>
            <p className="fl-payout-card__empty-text">
              {t("Liên kết tài khoản nội địa để nhận tiền rút từ ví VLC. Thông tin được bảo mật và chỉ hiển thị một phần số tài khoản.")}
            </p>
            <button
              type="button"
              className="payments-btn payments-btn--primary payments-btn--with-icon"
              onClick={() => setModalOpen(true)}
            >
              {t("Liên kết tài khoản ngân hàng")}
            </button>
          </div>
          {profile.contactEmail ? (
            <footer className="fl-payout-card__foot">
              <p className="fl-payout-card__email">
                {t("Email đối chiếu:")} <strong>{profile.contactEmail}</strong>
              </p>
            </footer>
          ) : null}
        </section>
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

  const masked = profile.accountMasked || maskAccountNumber("", profile.accountLast4);
  const statusLabel = profile.isVerified ? "Đã xác minh" : "Đã liên kết";

  return (
    <div className="fl-payout fl-payout--linked">
      <section className="fl-payout-card" aria-label={t("Tài khoản nhận tiền đã liên kết")}>
        <header className="fl-payout-card__head">
          <div className="fl-payout-card__brand">
            <BankBadgeIcon bankName={profile.bankName} size={40} />
            <div className="fl-payout-card__brand-text">
              <p className="fl-payout-card__bank-name">{profile.bankName}</p>
              <p className="fl-payout-card__subtitle">{t("Tài khoản nhận tiền chính")}</p>
            </div>
          </div>
          <span
            className={`fl-payout-card__status${profile.isVerified ? " fl-payout-card__status--verified" : ""}`}
          >
            {profile.isVerified ? <FaCheckCircle aria-hidden /> : null}
            {statusLabel}
          </span>
        </header>

        <dl className="fl-payout-card__grid">
          <div className="fl-payout-card__item">
            <dt>{t("Chủ tài khoản")}</dt>
            <dd>{profile.accountHolderName || profile.contactName || "—"}</dd>
          </div>
          <div className="fl-payout-card__item">
            <dt>{t("Số tài khoản")}</dt>
            <dd className="fl-payout-card__account">{masked}</dd>
          </div>
          {profile.linkedAt ? (
            <div className="fl-payout-card__item fl-payout-card__item--wide">
              <dt>{t("Liên kết từ")}</dt>
              <dd>{formatDateUi(profile.linkedAt)}</dd>
            </div>
          ) : null}
        </dl>

        <footer className="fl-payout-card__actions">
          <button type="button" className="payments-link-btn" onClick={() => setModalOpen(true)}>
            {t("Thay đổi tài khoản")}
          </button>
          <button
            type="button"
            className="payments-link-btn fl-payout-card__unlink"
            disabled={unlinkBusy}
            onClick={() => void handleUnlink()}
          >
            {unlinkBusy ? "Đang xử lý..." : "Hủy liên kết"}
          </button>
        </footer>

        {profile.contactEmail ? (
          <footer className="fl-payout-card__foot">
            <p className="fl-payout-card__email">
              {t("Email liên kết:")} <strong>{profile.contactEmail}</strong>
            </p>
          </footer>
        ) : null}
      </section>

      <p className="fl-payout-card__footnote">
        {audience === "client"
          ? "Tiền rút từ ví khách hàng sẽ được chuyển vào tài khoản này trong vòng 24–48 giờ làm việc sau khi admin duyệt."
          : "Tiền rút sẽ được chuyển vào tài khoản này trong vòng 24–48 giờ làm việc sau khi yêu cầu được xử lý."}
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
