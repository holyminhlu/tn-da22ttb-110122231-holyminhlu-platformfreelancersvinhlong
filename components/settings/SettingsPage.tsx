"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import { authorizedFetch, clearVlcAuth, refreshAccessToken } from "@/lib/authSession";
import { apiPaths, apiUrl, getApiBaseUrl } from "@/config/api.config";

type SettingsSection = "profile" | "professional" | "security" | "notifications" | "payments" | "privacy" | "subscription" | "account";

type ProfileResponse = {
  user: {
    id: string;
    email: string;
    role: string;
    isEmailVerified?: boolean;
    isPhoneVerified?: boolean;
    fullName?: string | null;
    avatarUrl?: string | null;
    phone?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    bio?: string | null;
    website?: string | null;
    locationWkt?: string | null;
  };
  skills?: Array<{ id: number; name: string; level?: string | null; years_of_experience?: number | null }>;
  freelancerProfile?: {
    title?: string | null;
    hourly_rate?: number | null;
    experience_years?: number | null;
    availability_status?: string | null;
    languages?: string[] | null;
  } | null;
  portfolio?: Array<{ id: string; title: string; project_url?: string | null }>;
  timeline?: Array<{ event_type: string; event_time: string; event_title: string }>;
};

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

type NotificationPrefs = {
  emailProposal: boolean;
  emailMessage: boolean;
  emailProject: boolean;
  emailPayment: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  marketing: boolean;
};

type PrivacyPrefs = {
  profilePublic: boolean;
  showEarnings: boolean;
  showCompletedJobs: boolean;
  allowRecruiters: boolean;
};

type UiPrefs = {
  theme: "light" | "dark";
  language: string;
  currency: string;
  timeFormat: string;
};

type FreelancerDemoPrefs = {
  minBudget: string;
  timezone: string;
  preferredTypes: string;
  workingHours: string;
  proposalTemplate: string;
  autoRespond: string;
  snippetsNote: string;
  bankInfo: string;
  ewallet: string;
  taxInfo: string;
  withdrawalNote: string;
  payoutCurrency: string;
};

type ClientDemoPrefs = {
  companyName: string;
  billingAddress: string;
  invoiceEmail: string;
  savedPaymentsNote: string;
  postingPrefs: string;
};

const LS_DISPLAY_NAME = "vlc_settings_display_name";
const LS_SOCIAL = "vlc_settings_social";
const LS_NOTIFICATIONS = "vlc_settings_notifications";
const LS_PRIVACY = "vlc_settings_privacy";
const LS_UI = "vlc_settings_ui";
const LS_FREELANCER_DEMO = "vlc_settings_freelancer_demo";
const LS_CLIENT_DEMO = "vlc_settings_client_demo";

const NAV_ITEMS: { id: SettingsSection; label: string; freelancerOnly?: boolean }[] = [
  { id: "profile", label: "Hồ sơ" },
  { id: "professional", label: "Chuyên môn", freelancerOnly: true },
  { id: "security", label: "Bảo mật" },
  { id: "notifications", label: "Thông báo" },
  { id: "payments", label: "Thanh toán" },
  { id: "privacy", label: "Riêng tư" },
  { id: "subscription", label: "Gói thành viên" },
  { id: "account", label: "Tài khoản" },
];

const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  emailProposal: true,
  emailMessage: true,
  emailProject: true,
  emailPayment: true,
  pushEnabled: false,
  smsEnabled: false,
  marketing: false,
};

const DEFAULT_PRIVACY: PrivacyPrefs = {
  profilePublic: true,
  showEarnings: false,
  showCompletedJobs: true,
  allowRecruiters: true,
};

const DEFAULT_UI: UiPrefs = {
  theme: "light",
  language: "vi",
  currency: "VND",
  timeFormat: "24h",
};

function DemoBadge() {
  return <span className="fv-badge-neutral normal-case">Minh họa</span>;
}

