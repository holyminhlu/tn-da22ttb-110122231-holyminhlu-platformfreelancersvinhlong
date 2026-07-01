"use client";

import { formatDateUi, tUi, formatVndUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FaBriefcase,
  FaCamera,
  FaCheckCircle,
  FaEye,
  FaFileContract,
  FaLock,
  FaMapMarkerAlt,
  FaPencilAlt,
  FaPlusCircle,
  FaSearch,
  FaShieldAlt,
  FaStar,
  FaUserEdit,
  FaWallet,
} from "react-icons/fa";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getMe,
  isClientMeResponse,
  updateAvatar,
  uploadAvatar,
  type ClientMeResponse,
  type MeUser,
} from "@/lib/api/users";
import { getUserInitials, persistStoredUser, resolveAvatarSrc, toStoredUser } from "@/lib/authSession";
import EditAboutDialog from "./EditAboutDialog";
import "./client-profile.css";

function billingCode(userId: string) {
  const digits = userId.replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(0, 10);
  return digits.padStart(10, "0").slice(0, 10) || "0000000000";
}

function jobStatusLabel(status: string) {
  const s = status.toLowerCase();
  if (s === "open") return "Đang tuyển";
  if (s === "in_progress") return "Đang thực hiện";
  if (s === "closed") return "Đã đóng";
  if (s === "cancelled") return "Đã hủy";
  return status || "—";
}

const COMPLETION_ITEMS: { key: keyof MeUser | "phone"; label: string; href?: string }[] = [
  { key: "fullName", label: "Họ tên" },
  { key: "avatarUrl", label: "Ảnh đại diện" },
  { key: "phone", label: "Số điện thoại", href: "/edit-account" },
  { key: "bio", label: "Giới thiệu" },
  { key: "tagline", label: "Dòng định vị" },
  { key: "districtCity", label: "Địa điểm", href: "/edit-account" },
  { key: "website", label: "Website", href: "/edit-account" },
];

