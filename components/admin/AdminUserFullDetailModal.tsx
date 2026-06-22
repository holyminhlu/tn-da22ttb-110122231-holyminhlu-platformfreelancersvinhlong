"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FaTimes } from "react-icons/fa";
import { useTranslation } from "@/hooks/useTranslation";
import { getAdminUserFull, type AdminUserFullItem } from "@/lib/api/admin";
import { resolveIdentityAssetUrl } from "@/lib/api/identityVerification";

type AdminUserFullDetailModalProps = {
  userId: string;
  onClose: () => void;
};

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  const display = value == null || value === "" ? "—" : String(value);
  return (
    <div className="admin-user-full__field">
      <dt>{label}</dt>
      <dd>{display}</dd>
    </div>
  );
}

function BoolField({ label, value }: { label: string; value: boolean }) {
  return <Field label={label} value={value ? "Có" : "Không"} />;
}

function JsonField({ label, value }: { label: string; value: unknown }) {
  const text =
    value == null
      ? "—"
      : typeof value === "string"
        ? value
        : JSON.stringify(value, null, 2);
  return (
    <div className="admin-user-full__field admin-user-full__field--wide">
      <dt>{label}</dt>
      <dd>
        <pre className="admin-user-full__json">{text}</pre>
      </dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="admin-user-full__section">
      <h3 className="admin-user-full__section-title">{title}</h3>
      <dl className="admin-user-full__grid">{children}</dl>
    </section>
  );
}

