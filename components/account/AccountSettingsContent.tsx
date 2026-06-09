"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaDesktop,
  FaDownload,
  FaGlobe,
  FaLock,
  FaMoon,
  FaBell,
  FaSun,
  FaTrashAlt,
  FaTrophy,
} from "react-icons/fa";
import FreelancerAvatarFrame from "@/components/freelancer/FreelancerAvatarFrame";
import { getMe, isFreelancerMeResponse } from "@/lib/api/users";
import {
  AVATAR_TIER_THRESHOLDS,
  getAvatarTierId,
  isAvatarTierUnlocked,
} from "@/lib/freelancer/avatarTier";
import { getUserInitials } from "@/lib/authSession";
import {
  applyThemePreference,
  getLocalePreference,
  getNotificationPrefs,
  getThemePreference,
  setLocalePreference,
  setNotificationPrefs,
  setThemePreference,
  type LocalePreference,
  type NotificationPrefs,
  type ThemePreference,
} from "@/lib/userPreferences";
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
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [isFreelancer, setIsFreelancer] = useState(false);
  const [completedJobs, setCompletedJobs] = useState(0);
  const [theme, setTheme] = useState<ThemePreference>("light");
  const [locale, setLocale] = useState<LocalePreference>("vi");
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(() => getNotificationPrefs());
  const [downloading, setDownloading] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMe();
      if (!data?.user) {
        router.replace("/login");
        return;
      }
      setFullName(data.user.fullName || "");
      setEmail(data.user.email || "");
      setAvatarSrc(data.user.avatarUrl || null);
      const freelancer = isFreelancerMeResponse(data);
      setIsFreelancer(freelancer);
      setCompletedJobs(
        data.user.completedJobs ?? (freelancer ? data.freelancerProfile?.completed_jobs : undefined) ?? 0,
      );
    } catch {
      setError("Không thể tải thông tin tài khoản.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
    setTheme(getThemePreference());
    setLocale(getLocalePreference());
    setNotifPrefs(getNotificationPrefs());
  }, [load]);

  const currentTierId = useMemo(() => getAvatarTierId(completedJobs), [completedJobs]);
  const currentDevice = useMemo(() => {
    if (typeof navigator === "undefined") return null;
    const { browser, os } = parseUserAgent(navigator.userAgent);
    return {
      browser,
      os,
      lastActive: new Date().toLocaleString("vi-VN"),
      current: true,
    };
  }, []);

  function handleThemeChange(next: ThemePreference) {
    setTheme(next);
    setThemePreference(next);
    applyThemePreference(next);
  }

  function handleLocaleChange(next: LocalePreference) {
    setLocale(next);
    setLocalePreference(next);
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
      setDownloadFeedback("Đã tải xuống tệp dữ liệu cá nhân.");
    } catch {
      setDownloadFeedback("Không thể tải dữ liệu. Vui lòng thử lại sau.");
    } finally {
      setDownloading(false);
      window.setTimeout(() => setDownloadFeedback(""), 3500);
    }
  }

  function handleDeleteAccount() {
    const ok = window.confirm(
      "Xóa tài khoản là thao tác không thể hoàn tác. Bạn sẽ cần liên hệ bộ phận hỗ trợ để hoàn tất yêu cầu. Tiếp tục?",
    );
    if (!ok) return;
    window.alert(
      "Tính năng xóa tài khoản đang được triển khai. Vui lòng gửi email đến bộ phận hỗ trợ kèm địa chỉ email đăng nhập của bạn.",
    );
  }

  return (
    <div className="ea-main as-page">
      {loading ? (
        <p className="ea-loading">Đang tải cài đặt...</p>
      ) : error ? (
        <p className="ea-error" role="alert">
          {error}
        </p>
      ) : (
        <div className="ea-content">
          <section className="ea-card as-card">
            <h2 className="as-section-title">
              <FaBell className="mr-2 inline text-[#2563eb]" aria-hidden />
              Cài đặt thông báo
            </h2>
            <p className="as-section-desc">Chọn loại thông báo bạn muốn nhận trong ứng dụng và qua email.</p>
            <ToggleRow
              label="Đơn hàng & hợp đồng"
              hint="Cập nhật trạng thái đơn, thanh toán và hợp đồng."
              checked={notifPrefs.orders}
              onChange={(v) => updateNotifPref("orders", v)}
            />
            <ToggleRow
              label="Tin nhắn mới"
              hint="Thông báo khi có tin nhắn từ client hoặc freelancer."
              checked={notifPrefs.messages}
              onChange={(v) => updateNotifPref("messages", v)}
            />
            <ToggleRow
              label="Báo giá & mời làm việc"
              hint="Báo giá mới, lời mời và phản hồi liên quan công việc."
              checked={notifPrefs.quotes}
              onChange={(v) => updateNotifPref("quotes", v)}
            />
            <ToggleRow
              label="Email tóm tắt hàng tuần"
              hint="Gửi bản tóm tắt hoạt động qua email đăng ký."
              checked={notifPrefs.emailDigest}
              onChange={(v) => updateNotifPref("emailDigest", v)}
            />
          </section>

          <section className="ea-card as-card">
            <h2 className="as-section-title">
              <FaTrophy className="mr-2 inline text-[#d97706]" aria-hidden />
              Thông tin danh hiệu
            </h2>
            {isFreelancer ? (
              <>
                <p className="as-section-desc">
                  Hoàn thành thêm đơn hàng để mở khóa các khung danh hiệu cao hơn cho avatar của bạn.
                </p>
                <div className="as-tier-grid" role="list" aria-label="Các cấp danh hiệu">
                  {AVATAR_TIER_THRESHOLDS.map((item) => {
                    const unlocked = isAvatarTierUnlocked(completedJobs, item.minOrders);
                    const isCurrent = currentTierId === item.id;
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
                            alt={item.label}
                            fallback={getUserInitials(fullName, email)}
                            title={item.label}
                          />
                          {!unlocked ? (
                            <div className="as-tier-lock-overlay" aria-hidden>
                              <FaLock />
                            </div>
                          ) : null}
                        </div>
                        <p className="as-tier-label">
                          {item.label}
                          {isCurrent ? " · hiện tại" : ""}
                        </p>
                        <p className="as-tier-progress">{formatTierProgress(completedJobs, item.minOrders)}</p>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="as-section-desc">
                Danh hiệu và khung avatar theo cấp bậc áp dụng cho tài khoản Freelancer khi hoàn thành đơn hàng trên
                nền tảng. Tài khoản Client không có danh hiệu hiển thị công khai.
              </p>
            )}
          </section>

          <section className="ea-card as-card">
            <h2 className="as-section-title">
              <FaGlobe className="mr-2 inline text-[#2563eb]" aria-hidden />
              Lựa chọn ngôn ngữ hiển thị
            </h2>
            <p className="as-section-desc">Ngôn ngữ giao diện ưu tiên. Một số nội dung có thể vẫn hiển thị tiếng Việt.</p>
            <select
              className="as-select"
              value={locale}
              onChange={(e) => handleLocaleChange(e.target.value as LocalePreference)}
              aria-label="Ngôn ngữ hiển thị"
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </section>

          <section className="ea-card as-card">
            <h2 className="as-section-title">
              <FaSun className="mr-2 inline text-[#d97706]" aria-hidden />
              Tùy chọn giao diện Sáng / Tối
            </h2>
            <p className="as-section-desc">Chọn chế độ hiển thị phù hợp với môi trường làm việc của bạn.</p>
            <div className="as-theme-options" role="group" aria-label="Chế độ giao diện">
              <button
                type="button"
                className={`as-theme-btn${theme === "light" ? " as-theme-btn--active" : ""}`}
                onClick={() => handleThemeChange("light")}
              >
                <FaSun className="mr-1 inline" aria-hidden />
                Sáng
              </button>
              <button
                type="button"
                className={`as-theme-btn${theme === "dark" ? " as-theme-btn--active" : ""}`}
                onClick={() => handleThemeChange("dark")}
              >
                <FaMoon className="mr-1 inline" aria-hidden />
                Tối
              </button>
              <button
                type="button"
                className={`as-theme-btn${theme === "system" ? " as-theme-btn--active" : ""}`}
                onClick={() => handleThemeChange("system")}
              >
                Theo hệ thống
              </button>
            </div>
          </section>

          <section className="ea-card as-card">
            <h2 className="as-section-title">
              <FaDownload className="mr-2 inline text-[#2563eb]" aria-hidden />
              Tải xuống dữ liệu cá nhân
            </h2>
            <p className="as-section-desc">
              Xuất bản sao thông tin hồ sơ và tài khoản của bạn dưới dạng tệp JSON.
            </p>
            <button
              type="button"
              className="as-action-btn"
              onClick={() => void handleDownloadData()}
              disabled={downloading}
            >
              <FaDownload aria-hidden />
              {downloading ? "Đang chuẩn bị..." : "Tải xuống dữ liệu"}
            </button>
            {downloadFeedback ? <p className="as-feedback">{downloadFeedback}</p> : null}
          </section>

          <section className="ea-card as-card">
            <h2 className="as-section-title">
              <FaDesktop className="mr-2 inline text-[#4b5563]" aria-hidden />
              Nhật ký thiết bị
            </h2>
            <p className="as-section-desc">Các thiết bị đã đăng nhập gần đây vào tài khoản của bạn.</p>
            {currentDevice ? (
              <table className="as-device-table">
                <thead>
                  <tr>
                    <th>Thiết bị</th>
                    <th>Hệ điều hành</th>
                    <th>Hoạt động gần nhất</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{currentDevice.browser}</td>
                    <td>{currentDevice.os}</td>
                    <td>{currentDevice.lastActive}</td>
                    <td>Phiên hiện tại</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="as-device-empty">Chưa có thiết bị nào được ghi nhận.</p>
            )}
          </section>

          <section className="ea-card as-card as-danger-zone">
            <h2 className="as-section-title">
              <FaTrashAlt className="mr-2 inline" aria-hidden />
              Xóa tài khoản
            </h2>
            <p className="as-section-desc">
              Xóa vĩnh viễn tài khoản và dữ liệu liên quan. Hành động này không thể hoàn tác sau khi được xử lý.
            </p>
            <button type="button" className="as-danger-btn" onClick={handleDeleteAccount}>
              <FaTrashAlt aria-hidden />
              Yêu cầu xóa tài khoản
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
