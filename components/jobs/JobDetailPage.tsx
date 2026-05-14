"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import { parseJobImages, resolveJobImageUrl } from "@/components/jobs/jobMedia";
import { authorizedFetch } from "@/lib/authSession";
import { apiPaths, apiUrl, getApiBaseUrl } from "@/config/api.config";

type JobDetail = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  budget: number | string | null;
  status: string;
  created_at: string;
  updated_at?: string | null;
  images?: unknown;
  due_at?: string | null;
  client_name?: string | null;
  location_label?: string | null;
  location_lat?: number | string | null;
  location_lng?: number | string | null;
};

function formatBudget(value: JobDetail["budget"]) {
  if (value === null || value === undefined || value === "") return "Thỏa thuận";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n) || n <= 0) return "Thỏa thuận";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);
}

function formatDt(iso: string | null | undefined) {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "full", timeStyle: "short" }).format(dt);
}

function statusVi(s: string | null | undefined) {
  const k = String(s || "").toLowerCase();
  if (k === "open") return "Đang tuyển";
  if (k === "in_progress") return "Đang thực hiện";
  if (k === "closed") return "Đã đóng";
  if (k === "cancelled") return "Đã hủy";
  return s || "—";
}

function jobStatusBadgeClass(s: string | null | undefined) {
  const k = String(s || "").toLowerCase();
  if (k === "open" || k === "in_progress") return "fv-badge-success";
  if (k === "cancelled") return "fv-badge-error";
  return "fv-badge-neutral";
}

function jobDetailLocationSummary(job: JobDetail): string | null {
  const lab = String(job.location_label || "").trim();
  const lat = job.location_lat != null ? Number(job.location_lat) : NaN;
  const lng = job.location_lng != null ? Number(job.location_lng) : NaN;
  const hasC = Number.isFinite(lat) && Number.isFinite(lng);
  if (lab && hasC) return `${lab}\nGPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  if (lab) return lab;
  if (hasC) return `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  return null;
}

function SvgClock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 7.5v4.5l3 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SvgMoney({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="6.5" width="17" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M6.5 9.5h.01M17.5 14.5h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function SvgPin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11" r="2.25" fill="currentColor" />
    </svg>
  );
}

function SvgStatus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12.5l4 4 10-10" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SvgImage({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="9" cy="9" r="1.4" fill="currentColor" />
      <path d="M5.5 16l4.3-4 3.2 2.8 2.5-2.3 2 1.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SvgChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 7l-5 5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SvgChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M10 7l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getUrgencyMeta(dueAt: string | null | undefined) {
  if (!dueAt) return null;
  const due = new Date(dueAt).getTime();
  if (!Number.isFinite(due)) return null;

  const now = Date.now();
  const diffMs = due - now;
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours <= 0) {
    return { label: "Đã quá hạn", percent: 100, tone: "danger" as const };
  }
  if (diffHours <= 24) {
    const percent = Math.min(100, Math.max(10, ((24 - diffHours) / 24) * 100));
    return { label: "Rất gấp (trong 24 giờ)", percent, tone: "danger" as const };
  }
  if (diffHours <= 72) {
    const percent = Math.min(90, Math.max(10, ((72 - diffHours) / 72) * 100));
    return { label: "Khá gấp (3 ngày)", percent, tone: "warn" as const };
  }
  return { label: "Thời hạn bình thường", percent: 25, tone: "normal" as const };
}

function urgencyBarClass(tone: "danger" | "warn" | "normal") {
  if (tone === "danger") return "bg-[#D74C3B]";
  if (tone === "warn") return "bg-[#404145]";
  return "fv-progress-fill";
}

function urgencyLabelClass(tone: "danger" | "warn" | "normal") {
  if (tone === "danger") return "text-[#D74C3B]";
  if (tone === "warn") return "text-[#404145]";
  return "text-[#1DBF73]";
}

