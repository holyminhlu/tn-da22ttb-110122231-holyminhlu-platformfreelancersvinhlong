"use client";

import { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { useTranslation } from "@/hooks/useTranslation";
import {
  getAdminUserFull,
  updateAdminUser,
  type AdminUserFullItem,
  type AdminUserUpdatePayload,
} from "@/lib/api/admin";

type AdminUserEditModalProps = {
  userId: string;
  onClose: () => void;
  onSaved: () => void;
};

type FormState = {
  email: string;
  role: "client" | "freelancer" | "admin";
  status: "active" | "rejected";
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  recoveryEmail: string;
  recoveryPhone: string;
  loginAlertsEnabled: boolean;
  fullName: string;
  phone: string;
  avatarUrl: string;
  bio: string;
  website: string;
  tagline: string;
  districtCity: string;
  city: string;
  stateProvince: string;
  country: string;
  gender: string;
  dateOfBirth: string;
};

function itemToForm(item: AdminUserFullItem): FormState {
  return {
    email: item.account.email,
    role: (["client", "freelancer", "admin"].includes(item.account.role)
      ? item.account.role
      : "client") as FormState["role"],
    status: item.account.status === "rejected" ? "rejected" : "active",
    isEmailVerified: item.account.isEmailVerified,
    isPhoneVerified: item.account.isPhoneVerified,
    recoveryEmail: item.account.recoveryEmail || "",
    recoveryPhone: item.account.recoveryPhone || "",
    loginAlertsEnabled: item.account.loginAlertsEnabled,
    fullName: item.profile.fullName || "",
    phone: item.profile.phone || "",
    avatarUrl: item.profile.avatarUrl || "",
    bio: item.profile.bio || "",
    website: item.profile.website || "",
    tagline: item.profile.tagline || "",
    districtCity: item.profile.districtCity || "",
    city: item.profile.city || "",
    stateProvince: item.profile.stateProvince || "",
    country: item.profile.country || "",
    gender: item.profile.gender || "",
    dateOfBirth: item.profile.dateOfBirth || "",
  };
}

function formToPayload(form: FormState): AdminUserUpdatePayload {
  return {
    email: form.email.trim(),
    role: form.role,
    status: form.status,
    isEmailVerified: form.isEmailVerified,
    isPhoneVerified: form.isPhoneVerified,
    recoveryEmail: form.recoveryEmail.trim() || null,
    recoveryPhone: form.recoveryPhone.trim() || null,
    loginAlertsEnabled: form.loginAlertsEnabled,
    fullName: form.fullName.trim(),
    phone: form.phone.trim() || null,
    avatarUrl: form.avatarUrl.trim() || null,
    bio: form.bio.trim() || null,
    website: form.website.trim() || null,
    tagline: form.tagline.trim() || null,
    districtCity: form.districtCity.trim() || null,
    city: form.city.trim() || null,
    stateProvince: form.stateProvince.trim() || null,
    country: form.country.trim() || null,
    gender: form.gender.trim() || null,
    dateOfBirth: form.dateOfBirth.trim() || null,
  };
}

export default function AdminUserEditModal({ userId, onClose, onSaved }: AdminUserEditModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getAdminUserFull(userId)
      .then((data) => {
        if (!cancelled) setForm(itemToForm(data.item));
      })
      .catch((err) => {
        if (!cancelled) {
          const msg =
            err && typeof err === "object" && "message" in err
              ? String((err as { message: string }).message)
              : "Không thể tải thông tin.";
          setError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form || saving) return;

    setSaving(true);
    setError(null);
    try {
      await updateAdminUser(userId, formToPayload(form));
      onSaved();
      onClose();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể lưu thay đổi.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-user-modal-backdrop" role="presentation" onClick={() => !saving && onClose()}>
      <div
        className="admin-user-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-edit-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="admin-user-modal__head">
          <div>
            <h2 id="admin-user-edit-title">{t("Chỉnh sửa tài khoản")}</h2>
            <p className="admin-user-modal__subtitle">{form?.fullName || form?.email || userId}</p>
          </div>
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={onClose}
            disabled={saving}
            aria-label={t("Đóng")}
          >
            <FaTimes aria-hidden />
          </button>
        </header>

        {loading ? (
          <p className="admin-user-full__loading">{t("Đang tải…")}</p>
        ) : error && !form ? (
          <p className="admin-toast admin-toast--err">{error}</p>
        ) : form ? (
          <form className="admin-user-form" onSubmit={(event) => void handleSubmit(event)}>
            {error ? <p className="admin-toast admin-toast--err">{error}</p> : null}

            <fieldset className="admin-user-form__section">
              <legend>{t("Tài khoản")}</legend>
              <div className="admin-user-form__grid">
                <label className="admin-user-form__field">
                  <span>{t("Email")}</span>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                  />
                </label>
                <label className="admin-user-form__field">
                  <span>{t("Vai trò")}</span>
                  <select value={form.role} onChange={(e) => setField("role", e.target.value as FormState["role"])}>
                    <option value="client">{t("Khách hàng")}</option>
                    <option value="freelancer">Freelancer</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <label className="admin-user-form__field">
                  <span>{t("Trạng thái")}</span>
                  <select
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value as FormState["status"])}
                  >
                    <option value="active">{t("Hoạt động")}</option>
                    <option value="rejected">{t("Đã khóa")}</option>
                  </select>
                </label>
                <label className="admin-user-form__field admin-user-form__field--check">
                  <input
                    type="checkbox"
                    checked={form.isEmailVerified}
                    onChange={(e) => setField("isEmailVerified", e.target.checked)}
                  />
                  <span>{t("Email đã xác minh")}</span>
                </label>
                <label className="admin-user-form__field admin-user-form__field--check">
                  <input
                    type="checkbox"
                    checked={form.isPhoneVerified}
                    onChange={(e) => setField("isPhoneVerified", e.target.checked)}
                  />
                  <span>{t("SĐT đã xác minh")}</span>
                </label>
                <label className="admin-user-form__field">
                  <span>{t("Email khôi phục")}</span>
                  <input
                    type="email"
                    value={form.recoveryEmail}
                    onChange={(e) => setField("recoveryEmail", e.target.value)}
                  />
                </label>
                <label className="admin-user-form__field">
                  <span>{t("SĐT khôi phục")}</span>
                  <input
                    type="text"
                    value={form.recoveryPhone}
                    onChange={(e) => setField("recoveryPhone", e.target.value)}
                  />
                </label>
                <label className="admin-user-form__field admin-user-form__field--check">
                  <input
                    type="checkbox"
                    checked={form.loginAlertsEnabled}
                    onChange={(e) => setField("loginAlertsEnabled", e.target.checked)}
                  />
                  <span>{t("Cảnh báo đăng nhập")}</span>
                </label>
              </div>
            </fieldset>

            <fieldset className="admin-user-form__section">
              <legend>{t("Hồ sơ")}</legend>
              <div className="admin-user-form__grid">
                <label className="admin-user-form__field">
                  <span>{t("Họ tên")}</span>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setField("fullName", e.target.value)}
                  />
                </label>
                <label className="admin-user-form__field">
                  <span>{t("Số điện thoại")}</span>
                  <input type="text" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
                </label>
                <label className="admin-user-form__field admin-user-form__field--wide">
                  <span>{t("Avatar URL")}</span>
                  <input
                    type="text"
                    value={form.avatarUrl}
                    onChange={(e) => setField("avatarUrl", e.target.value)}
                  />
                </label>
                <label className="admin-user-form__field">
                  <span>{t("Ngày sinh")}</span>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => setField("dateOfBirth", e.target.value)}
                  />
                </label>
                <label className="admin-user-form__field">
                  <span>{t("Giới tính")}</span>
                  <input type="text" value={form.gender} onChange={(e) => setField("gender", e.target.value)} />
                </label>
                <label className="admin-user-form__field admin-user-form__field--wide">
                  <span>{t("Tagline")}</span>
                  <input type="text" value={form.tagline} onChange={(e) => setField("tagline", e.target.value)} />
                </label>
                <label className="admin-user-form__field admin-user-form__field--wide">
                  <span>{t("Website")}</span>
                  <input type="text" value={form.website} onChange={(e) => setField("website", e.target.value)} />
                </label>
                <label className="admin-user-form__field">
                  <span>{t("Khu vực")}</span>
                  <input
                    type="text"
                    value={form.districtCity}
                    onChange={(e) => setField("districtCity", e.target.value)}
                  />
                </label>
                <label className="admin-user-form__field">
                  <span>{t("Thành phố")}</span>
                  <input type="text" value={form.city} onChange={(e) => setField("city", e.target.value)} />
                </label>
                <label className="admin-user-form__field">
                  <span>{t("Tỉnh/Thành")}</span>
                  <input
                    type="text"
                    value={form.stateProvince}
                    onChange={(e) => setField("stateProvince", e.target.value)}
                  />
                </label>
                <label className="admin-user-form__field">
                  <span>{t("Quốc gia")}</span>
                  <input type="text" value={form.country} onChange={(e) => setField("country", e.target.value)} />
                </label>
                <label className="admin-user-form__field admin-user-form__field--wide">
                  <span>{t("Giới thiệu")}</span>
                  <textarea
                    rows={4}
                    value={form.bio}
                    onChange={(e) => setField("bio", e.target.value)}
                  />
                </label>
              </div>
            </fieldset>

            <footer className="admin-user-modal__foot">
              <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose} disabled={saving}>
                {t("Hủy")}
              </button>
              <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
                {saving ? t("Đang lưu…") : t("Lưu thay đổi")}
              </button>
            </footer>
          </form>
        ) : null}
      </div>
    </div>
  );
}
