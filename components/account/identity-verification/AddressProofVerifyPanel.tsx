"use client";

import { useState } from "react";
import { apiPaths } from "@/config/api.config";
import {
  patchIdentityVerification,
  uploadIdentityFile,
  type IdentityVerificationResponse,
} from "@/lib/api/identityVerification";
import FileUploadZone from "./FileUploadZone";

const PROOF_TYPES = [
  { value: "utility_bill", label: "Hóa đơn tiền điện" },
  { value: "lease", label: "Hợp đồng thuê nhà" },
  { value: "insurance", label: "Thẻ bảo hiểm" },
  { value: "voter_id", label: "Thẻ đăng ký cử tri" },
];

type AddressProofVerifyPanelProps = {
  data: IdentityVerificationResponse;
  onSaved: () => void;
};

export default function AddressProofVerifyPanel({ data, onSaved }: AddressProofVerifyPanelProps) {
  const [proofType, setProofType] = useState(data.verification?.address_proof_type ?? "utility_bill");
  const [uploading, setUploading] = useState(false);

  return (
    <div className="idv-detail">
      <h2 className="idv-detail__title">Bằng chứng địa chỉ</h2>
      <p className="idv-detail__lead">
        Bạn sắp hoàn tất rồi! Hãy chia sẻ một tài liệu xác nhận địa chỉ trên tài khoản của bạn.
        Tài liệu này cần thể hiện địa chỉ, tên và ngày tháng của bạn.
      </p>
      <p className="idv-detail__lead">
        Dưới đây là một vài ví dụ: Hóa đơn tiền điện, hợp đồng thuê nhà, thẻ bảo hiểm hoặc thẻ
        đăng ký cử tri của bạn.
      </p>

      <label className="idv-field">
        <span className="idv-field__label">Loại giấy tờ chứng minh địa chỉ nào?</span>
        <select
          className="idv-field__input"
          value={proofType}
          onChange={(e) => {
            const v = e.target.value;
            setProofType(v);
            void patchIdentityVerification({ addressProofType: v });
          }}
        >
          {PROOF_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <p className="idv-note">Các giấy tờ như hóa đơn phải được lập trong vòng 60 ngày gần đây.</p>

      <div className="idv-detail__actions">
        <FileUploadZone
          label="Tải lên bằng chứng địa chỉ"
          currentUrl={data.verification?.address_proof_url}
          uploading={uploading}
          onUpload={async (file) => {
            setUploading(true);
            try {
              await uploadIdentityFile(apiPaths.users.identityAddressProof, file);
              onSaved();
            } finally {
              setUploading(false);
            }
          }}
        />
      </div>
    </div>
  );
}
