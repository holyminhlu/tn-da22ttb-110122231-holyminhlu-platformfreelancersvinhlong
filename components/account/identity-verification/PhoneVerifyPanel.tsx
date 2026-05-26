"use client";

import { useState } from "react";
import { patchIdentityVerification, type IdentityVerificationResponse } from "@/lib/api/identityVerification";

type PhoneVerifyPanelProps = {
  data: IdentityVerificationResponse;
  onSaved: () => void;
};

export default function PhoneVerifyPanel({ data, onSaved }: PhoneVerifyPanelProps) {
  const [phone, setPhone] = useState(data.profile.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    const trimmed = phone.trim();
    if (!trimmed) {
      setMessage("Vui lòng nhập số điện thoại.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await patchIdentityVerification({ phone: trimmed });
      setMessage("Đã lưu số điện thoại. Mã xác minh SMS sẽ được gửi khi tích hợp nhà mạng.");
      onSaved();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể lưu.";
      setMessage(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="idv-detail">
      <h2 className="idv-detail__title">Thêm số điện thoại</h2>
      <p className="idv-detail__lead">Nhập số điện thoại hoặc thêm mới số điện thoại của bạn.</p>

      <label className="idv-field">
        <span className="idv-field__label">Số điện thoại</span>
        <input
          type="tel"
          className="idv-field__input"
          placeholder="VD: 0912345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>

      {data.profile.is_phone_verified ? (
        <p className="idv-msg idv-msg--ok">Số điện thoại đã được xác minh trên hệ thống.</p>
      ) : null}

      <div className="idv-detail__actions">
        {message ? <p className="idv-msg">{message}</p> : null}
        <button
          type="button"
          className="idv-btn idv-btn--primary"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? "Đang lưu..." : "Lưu số điện thoại"}
        </button>
      </div>
    </div>
  );
}
