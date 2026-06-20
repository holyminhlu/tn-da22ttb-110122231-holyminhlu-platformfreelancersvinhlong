"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { useStoredUser } from "@/hooks/useStoredUser";
import PostJobButton from "./PostJobButton";

export default function HomeNavbarCta() {
  const { t } = useTranslation();

  const { user, ready } = useStoredUser({ refreshFromApi: false });

  if (!ready || user) {
    return null;
  }

  return (
    <PostJobButton
      className="rounded bg-[#0066cc] px-5 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
      ariaLabel={t("auth.postJobAria")}
    >
      {t("footer.postJob")}
    </PostJobButton>
  );
}
