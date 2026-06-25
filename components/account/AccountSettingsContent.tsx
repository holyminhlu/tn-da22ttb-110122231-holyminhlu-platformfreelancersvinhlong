"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaDesktop,
  FaDownload,
  FaLock,
  FaMoon,
  FaBell,
  FaSun,
  FaTrashAlt,
  FaTrophy,
} from "react-icons/fa";
import FreelancerAvatarFrame from "@/components/freelancer/FreelancerAvatarFrame";
import { getMe, isClientMeResponse, isFreelancerMeResponse } from "@/lib/api/users";
import {
  AVATAR_TIER_THRESHOLDS,
  getAvatarTierId,
  isAvatarTierUnlocked,
} from "@/lib/freelancer/avatarTier";
import { getUserInitials } from "@/lib/authSession";
import {
  applyThemePreference,
  getNotificationPrefs,
  getThemePreference,
  setNotificationPrefs,
  setThemePreference,
  type NotificationPrefs,
  type ThemePreference,
} from "@/lib/userPreferences";
import { useTranslation } from "@/hooks/useTranslation";
import WithdrawalPinSettings from "@/components/account/WithdrawalPinSettings";
import "./account-settings.css";

const TIER_FRAME_SIZE = 52;

function formatTierProgress(completedJobs: number, minOrders: number) {
  if (minOrders <= 0) return `${completedJobs} / 5`;
  return `${completedJobs} / ${minOrders}`;
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="as-toggle-row">
      <div>
        <span className="as-toggle-label">{label}</span>
        {hint ? <span className="as-toggle-hint">{hint}</span> : null}
      </div>
      <label className="ea-toggle">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="ea-toggle-slider" />
      </label>
    </div>
  );
}

function parseUserAgent(ua: string) {
  const browser =
    /Edg\//.test(ua) ? "Microsoft Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Trình duyệt";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : "Hệ điều hành khác";
  return { browser, os };
}

