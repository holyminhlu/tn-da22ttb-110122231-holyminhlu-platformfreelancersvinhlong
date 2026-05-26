import type { IdentityVerificationResponse } from "@/lib/api/identityVerification";
import type { MeUser } from "@/lib/api/users";

export type VerifyItemId = "phone" | "contact" | "photo" | "id_document" | "address_proof";

export type VerifyItem = {
  id: VerifyItemId;
  title: string;
  description: string;
  completed: boolean;
};

export function buildVerifyItems(
  user: MeUser | null,
  idv: IdentityVerificationResponse | null,
): VerifyItem[] {
  const v = idv?.verification;
  const profile = idv?.profile;

  const hasPhone = Boolean(
    profile?.is_phone_verified || v?.phone_submitted_at || profile?.phone?.trim(),
  );
  const hasContact = Boolean(v?.contact_confirmed);
  const hasPhoto = Boolean(v?.selfie_url || v?.photo_submitted_at || profile?.avatar_url);
  const hasId = Boolean(v?.id_front_url && v?.id_back_url);
  const hasAddress = Boolean(v?.address_proof_url);

  return [
    {
      id: "phone",
      title: "Thêm số điện thoại",
      description: "Xác minh số điện thoại của bạn",
      completed: hasPhone,
    },
    {
      id: "contact",
      title: "Thông tin liên hệ",
      description: "Tên hợp pháp và địa chỉ thường trú",
      completed: hasContact,
    },
    {
      id: "photo",
      title: "Ảnh hiện tại",
      description: "Ảnh được chụp bằng webcam hoặc camera của điện thoại thông minh.",
      completed: hasPhoto,
    },
    {
      id: "id_document",
      title: "Giấy tờ tùy thân do chính phủ cấp",
      description: "Mặt trước và mặt sau của giấy tờ tùy thân có ảnh, hiển thị cả 4 cạnh.",
      completed: hasId,
    },
    {
      id: "address_proof",
      title: "Bằng chứng địa chỉ",
      description:
        "Giấy tờ chứng minh địa chỉ có ngày cấp trong vòng 60 ngày và xác nhận tên và địa chỉ của bạn trên tài khoản.",
      completed: hasAddress,
    },
  ];
}

export function defaultSelectedId(items: VerifyItem[]): VerifyItemId {
  const pending = items.find((i) => !i.completed);
  return pending?.id ?? "contact";
}