export default function ClientProfileContent() {  const { t, formatVnd, formatDate } = useTranslation();
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<ClientMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getMe();
      if (!isClientMeResponse(res)) {
        setError(t("Trang này dành cho tài khoản Khách hàng."));
        return;
      }
      setData(res);
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
      router.replace("/dang-nhap?next=/ho-so");
      return;
    }
    void load();
  }, [load, router]);

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !data?.user) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Vui lòng chọn file ảnh (JPG, PNG, WebP...).");
      return;
    }

    setAvatarUploading(true);
    setAvatarError("");
    try {
      const url = await uploadAvatar(file);
      const result = await updateAvatar(url);
      const nextAvatar = result.avatarUrl || url;
      persistStoredUser(
        toStoredUser({
          id: data.user.id,
          email: data.user.email,
          role: data.user.role,
          fullName: data.user.fullName || "",
          avatarUrl: nextAvatar,
        }),
      );
      await load();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể cập nhật ảnh đại diện.";
      setAvatarError(message);
    } finally {
      setAvatarUploading(false);
    }
  }

  if (loading) {
    return <p className="ea-loading px-4 py-12">{t("Đang tải hồ sơ...")}</p>;
  }

  if (error || !data) {
    return (
      <p className="ea-error px-4 py-12" role="alert">
        {error || "Không có dữ liệu hồ sơ."}
      </p>
    );
  }

  const user = data.user;
  const avatarSrc = resolveAvatarSrc(user.avatarUrl);
  const locationLine = [user.districtCity, "Việt Nam"].filter(Boolean).join(", ");
  const stats = data.clientStats;
  const totalJobs = Number(stats?.total_jobs) || 0;
  const openJobs = Number(stats?.open_jobs) || 0;
  const totalContracts = Number(stats?.total_contracts) || 0;
  const balance = data.account?.balance ?? 0;
  const escrowBalance = data.account?.escrowBalance ?? 0;
  const completionScore = data.completionScore ?? 0;
  const recentJobs = (data.recentJobs ?? []).slice(0, 5);
  const reviews = data.reviews ?? [];
  const timeline = data.timeline ?? [];

  function isItemComplete(key: (typeof COMPLETION_ITEMS)[number]["key"]) {
    if (key === "phone") return Boolean(user.phone?.trim());
    const value = user[key as keyof MeUser];
    return Boolean(String(value ?? "").trim());
  }

  return (
    <>
      <div className="ea-main cp-body">
        <div className="ea-content cp-content">
          <div className="cp-profile-card">
            <div className="cp-profile-card__main">
              <div className="cp-profile-card__identity">
                <div className={`cp-avatar-wrap${avatarUploading ? " cp-avatar-wrap--loading" : ""}`}>
                  <Avatar className="cp-avatar rounded-sm">
                    {avatarSrc ? (
                      <AvatarImage src={avatarSrc} alt={user.fullName || ""} className="object-cover" />
                    ) : null}
                    <AvatarFallback className="rounded-sm text-lg bg-[#e8f1fb] text-[#0066cc]">
                      {getUserInitials(user.fullName, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="cp-avatar-overlay" aria-hidden={avatarUploading}>
                    <button
                      type="button"
                      className="cp-avatar-overlay__btn"
                      aria-label={t("Đổi ảnh đại diện")}
                      disabled={avatarUploading}
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      <FaCamera aria-hidden />
                      <span>{t("Đổi")}</span>
                    </button>
                    {avatarSrc ? (
                      <button
                        type="button"
                        className="cp-avatar-overlay__btn"
                        aria-label={t("Xem ảnh đại diện")}
                        disabled={avatarUploading}
                        onClick={() => setAvatarPreviewOpen(true)}
                      >
                        <FaEye aria-hidden />
                        <span>Xem</span>
                      </button>
                    ) : null}
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="cp-avatar__input"
                    aria-hidden
                    tabIndex={-1}
                    onChange={(e) => void handleAvatarChange(e)}
                  />
                </div>
                <div className="cp-profile-card__info">
                  <div className="cp-name">
                    {user.fullName || user.email}
                    <Link href="/edit-account" className="cp-name-edit" aria-label={t("Sửa thông tin liên hệ")}>
                      <FaPencilAlt aria-hidden />
                    </Link>
                  </div>
                  {user.tagline ? <p className="cp-tagline">{t(user.tagline)}</p> : null}
                  <p className="cp-location">
                    <FaMapMarkerAlt aria-hidden />
                    {locationLine || "Chưa cập nhật địa điểm"}
                  </p>
                  <div className="cp-verified-row">
                    {user.isEmailVerified ? (
                      <span className="cp-verified-pill cp-verified-pill--ok">
                        <FaCheckCircle aria-hidden /> {t("Email đã xác minh")}
                      </span>
                    ) : (
                      <span className="cp-verified-pill">{t("Email chưa xác minh")}</span>
                    )}
                    {user.phone ? (
                      <span className="cp-verified-pill cp-verified-pill--ok">
                        <FaCheckCircle aria-hidden /> {user.phone}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="cp-card-actions">
                <Link href="/edit-account" className="cp-card-actions__btn">
                  <FaUserEdit aria-hidden />
                  {t("Sửa liên hệ")}
                </Link>
                <Link href="/edit-account/xac-minh" className="cp-card-actions__btn cp-card-actions__btn--outline">
                  <FaShieldAlt aria-hidden />
                  {t("Xác minh danh tính")}
                </Link>
              </div>
            </div>
          </div>

          {avatarError ? (
            <p className="cp-inline-error" role="alert">
              {avatarError}
            </p>
          ) : null}

          <div className="cp-grid cp-grid--stats">
            <div className="cp-stat-card">
              <FaBriefcase className="cp-stat-card__icon" aria-hidden />
              <span className="cp-stat-card__value">{totalJobs}</span>
              <span className="cp-stat-card__label">{t("Việc đã đăng")}</span>
            </div>
            <div className="cp-stat-card cp-stat-card--accent">
              <FaSearch className="cp-stat-card__icon" aria-hidden />
              <span className="cp-stat-card__value">{openJobs}</span>
              <span className="cp-stat-card__label">{t("Đang tuyển")}</span>
            </div>
            <div className="cp-stat-card">
              <FaFileContract className="cp-stat-card__icon" aria-hidden />
              <span className="cp-stat-card__value">{totalContracts}</span>
              <span className="cp-stat-card__label">{t("Hợp đồng")}</span>
            </div>
            <div className="cp-stat-card">
              <FaStar className="cp-stat-card__icon" aria-hidden />
              <span className="cp-stat-card__value">{reviews.length}</span>
              <span className="cp-stat-card__label">{t("Đánh giá đã gửi")}</span>
            </div>
          </div>

          <div className="cp-grid cp-grid--two">
            <section className="cp-panel">
              <h2 className="cp-panel__title">{t("Hoàn thiện hồ sơ")}</h2>
              <div className="cp-completion">
                <div className="cp-completion__head">
                  <span className="cp-completion__score">{completionScore}%</span>
                  <span className="cp-completion__hint">{t("Càng đầy đủ, freelancer càng tin tưởng khi nhận việc")}</span>
                </div>
                <div className="cp-completion__bar" aria-hidden>
                  <span className="cp-completion__fill" style={{ width: `${completionScore}%` }} />
                </div>
                <ul className="cp-completion__list">
                  {COMPLETION_ITEMS.map((item) => {
                    const done = isItemComplete(item.key);
                    const inner = (
                      <>
                        <FaCheckCircle
                          className={done ? "cp-completion__check cp-completion__check--done" : "cp-completion__check"}
                          aria-hidden
                        />
                        {t(item.label)}
                      </>
                    );
                    return (
                      <li key={item.key} className={done ? "cp-completion__item cp-completion__item--done" : "cp-completion__item"}>
                        {item.href && !done ? (
                          <Link href={item.href} className="cp-completion__link">
                            {inner}
                          </Link>
                        ) : (
                          inner
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>

            <section className="cp-panel cp-panel--wallet">
              <h2 className="cp-panel__title">{t("Tài khoản thanh toán")}</h2>
              <p className="cp-wallet__code">Mã thanh toán: {billingCode(user.id)}</p>
              <div className="cp-wallet__rows">
                <div className="cp-wallet__row">
                  <FaWallet className="cp-wallet__icon" aria-hidden />
                  <div>
                    <span className="cp-wallet__label">{t("Số dư khả dụng")}</span>
                    <strong className="cp-wallet__amount">{formatVndUi(balance)}</strong>
                  </div>
                </div>
                {escrowBalance > 0 ? (
                  <div className="cp-wallet__row">
                    <FaLock className="cp-wallet__icon cp-wallet__icon--escrow" aria-hidden />
                    <div>
                      <span className="cp-wallet__label">{t("Đang ký quỹ")}</span>
                      <strong className="cp-wallet__amount cp-wallet__amount--secondary">
                        {formatVndUi(escrowBalance)}
                      </strong>
                    </div>
                  </div>
                ) : null}
              </div>
              <Link href="/payments" className="cp-wallet__deposit">
                <FaPlusCircle aria-hidden />
                {t("Nạp tiền / Quản lý thanh toán")}
              </Link>
            </section>
          </div>

          <section className="cp-panel">
            <div className="cp-panel__head">
              <h2 className="cp-panel__title">{t("Giới thiệu")}</h2>
              <button type="button" className="cp-panel__edit" onClick={() => setAboutOpen(true)}>
                <FaPencilAlt aria-hidden />
                {t("Chỉnh sửa")}
              </button>
            </div>
            {user.bio?.trim() || user.tagline?.trim() ? (
              <div className="cp-about">
                {user.tagline?.trim() ? (
                  <p className="cp-about__tagline">&ldquo;{user.tagline.trim()}&rdquo;</p>
                ) : null}
                {user.bio?.trim() ? (
                  <p className="cp-about__bio">{user.bio.trim()}</p>
                ) : null}
              </div>
            ) : (
              <div className="cp-empty">
                <p>{t("Thêm vài dòng giới thiệu để freelancer hiểu rõ hơn về bạn và dự án.")}</p>
                <button type="button" className="cp-empty__btn" onClick={() => setAboutOpen(true)}>
                  {t("Viết giới thiệu")}
                </button>
              </div>
            )}
          </section>

          <section className="cp-panel">
            <div className="cp-panel__head">
              <h2 className="cp-panel__title">Việc gần đây ({totalJobs})</h2>
              <Link href="/hire/joblist" className="cp-panel__link">
                {t("Xem tất cả")}
              </Link>
            </div>
            {recentJobs.length > 0 ? (
              <ul className="cp-job-list">
                {recentJobs.map((job) => (
                  <li key={job.id} className="cp-job-list__item">
                    <Link href="/hire/joblist" className="cp-job-list__title">
                      {t(job.title)}
                    </Link>
                    <p className="cp-job-list__meta">
                      {jobStatusLabel(job.status)}
                      {job.budget != null ? ` · ${formatVndUi(job.budget)}` : ""}
                      {" · "}
                      {formatDateUi(job.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="cp-empty">
                <p>{t("Bạn chưa đăng công việc nào.")}</p>
                <Link href="/hire/post" className="cp-empty__btn cp-empty__btn--link">
                  {t("Đăng việc đầu tiên")}
                </Link>
              </div>
            )}
          </section>

          <section className="cp-panel">
            <h2 className="cp-panel__title">{t("Thao tác nhanh")}</h2>
            <div className="cp-quick-actions">
              <Link href="/hire/post" className="cp-quick-action">
                <FaBriefcase aria-hidden />
                <span>{t("Đăng việc mới")}</span>
              </Link>
              <Link href="/freelancers" className="cp-quick-action">
                <FaSearch aria-hidden />
                <span>{t("Tìm freelancer")}</span>
              </Link>
              <Link href="/manage" className="cp-quick-action">
                <FaFileContract aria-hidden />
                <span>{t("Quản lý hợp đồng")}</span>
              </Link>
              <Link href="/ho-so/phan-hoi" className="cp-quick-action">
                <FaStar aria-hidden />
                <span>{t("Phản hồi & đánh giá")}</span>
              </Link>
            </div>
          </section>

          {timeline.length > 0 ? (
            <section className="cp-panel">
              <h2 className="cp-panel__title">{t("Hoạt động gần đây")}</h2>
              <ul className="cp-timeline">
                {timeline.map((event, index) => (
                  <li key={`${event.event_time}-${index}`} className="cp-timeline__item">
                    <time className="cp-timeline__time" dateTime={event.event_time}>
                      {formatDateUi(event.event_time)}
                    </time>
                    <span className="cp-timeline__title">{event.event_title}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      {aboutOpen ? (
        <EditAboutDialog
          fullName={user.fullName || ""}
          title=""
          tagline={user.tagline || ""}
          bio={user.bio || ""}
          audience="client"
          onClose={() => setAboutOpen(false)}
          onSaved={() => void load()}
        />
      ) : null}

      {avatarPreviewOpen && avatarSrc ? (
        <div className="cp-preview-backdrop" role="presentation">
          <div className="cp-preview" role="dialog" aria-label={t("Xem ảnh đại diện")}>
            <Image src={avatarSrc} alt="" width={320} height={320} className="cp-preview__img" unoptimized />
            <button type="button" className="cp-preview__close" onClick={() => setAvatarPreviewOpen(false)}>
              {t("Đóng")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
