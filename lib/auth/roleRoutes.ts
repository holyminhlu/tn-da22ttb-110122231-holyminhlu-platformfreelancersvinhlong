import { isAdminRole, isClientRole, isFreelancerRole } from "@/hooks/useStoredUser";
import {
  ADMIN_HOME,
  ROUTES,
  USER_ONLY_PREFIXES,
  isUserOnlyPath,
} from "@/lib/routes/paths";

export { ADMIN_HOME, USER_ONLY_PREFIXES, isUserOnlyPath };

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
    return ROUTES.dashboard;
  }

  return ROUTES.home;
}
