"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Image from "next/image";
import { useRef, useState } from "react";
import { FaImage, FaTimes } from "react-icons/fa";
import { uploadServiceImages } from "@/lib/api/services";
import { createPortfolio } from "@/lib/api/users";
import { resolveAvatarSrc } from "@/lib/authSession";

type AddPortfolioDialogProps = {
  onClose: () => void;
  onSaved: () => void;
};

export default function AddPortfolioDialog({
  onClose, onSaved }: AddPortfolioDialogProps) {
  const { t } = useTranslation();

  const imageInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleImagesChange(event: React.ChangeEvent<HTMLInputElement>) {
  const t = tUi;
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setUploadingImages(true);
    setError("");
    try {
      const urls = await uploadServiceImages(files.slice(0, 6 - imageUrls.length));
      setImageUrls((prev) => [...prev, ...urls].slice(0, 6));
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải ảnh.";
      setError(message);
    } finally {
      setUploadingImages(false);
    }
  }

  function removeImage(url: string) {
  const t = tUi;
    setImageUrls((prev) => prev.filter((item) => item !== url));
  }

  async function handleSubmit(e: React.FormEvent) {
  const t = tUi;
  e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(t("Tiêu đề portfolio là bắt buộc."));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createPortfolio({
        title: trimmedTitle,
        description: description.trim() || undefined,
        projectUrl: projectUrl.trim() || undefined,
        images: imageUrls.length > 0 ? imageUrls : undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể thêm portfolio.";
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
        aria-labelledby="add-portfolio-title"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <div className="mp-dialog__head">
          <div>
            <h3 id="add-portfolio-title" className="mp-dialog__title">
              {t("Thêm portfolio")}
            </h3>
            <p className="mp-dialog__lead">
              {t("Trưng bày công việc đã làm để thu hút khách hàng.")}
            </p>
          </div>
        </div>

        <label className="mp-dialog__field">
          <span className="mp-dialog__label">{t("Tiêu đề dự án *")}</span>
          <input
            className="mp-dialog__input"
            placeholder={t("VD: Website thương mại điện tử cho thương hiệu nội thất")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
        </label>

        <label className="mp-dialog__field">
          <span className="mp-dialog__label">{t("Mô tả ngắn")}</span>
          <textarea
            className="mp-dialog__input mp-dialog__textarea"
            placeholder={t("Vai trò của bạn, công nghệ sử dụng, kết quả đạt được...")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </label>

        <label className="mp-dialog__field">
          <span className="mp-dialog__label">{t("Link dự án (tùy chọn)")}</span>
          <input
            className="mp-dialog__input"
            placeholder="https://..."
            value={projectUrl}
            onChange={(e) => setProjectUrl(e.target.value)}
          />
        </label>

        <div className="mp-dialog__field">
          <span className="mp-dialog__label">{t("Ảnh minh họa (tùy chọn)")}</span>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="mp-dialog__file-input"
            onChange={(e) => void handleImagesChange(e)}
          />
          <button
            type="button"
            className="mp-dialog__upload-btn"
            disabled={uploadingImages || imageUrls.length >= 6}
            onClick={() => imageInputRef.current?.click()}
          >
            <FaImage aria-hidden />
            {uploadingImages ? "Đang tải ảnh..." : "Thêm ảnh dự án"}
          </button>
          {imageUrls.length > 0 ? (
            <ul className="mp-dialog__image-grid">
              {imageUrls.map((url) => {
                const src = resolveAvatarSrc(url);
                return (
                  <li key={url} className="mp-dialog__image-item">
                    {src ? (
                      <Image src={src} alt="" width={96} height={72} className="mp-dialog__image-thumb" unoptimized />
                    ) : null}
                    <button
                      type="button"
                      className="mp-dialog__image-remove"
                      aria-label={t("Xóa ảnh")}
                      onClick={() => removeImage(url)}
                    >
                      <FaTimes aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mp-dialog__hint">{t("Tối đa 6 ảnh, mỗi ảnh tối đa 5MB.")}</p>
          )}
        </div>

        {error ? (
          <p className="mp-dialog__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mp-dialog__actions">
          <button
            type="button"
            className="mp-dialog__btn mp-dialog__btn--ghost"
            disabled={saving || uploadingImages}
            onClick={onClose}
          >
            {t("Hủy")}
          </button>
          <button type="submit" className="mp-dialog__btn mp-dialog__btn--primary" disabled={saving || uploadingImages}>
            {saving ? "Đang lưu..." : "Thêm portfolio"}
          </button>
        </div>
      </form>
    </div>
  );
}
