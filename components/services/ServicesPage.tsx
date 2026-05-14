"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import { authorizedFetch } from "@/lib/authSession";
import { apiPaths, apiUrl, getApiBaseUrl } from "@/config/api.config";
import { resolveJobImageUrl } from "@/components/jobs/jobMedia";
import { insertIntoTextarea, wrapSelectionInTextarea } from "@/components/services/serviceDescriptionRich";

const SERVICE_DELIVERY_OPTIONS = [1, 3, 5, 7, 15, 30] as const;

type ServiceRow = {
  id: string;
  title: string;
  description: string | null;
  price: number | string;
  delivery_days: number | null;
  created_at: string;
  freelancer_id: string;
  freelancer_name: string | null;
  freelancer_title: string | null;
  freelancer_avatar_url?: string | null;
  media_urls?: unknown;
  packages?: unknown;
  category?: string | null;
  thumbnail_url?: string | null;
  tech_stack?: unknown;
  requirements?: string | null;
  faqs?: unknown;
  demo_media?: unknown;
  response_time_hours?: number | string | null;
  support_upsell?: string | null;
  rating_avg: number | string;
  total_reviews: number;
};

type ServicePackageDraft = {
  id: "basic" | "standard" | "premium";
  name: string;
  price: string;
  deliveryDays: string;
  revisions: string;
  featuresText: string;
};

const INITIAL_PACKAGE_DRAFTS: ServicePackageDraft[] = [
  { id: "basic", name: "Basic", price: "", deliveryDays: "3", revisions: "1 lần", featuresText: "1 trang\nResponsive cơ bản" },
  { id: "standard", name: "Standard", price: "", deliveryDays: "5", revisions: "3 lần", featuresText: "3 trang\nSEO on-page" },
  {
    id: "premium",
    name: "Premium",
    price: "",
    deliveryDays: "10",
    revisions: "Không giới hạn",
    featuresText: "5+ trang\nSEO kỹ thuật\nHỗ trợ sau bàn giao",
  },
];

function formatCurrencyVnd(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : Number(value);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
}

function parseServiceImageUrls(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((v) => String(v || "").trim()).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      if (Array.isArray(p)) return p.map((v) => String(v || "").trim()).filter(Boolean);
    } catch {
      return [];
    }
  }
  return [];
}

function minFromPriceVnd(row: ServiceRow): number {
  const base = typeof row.price === "string" ? Number(row.price) : Number(row.price);
  let min = Number.isFinite(base) && base > 0 ? base : 0;
  const packs = row.packages;
  if (Array.isArray(packs)) {
    for (const p of packs) {
      const pr = Number((p as { price?: unknown })?.price);
      if (Number.isFinite(pr) && pr > 0 && (min === 0 || pr < min)) min = pr;
    }
  }
  return min;
}

type PackageSlotId = "basic" | "standard" | "premium";

