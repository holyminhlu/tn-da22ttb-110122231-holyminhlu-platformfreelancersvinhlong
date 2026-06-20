"use client";

import { tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { useState } from "react";
import { apiPaths } from "@/config/api.config";
import {
  patchIdentityVerification,
  uploadIdentityFile,
  type IdentityVerificationResponse,
} from "@/lib/api/identityVerification";
import FileUploadZone from "./FileUploadZone";

const ID_TYPES = [
  { value: "drivers_license", label: "Giấy phép lái xe" },
  { value: "passport", label: "Hộ chiếu" },
  { value: "state_id", label: "ID tiểu bang" },
  { value: "national_id", label: "Chứng minh thư quốc gia" },
];

type IdDocumentVerifyPanelProps = {
  data: IdentityVerificationResponse;
  onSaved: () => void;
};

export default function IdDocumentVerifyPanel({ data, onSaved }: IdDocumentVerifyPanelProps) {
  const { t } = useTranslation();

  const [docType, setDocType] = useState(data.verification?.id_doc_type ?? "national_id");
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [message, setMessage] = useState("");

  async function saveType(value: string) {
  const t = tUi;
    setDocType(value);
    await patchIdentityVerification({ idDocType: value });
  }

  return (
    <div className="idv-detail">
      <h2 className="idv-detail__title">Giấy tờ tùy thân do chính phủ cấp</h2>
      <p className="idv-detail__lead">
        Đặt giấy tờ tùy thân hợp lệ của bạn lên một mặt phẳng và chụp ảnh. Hãy đảm bảo rằng cả 4
        cạnh của giấy tờ đều được nhìn thấy, chỉ có giấy tờ nằm trong khung hình và ảnh được
        chiếu sáng tốt.
      </p>
      <p className="idv-detail__lead">Các loại giấy tờ tùy thân do chính phủ cấp được chấp nhận.</p>

      <div className="idv-chip-row">
        {ID_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`idv-chip${docType === t.value ? " idv-chip--active" : ""}`}
            onClick={() => void saveType(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="idv-detail__actions">
        <div className="idv-upload-row">
          <FileUploadZone
            label="Tải lên mặt trước của giấy tờ tùy thân."
            currentUrl={data.verification?.id_front_url}
            uploading={uploadingFront}
            onUpload={async (file) => {
              setUploadingFront(true);
              try {
                await uploadIdentityFile(apiPaths.users.identityIdFront, file);
                onSaved();
              } finally {
                setUploadingFront(false);
              }
            }}
          />
          <FileUploadZone
            label="Tải lên mặt sau của giấy tờ tùy thân."
            currentUrl={data.verification?.id_back_url}
            uploading={uploadingBack}
            onUpload={async (file) => {
              setUploadingBack(true);
              try {
                await uploadIdentityFile(apiPaths.users.identityIdBack, file);
                onSaved();
                if (data.verification?.id_front_url) {
                  setMessage("Đã tải đủ hai mặt giấy tờ.");
                }
              } finally {
                setUploadingBack(false);
              }
            }}
          />
        </div>
        {message ? <p className="idv-msg idv-msg--ok">{message}</p> : null}
      </div>
    </div>
  );
}
