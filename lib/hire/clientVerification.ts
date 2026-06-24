import { buildVerifyItems } from "@/components/account/identity-verification/types";
import type { IdentityVerificationResponse } from "@/lib/api/identityVerification";
import type { MeUser } from "@/lib/api/users";

import { ROUTES } from "@/lib/routes/paths";

export const CLIENT_VERIFY_PAGE = ROUTES.account.verify;

export const CLIENT_VERIFY_LEAD =
  "Hoàn thành 5 mục thông tin nhận dạng, xác minh thẻ tín dụng (bước 2) và được admin duyệt hồ sơ (bước 3).";

export const CLIENT_VERIFY_PAYMENT_LEAD =
  `${CLIENT_VERIFY_LEAD} Sau đó bạn có thể nạp tiền, quản lý phương thức thanh toán và thực hiện giao dịch ký quỹ.`;

function getClientIdvBlockers(
  user: MeUser | null,
  idv: IdentityVerificationResponse | null,
): string[] {
  const v = idv?.verification;
  const blockers: string[] = [];

  if (!v) {
    blockers.push("Chưa bắt đầu hồ sơ xác minh danh tính.");
    return blockers;
  }

  const items = buildVerifyItems(user, idv);
  for (const item of items) {
    if (!item.completed) {
      blockers.push(`Chưa hoàn thành: ${item.title}`);
    }
  }

  if (!v.card_verified_at) {
    blockers.push("Chưa xác minh thẻ tín dụng (bước 2).");
  }

  return blockers;
}

function appendClientAdminReviewBlockers(
  idv: IdentityVerificationResponse["verification"] | null | undefined,
  blockers: string[],
): string[] {
  if (!idv?.submitted_for_review_at) {
    blockers.push("Chưa gửi hồ sơ xác minh để xem xét (bước 3).");
  }

  const review = String(idv?.admin_review_status || "").toLowerCase();
  if (review === "approved") return blockers;
  if (review === "pending") {
    blockers.push("Hồ sơ đang chờ admin duyệt tài khoản.");
    return blockers;
  }
  if (review === "rejected") {
    const note = idv?.admin_review_note?.trim();
    blockers.push(
      note
        ? `Hồ sơ xác minh bị từ chối: ${note}`
        : "Hồ sơ xác minh bị từ chối. Vui lòng cập nhật và gửi lại.",
    );
    return blockers;
  }

  blockers.push("Chưa được admin duyệt tài khoản.");
  return blockers;
}

/** Các bước bắt buộc trước khi thuê / thanh toán / nhắn tin. */
export function getClientVerificationBlockers(
  user: MeUser | null,
  idv: IdentityVerificationResponse | null,
): string[] {
  const base = getClientIdvBlockers(user, idv);
  return appendClientAdminReviewBlockers(idv?.verification, base);
}

/** Đủ 5 mục nhận dạng + thẻ tín dụng + admin duyệt. */
export function isClientIdentityVerified(
  user: MeUser | null,
  idv: IdentityVerificationResponse | null,
): boolean {
  return getClientVerificationBlockers(user, idv).length === 0;
}

export function clientVerificationProgress(
  user: MeUser | null,
  idv: IdentityVerificationResponse | null,
): { completed: number; total: number } {
  const items = buildVerifyItems(user, idv);
  return {
    completed: items.filter((i) => i.completed).length,
    total: items.length,
  };
}
