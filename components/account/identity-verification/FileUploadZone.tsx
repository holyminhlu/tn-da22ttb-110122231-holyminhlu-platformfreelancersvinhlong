"use client";

import { useRef, useState } from "react";
import { FaCloudUploadAlt } from "react-icons/fa";
import { resolveIdentityAssetUrl } from "@/lib/api/identityVerification";

type FileUploadZoneProps = {
  label: string;
  hint?: string;
  currentUrl?: string | null;
  uploading?: boolean;
  onUpload: (file: File) => Promise<void>;
};

export default function FileUploadZone({
  label,
  hint,
  currentUrl,
  uploading = false,
  onUpload,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const src = preview || resolveIdentityAssetUrl(currentUrl);

  async function handleFile(file: File) {
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setFileName(file.name);
    try {
      await onUpload(file);
    } catch {
      setPreview(null);
      setFileName(null);
    }
  }

  return (
    <div className="idv-upload">
      <p className="idv-upload__label">{label}</p>
      {src ? (
        <div className="idv-upload__preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" />
        </div>
      ) : null}
      <div className="idv-upload__actions">
        <button
          type="button"
          className="idv-upload__btn"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <FaCloudUploadAlt aria-hidden />
          {uploading ? "Đang tải..." : "Tải lên hoặc Tải lại"}
        </button>
        {fileName ? <span className="idv-upload__filename">{fileName}</span> : null}
      </div>
      {hint ? <p className="idv-upload__hint">{hint}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="idv-file-hidden"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
