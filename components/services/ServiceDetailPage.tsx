"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import { apiPaths, apiUrl, getApiBaseUrl } from "@/config/api.config";
import { resolveJobImageUrl } from "@/components/jobs/jobMedia";
import { ServiceFormattedBody } from "@/components/services/serviceDescriptionRich";

type ServiceDetail = {
  id: string;
  title: string;
  description: string | null;
  price: number | string | null;
  delivery_days: number | null;
  category?: string | null;
  media_urls?: unknown;
  packages?: unknown;
  tech_stack?: unknown;
  requirements?: string | null;
  faqs?: unknown;
  response_time_hours?: number | string | null;
  support_upsell?: string | null;
  demo_media?: unknown;
  created_at: string;
  freelancer_id: string;
  freelancer_name: string | null;
  freelancer_title: string | null;
  freelancer_bio?: string | null;
  freelancer_skills?: unknown;
  freelancer_languages?: string | null;
  rating_avg: number | string;
  total_reviews: number;
};

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client_name: string | null;
};

function formatCurrencyVnd(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : Number(value);
  if (!Number.isFinite(n) || n <= 0) return "Thỏa thuận";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);
}

function formatDt(iso: string | null | undefined) {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(dt);
}

function deliveryLabel(days: number | null | undefined) {
  if (days === null || days === undefined || !Number.isFinite(Number(days))) return "Thỏa thuận";
  const d = Math.trunc(Number(days));
  return d > 0 ? `${d} ngày` : "Thỏa thuận";
}

type ServicePackage = {
  id: string;
  name: string;
  price: number;
  deliveryDays: number;
  revisions: string;
  features: string[];
};

type FaqRow = {
  q: string;
  a: string;
};

function parseStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((v) => String(v || "").trim()).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v || "").trim()).filter(Boolean);
    } catch {
      return raw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    }
  }
  return [];
}

type DemoMedia = { url: string; kind: "image" | "video" };

function parseDemoMedia(raw: unknown): DemoMedia | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as { url?: unknown; kind?: unknown };
  const url = String(o.url || "").trim();
  if (!url) return null;
  const k = String(o.kind || "").toLowerCase();
  if (k === "video" || k === "image") return { url, kind: k };
  const pathOnly = url.split("?")[0].toLowerCase();
  if (/(\.youtube\.com\/|youtu\.be\/)/i.test(url)) return { url, kind: "video" };
  if (/\.(mp4|webm|ogg|mov)(\b|$)/i.test(pathOnly)) return { url, kind: "video" };
  return { url, kind: "image" };
}

function extractYoutubeEmbedSrc(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return url.split("?")[0];
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
  } catch {
    return null;
  }
  return null;
}

/** Chuẩn hóa URL để tránh trùng slide khi demo trùng một ảnh trong gallery. */
function slideDedupeKey(url: string, apiBaseUrl: string): string {
  const resolved = resolveJobImageUrl(url, apiBaseUrl).trim();
  return resolved.split("?")[0].toLowerCase();
}

type ResolvedIntroSlide = {
  id: string;
  kind: "image" | "video";
  sourceUrl: string;
  resolvedUrl: string;
  youtubeEmbed: string | null;
};

function buildIntroSlides(demo: DemoMedia | null, galleryUrls: string[], apiBaseUrl: string): ResolvedIntroSlide[] {
  const out: ResolvedIntroSlide[] = [];
  const seen = new Set<string>();

  const push = (dm: DemoMedia) => {
    const key = slideDedupeKey(dm.url, apiBaseUrl);
    if (!key || seen.has(key)) return;
    seen.add(key);
    const resolvedUrl = resolveJobImageUrl(dm.url, apiBaseUrl);
    out.push({
      id: `slide-${out.length}-${key.slice(-48)}`,
      kind: dm.kind,
      sourceUrl: dm.url,
      resolvedUrl,
      youtubeEmbed: extractYoutubeEmbedSrc(dm.url),
    });
  };

  if (demo) push(demo);
  for (const raw of galleryUrls) {
    const dm = parseDemoMedia({ url: raw });
    if (dm) push(dm);
  }
  return out;
}

