import { isAdminRole, isClientRole, isFreelancerRole } from "@/hooks/useStoredUser";

export const ADMIN_HOME = "/admin/duyet-tai-khoan";

const USER_ONLY_PREFIXES = [
  "/dashboard",
  "/findwork",
  "/hire",
  "/payments",
  "/manage",
  "/dich-vu",
  "/edit-account",
  "/ho-so",
  "/jobs",
  "/work/detail",
] as const;

export function isUserOnlyPath(pathname: string): boolean {
  return USER_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function resolvePostLoginPath(
  role: string | null | undefined,
  nextPath?: string | null,
): string {
  if (isAdminRole(role)) {
    return ADMIN_HOME;
  }

  if (nextPath && !nextPath.startsWith("/admin")) {
    return nextPath;
  }

  if (isFreelancerRole(role) || isClientRole(role)) {
    return "/dashboard";
  }

  return "/";
}
