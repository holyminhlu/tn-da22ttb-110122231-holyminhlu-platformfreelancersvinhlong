import { buildVerifyItems } from "@/components/account/identity-verification/types";
import type { IdentityVerificationResponse } from "@/lib/api/identityVerification";
import type { MeUser } from "@/lib/api/users";

export const CLIENT_VERIFY_PAGE = "/edit-account/xac-minh";

export const CLIENT_VERIFY_LEAD =
  "Hoàn thành 5 mục thông tin nhận dạng và xác minh thẻ tín dụng (bước 2) tại trang xác minh.";

export const CLIENT_VERIFY_PAYMENT_LEAD =
  `${CLIENT_VERIFY_LEAD} Sau đó bạn có thể nạp tiền, quản lý phương thức thanh toán và thực hiện giao dịch ký quỹ.`;

/** Các bước bắt buộc trước khi đăng tin tuyển dụng. */
export function getClientVerificationBlockers(
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

/** Đủ 5 mục nhận dạng + thẻ tín dụng đã xác minh. */
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
