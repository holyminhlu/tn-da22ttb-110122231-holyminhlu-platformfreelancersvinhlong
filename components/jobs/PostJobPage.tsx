"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import { authorizedFetch, clearVlcAuth, refreshAccessToken } from "@/lib/authSession";
import { apiPaths, apiUrl, getApiBaseUrl } from "@/config/api.config";

type StoredUser = { role?: string };

function SvgBriefcase({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1M5 9h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 10h14v3H5v-3Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

function SvgSpark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v3m0 12v3M4.22 4.22l2.12 2.12m11.32 11.32 2.12 2.12M3 12h3m12 0h3M4.22 19.78l2.12-2.12m11.32-11.32 2.12-2.12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

const TITLE_MAX = 200;
const MAX_JOB_IMAGES = 3;

export default function PostJobPage() {
  const router = useRouter();
  const apiBaseUrl = getApiBaseUrl();

  const [gateChecked, setGateChecked] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [dueUrgent, setDueUrgent] = useState(false);
  const [dueAtLocal, setDueAtLocal] = useState("");

  function onImagePick(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    setImageFiles(picked.slice(0, MAX_JOB_IMAGES));
    e.target.value = "";
  }

  function removeImageAt(index: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const previewUrls = useMemo(() => imageFiles.map((f) => URL.createObjectURL(f)), [imageFiles]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewUrls]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let token = window.localStorage.getItem("vlc_access_token");
      if (!token) {
        token = await refreshAccessToken(apiBaseUrl);
      }
      let role = "";
      try {
        const raw = window.localStorage.getItem("vlc_current_user");
        if (raw) role = String((JSON.parse(raw) as StoredUser).role || "");
      } catch {
        role = "";
      }

      if (!token) {
        router.replace(`/dang-nhap?next=${encodeURIComponent("/viec-lam/dang-tin")}`);
        return;
      }
      if (role !== "client") {
        router.replace("/viec-lam");
        return;
      }
      if (!cancelled) setGateChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router, apiBaseUrl]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề công việc.");
      return;
    }

    let budgetNum: number | undefined;
    if (budget.trim() !== "") {
      const n = Number(budget);
      if (!Number.isFinite(n) || n < 0) {
        setError("Ngân sách không hợp lệ.");
        return;
      }
      budgetNum = n;
    }

    if (dueUrgent) {
      if (!dueAtLocal.trim()) {
        setError("Vui lòng chọn ngày giờ hạn hoàn thành hoặc bỏ đánh dấu gấp.");
        return;
      }
      const dueDt = new Date(dueAtLocal);
      if (!Number.isFinite(dueDt.getTime())) {
        setError("Thời hạn hoàn thành không hợp lệ.");
        return;
      }
    }

    setSubmitting(true);
    setError("");
    try {
      let imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        const fd = new FormData();
        for (const f of imageFiles) {
          fd.append("images", f);
        }
        const upRes = await authorizedFetch(
          apiUrl(apiPaths.auth.meJobImages, apiBaseUrl),
          {
            method: "POST",
            body: fd,
          },
          apiBaseUrl,
        );
        const upPayload = (await upRes.json()) as { urls?: string[]; message?: string };
        if (!upRes.ok) {
          setError(upPayload.message || "Không thể tải ảnh lên máy chủ.");
          return;
        }
        imageUrls = upPayload.urls ?? [];
      }

      const response = await authorizedFetch(
        apiUrl(apiPaths.auth.meJob, apiBaseUrl),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            budget: budgetNum,
            images: imageUrls,
            due_at:
              dueUrgent && dueAtLocal.trim() ? new Date(dueAtLocal).toISOString() : undefined,
          }),
        },
        apiBaseUrl,
      );
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        if (response.status === 401) {
          clearVlcAuth();
          setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để đăng công việc.");
          router.replace(`/dang-nhap?next=${encodeURIComponent("/viec-lam/dang-tin")}`);
          return;
        }
        setError(payload.message || "Không thể đăng công việc.");
        return;
      }
      window.dispatchEvent(new Event("vlc-user-updated"));
      router.push("/viec-lam");
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!gateChecked) {
    return (
      <>
        <Header />
        <main id="main-content" className="fv-profile-shell flex min-h-[55vh] items-center justify-center pb-24 pt-8">
          <div className="fv-card flex max-w-md flex-col items-center gap-4 px-8 py-10">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1DBF73] border-t-transparent" aria-hidden />
            <p className="fv-body-sm text-center text-[#74767E]">Đang kiểm tra quyền truy cập…</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const titleLen = title.length;

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
            <span className="fv-caption hidden sm:inline">Đăng tin cho freelancer trên nền tảng</span>
          </nav>

          <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-8">
            <div className="min-w-0 space-y-8">
              <header className="fv-card">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[8px] border border-[#E8E8E8] bg-[#F5F5F5] text-[#404145] shadow-[0px_1px_3px_rgba(0,0,0,0.08)]">
                      <SvgBriefcase className="h-7 w-7" aria-hidden />
                    </div>
                    <div>
                      <p className="fv-label-caps text-[#74767E]">Khách hàng</p>
                      <h1 className="fv-display mt-2">Đăng tải công việc</h1>
                      <p className="fv-body mt-3 max-w-xl">
                        Mô tả rõ phạm vi và kỳ vọng — tin được đăng ở trạng thái{" "}
                        <span className="font-semibold text-[#404145]">đang mở</span>, freelancer có thể xem và nhận việc
                        ngay trên trang Việc làm.
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                    <span className="fv-badge-success">Miễn phí đăng tin</span>
                    <span className="fv-badge-neutral">Hiển thị công khai</span>
                  </div>
                </div>
              </header>

              <form onSubmit={handleSubmit} className="fv-card space-y-6">
                {error ? (
                  <div className="fv-error-banner fv-focus-ring flex gap-3 rounded-[8px]" role="alert">
                    <span className="mt-0.5 shrink-0 text-[#D74C3B]" aria-hidden>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
                        <path d="M12 8v5m0 3h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                    <p className="fv-body-sm text-[#D74C3B]">{error}</p>
                  </div>
                ) : null}

                <section className="fv-inset-card">
                  <div className="flex items-start gap-3 border-b border-[#E8E8E8] pb-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-[#E8E8E8] bg-[#FFFFFF] text-sm font-bold text-[#404145]">
                      1
                    </span>
                    <div>
                      <h2 className="fv-heading">Tiêu đề tin</h2>
                      <p className="fv-caption mt-1">Một dòng ngắn, thể hiện đúng việc cần làm</p>
                    </div>
                  </div>
                  <div className="pt-4">
                    <label htmlFor="job-title" className="sr-only">
                      Tiêu đề (bắt buộc)
                    </label>
                    <input
                      id="job-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      maxLength={TITLE_MAX}
                      placeholder="Ví dụ: Thiết kế logo cửa hàng — bản giao trong 5 ngày"
                      className="fv-input fv-focus-ring w-full"
                    />
                    <div className="mt-2 flex justify-end">
                      <span
                        className={`fv-caption tabular-nums ${titleLen >= TITLE_MAX ? "font-semibold text-[#D74C3B]" : "text-[#74767E]"}`}
                      >
                        {titleLen}/{TITLE_MAX}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="fv-inset-card">
                  <div className="flex items-start gap-3 border-b border-[#E8E8E8] pb-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-[#E8E8E8] bg-[#FFFFFF] text-sm font-bold text-[#404145]">
                      2
                    </span>
                    <div>
                      <h2 className="fv-heading">Ngân sách gợi ý</h2>
                      <p className="fv-caption mt-1">VND — có thể để trống và thỏa thuận sau</p>
                    </div>
                  </div>
                  <div className="pt-4">
                    <label htmlFor="job-budget" className="sr-only">
                      Ngân sách gợi ý VND
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10.2px] font-bold uppercase tracking-wide text-[#74767E]">
                        ₫
                      </span>
                      <input
                        id="job-budget"
                        inputMode="numeric"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        placeholder="VD: 5000000 hoặc để trống"
                        className="fv-input fv-focus-ring w-full pl-10"
                      />
                    </div>
                  </div>
                </section>

                <section className="fv-inset-card">
                  <div className="flex items-start gap-3 border-b border-[#E8E8E8] pb-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-[#E8E8E8] bg-[#FFFFFF] text-sm font-bold text-[#404145]">
                      3
                    </span>
                    <div>
                      <h2 className="fv-heading">Mô tả chi tiết</h2>
                      <p className="fv-caption mt-1">Phạm vi, thời hạn, định dạng file bàn giao…</p>
                    </div>
                  </div>
                  <div className="pt-4">
                    <label htmlFor="job-desc" className="sr-only">
                      Mô tả công việc
                    </label>
                    <textarea
                      id="job-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={7}
                      placeholder="Phạm vi công việc, thời hạn, yêu cầu file bàn giao…"
                      className="fv-input fv-focus-ring min-h-[168px] w-full resize-y"
                    />
                  </div>
                </section>

                <section className="fv-inset-card">
                  <div className="flex items-start gap-3 border-b border-[#E8E8E8] pb-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-[#E8E8E8] bg-[#FFFFFF] text-sm font-bold text-[#404145]">
                      4
                    </span>
                    <div>
                      <h2 className="fv-heading">Ảnh minh họa (tùy chọn)</h2>
                      <p className="fv-caption mt-1">
                        Tối đa {MAX_JOB_IMAGES} ảnh — JPEG, PNG, WebP, GIF (mỗi file ≤ 5MB)
                      </p>
                    </div>
                  </div>
                  <div className="pt-4">
                    <label htmlFor="job-images" className="sr-only">
                      Chọn ảnh đính kèm
                    </label>
                    <input
                      id="job-images"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      onChange={onImagePick}
                      className="fv-focus-ring block w-full cursor-pointer text-[13.6px] leading-6 text-[#74767E] file:mr-3 file:inline-flex file:min-h-[44px] file:cursor-pointer file:items-center file:justify-center file:rounded-[24px] file:border-2 file:border-[#404145] file:bg-[#FFFFFF] file:px-6 file:py-3 file:text-[10.2px] file:font-bold file:uppercase file:tracking-wide file:text-[#404145] file:transition file:hover:bg-[#F5F5F5] file:active:bg-[#E8E8E8]"
                    />
                    {imageFiles.length > 0 ? (
                      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                        {imageFiles.map((file, idx) => (
                          <li
                            key={`${file.name}-${idx}`}
                            className="relative overflow-hidden rounded-[8px] border border-[#E8E8E8] bg-[#F5F5F5] shadow-[0px_1px_3px_rgba(0,0,0,0.08)]"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={previewUrls[idx] || ""}
                              alt={file.name}
                              className="aspect-[4/3] w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeImageAt(idx)}
                              className="fv-focus-ring absolute right-2 top-2 rounded-[4px] border border-[#E8E8E8] bg-[#FFFFFF] px-2 py-1 text-[12.8px] font-semibold text-[#D74C3B] shadow-[0px_1px_3px_rgba(0,0,0,0.08)] transition hover:bg-[#F5F5F5]"
                            >
                              Gỡ
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="fv-caption mt-3 text-[#74767E]">Chưa chọn ảnh — có thể bỏ qua bước này.</p>
                    )}
                  </div>
                </section>

                <section className="fv-inset-card">
                  <div className="flex items-start gap-3 border-b border-[#E8E8E8] pb-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-[#E8E8E8] bg-[#FFFFFF] text-sm font-bold text-[#404145]">
                      5
                    </span>
                    <div>
                      <h2 className="fv-heading">Hạn hoàn thành mong muốn</h2>
                      <p className="fv-caption mt-1">
                        Bật nếu cần xử lý gấp — freelancer sẽ thấy trên tin và trang chi tiết
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 pt-4">
                    <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-[8px] border border-[#E8E8E8] bg-[#FFFFFF] px-4 py-3 fv-body-sm text-[#404145]">
                      <input
                        type="checkbox"
                        checked={dueUrgent}
                        onChange={(e) => setDueUrgent(e.target.checked)}
                        className="fv-focus-ring h-4 w-4 shrink-0 rounded border-[#D3D3D3] text-[#1DBF73] accent-[#1DBF73]"
                      />
                      Cần hoàn thành trước một thời điểm cụ thể
                    </label>
                    {dueUrgent ? (
                      <div>
                        <label htmlFor="job-due" className="fv-label-caps text-[#74767E]">
                          Ngày & giờ hạn
                        </label>
                        <input
                          id="job-due"
                          type="datetime-local"
                          value={dueAtLocal}
                          onChange={(e) => setDueAtLocal(e.target.value)}
                          className="fv-input fv-focus-ring mt-2 w-full max-w-md"
                        />
                      </div>
                    ) : null}
                  </div>
                </section>

                <hr className="fv-divider" />

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="fv-btn-primary fv-focus-ring w-full justify-center sm:w-auto sm:min-w-[200px]"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#FFFFFF] border-t-transparent" aria-hidden />
                        Đang đăng tin…
                      </span>
                    ) : (
                      "Xác nhận đăng tin"
                    )}
                  </button>
                  <Link
                    href="/viec-lam"
                    className="fv-btn-secondary fv-focus-ring w-full justify-center sm:w-auto"
                  >
                    Hủy
                  </Link>
                </div>
              </form>
            </div>

            <aside className="mt-10 lg:mt-0">
              <div className="sticky top-24 space-y-6">
                <div className="fv-alert-card">
                  <div className="flex items-center gap-2 text-[#404145]">
                    <SvgSpark className="h-5 w-5 shrink-0 text-[#1DBF73]" aria-hidden />
                    <h3 className="fv-heading">Gợi ý</h3>
                  </div>
                  <ul className="fv-body-sm mt-4 space-y-3 text-[#74767E]">
                    <li className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1DBF73]" aria-hidden />
                      Viết tiêu đề có thể hành động: làm gì, cho ai, thời gian gợi ý.
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1DBF73]" aria-hidden />
                      Ngân sách minh bạch giúp tin nhận được phản hồi nhanh hơn.
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1DBF73]" aria-hidden />
                      Sau khi có freelancer nhận việc, bạn theo dõi tiến độ trong menu avatar → Công việc của tôi.
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1DBF73]" aria-hidden />
                      Ảnh và hạn hoàn thành hiển thị đầy đủ khi người xem mở chi tiết tin trên Việc làm.
                    </li>
                  </ul>
                </div>

                <div className="fv-card">
                  <p className="fv-label-caps text-[#74767E]">Sau khi đăng</p>
                  <p className="fv-body-sm mt-2 text-[#74767E]">
                    Tin xuất hiện trên trang{" "}
                    <Link
                      href="/viec-lam"
                      className="fv-focus-ring inline font-semibold text-[#404145] underline decoration-1 underline-offset-2 transition hover:text-[#1DBF73] hover:decoration-[#1DBF73]"
                    >
                      Việc làm
                    </Link>
                    . Bạn có thể quản lý và xem người nhận việc trong{" "}
                    <Link
                      href="/cong-viec-cua-toi"
                      className="fv-focus-ring inline font-semibold text-[#404145] underline decoration-1 underline-offset-2 transition hover:text-[#1DBF73] hover:decoration-[#1DBF73]"
                    >
                      Công việc của tôi
                    </Link>
                    .
                  </p>
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
