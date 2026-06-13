import RedirectAdminFromUserRoutes from "@/components/auth/RedirectAdminFromUserRoutes";
import AppShell from "@/components/layout/AppShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RedirectAdminFromUserRoutes>
      <AppShell>{children}</AppShell>
    </RedirectAdminFromUserRoutes>
  );
}
