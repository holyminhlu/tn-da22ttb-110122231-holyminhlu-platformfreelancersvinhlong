"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import { authorizedFetch, clearVlcAuth, refreshAccessToken } from "@/lib/authSession";
import { apiPaths, apiUrl, getApiBaseUrl } from "@/config/api.config";

type ProfileTab = "overview" | "portfolio" | "reviews" | "activity";

type ProfileResponse = {
  user: {
    id: string;
    email: string;
    role: "client" | "freelancer" | string;
    status: string;
    isEmailVerified?: boolean;
    isPhoneVerified?: boolean;
    createdAt: string;
    fullName?: string | null;
    avatarUrl?: string | null;
    phone?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    bio?: string | null;
    website?: string | null;
    locationWkt?: string | null;
  };
  completionScore?: number;
  skills?: Array<{ id: number; name: string; level?: string | null; years_of_experience?: number | null }>;
  freelancerProfile?: {
    title?: string | null;
    hourly_rate?: number | null;
    experience_years?: number | null;
    availability_status?: string | null;
    total_earnings?: number | null;
    rating_avg?: number | null;
    total_reviews?: number | null;
    languages?: string[] | null;
    services_count?: number | null;
  } | null;
  services?: Array<{ id: string; title: string; description?: string | null; price?: number | null; delivery_days?: number | null }>;
  portfolio?: Array<{
    id: string;
    title: string;
    description?: string | null;
    project_url?: string | null;
    images?: string[] | null;
    created_at?: string;
  }>;
  reviews?: Array<{ id: string; rating: number; comment?: string | null; created_at: string; reviewer_name?: string | null }>;
  timeline?: Array<{ event_type: string; event_time: string; event_title: string }>;
  clientStats?: { total_jobs: number; open_jobs: number; total_contracts: number };
  recentJobs?: Array<{ id: string; title: string; budget?: number | null; status: string; created_at: string }>;
};

type ServiceForm = { title: string; description: string; price: string; deliveryDays: string };
type JobForm = { title: string; description: string; budget: string };
type ProfileEditForm = {
  fullName: string;
  phone: string;
  bio: string;
  website: string;
  dateOfBirth: string;
  gender: string;
  title: string;
  hourlyRate: string;
  experienceYears: string;
  availabilityStatus: string;
  languagesText: string;
};
type SkillEdit = { name: string; level: string; yearsOfExperience: string };
type PortfolioForm = { title: string; description: string; projectUrl: string; imagesText: string };

type ContractRow = {
  id: string;
  job_id: string | null;
  service_id: string | null;
  agreed_price: number | string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  progress_note?: string | null;
  delivered_at?: string | null;
  job_title: string | null;
  job_status: string | null;
  counterparty_name: string | null;
};

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) return "Chưa cập nhật";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "Chưa cập nhật";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "Chưa cập nhật";
  return new Intl.DateTimeFormat("vi-VN").format(dt);
}

function statusLabel(status?: string | null) {
  const key = String(status || "").toLowerCase();
  if (key === "available") return "Sẵn sàng nhận việc";
  if (key === "busy") return "Đang bận";
  if (key === "offline") return "Tạm nghỉ";
  return status || "Chưa cập nhật";
}

function contractStatusLabel(status?: string | null) {
  const key = String(status || "").toLowerCase();
  if (key === "pending") return "Chờ xử lý";
  if (key === "active") return "Đang thực hiện";
  if (key === "completed") return "Hoàn thành";
  if (key === "cancelled") return "Đã hủy";
  if (key === "disputed") return "Tranh chấp";
  return status || "—";
}

