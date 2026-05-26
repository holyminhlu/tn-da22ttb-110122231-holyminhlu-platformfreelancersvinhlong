"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  FaCheckCircle,
  FaPencilAlt,
  FaWhatsapp,
} from "react-icons/fa";
import {
  getMe,
  isFreelancerMeResponse,
  updateProfile,
  type MeUser,
} from "@/lib/api/users";
import { persistStoredUser, toStoredUser } from "@/lib/authSession";

const WHATSAPP_PREF_KEY = "vlc_whatsapp_quotes";
const DEFAULT_TIMEZONE = "Giờ Đông Nam Á (GMT+07:00)";
const DEFAULT_COUNTRY = "Việt Nam";

type EditFieldKey = "fullName" | "phone" | "website" | "address";

type EditDialogState = {
  field: EditFieldKey;
  title: string;
  value: string;
  extra?: string;
} | null;

function displayValue(value: string | null | undefined, fallback = "—") {
  const t = String(value ?? "").trim();
  return t || fallback;
}

function InfoField({
  label,
  value,
  verified = false,
  whatsapp = false,
  editable = true,
  onEdit,
}: {
  label: string;
  value: string;
  verified?: boolean;
  whatsapp?: boolean;
  editable?: boolean;
  onEdit?: () => void;
}) {
  return (
    <div className="ea-field">
      <span className="ea-field-label">{label}</span>
      <div className="ea-field-box">
        <div className="ea-field-value">
          {whatsapp ? <FaWhatsapp className="ea-whatsapp" aria-hidden /> : null}
          <span>{value}</span>
          {verified ? (
            <FaCheckCircle className="ea-verified" title="Đã xác minh" aria-label="Đã xác minh" />
          ) : null}
        </div>
        {editable && onEdit ? (
          <button type="button" className="ea-edit-btn" onClick={onEdit}>
            <FaPencilAlt className="mr-1" aria-hidden />
            Sửa
          </button>
        ) : null}
      </div>
    </div>
  );
}

function AddressBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="ea-field-label">{label}</span>
      <div className="ea-address-value">{value}</div>
    </div>
  );
}