function SectionCard({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="fv-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="fv-heading text-[#404145]">{title}</h2>
        {hint ? <p className="fv-caption max-w-md text-right">{hint}</p> : null}
      </div>
      <div className="mt-6 space-y-6">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="fv-label-caps mb-2 block text-[#74767E]">{label}</span>
      {children}
    </label>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const apiBaseUrl = getApiBaseUrl();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [section, setSection] = useState<SettingsSection>("profile");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
  const [displayName, setDisplayName] = useState("");
  const [socialLinkedin, setSocialLinkedin] = useState("");
  const [socialGithub, setSocialGithub] = useState("");
  const [skillsForm, setSkillsForm] = useState<SkillEdit[]>([{ name: "", level: "", yearsOfExperience: "" }]);

  const [notifications, setNotifications] = useState<NotificationPrefs>(DEFAULT_NOTIFICATIONS);
  const [privacy, setPrivacy] = useState<PrivacyPrefs>(DEFAULT_PRIVACY);
  const [uiPrefs, setUiPrefs] = useState<UiPrefs>(DEFAULT_UI);
  const [freelancerDemo, setFreelancerDemo] = useState<FreelancerDemoPrefs>({
    minBudget: "",
    timezone: "Asia/Ho_Chi_Minh",
    preferredTypes: "",
    workingHours: "",
    proposalTemplate: "",
    autoRespond: "",
    snippetsNote: "",
    bankInfo: "",
    ewallet: "",
    taxInfo: "",
    withdrawalNote: "",
    payoutCurrency: "VND",
  });
  const [clientDemo, setClientDemo] = useState<ClientDemoPrefs>({
    companyName: "",
    billingAddress: "",
    invoiceEmail: "",
    savedPaymentsNote: "",
    postingPrefs: "",
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSkills, setSavingSkills] = useState(false);
  const [savingLocal, setSavingLocal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isFreelancer = data?.user.role === "freelancer";
  const isClient = data?.user.role === "client";

  const visibleNav = useMemo(() => NAV_ITEMS.filter((item) => !item.freelancerOnly || isFreelancer), [isFreelancer]);

  useEffect(() => {
    if (!visibleNav.some((n) => n.id === section)) {
      setSection("profile");
    }
  }, [visibleNav, section]);

  const loadLocal = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      setDisplayName(window.localStorage.getItem(LS_DISPLAY_NAME) || "");
      const soc = JSON.parse(window.localStorage.getItem(LS_SOCIAL) || "{}") as { linkedin?: string; github?: string };
      setSocialLinkedin(soc.linkedin || "");
      setSocialGithub(soc.github || "");
      setNotifications({ ...DEFAULT_NOTIFICATIONS, ...JSON.parse(window.localStorage.getItem(LS_NOTIFICATIONS) || "{}") });
      setPrivacy({ ...DEFAULT_PRIVACY, ...JSON.parse(window.localStorage.getItem(LS_PRIVACY) || "{}") });
      setUiPrefs({ ...DEFAULT_UI, ...JSON.parse(window.localStorage.getItem(LS_UI) || "{}") });
      const fd = JSON.parse(window.localStorage.getItem(LS_FREELANCER_DEMO) || "{}") as Partial<FreelancerDemoPrefs>;
      setFreelancerDemo({
        minBudget: "",
        timezone: "Asia/Ho_Chi_Minh",
        preferredTypes: "",
        workingHours: "",
        proposalTemplate: "",
        autoRespond: "",
        snippetsNote: "",
        bankInfo: "",
        ewallet: "",
        taxInfo: "",
        withdrawalNote: "",
        payoutCurrency: "VND",
        ...fd,
      });
      const cd = JSON.parse(window.localStorage.getItem(LS_CLIENT_DEMO) || "{}") as Partial<ClientDemoPrefs>;
      setClientDemo({
        companyName: "",
        billingAddress: "",
        invoiceEmail: "",
        savedPaymentsNote: "",
        postingPrefs: "",
        ...cd,
      });
    } catch {
      /* ignore */
    }
  }, []);

  const applyProfilePayload = useCallback((payload: ProfileResponse) => {
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
  }, []);

  const loadProfile = useCallback(async () => {
    let token = window.localStorage.getItem("vlc_access_token");
    if (!token) token = await refreshAccessToken(apiBaseUrl);
    if (!token) {
      router.push("/dang-nhap");
      return;
    }
    setError("");
    try {
      const response = await authorizedFetch(apiUrl(apiPaths.auth.me, apiBaseUrl), {}, apiBaseUrl);
      if (response.status === 401) {
        clearVlcAuth();
        router.push("/dang-nhap");
        return;
      }
      const payload = (await response.json()) as ProfileResponse & { message?: string };
      if (!response.ok) {
        setError(payload.message || "Không thể tải cài đặt.");
        return;
      }
      setData(payload);
      applyProfilePayload(payload);
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, router, applyProfilePayload]);

  useEffect(() => {
    loadLocal();
    void loadProfile();
  }, [loadLocal, loadProfile]);

  function persistLocalBrowserSettings() {
    setSavingLocal(true);
    try {
      window.localStorage.setItem(LS_DISPLAY_NAME, displayName.trim());
      window.localStorage.setItem(LS_SOCIAL, JSON.stringify({ linkedin: socialLinkedin.trim(), github: socialGithub.trim() }));
      window.localStorage.setItem(LS_NOTIFICATIONS, JSON.stringify(notifications));
      window.localStorage.setItem(LS_PRIVACY, JSON.stringify(privacy));
      window.localStorage.setItem(LS_UI, JSON.stringify(uiPrefs));
      window.localStorage.setItem(LS_FREELANCER_DEMO, JSON.stringify(freelancerDemo));
      window.localStorage.setItem(LS_CLIENT_DEMO, JSON.stringify(clientDemo));
      setMessage("Đã lưu các tùy chọn trình duyệt (thông báo, riêng tư, UI, mục minh họa).");
    } finally {
      setSavingLocal(false);
    }
  }

  async function handleSaveProfile() {
    if (!profileForm.fullName.trim()) {
      setMessage("");
      setError("Vui lòng nhập họ tên.");
      return;
    }
    setSavingProfile(true);
    setError("");
    setMessage("");
    try {
      const response = await authorizedFetch(
        apiUrl(apiPaths.auth.meProfile, apiBaseUrl),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
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
        setError(payload.message || "Không thể cập nhật.");
        return;
      }
      setMessage(payload.message || "Đã lưu thông tin lên máy chủ.");
      await loadProfile();
      persistLocalBrowserSettings();
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveSkills() {
    if (!isFreelancer) return;
    setSavingSkills(true);
    setError("");
    setMessage("");
    try {
      const response = await authorizedFetch(
        apiUrl(apiPaths.auth.meSkills, apiBaseUrl),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
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
        setError(payload.message || "Không thể cập nhật kỹ năng.");
        return;
      }
      setMessage(payload.message || "Đã lưu kỹ năng.");
      await loadProfile();
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setSavingSkills(false);
    }
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    const accessToken = window.localStorage.getItem("vlc_access_token");
    const refreshToken = window.localStorage.getItem("vlc_refresh_token");
    try {
      if (accessToken && refreshToken) {
        await fetch(apiUrl(apiPaths.auth.logout, apiBaseUrl), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } finally {
      clearVlcAuth();
      setLoggingOut(false);
      window.location.assign("/");
    }
  }

  const loginTimeline = useMemo(() => {
    const rows = data?.timeline || [];
    return rows.filter((t) => t.event_type === "login").slice(0, 8);
  }, [data?.timeline]);

  function toggleNotify<K extends keyof NotificationPrefs>(key: K, value: boolean) {
    setNotifications((prev) => {
      const next = { ...prev, [key]: value };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LS_NOTIFICATIONS, JSON.stringify(next));
      }
      return next;
    });
  }

  function togglePrivacy<K extends keyof PrivacyPrefs>(key: K, value: boolean) {
    setPrivacy((prev) => {
      const next = { ...prev, [key]: value };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LS_PRIVACY, JSON.stringify(next));
      }
      return next;
    });
  }

  return (
    <>
      <Header />
      <main id="main-content" className="fv-profile-shell fv-shell-lg-pill-btns min-h-screen bg-[#FFFFFF] pb-16 pt-3 sm:pt-5 md:pb-16">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
          <nav aria-label="Điều hướng phụ" className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-[#E8E8E8] pb-2">
            <Link href="/" className="fv-nav-link fv-focus-ring inline-flex min-h-9 items-center rounded-sm px-0 py-1">
              ← Trang chủ
            </Link>
            <Link href="/ho-so" className="fv-nav-link fv-focus-ring inline-flex min-h-9 items-center rounded-sm px-0 py-1">
              Hồ sơ người dùng
            </Link>
          </nav>

          <header className="mt-5 md:mt-6">
            <h1 className="fv-display text-[#000000]">Cài đặt</h1>
            <p className="fv-body mt-3 max-w-3xl">
              Quản lý hồ sơ, bảo mật và tùy chọn hiển thị. Thông tin có nhãn{" "}
              <DemoBadge /> chỉ minh họa — lưu cục bộ trình duyệt hoặc chưa có API; các trường hồ sơ chính đồng bộ qua máy chủ.
            </p>
          </header>

          {error ? (
            <div className="fv-error-banner fv-focus-ring mt-8 rounded-[8px]" role="alert">
              <p className="font-semibold">{error}</p>
            </div>
          ) : null}
          {message ? (
            <div className="fv-alert-card mt-8" role="status">
              <p className="fv-body">{message}</p>
            </div>
          ) : null}

          {loading ? (
            <div className="mt-10 animate-pulse rounded-[8px] border border-[#E8E8E8] bg-[#F5F5F5] p-10 shadow-[0px_1px_3px_rgba(0,0,0,0.08)]">
              <div className="h-6 w-48 rounded bg-[#E8E8E8]" />
              <div className="mt-6 h-40 rounded bg-[#E8E8E8]" />
            </div>
          ) : (
            <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:gap-10 xl:gap-12">
              <aside className="mb-8 shrink-0 border-b border-[#E8E8E8] pb-6 lg:mb-0 lg:border-b-0 lg:border-r lg:border-[#E8E8E8] lg:pb-0 lg:pr-8">
                <p className="fv-label-caps text-[#74767E]">Menu</p>
                <nav aria-label="Mục cài đặt" className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
                  {visibleNav.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSection(item.id)}
                      className={`fv-focus-ring min-h-[44px] shrink-0 rounded-[8px] border-l-4 px-3 py-3 text-left transition-colors lg:w-full ${
                        section === item.id
                          ? "border-[#1DBF73] bg-[rgba(29,191,115,0.06)]"
                          : "border-transparent hover:bg-[#F5F5F5]"
                      }`}
                    >
                      <span className="fv-body-sm font-bold text-[#404145]">{item.label}</span>
                    </button>
                  ))}
                </nav>
              </aside>

              <div className="min-w-0 space-y-8">
                {section === "profile" ? (
                  <>
                    <SectionCard
                      title="I. Thông tin hồ sơ"
                      hint="Avatar và ảnh: dùng trang Hồ sơ để tải ảnh lên máy chủ."
                    >
                      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                        <div className="flex shrink-0 flex-col items-center gap-3">
                          <div className="relative flex size-24 items-center justify-center overflow-hidden rounded-full border border-[#E8E8E8] bg-[#F5F5F5]">
                            {data?.user.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={data.user.avatarUrl} alt="" className="size-full object-cover" />
                            ) : (
                              <span className="fv-heading text-[#74767E]">
                                {(data?.user.fullName || "?").slice(0, 1).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <Link href="/ho-so" className="fv-btn-ghost fv-focus-ring w-full text-center sm:w-auto">
                            Đổi ảnh tại Hồ sơ
                          </Link>
                        </div>
                        <div className="grid min-w-0 flex-1 gap-4 md:grid-cols-2">
                          <Field label="Họ và tên (máy chủ)">
                            <input
                              className="fv-input fv-focus-ring"
                              value={profileForm.fullName}
                              onChange={(e) => setProfileForm((p) => ({ ...p, fullName: e.target.value }))}
                            />
                          </Field>
                          <Field label="Tên hiển thị">
                            <input
                              className="fv-input fv-focus-ring"
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              placeholder="Tuỳ chọn — lưu trình duyệt"
                            />
                            <span className="fv-caption mt-1 inline-flex items-center gap-2">
                              <DemoBadge /> Chưa có cột DB riêng — dùng cho giao diện sau này.
                            </span>
                          </Field>
                          <Field label="Tiêu đề / chức danh">
                            <input
                              className="fv-input fv-focus-ring"
                              value={profileForm.title}
                              onChange={(e) => setProfileForm((p) => ({ ...p, title: e.target.value }))}
                              placeholder={isFreelancer ? "VD: Developer Full-stack" : "VD: Khách hàng doanh nghiệp"}
                              disabled={!isFreelancer}
                            />
                            {!isFreelancer ? (
                              <span className="fv-caption mt-1">Freelancer mới lưu tiêu đề chuyên nghiệp lên máy chủ.</span>
                            ) : null}
                          </Field>
                          <Field label="Giới thiệu / About">
                            <textarea
                              className="fv-input fv-focus-ring min-h-[100px] resize-y"
                              value={profileForm.bio}
                              onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                            />
                          </Field>
                          <Field label="Kinh nghiệm / học vấn (gộp trong Bio & năm KN)">
                            <input
                              className="fv-input fv-focus-ring"
                              value={profileForm.experienceYears}
                              onChange={(e) => setProfileForm((p) => ({ ...p, experienceYears: e.target.value }))}
                              placeholder="Số năm kinh nghiệm (freelancer)"
                              disabled={!isFreelancer}
                            />
                          </Field>
                          <Field label="Vị trí (đọc từ DB dạng WKT)">
                            <textarea
                              className="fv-input fv-focus-ring min-h-[72px] resize-y"
                              readOnly
                              disabled
                              value={data?.user.locationWkt || "Chưa có — bản đồ / cập nhật vị trí sẽ bổ sung sau."}
                            />
                          </Field>
                          <Field label="Ngôn ngữ (freelancer — DB)">
                            <input
                              className="fv-input fv-focus-ring md:col-span-2"
                              value={profileForm.languagesText}
                              onChange={(e) => setProfileForm((p) => ({ ...p, languagesText: e.target.value }))}
                              placeholder="Tiếng Việt, English…"
                              disabled={!isFreelancer}
                            />
                          </Field>
                          <Field label="Portfolio — liên kết (website / project URL chính)">
                            <input
                              className="fv-input fv-focus-ring"
                              value={profileForm.website}
                              onChange={(e) => setProfileForm((p) => ({ ...p, website: e.target.value }))}
                              placeholder="https://…"
                            />
                            {isFreelancer && data?.portfolio && data.portfolio.length > 0 ? (
                              <ul className="fv-caption mt-2 list-inside list-disc space-y-1">
                                {data.portfolio.slice(0, 6).map((p) => (
                                  <li key={p.id}>
                                    {p.project_url ? (
                                      <a href={p.project_url} className="text-[#1DBF73] underline-offset-2 hover:underline">
                                        {p.title}
                                      </a>
                                    ) : (
                                      <span>{p.title}</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </Field>
                          <Field label="Ngày sinh">
                            <input
                              type="date"
                              className="fv-input fv-focus-ring"
                              value={profileForm.dateOfBirth}
                              onChange={(e) => setProfileForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
                            />
                          </Field>
                          <Field label="Giới tính">
                            <input
                              className="fv-input fv-focus-ring"
                              value={profileForm.gender}
                              onChange={(e) => setProfileForm((p) => ({ ...p, gender: e.target.value }))}
                              placeholder="Tuỳ chọn"
                            />
                          </Field>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 border-t border-[#E8E8E8] pt-6">
                        <button type="button" disabled={savingProfile} onClick={() => void handleSaveProfile()} className="fv-btn-primary fv-focus-ring disabled:opacity-60">
                          {savingProfile ? "Đang lưu…" : "Lưu hồ sơ (máy chủ)"}
                        </button>
                        <button type="button" disabled={savingLocal} onClick={persistLocalBrowserSettings} className="fv-btn-secondary fv-focus-ring disabled:opacity-60">
                          {savingLocal ? "Đang lưu…" : "Lưu tên hiển thị & mạng xã hội (trình duyệt)"}
                        </button>
                      </div>
                    </SectionCard>

                    <SectionCard title="2. Thông tin liên hệ">
                      <Field label="Email">
                        <input className="fv-input fv-focus-ring" readOnly disabled value={data?.user.email || ""} />
                        <div className="mt-2 flex flex-wrap gap-2">
                          {data?.user.isEmailVerified ? (
                            <span className="fv-badge-success normal-case">Đã xác minh email</span>
                          ) : (
                            <span className="fv-badge-error normal-case">Chưa xác minh email</span>
                          )}
                          {data?.user.isPhoneVerified ? (
                            <span className="fv-badge-success normal-case">Đã xác minh SĐT</span>
                          ) : (
                            <span className="fv-badge-neutral normal-case">SĐT chưa xác minh</span>
                          )}
                        </div>
                      </Field>
                      <Field label="Điện thoại">
                        <input
                          className="fv-input fv-focus-ring"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                        />
                      </Field>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="LinkedIn">
                          <input className="fv-input fv-focus-ring" value={socialLinkedin} onChange={(e) => setSocialLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
                        </Field>
                        <Field label="GitHub">
                          <input className="fv-input fv-focus-ring" value={socialGithub} onChange={(e) => setSocialGithub(e.target.value)} placeholder="https://github.com/..." />
                        </Field>
                      </div>
                      <p className="fv-caption inline-flex flex-wrap items-center gap-2">
                        <DemoBadge /> Liên kết mạng xã hội lưu cục bộ — API đồng bộ sẽ thêm sau.
                      </p>
                      <button type="button" onClick={persistLocalBrowserSettings} className="fv-btn-secondary fv-focus-ring">
                        Lưu liên hệ mở rộng (trình duyệt)
                      </button>
                    </SectionCard>

                    {isFreelancer ? (
                      <SectionCard title="Kỹ năng (máy chủ)" hint="PUT /api/auth/me/skills">
                        <div className="space-y-3">
                          {skillsForm.map((skill, idx) => (
                            <div key={idx} className="grid gap-3 sm:grid-cols-3">
                              <input
                                placeholder="Kỹ năng"
                                className="fv-input fv-focus-ring"
                                value={skill.name}
                                onChange={(e) => {
                                  const next = [...skillsForm];
                                  next[idx] = { ...next[idx], name: e.target.value };
                                  setSkillsForm(next);
                                }}
                              />
                              <input
                                placeholder="Trình độ"
                                className="fv-input fv-focus-ring"
                                value={skill.level}
                                onChange={(e) => {
                                  const next = [...skillsForm];
                                  next[idx] = { ...next[idx], level: e.target.value };
                                  setSkillsForm(next);
                                }}
                              />
                              <input
                                placeholder="Số năm"
                                className="fv-input fv-focus-ring"
                                value={skill.yearsOfExperience}
                                onChange={(e) => {
                                  const next = [...skillsForm];
                                  next[idx] = { ...next[idx], yearsOfExperience: e.target.value };
                                  setSkillsForm(next);
                                }}
                              />
                            </div>
                          ))}
                          <button
                            type="button"
                            className="fv-btn-ghost fv-focus-ring"
                            onClick={() => setSkillsForm((prev) => [...prev, { name: "", level: "", yearsOfExperience: "" }])}
                          >
                            + Thêm dòng kỹ năng
                          </button>
                        </div>
                        <button type="button" disabled={savingSkills} onClick={() => void handleSaveSkills()} className="fv-btn-primary fv-focus-ring disabled:opacity-60">
                          {savingSkills ? "Đang lưu…" : "Lưu kỹ năng"}
                        </button>
                      </SectionCard>
                    ) : null}

                    {isClient ? (
                      <div className="fv-alert-card">
                        <p className="fv-heading text-[#404145]">III. Góc khách hàng (mẫu)</p>
                        <p className="fv-body mt-2">
                          Công ty, địa chỉ thanh toán và lịch sử hóa đơn sẽ gắn với luồng Client sau. Hiện chỉ lưu minh họa trên trình duyệt.
                        </p>
                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                          <Field label="Tên công ty">
                            <input className="fv-input fv-focus-ring" value={clientDemo.companyName} onChange={(e) => setClientDemo((p) => ({ ...p, companyName: e.target.value }))} />
                          </Field>
                          <Field label="Email hóa đơn">
                            <input className="fv-input fv-focus-ring" value={clientDemo.invoiceEmail} onChange={(e) => setClientDemo((p) => ({ ...p, invoiceEmail: e.target.value }))} />
                          </Field>
                          <Field label="Địa chỉ thanh toán">
                            <textarea className="fv-input fv-focus-ring min-h-[88px]" value={clientDemo.billingAddress} onChange={(e) => setClientDemo((p) => ({ ...p, billingAddress: e.target.value }))} />
                          </Field>
                          <Field label="Ghi chú phương thức thanh toán đã lưu">
                            <textarea className="fv-input fv-focus-ring min-h-[88px]" value={clientDemo.savedPaymentsNote} onChange={(e) => setClientDemo((p) => ({ ...p, savedPaymentsNote: e.target.value }))} />
                          </Field>
                          <Field label="Tuỳ chọn đăng tin (mô tả ngắn)">
                            <textarea className="fv-input fv-focus-ring min-h-[88px] md:col-span-2" value={clientDemo.postingPrefs} onChange={(e) => setClientDemo((p) => ({ ...p, postingPrefs: e.target.value }))} />
                          </Field>
                        </div>
                        <button type="button" className="fv-btn-secondary fv-focus-ring mt-4" onClick={persistLocalBrowserSettings}>
                          Lưu mẫu khách hàng (trình duyệt)
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {section === "professional" && isFreelancer ? (
                  <>
                    <SectionCard title="II. Chuyên nghiệp (Freelancer)" hint="Đơn giá / trạng thái / ngôn ngữ đồng bộ qua Lưu hồ sơ ở tab Hồ sơ hoặc nút dưới đây.">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Đơn giá / giờ (VND)">
                          <input className="fv-input fv-focus-ring" value={profileForm.hourlyRate} onChange={(e) => setProfileForm((p) => ({ ...p, hourlyRate: e.target.value }))} />
                        </Field>
                        <Field label="Trạng thái nhận việc">
                          <select
                            className="fv-input fv-focus-ring"
                            value={profileForm.availabilityStatus}
                            onChange={(e) => setProfileForm((p) => ({ ...p, availabilityStatus: e.target.value }))}
                          >
                            <option value="available">Sẵn sàng nhận việc</option>
                            <option value="busy">Đang bận</option>
                            <option value="offline">Không nhận dự án</option>
                          </select>
                        </Field>
                        <Field label="Ngân sách dự án tối thiểu (minh họa)">
                          <input className="fv-input fv-focus-ring" value={freelancerDemo.minBudget} onChange={(e) => setFreelancerDemo((p) => ({ ...p, minBudget: e.target.value }))} placeholder="VD: 500000" />
                          <span className="fv-caption mt-1 inline-flex gap-2">
                            <DemoBadge /> Chưa có API — lưu trình duyệt.
                          </span>
                        </Field>
                        <Field label="Múi giờ / timezone">
                          <input className="fv-input fv-focus-ring" value={freelancerDemo.timezone} onChange={(e) => setFreelancerDemo((p) => ({ ...p, timezone: e.target.value }))} />
                        </Field>
                        <Field label="Loại dự án ưu tiên">
                          <textarea className="fv-input fv-focus-ring min-h-[72px]" value={freelancerDemo.preferredTypes} onChange={(e) => setFreelancerDemo((p) => ({ ...p, preferredTypes: e.target.value }))} />
                        </Field>
                        <Field label="Giờ làm việc">
                          <input className="fv-input fv-focus-ring" value={freelancerDemo.workingHours} onChange={(e) => setFreelancerDemo((p) => ({ ...p, workingHours: e.target.value }))} placeholder="VD: 9:00–18:00" />
                        </Field>
                      </div>
                      <div className="flex flex-wrap gap-3 border-t border-[#E8E8E8] pt-6">
                        <button type="button" disabled={savingProfile} onClick={() => void handleSaveProfile()} className="fv-btn-primary fv-focus-ring disabled:opacity-60">
                          {savingProfile ? "Đang lưu…" : "Lưu đơn giá & trạng thái (máy chủ)"}
                        </button>
                        <button type="button" onClick={persistLocalBrowserSettings} className="fv-btn-secondary fv-focus-ring">
                          Lưu phần minh họa (trình duyệt)
                        </button>
                      </div>
                    </SectionCard>

                    <SectionCard title="5. Proposal (minh họa)">
                      <Field label="Mẫu proposal mặc định">
                        <textarea className="fv-input fv-focus-ring min-h-[120px]" value={freelancerDemo.proposalTemplate} onChange={(e) => setFreelancerDemo((p) => ({ ...p, proposalTemplate: e.target.value }))} />
                      </Field>
                      <Field label="Tin nhắn phản hồi nhanh">
                        <textarea className="fv-input fv-focus-ring min-h-[80px]" value={freelancerDemo.autoRespond} onChange={(e) => setFreelancerDemo((p) => ({ ...p, autoRespond: e.target.value }))} />
                      </Field>
                      <Field label="Snippet đã lưu (ghi chú)">
                        <textarea className="fv-input fv-focus-ring min-h-[72px]" value={freelancerDemo.snippetsNote} onChange={(e) => setFreelancerDemo((p) => ({ ...p, snippetsNote: e.target.value }))} />
                      </Field>
                      <button type="button" className="fv-btn-secondary fv-focus-ring" onClick={persistLocalBrowserSettings}>
                        Lưu proposal (trình duyệt)
                      </button>
                    </SectionCard>

                    <SectionCard title="6. Thanh toán & chi trả (minh họa)">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Thông tin ngân hàng (ghi chú)">
                          <textarea className="fv-input fv-focus-ring min-h-[88px]" value={freelancerDemo.bankInfo} onChange={(e) => setFreelancerDemo((p) => ({ ...p, bankInfo: e.target.value }))} />
                        </Field>
                        <Field label="Ví / Stripe / PayPal (ghi chú)">
                          <textarea className="fv-input fv-focus-ring min-h-[88px]" value={freelancerDemo.ewallet} onChange={(e) => setFreelancerDemo((p) => ({ ...p, ewallet: e.target.value }))} />
                        </Field>
                        <Field label="Thuế (ghi chú)">
                          <textarea className="fv-input fv-focus-ring min-h-[72px]" value={freelancerDemo.taxInfo} onChange={(e) => setFreelancerDemo((p) => ({ ...p, taxInfo: e.target.value }))} />
                        </Field>
                        <Field label="Lịch sử rút tiền (ghi chú)">
                          <textarea className="fv-input fv-focus-ring min-h-[72px]" value={freelancerDemo.withdrawalNote} onChange={(e) => setFreelancerDemo((p) => ({ ...p, withdrawalNote: e.target.value }))} />
                        </Field>
                        <Field label="Tiền tệ ưu tiên">
                          <input className="fv-input fv-focus-ring" value={freelancerDemo.payoutCurrency} onChange={(e) => setFreelancerDemo((p) => ({ ...p, payoutCurrency: e.target.value }))} />
                        </Field>
                      </div>
                      <button type="button" className="fv-btn-secondary fv-focus-ring" onClick={persistLocalBrowserSettings}>
                        Lưu thanh toán (trình duyệt)
                      </button>
                    </SectionCard>
                  </>
                ) : null}

                {section === "security" ? (
                  <>
                    <SectionCard title="3. Bảo mật">
                      <Field label="Đổi mật khẩu">
                        <input type="password" className="fv-input fv-focus-ring" disabled placeholder="••••••••" />
                        <span className="fv-caption mt-1 inline-flex gap-2">
                          <DemoBadge /> Luồng đổi mật khẩu API sẽ bổ sung — hiện vui lòng liên hệ quản trị hoặc đăng ký lại nếu cần.
                        </span>
                      </Field>
                      <Field label="Xác thực hai lớp (2FA)">
                        <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
                          <input type="checkbox" className="fv-focus-ring size-5 accent-[#1DBF73]" disabled />
                          <span className="fv-body-sm">Bật 2FA — đang phát triển</span>
                        </label>
                      </Field>
                      <Field label="Phiên đăng nhập gần đây (từ máy chủ)">
                        {loginTimeline.length === 0 ? (
                          <p className="fv-body-sm">Chưa có dòng thời gian đăng nhập hoặc chưa ghi log.</p>
                        ) : (
                          <ul className="fv-inset-card space-y-2">
                            {loginTimeline.map((row, i) => (
                              <li key={`${row.event_time}-${i}`} className="fv-caption font-mono text-[13px] leading-relaxed text-[#404145]">
                                {new Date(row.event_time).toLocaleString("vi-VN")} — {row.event_title}
                              </li>
                            ))}
                          </ul>
                        )}
                      </Field>
                      <Field label="Tài khoản liên kết (Google, GitHub…)">
                        <p className="fv-body-sm inline-flex flex-wrap items-center gap-2">
                          <DemoBadge /> OAuth Google trong codebase vẫn ở chế độ cấu hình — chưa quản lý tại đây.
                        </p>
                      </Field>
                    </SectionCard>
                  </>
                ) : null}

                {section === "notifications" ? (
                  <SectionCard title="IV. Thông báo" hint="Lưu ngay vào localStorage — phù hợp prototype retention.">
                    {(
                      [
                        ["emailProposal", "Email: đề xuất / proposal mới"],
                        ["emailMessage", "Email: tin nhắn mới"],
                        ["emailProject", "Email: cập nhật dự án"],
                        ["emailPayment", "Email: thanh toán"],
                        ["pushEnabled", "Push (trình duyệt)"],
                        ["smsEnabled", "SMS"],
                        ["marketing", "Email marketing"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="flex min-h-[44px] cursor-pointer items-start gap-3 border-b border-[#F5F5F5] py-3 last:border-0">
                        <input
                          type="checkbox"
                          className="fv-focus-ring mt-1 size-5 shrink-0 accent-[#1DBF73]"
                          checked={notifications[key]}
                          onChange={(e) => toggleNotify(key, e.target.checked)}
                        />
                        <span className="fv-body-sm">{label}</span>
                      </label>
                    ))}
                  </SectionCard>
                ) : null}

                {section === "payments" ? (
                  <SectionCard title="Thanh toán" hint="Freelancer: minh họa chi trả. Khách: xem thêm tab Hồ sơ — Client mẫu ở Profile.">
                    {isFreelancer ? (
                      <p className="fv-body">
                        Chi tiết ngân hàng / ví đã đặt ở tab <strong>Chuyên môn → Payment</strong>. Sau này sẽ gắn Stripe/PayPal thật.
                      </p>
                    ) : (
                      <p className="fv-body">Thanh toán Client (thẻ đã lưu, hóa đơn) đang mô phỏng ở tab Hồ sơ → phần khách hàng.</p>
                    )}
                  </SectionCard>
                ) : null}

                {section === "privacy" ? (
                  <SectionCard title="V. Riêng tư">
                    {(
                      [
                        ["profilePublic", "Hiển thị hồ sơ công khai"],
                        ["showEarnings", "Hiển thị thu nhập"],
                        ["showCompletedJobs", "Hiển thị việc đã hoàn thành"],
                        ["allowRecruiters", "Cho phép nhà tuyển dụng liên hệ"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="flex min-h-[44px] cursor-pointer items-start gap-3 border-b border-[#F5F5F5] py-3 last:border-0">
                        <input
                          type="checkbox"
                          className="fv-focus-ring mt-1 size-5 shrink-0 accent-[#1DBF73]"
                          checked={privacy[key]}
                          onChange={(e) => togglePrivacy(key, e.target.checked)}
                        />
                        <span className="fv-body-sm">{label}</span>
                      </label>
                    ))}
                    <Field label="Tải dữ liệu (GDPR style)">
                      <button type="button" className="fv-btn-secondary fv-focus-ring" disabled>
                        Yêu cầu bản sao dữ liệu
                      </button>
                      <span className="fv-caption mt-2 inline-flex gap-2">
                        <DemoBadge /> API export sẽ triển khai sau.
                      </span>
                    </Field>
                  </SectionCard>
                ) : null}

                {section === "subscription" ? (
                  <SectionCard title="VI. Gói thành viên (minh họa)">
                    <div className="fv-inset-card">
                      <p className="fv-heading text-[#404145]">Gói hiện tại: Community</p>
                      <p className="fv-body mt-2">Nâng cấp, lịch sử thanh toán và gia hạn tự động — placeholder cho membership sau này.</p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button type="button" className="fv-btn-primary fv-focus-ring" disabled>
                          Nâng cấp
                        </button>
                        <button type="button" className="fv-btn-secondary fv-focus-ring" disabled>
                          Lịch sử hóa đơn
                        </button>
                      </div>
                    </div>
                  </SectionCard>
                ) : null}

                {section === "account" ? (
                  <>
                    <SectionCard title="VIII. Giao diện & ngôn ngữ (minh họa)">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Theme">
                          <select
                            className="fv-input fv-focus-ring"
                            value={uiPrefs.theme}
                            onChange={(e) => {
                              const v = e.target.value as UiPrefs["theme"];
                              setUiPrefs((p) => {
                                const next = { ...p, theme: v };
                                window.localStorage.setItem(LS_UI, JSON.stringify(next));
                                return next;
                              });
                            }}
                          >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                          </select>
                          <span className="fv-caption mt-1 inline-flex gap-2">
                            <DemoBadge /> Dark mode toàn app chưa gắn — chỉ lưu sở thích.
                          </span>
                        </Field>
                        <Field label="Ngôn ngữ">
                          <select
                            className="fv-input fv-focus-ring"
                            value={uiPrefs.language}
                            onChange={(e) => {
                              const v = e.target.value;
                              setUiPrefs((p) => {
                                const next = { ...p, language: v };
                                window.localStorage.setItem(LS_UI, JSON.stringify(next));
                                return next;
                              });
                            }}
                          >
                            <option value="vi">Tiếng Việt</option>
                            <option value="en">English</option>
                          </select>
                        </Field>
                        <Field label="Hiển thị tiền tệ">
                          <input
                            className="fv-input fv-focus-ring"
                            value={uiPrefs.currency}
                            onChange={(e) => {
                              const v = e.target.value;
                              setUiPrefs((p) => {
                                const next = { ...p, currency: v };
                                window.localStorage.setItem(LS_UI, JSON.stringify(next));
                                return next;
                              });
                            }}
                          />
                        </Field>
                        <Field label="Định dạng giờ">
                          <select
                            className="fv-input fv-focus-ring"
                            value={uiPrefs.timeFormat}
                            onChange={(e) => {
                              const v = e.target.value as UiPrefs["timeFormat"];
                              setUiPrefs((p) => {
                                const next = { ...p, timeFormat: v };
                                window.localStorage.setItem(LS_UI, JSON.stringify(next));
                                return next;
                              });
                            }}
                          >
                            <option value="24h">24 giờ</option>
                            <option value="12h">12 giờ</option>
                          </select>
                        </Field>
                      </div>
                    </SectionCard>

                    <SectionCard title="VII. Quản lý tài khoản">
                      <div className="flex flex-wrap gap-3">
                        <button type="button" className="fv-btn-primary fv-focus-ring disabled:opacity-60" disabled={loggingOut} onClick={() => void handleLogout()}>
                          {loggingOut ? "Đang đăng xuất…" : "Đăng xuất phiên hiện tại"}
                        </button>
                        <button type="button" className="fv-btn-secondary fv-focus-ring" disabled>
                          Đăng xuất mọi phiên
                        </button>
                        <button type="button" className="fv-btn-secondary fv-focus-ring" disabled>
                          Xuất dữ liệu tài khoản
                        </button>
                      </div>
                      <p className="fv-caption mt-4 inline-flex flex-wrap gap-2">
                        <DemoBadge /> Vô hiệu hóa / xóa tài khoản cần quy trình xác nhận pháp lý — chưa bật trên UI.
                      </p>
                    </SectionCard>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
