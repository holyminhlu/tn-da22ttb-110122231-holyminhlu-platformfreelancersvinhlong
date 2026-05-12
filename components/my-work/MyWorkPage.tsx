"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import { authorizedFetch, clearVlcAuth, refreshAccessToken } from "@/lib/authSession";
import { apiPaths, apiUrl, getApiBaseUrl } from "@/config/api.config";

type WorkRole = "client" | "freelancer";

type ClientJobRow = {
  job_id: string;
  title: string;
  description: string | null;
  budget: number | string | null;
  job_status: string;
  job_created_at: string;
  job_updated_at: string | null;
  contract_id: string | null;
  contract_status: string | null;
  agreed_price: number | string | null;
  contract_start: string | null;
  contract_end: string | null;
  contract_created_at: string | null;
  progress_note: string | null;
  delivered_at: string | null;
  freelancer_id: string | null;
  freelancer_name: string | null;
  freelancer_email: string | null;
  review_id?: string | null;
  review_rating?: number | null;
  review_comment?: string | null;
  review_created_at?: string | null;
};

type FreelancerAssignmentRow = {
  contract_id: string;
  contract_status: string;
  agreed_price: number | string | null;
  contract_start: string | null;
  contract_end: string | null;
  contract_created_at: string;
  progress_note: string | null;
  delivered_at: string | null;
  job_id: string;
  title: string;
  description: string | null;
  budget: number | string | null;
  job_status: string;
  job_created_at: string;
  review_id?: string | null;
  review_rating?: number | null;
  review_comment?: string | null;
  review_created_at?: string | null;
  client_name: string | null;
  client_email: string | null;
};

type MyWorkResponse =
  | { role: "client"; jobs: ClientJobRow[] }
  | { role: "freelancer"; assignments: FreelancerAssignmentRow[] };

function formatMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "Thỏa thuận";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n) || n <= 0) return "Thỏa thuận";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);
}

function formatDt(iso: string | null | undefined) {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(dt);
}

function jobStatusVi(s: string | null | undefined) {
  const k = String(s || "").toLowerCase();
  if (k === "open") return "Đang tuyển";
  if (k === "in_progress") return "Đang thực hiện";
  if (k === "closed") return "Đã đóng";
  if (k === "cancelled") return "Đã hủy";
  return s || "—";
}

function contractStatusVi(s: string | null | undefined) {
  const k = String(s || "").toLowerCase();
  if (k === "pending") return "Chờ xử lý";
  if (k === "active") return "Đang làm";
  if (k === "completed") return "Đã bàn giao";
  if (k === "cancelled") return "Đã hủy";
  if (k === "disputed") return "Tranh chấp";
  return s || "—";
}

/** Badge styles chỉ dùng palette Fiverr (xanh / neutral / lỗi). */
function jobStatusBadgeClass(s: string | null | undefined) {
  const k = String(s || "").toLowerCase();
  if (k === "open" || k === "in_progress") return "fv-badge-success";
  if (k === "cancelled") return "fv-badge-error";
  return "fv-badge-neutral";
}

function contractStatusBadgeClass(s: string | null | undefined) {
  const k = String(s || "").toLowerCase();
  if (k === "active" || k === "completed") return "fv-badge-success";
  if (k === "cancelled" || k === "disputed") return "fv-badge-error";
  return "fv-badge-neutral";
}

