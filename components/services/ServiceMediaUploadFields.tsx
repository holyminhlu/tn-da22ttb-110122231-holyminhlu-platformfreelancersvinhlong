"use client";

import { useTranslation } from "@/hooks/useTranslation";
import Image from "next/image";
import { useRef, useState } from "react";
import { FaFilePdf, FaImage, FaImages, FaTimes, FaVideo } from "react-icons/fa";
import { resolveFreelancerMedia } from "@/lib/hire/freelancerSearchDisplay";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif";

function uploadErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err) {
    const message = String((err as { message: string }).message).trim();
    if (message) return message;
  }
  return fallback;
}

type ServiceMediaUploadFieldsProps = {
  thumbnailUrl: string | null;
  mediaUrls: string[];
  demoUrl: string | null;
  onThumbnail: (file: File | null) => Promise<void>;
  onGallery: (files: File[]) => Promise<void>;
  onDemo: (file: File | null) => Promise<void>;
  onRemoveThumbnail: () => void;
  onRemoveGalleryImage: (url: string) => void;
  onRemoveDemo: () => void;
};

export default function ServiceMediaUploadFields({
  thumbnailUrl,
  mediaUrls,
  demoUrl,
  onThumbnail,
  onGallery,
  onDemo,
  onRemoveThumbnail,
  onRemoveGalleryImage,
  onRemoveDemo,
}: ServiceMediaUploadFieldsProps) {
  const { t } = useTranslation();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const demoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingDemo, setUploadingDemo] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);

  const coverSrc = resolveFreelancerMedia(thumbnailUrl);
  const demoIsPdf = demoUrl ? /\.pdf(\?|$)/i.test(demoUrl) : false;

  async function pickCover(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    setCoverError(null);
    setUploadingCover(true);
    try {
      await onThumbnail(file);
    } catch (err) {
      setCoverError(uploadErrorMessage(err, t("Không tải được ảnh bìa.")));
    } finally {
      setUploadingCover(false);
    }
  }

  async function pickGallery(event: React.ChangeEvent<HTMLInputElement>) {
    const batch = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!batch.length) return;
    setGalleryError(null);
    setUploadingGallery(true);
    try {
      await onGallery(batch);
    } catch (err) {
      setGalleryError(uploadErrorMessage(err, t("Không tải được ảnh thư viện.")));
    } finally {
      setUploadingGallery(false);
    }
  }

  async function pickDemo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    setDemoError(null);
    setUploadingDemo(true);
    try {
      await onDemo(file);
    } catch (err) {
      setDemoError(uploadErrorMessage(err, t("Không tải được file demo.")));
    } finally {
      setUploadingDemo(false);
    }
  }

  return (
    <div className="svc-media-upload">
      <h2 className="post-job-wizard__heading">{t("Hình ảnh & Sản phẩm mẫu")}</h2>
      <p className="post-job-wizard__hint">
        {t(
          "Ảnh bìa và thư viện ảnh giúp tăng tỷ lệ chuyển đổi — video hoặc PDF demo thể hiện chất lượng thực tế.",
        )}
      </p>

      <div className="svc-media-upload__block">
        <div className="svc-media-upload__head">
          <span className="svc-media-upload__label">{t("Ảnh bìa")}</span>
          <span className="svc-media-upload__hint-inline">{t("Ảnh đại diện hiển thị trên thẻ dịch vụ")}</span>
        </div>
        <input
          ref={coverInputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          className="svc-media-upload__file-input"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => void pickCover(e)}
        />
        <div className="svc-media-upload__row">
          <button
            type="button"
            className="svc-media-upload__btn"
            disabled={uploadingCover}
            onClick={() => coverInputRef.current?.click()}
          >
            <FaImage aria-hidden />
            {uploadingCover ? t("Đang tải ảnh...") : thumbnailUrl ? t("Đổi ảnh bìa") : t("Chọn ảnh bìa")}
          </button>
          {thumbnailUrl ? (
            <button type="button" className="svc-media-upload__btn svc-media-upload__btn--ghost" onClick={onRemoveThumbnail}>
              {t("Xóa")}
            </button>
          ) : null}
        </div>
        {coverError ? (
          <p className="svc-media-upload__error" role="alert">
            {coverError}
          </p>
        ) : null}
        {coverSrc ? (
          <div className="svc-media-upload__preview svc-media-upload__preview--cover">
            <Image src={coverSrc} alt="" width={320} height={180} unoptimized />
          </div>
        ) : null}
      </div>

      <div className="svc-media-upload__block">
        <div className="svc-media-upload__head">
          <span className="svc-media-upload__label">{t("Thư viện ảnh")}</span>
          <span className="svc-media-upload__hint-inline">{t("Tối đa 12 ảnh")}</span>
        </div>
        <input
          ref={galleryInputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          className="svc-media-upload__file-input"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => void pickGallery(e)}
        />
        <div className="svc-media-upload__row">
          <button
            type="button"
            className="svc-media-upload__btn"
            disabled={uploadingGallery || mediaUrls.length >= 12}
            onClick={() => galleryInputRef.current?.click()}
          >
            <FaImages aria-hidden />
            {uploadingGallery
              ? t("Đang tải ảnh...")
              : mediaUrls.length > 0
                ? t("Thêm ảnh vào thư viện")
                : t("Chọn ảnh thư viện")}
          </button>
          {mediaUrls.length > 0 ? (
            <span className="svc-upload-ok">
              {mediaUrls.length} {t("ảnh đã tải")}
            </span>
          ) : null}
        </div>
        {galleryError ? (
          <p className="svc-media-upload__error" role="alert">
            {galleryError}
          </p>
        ) : null}
        {mediaUrls.length > 0 ? (
          <ul className="svc-media-upload__gallery">
            {mediaUrls.map((url) => {
              const src = resolveFreelancerMedia(url);
              if (!src) return null;
              return (
                <li key={url} className="svc-media-upload__gallery-item">
                  <Image src={src} alt="" width={120} height={90} unoptimized />
                  <button
                    type="button"
                    className="svc-media-upload__remove"
                    aria-label={t("Xóa ảnh")}
                    onClick={() => onRemoveGalleryImage(url)}
                  >
                    <FaTimes aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <div className="svc-media-upload__block">
        <div className="svc-media-upload__head">
          <span className="svc-media-upload__label">{t("Video / PDF demo")}</span>
          <span className="svc-media-upload__hint-inline">MP4, WebM, MOV hoặc PDF</span>
        </div>
        <input
          ref={demoInputRef}
          type="file"
          accept="video/*,application/pdf"
          className="svc-media-upload__file-input"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => void pickDemo(e)}
        />
        <div className="svc-media-upload__row">
          <button
            type="button"
            className="svc-media-upload__btn"
            disabled={uploadingDemo}
            onClick={() => demoInputRef.current?.click()}
          >
            {demoIsPdf ? <FaFilePdf aria-hidden /> : <FaVideo aria-hidden />}
            {uploadingDemo ? t("Đang tải file...") : demoUrl ? t("Đổi file demo") : t("Chọn video hoặc PDF demo")}
          </button>
          {demoUrl ? (
            <button type="button" className="svc-media-upload__btn svc-media-upload__btn--ghost" onClick={onRemoveDemo}>
              {t("Xóa")}
            </button>
          ) : null}
        </div>
        {demoError ? (
          <p className="svc-media-upload__error" role="alert">
            {demoError}
          </p>
        ) : null}
        {demoUrl ? (
          <p className="svc-upload-ok svc-media-upload__file-name">
            {demoIsPdf ? t("Đã tải file PDF demo") : t("Đã tải video demo")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