export default function JobDetailPage({ jobId }: { jobId: string }) {
  const apiBaseUrl = getApiBaseUrl();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");
      setForbidden(false);
      setJob(null);
      setActiveImage(0);

      try {
        const res = await authorizedFetch(apiUrl(apiPaths.jobs.detail(jobId), apiBaseUrl), {}, apiBaseUrl);
        const payload = (await res.json()) as { job?: JobDetail; message?: string };

        if (cancelled) return;

        if (res.status === 403) {
          setForbidden(true);
          setError(payload.message || "Không có quyền xem tin này.");
          return;
        }
        if (!res.ok) {
          setError(payload.message || "Không thể tải chi tiết công việc.");
          return;
        }
        if (!payload.job) {
          setError("Không có dữ liệu.");
          return;
        }
        setJob(payload.job);
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
  }, [apiBaseUrl, jobId]);

  const images = job ? parseJobImages(job.images) : [];
  const resolvedImages = images.map((src) => resolveJobImageUrl(src, apiBaseUrl)).filter(Boolean) as string[];
  const canShowActiveImage = resolvedImages.length > 0;
  const activeImageSrc = canShowActiveImage
    ? resolvedImages[Math.min(activeImage, resolvedImages.length - 1)]
    : null;
  const urgency = getUrgencyMeta(job?.due_at);
  const galleryCount = resolvedImages.length;
  const showGalleryNav = galleryCount > 1;

  return (
    <>
      <Header />
      <main id="main-content" className="fv-profile-shell min-h-screen pb-24 pt-3 sm:pt-5">
        <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
          <nav
            aria-label="Điều hướng phụ"
            className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-[#E8E8E8] pb-2"
          >
            <Link href="/viec-lam" className="fv-nav-link fv-focus-ring inline-flex min-h-9 items-center gap-2 rounded-sm px-0 py-1">
              <span aria-hidden>←</span>
              Việc làm
            </Link>
            <Link href="/" className="fv-nav-link fv-focus-ring inline-flex min-h-9 items-center rounded-sm px-0 py-1">
              Trang chủ
            </Link>
          </nav>

          {loading ? (
            <div className="mt-8 grid animate-pulse gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
              <div className="rounded-[8px] border border-[#E8E8E8] bg-[#FFFFFF] p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] sm:p-4">
                <div className="h-3 w-24 rounded bg-[#E8E8E8]" />
                <div className="mt-4 h-8 max-w-xl rounded bg-[#E8E8E8]" />
                <div className="mt-3 h-4 w-2/5 rounded bg-[#F5F5F5]" />
                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <div className="h-20 rounded-[8px] border border-[#E8E8E8] bg-[#F5F5F5]" />
                  <div className="h-20 rounded-[8px] border border-[#E8E8E8] bg-[#F5F5F5]" />
                  <div className="h-20 rounded-[8px] border border-[#E8E8E8] bg-[#F5F5F5]" />
                </div>
                <div className="mt-8 h-48 w-full rounded-[8px] bg-[#F5F5F5] sm:h-56" />
                <div className="mt-6 h-4 w-40 rounded bg-[#E8E8E8]" />
                <div className="mt-3 h-3 w-full rounded bg-[#F5F5F5]" />
                <div className="mt-2 h-3 w-11/12 rounded bg-[#F5F5F5]" />
              </div>
              <div className="space-y-6">
                <div className="rounded-[8px] border border-[#E8E8E8] bg-[#FFFFFF] p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)]">
                  <div className="h-4 w-28 rounded bg-[#E8E8E8]" />
                  <div className="mt-4 h-11 rounded-[8px] bg-[#F5F5F5]" />
                  <div className="mt-3 h-11 rounded-[8px] bg-[#F5F5F5]" />
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="mt-8 space-y-4">
              <div className="fv-error-banner fv-focus-ring rounded-[8px]" role="alert">
                <p className="font-semibold text-[#D74C3B]">{error}</p>
                {forbidden ? (
                  <p className="fv-body-sm mt-3 text-[#74767E]">
                    Tin có thể đã đóng. Đăng nhập bằng tài khoản Client (chủ tin) hoặc Freelancer đã nhận việc để xem lại.
                  </p>
                ) : null}
              </div>
              <Link href="/viec-lam" className="fv-btn-primary fv-focus-ring inline-flex">
                Về danh sách
              </Link>
            </div>
          ) : job ? (
            <article className="mt-8 space-y-8">
              <header className="fv-card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <p className="fv-label-caps text-[#74767E]">Chi tiết công việc</p>
                    <h1 className="fv-display pr-2">{job.title}</h1>
                    <p className="fv-body-sm text-[#74767E]">
                      Đăng {formatDt(job.created_at)}
                      {job.client_name ? (
                        <>
                          {" "}
                          · <span className="font-semibold text-[#404145]">{job.client_name}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <span className={`shrink-0 self-start ${jobStatusBadgeClass(job.status)}`}>{statusVi(job.status)}</span>
                </div>

                <hr className="fv-divider my-6" />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="fv-inset-card flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-[#E8E8E8] bg-[#F5F5F5] text-[#404145]">
                      <SvgMoney className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="fv-label-caps text-[#74767E]">Ngân sách</p>
                      <p className="fv-body-sm mt-1 font-semibold text-[#404145]">{formatBudget(job.budget)}</p>
                    </div>
                  </div>
                  <div className="fv-inset-card flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-[#E8E8E8] bg-[#F5F5F5] text-[#404145]">
                      <SvgPin className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="fv-label-caps text-[#74767E]">Vị trí làm việc</p>
                      <p className="fv-body-sm mt-1 whitespace-pre-wrap font-semibold text-[#404145]">
                        {jobDetailLocationSummary(job) || "Chưa ghi nhận"}
                      </p>
                    </div>
                  </div>
                  <div className="fv-inset-card flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-[#E8E8E8] bg-[#F5F5F5] text-[#404145]">
                      <SvgClock className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="fv-label-caps text-[#74767E]">Hạn mong muốn</p>
                      <p className="fv-body-sm mt-1 font-semibold text-[#404145]">
                        {job.due_at ? formatDt(job.due_at) : "Không giới hạn"}
                      </p>
                    </div>
                  </div>
                  <div className="fv-inset-card flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-[#E8E8E8] bg-[#F5F5F5] text-[#404145]">
                      <SvgStatus className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="fv-label-caps text-[#74767E]">Cập nhật</p>
                      <p className="fv-body-sm mt-1 font-semibold text-[#404145]">{formatDt(job.updated_at || job.created_at)}</p>
                    </div>
                  </div>
                </div>
              </header>

              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
                <div className="space-y-8">
                  {canShowActiveImage ? (
                    <section className="fv-card">
                      <h2 className="fv-heading inline-flex items-center gap-2">
                        <SvgImage className="h-5 w-5 shrink-0 text-[#404145]" aria-hidden />
                        Hình ảnh đính kèm
                      </h2>
                      <div className="relative mt-4">
                        {showGalleryNav ? (
                          <>
                            <button
                              type="button"
                              aria-label="Ảnh trước"
                              disabled={activeImage <= 0}
                              onClick={() => setActiveImage((i) => Math.max(0, i - 1))}
                              className="fv-focus-ring absolute left-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#E8E8E8] bg-[#FFFFFF] text-[#404145] shadow-[0px_2px_8px_rgba(0,0,0,0.12)] transition hover:border-[#1DBF73] hover:text-[#1DBF73] disabled:pointer-events-none disabled:opacity-35 sm:left-2"
                            >
                              <SvgChevronLeft className="h-6 w-6 -translate-x-px" />
                            </button>
                            <button
                              type="button"
                              aria-label="Ảnh sau"
                              disabled={activeImage >= galleryCount - 1}
                              onClick={() => setActiveImage((i) => Math.min(galleryCount - 1, i + 1))}
                              className="fv-focus-ring absolute right-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#E8E8E8] bg-[#FFFFFF] text-[#404145] shadow-[0px_2px_8px_rgba(0,0,0,0.12)] transition hover:border-[#1DBF73] hover:text-[#1DBF73] disabled:pointer-events-none disabled:opacity-35 sm:right-2"
                            >
                              <SvgChevronRight className="h-6 w-6 translate-x-px" />
                            </button>
                          </>
                        ) : null}
                        <a
                          href={activeImageSrc || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="fv-focus-ring flex min-h-[160px] items-center justify-center overflow-hidden rounded-[8px] border border-[#E8E8E8] bg-[#F5F5F5] px-2 py-3 transition hover:border-[#1DBF73] sm:min-h-[200px] sm:px-4 sm:py-4"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={activeImageSrc || ""}
                            alt={`Ảnh minh họa chính cho ${job.title}`}
                            className="max-h-[200px] w-full max-w-full object-contain sm:max-h-[240px] md:max-h-[280px]"
                            loading="lazy"
                          />
                        </a>
                      </div>
                      {showGalleryNav ? (
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="fv-caption text-center text-[#74767E] sm:text-left" aria-live="polite">
                            Ảnh {activeImage + 1} / {galleryCount}
                          </p>
                          <div className="scrollbar-hide flex justify-center gap-2 overflow-x-auto pb-1 sm:justify-end">
                            {resolvedImages.map((src, idx) => (
                              <button
                                key={`${src}-${idx}`}
                                type="button"
                                onClick={() => setActiveImage(idx)}
                                className={`fv-focus-ring flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[4px] border bg-[#F5F5F5] transition ${
                                  activeImage === idx
                                    ? "border-[#1DBF73] ring-2 ring-[rgba(29,191,115,0.2)]"
                                    : "border-[#E8E8E8] hover:border-[#74767E]"
                                }`}
                                aria-label={`Xem ảnh minh họa ${idx + 1}`}
                                aria-pressed={activeImage === idx}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={src}
                                  alt=""
                                  className="h-9 w-9 object-cover"
                                  loading="lazy"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  <section className="fv-card">
                    <h2 className="fv-heading inline-flex items-center gap-2">
                      <SvgStatus className="h-5 w-5 shrink-0 text-[#404145]" aria-hidden />
                      Mô tả công việc
                    </h2>
                    {job.description ? (
                      <p className="fv-body mt-4 whitespace-pre-wrap">{job.description}</p>
                    ) : (
                      <p className="fv-body-sm mt-4 italic text-[#A9ABB3]">Chưa có mô tả chi tiết.</p>
                    )}
                  </section>
                </div>

                <aside className="space-y-6 lg:sticky lg:top-24">
                  {urgency ? (
                    <section className="fv-card">
                      <h2 className="fv-heading inline-flex items-center gap-2">
                        <SvgClock className="h-5 w-5 shrink-0 text-[#404145]" aria-hidden />
                        Mức độ ưu tiên
                      </h2>
                      <p className={`fv-body-sm mt-4 font-semibold ${urgencyLabelClass(urgency.tone)}`}>{urgency.label}</p>
                      <div className="fv-progress-track mt-3">
                        <div
                          className={`h-full rounded-[9999px] transition-[width] ${urgencyBarClass(urgency.tone)}`}
                          style={{ width: `${urgency.percent}%` }}
                        />
                      </div>
                    </section>
                  ) : null}

                  <section className="fv-card">
                    <h2 className="fv-heading inline-flex items-center gap-2">
                      <SvgStatus className="h-5 w-5 shrink-0 text-[#404145]" aria-hidden />
                      Tóm tắt nhanh
                    </h2>
                    <dl className="mt-4 space-y-3">
                      <div className="fv-inset-card">
                        <dt className="fv-caption text-[#74767E]">Trạng thái</dt>
                        <dd className="fv-body-sm mt-1 font-semibold text-[#404145]">{statusVi(job.status)}</dd>
                      </div>
                      <div className="fv-inset-card">
                        <dt className="fv-caption text-[#74767E]">Ngân sách</dt>
                        <dd className="fv-body-sm mt-1 font-semibold text-[#404145]">{formatBudget(job.budget)}</dd>
                      </div>
                      <div className="fv-inset-card">
                        <dt className="fv-caption text-[#74767E]">Hạn mong muốn</dt>
                        <dd className="fv-body-sm mt-1 font-semibold text-[#404145]">
                          {job.due_at ? formatDt(job.due_at) : "Không có"}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  <section className="fv-card">
                    <h2 className="fv-heading inline-flex items-center gap-2">
                      <SvgClock className="h-5 w-5 shrink-0 text-[#404145]" aria-hidden />
                      Hành động
                    </h2>
                    <div className="mt-4 grid gap-3">
                      <Link href="/dang-nhap" className="fv-btn-primary fv-focus-ring w-full text-center sm:w-auto">
                        Đăng nhập để nhận việc
                      </Link>
                      <Link href="/viec-lam" className="fv-btn-secondary fv-focus-ring w-full text-center sm:w-auto">
                        Quay lại danh sách
                      </Link>
                    </div>
                  </section>
                </aside>
              </div>
            </article>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  );
}
