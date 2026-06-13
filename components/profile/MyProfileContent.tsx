"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FaBriefcase,
  FaCamera,
  FaExternalLinkAlt,
  FaEye,
  FaFacebookF,
  FaFileAlt,
  FaFolderOpen,
  FaGlobe,
  FaImages,
  FaLinkedinIn,
  FaPencilAlt,
  FaPlay,
  FaPlus,
  FaShareAlt,
  FaTools,
  FaUserEdit,
} from "react-icons/fa";
import FreelancerAvatarFrame from "@/components/freelancer/FreelancerAvatarFrame";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadServiceThumbnail } from "@/lib/api/services";
import {
  getMe,
  isFreelancerMeResponse,
  updateAvatar,
  type FreelancerMeResponse,
  type MeUser,
} from "@/lib/api/users";
import { getUserInitials, persistStoredUser, resolveAvatarSrc, toStoredUser } from "@/lib/authSession";
import { formatVnd } from "@/lib/format";
import AddExclusiveResourceDialog from "./AddExclusiveResourceDialog";
import AddPortfolioDialog from "./AddPortfolioDialog";
import AddProfileFileDialog from "./AddProfileFileDialog";
import AddSkillDialog from "./AddSkillDialog";
import EditAboutDialog from "./EditAboutDialog";
import "./my-profile.css";

