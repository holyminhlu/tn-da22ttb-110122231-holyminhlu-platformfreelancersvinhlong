"use client";

import { useState } from "react";
import { FaRedo, FaSync, FaTimes } from "react-icons/fa";
import { apiPaths } from "@/config/api.config";
import {
  resolveIdentityAssetUrl,
  uploadIdentityFile,
  type IdentityVerificationResponse,
} from "@/lib/api/identityVerification";
import FileUploadZone from "./FileUploadZone";
import IdentityReadOnlyBanner from "./IdentityReadOnlyBanner";

type PhotoVerifyPanelProps = {
  data: IdentityVerificationResponse;
  onSaved: () => void;
  readOnly?: boolean;
};

const BAD_EXAMPLES = ["Ảnh quét", "Ảnh chụp nhóm", "Với kính râm", "Đã thêm bộ lọc", "Ảnh mờ"];

export default function PhotoVerifyPanel({ data, onSaved, readOnly = false }: PhotoVerifyPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [rotation, setRotation] = useState(0);
  const previewUrl =
    resolveIdentityAssetUrl(data.verification?.selfie_url) ||
    resolveIdentityAssetUrl(data.profile.avatar_url);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      await uploadIdentityFile(apiPaths.users.identitySelfie, file);
      onSaved();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="idv-detail">
      {readOnly ? <IdentityReadOnlyBanner /> : null}
      <h2 className="idv-detail__title">Ảnh hiện tại</h2>
      <p className="idv-detail__lead">Hãy giúp chúng tôi nhận diện bạn rõ hơn.</p>
      <p className="idv-detail__lead">
        Tải ảnh của bạn đáp ứng các yêu cầu và tiến gần hơn đến việc xác minh hồ sơ.
      </p>

      <div className="idv-photo-layout">
        <div className="idv-photo-preview">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Ảnh xác minh"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
          ) : (
            <div className="idv-photo-preview__empty">Chưa có ảnh</div>
          )}
          {!readOnly ? (
          <div className="idv-photo-tools">
            <button type="button" title="Xoay trái" onClick={() => setRotation((r) => r - 90)}>
              <FaSync aria-hidden />
            </button>
            <button type="button" title="Xoay phải" onClick={() => setRotation((r) => r + 90)}>
              <FaRedo aria-hidden />
            </button>
            <button type="button" title="Đặt lại" onClick={() => setRotation(0)}>
              <FaTimes aria-hidden />
            </button>
          </div>
          ) : null}
        </div>

        <div className="idv-photo-guide">
          <h3 className="idv-detail__subtitle">Hướng dẫn chụp ảnh chứng minh thư</h3>
          <div className="idv-guide-cols">
            <div>
              <p className="idv-guide__ok">Ảnh chính xác</p>
              <ul className="idv-list">
                <li>Ảnh phải là ảnh của bạn.</li>
                <li>Hãy nhìn vào máy ảnh.</li>
                <li>Đôi mắt hiện rõ</li>
                <li>Giơ ngón tay hình chữ V hoặc giơ ngón cái lên</li>
              </ul>
            </div>
            <div>
              <p className="idv-guide__bad">Những bức ảnh này sẽ không được duyệt.</p>
              <ul className="idv-list idv-list--bad">
                {BAD_EXAMPLES.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="idv-detail__actions">
            <FileUploadZone
              label="Tải ảnh selfie"
              currentUrl={data.verification?.selfie_url ?? data.profile.avatar_url}
              uploading={uploading}
              readOnly={readOnly}
              onUpload={handleUpload}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
