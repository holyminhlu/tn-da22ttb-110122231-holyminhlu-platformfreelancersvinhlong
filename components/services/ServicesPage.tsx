"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import { authorizedFetch } from "@/lib/authSession";
import { apiPaths, apiUrl, getApiBaseUrl } from "@/config/api.config";

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

function deliveryLabel(days: number | null | undefined) {
  if (days === null || days === undefined || !Number.isFinite(Number(days))) return "Thỏa thuận";
  const d = Math.trunc(Number(days));
  if (d <= 0) return "Thỏa thuận";
  return `${d} ngày`;
}

export default function ServicesPage() {
  const apiBaseUrl = getApiBaseUrl();
  const [query, setQuery] = useState("");
  const [sessionKnown, setSessionKnown] = useState(false);
  const [showGuestHero, setShowGuestHero] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

  const [services, setServices] = useState<ServiceRow[]>([]);
  const [totalFromApi, setTotalFromApi] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [serviceTitle, setServiceTitle] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDeliveryDays, setServiceDeliveryDays] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [serviceTechStack, setServiceTechStack] = useState("");
  const [serviceRequirements, setServiceRequirements] = useState("");
  const [serviceMediaUrls, setServiceMediaUrls] = useState("");
  const [serviceFaqsText, setServiceFaqsText] = useState("");
  const [useCustomPackages, setUseCustomPackages] = useState(false);
  const [servicePackagesDraft, setServicePackagesDraft] = useState<ServicePackageDraft[]>(INITIAL_PACKAGE_DRAFTS);
  const [serviceSupportUpsell, setServiceSupportUpsell] = useState("");
  const [serviceResponseTimeHours, setServiceResponseTimeHours] = useState("");
  const [submittingService, setSubmittingService] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

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
    function readSession() {
      const token = window.localStorage.getItem("vlc_access_token");
      setShowGuestHero(!token);
      let role = "";
      try {
        const raw = window.localStorage.getItem("vlc_current_user");
        if (raw) role = String((JSON.parse(raw) as { role?: string }).role || "");
      } catch {
        role = "";
      }
      setUserRole(role);
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
    void loadServices();
  }, [loadServices]);

  const filteredServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) => {
      const blob = `${s.title} ${s.description || ""} ${s.freelancer_name || ""} ${s.freelancer_title || ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [services, query]);

  async function handleCreateService(e: FormEvent) {
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
        apiUrl(apiPaths.auth.meService, apiBaseUrl),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: serviceTitle.trim(),
            description: serviceDescription.trim(),
            price: priceNum,
            deliveryDays: serviceDeliveryDays.trim() ? Number(serviceDeliveryDays) : undefined,
            category: serviceCategory.trim() || undefined,
            techStack: serviceTechStack
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            requirements: serviceRequirements.trim() || undefined,
            mediaUrls: serviceMediaUrls
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
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
        setFormMessage(payload.message || "Không thể tạo dịch vụ.");
        return;
      }
      setFormMessage(payload.message || "Đã đăng dịch vụ.");
      setServiceTitle("");
      setServiceDescription("");
      setServicePrice("");
      setServiceDeliveryDays("");
      setServiceCategory("");
      setServiceTechStack("");
      setServiceRequirements("");
      setServiceMediaUrls("");
      setServiceFaqsText("");
      setUseCustomPackages(false);
      setServicePackagesDraft(INITIAL_PACKAGE_DRAFTS);
      setServiceSupportUpsell("");
      setServiceResponseTimeHours("");
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
                  <h2 className="fv-heading">Đăng dịch vụ của bạn</h2>
                  <p className="fv-body-sm mt-2 text-[#74767E]">
                    Dịch vụ đã duyệt sẽ hiển thị công khai tại đây. Tiêu đề và giá (VND) là bắt buộc.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateForm((v) => !v)}
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
                <form onSubmit={handleCreateService} className="mt-6 space-y-5">
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
                        <span className="fv-label-caps mb-2 block text-[#74767E]">Mô tả dịch vụ</span>
                        <textarea
                          value={serviceDescription}
                          onChange={(e) => setServiceDescription(e.target.value)}
                          className="fv-input fv-focus-ring min-h-[110px] w-full resize-y"
                          placeholder="Mô tả phạm vi công việc, quy trình và kết quả bàn giao..."
                          rows={4}
                        />
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
                        <span className="fv-label-caps mb-2 block text-[#74767E]">Thời gian bàn giao (ngày)</span>
                        <input
                          value={serviceDeliveryDays}
                          onChange={(e) => setServiceDeliveryDays(e.target.value)}
                          inputMode="numeric"
                          className="fv-input fv-focus-ring w-full"
                          placeholder="Để trống nếu thỏa thuận"
                        />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="fv-label-caps mb-2 block text-[#74767E]">Danh mục</span>
                        <input
                          value={serviceCategory}
                          onChange={(e) => setServiceCategory(e.target.value)}
                          className="fv-input fv-focus-ring w-full"
                          placeholder="Ví dụ: Lập trình Web > Website Builder & CMS"
                        />
                      </label>
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
                      <label className="block sm:col-span-2">
                        <span className="fv-label-caps mb-2 block text-[#74767E]">Media portfolio (mỗi dòng 1 URL)</span>
                        <textarea
                          value={serviceMediaUrls}
                          onChange={(e) => setServiceMediaUrls(e.target.value)}
                          className="fv-input fv-focus-ring min-h-[90px] w-full resize-y"
                          placeholder="https://example.com/demo-1&#10;https://example.com/demo-2"
                          rows={3}
                        />
                      </label>
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
                      {submittingService ? "Đang đăng…" : "Đăng dịch vụ"}
                    </button>
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
              <ul className="grid list-none gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                {Array.from({ length: 6 }).map((_, i) => (
                  <li key={i} className="h-72 animate-pulse rounded-[8px] border border-[#E8E8E8] bg-[#F5F5F5]" />
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
              <ul className="grid list-none gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                {filteredServices.map((service) => {
                  const rating = Number(service.rating_avg) || 0;
                  const reviews = Number(service.total_reviews) || 0;
                  return (
                    <li key={service.id}>
                      <article className="flex h-full flex-col rounded-[8px] border border-[#E8E8E8] bg-[#FFFFFF] p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 hover:shadow-[0px_2px_8px_rgba(0,0,0,0.12)]">
                        <div className="flex min-h-[44px] flex-wrap items-start justify-between gap-2">
                          <span className="fv-badge-neutral font-semibold normal-case !px-2 !py-0.5 !leading-tight">
                            {service.freelancer_title?.trim() || "Dịch vụ"}
                          </span>
                          <span className="fv-caption shrink-0 tabular-nums text-[#74767E]">
                            {deliveryLabel(service.delivery_days)}
                          </span>
                        </div>

                        <h2 className="fv-heading mt-3 line-clamp-2 text-[#404145]">
                          <Link href={`/dich-vu/${service.id}`} className="fv-focus-ring rounded-sm hover:underline">
                            {service.title}
                          </Link>
                        </h2>
                        <p className="fv-body-sm mt-2 line-clamp-3 flex-1 text-[#74767E]">
                          {service.description?.trim() || "Freelancer chưa nhập mô tả chi tiết."}
                        </p>

                        <hr className="fv-divider my-4" />

                        <div className="flex flex-wrap items-end justify-between gap-3">
                          <div className="min-w-0">
                            <p className="fv-body-sm font-bold text-[#404145]">{service.freelancer_name || "Freelancer"}</p>
                            <p className="fv-caption mt-1">Freelancer đã xác minh tài khoản</p>
                          </div>
                          <p
                            className="fv-body-sm shrink-0 tabular-nums font-bold text-[#404145]"
                            aria-label={`Đánh giá ${rating}, ${reviews} nhận xét`}
                          >
                            {rating.toFixed(1)}{" "}
                            <span className="font-normal text-[#74767E]">({reviews})</span>
                          </p>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="fv-body-sm">
                            Giá{" "}
                            <span className="font-bold text-[#1DBF73]" aria-label={`Giá ${formatCurrencyVnd(service.price)}`}>
                              {formatCurrencyVnd(service.price)}
                            </span>
                          </p>
                          <Link href={`/dich-vu/${service.id}`} className="vlc-btn-spotlight w-full shrink-0 sm:w-auto">
                            Xem chi tiết
                          </Link>
                        </div>
                      </article>
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
