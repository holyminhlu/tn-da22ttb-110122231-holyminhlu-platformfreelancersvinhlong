import { isAdminRole, isClientRole } from "@/hooks/useStoredUser";
import { ADMIN_HOME } from "@/lib/auth/roleRoutes";

export type UserMenuEntry =
  | { type: "item"; id: string; label: string; href: string }
  | { type: "header"; label: string }
  | { type: "logout"; id: string; label: string };

const FREELANCER_MENU: UserMenuEntry[] = [
  { type: "item", id: "edit-account", label: "Chỉnh sửa tài khoản của tôi", href: "/edit-account" },
  { type: "item", id: "edit-profile", label: "Chỉnh sửa hồ sơ", href: "/ho-so" },
  { type: "item", id: "help", label: "Giúp đỡ", href: "/help" },
  { type: "logout", id: "logout", label: "Đăng xuất" },
];

const CLIENT_MENU: UserMenuEntry[] = [
  { type: "item", id: "edit-account", label: "Chỉnh sửa tài khoản của tôi", href: "/edit-account" },
  { type: "header", label: "TÀI KHOẢN TIỀN MẶT" },
  { type: "item", id: "cash-account", label: "Xem tài khoản tiền mặt", href: "/payments" },
  { type: "item", id: "payment-methods", label: "Phương thức thanh toán", href: "/payments/phuong-thuc" },
  { type: "item", id: "help", label: "Giúp đỡ", href: "/help" },
  { type: "logout", id: "logout", label: "Đăng xuất" },
];

const ADMIN_MENU: UserMenuEntry[] = [
  { type: "item", id: "admin", label: "Bảng quản trị", href: ADMIN_HOME },
  { type: "logout", id: "logout", label: "Đăng xuất" },
];

export function getUserMenuItems(role?: string | null): UserMenuEntry[] {
  if (isAdminRole(role)) return ADMIN_MENU;
  return isClientRole(role) ? CLIENT_MENU : FREELANCER_MENU;
}
