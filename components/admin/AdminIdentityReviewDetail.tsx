"use client";

import type { ReactNode } from "react";
import { formatDate } from "@/lib/format";
import { resolveIdentityAssetUrl } from "@/lib/api/identityVerification";
import type { FreelancerApprovalItem } from "@/lib/api/admin";
import {
  accountTypeLabel,
  addressProofTypeLabel,
  formatBillingAddress,
  formatSubmittedAddress,
  idDocTypeLabel,
} from "@/lib/admin/identityReviewDisplay";

type AdminIdentityReviewDetailProps = {
  item: FreelancerApprovalItem;
  loading?: boolean;
};

function DetailField({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`admin-idv-detail__field${wide ? " admin-idv-detail__field--wide" : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function EvidenceCard({
  label,
  url,
  submittedAt,
}: {
  label: string;
  url: string | null;
  submittedAt?: string | null;
}) {
  const src = resolveIdentityAssetUrl(url);
  return (
    <figure className="admin-idv-detail__evidence">
      <figcaption className="admin-idv-detail__evidence-label">{label}</figcaption>
      {src ? (
        <a href={src} target="_blank" rel="noopener noreferrer" className="admin-idv-detail__evidence-link">
          <img src={src} alt={label} className="admin-idv-detail__evidence-img" />
        </a>
      ) : (
        <p className="admin-idv-detail__evidence-empty">Chưa nộp</p>
      )}
      {submittedAt ? (
        <p className="admin-idv-detail__evidence-meta">Nộp lúc {formatDate(submittedAt)}</p>
      ) : null}
    </figure>
  );
}

export default function AdminIdentityReviewDetail({ item, loading }: AdminIdentityReviewDetailProps) {
  if (loading) {
    return <p className="admin-idv-detail__loading">Đang tải hồ sơ...</p>;
  }

  const avatarSrc = resolveIdentityAssetUrl(item.avatarUrl);

  return (
    <div className="admin-idv-detail" aria-label="Chi tiết hồ sơ xác minh">
      <header className="admin-idv-detail__head">
        <div className="admin-idv-detail__profile">
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="admin-idv-detail__avatar" />
          ) : (
            <span className="admin-idv-detail__avatar admin-idv-detail__avatar--placeholder" aria-hidden>
              {(item.fullName || item.email || "?").slice(0, 1).toUpperCase()}
            </span>
          )}
          <div>
            <h3 className="admin-idv-detail__name">{item.fullName || "—"}</h3>
            <p className="admin-idv-detail__email">{item.email}</p>
            <p className="admin-idv-detail__meta">
              {item.role === "client" ? "Client" : "Freelancer"} · Gửi lúc{" "}
              {item.submittedAt ? formatDate(item.submittedAt) : "—"}
            </p>
          </div>
        </div>
      </header>

      <section className="admin-idv-detail__section">
        <h4 className="admin-idv-detail__section-title">Bước 1 · Thông tin &amp; liên hệ</h4>
        <dl className="admin-idv-detail__grid">
          <DetailField label="Loại tài khoản" value={accountTypeLabel(item.accountType)} />
          <DetailField
            label="Họ tên pháp lý"
            value={[item.legalFirstName, item.legalLastName].filter(Boolean).join(" ").trim() || "—"}
          />
          <DetailField label="Số điện thoại" value={item.phone || "—"} />
          <DetailField
            label="Xác minh SĐT"
            value={item.isPhoneVerified ? "Đã xác minh" : "Chưa xác minh"}
          />
          <DetailField
            label="Xác minh email"
            value={item.isEmailVerified ? "Đã xác minh" : "Chưa xác minh"}
          />
          <DetailField
            label="Xác nhận thông tin liên hệ"
            value={item.contactConfirmed ? "Đã xác nhận" : "Chưa xác nhận"}
          />
          <DetailField label="Khu vực hồ sơ" value={item.profileDistrictCity || "—"} />
          <DetailField
            label="Giới thiệu"
            value={item.profileBio || "—"}
            wide
          />
          <DetailField label="Địa chỉ khai báo" value={formatSubmittedAddress(item)} wide />
        </dl>
      </section>

      <section className="admin-idv-detail__section">
        <h4 className="admin-idv-detail__section-title">Bước 2 · Thẻ tín dụng / ghi nợ</h4>
        <dl className="admin-idv-detail__grid">
          <DetailField label="Chủ thẻ" value={item.cardholderName || "—"} />
          <DetailField
            label="Số thẻ"
            value={item.cardLast4 ? `**** **** **** ${item.cardLast4}` : "—"}
          />
          <DetailField label="Hãng thẻ" value={item.cardBrand || "—"} />
          <DetailField label="Hết hạn" value={item.cardExpiry || "—"} />
          <DetailField
            label="Loại thẻ"
            value={item.isBusinessCard ? "Thẻ doanh nghiệp" : "Thẻ cá nhân"}
          />
          <DetailField
            label="Xác minh thẻ"
            value={item.cardVerifiedAt ? formatDate(item.cardVerifiedAt) : "Chưa xác minh"}
          />
          <DetailField label="Địa chỉ thanh toán" value={formatBillingAddress(item)} wide />
          <DetailField label="SĐT thanh toán" value={item.billingPhone || "—"} />
        </dl>
      </section>

      <section className="admin-idv-detail__section">
        <h4 className="admin-idv-detail__section-title">Minh chứng người dùng đã nộp</h4>
        <div className="admin-idv-detail__evidence-grid">
          <EvidenceCard
            label="Ảnh chân dung (selfie)"
            url={item.selfieUrl || item.avatarUrl}
            submittedAt={item.photoSubmittedAt}
          />
          <EvidenceCard
            label={`Giấy tờ mặt trước · ${idDocTypeLabel(item.idDocType)}`}
            url={item.idFrontUrl}
            submittedAt={item.idSubmittedAt}
          />
          <EvidenceCard
            label={`Giấy tờ mặt sau · ${idDocTypeLabel(item.idDocType)}`}
            url={item.idBackUrl}
            submittedAt={item.idSubmittedAt}
          />
          <EvidenceCard
            label={`Bằng chứng địa chỉ · ${addressProofTypeLabel(item.addressProofType)}`}
            url={item.addressProofUrl}
            submittedAt={item.addressProofSubmittedAt}
          />
        </div>
      </section>

      <section className="admin-idv-detail__section admin-idv-detail__section--status">
        <h4 className="admin-idv-detail__section-title">Đánh giá hồ sơ</h4>
        {item.blockers.length > 0 ? (
          <ul className="admin-idv-detail__blockers">
            {item.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        ) : (
          <p className="admin-idv-detail__ready">Đủ điều kiện duyệt.</p>
        )}
        {item.adminReviewNote ? (
          <p className="admin-idv-detail__note">
            <strong>Ghi chú admin:</strong> {item.adminReviewNote}
          </p>
        ) : null}
        {item.adminReviewedAt ? (
          <p className="admin-idv-detail__reviewed">
            Xử lý lúc {formatDate(item.adminReviewedAt)} · Trạng thái: {item.adminReviewStatus}
          </p>
        ) : null}
      </section>
    </div>
  );
}