function Sparkline({ values, stroke = "#1DBF73" }: { values: number[]; stroke?: string }) {
  const safe = values.length ? values : [0, 0, 0, 0, 0];
  const max = Math.max(...safe, 1);
  const min = Math.min(...safe, 0);
  const range = Math.max(max - min, 1);
  const width = 220;
  const height = 56;
  const points = safe
    .map((v, i) => {
      const x = (i / Math.max(safe.length - 1, 1)) * width;
      const y = height - ((v - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full" aria-hidden>
      <polyline fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

export default function UserProfilePage() {
  const router = useRouter();
  const apiBaseUrl = getApiBaseUrl();

  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [serviceFormOpen, setServiceFormOpen] = useState(false);
  const [jobFormOpen, setJobFormOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState<ServiceForm>({ title: "", description: "", price: "", deliveryDays: "" });
  const [jobForm, setJobForm] = useState<JobForm>({ title: "", description: "", budget: "" });
  const [submittingService, setSubmittingService] = useState(false);
  const [submittingJob, setSubmittingJob] = useState(false);
  const [profileFormOpen, setProfileFormOpen] = useState(false);
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [submittingSkills, setSubmittingSkills] = useState(false);
  const [submittingPortfolio, setSubmittingPortfolio] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileEditForm>({
    fullName: "",
    phone: "",
    bio: "",
    website: "",
    dateOfBirth: "",
    gender: "",
    title: "",
    hourlyRate: "",
    experienceYears: "",
    availabilityStatus: "available",
    languagesText: "",
  });
  const [skillsForm, setSkillsForm] = useState<SkillEdit[]>([{ name: "", level: "", yearsOfExperience: "" }]);
  const [portfolioForm, setPortfolioForm] = useState<PortfolioForm>({ title: "", description: "", projectUrl: "", imagesText: "" });
  const [ctaMessage, setCtaMessage] = useState("");
  const [freelancerContracts, setFreelancerContracts] = useState<ContractRow[]>([]);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  async function loadProfile() {
    let token = window.localStorage.getItem("vlc_access_token");
    if (!token) {
      token = await refreshAccessToken(apiBaseUrl);
    }
    if (!token) {
      router.push("/dang-nhap");
      return;
    }

    try {
      const response = await authorizedFetch(apiUrl(apiPaths.auth.me, apiBaseUrl), {}, apiBaseUrl);

      if (response.status === 401) {
        clearVlcAuth();
        router.push("/dang-nhap");
        return;
      }

      const payload = (await response.json()) as ProfileResponse & { message?: string };
      if (!response.ok) {
        setError(payload.message || "Không thể tải hồ sơ người dùng.");
        return;
      }

      setData(payload);
      setProfileForm({
        fullName: payload.user.fullName || "",
        phone: payload.user.phone || "",
        bio: payload.user.bio || "",
        website: payload.user.website || "",
        dateOfBirth: payload.user.dateOfBirth ? String(payload.user.dateOfBirth).slice(0, 10) : "",
        gender: payload.user.gender || "",
        title: payload.freelancerProfile?.title || "",
        hourlyRate:
          payload.freelancerProfile?.hourly_rate !== null && payload.freelancerProfile?.hourly_rate !== undefined
            ? String(payload.freelancerProfile.hourly_rate)
            : "",
        experienceYears:
          payload.freelancerProfile?.experience_years !== null && payload.freelancerProfile?.experience_years !== undefined
            ? String(payload.freelancerProfile.experience_years)
            : "",
        availabilityStatus: payload.freelancerProfile?.availability_status || "available",
        languagesText: (payload.freelancerProfile?.languages || []).join(", "),
      });
      setSkillsForm(
        payload.skills && payload.skills.length > 0
          ? payload.skills.map((s) => ({
              name: s.name || "",
              level: s.level || "",
              yearsOfExperience:
                s.years_of_experience !== null && s.years_of_experience !== undefined ? String(s.years_of_experience) : "",
            }))
          : [{ name: "", level: "", yearsOfExperience: "" }],
      );
      const stored = window.localStorage.getItem("vlc_current_user");
      const parsed = stored ? (JSON.parse(stored) as Record<string, unknown>) : {};
      window.localStorage.setItem(
        "vlc_current_user",
        JSON.stringify({
          ...parsed,
          id: payload.user.id,
          email: payload.user.email,
          role: payload.user.role,
          fullName: payload.user.fullName || "",
          avatarUrl: payload.user.avatarUrl || "",
        }),
      );
      window.dispatchEvent(new Event("vlc-user-updated"));

      if (payload.user.role === "freelancer") {
        try {
          const cr = await authorizedFetch(apiUrl(apiPaths.auth.meContracts, apiBaseUrl), {}, apiBaseUrl);
          const cp = (await cr.json()) as { contracts?: ContractRow[] };
          if (cr.ok) {
            const rows = cp.contracts ?? [];
            setFreelancerContracts(rows.filter((c) => c.job_id));
          } else {
            setFreelancerContracts([]);
          }
        } catch {
          setFreelancerContracts([]);
        }
      } else {
        setFreelancerContracts([]);
      }
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, [apiBaseUrl, router]);

  const initials = useMemo(() => {
    const parts = String(data?.user.fullName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return "U";
  }, [data?.user.fullName]);

  const completionChecklist = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Ảnh đại diện", done: Boolean(data.user.avatarUrl) },
      { label: "Số điện thoại", done: Boolean(data.user.phone) },
      { label: "Giới thiệu", done: Boolean(data.user.bio) },
      { label: "Website", done: Boolean(data.user.website) },
      { label: "Ngày sinh", done: Boolean(data.user.dateOfBirth) },
      { label: "Kỹ năng", done: (data.skills?.length || 0) > 0 },
    ];
  }, [data]);

  const isFreelancer = data?.user.role === "freelancer";
  const reviewSparkline = useMemo(
    () => (data?.reviews || []).slice(0, 8).reverse().map((r) => Number(r.rating || 0)),
    [data?.reviews],
  );
  const freelancerRating = useMemo(() => {
    const avgFromProfile = Number(data?.freelancerProfile?.rating_avg ?? 0);
    const totalFromProfile = Number(data?.freelancerProfile?.total_reviews ?? 0);
    if (totalFromProfile > 0) {
      return { avg: avgFromProfile, total: totalFromProfile };
    }
    const rows = data?.reviews || [];
    if (!rows.length) return { avg: 0, total: 0 };
    const sum = rows.reduce((acc, r) => acc + Number(r.rating || 0), 0);
    return { avg: sum / rows.length, total: rows.length };
  }, [data?.freelancerProfile?.rating_avg, data?.freelancerProfile?.total_reviews, data?.reviews]);
  const activitySparkline = useMemo(() => {
    const points = (data?.timeline || []).slice(0, 8).reverse();
    if (points.length === 0) return [];
    return points.map((_item, idx) => idx + 1);
  }, [data?.timeline]);
  const tabs: Array<{ key: ProfileTab; label: string }> = isFreelancer
    ? [
        { key: "overview", label: "Tổng quan" },
        { key: "portfolio", label: "Dịch vụ & Portfolio" },
        { key: "reviews", label: "Đánh giá" },
        { key: "activity", label: "Hoạt động" },
      ]
    : [
        { key: "overview", label: "Tổng quan" },
        { key: "portfolio", label: "Công việc" },
        { key: "reviews", label: "Đánh giá" },
        { key: "activity", label: "Hoạt động" },
      ];

  async function handleSaveAvatar(avatarUrl: string) {
    if (!avatarUrl.trim()) {
      setAvatarMessage("Vui lòng nhập đường dẫn avatar.");
      return;
    }

    setSavingAvatar(true);
    setAvatarMessage("");
    try {
      const response = await authorizedFetch(
        apiUrl(apiPaths.auth.meAvatar, apiBaseUrl),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarUrl: avatarUrl.trim() }),
        },
        apiBaseUrl,
      );
      const payload = (await response.json()) as { message?: string; avatarUrl?: string };
      if (response.status === 401) {
        clearVlcAuth();
        router.push("/dang-nhap");
        return;
      }
      if (!response.ok) {
        setAvatarMessage(payload.message || "Không thể cập nhật avatar.");
        return;
      }
      setAvatarMessage(payload.message || "Đã cập nhật avatar.");
      await loadProfile();
    } catch {
      setAvatarMessage("Không thể kết nối máy chủ.");
    } finally {
      setSavingAvatar(false);
    }
  }

  function openAvatarPicker() {
    avatarInputRef.current?.click();
  }

  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarMessage("Vui lòng chọn file ảnh hợp lệ.");
      event.target.value = "";
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setAvatarMessage("Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 3MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        setAvatarMessage("Không thể đọc ảnh đã chọn.");
        return;
      }
      void handleSaveAvatar(result);
    };
    reader.onerror = () => {
      setAvatarMessage("Không thể đọc ảnh đã chọn.");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function handleCreateService() {
    if (!serviceForm.title.trim() || !serviceForm.price.trim()) {
      setCtaMessage("Vui lòng nhập tiêu đề và giá dịch vụ.");
      return;
    }

    setSubmittingService(true);
    setCtaMessage("");
    try {
      const response = await authorizedFetch(
        apiUrl(apiPaths.auth.meService, apiBaseUrl),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: serviceForm.title.trim(),
            description: serviceForm.description.trim(),
            price: Number(serviceForm.price),
            deliveryDays: serviceForm.deliveryDays ? Number(serviceForm.deliveryDays) : undefined,
          }),
        },
        apiBaseUrl,
      );
      const payload = (await response.json()) as { message?: string };
      if (response.status === 401) {
        clearVlcAuth();
        router.push("/dang-nhap");
        return;
      }
      if (!response.ok) {
        setCtaMessage(payload.message || "Không thể tạo dịch vụ.");
        return;
      }
      setCtaMessage(payload.message || "Tạo dịch vụ thành công.");
      setServiceForm({ title: "", description: "", price: "", deliveryDays: "" });
      setServiceFormOpen(false);
      await loadProfile();
    } catch {
      setCtaMessage("Không thể kết nối máy chủ.");
    } finally {
      setSubmittingService(false);
    }
  }

  async function handleCreateJob() {
    if (!jobForm.title.trim()) {
      setCtaMessage("Vui lòng nhập tiêu đề công việc.");
      return;
    }

    setSubmittingJob(true);
    setCtaMessage("");
    try {
      const response = await authorizedFetch(
        apiUrl(apiPaths.auth.meJob, apiBaseUrl),
        {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: jobForm.title.trim(),
          description: jobForm.description.trim(),
          budget: jobForm.budget ? Number(jobForm.budget) : undefined,
        }),
        },
        apiBaseUrl,
      );
      const payload = (await response.json()) as { message?: string };
      if (response.status === 401) {
        clearVlcAuth();
        router.push("/dang-nhap");
        return;
      }
      if (!response.ok) {
        setCtaMessage(payload.message || "Không thể đăng công việc.");
        return;
      }
      setCtaMessage(payload.message || "Đăng công việc thành công.");
      setJobForm({ title: "", description: "", budget: "" });
      setJobFormOpen(false);
      await loadProfile();
    } catch {
      setCtaMessage("Không thể kết nối máy chủ.");
    } finally {
      setSubmittingJob(false);
    }
  }

  async function handleSaveProfile() {
    if (!profileForm.fullName.trim()) {
      setCtaMessage("Vui lòng nhập họ tên.");
      return;
    }
    setSubmittingProfile(true);
    setCtaMessage("");
    try {
      const response = await authorizedFetch(
        apiUrl(apiPaths.auth.meProfile, apiBaseUrl),
        {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: profileForm.fullName.trim(),
          phone: profileForm.phone.trim(),
          bio: profileForm.bio.trim(),
          website: profileForm.website.trim(),
          dateOfBirth: profileForm.dateOfBirth || null,
          gender: profileForm.gender.trim(),
          title: profileForm.title.trim(),
          hourlyRate: profileForm.hourlyRate.trim(),
          experienceYears: profileForm.experienceYears.trim(),
          availabilityStatus: profileForm.availabilityStatus.trim() || "available",
          languages: profileForm.languagesText
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        }),
        },
        apiBaseUrl,
      );
      const payload = (await response.json()) as { message?: string };
      if (response.status === 401) {
        clearVlcAuth();
        router.push("/dang-nhap");
        return;
      }
      if (!response.ok) {
        setCtaMessage(payload.message || "Không thể cập nhật hồ sơ.");
        return;
      }
      setCtaMessage(payload.message || "Đã cập nhật hồ sơ.");
      await loadProfile();
    } catch {
      setCtaMessage("Không thể kết nối máy chủ.");
    } finally {
      setSubmittingProfile(false);
    }
  }

  async function handleSaveSkills() {
    setSubmittingSkills(true);
    setCtaMessage("");
    try {
      const response = await authorizedFetch(
        apiUrl(apiPaths.auth.meSkills, apiBaseUrl),
        {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          skills: skillsForm
            .map((s) => ({
              name: s.name.trim(),
              level: s.level.trim(),
              yearsOfExperience: s.yearsOfExperience.trim() ? Number(s.yearsOfExperience) : null,
            }))
            .filter((s) => s.name),
        }),
        },
        apiBaseUrl,
      );
      const payload = (await response.json()) as { message?: string };
      if (response.status === 401) {
        clearVlcAuth();
        router.push("/dang-nhap");
        return;
      }
      if (!response.ok) {
        setCtaMessage(payload.message || "Không thể cập nhật kỹ năng.");
        return;
      }
      setCtaMessage(payload.message || "Đã cập nhật kỹ năng.");
      await loadProfile();
    } catch {
      setCtaMessage("Không thể kết nối máy chủ.");
    } finally {
      setSubmittingSkills(false);
    }
  }

  async function handleAddPortfolio() {
    if (!portfolioForm.title.trim()) {
      setCtaMessage("Vui lòng nhập tiêu đề portfolio.");
      return;
    }
    setSubmittingPortfolio(true);
    setCtaMessage("");
    try {
      const response = await authorizedFetch(
        apiUrl(apiPaths.auth.mePortfolio, apiBaseUrl),
        {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: portfolioForm.title.trim(),
          description: portfolioForm.description.trim(),
          projectUrl: portfolioForm.projectUrl.trim(),
          images: portfolioForm.imagesText
            .split("\n")
            .map((v) => v.trim())
            .filter(Boolean),
        }),
        },
        apiBaseUrl,
      );
      const payload = (await response.json()) as { message?: string };
      if (response.status === 401) {
        clearVlcAuth();
        router.push("/dang-nhap");
        return;
      }
      if (!response.ok) {
        setCtaMessage(payload.message || "Không thể thêm portfolio.");
        return;
      }
      setPortfolioForm({ title: "", description: "", projectUrl: "", imagesText: "" });
      setCtaMessage(payload.message || "Đã thêm portfolio.");
      await loadProfile();
    } catch {
      setCtaMessage("Không thể kết nối máy chủ.");
    } finally {
      setSubmittingPortfolio(false);
    }
  }

  return (
    <>
      <Header />
      <main className="fv-profile-shell fv-shell-lg-pill-btns min-h-screen pb-16 pt-3 sm:pt-5">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
          <nav aria-label="Điều hướng phụ" className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-[#E8E8E8] pb-2">
            <Link href="/" className="fv-nav-link fv-focus-ring inline-flex min-h-9 items-center rounded-sm px-0 py-1">
              ← Trang chủ
            </Link>
            <Link href="/cong-viec-cua-toi" className="fv-nav-link fv-focus-ring inline-flex min-h-9 items-center rounded-sm px-0 py-1">
              Công việc của tôi
            </Link>
          </nav>

          <div className="mt-5 space-y-8">
          {loading ? (
            <section className="fv-card animate-pulse">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="h-28 w-28 shrink-0 rounded-full bg-[#E8E8E8]" />
                <div className="flex-1 space-y-4">
                  <div className="h-3 w-32 rounded bg-[#E8E8E8]" />
                  <div className="h-8 max-w-md rounded bg-[#E8E8E8]" />
                  <div className="h-4 max-w-lg rounded bg-[#F5F5F5]" />
                  <div className="flex gap-2 pt-2">
                    <div className="h-8 min-w-[88px] rounded bg-[#F5F5F5]" />
                    <div className="h-8 min-w-[96px] rounded bg-[#F5F5F5]" />
                  </div>
                </div>
              </div>
            </section>
          ) : null}
          {!loading && error ? <div className="fv-error-banner">{error}</div> : null}

          {!loading && data ? (
            <>
              <section className="fv-card">
                <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                    <button
                      type="button"
                      onClick={openAvatarPicker}
                      disabled={savingAvatar}
                      className="group relative flex h-[112px] w-[112px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#E8E8E8] bg-[#F5F5F5] text-[24px] font-bold text-[#404145] transition hover:border-[#1DBF73] disabled:cursor-not-allowed disabled:opacity-70 fv-focus-ring"
                      title="Nhấn để đổi ảnh đại diện"
                    >
                      {data.user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={data.user.avatarUrl} alt="Avatar người dùng" className="h-full w-full object-cover" />
                      ) : (
                        initials
                      )}
                      <span className="fv-caption pointer-events-none absolute inset-0 flex items-end justify-center bg-black/0 pb-2 font-bold text-[#404145] opacity-0 transition group-hover:bg-black/50 group-hover:text-white group-hover:opacity-100">
                        Đổi ảnh
                      </span>
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="fv-label-caps text-[#74767E]">Hồ sơ người dùng</p>
                      <h1 className="fv-display mt-2">{data.user.fullName || "Người dùng"}</h1>
                      {isFreelancer && data.freelancerProfile?.title ? (
                        <p className="fv-heading mt-2">{data.freelancerProfile.title}</p>
                      ) : null}
                      <p className="fv-body-sm mt-2 truncate text-[#404145]">{data.user.email}</p>
                      {avatarMessage ? (
                        <p className="fv-caption mt-4 rounded border border-[#E8E8E8] bg-[#F5F5F5] px-3 py-2 text-[#404145]">{avatarMessage}</p>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="fv-badge-neutral">{isFreelancer ? "Freelancer" : "Khách hàng"}</span>
                        <span className="fv-badge-success">
                          {isFreelancer ? statusLabel(data.freelancerProfile?.availability_status) : "Đang hoạt động"}
                        </span>
                        <span className="fv-caption rounded border border-[#E8E8E8] bg-[#FFFFFF] px-2 py-1 font-semibold text-[#404145]">
                          Thành viên từ {formatDate(data.user.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid min-w-[240px] gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="fv-inset-card">
                      <p className="fv-label-caps text-[#74767E]">Xác minh</p>
                      <p className="fv-body-sm mt-2 font-semibold text-[#404145]">
                        {data.user.isEmailVerified ? "Email đã xác minh" : "Email chưa xác minh"}
                      </p>
                    </div>
                    <div className="fv-inset-card">
                      <p className="fv-label-caps text-[#74767E]">Điện thoại</p>
                      <p className="fv-body-sm mt-2 font-semibold text-[#404145]">
                        {data.user.isPhoneVerified ? "SĐT đã xác minh" : "SĐT chưa xác minh"}
                      </p>
                    </div>
                    <Link
                      href="/viec-lam"
                      className="fv-btn-secondary fv-focus-ring w-full text-center sm:col-span-2 lg:col-span-1"
                    >
                      {isFreelancer ? "Xem việc đang tuyển" : "Quản lý việc đăng"}
                    </Link>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {isFreelancer ? (
                  <>
                    <article className="fv-card transition-shadow hover:shadow-[0px_2px_8px_rgba(0,0,0,0.12)]">
                      <p className="fv-label-caps text-[#74767E]">Đánh giá</p>
                      <p className="fv-stat-value mt-2">{Number(freelancerRating.avg || 0).toFixed(1)}</p>
                      <p className="fv-caption mt-2">{freelancerRating.total || 0} nhận xét</p>
                    </article>
                    <article className="fv-card transition-shadow hover:shadow-[0px_2px_8px_rgba(0,0,0,0.12)]">
                      <p className="fv-label-caps text-[#74767E]">Đơn giá / giờ</p>
                      <p className="fv-heading mt-3 text-[#000000]">{formatCurrency(data.freelancerProfile?.hourly_rate)}</p>
                    </article>
                    <article className="fv-card transition-shadow hover:shadow-[0px_2px_8px_rgba(0,0,0,0.12)]">
                      <p className="fv-label-caps text-[#74767E]">Gói dịch vụ</p>
                      <p className="fv-stat-value fv-stat-value-accent mt-2">{data.freelancerProfile?.services_count || 0}</p>
                    </article>
                    <article className="fv-card transition-shadow hover:shadow-[0px_2px_8px_rgba(0,0,0,0.12)]">
                      <p className="fv-label-caps text-[#74767E]">Thu nhập</p>
                      <p className="fv-heading mt-3 text-[#000000]">{formatCurrency(data.freelancerProfile?.total_earnings)}</p>
                    </article>
                  </>
                ) : (
                  <>
                    <article className="fv-card transition-shadow hover:shadow-[0px_2px_8px_rgba(0,0,0,0.12)]">
                      <p className="fv-label-caps text-[#74767E]">Tổng tin đăng</p>
                      <p className="fv-stat-value mt-2">{data.clientStats?.total_jobs ?? 0}</p>
                    </article>
                    <article className="fv-card transition-shadow hover:shadow-[0px_2px_8px_rgba(0,0,0,0.12)]">
                      <p className="fv-label-caps text-[#74767E]">Đang mở</p>
                      <p className="fv-stat-value fv-stat-value-accent mt-2">{data.clientStats?.open_jobs ?? 0}</p>
                    </article>
                    <article className="fv-card transition-shadow hover:shadow-[0px_2px_8px_rgba(0,0,0,0.12)]">
                      <p className="fv-label-caps text-[#74767E]">Hợp đồng</p>
                      <p className="fv-stat-value mt-2">{data.clientStats?.total_contracts ?? 0}</p>
                    </article>
                    <article className="fv-card transition-shadow hover:shadow-[0px_2px_8px_rgba(0,0,0,0.12)]">
                      <p className="fv-label-caps text-[#74767E]">Tham gia</p>
                      <p className="fv-heading mt-3 text-[#000000]">{formatDate(data.user.createdAt)}</p>
                    </article>
                  </>
                )}
              </section>

              {isFreelancer ? (
                <section className="fv-alert-card">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="fv-heading">Việc đã nhận</h2>
                      <p className="fv-body-sm mt-2 max-w-2xl">
                        Hợp đồng từ tin đăng — tin chuyển sang đang thực hiện sau khi bạn nhận việc.
                      </p>
                    </div>
                    <Link href="/viec-lam" className="fv-btn-secondary fv-focus-ring shrink-0">
                      Mở Việc làm
                    </Link>
                  </div>
                  {freelancerContracts.length === 0 ? (
                    <div className="fv-inset-card mt-6 border-dashed py-10 text-center">
                      <p className="fv-body-sm font-semibold text-[#404145]">Chưa có hợp đồng nào từ bảng tin</p>
                      <p className="fv-caption mx-auto mt-2 max-w-md">
                        Khi bạn nhận việc từ danh sách đang tuyển, thông tin sẽ hiển thị tại đây.
                      </p>
                    </div>
                  ) : (
                    <ul className="mt-6 divide-y divide-[#E8E8E8] rounded-lg border border-[#E8E8E8] bg-[#FFFFFF]">
                      {freelancerContracts.map((c) => (
                        <li
                          key={c.id}
                          className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-[#FAFAFA] sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="fv-body-sm font-semibold text-[#404145]">{c.job_title || "Công việc"}</p>
                            <p className="fv-caption mt-2">
                              Khách: <span className="font-semibold text-[#404145]">{c.counterparty_name || "—"}</span> ·{" "}
                              {formatDate(c.created_at)}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <span className="fv-badge-success">{contractStatusLabel(c.status)}</span>
                            <span className="fv-body-sm font-bold text-[#1DBF73]">
                              {c.agreed_price !== null && c.agreed_price !== undefined && String(c.agreed_price) !== ""
                                ? formatCurrency(Number(c.agreed_price))
                                : "Thỏa thuận"}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : null}

              <section className="grid gap-6 lg:grid-cols-12 lg:items-start">
                <article className="fv-card lg:col-span-8">
                  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2 className="fv-heading">Hoàn thiện hồ sơ</h2>
                      <p className="fv-body-sm mt-2">Hoàn tất các mục để tăng độ tin cậy khi kết nối.</p>
                    </div>
                    <span className="fv-badge-success px-3 py-1 text-[13.6px]">{data.completionScore ?? 0}%</span>
                  </div>
                  <div className="fv-progress-track">
                    <div className="fv-progress-fill" style={{ width: `${data.completionScore ?? 0}%` }} />
                  </div>
                  <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                    {completionChecklist.map((item) => (
                      <li
                        key={item.label}
                        className={`flex min-h-[44px] items-center gap-3 rounded border px-3 py-2 ${
                          item.done ? "border-[#1DBF73] bg-[rgba(29,191,115,0.06)]" : "border-[#E8E8E8] bg-[#FFFFFF]"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12.8px] font-bold ${
                            item.done ? "bg-[#1DBF73] text-white" : "border border-[#D3D3D3] bg-[#F5F5F5] text-[#74767E]"
                          }`}
                          aria-hidden
                        >
                          {item.done ? "✓" : "○"}
                        </span>
                        <span className={`fv-body-sm font-semibold ${item.done ? "text-[#404145]" : "text-[#74767E]"}`}>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="fv-card lg:sticky lg:top-24 lg:col-span-4">
                  <h2 className="fv-heading">Thao tác nhanh</h2>
                  <p className="fv-body-sm mt-2">Rút gọn thao tác thường dùng.</p>
                  <div className="mt-6 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setProfileFormOpen((v) => !v)}
                      className="fv-btn-secondary fv-focus-ring w-full sm:w-auto"
                    >
                      {profileFormOpen ? "Đóng biểu mẫu chỉnh sửa" : "Cập nhật thông tin"}
                    </button>
                    {isFreelancer ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setServiceFormOpen((v) => !v);
                            setJobFormOpen(false);
                          }}
                          className="fv-btn-primary fv-focus-ring w-full sm:w-auto"
                        >
                          Thêm dịch vụ mới
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfileFormOpen(true)}
                          className="fv-btn-secondary fv-focus-ring w-full sm:w-auto"
                        >
                          Cập nhật mức giá
                        </button>
                        <Link href="/viec-lam" className="fv-btn-secondary fv-focus-ring inline-flex w-full justify-center sm:w-auto">
                          Xem việc đang tuyển
                        </Link>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setJobFormOpen((v) => !v);
                            setServiceFormOpen(false);
                          }}
                          className="fv-btn-primary fv-focus-ring w-full sm:w-auto"
                        >
                          Đăng công việc mới
                        </button>
                        <Link href="/freelancer" className="fv-btn-secondary fv-focus-ring inline-flex w-full justify-center sm:w-auto">
                          Tìm freelancer
                        </Link>
                        <Link href="/cong-viec-cua-toi" className="fv-btn-secondary fv-focus-ring inline-flex w-full justify-center sm:w-auto">
                          Công việc &amp; hợp đồng
                        </Link>
                      </>
                    )}
                  </div>
                  {ctaMessage ? (
                    <p className="fv-caption mt-4 rounded border border-[#E8E8E8] bg-[#F5F5F5] px-3 py-2 text-[#404145]">{ctaMessage}</p>
                  ) : null}
                </article>
              </section>

              {profileFormOpen ? (
                <section className="fv-card overflow-hidden p-0 shadow-[0px_2px_8px_rgba(0,0,0,0.12)]">
                  <div className="border-b border-[#E8E8E8] px-6 py-4">
                    <h3 className="fv-heading">{isFreelancer ? "Cập nhật hồ sơ Freelancer" : "Cập nhật hồ sơ khách hàng"}</h3>
                    <p className="fv-caption mt-2">
                      Thông tin hiển thị công khai theo chính sách nền tảng — chỉnh sửa và lưu khi bạn đã kiểm tra kỹ.
                    </p>
                  </div>
                  <div className="px-6 pb-6 pt-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        value={profileForm.fullName}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))}
                        placeholder="Họ và tên"
                        className="fv-input"
                      />
                      <input
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="Số điện thoại"
                        className="fv-input"
                      />
                      <input
                        value={profileForm.website}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, website: e.target.value }))}
                        placeholder="Website"
                        className="fv-input"
                      />
                      <input
                        type="date"
                        value={profileForm.dateOfBirth}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                        className="fv-input"
                      />
                      <input
                        value={profileForm.gender}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, gender: e.target.value }))}
                        placeholder="Giới tính"
                        className="fv-input"
                      />
                      <input
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                        placeholder="Giới thiệu ngắn"
                        className="fv-input sm:col-span-2"
                      />
                    </div>

                    {isFreelancer ? (
                      <>
                        <h4 className="fv-label-caps mt-8 text-[#74767E]">Thông tin nghề nghiệp</h4>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <input
                            value={profileForm.title}
                            onChange={(e) => setProfileForm((prev) => ({ ...prev, title: e.target.value }))}
                            placeholder="Chức danh"
                            className="fv-input"
                          />
                          <input
                            value={profileForm.hourlyRate}
                            onChange={(e) => setProfileForm((prev) => ({ ...prev, hourlyRate: e.target.value }))}
                            placeholder="Đơn giá/giờ"
                            className="fv-input"
                          />
                          <input
                            value={profileForm.experienceYears}
                            onChange={(e) => setProfileForm((prev) => ({ ...prev, experienceYears: e.target.value }))}
                            placeholder="Số năm kinh nghiệm"
                            className="fv-input"
                          />
                          <select
                            value={profileForm.availabilityStatus}
                            onChange={(e) => setProfileForm((prev) => ({ ...prev, availabilityStatus: e.target.value }))}
                            className="fv-input"
                          >
                            <option value="available">Sẵn sàng nhận việc</option>
                            <option value="busy">Đang bận</option>
                            <option value="offline">Tạm nghỉ</option>
                          </select>
                          <input
                            value={profileForm.languagesText}
                            onChange={(e) => setProfileForm((prev) => ({ ...prev, languagesText: e.target.value }))}
                            placeholder="Ngôn ngữ (cách nhau bởi dấu phẩy)"
                            className="fv-input sm:col-span-2"
                          />
                        </div>

                        <h4 className="fv-label-caps mt-8 text-[#74767E]">Kỹ năng</h4>
                        <div className="mt-4 space-y-3">
                          {skillsForm.map((skill, idx) => (
                            <div key={idx} className="grid gap-3 sm:grid-cols-3">
                              <input
                                value={skill.name}
                                onChange={(e) =>
                                  setSkillsForm((prev) => prev.map((s, i) => (i === idx ? { ...s, name: e.target.value } : s)))
                                }
                                placeholder="Tên kỹ năng"
                                className="fv-input"
                              />
                              <input
                                value={skill.level}
                                onChange={(e) =>
                                  setSkillsForm((prev) => prev.map((s, i) => (i === idx ? { ...s, level: e.target.value } : s)))
                                }
                                placeholder="Mức độ"
                                className="fv-input"
                              />
                              <input
                                value={skill.yearsOfExperience}
                                onChange={(e) =>
                                  setSkillsForm((prev) =>
                                    prev.map((s, i) => (i === idx ? { ...s, yearsOfExperience: e.target.value } : s)),
                                  )
                                }
                                placeholder="Năm kinh nghiệm"
                                className="fv-input"
                              />
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => setSkillsForm((prev) => [...prev, { name: "", level: "", yearsOfExperience: "" }])}
                            className="fv-btn-ghost fv-focus-ring"
                          >
                            + Thêm kỹ năng
                          </button>
                        </div>

                        <h4 className="fv-label-caps mt-8 text-[#74767E]">Thêm portfolio</h4>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <input
                            value={portfolioForm.title}
                            onChange={(e) => setPortfolioForm((prev) => ({ ...prev, title: e.target.value }))}
                            placeholder="Tiêu đề dự án"
                            className="fv-input"
                          />
                          <input
                            value={portfolioForm.projectUrl}
                            onChange={(e) => setPortfolioForm((prev) => ({ ...prev, projectUrl: e.target.value }))}
                            placeholder="Link dự án"
                            className="fv-input"
                          />
                          <input
                            value={portfolioForm.description}
                            onChange={(e) => setPortfolioForm((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="Mô tả dự án"
                            className="fv-input sm:col-span-2"
                          />
                          <textarea
                            rows={3}
                            value={portfolioForm.imagesText}
                            onChange={(e) => setPortfolioForm((prev) => ({ ...prev, imagesText: e.target.value }))}
                            placeholder="Danh sách URL ảnh (mỗi dòng một URL)"
                            className="fv-input min-h-[88px] resize-y sm:col-span-2"
                          />
                        </div>
                      </>
                    ) : null}

                    <div className="fv-divider mt-8" />
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={submittingProfile}
                        className="fv-btn-primary fv-focus-ring w-full sm:w-auto"
                      >
                        {submittingProfile ? "Đang lưu hồ sơ..." : "Lưu thông tin hồ sơ"}
                      </button>
                      {isFreelancer ? (
                        <>
                          <button
                            type="button"
                            onClick={handleSaveSkills}
                            disabled={submittingSkills}
                            className="fv-btn-secondary fv-focus-ring w-full sm:w-auto"
                          >
                            {submittingSkills ? "Đang lưu kỹ năng..." : "Lưu kỹ năng"}
                          </button>
                          <button
                            type="button"
                            onClick={handleAddPortfolio}
                            disabled={submittingPortfolio}
                            className="fv-btn-ghost fv-focus-ring w-full sm:w-auto"
                          >
                            {submittingPortfolio ? "Đang thêm portfolio..." : "Thêm portfolio"}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </section>
              ) : null}

              <section className="grid gap-6 lg:grid-cols-2">
                <article className="fv-card">
                  <p className="fv-label-caps text-[#74767E]">Đánh giá</p>
                  <h3 className="fv-heading mt-2">Xu hướng điểm review</h3>
                  <p className="fv-caption mt-2">Đường chữ biểu diễn vài lượt đánh giá gần nhất — dùng để theo dõi nhịp phản hồi.</p>
                  <div className="fv-inset-card mt-4">
                    <Sparkline values={reviewSparkline} stroke="#1DBF73" />
                  </div>
                </article>
                <article className="fv-card">
                  <p className="fv-label-caps text-[#74767E]">Hoạt động</p>
                  <h3 className="fv-heading mt-2">Nhịp tương tác</h3>
                  <p className="fv-caption mt-2">Sự kiện trên trục thời gian được quy đổi thành đường xu hướng đơn giản.</p>
                  <div className="fv-inset-card mt-4">
                    <Sparkline values={activitySparkline} stroke="#1DBF73" />
                  </div>
                </article>
              </section>

              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />

              {serviceFormOpen ? (
                <section className="fv-card overflow-hidden p-0 shadow-[0px_2px_8px_rgba(0,0,0,0.12)]">
                  <div className="border-b border-[#E8E8E8] px-6 py-4">
                    <h3 className="fv-heading">Tạo dịch vụ mới</h3>
                    <p className="fv-caption mt-2">Điền tiêu đề và giá là bắt buộc; mô tả rõ ràng giúp khách quyết định nhanh hơn.</p>
                  </div>
                  <div className="p-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        value={serviceForm.title}
                        onChange={(e) => setServiceForm((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="Tiêu đề dịch vụ"
                        className="fv-input"
                      />
                      <input
                        value={serviceForm.price}
                        onChange={(e) => setServiceForm((prev) => ({ ...prev, price: e.target.value }))}
                        placeholder="Giá (VND)"
                        className="fv-input"
                      />
                      <input
                        value={serviceForm.deliveryDays}
                        onChange={(e) => setServiceForm((prev) => ({ ...prev, deliveryDays: e.target.value }))}
                        placeholder="Số ngày bàn giao"
                        className="fv-input"
                      />
                      <input
                        value={serviceForm.description}
                        onChange={(e) => setServiceForm((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Mô tả ngắn"
                        className="fv-input sm:col-span-2"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateService}
                      disabled={submittingService}
                      className="fv-btn-primary fv-focus-ring mt-6 w-full sm:w-auto"
                    >
                      {submittingService ? "Đang tạo..." : "Tạo dịch vụ"}
                    </button>
                  </div>
                </section>
              ) : null}

              {jobFormOpen ? (
                <section className="fv-card overflow-hidden p-0 shadow-[0px_2px_8px_rgba(0,0,0,0.12)]">
                  <div className="border-b border-[#E8E8E8] px-6 py-4">
                    <h3 className="fv-heading">Đăng công việc mới</h3>
                    <p className="fv-caption mt-2">Tiêu đề giúp freelancer hiểu nhanh nhu cầu — mô tả càng cụ thể, báo giá càng sát.</p>
                  </div>
                  <div className="p-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        value={jobForm.title}
                        onChange={(e) => setJobForm((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="Tiêu đề công việc"
                        className="fv-input"
                      />
                      <input
                        value={jobForm.budget}
                        onChange={(e) => setJobForm((prev) => ({ ...prev, budget: e.target.value }))}
                        placeholder="Ngân sách (VND)"
                        className="fv-input"
                      />
                      <input
                        value={jobForm.description}
                        onChange={(e) => setJobForm((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Mô tả công việc"
                        className="fv-input sm:col-span-2"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateJob}
                      disabled={submittingJob}
                      className="fv-btn-primary fv-focus-ring mt-6 w-full sm:w-auto"
                    >
                      {submittingJob ? "Đang đăng..." : "Đăng công việc"}
                    </button>
                  </div>
                </section>
              ) : null}

              <section className="fv-card overflow-hidden p-0 shadow-[0px_1px_3px_rgba(0,0,0,0.08)]">
                <div className="border-b border-[#E8E8E8] px-4 py-6 sm:px-6">
                  <p className="fv-label-caps text-[#74767E]">Chi tiết</p>
                  <h2 className="fv-display mt-2">Nội dung hồ sơ</h2>
                  <div className="scrollbar-hide mt-6 flex min-h-[48px] overflow-x-auto border-b border-[#E8E8E8]">
                    {tabs.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`fv-tab fv-focus-ring ${activeTab === tab.key ? "fv-tab--active" : ""}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-4 sm:p-6">

                {activeTab === "overview" ? (
                  <div className="grid gap-6 lg:grid-cols-3">
                    <article className="fv-inset-card lg:col-span-2">
                      <h3 className="fv-heading">Thông tin cơ bản</h3>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <p className="fv-body-sm">
                          Số điện thoại:{" "}
                          <span className="font-semibold text-[#404145]">{data.user.phone || "Chưa cập nhật"}</span>
                        </p>
                        <p className="fv-body-sm">
                          Ngày sinh:{" "}
                          <span className="font-semibold text-[#404145]">{formatDate(data.user.dateOfBirth)}</span>
                        </p>
                        <p className="fv-body-sm">
                          Giới tính:{" "}
                          <span className="font-semibold text-[#404145]">{data.user.gender || "Chưa cập nhật"}</span>
                        </p>
                        <p className="fv-body-sm">
                          Website:{" "}
                          <span className="font-semibold text-[#404145]">{data.user.website || "Chưa cập nhật"}</span>
                        </p>
                        <p className="fv-body-sm sm:col-span-2">
                          Giới thiệu:{" "}
                          <span className="font-semibold text-[#404145]">{data.user.bio || "Chưa cập nhật"}</span>
                        </p>
                      </div>
                    </article>

                    <article className="fv-inset-card">
                      <h3 className="fv-heading">Kỹ năng</h3>
                      {data.skills && data.skills.length > 0 ? (
                        <ul className="mt-4 space-y-2">
                          {data.skills.map((skill) => (
                            <li key={skill.id} className="fv-inset-card py-3">
                              <span className="fv-body-sm font-semibold text-[#404145]">{skill.name}</span>
                              {skill.level ? (
                                <span className="fv-caption block">{skill.level}</span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="fv-body-sm mt-4">Chưa có kỹ năng nào.</p>
                      )}
                    </article>
                  </div>
                ) : null}

                {activeTab === "portfolio" ? (
                  isFreelancer ? (
                    <div className="grid gap-6 lg:grid-cols-2">
                      <article className="fv-inset-card bg-[#FAFAFA]">
                        <h3 className="fv-heading">Dịch vụ gần đây</h3>
                        {data.services && data.services.length > 0 ? (
                          <ul className="mt-4 space-y-3">
                            {data.services.map((service) => (
                              <li key={service.id} className="fv-card transition-shadow hover:shadow-[0px_2px_8px_rgba(0,0,0,0.12)]">
                                <p className="fv-body-sm font-semibold text-[#404145]">{service.title}</p>
                                <p className="fv-body-sm mt-2">{service.description || "Chưa có mô tả"}</p>
                                <p className="fv-body-sm mt-3">
                                  Giá:{" "}
                                  <span className="font-semibold text-[#000000]">{formatCurrency(service.price)}</span>
                                </p>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="fv-body-sm mt-4">Bạn chưa có dịch vụ nào.</p>
                        )}
                      </article>

                      <article className="fv-inset-card bg-[#FAFAFA]">
                        <h3 className="fv-heading">Portfolio</h3>
                        {data.portfolio && data.portfolio.length > 0 ? (
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {data.portfolio.map((item, idx) => (
                              <div
                                key={item.id}
                                className={`fv-card transition-shadow hover:shadow-[0px_2px_8px_rgba(0,0,0,0.12)] ${
                                  idx % 3 === 0 ? "sm:col-span-2" : ""
                                }`}
                              >
                                <p className="fv-body-sm font-semibold text-[#404145]">{item.title}</p>
                                <p className="fv-body-sm mt-2">{item.description || "Chưa có mô tả dự án."}</p>
                                {item.project_url ? (
                                  <a
                                    href={item.project_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="fv-focus-ring mt-3 inline-block rounded-sm text-[12.8px] font-bold text-[#1DBF73] hover:underline"
                                  >
                                    Xem dự án
                                  </a>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="fv-body-sm mt-4">Chưa có portfolio.</p>
                        )}
                      </article>
                    </div>
                  ) : (
                    <article className="fv-inset-card bg-[#FAFAFA]">
                      <h3 className="fv-heading">Công việc gần đây</h3>
                      {data.recentJobs && data.recentJobs.length > 0 ? (
                        <ul className="mt-6 space-y-3">
                          {data.recentJobs.map((job) => (
                            <li key={job.id} className="fv-card transition-shadow hover:shadow-[0px_2px_8px_rgba(0,0,0,0.12)]">
                              <p className="fv-body-sm font-semibold text-[#404145]">{job.title}</p>
                              <p className="fv-body-sm mt-2">
                                Ngân sách:{" "}
                                <span className="font-semibold text-[#000000]">{formatCurrency(job.budget)}</span>
                              </p>
                              <p className="fv-caption mt-2">
                                Trạng thái: <span className="font-semibold text-[#404145]">{job.status}</span> ·{" "}
                                {formatDate(job.created_at)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="fv-body-sm mt-4">Bạn chưa tạo công việc nào.</p>
                      )}
                    </article>
                  )
                ) : null}

                {activeTab === "reviews" ? (
                  <article className="fv-inset-card bg-[#FAFAFA]">
                    <h3 className="fv-heading">Đánh giá gần đây</h3>
                    {data.reviews && data.reviews.length > 0 ? (
                      <ul className="mt-6 space-y-3">
                        {data.reviews.map((review) => (
                          <li key={review.id} className="fv-card">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="fv-caption text-[#74767E]">
                                  {isFreelancer ? "Khách hàng đánh giá" : "Bạn đánh giá freelancer"}
                                </p>
                                <p className="fv-body-sm font-semibold text-[#404145]">
                                  {review.reviewer_name || "—"}
                                </p>
                              </div>
                              <span className="fv-badge-success">{review.rating}/5</span>
                            </div>
                            <p className="fv-body-sm mt-3">{review.comment || "Không có bình luận."}</p>
                            <p className="fv-caption mt-2">{formatDate(review.created_at)}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="fv-body-sm mt-4">Chưa có đánh giá nào.</p>
                    )}
                  </article>
                ) : null}

                {activeTab === "activity" ? (
                  <article className="fv-inset-card bg-[#FAFAFA]">
                    <h3 className="fv-heading">Timeline hoạt động</h3>
                    {data.timeline && data.timeline.length > 0 ? (
                      <ol className="mt-6 space-y-4">
                        {data.timeline.map((item, idx) => (
                          <li key={`${item.event_type}-${idx}`} className="flex gap-4">
                            <span
                              className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#1DBF73]"
                              aria-hidden
                            />
                            <div className="fv-inset-card min-h-[44px] flex-1 py-3">
                              <p className="fv-body-sm font-semibold text-[#404145]">{item.event_title}</p>
                              <p className="fv-caption mt-1">{formatDate(item.event_time)}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="fv-body-sm mt-4">Chưa có hoạt động nào.</p>
                    )}
                  </article>
                ) : null}
                </div>
              </section>

              <div className="pt-4">
                <Link href="/" className="fv-nav-link fv-focus-ring inline-block rounded-sm py-2 font-semibold">
                  Quay về trang chủ
                </Link>
              </div>
            </>
          ) : null}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
