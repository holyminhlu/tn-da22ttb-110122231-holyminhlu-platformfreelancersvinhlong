"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { FaPlus } from "react-icons/fa";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { listMyContracts, type ContractRow } from "@/lib/api/contracts";
import {
  getMe,
  isFreelancerMeResponse,
  type ContractReview,
  type FreelancerMeResponse,
  type FreelancerProfile,
  type FreelancerService,
  type MeUser,
  type PortfolioItem,
  type UserSkill,
} from "@/lib/api/users";
import { getUserInitials, resolveAvatarSrc } from "@/lib/authSession";
import { formatDate, formatVnd, parseJsonArray } from "@/lib/format";
import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "../home/home.css";
import "./dashboard.css";

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="freelancer-dashboard__row">
      <dt>{label}</dt>
      <dd>{value ?? "—"}</dd>
    </div>
  );
}

function contractStatusClass(status: string) {
  const s = status.toLowerCase();
  if (s === "active") return "freelancer-dashboard__status freelancer-dashboard__status--active";
  if (s === "pending") return "freelancer-dashboard__status freelancer-dashboard__status--pending";
  if (s === "completed") return "freelancer-dashboard__status freelancer-dashboard__status--completed";
  return "freelancer-dashboard__status freelancer-dashboard__status--other";
}