export default function AccountSettingsContent() {
  const { t } = useTranslation();

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [isFreelancer, setIsFreelancer] = useState(false);
  const [showWithdrawalPin, setShowWithdrawalPin] = useState(false);
  const [completedJobs, setCompletedJobs] = useState(0);
  const [theme, setTheme] = useState<ThemePreference>("light");
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(() => getNotificationPrefs());
  const [downloading, setDownloading] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMe();
      if (!data?.user) {
        router.replace("/dang-nhap");
        return;
      }
      setFullName(data.user.fullName || "");
      setEmail(data.user.email || "");
      setAvatarSrc(data.user.avatarUrl || null);
      const freelancer = isFreelancerMeResponse(data);
      setIsFreelancer(freelancer);
      setShowWithdrawalPin(freelancer || isClientMeResponse(data));
      setCompletedJobs(
        data.user.completedJobs ?? (freelancer ? data.freelancerProfile?.completed_jobs : undefined) ?? 0,
      );
    } catch {
      setError(t("Không thể tải thông tin tài khoản."));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    void load();
    setTheme(getThemePreference());
    setNotifPrefs(getNotificationPrefs());
  }, [load]);

  const currentTierId = useMemo(() => getAvatarTierId(completedJobs), [completedJobs]);
  const currentDevice = useMemo(() => {
    if (typeof navigator === "undefined") return null;
    const { browser, os } = parseUserAgent(navigator.userAgent);
    return {
      browser: browser === "Trình duyệt" ? t("Trình duyệt") : browser,
      os: os === "Hệ điều hành khác" ? t("Hệ điều hành khác") : os,
      lastActive: new Date().toLocaleString("vi-VN"),
      current: true,
    };
  }, [t]);

  function handleThemeChange(next: ThemePreference) {
    setTheme(next);
    setThemePreference(next);
    applyThemePreference(next);
  }

  function updateNotifPref<K extends keyof NotificationPrefs>(key: K, value: boolean) {
    const next = { ...notifPrefs, [key]: value };
    setNotifPrefs(next);
    setNotificationPrefs(next);
  }

  async function handleDownloadData() {
    setDownloading(true);
    setDownloadFeedback("");
    try {
      const data = await getMe();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `vlc-du-lieu-ca-nhan-${Date.now()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setDownloadFeedback(t("Đã tải xuống tệp dữ liệu cá nhân."));
    } catch {
      setDownloadFeedback(t("Không thể tải dữ liệu. Vui lòng thử lại sau."));
    } finally {
      setDownloading(false);
      window.setTimeout(() => setDownloadFeedback(""), 3500);
    }
  }

  function handleDeleteAccount() {
    const ok = window.confirm(
      t(
        "Xóa tài khoản là thao tác không thể hoàn tác. Bạn sẽ cần liên hệ bộ phận hỗ trợ để hoàn tất yêu cầu. Tiếp tục?",
      ),
    );
    if (!ok) return;
    window.alert(
      t(
        "Tính năng xóa tài khoản đang được triển khai. Vui lòng gửi email đến bộ phận hỗ trợ kèm địa chỉ email đăng nhập của bạn.",
      ),
    );
  }

  return (
    <div className="ea-main as-page">
      {loading ? (
        <p className="ea-loading">{t("Đang tải cài đặt...")}</p>
      ) : error ? (
        <p className="ea-error" role="alert">
          {error}
        </p>
      ) : (
        <div className="ea-content">
          {showWithdrawalPin ? <WithdrawalPinSettings /> : null}

          <section className="ea-card as-card">
            <h2 className="as-section-title">
              <FaBell className="mr-2 inline text-[#2563eb]" aria-hidden />
              {t("Cài đặt thông báo")}
            </h2>
            <p className="as-section-desc">
              {t("Chọn loại thông báo bạn muốn nhận trong ứng dụng. Thông báo hệ thống (xác minh, bảo mật, rút tiền) luôn được gửi.")}
            </p>
            <ToggleRow
              label={t("Đơn hàng & hợp đồng")}
              hint={t("Cập nhật trạng thái đơn, thanh toán và hợp đồng.")}
              checked={notifPrefs.orders}
              onChange={(v) => updateNotifPref("orders", v)}
            />
            <ToggleRow
              label={t("Tin nhắn mới")}
              hint={t("Thông báo khi có tin nhắn từ khách hàng hoặc freelancer.")}
              checked={notifPrefs.messages}
              onChange={(v) => updateNotifPref("messages", v)}
            />
            <ToggleRow
              label={t("Báo giá & mời làm việc")}
              hint={t("Báo giá mới, lời mời và phản hồi liên quan công việc.")}
              checked={notifPrefs.quotes}
              onChange={(v) => updateNotifPref("quotes", v)}
            />
          </section>

          <section className="ea-card as-card">
            <h2 className="as-section-title">
              <FaTrophy className="mr-2 inline text-[#d97706]" aria-hidden />
              {t("Thông tin danh hiệu")}
            </h2>
            {isFreelancer ? (
              <>
                <p className="as-section-desc">
                  {t(
                    "Hoàn thành thêm đơn hàng để mở khóa các khung danh hiệu cao hơn cho avatar của bạn.",
                  )}
                </p>
                <div className="as-tier-grid" role="list" aria-label={t("Các cấp danh hiệu")}>
                  {AVATAR_TIER_THRESHOLDS.map((item) => {
                    const unlocked = isAvatarTierUnlocked(completedJobs, item.minOrders);
                    const isCurrent = currentTierId === item.id;
                    const tierLabel = t(item.label);
                    return (
                      <div
                        key={item.id}
                        role="listitem"
                        className={`as-tier-item${unlocked ? " as-tier-item--unlocked" : ""}`}
                      >
                        <div className={`as-tier-frame-wrap${unlocked ? "" : " as-tier-frame-wrap--locked"}`}>
                          <FreelancerAvatarFrame
                            completedJobs={item.previewOrders}
                            size={TIER_FRAME_SIZE}
                            shape="circle"
                            src={avatarSrc}
                            alt={tierLabel}
                            fallback={getUserInitials(fullName, email)}
                            title={tierLabel}
                          />
                          {!unlocked ? (
                            <div className="as-tier-lock-overlay" aria-hidden>
                              <FaLock />
                            </div>
                          ) : null}
                        </div>
                        <p className="as-tier-label">
                          {tierLabel}
                          {isCurrent ? t(" · hiện tại") : ""}
                        </p>
                        <p className="as-tier-progress">{formatTierProgress(completedJobs, item.minOrders)}</p>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="as-section-desc">
                {t(
                  "Danh hiệu và khung avatar theo cấp bậc áp dụng cho tài khoản Freelancer khi hoàn thành đơn hàng trên nền tảng. Tài khoản Khách hàng không có danh hiệu hiển thị công khai.",
                )}
              </p>
            )}
          </section>

          <section className="ea-card as-card">
            <h2 className="as-section-title">
              <FaSun className="mr-2 inline text-[#d97706]" aria-hidden />
              {t("Tùy chọn giao diện Sáng / Tối")}
            </h2>
            <p className="as-section-desc">
              {t("Chọn chế độ hiển thị phù hợp với môi trường làm việc của bạn.")}
            </p>
            <div className="as-theme-options" role="group" aria-label={t("Chế độ giao diện")}>
              <button
                type="button"
                className={`as-theme-btn${theme === "light" ? " as-theme-btn--active" : ""}`}
                onClick={() => handleThemeChange("light")}
              >
                <FaSun className="mr-1 inline" aria-hidden />
                {t("Sáng")}
              </button>
              <button
                type="button"
                className={`as-theme-btn${theme === "dark" ? " as-theme-btn--active" : ""}`}
                onClick={() => handleThemeChange("dark")}
              >
                <FaMoon className="mr-1 inline" aria-hidden />
                {t("Tối")}
              </button>
              <button
                type="button"
                className={`as-theme-btn${theme === "system" ? " as-theme-btn--active" : ""}`}
                onClick={() => handleThemeChange("system")}
              >
                {t("Theo hệ thống")}
              </button>
            </div>
          </section>

          <section className="ea-card as-card">
            <h2 className="as-section-title">
              <FaDownload className="mr-2 inline text-[#2563eb]" aria-hidden />
              {t("Tải xuống dữ liệu cá nhân")}
            </h2>
            <p className="as-section-desc">
              {t("Xuất bản sao thông tin hồ sơ và tài khoản của bạn dưới dạng tệp JSON.")}
            </p>
            <button
              type="button"
              className="as-action-btn"
              onClick={() => void handleDownloadData()}
              disabled={downloading}
            >
              <FaDownload aria-hidden />
              {downloading ? t("Đang chuẩn bị...") : t("Tải xuống dữ liệu")}
            </button>
            {downloadFeedback ? <p className="as-feedback">{downloadFeedback}</p> : null}
          </section>

          <section className="ea-card as-card">
            <h2 className="as-section-title">
              <FaDesktop className="mr-2 inline text-[#4b5563]" aria-hidden />
              {t("Nhật ký thiết bị")}
            </h2>
            <p className="as-section-desc">
              {t("Các thiết bị đã đăng nhập gần đây vào tài khoản của bạn.")}
            </p>
            {currentDevice ? (
              <table className="as-device-table">
                <thead>
                  <tr>
                    <th>{t("Thiết bị")}</th>
                    <th>{t("Hệ điều hành")}</th>
                    <th>{t("Hoạt động gần nhất")}</th>
                    <th>{t("Trạng thái")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{currentDevice.browser}</td>
                    <td>{currentDevice.os}</td>
                    <td>{currentDevice.lastActive}</td>
                    <td>{t("Phiên hiện tại")}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="as-device-empty">{t("Chưa có thiết bị nào được ghi nhận.")}</p>
            )}
          </section>

          <section className="ea-card as-card as-danger-zone">
            <h2 className="as-section-title">
              <FaTrashAlt className="mr-2 inline" aria-hidden />
              {t("Xóa tài khoản")}
            </h2>
            <p className="as-section-desc">
              {t(
                "Xóa vĩnh viễn tài khoản và dữ liệu liên quan. Hành động này không thể hoàn tác sau khi được xử lý.",
              )}
            </p>
            <button type="button" className="as-danger-btn" onClick={handleDeleteAccount}>
              <FaTrashAlt aria-hidden />
              {t("Yêu cầu xóa tài khoản")}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
