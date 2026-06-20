"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMe, isClientMeResponse, isFreelancerMeResponse } from "@/lib/api/users";
import ClientProfileContent from "./ClientProfileContent";
import MyProfileContent from "./MyProfileContent";

type ProfileView = "loading" | "client" | "freelancer" | "error";

export default function ProfilePageContent() {
  const { t } = useTranslation();

  const router = useRouter();
  const [view, setView] = useState<ProfileView>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("vlc_access_token") : null;
    if (!token) {
      router.replace("/dang-nhap?next=/ho-so");
      return;
    }

    void (async () => {
      try {
        const data = await getMe();
        if (isFreelancerMeResponse(data)) {
          setView("freelancer");
        } else if (isClientMeResponse(data)) {
          setView("client");
        } else {
          setError(t("Không xác định được loại tài khoản."));
          setView("error");
        }
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Không thể tải hồ sơ.";
        setError(message);
        setView("error");
      }
    })();
  }, [router]);

  if (view === "loading") {
    return <p className="ea-loading px-4 py-12">{t("Đang tải hồ sơ...")}</p>;
  }

  if (view === "error") {
    return (
      <p className="mx-4 my-12 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
        {error || "Không thể tải hồ sơ."}
      </p>
    );
  }

  if (view === "freelancer") {
    return <MyProfileContent />;
  }

  return <ClientProfileContent />;
}
