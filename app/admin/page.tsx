import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes/paths";

export default function AdminIndexPage() {
  redirect(ROUTES.admin.reports);
}