function ServiceIntroSlideView({ slide, title }: { slide: ResolvedIntroSlide; title: string }) {
  if (slide.youtubeEmbed) {
    return (
      <iframe
        title={`Video giới thiệu: ${title}`}
        src={slide.youtubeEmbed}
        className="absolute inset-0 h-full w-full rounded-[6px] border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }
  if (slide.kind === "video") {
    return (
      <>
        <video
          key={slide.resolvedUrl}
          controls
          playsInline
          className="absolute inset-0 z-0 h-full w-full object-contain"
          src={slide.resolvedUrl}
        />
        <p className="pointer-events-none absolute bottom-2 left-0 right-0 z-10 text-center">
          <a
            href={slide.resolvedUrl}
            className="fv-focus-ring pointer-events-auto text-xs text-[#BABABA] underline sm:text-sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            Mở video trong tab mới
          </a>
        </p>
      </>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- URL ngoài / CDN, không dùng next/image
    <img
      src={slide.resolvedUrl}
      alt={`Ảnh giới thiệu: ${title}`}
      className="absolute inset-0 h-full w-full object-contain"
    />
  );
}

function isPremiumServicePackName(name: string): boolean {
  return name.trim().toLowerCase() === "premium";
}

function parseServicePackages(raw: unknown): ServicePackage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => ({
      id: String((row as { id?: unknown })?.id || "").trim(),
      name: String((row as { name?: unknown })?.name || "").trim(),
      price: Number((row as { price?: unknown })?.price),
      deliveryDays: Number((row as { deliveryDays?: unknown })?.deliveryDays),
      revisions: String((row as { revisions?: unknown })?.revisions || "").trim(),
      features: Array.isArray((row as { features?: unknown[] })?.features)
        ? (row as { features: unknown[] }).features.map((v) => String(v || "").trim()).filter(Boolean)
        : [],
    }))
    .filter((row) => row.id && row.name && Number.isFinite(row.price) && row.price > 0);
}

function parseFaqs(raw: unknown): FaqRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => ({
      q: String((row as { q?: unknown })?.q || "").trim(),
      a: String((row as { a?: unknown })?.a || "").trim(),
    }))
    .filter((row) => row.q && row.a);
}

function Cart2Icon() {
  return (
    <svg viewBox="0 0 16 16" className="bi bi-cart2" fill="currentColor" height="16" width="16" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M0 2.5A.5.5 0 0 1 .5 2H2a.5.5 0 0 1 .485.379L2.89 4H14.5a.5.5 0 0 1 .485.621l-1.5 6A.5.5 0 0 1 13 11H4a.5.5 0 0 1-.485-.379L1.61 3H.5a.5.5 0 0 1-.5-.5zM3.14 5l1.25 5h8.22l1.25-5H3.14zM5 13a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-2 1a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm9-1a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-2 1a2 2 0 1 1 4 0 2 2 0 0 1-4 0z" />
    </svg>
  );
}

const STAR_BURST_PATH =
  "M392.05 0c-20.9,210.08 -184.06,378.41 -392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93,-210.06 184.09,-378.37 392.05,-407.74 -207.98,-29.38 -371.16,-197.69 -392.06,-407.78z";

function StarBurstFourPointSvg() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" aria-hidden>
      <path className="vlc-starburst-btn__star-path" fillRule="evenodd" clipRule="evenodd" d={STAR_BURST_PATH} />
    </svg>
  );
}

function StarBurstStars() {
  return (
    <>
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <div key={n} className={`vlc-starburst-btn__star vlc-starburst-btn__star--${n}`} aria-hidden>
          <StarBurstFourPointSvg />
        </div>
      ))}
    </>
  );
}

function PackageCheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
      <path
        fill="#ffffff"
        d="M21.5821 5.54289C21.9726 5.93342 21.9726 6.56658 21.5821 6.95711L10.2526 18.2867C9.86452 18.6747 9.23627 18.6775 8.84475 18.293L2.29929 11.8644C1.90527 11.4774 1.89956 10.8443 2.28655 10.4503C2.67354 10.0562 3.30668 10.0505 3.70071 10.4375L9.53911 16.1717L20.1679 5.54289C20.5584 5.15237 21.1916 5.15237 21.5821 5.54289Z"
        clipRule="evenodd"
        fillRule="evenodd"
      />
    </svg>
  );
}