function parsePortfolioImages(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images.map((item) => String(item || "").trim()).filter(Boolean);
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ProfileSection({
  title,
  count,
  onAdd,
  children,
  emptyDescription,
  emptyButtonLabel,
  onEmptyAction,
  isEmpty,
  emptyIcon,
}: {
  title: string;
  count?: number;
  onAdd?: () => void;
  children: React.ReactNode;
  emptyDescription: string;
  emptyButtonLabel: string;
  onEmptyAction: () => void;
  isEmpty: boolean;
  emptyIcon?: React.ReactNode;
}) {
  return (
    <section className="mp-section" id={title.toLowerCase().replace(/\s+/g, "-")}>
      <div className="mp-section__head">
        <div className="mp-section__head-row">
          <h3 className="mp-section__title">
            {title}
            {count != null ? ` (${count})` : null}
          </h3>
          {onAdd ? (
            <button
              type="button"
              className="mp-section__add"
              aria-label={`Thêm ${title}`}
              onClick={onAdd}
            >
              <FaPlus aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
      {isEmpty ? (
        <div className="mp-section__empty">
          {emptyIcon ? <div className="mp-empty__icon">{emptyIcon}</div> : null}
          <p className="mp-empty__text">{emptyDescription}</p>
          <button type="button" className="mp-section__cta" onClick={onEmptyAction}>
            {emptyButtonLabel}
          </button>
        </div>
      ) : (
        <div className="mp-section__body">{children}</div>
      )}
    </section>
  );
}

export default function MyProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<FreelancerMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [skillOpen, setSkillOpen] = useState(false);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [resourceOpen, setResourceOpen] = useState(false);
  const [fileOpen, setFileOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [shareFeedback, setShareFeedback] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getMe();
      if (!isFreelancerMeResponse(res)) {
        setError("Trang này dành cho freelancer.");
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
      router.replace("/dang-nhap");
      return;
    }
    void load();
  }, [load, router]);

  useEffect(() => {
    const add = searchParams.get("add");
    if (add === "skills") setSkillOpen(true);
    if (add === "portfolio") setPortfolioOpen(true);
    if (add === "resources") setResourceOpen(true);
    if (add === "files") setFileOpen(true);
    if (add === "about") setAboutOpen(true);
  }, [searchParams]);

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
      const url = await uploadServiceThumbnail(file);
      const result = await updateAvatar(url);
      const nextAvatar = result.avatarUrl || url;
      persistStoredUser(
        toStoredUser({
          id: data.user.id,
          email: data.user.email,
          role: data.user.role,
          fullName: data.user.fullName || "",
          avatarUrl: nextAvatar,
          completedJobs: data.user.completedJobs ?? data.freelancerProfile?.completed_jobs ?? 0,
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
    return <p className="ea-loading px-4 py-12">Đang tải hồ sơ...</p>;
  }

  if (error || !data) {
    return (
      <p className="ea-error px-4 py-12" role="alert">
        {error || "Không có dữ liệu hồ sơ."}
      </p>
    );
  }

  const user: MeUser = data.user;
  const avatarSrc = resolveAvatarSrc(user.avatarUrl);
  const locationLine = [user.districtCity, "Việt Nam"].filter(Boolean).join(", ");
  const skills = data.skills ?? [];
  const portfolio = data.portfolio ?? [];
  const exclusiveResources = data.exclusiveResources ?? [];
  const profileFiles = data.profileFiles ?? [];
  const services = data.services ?? [];
  const hasAbout = Boolean(user.bio?.trim() || user.tagline?.trim());
  const isPublicReady = hasAbout && services.length > 0;
  const publicProfilePath =
    services.length > 0
      ? `/hire/search/${user.id}?service=${encodeURIComponent(services[0].id)}`
      : `/hire/search/${user.id}`;
  const freelancerTitle = data.freelancerProfile?.title ?? "";
  const completedJobs = user.completedJobs ?? data.freelancerProfile?.completed_jobs ?? 0;

  async function handleShareProfile() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${publicProfilePath}`
        : publicProfilePath;
    const title = `${user.fullName || "Freelancer"} — VL Connected`;
    const text = user.tagline?.trim() || "Xem hồ sơ freelancer trên VL Connected";

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareFeedback("Đã sao chép link hồ sơ!");
      window.setTimeout(() => setShareFeedback(""), 2500);
    } catch {
      setShareFeedback("Không thể sao chép. Mở hồ sơ công khai và copy URL trên trình duyệt.");
      window.setTimeout(() => setShareFeedback(""), 4000);
    }
  }

  return (
    <>
      <div className="ea-main mp-body">
        <div className="ea-content mp-content">
          <div className="mp-profile-card">
            <div className="mp-profile-card__main">
              <div className="mp-profile-card__identity">
                <div className={`mp-avatar-wrap${avatarUploading ? " mp-avatar-wrap--loading" : ""}`}>
                  <FreelancerAvatarFrame
                    completedJobs={completedJobs}
                    size={48}
                    shape="circle"
                    src={avatarSrc}
                    alt={user.fullName || ""}
                    fallback={getUserInitials(user.fullName, user.email)}
                    className="mp-avatar-frame"
                  />
                  <div className="mp-avatar-overlay" aria-hidden={avatarUploading}>
                    <button
                      type="button"
                      className="mp-avatar-overlay__btn"
                      aria-label="Đổi ảnh đại diện"
                      disabled={avatarUploading}
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      <FaCamera aria-hidden />
                      <span>Đổi</span>
                    </button>
                    {avatarSrc ? (
                      <button
                        type="button"
                        className="mp-avatar-overlay__btn"
                        aria-label="Xem ảnh đại diện"
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
                    className="mp-avatar__input"
                    aria-hidden
                    tabIndex={-1}
                    onChange={(e) => void handleAvatarChange(e)}
                  />
                </div>
                <div className="mp-profile-card__info">
                  <div className="mp-name">
                    {user.fullName || user.email}
                    <Link href="/edit-account" className="mp-name-edit" aria-label="Sửa tên">
                      <FaPencilAlt aria-hidden />
                    </Link>
                  </div>
                  {user.tagline ? <p className="mp-tagline">{user.tagline}</p> : null}
                  <p className="mp-location">{locationLine || "—"}</p>
                  <div className="mp-social-row">
                    {[FaGlobe, FaPlay, FaFacebookF, FaLinkedinIn].map((Icon, i) => (
                      <span key={i} className="mp-social-btn" aria-hidden>
                        <Icon />
                        <span className="mp-social-plus">
                          <FaPlus />
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mp-card-actions">
                <Link
                  href={publicProfilePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={
                    isPublicReady
                      ? "Mở hồ sơ như khách hàng thấy"
                      : "Xem trước — cần ít nhất một dịch vụ đã xuất bản và mục Giới thiệu để hiển thị đầy đủ"
                  }
                >
                  Xem hồ sơ công khai
                  <FaExternalLinkAlt className="mp-card-actions__icon" aria-hidden />
                </Link>
                <button
                  type="button"
                  onClick={() => void handleShareProfile()}
                  title={isPublicReady ? "Chia sẻ link hồ sơ" : "Chia sẻ link xem trước hồ sơ"}
                >
                  Chia sẻ <FaShareAlt className="mp-card-actions__icon" aria-hidden />
                </button>
              </div>
            </div>
          </div>
          {avatarError ? (
            <p className="mp-avatar__error" role="alert">
              {avatarError}
            </p>
          ) : null}
          {shareFeedback ? (
            <p className="mp-share-feedback" role="status">
              {shareFeedback}
            </p>
          ) : null}

          <ProfileSection
            title="Giới thiệu"
            emptyDescription="Dùng không gian này để giới thiệu bản thân với nhà tuyển dụng."
            emptyButtonLabel="Thêm chi tiết"
            onEmptyAction={() => setAboutOpen(true)}
            isEmpty={!hasAbout}
            emptyIcon={<FaUserEdit aria-hidden />}
          >
            <div className="mp-about-card">
              {user.tagline ? <p className="mp-about-card__tagline">{user.tagline}</p> : null}
              <p className="mp-about-text">{user.bio || "—"}</p>
              <button type="button" className="mp-section__edit-btn" onClick={() => setAboutOpen(true)}>
                <FaPencilAlt aria-hidden />
                Sửa giới thiệu
              </button>
            </div>
          </ProfileSection>

          <ProfileSection
            title="Kỹ năng"
            count={skills.length}
            onAdd={() => setSkillOpen(true)}
            emptyDescription="Thêm kỹ năng để nhà tuyển dụng hiểu rõ năng lực của bạn."
            emptyButtonLabel="Thêm kỹ năng"
            onEmptyAction={() => setSkillOpen(true)}
            isEmpty={skills.length === 0}
            emptyIcon={<FaTools aria-hidden />}
          >
            <div className="mp-skill-grid">
              {skills.map((s) => (
                <div key={s.id} className="mp-skill-chip">
                  <span className="mp-skill-chip__name">{s.name}</span>
                  <span className="mp-skill-chip__meta">
                    {s.level || "Chưa ghi cấp độ"} · {s.years_of_experience ?? 0} năm
                  </span>
                </div>
              ))}
            </div>
            <button type="button" className="mp-section__edit-btn" onClick={() => setSkillOpen(true)}>
              <FaPlus aria-hidden />
              Thêm kỹ năng khác
            </button>
          </ProfileSection>

          <ProfileSection
            title="Dịch vụ"
            count={services.length}
            emptyDescription="Cho nhà tuyển dụng biết bạn cung cấp dịch vụ gì."
            emptyButtonLabel="Thêm dịch vụ"
            onEmptyAction={() => router.push("/dashboard")}
            isEmpty={services.length === 0}
            emptyIcon={<FaBriefcase aria-hidden />}
          >
            <ul className="mp-service-list">
              {services.map((s) => (
                <li key={s.id} className="mp-list-item">
                  <p className="mp-list-item__title">{s.title}</p>
                  <p className="mp-list-item__meta">{formatVnd(s.price)}</p>
                </li>
              ))}
            </ul>
          </ProfileSection>

          <ProfileSection
            title="Portfolio"
            count={portfolio.length}
            onAdd={() => setPortfolioOpen(true)}
            emptyDescription="Trưng bày công việc đã làm để thu hút khách hàng."
            emptyButtonLabel="Thêm portfolio"
            onEmptyAction={() => setPortfolioOpen(true)}
            isEmpty={portfolio.length === 0}
            emptyIcon={<FaImages aria-hidden />}
          >
            <div className="mp-portfolio-grid">
              {portfolio.map((p) => {
                const images = parsePortfolioImages(p.images);
                const thumb = resolveAvatarSrc(images[0]);
                return (
                  <article key={p.id} className="mp-portfolio-card">
                    <div className="mp-portfolio-card__media">
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt=""
                          width={320}
                          height={180}
                          className="mp-portfolio-card__img"
                          unoptimized
                        />
                      ) : (
                        <div className="mp-portfolio-card__placeholder">
                          <FaImages aria-hidden />
                        </div>
                      )}
                    </div>
                    <div className="mp-portfolio-card__body">
                      <h4 className="mp-portfolio-card__title">{p.title}</h4>
                      {p.description ? (
                        <p className="mp-portfolio-card__desc">{p.description}</p>
                      ) : null}
                      {p.project_url ? (
                        <a
                          href={p.project_url}
                          className="mp-list-item__link"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Xem dự án <FaExternalLinkAlt aria-hidden />
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
            <button type="button" className="mp-section__edit-btn" onClick={() => setPortfolioOpen(true)}>
              <FaPlus aria-hidden />
              Thêm portfolio khác
            </button>
          </ProfileSection>

          <ProfileSection
            title="Tài nguyên dành riêng"
            count={exclusiveResources.length}
            onAdd={() => setResourceOpen(true)}
            emptyDescription="Thêm tài nguyên dành riêng cho khách hàng."
            emptyButtonLabel="Thêm tài nguyên"
            onEmptyAction={() => setResourceOpen(true)}
            isEmpty={exclusiveResources.length === 0}
            emptyIcon={<FaFolderOpen aria-hidden />}
          >
            <ul className="mp-asset-list">
              {exclusiveResources.map((item) => {
                const href =
                  item.resource_type === "link"
                    ? item.link_url
                    : resolveAvatarSrc(item.file_url);
                return (
                  <li key={item.id} className="mp-asset-card">
                    <div className="mp-asset-card__icon" aria-hidden>
                      {item.resource_type === "link" ? <FaGlobe /> : <FaFileAlt />}
                    </div>
                    <div className="mp-asset-card__body">
                      <h4 className="mp-asset-card__title">{item.title}</h4>
                      {item.description ? (
                        <p className="mp-asset-card__desc">{item.description}</p>
                      ) : null}
                      <p className="mp-asset-card__meta">
                        {item.resource_type === "link" ? "Link" : item.file_name || "Tệp đính kèm"}
                      </p>
                      {href ? (
                        <a
                          href={href}
                          className="mp-list-item__link"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Mở tài nguyên <FaExternalLinkAlt aria-hidden />
                        </a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            <button type="button" className="mp-section__edit-btn" onClick={() => setResourceOpen(true)}>
              <FaPlus aria-hidden />
              Thêm tài nguyên khác
            </button>
          </ProfileSection>

          <ProfileSection
            title="Tệp tin"
            count={profileFiles.length}
            onAdd={() => setFileOpen(true)}
            emptyDescription="Thêm tệp để chia sẻ với khách hàng."
            emptyButtonLabel="Thêm tệp"
            onEmptyAction={() => setFileOpen(true)}
            isEmpty={profileFiles.length === 0}
            emptyIcon={<FaFileAlt aria-hidden />}
          >
            <ul className="mp-asset-list">
              {profileFiles.map((item) => {
                const href = resolveAvatarSrc(item.file_url);
                return (
                  <li key={item.id} className="mp-asset-card">
                    <div className="mp-asset-card__icon" aria-hidden>
                      <FaFileAlt />
                    </div>
                    <div className="mp-asset-card__body">
                      <h4 className="mp-asset-card__title">{item.title}</h4>
                      {item.description ? (
                        <p className="mp-asset-card__desc">{item.description}</p>
                      ) : null}
                      <p className="mp-asset-card__meta">
                        {item.file_name || "Tệp đính kèm"}
                        {item.file_size ? ` · ${formatFileSize(item.file_size)}` : ""}
                      </p>
                      {href ? (
                        <a href={href} className="mp-list-item__link" target="_blank" rel="noreferrer">
                          Tải / xem tệp <FaExternalLinkAlt aria-hidden />
                        </a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            <button type="button" className="mp-section__edit-btn" onClick={() => setFileOpen(true)}>
              <FaPlus aria-hidden />
              Thêm tệp khác
            </button>
          </ProfileSection>
        </div>
      </div>

      {avatarPreviewOpen && avatarSrc ? (
        <div
          className="mp-dialog-backdrop"
          role="presentation"
          onClick={() => setAvatarPreviewOpen(false)}
        >
          <div
            className="mp-avatar-preview"
            role="dialog"
            aria-modal="true"
            aria-label="Ảnh đại diện"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="mp-avatar-preview__close"
              aria-label="Đóng"
              onClick={() => setAvatarPreviewOpen(false)}
            >
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarSrc} alt={user.fullName || "Ảnh đại diện"} className="mp-avatar-preview__img" />
            <div className="mp-avatar-preview__actions">
              <button
                type="button"
                className="mp-dialog__btn mp-dialog__btn--ghost"
                onClick={() => setAvatarPreviewOpen(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="mp-dialog__btn mp-dialog__btn--primary"
                disabled={avatarUploading}
                onClick={() => {
                  setAvatarPreviewOpen(false);
                  avatarInputRef.current?.click();
                }}
              >
                Đổi ảnh
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {aboutOpen ? (
        <EditAboutDialog
          fullName={user.fullName || user.email || ""}
          title={freelancerTitle}
          tagline={user.tagline || ""}
          bio={user.bio || ""}
          onClose={() => setAboutOpen(false)}
          onSaved={() => void load()}
        />
      ) : null}
      {skillOpen ? (
        <AddSkillDialog existing={skills} onClose={() => setSkillOpen(false)} onSaved={() => void load()} />
      ) : null}
      {portfolioOpen ? (
        <AddPortfolioDialog onClose={() => setPortfolioOpen(false)} onSaved={() => void load()} />
      ) : null}
      {resourceOpen ? (
        <AddExclusiveResourceDialog onClose={() => setResourceOpen(false)} onSaved={() => void load()} />
      ) : null}
      {fileOpen ? (
        <AddProfileFileDialog onClose={() => setFileOpen(false)} onSaved={() => void load()} />
      ) : null}
    </>
  );
}