export default function AdminUserFullDetailModal({ userId, onClose }: AdminUserFullDetailModalProps) {
  const { t, formatDate, formatDateTime } = useTranslation();
  const [item, setItem] = useState<AdminUserFullItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getAdminUserFull(userId)
      .then((data) => {
        if (!cancelled) setItem(data.item);
      })
      .catch((err) => {
        if (!cancelled) {
          const msg =
            err && typeof err === "object" && "message" in err
              ? String((err as { message: string }).message)
              : "Không thể tải thông tin.";
          setError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const title = item?.profile.fullName || item?.account.email || userId;

  return (
    <div className="admin-user-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-user-modal admin-user-modal--fullscreen"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-full-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="admin-user-modal__head">
          <div>
            <h2 id="admin-user-full-title">{t("Chi tiết thông tin tài khoản")}</h2>
            <p className="admin-user-modal__subtitle">{title}</p>
          </div>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose} aria-label={t("Đóng")}>
            <FaTimes aria-hidden />
          </button>
        </header>

        <div className="admin-user-modal__body">
          {loading ? (
            <p className="admin-user-full__loading">{t("Đang tải…")}</p>
          ) : error ? (
            <p className="admin-toast admin-toast--err">{error}</p>
          ) : item ? (
            <>
              <Section title={t("Tài khoản (users)")}>
                <Field label="ID" value={item.userId} />
                <Field label="Email" value={item.account.email} />
                <Field label="Mật khẩu" value={item.account.hasPassword ? "Đã đặt" : "Chưa đặt"} />
                <Field label="Vai trò" value={item.account.role} />
                <Field label="Trạng thái" value={item.account.status} />
                <BoolField label="Email đã xác minh" value={item.account.isEmailVerified} />
                <BoolField label="SĐT đã xác minh" value={item.account.isPhoneVerified} />
                <Field label="Email khôi phục" value={item.account.recoveryEmail} />
                <Field label="SĐT khôi phục" value={item.account.recoveryPhone} />
                <BoolField label="Cảnh báo đăng nhập" value={item.account.loginAlertsEnabled} />
                <Field
                  label="Tự tạm khóa"
                  value={item.account.deactivatedAt ? formatDateTime(item.account.deactivatedAt) : null}
                />
                <Field label="Google ID" value={item.account.googleId} />
                <Field
                  label="Đặt mật khẩu lúc"
                  value={
                    item.account.passwordUserSetAt
                      ? formatDateTime(item.account.passwordUserSetAt)
                      : null
                  }
                />
                <Field label="Ngày tạo" value={formatDateTime(item.account.createdAt)} />
                <Field label="Cập nhật" value={formatDateTime(item.account.updatedAt)} />
                <Field
                  label="Đã xóa"
                  value={item.account.deletedAt ? formatDateTime(item.account.deletedAt) : null}
                />
                <JsonField label="Tùy chọn thông báo" value={item.account.notificationPrefs} />
              </Section>

              <Section title={t("Hồ sơ (user_profiles)")}>
                <Field label="Họ tên" value={item.profile.fullName} />
                <Field label="SĐT" value={item.profile.phone} />
                <Field label="Avatar URL" value={item.profile.avatarUrl} />
                <Field label="Ảnh bìa URL" value={item.profile.coverUrl} />
                <Field label="Ngày sinh" value={item.profile.dateOfBirth} />
                <Field label="Giới tính" value={item.profile.gender} />
                <Field label="Tagline" value={item.profile.tagline} />
                <Field label="Website" value={item.profile.website} />
                <Field label="Khu vực" value={item.profile.districtCity} />
                <Field label="Thành phố" value={item.profile.city} />
                <Field label="Tỉnh/Thành" value={item.profile.stateProvince} />
                <Field label="Quốc gia" value={item.profile.country} />
                <Field
                  label="Điểm hài lòng KH"
                  value={
                    item.profile.clientSatisfactionScore != null
                      ? String(item.profile.clientSatisfactionScore)
                      : null
                  }
                />
                <Field
                  label="Cập nhật hồ sơ"
                  value={item.profile.updatedAt ? formatDateTime(item.profile.updatedAt) : null}
                />
                <div className="admin-user-full__field admin-user-full__field--wide">
                  <dt>{t("Giới thiệu")}</dt>
                  <dd>{item.profile.bio?.trim() || "—"}</dd>
                </div>
              </Section>

              {item.identity ? (
                <Section title={t("Xác minh danh tính (identity_verifications)")}>
                  <Field label="Loại tài khoản" value={item.identity.accountType} />
                  <BoolField
                    label="Dùng thông tin tài khoản"
                    value={item.identity.useExistingAccountInfo}
                  />
                  <Field label="Tên pháp lý" value={item.identity.legalFirstName} />
                  <Field label="Họ pháp lý" value={item.identity.legalLastName} />
                  <Field label="Tìm địa chỉ" value={item.identity.addressSearch} />
                  <Field label="Đường" value={item.identity.addressStreet} />
                  <Field label="Quốc gia" value={item.identity.addressCountry} />
                  <Field label="Tỉnh/Thành" value={item.identity.addressState} />
                  <Field label="Thành phố" value={item.identity.addressCity} />
                  <Field label="Mã bưu điện" value={item.identity.addressPostal} />
                  <BoolField label="Liên hệ xác nhận" value={item.identity.contactConfirmed} />
                  <Field
                    label="Xác nhận liên hệ lúc"
                    value={
                      item.identity.contactConfirmedAt
                        ? formatDateTime(item.identity.contactConfirmedAt)
                        : null
                    }
                  />
                  <Field label="Loại giấy tờ" value={item.identity.idDocType} />
                  <Field label="Loại chứng minh địa chỉ" value={item.identity.addressProofType} />
                  <Field
                    label="Gửi duyệt"
                    value={
                      item.identity.submittedForReviewAt
                        ? formatDateTime(item.identity.submittedForReviewAt)
                        : null
                    }
                  />
                  <Field label="Trạng thái duyệt" value={item.identity.adminReviewStatus} />
                  <Field
                    label="Duyệt lúc"
                    value={
                      item.identity.adminReviewedAt
                        ? formatDateTime(item.identity.adminReviewedAt)
                        : null
                    }
                  />
                  <Field label="Duyệt bởi" value={item.identity.adminReviewedBy} />
                  <Field label="Thẻ (4 số cuối)" value={item.identity.cardLast4} />
                  <Field label="Hãng thẻ" value={item.identity.cardBrand} />
                  <Field label="Hết hạn thẻ" value={item.identity.cardExpiry} />
                  <Field label="Tên chủ thẻ" value={item.identity.cardholderName} />
                  <BoolField label="Thẻ doanh nghiệp" value={item.identity.isBusinessCard} />
                  <Field label="Địa chỉ thanh toán" value={item.identity.billingStreet} />
                  <Field label="Quốc gia TT" value={item.identity.billingCountry} />
                  <Field label="Tỉnh TT" value={item.identity.billingState} />
                  <Field label="Thành phố TT" value={item.identity.billingCity} />
                  <Field label="Mã bưu điện TT" value={item.identity.billingPostal} />
                  <Field label="SĐT thanh toán" value={item.identity.billingPhone} />
                  <Field
                    label="Xác minh thẻ lúc"
                    value={
                      item.identity.cardVerifiedAt
                        ? formatDateTime(item.identity.cardVerifiedAt)
                        : null
                    }
                  />
                  <div className="admin-user-full__field admin-user-full__field--wide">
                    <dt>{t("Ghi chú duyệt")}</dt>
                    <dd>{item.identity.adminReviewNote?.trim() || "—"}</dd>
                  </div>
                  <div className="admin-user-full__evidence">
                    {[
                      { label: "Ảnh selfie", url: item.identity.selfieUrl },
                      { label: "Mặt trước GT", url: item.identity.idFrontUrl },
                      { label: "Mặt sau GT", url: item.identity.idBackUrl },
                      { label: "Chứng minh địa chỉ", url: item.identity.addressProofUrl },
                    ].map((ev) => {
                      const src = resolveIdentityAssetUrl(ev.url);
                      return (
                        <figure key={ev.label} className="admin-user-full__evidence-card">
                          <figcaption>{ev.label}</figcaption>
                          {src ? (
                            <a href={src} target="_blank" rel="noopener noreferrer">
                              <img src={src} alt={ev.label} />
                            </a>
                          ) : (
                            <p>—</p>
                          )}
                        </figure>
                      );
                    })}
                  </div>
                </Section>
              ) : null}

              {item.freelancer ? (
                <Section title={t("Freelancer (freelancer_profiles)")}>
                  <Field label="Chức danh" value={item.freelancer.title} />
                  <Field
                    label="Giá/giờ"
                    value={item.freelancer.hourlyRate != null ? String(item.freelancer.hourlyRate) : null}
                  />
                  <Field
                    label="Kinh nghiệm (năm)"
                    value={
                      item.freelancer.experienceYears != null
                        ? String(item.freelancer.experienceYears)
                        : null
                    }
                  />
                  <Field label="Trạng thái" value={item.freelancer.availabilityStatus} />
                  <Field
                    label="Tổng thu nhập"
                    value={
                      item.freelancer.totalEarnings != null
                        ? String(item.freelancer.totalEarnings)
                        : null
                    }
                  />
                  <Field
                    label="Đánh giá TB"
                    value={item.freelancer.ratingAvg != null ? String(item.freelancer.ratingAvg) : null}
                  />
                  <Field
                    label="Số đánh giá"
                    value={
                      item.freelancer.totalReviews != null
                        ? String(item.freelancer.totalReviews)
                        : null
                    }
                  />
                  <Field
                    label="Điểm thành công"
                    value={
                      item.freelancer.jobSuccessScore != null
                        ? String(item.freelancer.jobSuccessScore)
                        : null
                    }
                  />
                  <Field
                    label="Phản hồi TB (phút)"
                    value={
                      item.freelancer.avgResponseMinutes != null
                        ? String(item.freelancer.avgResponseMinutes)
                        : null
                    }
                  />
                  <Field
                    label="Tạo lúc"
                    value={
                      item.freelancer.createdAt ? formatDateTime(item.freelancer.createdAt) : null
                    }
                  />
                  <Field
                    label="Cập nhật"
                    value={
                      item.freelancer.updatedAt ? formatDateTime(item.freelancer.updatedAt) : null
                    }
                  />
                  <JsonField label="Ngôn ngữ" value={item.freelancer.languages} />
                  <JsonField label="Huy hiệu" value={item.freelancer.profileBadges} />
                </Section>
              ) : null}
            </>
          ) : null}
        </div>

        <footer className="admin-user-modal__foot">
          <button type="button" className="admin-btn" onClick={onClose}>
            {t("Đóng")}
          </button>
        </footer>
      </div>
    </div>
  );
}