function ServiceIntroMediaCarousel({ slides, title }: { slides: ResolvedIntroSlide[]; title: string }) {
  const [slideIdx, setSlideIdx] = useState(0);
  const n = slides.length;
  const safeIdx = n ? Math.min(Math.max(0, slideIdx), n - 1) : 0;
  const activeSlide = slides[safeIdx] ?? null;

  const goPrev = useCallback(() => {
    setSlideIdx((i) => {
      if (!n) return 0;
      const cur = Math.min(Math.max(0, i), n - 1);
      return (cur - 1 + n) % n;
    });
  }, [n]);

  const goNext = useCallback(() => {
    setSlideIdx((i) => {
      if (!n) return 0;
      const cur = Math.min(Math.max(0, i), n - 1);
      return (cur + 1) % n;
    });
  }, [n]);

  return (
    <div className="mt-4 overflow-hidden rounded-[8px] border border-[#E8E8E8] bg-[#0B0B0C]">
      <p className="fv-label-caps border-b border-[#2B2B2D] bg-[#141414] px-4 py-2 text-[#BABABA]">Ảnh &amp; video giới thiệu</p>
      <div className="p-3 sm:p-4">
        {activeSlide ? (
          <div
            role="region"
            aria-roledescription="carousel"
            aria-label="Ảnh và video giới thiệu dịch vụ"
            aria-live="polite"
            tabIndex={0}
            onKeyDown={(e) => {
              if (n <= 1) return;
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                goPrev();
              }
              if (e.key === "ArrowRight") {
                e.preventDefault();
                goNext();
              }
            }}
            className="relative mx-auto w-full max-w-[720px] rounded-[6px] outline-none focus-visible:ring-2 focus-visible:ring-[#1DBF73] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0C]"
          >
            <div key={activeSlide.id} className="relative aspect-video w-full overflow-hidden rounded-[6px] bg-black">
              <ServiceIntroSlideView slide={activeSlide} title={title} />
              {n > 1 ? (
                <>
                  <button
                    type="button"
                    aria-label="Media trước"
                    className="fv-focus-ring absolute left-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-lg font-semibold text-white shadow-md backdrop-blur-sm transition hover:bg-black/75 sm:left-2 sm:h-11 sm:w-11"
                    onClick={(e) => {
                      e.stopPropagation();
                      goPrev();
                    }}
                  >
                    <span aria-hidden>&lt;</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Media sau"
                    className="fv-focus-ring absolute right-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-lg font-semibold text-white shadow-md backdrop-blur-sm transition hover:bg-black/75 sm:right-2 sm:h-11 sm:w-11"
                    onClick={(e) => {
                      e.stopPropagation();
                      goNext();
                    }}
                  >
                    <span aria-hidden>&gt;</span>
                  </button>
                </>
              ) : null}
            </div>
            {n > 1 ? (
              <p className="mt-3 text-center text-xs text-[#BABABA]">
                {safeIdx + 1} / {n} · Phím ← → khi đang chọn vùng này
              </p>
            ) : null}
          </div>
        ) : (
          <p className="fv-body-sm text-center text-[#9A9A9C]">Freelancer chưa cập nhật ảnh hoặc video giới thiệu.</p>
        )}
      </div>
    </div>
  );
}

