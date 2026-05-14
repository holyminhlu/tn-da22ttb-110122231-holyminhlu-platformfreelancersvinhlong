"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import JobPostCtaLink from "@/components/jobs/JobPostCtaLink";
import { parseJobImages, resolveJobImageUrl } from "@/components/jobs/jobMedia";
import { authorizedFetch } from "@/lib/authSession";
import { apiPaths, apiUrl, getApiBaseUrl } from "@/config/api.config";

type JobRow = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  budget: number | string | null;
  status: string;
  created_at: string;
  client_name: string | null;
  images?: unknown;
  due_at?: string | null;
  location_label?: string | null;
  location_lat?: number | string | null;
  location_lng?: number | string | null;
};

type JobsApiResponse = {
  jobs: JobRow[];
  total: number;
  limit: number;
  offset: number;
  message?: string;
};

function formatBudget(value: JobRow["budget"]) {
  if (value === null || value === undefined || value === "") return "Thỏa thuận";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n) || n <= 0) return "Thỏa thuận";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);
}

function formatPostedAt(iso: string) {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(dt);
}

function jobLocationSummary(job: JobRow): string | null {
  const lab = String(job.location_label || "").trim();
  const lat = job.location_lat != null ? Number(job.location_lat) : NaN;
  const lng = job.location_lng != null ? Number(job.location_lng) : NaN;
  const hasC = Number.isFinite(lat) && Number.isFinite(lng);
  if (lab && hasC) return `${lab} · GPS ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  if (lab) return lab;
  if (hasC) return `GPS ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  return null;
}

function formatDueShort(iso: string | null | undefined) {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(dt);
}

function statusLabel(status: string) {
  const key = String(status || "").toLowerCase();
  if (key === "open") return "Đang tuyển";
  if (key === "in_progress") return "Đang thực hiện";
  if (key === "closed") return "Đã đóng";
  if (key === "cancelled") return "Đã hủy";
  return "Đang cập nhật";
}

function statusBadgeClass(status: string) {
  const key = String(status || "").toLowerCase();
  if (key === "open") return "fv-badge-success";
  if (key === "cancelled") return "fv-badge-error";
  return "fv-badge-neutral";
}

const PAGE_SIZE = 12;