function initialsFromName(name: string | null | undefined) {
  const p = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (p.length >= 2) return `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase();
  if (p.length === 1 && p[0].length >= 2) return p[0].slice(0, 2).toUpperCase();
  return "?";
}

function SvgBoard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 6h13M8 12h13M8 18h13M4 6h.01M4 12h.01M4 18h.01"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SvgSpark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v2.5m0 13V21M5.64 5.64l1.77 1.77m9.18 9.18 1.77 1.77M3 12h2.5m13 0H21M5.64 18.36l1.77-1.77m9.18-9.18 1.77-1.77"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function SvgRows({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function SvgGridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="5" width="6" height="6" rx="1.25" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13" y="5" width="6" height="6" rx="1.25" stroke="currentColor" strokeWidth="1.75" />
      <rect x="5" y="13" width="6" height="6" rx="1.25" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13" y="13" width="6" height="6" rx="1.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

type WorkFilter = "all" | "active" | "done";
type LayoutMode = "list" | "grid";

/** Client: đang làm = tin đang tuyển hoặc đang thực hiện; đã xong = đã đóng / đã hủy */
function clientJobMatchesFilter(row: ClientJobRow, filter: WorkFilter): boolean {
  if (filter === "all") return true;
  const js = String(row.job_status || "").toLowerCase();
  const isDone = js === "closed" || js === "cancelled";
  const isActive = js === "open" || js === "in_progress";
  if (filter === "done") return isDone;
  return isActive;
}

/** Freelancer: đang làm = hợp đồng chưa kết thúc; đã xong = đã bàn giao / đã hủy */
function freelancerAssignmentMatchesFilter(row: FreelancerAssignmentRow, filter: WorkFilter): boolean {
  if (filter === "all") return true;
  const cs = String(row.contract_status || "").toLowerCase();
  const isDone = cs === "completed" || cs === "cancelled";
  const isActive = cs === "pending" || cs === "active" || cs === "disputed";
  if (filter === "done") return isDone;
  return isActive;
}

export default function MyWorkPage() {
  const router = useRouter();
  const apiBaseUrl = getApiBaseUrl();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState<WorkRole | null>(null);
  const [clientJobs, setClientJobs] = useState<ClientJobRow[]>([]);
  const [assignments, setAssignments] = useState<FreelancerAssignmentRow[]>([]);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [workFilter, setWorkFilter] = useState<WorkFilter>("all");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("list");
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { rating: number; comment: string }>>({});
  const [openReviewFor, setOpenReviewFor] = useState<string | null>(null);
  const [reviewSavingId, setReviewSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    let token = window.localStorage.getItem("vlc_access_token");
    if (!token) {
      token = await refreshAccessToken(apiBaseUrl);
    }
    if (!token) {
      router.replace(`/dang-nhap?next=${encodeURIComponent("/cong-viec-cua-toi")}`);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await authorizedFetch(apiUrl(apiPaths.auth.meMyWork, apiBaseUrl), {}, apiBaseUrl);
      const payload = (await res.json()) as MyWorkResponse & { message?: string };

      if (res.status === 401) {
        clearVlcAuth();
        router.replace(`/dang-nhap?next=${encodeURIComponent("/cong-viec-cua-toi")}`);
        return;
      }

      if (!res.ok) {
        setError(payload.message || "Không thể tải dữ liệu.");
        setRole(null);
        return;
      }

      if (payload.role === "client") {
        setRole("client");
        setClientJobs(payload.jobs || []);
        setAssignments([]);
      } else {
        setRole("freelancer");
        const rows = payload.assignments || [];
        setAssignments(rows);
        setClientJobs([]);
        const drafts: Record<string, string> = {};
        for (const a of rows) {
          drafts[a.contract_id] = a.progress_note ?? "";
        }
        setDraftNotes(drafts);
      }
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setWorkFilter("all");
  }, [role]);

  const filteredClientJobs = useMemo(() => {
    if (role !== "client") return [];
    return clientJobs.filter((row) => clientJobMatchesFilter(row, workFilter));
  }, [role, clientJobs, workFilter]);

  const filteredAssignments = useMemo(() => {
    if (role !== "freelancer") return [];
    return assignments.filter((row) => freelancerAssignmentMatchesFilter(row, workFilter));
  }, [role, assignments, workFilter]);

  const clientFilterCounts = useMemo(() => {
    if (role !== "client") return null;
    return {
      all: clientJobs.length,
      active: clientJobs.filter((r) => clientJobMatchesFilter(r, "active")).length,
      done: clientJobs.filter((r) => clientJobMatchesFilter(r, "done")).length,
    };
  }, [role, clientJobs]);

  const freelancerFilterCounts = useMemo(() => {
    if (role !== "freelancer") return null;
    return {
      all: assignments.length,
      active: assignments.filter((r) => freelancerAssignmentMatchesFilter(r, "active")).length,
      done: assignments.filter((r) => freelancerAssignmentMatchesFilter(r, "done")).length,
    };
  }, [role, assignments]);

  const clientStats = useMemo(() => {
    if (role !== "client") return null;
    const total = clientJobs.length;
    const recruiting = clientJobs.filter((j) => String(j.job_status).toLowerCase() === "open").length;
    const withTalent = clientJobs.filter((j) => Boolean(j.contract_id)).length;
    return { total, recruiting, withTalent };
  }, [role, clientJobs]);

  const freelancerStats = useMemo(() => {
    if (role !== "freelancer") return null;
    const total = assignments.length;
    const active = assignments.filter((a) => {
      const k = String(a.contract_status || "").toLowerCase();
      return k === "active" || k === "pending";
    }).length;
    const done = assignments.filter((a) => String(a.contract_status || "").toLowerCase() === "completed").length;
    return { total, active, done };
  }, [role, assignments]);

  async function saveProgress(contractId: string) {
    setSavingId(contractId);
    setError("");
    try {
      const res = await authorizedFetch(
        apiUrl(apiPaths.auth.meContract(contractId), apiBaseUrl),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ progressNote: draftNotes[contractId] ?? "" }),
        },
        apiBaseUrl,
      );
      const payload = (await res.json()) as { message?: string };
      if (res.status === 401) {
        clearVlcAuth();
        router.replace(`/dang-nhap?next=${encodeURIComponent("/cong-viec-cua-toi")}`);
        return;
      }
      if (!res.ok) {
        setError(payload.message || "Không thể lưu tiến độ.");
        return;
      }
      window.dispatchEvent(new Event("vlc-user-updated"));
      await load();
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setSavingId(null);
    }
  }

  async function markDelivered(contractId: string) {
    if (!window.confirm("Xác nhận đã bàn giao? Công việc sẽ chuyển sang đã đóng và hợp đồng sang hoàn thành.")) {
      return;
    }
    setSavingId(contractId);
    setError("");
    try {
      const res = await authorizedFetch(
        apiUrl(apiPaths.auth.meContract(contractId), apiBaseUrl),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            progressNote: draftNotes[contractId] ?? "",
            markDelivered: true,
          }),
        },
        apiBaseUrl,
      );
      const payload = (await res.json()) as { message?: string };
      if (res.status === 401) {
        clearVlcAuth();
        router.replace(`/dang-nhap?next=${encodeURIComponent("/cong-viec-cua-toi")}`);
        return;
      }
      if (!res.ok) {
        setError(payload.message || "Không thể ghi nhận bàn giao.");
        return;
      }
      window.dispatchEvent(new Event("vlc-user-updated"));
      await load();
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setSavingId(null);
    }
  }

  async function submitReview(row: ClientJobRow) {
    if (!row.contract_id) return;
    const draft = reviewDrafts[row.contract_id] || { rating: 5, comment: "" };
    if (!Number.isInteger(draft.rating) || draft.rating < 1 || draft.rating > 5) {
      setError("Vui lòng chọn số sao từ 1 đến 5.");
      return;
    }
    setReviewSavingId(row.contract_id);
    setError("");
    try {
      const res = await authorizedFetch(
        apiUrl(apiPaths.auth.meContractReview(row.contract_id), apiBaseUrl),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rating: draft.rating,
            comment: draft.comment.trim(),
          }),
        },
        apiBaseUrl,
      );
      const payload = (await res.json()) as { message?: string };
      if (res.status === 401) {
        clearVlcAuth();
        router.replace(`/dang-nhap?next=${encodeURIComponent("/cong-viec-cua-toi")}`);
        return;
      }
      if (!res.ok) {
        setError(payload.message || "Không thể lưu đánh giá.");
        return;
      }
      setOpenReviewFor(null);
      await load();
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setReviewSavingId(null);
    }
  }

  return (
    <>
      <Header />
      <main id="main-content" className="fv-profile-shell fv-shell-lg-pill-btns min-h-screen pb-24 pt-3 sm:pt-5">
        <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
          <nav aria-label="Điều hướng phụ" className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-[#E8E8E8] pb-2">
            <Link href="/" className="fv-nav-link fv-focus-ring inline-flex min-h-9 items-center gap-2 rounded-sm px-0 py-1">
              <span aria-hidden>←</span>
              Trang chủ
            </Link>
            <Link href="/viec-lam" className="fv-nav-link fv-focus-ring inline-flex min-h-9 items-center rounded-sm px-0 py-1">
              Việc làm
            </Link>
          </nav>

          <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-8 xl:gap-10">
            <div className="min-w-0 space-y-8">
              <header className="fv-card">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#E8E8E8] bg-[#F5F5F5] text-[#404145] shadow-[0px_1px_3px_rgba(0,0,0,0.08)]">
                      <SvgBoard className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="fv-label-caps text-[#74767E]">
                        {role === "client" ? "Khách hàng" : role === "freelancer" ? "Freelancer" : "Workspace"}
                      </p>
                      <h1 className="fv-display mt-2">Công việc của tôi</h1>
                      <p className="fv-body mt-3 max-w-2xl">
                        {role === "client"
                          ? "Theo dõi tin đã đăng, người nhận việc và cập nhật tiến độ / bàn giao từ freelancer."
                          : role === "freelancer"
                            ? "Việc đã nhận từ bảng tin — ghi chú tiến độ và xác nhận khi hoàn tất bàn giao."
                            : "Đăng nhập bằng tài khoản Client hoặc Freelancer để xem không gian làm việc riêng."}
                      </p>
                    </div>
                  </div>
                  {!loading && role ? (
                    <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch">
                      <span className="fv-badge-neutral text-center">
                        {role === "client" ? "Quản lý tin đăng" : "Thực hiện & bàn giao"}
                      </span>
                      <Link
                        href={role === "client" ? "/viec-lam/dang-tin" : "/viec-lam"}
                        className="fv-btn-primary fv-focus-ring inline-flex justify-center text-center sm:w-auto"
                      >
                        {role === "client" ? "+ Đăng tin mới" : "Mở bảng tin"}
                      </Link>
                    </div>
                  ) : null}
                </div>

                {!loading && role === "client" && clientStats ? (
                  <div className="fv-divider mt-6" />
                ) : null}
                {!loading && role === "client" && clientStats ? (
                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    <div className="fv-inset-card">
                      <p className="fv-label-caps text-[#74767E]">Tổng tin</p>
                      <p className="fv-stat-value mt-2">{clientStats.total}</p>
                    </div>
                    <div className="fv-inset-card border-[#1DBF73] bg-[rgba(29,191,115,0.06)]">
                      <p className="fv-label-caps text-[#74767E]">Đang tuyển</p>
                      <p className="fv-stat-value fv-stat-value-accent mt-2">{clientStats.recruiting}</p>
                    </div>
                    <div className="fv-inset-card">
                      <p className="fv-label-caps text-[#74767E]">Có freelancer</p>
                      <p className="fv-stat-value mt-2">{clientStats.withTalent}</p>
                    </div>
                  </div>
                ) : null}

                {!loading && role === "freelancer" && freelancerStats ? (
                  <div className="fv-divider mt-6" />
                ) : null}
                {!loading && role === "freelancer" && freelancerStats ? (
                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    <div className="fv-inset-card">
                      <p className="fv-label-caps text-[#74767E]">Đã nhận</p>
                      <p className="fv-stat-value mt-2">{freelancerStats.total}</p>
                    </div>
                    <div className="fv-inset-card border-[#1DBF73] bg-[rgba(29,191,115,0.06)]">
                      <p className="fv-label-caps text-[#74767E]">Đang làm</p>
                      <p className="fv-stat-value fv-stat-value-accent mt-2">{freelancerStats.active}</p>
                    </div>
                    <div className="fv-inset-card">
                      <p className="fv-label-caps text-[#74767E]">Hoàn thành</p>
                      <p className="fv-stat-value mt-2">{freelancerStats.done}</p>
                    </div>
                  </div>
                ) : null}
              </header>

              {error ? (
                <div className="fv-error-banner flex gap-3" role="alert">
                  <span className="mt-0.5 shrink-0 text-[#D74C3B]" aria-hidden>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
                      <path d="M12 8v5m0 3h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#404145]">Đã xảy ra lỗi</p>
                    <p className="fv-body-sm mt-2 text-[#74767E]">{error}</p>
                    <button type="button" onClick={() => void load()} className="fv-btn-ghost fv-focus-ring mt-4">
                      Thử lại
                    </button>
                  </div>
                </div>
              ) : null}

              {!loading &&
              role &&
              ((role === "client" && clientJobs.length > 0) || (role === "freelancer" && assignments.length > 0)) ? (
                <div className="fv-card flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div role="group" aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-2">
                    {(
                      [
                        { key: "all" as const, label: "Tất cả" },
                        { key: "active" as const, label: "Đang làm" },
                        { key: "done" as const, label: "Đã xong" },
                      ] as const
                    ).map(({ key, label }) => {
                      const counts = role === "client" ? clientFilterCounts : freelancerFilterCounts;
                      const n = counts?.[key] ?? 0;
                      const isOn = workFilter === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setWorkFilter(key)}
                          aria-pressed={isOn}
                          className={`fv-focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-3 py-2 transition ${
                            isOn
                              ? "border-[#1DBF73] bg-[rgba(29,191,115,0.06)] text-[#404145]"
                              : "border-[#E8E8E8] bg-[#FFFFFF] text-[#74767E] hover:border-[#D3D3D3]"
                          }`}
                        >
                          <span className="fv-body-sm font-bold">{label}</span>
                          <span className={`fv-caption rounded px-2 py-0.5 font-bold tabular-nums ${isOn ? "fv-badge-success" : "fv-badge-neutral"}`}>
                            {n}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="hidden flex-wrap items-center gap-2 lg:flex" role="group" aria-label="Kiểu hiển thị">
                    <span className="fv-label-caps pr-2 text-[#74767E]">Bố cục</span>
                    <button
                      type="button"
                      onClick={() => setLayoutMode("list")}
                      aria-pressed={layoutMode === "list"}
                      title="Một cột"
                      className={`fv-focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-3 py-2 ${
                        layoutMode === "list"
                          ? "border-[#1DBF73] bg-[rgba(29,191,115,0.06)] text-[#404145]"
                          : "border-[#E8E8E8] bg-[#FFFFFF] text-[#74767E] hover:border-[#D3D3D3]"
                      }`}
                    >
                      <SvgRows className="h-4 w-4 shrink-0" />
                      <span className="fv-body-sm font-bold">Danh sách</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLayoutMode("grid")}
                      aria-pressed={layoutMode === "grid"}
                      title="Hai cột (desktop)"
                      className={`fv-focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-3 py-2 ${
                        layoutMode === "grid"
                          ? "border-[#1DBF73] bg-[rgba(29,191,115,0.06)] text-[#404145]"
                          : "border-[#E8E8E8] bg-[#FFFFFF] text-[#74767E] hover:border-[#D3D3D3]"
                      }`}
                    >
                      <SvgGridIcon className="h-4 w-4 shrink-0" />
                      <span className="fv-body-sm font-bold">Lưới 2 cột</span>
                    </button>
                  </div>
                </div>
              ) : null}

              {loading ? (
                <div className="space-y-6" aria-busy aria-label="Đang tải danh sách">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="fv-card animate-pulse">
                      <div className="flex gap-4">
                        <div className="h-14 w-14 shrink-0 rounded-lg bg-[#E8E8E8]" />
                        <div className="flex-1 space-y-3 pt-1">
                          <div className="h-5 w-3/5 rounded bg-[#E8E8E8]" />
                          <div className="h-4 w-2/5 rounded bg-[#F5F5F5]" />
                          <div className="h-20 rounded-lg bg-[#F5F5F5]" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : role === "client" ? (
                <section className={layoutMode === "grid" ? "grid gap-6 lg:grid-cols-2" : "space-y-6"}>
                  {clientJobs.length === 0 ? (
                    <div className="fv-card border-dashed py-16 text-center lg:col-span-2">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg border border-[#E8E8E8] bg-[#F5F5F5] text-[#404145]">
                        <SvgBoard className="h-8 w-8" />
                      </div>
                      <p className="fv-body mx-auto mt-6 max-w-md">
                        Bạn chưa có tin nào. Đăng tin để freelancer trên nền tảng có thể xem và nhận việc.
                      </p>
                      <Link href="/viec-lam/dang-tin" className="fv-btn-primary fv-focus-ring mt-8 inline-flex justify-center">
                        Đăng tin đầu tiên
                      </Link>
                    </div>
                  ) : filteredClientJobs.length === 0 ? (
                    <div className="fv-alert-card py-12 text-center lg:col-span-2">
                      <p className="fv-body-sm font-semibold text-[#404145]">
                        Không có tin nào khớp bộ lọc{" "}
                        <strong>{workFilter === "active" ? "Đang làm" : "Đã xong"}</strong>.
                      </p>
                      <p className="fv-caption mx-auto mt-2 max-w-md">
                        Chọn &quot;Tất cả&quot; để xem lại toàn bộ tin đã đăng.
                      </p>
                      <button type="button" onClick={() => setWorkFilter("all")} className="fv-btn-primary fv-focus-ring mt-6">
                        Xem tất cả ({clientJobs.length})
                      </button>
                    </div>
                  ) : (
                    filteredClientJobs.map((row) => (
                      <article
                        key={row.job_id}
                        className={`fv-card relative overflow-hidden pl-[18px] before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[#1DBF73] before:content-[''] ${
                          layoutMode === "grid" ? "flex h-full min-h-0 flex-col lg:min-h-[280px]" : ""
                        }`}
                      >
                        <div className={`relative flex flex-1 flex-col ${layoutMode === "grid" ? "min-h-0" : ""}`}>
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <h2
                                className={`fv-heading text-[#000000] ${layoutMode === "grid" ? "text-[16px] lg:line-clamp-2 lg:leading-6" : ""}`}
                              >
                                {row.title}
                              </h2>
                              <p className="fv-caption mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span>Đăng {formatDt(row.job_created_at)}</span>
                                <span className="hidden sm:inline">·</span>
                                <span>Cập nhật {formatDt(row.job_updated_at || row.job_created_at)}</span>
                              </p>
                            </div>
                            <span className={`shrink-0 ${jobStatusBadgeClass(row.job_status)}`}>{jobStatusVi(row.job_status)}</span>
                          </div>

                          {row.description ? (
                            <p className={`fv-body-sm mt-4 ${layoutMode === "grid" ? "line-clamp-4" : ""}`}>{row.description}</p>
                          ) : null}

                          <div className="fv-inset-card mt-4 inline-flex flex-wrap items-center gap-2 bg-[rgba(29,191,115,0.06)]">
                            <span className="fv-label-caps text-[#1DBF73]">Ngân sách</span>
                            <span className="fv-body-sm font-bold text-[#404145]">{formatMoney(row.budget)}</span>
                          </div>

                          <div className={`fv-inset-card bg-[#FAFAFA] ${layoutMode === "grid" ? "mt-auto" : "mt-6"}`}>
                            <h3 className="fv-heading flex items-center gap-2">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1DBF73]" aria-hidden />
                              Người nhận việc &amp; tiến độ
                            </h3>
                            {!row.contract_id ? (
                              <p className="fv-body-sm mt-4">
                                Chưa có freelancer nhận việc — tin vẫn hiển thị cho đến khi có người nhận.
                              </p>
                            ) : (
                              <div className="mt-4 space-y-4">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                  <div className="fv-inset-card flex shrink-0 items-center gap-3 bg-[#FFFFFF]">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E8E8E8] bg-[#F5F5F5] text-sm font-bold text-[#404145]">
                                      {initialsFromName(row.freelancer_name)}
                                    </span>
                                    <div>
                                      <p className="fv-label-caps text-[#74767E]">Freelancer</p>
                                      <p className="fv-body-sm mt-1 font-semibold text-[#404145]">{row.freelancer_name || "—"}</p>
                                      {row.freelancer_email ? (
                                        <p className="mt-0.5 font-mono text-[12.8px] leading-6 text-[#74767E]">
                                          {row.freelancer_email}
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className="min-w-0 flex-1 space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                      <span className={contractStatusBadgeClass(row.contract_status)}>
                                        Hợp đồng: {contractStatusVi(row.contract_status)}
                                      </span>
                                      <span className="fv-badge-neutral">Giá: {formatMoney(row.agreed_price)}</span>
                                      <span className="fv-caption rounded border border-[#E8E8E8] bg-[#FFFFFF] px-2 py-1 font-semibold text-[#404145]">
                                        Nhận việc {formatDt(row.contract_created_at)}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="fv-label-caps text-[#74767E]">Ghi chú tiến độ</p>
                                      <div className="fv-inset-card fv-body-sm mt-2 whitespace-pre-wrap bg-[#FFFFFF] text-[#404145]">
                                        {row.progress_note?.trim() ? row.progress_note : "—"}
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                      <span
                                        className={`fv-body-sm font-semibold ${row.delivered_at ? "text-[#1DBF73]" : "text-[#74767E]"}`}
                                      >
                                        Bàn giao: {row.delivered_at ? formatDt(row.delivered_at) : "Chưa"}
                                      </span>
                                    </div>
                                    {row.contract_id &&
                                    (String(row.contract_status || "").toLowerCase() === "completed" || Boolean(row.delivered_at)) ? (
                                      <div className="fv-inset-card bg-[#FFFFFF]">
                                        {row.review_id ? (
                                          <div className="space-y-2">
                                            <p className="fv-label-caps text-[#1DBF73]">Đã đánh giá freelancer</p>
                                            <p className="fv-body-sm font-semibold text-[#404145]">
                                              {"★".repeat(Math.max(0, Math.min(5, Number(row.review_rating || 0))))}
                                              {"☆".repeat(Math.max(0, 5 - Math.max(0, Math.min(5, Number(row.review_rating || 0)))))}
                                              <span className="fv-caption ml-2">({row.review_rating || 0}/5)</span>
                                            </p>
                                            {row.review_comment ? (
                                              <p className="fv-body-sm whitespace-pre-wrap">{row.review_comment}</p>
                                            ) : (
                                              <p className="fv-body-sm italic text-[#74767E]">Không có nhận xét thêm.</p>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="space-y-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <p className="fv-label-caps text-[#74767E]">Đánh giá freelancer</p>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setOpenReviewFor((prev) => (prev === row.contract_id ? null : row.contract_id || null));
                                                  setReviewDrafts((prev) => ({
                                                    ...prev,
                                                    [row.contract_id as string]: prev[row.contract_id as string] || { rating: 5, comment: "" },
                                                  }));
                                                }}
                                                className="fv-btn-secondary fv-focus-ring px-3 py-2"
                                              >
                                                {openReviewFor === row.contract_id ? "Ẩn form" : "Đánh giá ngay"}
                                              </button>
                                            </div>
                                            {openReviewFor === row.contract_id ? (
                                              <div className="fv-inset-card mt-2 space-y-3 bg-[#FAFAFA]">
                                                <label className="fv-label-caps block text-[#74767E]" htmlFor={`rating-${row.contract_id}`}>
                                                  Số sao
                                                </label>
                                                <select
                                                  id={`rating-${row.contract_id}`}
                                                  value={reviewDrafts[row.contract_id]?.rating ?? 5}
                                                  onChange={(e) =>
                                                    setReviewDrafts((prev) => ({
                                                      ...prev,
                                                      [row.contract_id as string]: {
                                                        rating: Number(e.target.value),
                                                        comment: prev[row.contract_id as string]?.comment ?? "",
                                                      },
                                                    }))
                                                  }
                                                  className="fv-input"
                                                >
                                                  <option value={5}>5 sao - Rất tốt</option>
                                                  <option value={4}>4 sao - Tốt</option>
                                                  <option value={3}>3 sao - Ổn</option>
                                                  <option value={2}>2 sao - Cần cải thiện</option>
                                                  <option value={1}>1 sao - Không hài lòng</option>
                                                </select>
                                                <label className="fv-label-caps block text-[#74767E]" htmlFor={`comment-${row.contract_id}`}>
                                                  Nhận xét
                                                </label>
                                                <textarea
                                                  id={`comment-${row.contract_id}`}
                                                  rows={3}
                                                  value={reviewDrafts[row.contract_id]?.comment ?? ""}
                                                  onChange={(e) =>
                                                    setReviewDrafts((prev) => ({
                                                      ...prev,
                                                      [row.contract_id as string]: {
                                                        rating: prev[row.contract_id as string]?.rating ?? 5,
                                                        comment: e.target.value,
                                                      },
                                                    }))
                                                  }
                                                  placeholder="Ví dụ: Phản hồi nhanh, đúng deadline, chất lượng tốt."
                                                  className="fv-input resize-y"
                                                />
                                                <button
                                                  type="button"
                                                  disabled={reviewSavingId === row.contract_id}
                                                  onClick={() => void submitReview(row)}
                                                  className="fv-btn-primary fv-focus-ring disabled:cursor-not-allowed"
                                                >
                                                  {reviewSavingId === row.contract_id ? "Đang lưu..." : "Lưu đánh giá"}
                                                </button>
                                              </div>
                                            ) : null}
                                          </div>
                                        )}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </section>
              ) : role === "freelancer" ? (
                <section className={layoutMode === "grid" ? "grid gap-6 lg:grid-cols-2" : "space-y-6"}>
                  {assignments.length === 0 ? (
                    <div className="fv-card border-dashed py-16 text-center lg:col-span-2">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg border border-[#E8E8E8] bg-[#F5F5F5] text-[#1DBF73]">
                        <SvgSpark className="h-8 w-8" />
                      </div>
                      <p className="fv-body mx-auto mt-6 max-w-md">
                        Bạn chưa nhận việc nào từ bảng tin. Hãy mở trang Việc làm và nhấn Nhận việc trên tin phù hợp.
                      </p>
                      <Link href="/viec-lam" className="fv-btn-primary fv-focus-ring mt-8 inline-flex justify-center">
                        Đi tới bảng tin
                      </Link>
                    </div>
                  ) : filteredAssignments.length === 0 ? (
                    <div className="fv-alert-card py-12 text-center lg:col-span-2">
                      <p className="fv-body-sm font-semibold text-[#404145]">
                        Không có việc nào khớp bộ lọc{" "}
                        <strong>{workFilter === "active" ? "Đang làm" : "Đã xong"}</strong>.
                      </p>
                      <p className="fv-caption mx-auto mt-2 max-w-md">
                        Chọn &quot;Tất cả&quot; để xem lại toàn bộ việc đã nhận.
                      </p>
                      <button type="button" onClick={() => setWorkFilter("all")} className="fv-btn-primary fv-focus-ring mt-6">
                        Xem tất cả ({assignments.length})
                      </button>
                    </div>
                  ) : (
                    filteredAssignments.map((row) => {
                      const busy = savingId === row.contract_id;
                      const completed = String(row.contract_status || "").toLowerCase() === "completed";
                      const gridCard = layoutMode === "grid";
                      return (
                        <article
                          key={row.contract_id}
                          className={`fv-card relative overflow-hidden pl-[18px] before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[#1DBF73] before:content-[''] ${
                            gridCard ? "flex h-full min-h-0 flex-col lg:min-h-[320px]" : ""
                          }`}
                        >
                          <div className="relative flex flex-1 flex-col">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <h2 className={`fv-heading text-[#000000] ${gridCard ? "lg:line-clamp-2" : ""}`}>{row.title}</h2>
                                <div className="mt-4">
                                  <div className="fv-inset-card inline-flex max-w-full items-center gap-3 bg-[#FFFFFF]">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E8E8E8] bg-[#F5F5F5] text-[12.8px] font-bold text-[#404145]">
                                      {initialsFromName(row.client_name)}
                                    </span>
                                    <div>
                                      <p className="fv-label-caps text-[#74767E]">Khách hàng</p>
                                      <p className="fv-body-sm mt-1 font-semibold text-[#404145]">{row.client_name || "—"}</p>
                                      {row.client_email ? (
                                        <p className="mt-0.5 font-mono text-[12.8px] leading-6 text-[#74767E]">
                                          {row.client_email}
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex shrink-0 flex-wrap gap-2">
                                <span className={jobStatusBadgeClass(row.job_status)}>Tin: {jobStatusVi(row.job_status)}</span>
                                <span className={contractStatusBadgeClass(row.contract_status)}>
                                  {contractStatusVi(row.contract_status)}
                                </span>
                              </div>
                            </div>

                            {row.description ? (
                              <p className={`fv-body-sm mt-4 ${gridCard ? "line-clamp-3" : ""}`}>{row.description}</p>
                            ) : null}

                            <div className="mt-4 flex flex-wrap gap-2">
                              <span className="fv-inset-card fv-body-sm font-bold text-[#404145] bg-[rgba(29,191,115,0.06)]">
                                Gợi ý: {formatMoney(row.budget)}
                              </span>
                              <span className="fv-inset-card fv-body-sm inline-flex font-bold text-[#404145]">
                                Đồng ý: {formatMoney(row.agreed_price)}
                              </span>
                            </div>

                            <div className={`fv-inset-card mt-6 bg-[#FAFAFA] ${gridCard ? "mt-auto" : ""}`}>
                              <label htmlFor={`note-${row.contract_id}`} className="fv-heading">
                                Tiến độ &amp; mô tả bàn giao
                              </label>
                              <p className="fv-caption mt-2">
                                Mô tả ngắn gọn giúp khách nắm tình hình — có thể chỉnh trước khi bàn giao cuối.
                              </p>
                              <textarea
                                id={`note-${row.contract_id}`}
                                rows={gridCard ? 4 : 5}
                                disabled={busy || completed}
                                value={draftNotes[row.contract_id] ?? ""}
                                onChange={(e) =>
                                  setDraftNotes((prev) => ({
                                    ...prev,
                                    [row.contract_id]: e.target.value,
                                  }))
                                }
                                placeholder="Ví dụ: Đã gửi bản nháp 1; dự kiến hoàn thiện vào…"
                                className="fv-input mt-4 resize-y disabled:cursor-not-allowed"
                              />
                              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                                <button
                                  type="button"
                                  disabled={busy || completed}
                                  onClick={() => void saveProgress(row.contract_id)}
                                  className="fv-btn-primary fv-focus-ring inline-flex min-h-[44px] justify-center disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {busy ? (
                                    <span className="flex items-center gap-2">
                                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                                      Đang lưu…
                                    </span>
                                  ) : (
                                    "Lưu tiến độ"
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy || completed}
                                  onClick={() => void markDelivered(row.contract_id)}
                                  className="fv-btn-secondary fv-focus-ring inline-flex min-h-[44px] justify-center disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Đánh dấu đã bàn giao
                                </button>
                                {row.delivered_at ? (
                                  <span className="fv-caption font-semibold text-[#1DBF73] sm:ml-auto">
                                    Đã bàn giao: {formatDt(row.delivered_at)}
                                  </span>
                                ) : null}
                              </div>
                              {row.review_id ? (
                                <div className="fv-inset-card mt-4 border-[#1DBF73] bg-[rgba(29,191,115,0.06)]">
                                  <p className="fv-label-caps text-[#1DBF73]">Đánh giá từ khách hàng</p>
                                  <p className="fv-body-sm mt-2 font-semibold text-[#404145]">
                                    {"★".repeat(Math.max(0, Math.min(5, Number(row.review_rating || 0))))}
                                    {"☆".repeat(Math.max(0, 5 - Math.max(0, Math.min(5, Number(row.review_rating || 0)))))}
                                    <span className="fv-caption ml-2">({row.review_rating || 0}/5)</span>
                                  </p>
                                  {row.review_comment ? (
                                    <p className="fv-body-sm mt-2 whitespace-pre-wrap">{row.review_comment}</p>
                                  ) : (
                                    <p className="fv-body-sm mt-2 italic text-[#74767E]">Khách hàng không để lại nhận xét.</p>
                                  )}
                                  {row.review_created_at ? (
                                    <p className="fv-caption mt-2">Đánh giá lúc: {formatDt(row.review_created_at)}</p>
                                  ) : null}
                                </div>
                              ) : completed ? (
                                <p className="fv-caption mt-4 text-[#74767E]">Chờ khách hàng đánh giá cho hợp đồng này.</p>
                              ) : null}
                              {completed ? (
                                <p className="fv-caption mt-3 text-[#74767E]">
                                  Hợp đồng đã hoàn thành — bạn chỉ có thể xem lại ghi chú.
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </section>
              ) : null}
            </div>

            <aside className="mt-10 lg:mt-0">
              <div className="sticky top-24 space-y-6">
                <div className="fv-alert-card">
                  <div className="flex items-center gap-2">
                    <SvgSpark className="h-5 w-5 shrink-0 text-[#1DBF73]" aria-hidden />
                    <h3 className="fv-heading">Mẹo nhanh</h3>
                  </div>
                  <ul className="fv-body-sm mt-4 space-y-3">
                    {role === "client" ? (
                      <>
                        <li className="flex gap-3">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1DBF73]" aria-hidden />
                          Theo dõi ghi chú tiến độ để chủ động trao đổi với freelancer.
                        </li>
                        <li className="flex gap-3">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1DBF73]" aria-hidden />
                          Khi freelancer bàn giao, tin chuyển sang đã đóng trên hệ thống.
                        </li>
                        <li className="flex gap-3">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1DBF73]" aria-hidden />
                          Dùng lọc Đang làm / Đã xong; trên màn hình lớn có thể bật lưới 2 cột.
                        </li>
                      </>
                    ) : role === "freelancer" ? (
                      <>
                        <li className="flex gap-3">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1DBF73]" aria-hidden />
                          Cập nhật tiến độ thường xuyên giúp khách yên tâm.
                        </li>
                        <li className="flex gap-3">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1DBF73]" aria-hidden />
                          Chỉ nhấn Đánh dấu đã bàn giao khi bạn thực sự hoàn tất — thao tác này khóa luồng.
                        </li>
                        <li className="flex gap-3">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1DBF73]" aria-hidden />
                          Lọc việc Đang làm hoặc Đã xong; chế độ lưới 2 cột thuận tiện trên desktop.
                        </li>
                      </>
                    ) : (
                      <li className="fv-body-sm">Đăng nhập để xem gợi ý phù hợp vai trò của bạn.</li>
                    )}
                  </ul>
                </div>

                <div className="fv-card">
                  <p className="fv-label-caps text-[#74767E]">Liên kết</p>
                  <div className="mt-4 flex flex-col gap-2">
                    <Link href="/ho-so" className="fv-nav-link fv-focus-ring inline-block min-h-[44px] rounded-sm py-2 font-semibold">
                      Hồ sơ người dùng
                    </Link>
                    <Link href="/viec-lam" className="fv-nav-link fv-focus-ring inline-block min-h-[44px] rounded-sm py-2 font-semibold">
                      Việc làm
                    </Link>
                    {role === "client" ? (
                      <Link
                        href="/viec-lam/dang-tin"
                        className="fv-nav-link fv-focus-ring inline-block min-h-[44px] rounded-sm py-2 font-semibold"
                      >
                        Đăng tải công việc
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