function faqsToText(raw: unknown): string {
  if (!Array.isArray(raw)) return "";
  return raw
    .map((row) => {
      const q = String((row as { q?: unknown }).q || "").trim();
      const a = String((row as { a?: unknown }).a || "").trim();
      return q && a ? `${q} | ${a}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function demoUrlFromService(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  return String((raw as { url?: unknown }).url || "").trim();
}

function packagesFromApi(packages: unknown): { drafts: ServicePackageDraft[]; useCustom: boolean } {
  const copyInitial = (): ServicePackageDraft[] => INITIAL_PACKAGE_DRAFTS.map((p) => ({ ...p }));
  if (!Array.isArray(packages) || packages.length === 0) {
    return { drafts: copyInitial(), useCustom: false };
  }
  const order: PackageSlotId[] = ["basic", "standard", "premium"];
  const slots: Record<PackageSlotId, ServicePackageDraft> = {
    basic: { ...INITIAL_PACKAGE_DRAFTS[0] },
    standard: { ...INITIAL_PACKAGE_DRAFTS[1] },
    premium: { ...INITIAL_PACKAGE_DRAFTS[2] },
  };
  const rows = packages.slice(0, 3);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] as {
      id?: unknown;
      name?: unknown;
      price?: unknown;
      deliveryDays?: unknown;
      revisions?: unknown;
      features?: unknown;
    };
    const rawId = String(r.id || "").toLowerCase().trim();
    const slot = (rawId === "basic" || rawId === "standard" || rawId === "premium" ? rawId : order[i]) as PackageSlotId;
    slots[slot] = {
      id: slot,
      name: String(r.name || slots[slot].name).trim() || slots[slot].name,
      price: Number.isFinite(Number(r.price)) ? String(r.price) : "",
      deliveryDays: Number.isFinite(Number(r.deliveryDays)) ? String(r.deliveryDays) : "",
      revisions: String(r.revisions ?? "").trim() || slots[slot].revisions,
      featuresText: Array.isArray(r.features)
        ? r.features.map((f) => String(f || "").trim()).filter(Boolean).join("\n")
        : "",
    };
  }
  return { drafts: order.map((id) => slots[id]), useCustom: true };
}

export default function ServicesPage() {
  const apiBaseUrl = getApiBaseUrl();
  const [query, setQuery] = useState("");
  const [sessionKnown, setSessionKnown] = useState(false);
  const [showGuestHero, setShowGuestHero] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [sessionUserId, setSessionUserId] = useState<string>("");

  const [services, setServices] = useState<ServiceRow[]>([]);
  const [totalFromApi, setTotalFromApi] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [serviceTitle, setServiceTitle] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDeliveryDays, setServiceDeliveryDays] = useState<string>("5");
  const [serviceCategory, setServiceCategory] = useState("");
  const [serviceTechStack, setServiceTechStack] = useState("");
  const [serviceRequirements, setServiceRequirements] = useState("");
  const [serviceGalleryUrls, setServiceGalleryUrls] = useState<string[]>([]);
  const [galleryUploadBusy, setGalleryUploadBusy] = useState(false);
  const [serviceThumbnailUrl, setServiceThumbnailUrl] = useState("");
  const [thumbnailUploadBusy, setThumbnailUploadBusy] = useState(false);
  const [serviceVideoDemoUrl, setServiceVideoDemoUrl] = useState("");
  const [demoUploadBusy, setDemoUploadBusy] = useState(false);
  const [serviceFaqsText, setServiceFaqsText] = useState("");
  const [useCustomPackages, setUseCustomPackages] = useState(false);
  const [servicePackagesDraft, setServicePackagesDraft] = useState<ServicePackageDraft[]>(INITIAL_PACKAGE_DRAFTS);
  const [serviceSupportUpsell, setServiceSupportUpsell] = useState("");
  const [serviceResponseTimeHours, setServiceResponseTimeHours] = useState("");
  const [submittingService, setSubmittingService] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  const serviceDescriptionRef = useRef<HTMLTextAreaElement | null>(null);

  const isFreelancer = sessionKnown && !showGuestHero && userRole === "freelancer";

  const loadServices = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const qs = new URLSearchParams({ limit: "120", offset: "0" });
      const res = await fetch(apiUrl(`${apiPaths.services.list}?${qs}`, apiBaseUrl));
      const payload = (await res.json()) as { services?: ServiceRow[]; total?: number; message?: string };
      if (!res.ok) {
        setLoadError(payload.message || "Không thể tải danh sách dịch vụ.");
        setServices([]);
        setTotalFromApi(0);
        return;
      }
      setServices(payload.services ?? []);
      setTotalFromApi(Number(payload.total) || 0);
    } catch {
      setLoadError("Không thể kết nối máy chủ.");
      setServices([]);
      setTotalFromApi(0);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    let cancelled = false;
    async function loadCats() {
      try {
        const res = await fetch(apiUrl(apiPaths.services.categories, apiBaseUrl));
        const data = (await res.json()) as { categories?: Array<{ name?: string }> };
        if (cancelled) return;
        const names = (data.categories ?? []).map((c) => String(c.name || "").trim()).filter(Boolean);
        setCategoryOptions(names);
      } catch {
        if (!cancelled) setCategoryOptions([]);
      }
    }
    void loadCats();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    function readSession() {
      const token = window.localStorage.getItem("vlc_access_token");
      setShowGuestHero(!token);
      let role = "";
      let uid = "";
      try {
        const raw = window.localStorage.getItem("vlc_current_user");
        if (raw) {
          const u = JSON.parse(raw) as { role?: string; id?: string };
          role = String(u.role || "");
          uid = String(u.id || "");
        }
      } catch {
        role = "";
        uid = "";
      }
      setUserRole(role);
      setSessionUserId(uid);
      setSessionKnown(true);
    }
    readSession();
    window.addEventListener("storage", readSession);
    window.addEventListener("vlc-user-updated", readSession as EventListener);
    return () => {
      window.removeEventListener("storage", readSession);
      window.removeEventListener("vlc-user-updated", readSession as EventListener);
    };
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadServices();
    });
  }, [loadServices]);

  const filteredServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) => {
      const blob = `${s.title} ${s.description || ""} ${s.freelancer_name || ""} ${s.freelancer_title || ""} ${s.category || ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [services, query]);

  function resetServiceForm() {
    setServiceTitle("");
    setServiceDescription("");
    setServicePrice("");
    setServiceDeliveryDays("5");
    setServiceCategory("");
    setServiceTechStack("");
    setServiceRequirements("");
    setServiceGalleryUrls([]);
    setServiceThumbnailUrl("");
    setServiceVideoDemoUrl("");
    setServiceFaqsText("");
    setUseCustomPackages(false);
    setServicePackagesDraft(INITIAL_PACKAGE_DRAFTS.map((p) => ({ ...p })));
    setServiceSupportUpsell("");
    setServiceResponseTimeHours("");
  }

  function beginEditService(service: ServiceRow) {
    setFormMessage("");
    setEditingServiceId(service.id);
    setShowCreateForm(true);
    setServiceTitle(service.title);
    setServiceDescription(String(service.description || ""));
    const p = typeof service.price === "string" ? Number(service.price) : Number(service.price);
    setServicePrice(Number.isFinite(p) ? String(p) : "");
    const dd = Number(service.delivery_days);
    setServiceDeliveryDays(
      Number.isFinite(dd) && SERVICE_DELIVERY_OPTIONS.includes(dd as (typeof SERVICE_DELIVERY_OPTIONS)[number])
        ? String(dd)
        : "5",
    );
    setServiceCategory(String(service.category || "").trim());
    setServiceTechStack(parseServiceImageUrls(service.tech_stack).join(", "));
    setServiceRequirements(String(service.requirements || "").trim());
    setServiceGalleryUrls(parseServiceImageUrls(service.media_urls));
    setServiceThumbnailUrl(String(service.thumbnail_url || "").trim());
    setServiceVideoDemoUrl(demoUrlFromService(service.demo_media));
    setServiceFaqsText(faqsToText(service.faqs));
    const { drafts, useCustom } = packagesFromApi(service.packages);
    setUseCustomPackages(useCustom);
    setServicePackagesDraft(drafts);
    setServiceSupportUpsell(String(service.support_upsell || "").trim());
    const rth = service.response_time_hours;
    setServiceResponseTimeHours(
      rth !== null && rth !== undefined && String(rth).trim() !== "" ? String(rth) : "",
    );
  }

  function cancelServiceEdit() {
    setEditingServiceId(null);
    resetServiceForm();
    setFormMessage("");
    setShowCreateForm(false);
  }

  async function handleSubmitService(e: FormEvent) {
    e.preventDefault();
    if (!serviceTitle.trim() || !servicePrice.trim()) {
      setFormMessage("Nhập tiêu đề và giá dịch vụ.");
      return;
    }
    const priceNum = Number(servicePrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setFormMessage("Giá không hợp lệ.");
      return;
    }
    const dNum = Number(serviceDeliveryDays);
    if (!Number.isFinite(dNum) || !SERVICE_DELIVERY_OPTIONS.includes(dNum as (typeof SERVICE_DELIVERY_OPTIONS)[number])) {
      setFormMessage("Chọn thời gian bàn giao: 1, 3, 5, 7, 15 hoặc 30 ngày.");
      return;
    }
    setSubmittingService(true);
    setFormMessage("");
    try {
      const parsedFaqs = serviceFaqsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [q, a] = line.split("|").map((s) => s.trim());
          return { q: q || "", a: a || "" };
        })
        .filter((row) => row.q && row.a);

      const parsedPackages = useCustomPackages
        ? servicePackagesDraft
            .map((pack) => ({
              id: pack.id,
              name: pack.name.trim() || pack.id.toUpperCase(),
              price: Number(pack.price),
              deliveryDays: Number(pack.deliveryDays),
              revisions: pack.revisions.trim() || "1 lần",
              features: pack.featuresText
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            }))
            .filter((pack) => Number.isFinite(pack.price) && pack.price > 0)
        : undefined;

      if (useCustomPackages && (!parsedPackages || parsedPackages.length === 0)) {
        setFormMessage("Bạn đã bật bảng gói, vui lòng nhập ít nhất 1 gói có giá hợp lệ.");
        setSubmittingService(false);
        return;
      }

      const res = await authorizedFetch(
        apiUrl(
          editingServiceId ? apiPaths.auth.meServiceById(editingServiceId) : apiPaths.auth.meService,
          apiBaseUrl,
        ),
        {
          method: editingServiceId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: serviceTitle.trim(),
            description: serviceDescription.trim(),
            price: priceNum,
            deliveryDays: dNum,
            category: serviceCategory.trim() || undefined,
            techStack: serviceTechStack
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            requirements: serviceRequirements.trim() || undefined,
            mediaUrls: serviceGalleryUrls,
            thumbnailUrl: serviceThumbnailUrl.trim() || undefined,
            demoMedia: (() => {
              const url = serviceVideoDemoUrl.trim();
              if (!url) return undefined;
              return { url, kind: "video" as const };
            })(),
            faqs: parsedFaqs,
            packages: parsedPackages || undefined,
            supportUpsell: serviceSupportUpsell.trim() || undefined,
            responseTimeHours: serviceResponseTimeHours.trim() ? Number(serviceResponseTimeHours) : undefined,
          }),
        },
        apiBaseUrl,
      );
      const payload = (await res.json()) as { message?: string };
      if (!res.ok) {
        setFormMessage(payload.message || (editingServiceId ? "Không thể cập nhật dịch vụ." : "Không thể tạo dịch vụ."));
        return;
      }
      setFormMessage(payload.message || (editingServiceId ? "Đã cập nhật dịch vụ." : "Đã đăng dịch vụ."));
      setEditingServiceId(null);
      resetServiceForm();
      setShowCreateForm(false);
      await loadServices();
      window.dispatchEvent(new Event("vlc-user-updated"));
    } catch {
      setFormMessage("Không thể kết nối máy chủ.");
    } finally {
      setSubmittingService(false);
    }
  }

  return (
    <>
      <Header />
      <main className="fv-profile-shell min-h-screen bg-[#FFFFFF] pb-16 pt-8 md:pb-16 md:pt-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
          {!sessionKnown ? (
            <div
              className="min-h-[220px] animate-pulse rounded-[8px] border border-[#E8E8E8] bg-[#F5F5F5] sm:min-h-[200px]"
              aria-busy
              aria-label="Đang tải phần đầu trang"
            />
          ) : showGuestHero ? (
            <section className="border-b border-[#E8E8E8] pb-10 md:pb-12">
              <p className="fv-label-caps text-[#74767E]">Marketplace dịch vụ</p>
              <h1 className="fv-display mt-2 max-w-[720px]">Khám phá dịch vụ phù hợp với nhu cầu của bạn</h1>
              <p className="fv-body mt-4 max-w-[720px]">
                Dữ liệu dịch vụ do freelancer đăng trên nền tảng. So sánh theo mô tả, ngân sách và đánh giá. Đặt dịch vụ
                hoặc trao đổi thêm thường cần đăng nhập.
              </p>
              <div className="mt-8 flex min-h-[48px] flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href="/dang-nhap"
                  className="fv-btn-primary fv-focus-ring w-full text-center !text-[16px] font-bold leading-snug sm:w-auto sm:!text-[18px]"
                >
                  Đăng nhập để đặt dịch vụ
                </Link>
                <Link
                  href="/tro-thanh-freelancer"
                  className="fv-btn-secondary fv-focus-ring w-full text-center !text-[16px] font-bold leading-snug sm:w-auto sm:!text-[18px]"
                >
                  Trở thành freelancer
                </Link>
              </div>
            </section>
          ) : null}

          {isFreelancer ? (
            <section className={`fv-card ${sessionKnown && !showGuestHero ? "mt-2 md:mt-4" : "mt-8 md:mt-10"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="fv-heading">{editingServiceId ? "Chỉnh sửa dịch vụ" : "Đăng dịch vụ của bạn"}</h2>
                  <p className="fv-body-sm mt-2 text-[#74767E]">
                    {editingServiceId
                      ? "Cập nhật thông tin đã lưu; thay đổi sẽ hiển thị trên marketplace sau khi lưu."
                      : "Dịch vụ đã duyệt sẽ hiển thị công khai tại đây. Tiêu đề và giá (VND) là bắt buộc."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (showCreateForm) {
                      setShowCreateForm(false);
                      setEditingServiceId(null);
                      resetServiceForm();
                      setFormMessage("");
                    } else {
                      setEditingServiceId(null);
                      resetServiceForm();
                      setShowCreateForm(true);
                    }
                  }}
                  className="vlc-job-post-cta fv-focus-ring shrink-0"
                  aria-expanded={showCreateForm}
                >
                  <span className="vlc-job-post-cta__label">{showCreateForm ? "Ẩn form" : "Thêm dịch vụ"}</span>
                  <span className="vlc-job-post-cta__second" aria-hidden>
                    <svg width={36} height={14} viewBox="0 0 66 43" xmlns="http://www.w3.org/2000/svg">
                      <g fill="none" fillRule="evenodd" stroke="none" strokeWidth={1}>
                        <path
                          className="vlc-job-post-cta__path vlc-job-post-cta__one"
                          d="M40.1543933,3.89485454 L43.9763149,0.139296592 C44.1708311,-0.0518420739 44.4826329,-0.0518571125 44.6771675,0.139262789 L65.6916134,20.7848311 C66.0855801,21.1718824 66.0911863,21.8050225 65.704135,22.1989893 C65.7000188,22.2031791 65.6958657,22.2073326 65.6916762,22.2114492 L44.677098,42.8607841 C44.4825957,43.0519059 44.1708242,43.0519358 43.9762853,42.8608513 L40.1545186,39.1069479 C39.9575152,38.9134427 39.9546793,38.5968729 40.1481845,38.3998695 C40.1502893,38.3977268 40.1524132,38.395603 40.1545562,38.3934985 L56.9937789,21.8567812 C57.1908028,21.6632968 57.193672,21.3467273 57.0001876,21.1497035 C56.9980647,21.1475418 56.9959223,21.1453995 56.9937605,21.1432767 L40.1545208,4.60825197 C39.9574869,4.41477773 39.9546013,4.09820839 40.1480756,3.90117456 C40.1501626,3.89904911 40.1522686,3.89694235 40.1543933,3.89485454 Z"
                        />
                        <path
                          className="vlc-job-post-cta__path vlc-job-post-cta__two"
                          d="M20.1543933,3.89485454 L23.9763149,0.139296592 C24.1708311,-0.0518420739 24.4826329,-0.0518571125 24.6771675,0.139262789 L45.6916134,20.7848311 C46.0855801,21.1718824 46.0911863,21.8050225 45.704135,22.1989893 C45.7000188,22.2031791 45.6958657,22.2073326 45.6916762,22.2114492 L24.677098,42.8607841 C24.4825957,43.0519059 24.1708242,43.0519358 23.9762853,42.8608513 L20.1545186,39.1069479 C19.9575152,38.9134427 19.9546793,38.5968729 20.1481845,38.3998695 C20.1502893,38.3977268 20.1524132,38.395603 20.1545562,38.3934985 L36.9937789,21.8567812 C37.1908028,21.6632968 37.193672,21.3467273 37.0001876,21.1497035 C36.9980647,21.1475418 36.9959223,21.1453995 36.9937605,21.1432767 L20.1545208,4.60825197 C19.9574869,4.41477773 19.9546013,4.09820839 20.1480756,3.90117456 C20.1501626,3.89904911 20.1522686,3.89694235 20.1543933,3.89485454 Z"
                        />
                        <path
                          className="vlc-job-post-cta__path vlc-job-post-cta__three"
                          d="M0.154393339,3.89485454 L3.97631488,0.139296592 C4.17083111,-0.0518420739 4.48263286,-0.0518571125 4.67716753,0.139262789 L25.6916134,20.7848311 C26.0855801,21.1718824 26.0911863,21.8050225 25.704135,22.1989893 C25.7000188,22.2031791 25.6958657,22.2073326 25.6916762,22.2114492 L4.67709797,42.8607841 C4.48259567,43.0519059 4.17082418,43.0519358 3.97628526,42.8608513 L0.154518591,39.1069479 C-0.0424848215,38.9134427 -0.0453206733,38.5968729 0.148184538,38.3998695 C0.150289256,38.3977268 0.152413239,38.395603 0.154556228,38.3934985 L16.9937789,21.8567812 C17.1908028,21.6632968 17.193672,21.3467273 17.0001876,21.1497035 C16.9980647,21.1475418 16.9959223,21.1453995 16.9937605,21.1432767 L0.15452076,4.60825197 C-0.0425130651,4.41477773 -0.0453986756,4.09820839 0.148075568,3.90117456 C0.150162624,3.89904911 0.152268631,3.89694235 0.154393339,3.89485454 Z"
                        />
                      </g>
                    </svg>
                  </span>
                </button>
              </div>

              {showCreateForm ? (
                <form onSubmit={handleSubmitService} className="mt-6 space-y-5">
                  <section className="fv-inset-card space-y-4 bg-[#FAFAFA]">
                    <div>
                      <p className="fv-label-caps text-[#1DBF73]">Bước 1</p>
                      <h3 className="fv-heading mt-2">Thông tin tổng quan</h3>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block sm:col-span-2">
                        <span className="fv-label-caps mb-2 block text-[#74767E]">Tiêu đề dịch vụ *</span>
                        <input
                          value={serviceTitle}
                          onChange={(e) => setServiceTitle(e.target.value)}
                          className="fv-input fv-focus-ring w-full"
                          placeholder="Ví dụ: Thiết kế Landing Page bằng Next.js chuẩn SEO"
                          required
                        />
                      </label>
                      <label className="block sm:col-span-2">
                        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <span className="fv-label-caps text-[#74767E]">Mô tả dịch vụ</span>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              className="fv-focus-ring rounded-md border border-[#E8E8E8] bg-white px-2.5 py-1 text-xs font-semibold text-[#404145] transition hover:border-[#1DBF73]/50 hover:bg-[#f6fffb]"
                              onClick={() =>
                                wrapSelectionInTextarea(
                                  serviceDescriptionRef.current,
                                  serviceDescription,
                                  setServiceDescription,
                                  "**",
                                  "**",
                                )
                              }
                            >
                              **Đậm**
                            </button>
                            <button
                              type="button"
                              className="fv-focus-ring rounded-md border border-[#E8E8E8] bg-white px-2.5 py-1 text-xs font-semibold text-[#404145] transition hover:border-[#1DBF73]/50 hover:bg-[#f6fffb]"
                              onClick={() =>
                                insertIntoTextarea(serviceDescriptionRef.current, serviceDescription, setServiceDescription, "\n")
                              }
                            >
                              Xuống dòng
                            </button>
                            <button
                              type="button"
                              className="fv-focus-ring rounded-md border border-[#E8E8E8] bg-white px-2.5 py-1 text-xs font-semibold text-[#404145] transition hover:border-[#1DBF73]/50 hover:bg-[#f6fffb]"
                              onClick={() =>
                                insertIntoTextarea(
                                  serviceDescriptionRef.current,
                                  serviceDescription,
                                  setServiceDescription,
                                  "\n\n",
                                )
                              }
                            >
                              Đoạn mới
                            </button>
                            <button
                              type="button"
                              className="fv-focus-ring rounded-md border border-[#E8E8E8] bg-white px-2.5 py-1 text-xs font-semibold text-[#404145] transition hover:border-[#1DBF73]/50 hover:bg-[#f6fffb]"
                              onClick={() =>
                                insertIntoTextarea(
                                  serviceDescriptionRef.current,
                                  serviceDescription,
                                  setServiceDescription,
                                  "\n- ",
                                )
                              }
                            >
                              Gạch đầu dòng
                            </button>
                          </div>
                        </div>
                        <textarea
                          ref={serviceDescriptionRef}
                          value={serviceDescription}
                          onChange={(e) => setServiceDescription(e.target.value)}
                          className="fv-input fv-focus-ring min-h-[min(360px,52vh)] w-full resize-y py-3 text-[15px] leading-relaxed sm:min-h-[400px] sm:text-base"
                          placeholder={`Mô tả phạm vi công việc, quy trình và kết quả bàn giao…

Ví dụ định dạng:
**Phần quan trọng** in đậm.

- Mục một
- Mục hai`}
                          rows={18}
                          spellCheck
                        />
                        <p className="fv-caption mt-2 max-w-3xl text-[#74767E]">
                          Gõ <code className="rounded bg-[#F0F0F0] px-1 py-0.5 text-[11px]">**văn bản**</code> để in đậm;
                          Enter để xuống dòng; hai lần Enter để tách đoạn; các dòng bắt đầu bằng{" "}
                          <code className="rounded bg-[#F0F0F0] px-1 py-0.5 text-[11px]">- </code> (trong một đoạn) hiển thị
                          thành danh sách trên trang chi tiết.
                        </p>
                      </label>
                      <label className="block">
                        <span className="fv-label-caps mb-2 block text-[#74767E]">Giá khởi điểm (VND) *</span>
                        <input
                          value={servicePrice}
                          onChange={(e) => setServicePrice(e.target.value)}
                          inputMode="numeric"
                          className="fv-input fv-focus-ring w-full"
                          placeholder="500000"
                          required
                        />
                      </label>
                      <label className="block">
                        <span className="fv-label-caps mb-2 block text-[#74767E]">Thời gian bàn giao *</span>
                        <select
                          value={serviceDeliveryDays}
                          onChange={(e) => setServiceDeliveryDays(e.target.value)}
                          className="fv-input fv-focus-ring w-full"
                          required
                        >
                          {SERVICE_DELIVERY_OPTIONS.map((d) => (
                            <option key={d} value={String(d)}>
                              {d} ngày
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="fv-label-caps mb-2 block text-[#74767E]">Danh mục</span>
                        <input
                          value={serviceCategory}
                          onChange={(e) => setServiceCategory(e.target.value)}
                          className="fv-input fv-focus-ring w-full"
                          list="vlc-service-category-suggestions"
                          placeholder="Chọn gợi ý hoặc nhập danh mục tùy chỉnh"
                        />
                        <datalist id="vlc-service-category-suggestions">
                          {categoryOptions.map((name) => (
                            <option key={name} value={name} />
                          ))}
                        </datalist>
                      </label>
                      <div className="block space-y-3 sm:col-span-2">
                        <span className="fv-label-caps block text-[#74767E]">Ảnh thumbnail (hiển thị trên card)</span>
                        <p className="fv-caption text-[#74767E]">
                          Một ảnh nổi bật cho thẻ dịch vụ. Nếu để trống, card dùng ảnh đầu tiên trong bộ minh hoạ ở bước 2.
                        </p>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          disabled={thumbnailUploadBusy}
                          className="fv-body-sm block w-full max-w-md text-[#404145] file:mr-3 file:rounded-sm file:border-0 file:bg-[#1DBF73] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (!file) return;
                            setThumbnailUploadBusy(true);
                            setFormMessage("");
                            try {
                              const fd = new FormData();
                              fd.append("file", file);
                              const res = await authorizedFetch(
                                apiUrl(apiPaths.auth.meServiceThumbnail, apiBaseUrl),
                                { method: "POST", body: fd },
                                apiBaseUrl,
                              );
                              const payload = (await res.json()) as { url?: string; message?: string };
                              if (!res.ok) {
                                setFormMessage(payload.message || "Tải thumbnail thất bại.");
                                return;
                              }
                              if (payload.url) setServiceThumbnailUrl(payload.url);
                            } catch {
                              setFormMessage("Không thể tải thumbnail.");
                            } finally {
                              setThumbnailUploadBusy(false);
                            }
                          }}
                        />
                        <label className="block">
                          <span className="fv-caption mb-1 block text-[#74767E]">Hoặc dán URL ảnh (https hoặc /uploads/services/…)</span>
                          <input
                            value={serviceThumbnailUrl}
                            onChange={(e) => setServiceThumbnailUrl(e.target.value)}
                            className="fv-input fv-focus-ring w-full"
                            placeholder="https://… hoặc /uploads/services/…"
                            disabled={thumbnailUploadBusy}
                          />
                        </label>
                        {thumbnailUploadBusy ? <p className="fv-caption text-[#74767E]">Đang tải thumbnail…</p> : null}
                      </div>
                    </div>
                  </section>

                  <section className="fv-inset-card space-y-4 bg-[#FAFAFA]">
                    <div>
                      <p className="fv-label-caps text-[#1DBF73]">Bước 2</p>
                      <h3 className="fv-heading mt-2">Chi tiết chuyên môn</h3>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block sm:col-span-2">
                        <span className="fv-label-caps mb-2 block text-[#74767E]">Tech stack (phân tách dấu phẩy)</span>
                        <input
                          value={serviceTechStack}
                          onChange={(e) => setServiceTechStack(e.target.value)}
                          className="fv-input fv-focus-ring w-full"
                          placeholder="React, Node.js, Tailwind CSS"
                        />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="fv-label-caps mb-2 block text-[#74767E]">Yêu cầu từ khách hàng</span>
                        <textarea
                          value={serviceRequirements}
                          onChange={(e) => setServiceRequirements(e.target.value)}
                          className="fv-input fv-focus-ring min-h-[90px] w-full resize-y"
                          placeholder="Ví dụ: Cung cấp logo, nội dung, thông tin hosting..."
                          rows={3}
                        />
                      </label>
                      <div className="block space-y-3 sm:col-span-2">
                        <span className="fv-label-caps block text-[#74767E]">Ảnh minh hoạ dịch vụ (tối đa 12 ảnh)</span>
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          disabled={galleryUploadBusy}
                          className="fv-body-sm block w-full max-w-md text-[#404145] file:mr-3 file:rounded-sm file:border-0 file:bg-[#1DBF73] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            e.target.value = "";
                            if (!files.length) return;
                            setGalleryUploadBusy(true);
                            setFormMessage("");
                            try {
                              const fd = new FormData();
                              for (const f of files) {
                                fd.append("images", f);
                              }
                              const res = await authorizedFetch(
                                apiUrl(apiPaths.auth.meServiceImages, apiBaseUrl),
                                { method: "POST", body: fd },
                                apiBaseUrl,
                              );
                              const payload = (await res.json()) as { urls?: string[]; message?: string };
                              if (!res.ok) {
                                setFormMessage(payload.message || "Tải ảnh thất bại.");
                                return;
                              }
                              const next = [...serviceGalleryUrls, ...(payload.urls ?? [])].slice(0, 12);
                              setServiceGalleryUrls(next);
                            } catch {
                              setFormMessage("Không thể tải ảnh.");
                            } finally {
                              setGalleryUploadBusy(false);
                            }
                          }}
                        />
                        {serviceGalleryUrls.length > 0 ? (
                          <ul className="flex flex-wrap gap-2">
                            {serviceGalleryUrls.map((u) => (
                              <li
                                key={u}
                                className="flex items-center gap-1 rounded border border-[#E8E8E8] bg-white px-2 py-1 text-xs text-[#404145]"
                              >
                                <span className="max-w-[180px] truncate">{u}</span>
                                <button
                                  type="button"
                                  className="fv-focus-ring text-[#74767E] hover:text-[#404145]"
                                  onClick={() => setServiceGalleryUrls((prev) => prev.filter((x) => x !== u))}
                                  aria-label="Xóa ảnh"
                                >
                                  ×
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="fv-caption text-[#74767E]">Chưa có ảnh — thẻ dịch vụ sẽ dùng ảnh mặc định.</p>
                        )}
                        {galleryUploadBusy ? <p className="fv-caption text-[#74767E]">Đang tải ảnh…</p> : null}
                      </div>
                      <div className="block space-y-3 sm:col-span-2">
                        <span className="fv-label-caps block text-[#74767E]">Video demo ngắn (tuỳ chọn, 1 file)</span>
                        <p className="fv-caption text-[#74767E]">MP4 / WebM / MOV, tối đa ~25MB. Hoặc dán link YouTube.</p>
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime"
                          disabled={demoUploadBusy}
                          className="fv-body-sm block w-full max-w-md text-[#404145] file:mr-3 file:rounded-sm file:border-0 file:bg-[#1DBF73] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (!file) return;
                            setDemoUploadBusy(true);
                            setFormMessage("");
                            try {
                              const fd = new FormData();
                              fd.append("file", file);
                              const res = await authorizedFetch(
                                apiUrl(apiPaths.auth.meServiceDemo, apiBaseUrl),
                                { method: "POST", body: fd },
                                apiBaseUrl,
                              );
                              const payload = (await res.json()) as { url?: string; message?: string };
                              if (!res.ok) {
                                setFormMessage(payload.message || "Tải video thất bại.");
                                return;
                              }
                              if (payload.url) setServiceVideoDemoUrl(payload.url);
                            } catch {
                              setFormMessage("Không thể tải video.");
                            } finally {
                              setDemoUploadBusy(false);
                            }
                          }}
                        />
                        <label className="block">
                          <span className="fv-caption mb-1 block text-[#74767E]">Hoặc URL video (YouTube / file đã upload)</span>
                          <input
                            value={serviceVideoDemoUrl}
                            onChange={(e) => setServiceVideoDemoUrl(e.target.value)}
                            className="fv-input fv-focus-ring w-full"
                            placeholder="https://www.youtube.com/watch?v=… hoặc /uploads/services/…"
                            disabled={demoUploadBusy}
                          />
                        </label>
                        {demoUploadBusy ? <p className="fv-caption text-[#74767E]">Đang tải video…</p> : null}
                      </div>
                      <label className="block sm:col-span-2">
                        <span className="fv-label-caps mb-2 block text-[#74767E]">FAQs (mỗi dòng: Câu hỏi | Trả lời)</span>
                        <textarea
                          value={serviceFaqsText}
                          onChange={(e) => setServiceFaqsText(e.target.value)}
                          className="fv-input fv-focus-ring min-h-[90px] w-full resize-y"
                          placeholder="Bạn có bảo hành không? | Có, hỗ trợ 7 ngày sau bàn giao."
                          rows={3}
                        />
                      </label>
                      <div className="sm:col-span-2">
                        <label className="inline-flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={useCustomPackages}
                            onChange={(e) => setUseCustomPackages(e.target.checked)}
                            className="h-4 w-4 accent-[#1DBF73]"
                          />
                          <span className="fv-body-sm font-semibold text-[#404145]">Bật bảng gói dịch vụ (Basic/Standard/Premium)</span>
                        </label>
                        <p className="fv-caption mt-2 text-[#74767E]">
                          Tắt mục này để hệ thống tự tạo gói mặc định từ giá và thời gian giao.
                        </p>
                      </div>
                      {useCustomPackages ? (
                        <div className="sm:col-span-2 grid gap-3">
                          {servicePackagesDraft.map((pack, idx) => (
                            <div key={pack.id} className="fv-inset-card grid gap-3 sm:grid-cols-2">
                              <p className="sm:col-span-2 fv-label-caps text-[#1DBF73]">{pack.name}</p>
                              <label className="block">
                                <span className="fv-label-caps mb-2 block text-[#74767E]">Giá (VND)</span>
                                <input
                                  value={pack.price}
                                  onChange={(e) =>
                                    setServicePackagesDraft((prev) =>
                                      prev.map((p, i) => (i === idx ? { ...p, price: e.target.value } : p)),
                                    )
                                  }
                                  inputMode="numeric"
                                  className="fv-input fv-focus-ring w-full"
                                  placeholder="500000"
                                />
                              </label>
                              <label className="block">
                                <span className="fv-label-caps mb-2 block text-[#74767E]">Ngày giao</span>
                                <input
                                  value={pack.deliveryDays}
                                  onChange={(e) =>
                                    setServicePackagesDraft((prev) =>
                                      prev.map((p, i) => (i === idx ? { ...p, deliveryDays: e.target.value } : p)),
                                    )
                                  }
                                  inputMode="numeric"
                                  className="fv-input fv-focus-ring w-full"
                                  placeholder="5"
                                />
                              </label>
                              <label className="block sm:col-span-2">
                                <span className="fv-label-caps mb-2 block text-[#74767E]">Số lần chỉnh sửa</span>
                                <input
                                  value={pack.revisions}
                                  onChange={(e) =>
                                    setServicePackagesDraft((prev) =>
                                      prev.map((p, i) => (i === idx ? { ...p, revisions: e.target.value } : p)),
                                    )
                                  }
                                  className="fv-input fv-focus-ring w-full"
                                  placeholder="3 lần"
                                />
                              </label>
                              <label className="block sm:col-span-2">
                                <span className="fv-label-caps mb-2 block text-[#74767E]">Tính năng (mỗi dòng 1 ý)</span>
                                <textarea
                                  value={pack.featuresText}
                                  onChange={(e) =>
                                    setServicePackagesDraft((prev) =>
                                      prev.map((p, i) => (i === idx ? { ...p, featuresText: e.target.value } : p)),
                                    )
                                  }
                                  rows={3}
                                  className="fv-input fv-focus-ring min-h-[90px] w-full resize-y"
                                  placeholder="1 trang&#10;Responsive&#10;SEO on-page"
                                />
                              </label>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <section className="fv-inset-card space-y-4 bg-[#FAFAFA]">
                    <div>
                      <p className="fv-label-caps text-[#1DBF73]">Bước 3</p>
                      <h3 className="fv-heading mt-2">Chăm sóc khách hàng</h3>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="fv-label-caps mb-2 block text-[#74767E]">Phản hồi trung bình (giờ)</span>
                        <input
                          value={serviceResponseTimeHours}
                          onChange={(e) => setServiceResponseTimeHours(e.target.value)}
                          inputMode="numeric"
                          className="fv-input fv-focus-ring w-full"
                          placeholder="1"
                        />
                      </label>
                      <label className="block">
                        <span className="fv-label-caps mb-2 block text-[#74767E]">Upsell hỗ trợ</span>
                        <input
                          value={serviceSupportUpsell}
                          onChange={(e) => setServiceSupportUpsell(e.target.value)}
                          className="fv-input fv-focus-ring w-full"
                          placeholder="Bảo trì 1 tháng: 1.200.000 VND"
                        />
                      </label>
                    </div>
                  </section>

                  {formMessage ? (
                    <p className="fv-body-sm text-[#404145]" role="status">
                      {formMessage}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={submittingService}
                      className="fv-btn-primary fv-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submittingService ? (editingServiceId ? "Đang lưu…" : "Đang đăng…") : editingServiceId ? "Lưu thay đổi" : "Đăng dịch vụ"}
                    </button>
                    {editingServiceId ? (
                      <button
                        type="button"
                        onClick={cancelServiceEdit}
                        disabled={submittingService}
                        className="fv-btn-secondary fv-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Hủy chỉnh sửa
                      </button>
                    ) : null}
                    <p className="fv-caption">Mẹo: tiêu đề rõ ràng + media thật giúp tăng tỉ lệ khách liên hệ.</p>
                  </div>
                </form>
              ) : null}

              <hr className="fv-divider my-8" />
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-6">
                <label className="block min-w-0">
                  <span className="fv-label-caps mb-2 block text-[#74767E]">Tìm trong danh sách</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Lọc theo tiêu đề, mô tả, tên freelancer…"
                    autoComplete="off"
                    className="fv-input fv-focus-ring box-border"
                  />
                </label>
                <div className="fv-caption pb-1 text-[#74767E] lg:text-right">
                  <span className="font-semibold tabular-nums text-[#1DBF73]">{filteredServices.length}</span> /{" "}
                  <span className="tabular-nums">{services.length}</span> dịch vụ
                </div>
              </div>
            </section>
          ) : (
            <section className={`fv-card ${sessionKnown && !showGuestHero ? "mt-2 md:mt-4" : "mt-8 md:mt-10"}`}>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-6">
                <label className="block min-w-0">
                  <span className="fv-label-caps mb-2 block text-[#74767E]">Tìm kiếm dịch vụ</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Từ khóa trong tiêu đề, mô tả, tên freelancer…"
                    autoComplete="off"
                    className="fv-input fv-focus-ring box-border"
                  />
                </label>
                <div className="fv-caption pb-1 text-[#74767E] lg:text-right">
                  Hiển thị{" "}
                  <span className="font-semibold tabular-nums text-[#1DBF73]" aria-live="polite">
                    {filteredServices.length}
                  </span>
                  {query.trim() ? (
                    <>
                      {" "}
                      / <span className="tabular-nums">{totalFromApi}</span> trên máy chủ
                    </>
                  ) : (
                    <> dịch vụ</>
                  )}
                </div>
              </div>
            </section>
          )}

          {loadError ? (
            <div className="fv-error-banner fv-focus-ring mt-8" role="alert">
              <p className="fv-body-sm">{loadError}</p>
            </div>
          ) : null}

          <section className="mt-8 md:mt-10">
            {loading ? (
              <ul className="grid list-none gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <li key={i} className="aspect-[16/22] animate-pulse rounded-[12px] border border-[#E8E8E8] bg-[#F5F5F5]" />
                ))}
              </ul>
            ) : filteredServices.length === 0 ? (
              <div className="fv-alert-card" role="status">
                <p className="fv-heading text-[#404145]">
                  {services.length === 0 ? "Chưa có dịch vụ nào trên marketplace" : "Không khớp bộ lọc tìm kiếm"}
                </p>
                <p className="fv-body mt-3">
                  {services.length === 0
                    ? "Freelancer có thể đăng dịch vụ tại trang này (khi đã đăng nhập bằng tài khoản freelancer)."
                    : "Thử đổi từ khóa hoặc xóa ô tìm kiếm để xem lại toàn bộ danh sách đã tải."}
                </p>
              </div>
            ) : (
              <ul className="grid list-none gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-6">
                {filteredServices.map((service) => {
                  const rating = Number(service.rating_avg) || 0;
                  const reviews = Number(service.total_reviews) || 0;
                  const imgs = parseServiceImageUrls(service.media_urls);
                  const thumbRaw = String(service.thumbnail_url || "").trim();
                  const coverRaw = thumbRaw || imgs[0] || "";
                  const cover = coverRaw ? resolveJobImageUrl(coverRaw, apiBaseUrl) : "";
                  const coverIsDedicatedThumb = Boolean(thumbRaw);
                  const avatarRaw = String(service.freelancer_avatar_url || "").trim();
                  const avatar = avatarRaw ? resolveJobImageUrl(avatarRaw, apiBaseUrl) : "";
                  const fromPrice = minFromPriceVnd(service);
                  const initial = (service.freelancer_name || "F").trim().slice(0, 1).toUpperCase();
                  const isOwner = Boolean(sessionUserId && service.freelancer_id === sessionUserId);
                  return (
                    <li key={service.id} className="relative h-full">
                      {isOwner ? (
                        <button
                          type="button"
                          onClick={() => beginEditService(service)}
                          className="fv-focus-ring absolute right-2 top-2 z-20 rounded-md border border-[#E8E8E8] bg-white/95 px-2.5 py-1 text-xs font-semibold text-[#404145] shadow-sm backdrop-blur-sm hover:bg-white"
                        >
                          Sửa
                        </button>
                      ) : null}
                      <Link href={`/dich-vu/${service.id}`} className="fv-focus-ring group flex h-full flex-col overflow-hidden rounded-[12px] border border-[#E8E8E8] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                        <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-[#F0F0F0]">
                          {cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={cover}
                              alt=""
                              className={`absolute inset-0 h-full w-full transition-transform duration-300 group-hover:scale-[1.02] ${
                                coverIsDedicatedThumb ? "object-contain object-center" : "object-cover object-center"
                              }`}
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#EEFDF4] to-[#F5F5F5]">
                              <span className="text-4xl font-bold text-[#1DBF73]/40" aria-hidden>
                                {initial}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-3 p-4">
                          <div className="flex min-w-0 items-center gap-2.5">
                            {avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={avatar}
                                alt=""
                                className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-[#E8E8E8]"
                                loading="lazy"
                              />
                            ) : (
                              <div
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1DBF73] text-sm font-bold text-white"
                                aria-hidden
                              >
                                {initial}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[#404145]">{service.freelancer_name || "Freelancer"}</p>
                              {service.freelancer_title?.trim() ? (
                                <p className="truncate text-xs text-[#74767E]">{service.freelancer_title}</p>
                              ) : null}
                            </div>
                          </div>
                          <h2 className="line-clamp-2 min-h-[2.75rem] text-[15px] font-bold leading-snug text-[#404145]">{service.title}</h2>
                          <div className="mt-auto flex items-end justify-between gap-2 border-t border-[#F0F0F0] pt-3">
                            <p className="text-xs text-[#74767E]" aria-label={`Đánh giá trung bình ${rating} trên 5, ${reviews} đánh giá`}>
                              <span className="font-semibold text-[#404145]">{rating.toFixed(1)}</span>
                              <span className="text-[#BABABA]"> /5</span>
                              {reviews > 0 ? <span className="tabular-nums"> ({reviews})</span> : null}
                            </p>
                            <p className="shrink-0 text-right">
                              <span className="block text-[10px] font-medium uppercase tracking-wide text-[#74767E]">Từ</span>
                              <span className="block text-sm font-bold tabular-nums text-[#1DBF73]">{formatCurrencyVnd(fromPrice)}</span>
                            </p>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
