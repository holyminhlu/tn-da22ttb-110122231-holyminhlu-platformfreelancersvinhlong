"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { useRef, useState } from "react";
import { FaCloudUploadAlt, FaFilePdf, FaImage, FaTimes, FaVideo } from "react-icons/fa";
import { uploadDisputeEvidence, type OpenDisputePayload } from "@/lib/api/resolution";
import {
  DISPUTE_ISSUE_OPTIONS,
  DISPUTE_RESOLUTION_OPTIONS,
} from "@/lib/orders/refundDisputeData";

const MAX_EVIDENCE_FILES = 6;
const MAX_EVIDENCE_BYTES = 12 * 1024 * 1024;
const EVIDENCE_ACCEPT = "image/*,application/pdf,video/mp4,video/webm";

type EvidenceItem = {
  url: string;
  name: string;
};

type DisputeOpenFormProps = {
  busy?: boolean;
  onSubmit: (payload: OpenDisputePayload) => void;
};

function evidenceIcon(name: string) {
  const t = tUi;
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return <FaFilePdf aria-hidden />;
  if (/\.(mp4|webm|mov)$/.test(lower)) return <FaVideo aria-hidden />;
  return <FaImage aria-hidden />;
}

function validateEvidenceFiles(files: File[], currentCount: number) {
  const errors: string[] = [];
  const valid: File[] = [];
  const slotsLeft = MAX_EVIDENCE_FILES - currentCount;

  if (slotsLeft <= 0) {
    return { valid, errors: ["Đã đủ 6 tệp minh chứng."] };
  }

  const picked = files.slice(0, slotsLeft);
  if (files.length > slotsLeft) {
    errors.push(`Chỉ thêm được tối đa ${slotsLeft} tệp nữa.`);
  }

  for (const file of picked) {
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    const isVideo = file.type === "video/mp4" || file.type === "video/webm";
    if (!isImage && !isPdf && !isVideo) {
      errors.push(`"${file.name}" không đúng định dạng (ảnh, PDF hoặc MP4/WebM).`);
      continue;
    }
    if (file.size > MAX_EVIDENCE_BYTES) {
      errors.push(`"${file.name}" vượt quá 12MB.`);
      continue;
    }
    valid.push(file);
  }

  return { valid, errors };
}

