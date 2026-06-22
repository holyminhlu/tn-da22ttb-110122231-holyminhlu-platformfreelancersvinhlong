"use client";

import { useCallback, useEffect, useState } from "react";
import { FaPlus, FaRedo, FaTrash } from "react-icons/fa";
import { useTranslation } from "@/hooks/useTranslation";
import {
  createContactSocialLink,
  deleteContactSocialLink,
  getAdminContact,
  updateAdminContact,
  updateContactSocialLink,
  type ContactSocialLink,
} from "@/lib/api/contact";
import type { ApiError } from "@/lib/api/client";
import "../contact/contact.css";
import "../admin/admin.css";

const PLATFORM_OPTIONS = [
  { value: "facebook", label: "Facebook" },
  { value: "twitter", label: "Twitter / X" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "zalo", label: "Zalo" },
  { value: "custom", label: "Khác" },
];

type SocialForm = {
  platform: string;
  label: string;
  url: string;
  sortOrder: number;
  isVisible: boolean;
};

const EMPTY_SOCIAL: SocialForm = {
  platform: "facebook",
  label: "",
  url: "",
  sortOrder: 0,
  isVisible: true,
};

export default function AdminContactPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [socialLinks, setSocialLinks] = useState<ContactSocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCore, setSavingCore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; message: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [socialForm, setSocialForm] = useState<SocialForm>(EMPTY_SOCIAL);
  const [savingSocial, setSavingSocial] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setToast(null);
    try {
      const data = await getAdminContact();
      setEmail(data.email);
      setPhone(data.phone);
      setAddress(data.address);
      setSocialLinks(data.socialLinks);
    } catch (err) {
      const apiErr = err as ApiError;
      setToast({ type: "err", message: apiErr.message || "Không thể tải dữ liệu liên hệ." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSaveCore(e: React.FormEvent) {
    e.preventDefault();
    setSavingCore(true);
    setToast(null);
    try {
      const res = await updateAdminContact({ email, phone, address });
      setToast({ type: "ok", message: res.message });
    } catch (err) {
      const apiErr = err as ApiError;
      setToast({ type: "err", message: apiErr.message || "Không thể lưu." });
    } finally {
      setSavingCore(false);
    }
  }

  function openCreateModal() {
    setEditingId(null);
    setSocialForm({
      ...EMPTY_SOCIAL,
      sortOrder: socialLinks.length + 1,
    });
    setModalOpen(true);
  }

  function openEditModal(link: ContactSocialLink) {
    setEditingId(link.id);
    setSocialForm({
      platform: link.platform,
      label: link.label,
      url: link.url,
      sortOrder: link.sortOrder,
      isVisible: link.isVisible,
    });
    setModalOpen(true);
  }

  async function handleSaveSocial(e: React.FormEvent) {
    e.preventDefault();
    setSavingSocial(true);
    setToast(null);
    try {
      if (editingId) {
        const res = await updateContactSocialLink(editingId, socialForm);
        setSocialLinks((prev) => prev.map((item) => (item.id === editingId ? res.item : item)));
        setToast({ type: "ok", message: res.message });
      } else {
        const res = await createContactSocialLink(socialForm);
        setSocialLinks((prev) => [...prev, res.item].sort((a, b) => a.sortOrder - b.sortOrder));
        setToast({ type: "ok", message: res.message });
      }
      setModalOpen(false);
    } catch (err) {
      const apiErr = err as ApiError;
      setToast({ type: "err", message: apiErr.message || "Không thể lưu liên kết." });
    } finally {
      setSavingSocial(false);
    }
  }

  async function handleDelete(linkId: string) {
    if (!window.confirm("Xóa liên kết mạng xã hội này?")) return;
    setBusyId(linkId);
    setToast(null);
    try {
      const res = await deleteContactSocialLink(linkId);
      setSocialLinks((prev) => prev.filter((item) => item.id !== linkId));
      setToast({ type: "ok", message: res.message });
    } catch (err) {
      const apiErr = err as ApiError;
      setToast({ type: "err", message: apiErr.message || "Không thể xóa." });
    } finally {
      setBusyId(null);
    }
  }

  async function toggleVisible(link: ContactSocialLink) {
    setBusyId(link.id);
    try {
      const res = await updateContactSocialLink(link.id, { isVisible: !link.isVisible });
      setSocialLinks((prev) => prev.map((item) => (item.id === link.id ? res.item : item)));
    } catch (err) {
      const apiErr = err as ApiError;
      setToast({ type: "err", message: apiErr.message || "Không thể cập nhật." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">{t("Quản lý liên hệ")}</h1>
          <p className="admin-page__subtitle">
            {t("Cập nhật email, điện thoại, địa chỉ và liên kết mạng xã hội hiển thị tại trang Liên hệ.")}
          </p>
        </div>
        <button type="button" className="admin-btn admin-btn--ghost" onClick={() => void load()} disabled={loading}>
          <FaRedo aria-hidden />
          {t("Tải lại")}
        </button>
      </header>

      {toast ? (
        <p className={`admin-toast admin-toast--${toast.type === "ok" ? "ok" : "err"}`} role="status">
          {toast.message}
        </p>
      ) : null}

      {loading ? (
        <p className="admin-loading-inline">{t("Đang tải…")}</p>
      ) : (
        <>
          <section className="admin-contact__section">
            <h2 className="admin-contact__section-title">{t("Thông tin liên hệ chính")}</h2>
            <form className="admin-contact__form" onSubmit={handleSaveCore}>
              <div className="admin-contact__field">
                <label htmlFor="contact-email">Email</label>
                <input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vinhlongconnect@gmail.com"
                  required
                />
              </div>
              <div className="admin-contact__field">
                <label htmlFor="contact-phone">{t("Số điện thoại")}</label>
                <input
                  id="contact-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0983149203"
                  required
                />
              </div>
              <div className="admin-contact__field">
                <label htmlFor="contact-address">{t("Địa chỉ")}</label>
                <input
                  id="contact-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Tiểu Cần, Vĩnh Long"
                  required
                />
              </div>
              <div>
                <button type="submit" className="admin-btn admin-btn--primary" disabled={savingCore}>
                  {savingCore ? t("Đang lưu…") : t("Lưu thông tin")}
                </button>
              </div>
            </form>
          </section>

          <section className="admin-contact__section">
            <div className="admin-contact__toolbar">
              <h2 className="admin-contact__section-title" style={{ margin: 0 }}>
                {t("Liên kết mạng xã hội")}
              </h2>
              <button type="button" className="admin-btn admin-btn--primary" onClick={openCreateModal}>
                <FaPlus aria-hidden />
                {t("Thêm liên kết")}
              </button>
            </div>
            <p className="admin-page__subtitle" style={{ marginBottom: "1rem" }}>
              {t("Để trống URL nếu chưa có — trang Liên hệ sẽ hiển thị nhãn “Sắp có”.")}
            </p>

            <div className="admin-contact__table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t("Nền tảng")}</th>
                    <th>{t("Nhãn")}</th>
                    <th>URL</th>
                    <th>{t("Thứ tự")}</th>
                    <th>{t("Hiển thị")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {socialLinks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="admin-table__empty">
                        {t("Chưa có liên kết mạng xã hội.")}
                      </td>
                    </tr>
                  ) : (
                    socialLinks.map((link) => (
                      <tr key={link.id}>
                        <td>{link.platform}</td>
                        <td>{link.label}</td>
                        <td className="admin-table__truncate">{link.url || "—"}</td>
                        <td>{link.sortOrder}</td>
                        <td>
                          <button
                            type="button"
                            className={`admin-badge ${link.isVisible ? "admin-badge--ok" : "admin-badge--pending"}`}
                            onClick={() => void toggleVisible(link)}
                            disabled={busyId === link.id}
                          >
                            {link.isVisible ? t("Có") : t("Ẩn")}
                          </button>
                        </td>
                        <td>
                          <div className="admin-table__actions">
                            <button
                              type="button"
                              className="admin-btn admin-btn--ghost admin-btn--sm"
                              onClick={() => openEditModal(link)}
                            >
                              {t("Sửa")}
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn--danger admin-btn--sm"
                              onClick={() => void handleDelete(link.id)}
                              disabled={busyId === link.id}
                              aria-label={t("Xóa")}
                            >
                              <FaTrash aria-hidden />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {modalOpen ? (
        <div className="admin-contact__modal-backdrop" role="presentation" onClick={() => setModalOpen(false)}>
          <div
            className="admin-contact__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="social-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="social-modal-title">{editingId ? t("Sửa liên kết") : t("Thêm liên kết")}</h3>
            <form className="admin-contact__form" onSubmit={handleSaveSocial}>
              <div className="admin-contact__field">
                <label htmlFor="social-platform">{t("Nền tảng")}</label>
                <select
                  id="social-platform"
                  value={socialForm.platform}
                  onChange={(e) => setSocialForm((f) => ({ ...f, platform: e.target.value }))}
                >
                  {PLATFORM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-contact__field">
                <label htmlFor="social-label">{t("Nhãn hiển thị")}</label>
                <input
                  id="social-label"
                  type="text"
                  value={socialForm.label}
                  onChange={(e) => setSocialForm((f) => ({ ...f, label: e.target.value }))}
                  required
                />
              </div>
              <div className="admin-contact__field">
                <label htmlFor="social-url">URL</label>
                <input
                  id="social-url"
                  type="url"
                  value={socialForm.url}
                  onChange={(e) => setSocialForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="admin-contact__field">
                <label htmlFor="social-sort">{t("Thứ tự")}</label>
                <input
                  id="social-sort"
                  type="number"
                  value={socialForm.sortOrder}
                  onChange={(e) => setSocialForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
                />
              </div>
              <label className="admin-contact__check">
                <input
                  type="checkbox"
                  checked={socialForm.isVisible}
                  onChange={(e) => setSocialForm((f) => ({ ...f, isVisible: e.target.checked }))}
                />
                {t("Hiển thị trên trang Liên hệ")}
              </label>
              <div className="admin-contact__modal-actions">
                <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setModalOpen(false)}>
                  {t("Hủy")}
                </button>
                <button type="submit" className="admin-btn admin-btn--primary" disabled={savingSocial}>
                  {savingSocial ? t("Đang lưu…") : t("Lưu")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