export default function JobsPage() {
  const apiBaseUrl = getApiBaseUrl();
  /** Sau khi đọc localStorage; tránh flash panel khách cho user đã đăng nhập. */
  const [sessionKnown, setSessionKnown] = useState(false);
  /** true = chưa có token → hiện panel giới thiệu + CTA đăng nhập */
  const [showGuestHero, setShowGuestHero] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState("");

  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const fetchJobs = useCallback(
    async (nextOffset: number, append: boolean) => {
      append ? setLoadingMore(true) : setLoading(true);
      setError("");
      try {
        const qs = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(nextOffset) });
        const res = await fetch(apiUrl(`${apiPaths.jobs.list}?${qs.toString()}`, apiBaseUrl));
        const payload = (await res.json()) as JobsApiResponse & { message?: string };
        if (!res.ok) {
          setError(payload.message || "Không thể tải danh sách việc làm.");
          return;
        }
        setTotal(payload.total);
        setOffset(nextOffset);
        setJobs((prev) => (append ? [...prev, ...payload.jobs] : payload.jobs));
      } catch {
        setError("Không thể kết nối máy chủ.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [apiBaseUrl],
  );

  useEffect(() => {
    void fetchJobs(0, false);
  }, [fetchJobs]);

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
      }
      setUserRole(role);
      setUserId(uid);
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

  const [acceptingJobId, setAcceptingJobId] = useState<string | null>(null);
  const [acceptErrors, setAcceptErrors] = useState<Record<string, string>>({});

  async function acceptJob(job: JobRow) {
    setAcceptingJobId(job.id);
    setAcceptErrors((prev) => {
      const next = { ...prev };
      delete next[job.id];
      return next;
    });
    try {
      const res = await authorizedFetch(
        apiUrl(apiPaths.auth.meJobsAccept(job.id), apiBaseUrl),
        { method: "POST" },
        apiBaseUrl,
      );
      const payload = (await res.json()) as { message?: string };
      if (!res.ok) {
        setAcceptErrors((prev) => ({
          ...prev,
          [job.id]:
            res.status === 401
              ? "Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại."
              : payload.message || "Không thể nhận việc.",
        }));
        return;
      }
      window.dispatchEvent(new Event("vlc-user-updated"));
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch {
      setAcceptErrors((prev) => ({ ...prev, [job.id]: "Không thể kết nối máy chủ." }));
    } finally {
      setAcceptingJobId(null);
    }
  }

  const hasMore = jobs.length < total;
  const isLoggedIn = sessionKnown && !showGuestHero;
  const isClient = isLoggedIn && userRole === "client";
  const isFreelancer = isLoggedIn && userRole === "freelancer";
  const openCount = jobs.filter((job) => String(job.status).toLowerCase() === "open").length;

  return (
    <>
      <Header />
      <main id="main-content" className="fv-profile-shell min-h-screen bg-[#FFFFFF] pb-16 pt-8 md:pb-16 md:pt-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
          {!sessionKnown ? (
            <div
              className="min-h-[220px] animate-pulse rounded-[8px] border border-[#E8E8E8] bg-[#F5F5F5] sm:min-h-[200px]"
              aria-busy
              aria-label="Đang tải phần đầu trang"
            />
          ) : showGuestHero ? (
            <header className="border-b border-[#E8E8E8] pb-10 md:pb-12">
              <p className="fv-label-caps text-[#74767E]">Việc làm freelance</p>
              <h1 className="fv-display mt-2 max-w-[720px]">Khám phá việc làm mới mỗi ngày</h1>
              <p className="fv-body mt-4 max-w-[720px]">
                Các công việc do khách hàng đăng trên nền tảng, cập nhật liên tục theo nhu cầu tại Vĩnh Long. Đăng nhập để nhận
                việc, theo dõi trạng thái và kết nối — danh sách bên dưới là dữ liệu thật từ máy chủ.
              </p>
              <div className="mt-8 flex min-h-[48px] flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link href="/dang-nhap" className="fv-btn-primary fv-focus-ring w-full text-center sm:w-auto">
                  Đăng nhập để kết nối
                </Link>
                <Link href="/tro-thanh-freelancer" className="fv-btn-secondary fv-focus-ring w-full text-center sm:w-auto">
                  Trở thành freelancer
                </Link>
              </div>
            </header>
          ) : (
            <header className="fv-card">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
                <div className="min-w-0">
                  <p className="fv-label-caps text-[#74767E]">Marketplace việc làm</p>
                  <h1 className="fv-display mt-2 text-[#000000]">Bảng tin công việc</h1>
                  <p className="fv-body mt-3 max-w-[720px]">
                    Danh sách tin đang tuyển được cập nhật theo thời gian thực.
                    {isFreelancer ? " Chọn việc phù hợp và nhấn Nhận việc để bắt đầu — hệ thống sẽ ghi nhận ngay." : ""}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="fv-inset-card text-center">
                    <p className="fv-caption text-[#74767E]">Tổng tin</p>
                    <p className="fv-stat-value mt-2">{loading ? "…" : total}</p>
                  </div>
                  <div className="fv-inset-card text-center">
                    <p className="fv-caption text-[#74767E]">Đang tuyển</p>
                    <p className="fv-stat-value fv-stat-value-accent mt-2">{loading ? "…" : openCount}</p>
                  </div>
                  <div className="fv-inset-card text-center">
                    <p className="fv-caption text-[#74767E]">Hiển thị</p>
                    <p className="fv-stat-value mt-2">{jobs.length}</p>
                  </div>
                </div>
              </div>
              <hr className="fv-divider my-6" />
              <div className="flex flex-wrap items-center justify-between gap-4">
                
                {isClient ? (
                  <div className="shrink-0">
                    <JobPostCtaLink />
                  </div>
                ) : null}
              </div>
            </header>
          )}

          <section className="mt-8 md:mt-10" aria-labelledby="jobs-list-heading">
            <div className="flex flex-col gap-2 border-b border-[#E8E8E8] pb-5 sm:flex-row sm:items-end sm:justify-between">
              <h2 id="jobs-list-heading" className="fv-heading text-[#404145]">
                Danh sách công việc ({loading ? "…" : total})
              </h2>
              <p className="fv-caption max-w-md sm:text-right">Nhấp vào thẻ để xem đầy đủ mô tả, ảnh và thời hạn.</p>
            </div>

            {error ? (
              <div className="fv-error-banner fv-focus-ring mt-8 rounded-[8px]" role="alert">
                <p className="font-semibold text-[#D74C3B]">{error}</p>
                <button
                  type="button"
                  onClick={() => void fetchJobs(0, false)}
                  className="fv-btn-secondary fv-focus-ring mt-4"
                >
                  Thử lại
                </button>
              </div>
            ) : null}

            {loading ? (
              <ul className="mt-8 grid list-none gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8 2xl:grid-cols-4" aria-hidden>
                {Array.from({ length: 6 }).map((_, i) => (
                  <li key={i} className="animate-pulse rounded-[8px] border border-[#E8E8E8] bg-[#FFFFFF] p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)]">
                    <div className="mb-3 aspect-[16/9] rounded-[4px] bg-[#E8E8E8]" />
                    <div className="h-5 w-3/4 rounded bg-[#E8E8E8]" />
                    <div className="mt-3 h-4 w-1/2 rounded bg-[#F5F5F5]" />
                    <div className="mt-4 space-y-2">
                      <div className="h-3 rounded bg-[#F5F5F5]" />
                      <div className="h-3 rounded bg-[#F5F5F5]" />
                      <div className="h-3 w-5/6 rounded bg-[#F5F5F5]" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : jobs.length === 0 ? (
              <div className="fv-alert-card mt-10" role="status">
                <p className="fv-heading text-[#404145]">Chưa có việc làm nào đang mở</p>
                <p className="fv-body mt-3">
                  Khi khách hàng đăng tin mới, danh sách sẽ cập nhật tại đây. Quay lại sau hoặc đăng ký freelancer để sẵn sàng
                  nhận việc ngay khi có tin phù hợp.
                </p>
                <Link href="/" className="fv-btn-ghost fv-focus-ring mt-6 inline-flex w-full justify-center sm:w-auto">
                  Về trang chủ
                </Link>
              </div>
            ) : (
              <>
                <ul className="mt-8 grid list-none gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8 2xl:grid-cols-4">
                  {jobs.map((job) => {
                    const thumbs = parseJobImages(job.images);
                    const cover = thumbs[0] ? resolveJobImageUrl(thumbs[0], apiBaseUrl) : "";
                    const locLine = jobLocationSummary(job);
                    return (
                      <li key={job.id}>
                        <article className="flex h-full flex-col overflow-hidden rounded-[8px] border border-[#E8E8E8] bg-[#FFFFFF] shadow-[0px_1px_3px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-200 hover:shadow-[0px_2px_8px_rgba(0,0,0,0.12)]">
                          <Link
                            href={`/viec-lam/${job.id}`}
                            className={`group flex flex-1 flex-col px-4 pb-4 pt-4 outline-none transition-colors hover:bg-[rgba(245,245,245,0.5)] fv-focus-ring`}
                          >
                            {cover ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={cover}
                                alt=""
                                className="mb-3 aspect-[16/9] w-full rounded-[4px] object-cover ring-1 ring-[#E8E8E8] transition group-hover:ring-[#1DBF73]/35"
                                loading="lazy"
                              />
                            ) : (
                              <div className="fv-caption mb-3 flex aspect-[16/9] items-center justify-center rounded-[4px] border border-[#E8E8E8] bg-[#F5F5F5] px-2 text-center font-semibold uppercase tracking-wide text-[#74767E]">
                                Không có ảnh minh họa
                              </div>
                            )}
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="fv-heading line-clamp-2 text-[#404145] transition-colors group-hover:text-[#000000]">
                                {job.title}
                              </h3>
                              <span className={`shrink-0 normal-case ${statusBadgeClass(job.status)}`}>{statusLabel(job.status)}</span>
                            </div>
                            <p className="fv-caption mt-2">
                              Đăng {formatPostedAt(job.created_at)}
                              {job.client_name ? (
                                <>
                                  {" "}
                                  · <span className="font-semibold text-[#404145]">{job.client_name}</span>
                                </>
                              ) : (
                                " · Khách hàng"
                              )}
                            </p>
                            {locLine ? (
                              <p className="fv-caption mt-1.5 line-clamp-2 text-[#404145]" title={locLine}>
                                📍 {locLine}
                              </p>
                            ) : null}
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                              <p className="fv-body-sm font-bold text-[#1DBF73]">{formatBudget(job.budget)}</p>
                              <p className="fv-caption shrink-0 tabular-nums">
                                {job.due_at ? `Hạn: ${formatDueShort(job.due_at)}` : "Không có deadline"}
                              </p>
                            </div>
                            {job.description ? (
                              <p className="fv-body-sm mt-3 line-clamp-3 flex-1">{job.description}</p>
                            ) : (
                              <p className="fv-body-sm mt-3 flex-1 italic text-[#74767E]">Chưa có mô tả chi tiết.</p>
                            )}
                            <span className="fv-body-sm mt-4 font-bold text-[#1DBF73] underline-offset-2 transition group-hover:underline">
                              Xem chi tiết →
                            </span>
                          </Link>
                          <div className="border-t border-[#E8E8E8] px-4 pb-4 pt-4">
                            {!sessionKnown ? (
                              <div className="h-11 animate-pulse rounded-[8px] bg-[#F5F5F5]" aria-hidden />
                            ) : isFreelancer ? (
                              <>
                                {acceptErrors[job.id] ? (
                                  <p
                                    className="fv-caption mb-3 rounded-[4px] border border-[#D74C3B] bg-[rgba(215,76,59,0.1)] px-2 py-2 font-semibold text-[#D74C3B]"
                                    role="alert"
                                  >
                                    {acceptErrors[job.id]}
                                  </p>
                                ) : null}
                                <button
                                  type="button"
                                  disabled={acceptingJobId === job.id || !userId || job.client_id === userId}
                                  onClick={() => void acceptJob(job)}
                                  className="btn-31 fv-focus-ring w-full disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <span className="text-container">
                                    <span className="text">
                                      {acceptingJobId === job.id ? "Đang xử lý…" : "Nhận việc"}
                                    </span>
                                  </span>
                                </button>
                              </>
                            ) : isLoggedIn ? (
                              <Link href="/ho-so" className="btn-31 fv-focus-ring w-full">
                                <span className="text-container">
                                  <span className="text">Mở hồ sơ của tôi</span>
                                </span>
                              </Link>
                            ) : (
                              <Link href="/dang-nhap" className="fv-btn-primary fv-focus-ring w-full text-center">
                                Quan tâm — đăng nhập
                              </Link>
                            )}
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </ul>

                {hasMore ? (
                  <div className="mt-10 flex justify-center">
                    <button
                      type="button"
                      disabled={loadingMore}
                      onClick={() => void fetchJobs(offset + PAGE_SIZE, true)}
                      className="fv-btn-secondary fv-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingMore ? "Đang tải…" : `Xem thêm (${jobs.length}/${total})`}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