export default function DisputeOpenForm({
  busy, onSubmit }: DisputeOpenFormProps) {
  const { t } = useTranslation();

  const fileRef = useRef<HTMLInputElement>(null);
  const [issueCategory, setIssueCategory] = useState("");
  const [desiredResolution, setDesiredResolution] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [detail, setDetail] = useState("");
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleFiles(files: FileList | null) {
  const t = tUi;
    if (!files?.length) return;
    const { valid, errors } = validateEvidenceFiles(Array.from(files), evidenceItems.length);
    if (errors.length) setUploadError(errors.join(" "));
    if (!valid.length) {
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setUploading(true);
    setUploadError("");
    try {
      const urls = await uploadDisputeEvidence(valid);
      const next = urls.map((url, index) => ({
        url,
        name: valid[index]?.name || url.split("/").pop() || "minh-chung",
      }));
      setEvidenceItems((prev) => [...prev, ...next].slice(0, MAX_EVIDENCE_FILES));
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải bằng chứng.";
      setUploadError(message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeEvidence(url: string) {
  const t = tUi;
    setEvidenceItems((prev) => prev.filter((item) => item.url !== url));
    setUploadError("");
  }

  function handleSubmit() {
  const t = tUi;
    const evidenceUrls = evidenceItems.map((item) => item.url);
    if (!issueCategory || !desiredResolution || !detail.trim() || !evidenceUrls.length) return;
    onSubmit({
      issueCategory,
      desiredResolution,
      resolutionNote: resolutionNote.trim() || undefined,
      detail: detail.trim(),
      evidenceUrls,
    });
  }

  const canAddMore = evidenceItems.length < MAX_EVIDENCE_FILES;

  return (
    <div className="resolution-form resolution-form--dispute">
      <header className="resolution-form__head">
        <h4 className="resolution-form__title">{t("Mở tranh chấp")}</h4>
        <p className="resolution-form__sub">
          Dùng khi giao dịch đã hoặc đang diễn ra nhưng có sự cố và hai bên không tự thỏa thuận
          được. Admin sẽ tham gia xử lý tại Trung tâm giải quyết tranh chấp.
        </p>
      </header>

      <label className="resolution-form__field">
        <span>
          Phân loại vấn đề <span className="resolution-form__required">*</span>
        </span>
        <select
          className="resolution-form__select"
          value={issueCategory}
          onChange={(e) => setIssueCategory(e.target.value)}
        >
          <option value="">{t("— Chọn loại vấn đề —")}</option>
          {DISPUTE_ISSUE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="resolution-form__field">
        <span>
          Yêu cầu xử lý <span className="resolution-form__required">*</span>
        </span>
        <select
          className="resolution-form__select"
          value={desiredResolution}
          onChange={(e) => setDesiredResolution(e.target.value)}
        >
          <option value="">{t("— Chọn yêu cầu —")}</option>
          {DISPUTE_RESOLUTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {desiredResolution === "other" ? (
        <label className="resolution-form__field">
          <span>{t("Mô tả yêu cầu cụ thể")}</span>
          <input
            className="resolution-form__input"
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            placeholder={t("VD: Hoàn 30% và giữ phần còn lại...")}
          />
        </label>
      ) : null}

      <label className="resolution-form__field">
        <span>
          Mô tả chi tiết <span className="resolution-form__required">*</span>
        </span>
        <textarea
          className="resolution-form__textarea"
          rows={4}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder={t("Trình bày sự việc, thời điểm, ảnh hưởng...")}
        />
      </label>

      <div className="resolution-form__field">
        <span>
          Bằng chứng (bắt buộc) <span className="resolution-form__required">*</span>
        </span>
        <div className="resolution-evidence">
          <input
            ref={fileRef}
            type="file"
            accept={EVIDENCE_ACCEPT}
            multiple
            className="resolution-evidence__input"
            tabIndex={-1}
            aria-hidden
            disabled={uploading || busy || !canAddMore}
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <button
            type="button"
            className="resolution-evidence__upload-btn"
            disabled={uploading || busy || !canAddMore}
            onClick={() => fileRef.current?.click()}
          >
            <FaCloudUploadAlt aria-hidden />
            {uploading ? "Đang tải lên..." : "Tải minh chứng lên"}
          </button>
          <p className="resolution-form__hint">
            Ảnh, PDF hoặc video — tối đa {MAX_EVIDENCE_FILES} tệp, mỗi tệp 12MB.
            {evidenceItems.length > 0 ? (
              <>
                {" "}
                Đã chọn {evidenceItems.length}/{MAX_EVIDENCE_FILES}.
              </>
            ) : null}
          </p>
          {uploadError ? (
            <p className="resolution-form__hint resolution-form__hint--warn" role="alert">
              {uploadError}
            </p>
          ) : null}
          {evidenceItems.length > 0 ? (
            <ul className="resolution-evidence__list">
              {evidenceItems.map((item) => (
                <li key={item.url} className="resolution-evidence__item">
                  <span className="resolution-evidence__item-icon">{evidenceIcon(item.name)}</span>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="resolution-evidence__item-name"
                  >
                    {item.name}
                  </a>
                  <button
                    type="button"
                    className="resolution-evidence__item-remove"
                    aria-label={`Xóa ${item.name}`}
                    disabled={uploading || busy}
                    onClick={() => removeEvidence(item.url)}
                  >
                    <FaTimes aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        className="resolution-form__btn resolution-form__btn--dispute"
        disabled={
          busy ||
          uploading ||
          !issueCategory ||
          !desiredResolution ||
          detail.trim().length < 10 ||
          !evidenceItems.length
        }        onClick={handleSubmit}
      >
        {busy ? "Đang gửi..." : "Mở tranh chấp"}
      </button>
    </div>
  );
}