export default function EditAccountContent() {
  const router = useRouter();
  const [user, setUser] = useState<MeUser | null>(null);
  const [freelancerTitle, setFreelancerTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<EditDialogState>(null);
  const [whatsappOn, setWhatsappOn] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMe();
      if (!data.user) {
        setError("Không tải được thông tin tài khoản.");
        return;
      }
      setUser(data.user);
      if (isFreelancerMeResponse(data)) {
        setFreelancerTitle(data.freelancerProfile?.title ?? null);
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải hồ sơ.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("vlc_access_token") : null;
    if (!token) {
      router.replace("/dang-nhap");
      return;
    }
    void loadProfile();
  }, [loadProfile, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setWhatsappOn(window.localStorage.getItem(WHATSAPP_PREF_KEY) === "1");
  }, []);

  function onWhatsappToggle(checked: boolean) {
    setWhatsappOn(checked);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WHATSAPP_PREF_KEY, checked ? "1" : "0");
    }
  }

  async function saveProfile(patch: {
    fullName: string;
    phone?: string | null;
    website?: string | null;
    bio?: string | null;
    districtCity?: string | null;
  }) {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile({
        fullName: patch.fullName,
        phone: patch.phone ?? user.phone ?? "",
        website: patch.website ?? user.website ?? "",
        bio: patch.bio ?? user.bio ?? "",
        districtCity: patch.districtCity ?? user.districtCity ?? "",
        ...(user.role === "freelancer"
          ? { title: freelancerTitle ?? "" }
          : {}),
      });
      const nextUser: MeUser = {
        ...user,
        fullName: patch.fullName,
        phone: patch.phone ?? user.phone,
        website: patch.website ?? user.website,
        bio: patch.bio ?? user.bio,
        districtCity: patch.districtCity ?? user.districtCity,
      };
      setUser(nextUser);
      persistStoredUser(toStoredUser(nextUser));
      setDialog(null);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể lưu thay đổi.";
      alert(message);
    } finally {
      setSaving(false);
    }
  }

  function openEdit(field: EditFieldKey) {
    if (!user) return;
    if (field === "fullName") {
      setDialog({ field, title: "Họ và tên", value: user.fullName || "" });
    } else if (field === "phone") {
      setDialog({ field, title: "Số điện thoại", value: user.phone || "" });
    } else if (field === "website") {
      setDialog({ field, title: "Website / Liên hệ", value: user.website || "" });
    } else if (field === "address") {
      setDialog({
        field,
        title: "Địa chỉ",
        value: user.districtCity || "",
        extra: user.bio || "",
      });
    }
  }

  async function handleDialogSave() {
    if (!dialog || !user) return;
    const fullName = (user.fullName || "").trim();
    if (!fullName) {
      alert("Họ tên là bắt buộc.");
      return;
    }
    if (dialog.field === "fullName") {
      const name = dialog.value.trim();
      if (!name) {
        alert("Họ tên là bắt buộc.");
        return;
      }
      await saveProfile({ fullName: name });
      return;
    }
    if (dialog.field === "phone") {
      await saveProfile({ fullName, phone: dialog.value.trim() || null });
      return;
    }
    if (dialog.field === "website") {
      await saveProfile({ fullName, website: dialog.value.trim() || null });
      return;
    }
    if (dialog.field === "address") {
      await saveProfile({
        fullName,
        districtCity: dialog.value.trim() || null,
        bio: dialog.extra?.trim() || null,
      });
    }
  }

  const streetLine = user?.bio?.trim() || "—";
  const cityLine = displayValue(user?.districtCity);
  const phoneDisplay = displayValue(user?.phone);
  const showWhatsapp = Boolean(user?.phone?.trim());

  return (
    <div className="ea-main">
      <h1 className="ea-title">Cài đặt hồ sơ &amp; tài khoản</h1>

      {loading ? (
        <p className="ea-loading">Đang tải thông tin tài khoản...</p>
      ) : error ? (
        <p className="ea-error" role="alert">
          {error}
        </p>
      ) : user ? (
        <div className="ea-content">
            <section className="ea-card">
              <h2 className="ea-section-title">Thông tin cá nhân</h2>
              <div className="max-w-sm">
                <InfoField
                  label="Họ và tên"
                  value={displayValue(user.fullName)}
                  onEdit={() => openEdit("fullName")}
                />
              </div>
            </section>

            <section className="ea-card">
              <h2 className="ea-section-title">Email &amp; Số điện thoại</h2>
              <div className="max-w-sm">
                <InfoField
                  label="Email"
                  value={displayValue(user.email)}
                  verified={Boolean(user.isEmailVerified)}
                  editable={false}
                />
                <InfoField
                  label="Số điện thoại"
                  value={phoneDisplay}
                  verified={Boolean(user.isPhoneVerified)}
                  whatsapp={showWhatsapp}
                  onEdit={() => openEdit("phone")}
                />
              </div>
              <div className="ea-toggle-row">
                <p className="ea-toggle-label">
                  Cho phép nhà tuyển dụng liên hệ qua WhatsApp
                  <br />
                  qua báo giá và hồ sơ của tôi
                </p>
                <label className="ea-toggle">
                  <input
                    type="checkbox"
                    checked={whatsappOn}
                    onChange={(e) => onWhatsappToggle(e.target.checked)}
                    aria-label="Bật liên hệ WhatsApp"
                  />
                  <span className="ea-toggle-slider" />
                </label>
              </div>
            </section>

            <section className="ea-card">
              <div className="ea-address-header">
                <h2 className="ea-section-title mb-0">Địa chỉ</h2>
                <button type="button" className="ea-edit-btn" onClick={() => openEdit("address")}>
                  <FaPencilAlt className="mr-1" aria-hidden />
                  Đổi địa chỉ
                </button>
              </div>
              <div className="ea-address-grid">
                <div className="ea-address-span-full">
                  <AddressBlock label="Địa chỉ / Ghi chú" value={streetLine} />
                </div>
                <AddressBlock label="Quốc gia" value={DEFAULT_COUNTRY} />
                <AddressBlock label="Tỉnh / Thành" value={cityLine.includes(",") ? cityLine.split(",")[0]?.trim() || cityLine : cityLine} />
                <AddressBlock label="Quận / Huyện / Thành phố" value={cityLine} />
                <AddressBlock label="Mã bưu điện" value="—" />
                <div className="ea-address-span-full">
                  <AddressBlock label="Múi giờ" value={DEFAULT_TIMEZONE} />
                </div>
              </div>
            </section>

            <section className="ea-card">
              <h2 className="ea-section-title">Nhắn tin tức thì</h2>
              <div className="max-w-sm">
                <InfoField
                  label="Website / Skype / Liên hệ khác"
                  value={displayValue(user.website, "")}
                  onEdit={() => openEdit("website")}
                />
              </div>
            </section>
        </div>
      ) : null}

      {dialog ? (
        <div className="ea-dialog-backdrop" role="presentation" onClick={() => !saving && setDialog(null)}>
          <div
            className="ea-dialog"
            role="dialog"
            aria-labelledby="ea-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="ea-dialog-title">{dialog.title}</h3>
            <input
              className="ea-dialog-input"
              value={dialog.value}
              onChange={(e) => setDialog({ ...dialog, value: e.target.value })}
              autoFocus
            />
            {dialog.field === "address" ? (
              <textarea
                className="ea-dialog-input min-h-[4rem] resize-y"
                placeholder="Ghi chú địa chỉ (tùy chọn)"
                value={dialog.extra ?? ""}
                onChange={(e) => setDialog({ ...dialog, extra: e.target.value })}
              />
            ) : null}
            <div className="ea-dialog-actions">
              <button
                type="button"
                className="ea-dialog-btn ea-dialog-btn--ghost"
                disabled={saving}
                onClick={() => setDialog(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="ea-dialog-btn ea-dialog-btn--primary"
                disabled={saving}
                onClick={() => void handleDialogSave()}
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
