"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaFacebookF,
  FaGlobe,
  FaLinkedinIn,
  FaPencilAlt,
  FaPlay,
  FaPlus,
  FaShareAlt,
} from "react-icons/fa";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getMe,
  isFreelancerMeResponse,
  updateProfile,
  type FreelancerMeResponse,
  type MeUser,
} from "@/lib/api/users";
import { getUserInitials, resolveAvatarSrc } from "@/lib/authSession";
import { formatVnd } from "@/lib/format";
import AddPortfolioDialog from "./AddPortfolioDialog";
import AddSkillDialog from "./AddSkillDialog";
import "./my-profile.css";

function ProfileSection({
  title,
  count,
  onAdd,
  children,
  emptyDescription,
  emptyButtonLabel,
  onEmptyAction,
  isEmpty,
}: {
  title: string;
  count?: number;
  onAdd?: () => void;
  children: React.ReactNode;
  emptyDescription: string;
  emptyButtonLabel: string;
  onEmptyAction: () => void;
  isEmpty: boolean;
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
          <p>{emptyDescription}</p>
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
  const [data, setData] = useState<FreelancerMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [skillOpen, setSkillOpen] = useState(false);
  const [portfolioOpen, setPortfolioOpen] = useState(false);

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
  }, [searchParams]);

  async function saveAbout(bio: string) {
    if (!data?.user) return;
    const fullName = (data.user.fullName || "").trim();
    if (!fullName) return;
    await updateProfile({
      fullName,
      bio: bio.trim() || null,
      title: data.freelancerProfile?.title ?? "",
    });
    await load();
  }

  function openAboutEdit() {
    if (!data?.user) return;
    const next = window.prompt("Giới thiệu về bạn (About):", data.user.bio || "");
    if (next === null) return;
    void saveAbout(next);
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
  const services = data.services ?? [];
  const hasAbout = Boolean(user.bio?.trim() || user.tagline?.trim());

  return (
    <>
      <header className="mp-header">
        <div className="mp-header__inner">
          <div className="mp-header__left">
            <Link href="/dashboard" className="mp-back" aria-label="Quay lại dashboard">
              <FaArrowLeft aria-hidden />
            </Link>
            <h1 className="mp-header__title">Hồ sơ của tôi</h1>
          </div>
          <div className="mp-header__right">
            <p className="mp-header__hint hidden sm:block">
              Bạn cần điền và xuất bản ít nhất một Dịch vụ và mục Giới thiệu để hồ sơ hiển thị công khai.
            </p>
            <div className="mp-visibility">
              <span>Hiển thị hồ sơ</span>
              <span className="mp-toggle-off" aria-hidden />
            </div>
          </div>
        </div>
      </header>

      <div className="ea-main mp-body">
        <div className="ea-content mp-content">
            <div className="mp-profile-card">
              <div className="mp-avatar-wrap">
                <Avatar className="mp-avatar size-32 rounded-sm">
                  {avatarSrc ? <AvatarImage src={avatarSrc} alt={user.fullName || ""} className="object-cover" /> : null}
                  <AvatarFallback className="rounded-sm text-lg">
                    {getUserInitials(user.fullName, user.email)}
                  </AvatarFallback>
                </Avatar>
                <Link href="/edit-account" className="mp-avatar-edit" aria-label="Sửa thông tin liên hệ">
                  <FaPencilAlt className="text-xs" aria-hidden />
                </Link>
              </div>
              <div className="mp-name">
                {user.fullName || user.email}
                <Link href="/edit-account" className="text-blue-500 text-xs" aria-label="Sửa tên">
                  <FaPencilAlt aria-hidden />
                </Link>
              </div>
              {user.tagline ? <p className="text-xs text-gray-600 mt-1">{user.tagline}</p> : null}
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

              <div className="mp-card-actions">
                <button type="button" disabled className="opacity-60">
                  Xem hồ sơ công khai
                </button>
                <button type="button" disabled className="opacity-60">
                  Chia sẻ <FaShareAlt className="ml-1 inline" aria-hidden />
                </button>
              </div>
            </div>

            <div className="mp-cover">
              <button type="button" className="mp-cover-btn" disabled>
                Thêm ảnh bìa
              </button>
            </div>

            <ProfileSection
              title="Giới thiệu"
              emptyDescription="Dùng không gian này để giới thiệu bản thân với nhà tuyển dụng."
              emptyButtonLabel="Thêm chi tiết"
              onEmptyAction={openAboutEdit}
              isEmpty={!hasAbout}
            >
              <div className="mp-about-text">
                {user.tagline ? <p className="font-medium text-gray-800 mb-2">{user.tagline}</p> : null}
                {user.bio || "—"}
              </div>
              <button type="button" className="mt-3 text-sm font-medium text-blue-600 hover:underline" onClick={openAboutEdit}>
                Sửa giới thiệu
              </button>
            </ProfileSection>

            <ProfileSection
              title="Kỹ năng"
              count={skills.length}
              onAdd={() => setSkillOpen(true)}
              emptyDescription="Thêm kỹ năng để nhà tuyển dụng hiểu rõ năng lực của bạn."
              emptyButtonLabel="Thêm kỹ năng"
              onEmptyAction={() => setSkillOpen(true)}
              isEmpty={skills.length === 0}
            >
              <ul className="mp-skill-list">
                {skills.map((s) => (
                  <li key={s.id} className="mp-list-item">
                    <p className="mp-list-item__title">{s.name}</p>
                    <p className="mp-list-item__meta">
                      {s.level || "—"} · {s.years_of_experience ?? 0} năm
                    </p>
                  </li>
                ))}
              </ul>
            </ProfileSection>

            <ProfileSection
              title="Dịch vụ"
              count={services.length}
              emptyDescription="Cho nhà tuyển dụng biết bạn cung cấp dịch vụ gì."
              emptyButtonLabel="Thêm dịch vụ"
              onEmptyAction={() => router.push("/dashboard")}
              isEmpty={services.length === 0}
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
            >
              <ul className="mp-portfolio-list">
                {portfolio.map((p) => (
                  <li key={p.id} className="mp-list-item">
                    <p className="mp-list-item__title">{p.title}</p>
                    {p.description ? <p className="mp-list-item__meta">{p.description}</p> : null}
                    {p.project_url ? (
                      <a
                        href={p.project_url}
                        className="text-sm text-blue-600 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Xem dự án
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </ProfileSection>

            <ProfileSection
              title="Tài nguyên dành riêng"
              emptyDescription="Thêm tài nguyên dành riêng cho khách hàng."
              emptyButtonLabel="Thêm tài nguyên"
              onEmptyAction={() => {}}
              isEmpty
            />

            <ProfileSection
              title="Tệp tin"
              emptyDescription="Thêm tệp để chia sẻ với khách hàng."
              emptyButtonLabel="Thêm tệp"
              onEmptyAction={() => {}}
              isEmpty
            />
        </div>
      </div>

      {skillOpen ? (
        <AddSkillDialog existing={skills} onClose={() => setSkillOpen(false)} onSaved={() => void load()} />
      ) : null}
      {portfolioOpen ? (
        <AddPortfolioDialog onClose={() => setPortfolioOpen(false)} onSaved={() => void load()} />
      ) : null}
    </>
  );
}
