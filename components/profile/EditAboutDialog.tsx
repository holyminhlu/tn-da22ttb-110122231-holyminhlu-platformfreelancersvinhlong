"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { useState } from "react";
import { updateProfile } from "@/lib/api/users";

type EditAboutDialogProps = {
  fullName: string;
  title: string;
  tagline: string;
  bio: string;
  audience?: "client" | "freelancer";
  onClose: () => void;
  onSaved: () => void;
};

export default function EditAboutDialog({
  fullName,
  title,
  tagline: initialTagline,
  bio: initialBio,
  audience = "freelancer",
  onClose,
  onSaved,
}: EditAboutDialogProps) {
  const { t } = useTranslation();

  const [tagline, setTagline] = useState(initialTagline);
  const [bio, setBio] = useState(initialBio);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
  const t = tUi;
  e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateProfile({
        fullName: fullName.trim(),
        title: title.trim(),
        tagline: tagline.trim() || null,
        bio: bio.trim() || null,
      });
      onSaved();
      onClose();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể lưu giới thiệu.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mp-dialog-backdrop" role="presentation">
      <form
        className="mp-dialog mp-dialog--wide"
        role="dialog"
        aria-labelledby="edit-about-title"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <div className="mp-dialog__head">
          <div>
            <h3 id="edit-about-title" className="mp-dialog__title">
              {t("Giới thiệu bản thân")}
            </h3>
            <p className="mp-dialog__lead">
              {audience === "client"
                ? "Giúp freelancer hiểu thêm về bạn và loại dự án bạn thường thuê."
                : "Mô tả ngắn gọn chuyên môn và kinh nghiệm để nhà tuyển dụng tin tưởng hơn."}
            </p>
          </div>
        </div>

        <label className="mp-dialog__field">
          <span className="mp-dialog__label">{t("Dòng định vị (tagline)")}</span>
          <input
            className="mp-dialog__input"
            placeholder={t("VD: Chuyên gia Full-Stack | React & Node.js")}
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={220}
          />
          <span className="mp-dialog__hint">{t("Hiển thị ngay dưới tên trên hồ sơ công khai.")}</span>
        </label>

        <label className="mp-dialog__field">
          <span className="mp-dialog__label">{t("Giới thiệu chi tiết")}</span>
          <textarea
            className="mp-dialog__input mp-dialog__textarea"
            placeholder={t("Kể về kinh nghiệm, lĩnh vực mạnh, dự án tiêu biểu và cách bạn làm việc với khách hàng...")}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={6}
            maxLength={8000}
          />
        </label>

        {error ? (
          <p className="mp-dialog__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mp-dialog__actions">
          <button
            type="button"
            className="mp-dialog__btn mp-dialog__btn--ghost"
            disabled={saving}
            onClick={onClose}
          >
            {t("Hủy")}
          </button>
          <button type="submit" className="mp-dialog__btn mp-dialog__btn--primary" disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu giới thiệu"}
          </button>
        </div>
      </form>
    </div>
  );
}