export default function ServiceDetailPage({ serviceId }: { serviceId: string }) {
  const apiBaseUrl = getApiBaseUrl();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [sessionKnown, setSessionKnown] = useState(false);
  const [showGuestHero, setShowGuestHero] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [sessionUserId, setSessionUserId] = useState("");

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
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(apiUrl(apiPaths.services.detail(serviceId), apiBaseUrl));
        const payload = (await res.json()) as { service?: ServiceDetail; reviews?: ReviewRow[]; message?: string };
        if (cancelled) return;
        if (!res.ok || !payload.service) {
          setError(payload.message || "Không thể tải chi tiết dịch vụ.");
          return;
        }
        setService(payload.service);
        setReviews(payload.reviews || []);
      } catch {
        if (!cancelled) setError("Không thể kết nối máy chủ.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, serviceId]);

  const pricingPacks = useMemo(() => parseServicePackages(service?.packages), [service?.packages]);
  const techStack = useMemo(() => parseStringArray(service?.tech_stack), [service?.tech_stack]);
  const languages = useMemo(() => parseStringArray(service?.freelancer_languages), [service?.freelancer_languages]);
  const freelancerSkills = useMemo(() => parseStringArray(service?.freelancer_skills), [service?.freelancer_skills]);
  const mediaUrls = useMemo(() => parseStringArray(service?.media_urls), [service?.media_urls]);
  const demoMedia = useMemo(() => parseDemoMedia(service?.demo_media), [service?.demo_media]);
  const introSlides = useMemo(() => buildIntroSlides(demoMedia, mediaUrls, apiBaseUrl), [apiBaseUrl, demoMedia, mediaUrls]);

  const faqRows = useMemo(() => parseFaqs(service?.faqs), [service?.faqs]);
  const avgRating = Number(service?.rating_avg) || 0;
  const totalReviews = Number(service?.total_reviews) || 0;

  const isLoggedIn = sessionKnown && !showGuestHero;
  const isOwnerFreelancer = Boolean(
    service &&
      isLoggedIn &&
      userRole === "freelancer" &&
      sessionUserId &&
      String(service.freelancer_id) === sessionUserId,
  );

  return (
    <>
      <Header />
      <main className="fv-profile-shell min-h-screen bg-[#FFFFFF] pb-20 pt-4 sm:pt-6">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
          <nav className="flex items-center gap-4 border-b border-[#E8E8E8] pb-3" aria-label="Điều hướng phụ">
            <Link href="/dich-vu" className="fv-nav-link fv-focus-ring inline-flex min-h-9 items-center rounded-sm px-0 py-1">
              ← Dịch vụ
            </Link>
            <Link href="/" className="fv-nav-link fv-focus-ring inline-flex min-h-9 items-center rounded-sm px-0 py-1">
              Trang chủ
            </Link>
          </nav>

          {loading ? (
            <div className="mt-8 h-64 animate-pulse rounded-[8px] border border-[#E8E8E8] bg-[#F5F5F5]" />
          ) : error ? (
            <div className="fv-error-banner mt-8" role="alert">
              <p className="fv-body-sm">{error}</p>
            </div>
          ) : service ? (
            <article className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-6">
                <section className="fv-card">
                  <p className="fv-label-caps text-[#74767E]">The Hook</p>
                  <h1 className="fv-display mt-2">{service.title}</h1>
                  <p className="fv-caption mt-2">
                    Đăng {formatDt(service.created_at)} · {service.freelancer_name || "Freelancer"}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="fv-inset-card">
                      <p className="fv-label-caps text-[#74767E]">Xếp hạng</p>
                      <p className="fv-body-sm mt-1 font-semibold text-[#404145]">
                        {avgRating.toFixed(1)}/5 · {totalReviews} đánh giá
                      </p>
                    </div>
                    <div className="fv-inset-card">
                      <p className="fv-label-caps text-[#74767E]">Danh mục</p>
                      <p className="fv-body-sm mt-1 font-semibold text-[#404145]">{service.category || "Chưa cập nhật"}</p>
                    </div>
                  </div>
                  <ServiceIntroMediaCarousel key={serviceId} slides={introSlides} title={service.title} />
                </section>

                <section id="goi-dich-vu" className="fv-card">
                  <h2 className="fv-heading">Các gói dịch vụ &amp; Giá cả</h2>
                  {pricingPacks.length > 0 ? (
                    <div className="mt-4 flex flex-wrap justify-center gap-6 lg:justify-start">
                      {pricingPacks.map((pack) => {
                        const isPremium = isPremiumServicePackName(pack.name);
                        const listLines = [
                          ...pack.features,
                          `Thời gian giao: ${deliveryLabel(pack.deliveryDays)}`,
                          `Chỉnh sửa: ${pack.revisions}`,
                        ].filter(Boolean);
                        return (
                          <div
                            key={pack.id}
                            className={`relative flex w-full max-w-[320px] flex-col overflow-visible rounded-3xl p-6 ${
                              isPremium
                                ? "vlc-service-pack-premium-card"
                                : "bg-black shadow-[0_0_25px_rgba(0,0,0,0.3)]"
                            }`}
                          >
                            {isPremium ? (
                              <span className="vlc-service-pack-premium-ribbon" aria-hidden />
                            ) : null}
                            <div className={isPremium ? "relative pt-14 sm:pt-12" : "relative"}>
                              <p className="text-center text-xs font-semibold uppercase tracking-wide text-white/70">
                                {pack.name}
                              </p>
                              <p className="mt-2 text-center text-3xl font-semibold leading-none text-white sm:text-[3rem]">
                                {formatCurrencyVnd(pack.price)}
                              </p>
                              <ul className="mt-10 flex flex-col gap-3 text-sm leading-5 text-white">
                                {listLines.map((line) => (
                                  <li key={`${pack.id}-${line}`} className="flex items-start">
                                    <span className="mt-0.5">
                                      <PackageCheckIcon />
                                    </span>
                                    <span className="ml-4">{line}</span>
                                  </li>
                                ))}
                              </ul>
                              <button
                                type="button"
                                className="vlc-slide-cart-btn"
                                data-tooltip={`Giá: ${formatCurrencyVnd(pack.price)}`}
                              >
                                <span className="vlc-slide-cart-btn__wrapper">
                                  <span className="vlc-slide-cart-btn__text">Đặt hàng ngay</span>
                                  <span className="vlc-slide-cart-btn__icon">
                                    <Cart2Icon />
                                  </span>
                                </span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="fv-body-sm mt-3 text-[#74767E]">Freelancer chưa cập nhật bảng gói dịch vụ.</p>
                  )}
                </section>

                <section className="fv-card text-[17px] leading-[1.65] text-[#404145] sm:text-[18px] sm:leading-[1.7]">
                  <h2 className="fv-heading text-[#18191b]">Nội dung chi tiết</h2>
                  <h3 className="fv-label-caps mt-5 text-[13px] font-semibold tracking-wide text-[#74767E] sm:mt-6 sm:text-sm">
                    Mô tả dịch vụ
                  </h3>
                  {service.description?.trim() ? (
                    <ServiceFormattedBody
                      text={service.description}
                      className="mt-3 text-[17px] leading-[1.65] text-[#404145] sm:text-[18px] sm:leading-[1.7]"
                    />
                  ) : (
                    <p className="mt-3 text-[17px] leading-relaxed text-[#74767E] sm:text-[18px]">
                      Freelancer chưa cập nhật mô tả dịch vụ.
                    </p>
                  )}
                  <h3 className="fv-label-caps mt-6 text-[13px] font-semibold tracking-wide text-[#74767E] sm:mt-7 sm:text-sm">
                    Tech Stack
                  </h3>
                  {techStack.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {techStack.map((t) => (
                        <span key={t} className="fv-badge-neutral">
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="fv-caption mt-3 text-[#74767E]">Chưa có tech stack.</p>
                  )}
                  <h3 className="fv-label-caps mt-6 text-[13px] font-semibold tracking-wide text-[#74767E] sm:mt-7 sm:text-sm">
                    Yêu cầu đối với khách hàng
                  </h3>
                  {service.requirements?.trim() ? (
                    <ServiceFormattedBody
                      text={service.requirements}
                      className="mt-3 text-[17px] leading-[1.65] text-[#404145] sm:text-[18px] sm:leading-[1.7]"
                    />
                  ) : (
                    <p className="mt-3 text-[17px] leading-relaxed text-[#74767E] sm:text-[18px]">
                      Freelancer chưa cập nhật yêu cầu đầu vào.
                    </p>
                  )}
                </section>

                <section className="fv-card">
                  <h2 className="fv-heading">Bằng chứng xã hội &amp; Hỗ trợ</h2>
                  <div className="mt-4 space-y-3">
                    {reviews.length > 0 ? (
                      reviews.map((r) => (
                        <div key={r.id} className="fv-inset-card">
                          <p className="fv-body-sm font-semibold text-[#404145]">
                            {"★".repeat(Math.max(1, Math.min(5, Number(r.rating) || 0)))} · {r.client_name || "Khách hàng"}
                          </p>
                          <p className="fv-caption mt-1">{r.comment?.trim() || "Khách hàng hài lòng với chất lượng bàn giao."}</p>
                        </div>
                      ))
                    ) : (
                      <div className="fv-inset-card">
                        <p className="fv-caption">Chưa có đánh giá chi tiết.</p>
                      </div>
                    )}
                    {faqRows.map((faq) => (
                      <details key={faq.q} className="fv-inset-card">
                        <summary className="cursor-pointer fv-body-sm font-semibold text-[#404145]">{faq.q}</summary>
                        <p className="fv-caption mt-2">{faq.a}</p>
                      </details>
                    ))}
                    {service.support_upsell ? (
                      <div className="fv-inset-card border-[#1DBF73] bg-[rgba(29,191,115,0.06)]">
                        <p className="fv-label-caps text-[#1DBF73]">Dịch vụ liên quan</p>
                        <p className="fv-body-sm mt-2 text-[#404145]">{service.support_upsell}</p>
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>

              <aside className="w-full space-y-6 lg:sticky lg:top-24 lg:z-10 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:self-start">
                <section className="fv-card">
                  <h2 className="fv-heading">Hồ sơ Freelancer</h2>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E8E8E8] bg-[#F5F5F5] text-sm font-bold text-[#404145]">
                      {String(service.freelancer_name || "FL")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <div>
                      <p className="fv-body-sm font-semibold text-[#404145]">{service.freelancer_name || "Freelancer"}</p>
                      <p className="fv-caption">{service.freelancer_title || "Pro Seller"}</p>
                    </div>
                  </div>
                  <p className="fv-body-sm mt-3 text-[#404145]">
                    {service.freelancer_bio?.trim() || "Freelancer chưa cập nhật tiểu sử."}
                  </p>
                  <p className="fv-caption mt-3">
                    Phản hồi trung bình:{" "}
                    {service.response_time_hours && Number(service.response_time_hours) > 0
                      ? `${Number(service.response_time_hours)} giờ`
                      : "Chưa cập nhật"}
                  </p>
                  <p className="fv-caption mt-1">Ngôn ngữ: {languages.length ? languages.join(", ") : "Chưa cập nhật"}</p>
                  <p className="fv-caption mt-1">
                    Kỹ năng: {freelancerSkills.length ? freelancerSkills.join(", ") : "Chưa cập nhật"}
                  </p>
                </section>

                <section className="fv-card">
                  <h2 className="fv-heading">Giá khởi điểm</h2>
                  <p className="fv-display mt-3 text-[#1DBF73]">{formatCurrencyVnd(service.price)}</p>
                  <p className="fv-caption mt-2">Thời gian giao: {deliveryLabel(service.delivery_days)}</p>
                  <div className="mt-4 grid gap-2">
                    <button type="button" className="vlc-starburst-btn fv-focus-ring">
                      <span className="vlc-starburst-btn__label">Liên hệ tư vấn</span>
                      <StarBurstStars />
                    </button>
                    {!sessionKnown ? (
                      <div
                        className="min-h-[48px] rounded-xl border border-[#E8E8E8] bg-[#F5F5F5] animate-pulse"
                        aria-busy
                        aria-label="Đang kiểm tra phiên đăng nhập"
                      />
                    ) : showGuestHero ? (
                      <Link href="/dang-nhap" className="vlc-starburst-btn fv-focus-ring">
                        <span className="vlc-starburst-btn__label">Đăng nhập để đặt dịch vụ</span>
                        <StarBurstStars />
                      </Link>
                    ) : isOwnerFreelancer ? (
                      <Link href="/dich-vu" className="vlc-starburst-btn fv-focus-ring">
                        <span className="vlc-starburst-btn__label">Quản lý dịch vụ</span>
                        <StarBurstStars />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="vlc-starburst-btn fv-focus-ring"
                        onClick={() =>
                          document.getElementById("goi-dich-vu")?.scrollIntoView({ behavior: "smooth", block: "start" })
                        }
                      >
                        <span className="vlc-starburst-btn__label">Chọn gói và đặt dịch vụ</span>
                        <StarBurstStars />
                      </button>
                    )}
                  </div>
                </section>
              </aside>
            </article>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  );
}
