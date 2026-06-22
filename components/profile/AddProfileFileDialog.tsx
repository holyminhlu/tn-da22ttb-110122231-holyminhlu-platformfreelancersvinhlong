"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { useRef, useState } from "react";
import { createProfileFile, uploadProfileFile } from "@/lib/api/users";

type AddProfileFileDialogProps = {
  onClose: () => void;
  onSaved: () => void;
};

export default function AddProfileFileDialog({
  onClose, onSaved }: AddProfileFileDialogProps) {
  const { t } = useTranslation();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploaded, setUploaded] = useState<{
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string | null;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const result = await uploadProfileFile(file);
      setUploaded({
        url: result.url,
        fileName: result.fileName,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
      });
      if (!title.trim()) {
        setTitle(file.name.replace(/\.[^.]+$/, "").slice(0, 200));
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải tệp.";
      setError(message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(t("Tiêu đề tệp là bắt buộc."));
      return;
    }
    if (!uploaded) {
      setError(t("Vui lòng tải lên tệp."));
      return;
    }

    setSaving(true);
    setError("");
    try {
      await createProfileFile({
        title: trimmedTitle,
        description: description.trim() || undefined,
        fileUrl: uploaded.url,
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize,
        mimeType: uploaded.mimeType || undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể thêm tệp.";
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
        aria-labelledby="add-file-title"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <div className="mp-dialog__head">
          <div>
            <h3 id="add-file-title" className="mp-dialog__title">
              {t("Thêm tệp tin")}
            </h3>
            <p className="mp-dialog__lead">
              {t("Tải tệp để chia sẻ với khách hàng ngay trên hồ sơ của bạn.")}
            </p>
          </div>
        </div>

        <div className="mp-dialog__field">
          <span className="mp-dialog__label">{t("Tệp đính kèm *")}</span>
          <input
            ref={fileInputRef}
            type="file"
            className="mp-dialog__file-input"
            onChange={(e) => void handleFileChange(e)}
          />
          <button
            type="button"
            className="mp-dialog__upload-btn"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "Đang tải..." : uploaded ? "Đổi tệp" : "Chọn tệp"}
          </button>
          {uploaded ? (
            <p className="mp-dialog__upload-name">
              {uploaded.fileName}
              {uploaded.fileSize > 0 ? ` · ${(uploaded.fileSize / 1024).toFixed(0)} KB` : ""}
            </p>
          ) : (
            <p className="mp-dialog__hint">{t("PDF, Word, Excel, ZIP hoặc ảnh (tối đa 15MB).")}</p>
          )}
        </div>

        <label className="mp-dialog__field">
          <span className="mp-dialog__label">{t("Tiêu đề hiển thị *")}</span>
          <input
            className="mp-dialog__input"
            placeholder={t("VD: Hợp đồng mẫu, Bảng giá chi tiết...")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>

        <label className="mp-dialog__field">
          <span className="mp-dialog__label">{t("Mô tả (tùy chọn)")}</span>
          <textarea
            className="mp-dialog__input mp-dialog__textarea"
            placeholder={t("Ghi chú ngắn về nội dung tệp...")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
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
            disabled={saving || uploading}
            onClick={onClose}
          >
            {t("Hủy")}
          </button>
          <button type="submit" className="mp-dialog__btn mp-dialog__btn--primary" disabled={saving || uploading}>
            {saving ? "Đang lưu..." : "Thêm tệp"}
          </button>
        </div>
      </form>
    </div>
  );
}