function BasicInfoPanel({ user, profile, completionScore }: { user: MeUser; profile: FreelancerProfile | null; completionScore: number }) {
  const avatarSrc = resolveAvatarSrc(user.avatarUrl);
  const badges = parseJsonArray(profile?.profile_badges);
  const languages = parseJsonArray(profile?.languages);

  return (
    <section className="freelancer-dashboard__panel freelancer-dashboard__panel--square">
      <header className="freelancer-dashboard__panel-head">Thông tin cơ bản</header>
      <div className="freelancer-dashboard__panel-body">
        <div className="freelancer-dashboard__avatar-wrap">
          <Avatar size="lg" className="size-14">
            {avatarSrc ? <AvatarImage src={avatarSrc} alt={user.fullName || ""} /> : null}
            <AvatarFallback className="bg-[#e8f1fb] text-[#0066cc]">
              {getUserInitials(user.fullName, user.email)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="freelancer-dashboard__name">{user.fullName || user.email}</p>
            {user.tagline ? <p className="freelancer-dashboard__tagline">{user.tagline}</p> : null}
          </div>
        </div>
        <dl className="freelancer-dashboard__dl">
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Điện thoại" value={user.phone} />
          <InfoRow label="Khu vực" value={user.districtCity} />
          <InfoRow label="Chức danh" value={profile?.title} />
          <InfoRow label="Giá/giờ" value={profile?.hourly_rate != null ? formatVnd(profile.hourly_rate) : null} />
          <InfoRow label="Kinh nghiệm" value={profile?.experience_years != null ? `${profile.experience_years} năm` : null} />
          <InfoRow label="Trạng thái" value={profile?.availability_status} />
          <InfoRow label="Thu nhập" value={formatVnd(profile?.total_earnings)} />
          <InfoRow label="Hoàn thành hồ sơ" value={`${completionScore}%`} />
          <InfoRow
            label="Xác thực"
            value={[user.isEmailVerified && "Email", user.isPhoneVerified && "SĐT"].filter(Boolean).join(", ") || "Chưa"}
          />
        </dl>
        {badges.length > 0 ? (
          <div className="mt-2">
            {badges.map((b) => (
              <span key={b} className="freelancer-dashboard__badge">
                {b}
              </span>
            ))}
          </div>
        ) : null}
        {languages.length > 0 ? (
          <p className="freelancer-dashboard__muted mt-2">Ngôn ngữ: {languages.join(", ")}</p>
        ) : null}
        {user.bio ? <p className="freelancer-dashboard__muted mt-2 line-clamp-4">{user.bio}</p> : null}
      </div>
    </section>
  );
}

function PanelSectionLabel({
  label,
  count,
  addHref,
}: {
  label: string;
  count: number;
  addHref: string;
}) {
  return (
    <div className="freelancer-dashboard__section-head">
      <span className="freelancer-dashboard__section-head-label">
        {label} ({count})
      </span>
      <Link
        href={addHref}
        className="freelancer-dashboard__section-head-add"
        aria-label={`Thêm ${label}`}
        title={`Thêm ${label}`}
      >
        <FaPlus aria-hidden />
      </Link>
    </div>
  );
}

function SkillsPortfolioPanel({ skills, portfolio }: { skills: UserSkill[]; portfolio: PortfolioItem[] }) {
  return (
    <section className="freelancer-dashboard__panel freelancer-dashboard__panel--square">
      <header className="freelancer-dashboard__panel-head">Kỹ năng & Portfolio</header>
      <div className="freelancer-dashboard__panel-body">
        <PanelSectionLabel label="Kỹ năng" count={skills.length} addHref="/ho-so?add=skills" />
        {skills.length === 0 ? (
          <p className="freelancer-dashboard__empty">Chưa thêm kỹ năng.</p>
        ) : (
          <ul className="mb-4">
            {skills.map((s) => (
              <li key={s.id} className="freelancer-dashboard__list-item">
                <span className="font-medium text-gray-800">{s.name}</span>
                <span className="freelancer-dashboard__muted">
                  {" "}
                  — {s.level || "—"} · {s.years_of_experience} năm
                </span>
              </li>
            ))}
          </ul>
        )}
        <PanelSectionLabel label="Portfolio" count={portfolio.length} addHref="/ho-so?add=portfolio" />
        {portfolio.length === 0 ? (
          <p className="freelancer-dashboard__empty">Chưa có dự án portfolio.</p>
        ) : (
          <ul>
            {portfolio.map((p) => (
              <li key={p.id} className="freelancer-dashboard__list-item">
                <p className="font-medium text-gray-800">{p.title}</p>
                {p.description ? <p className="freelancer-dashboard__muted line-clamp-2">{p.description}</p> : null}
                {p.project_url ? (
                  <a href={p.project_url} className="text-xs text-[#0066cc] hover:underline" target="_blank" rel="noreferrer">
                    Xem dự án
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ServicesPanel({ services }: { services: FreelancerService[] }) {
  return (
    <section className="freelancer-dashboard__panel freelancer-dashboard__panel--square">
      <header className="freelancer-dashboard__panel-head">Dịch vụ ({services.length})</header>
      <div className="freelancer-dashboard__panel-body">
        {services.length === 0 ? (
          <p className="freelancer-dashboard__empty">Chưa đăng dịch vụ nào.</p>
        ) : (
          <ul>
            {services.map((s) => (
              <li key={s.id} className="freelancer-dashboard__list-item">
                <div className="flex gap-2">
                  {s.thumbnail_url ? (
                    <Image
                      src={s.thumbnail_url}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 shrink-0 rounded object-cover"
                      unoptimized
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-800">{s.title}</p>
                    <p className="text-xs font-semibold text-[#0066cc]">{formatVnd(s.price)}</p>
                    {s.delivery_days != null ? (
                      <p className="freelancer-dashboard__muted">Giao trong {s.delivery_days} ngày</p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ReviewsPanel({ profile, reviews }: { profile: FreelancerProfile | null; reviews: ContractReview[] }) {
  const avg = profile ? Number(profile.rating_avg) : 0;

  return (
    <section className="freelancer-dashboard__panel freelancer-dashboard__panel-bottom">
      <header className="freelancer-dashboard__panel-head">Đánh giá</header>
      <div className="freelancer-dashboard__panel-body">
        <div className="mb-4 flex items-end gap-4">
          <div>
            <p className="freelancer-dashboard__rating-big">{avg > 0 ? avg.toFixed(1) : "—"}</p>
            <p className="freelancer-dashboard__muted">Điểm trung bình / 5</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-800">{profile?.total_reviews ?? 0}</p>
            <p className="freelancer-dashboard__muted">Lượt đánh giá</p>
          </div>
          {profile?.job_success_score != null ? (
            <div>
              <p className="text-lg font-bold text-gray-800">{profile.job_success_score}%</p>
              <p className="freelancer-dashboard__muted">Job success</p>
            </div>
          ) : null}
        </div>
        {reviews.length === 0 ? (
          <p className="freelancer-dashboard__empty">Chưa có đánh giá từ khách hàng.</p>
        ) : (
          <ul>
            {reviews.map((r) => (
              <li key={r.id} className="freelancer-dashboard__list-item">
                <p className="font-medium text-gray-800">
                  {r.rating}/5 — {r.reviewer_name || "Khách hàng"}
                </p>
                {r.comment ? <p className="freelancer-dashboard__muted line-clamp-2">{r.comment}</p> : null}
                <p className="freelancer-dashboard__muted">{formatDate(r.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function InvoicesPanel({ contracts }: { contracts: ContractRow[] }) {
  return (
    <section className="freelancer-dashboard__panel freelancer-dashboard__panel-bottom">
      <header className="freelancer-dashboard__panel-head">Hợp đồng & hóa đơn</header>
      <div className="freelancer-dashboard__panel-body">
        {contracts.length === 0 ? (
          <p className="freelancer-dashboard__empty">Chưa có hợp đồng / hóa đơn.</p>
        ) : (
          <ul>
            {contracts.map((c) => (
              <li key={c.id} className="freelancer-dashboard__list-item">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-gray-800">{c.job_title || `Hợp đồng #${c.id.slice(0, 8)}`}</span>
                  <span className={contractStatusClass(c.status)}>{c.status}</span>
                </div>
                <p className="text-sm font-semibold text-[#0066cc]">{formatVnd(c.agreed_price)}</p>
                <p className="freelancer-dashboard__muted">
                  {c.counterparty_name ? `Khách: ${c.counterparty_name} · ` : ""}
                  {formatDate(c.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default function FreelancerDashboard() {
  const [data, setData] = useState<FreelancerMeResponse | null>(null);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [me, contractData] = await Promise.all([getMe(), listMyContracts()]);
        if (cancelled) return;
        if (!isFreelancerMeResponse(me)) {
          setError("Tài khoản này không phải freelancer.");
          setData(null);
          return;
        }
        setData(me);
        setContracts(contractData.contracts ?? []);
      } catch (err) {
        if (cancelled) return;
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Không thể tải dashboard.";
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="home-landing freelancer-dashboard min-h-screen text-gray-900">
      <HomeNavbar />
      <main id="main-content" className="freelancer-dashboard__inner">
        <h1 className="freelancer-dashboard__title">Dashboard</h1>

        {loading ? (
          <p className="text-gray-500">Đang tải dữ liệu...</p>
        ) : error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : data ? (
          <>
            <div className="freelancer-dashboard__grid-top">
              <BasicInfoPanel
                user={data.user}
                profile={data.freelancerProfile}
                completionScore={data.completionScore}
              />
              <SkillsPortfolioPanel skills={data.skills} portfolio={data.portfolio} />
              <ServicesPanel services={data.services} />
            </div>
            <div className="freelancer-dashboard__grid-bottom">
              <ReviewsPanel profile={data.freelancerProfile} reviews={data.reviews} />
              <InvoicesPanel contracts={contracts} />
            </div>
          </>
        ) : null}
      </main>
      <HomeFooter />
    </div>
  );
}
