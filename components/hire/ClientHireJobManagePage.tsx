"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaBriefcase, FaCheckCircle, FaCommentDots } from "react-icons/fa";
import FreelancerChatWidget from "@/components/chat/FreelancerChatWidget";
import FreelancerAvatarFrame from "@/components/freelancer/FreelancerAvatarFrame";
import { listMyContracts } from "@/lib/api/contracts";
import {
  listMyJobQuotes,
  patchJobQuote,
  type JobQuoteRow,
  type PatchJobQuoteAction,
} from "@/lib/api/jobQuotes";
import { getJob, type JobListing } from "@/lib/api/jobs";
import { getUserInitials, resolveAvatarSrc } from "@/lib/authSession";
import { formatDate, formatVnd } from "@/lib/format";
import { jobStatusLabel, jobStatusTone } from "@/lib/jobsDisplay";
import {
  formatQuoteAmount,
  quoteClientActions,
  quoteRatingPercent,
  quoteStatusBadgeClass,
  quoteStatusLabel,
} from "@/lib/hire/quoteDisplay";
import HireShell from "./HireShell";
import "./hire.css";

type ManageTab = "proposals" | "contract" | "job";

const MANAGE_TABS: { value: ManageTab; label: string }[] = [
  { value: "proposals", label: "Báo giá" },
  { value: "contract", label: "Hợp đồng" },
  { value: "job", label: "Mô tả công việc" },
];

function recommendationScore(quote: JobQuoteRow): number {
  const rating = quote.rating_avg ?? 0;
  const reviews = Math.min(quote.total_reviews, 20) / 20;
  const completed = Math.min(quote.completed_jobs, 30) / 30;
  return rating * 0.7 + reviews * 2 + completed * 2;
}

export default function ClientHireJobManagePage() {
  const params = useParams();
  const router = useRouter();
  const jobId = typeof params.jobId === "string" ? params.jobId : "";

  const [job, setJob] = useState<JobListing | null>(null);
  const [quotes, setQuotes] = useState<JobQuoteRow[]>([]);
  const [contractId, setContractId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<ManageTab>("proposals");
  const [busyQuoteId, setBusyQuoteId] = useState("");
  const [actionError, setActionError] = useState("");
  const [chatQuote, setChatQuote] = useState<JobQuoteRow | null>(null);

  const load = useCallback(async () => {
    if (!jobId) {
      setError("Mã công việc không hợp lệ.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setActionError("");
    try {
      const [jobRow, quoteRows, contractsRes] = await Promise.all([
        getJob(jobId),
        listMyJobQuotes({ jobId }),
        listMyContracts(),
      ]);
      setJob(jobRow);
      setQuotes(quoteRows);
      const foundContract = (contractsRes.contracts ?? []).find((c) => c.job_id === jobId) ?? null;
      setContractId(foundContract?.id ?? null);
      if (foundContract) setTab("contract");
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải trang quản lý tuyển dụng.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedQuotes = useMemo(
    () => [...quotes].sort((a, b) => recommendationScore(b) - recommendationScore(a)),
    [quotes],
  );

  const pendingCount = quotes.filter((q) => String(q.status).toLowerCase() === "pending").length;

  async function handleQuoteAction(quoteId: string, action: PatchJobQuoteAction) {
    setActionError("");
    setBusyQuoteId(quoteId);
    try {
      const result = await patchJobQuote(quoteId, action);
      if (action === "accept" && result.contract?.id) {
        setContractId(result.contract.id);
        setTab("contract");
      }
      await load();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể cập nhật trạng thái hồ sơ.";
      setActionError(message);
    } finally {
      setBusyQuoteId("");
    }
  }

  return (
    <HireShell>
      <div className="hire-page hire-manage hire-manage--full-width">
        <Link href="/hire/joblist" className="hire-manage__back">
          <FaArrowLeft aria-hidden />
          Quay lại danh sách công việc
        </Link>

        {loading ? (
          <p className="hire-page__state">Đang tải quản lý tuyển dụng...</p>
        ) : error ? (
          <p className="hire-page__state hire-page__state--error" role="alert">
            {error}
          </p>
        ) : job ? (
          <>
            <header className="hire-page__head hire-manage__head">
              <div className="hire-manage__head-text">
                <div className="hire-manage__title-row">
                  <h1 className="hire-page__title">{job.title}</h1>
                  <span className={`hire-joblist__status hire-joblist__status--${jobStatusTone(job.status)}`}>
                    {jobStatusLabel(job.status)}
                  </span>
                </div>
                <p className="hire-page__lead">
                  Quản lý báo giá, chốt tuyển và theo dõi hợp đồng cho công việc này.
                </p>
                <dl className="hire-manage__head-meta">
                  <div>
                    <dt>Ngân sách</dt>
                    <dd>
                      {job.budget != null ? formatVnd(job.budget) : "Thỏa thuận"}
                      {job.budget_type === "hourly" ? "/giờ" : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Báo giá</dt>
                    <dd>
                      {quotes.length} hồ sơ
                      {pendingCount > 0 ? ` · ${pendingCount} chờ xử lý` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Đăng ngày</dt>
                    <dd>{formatDate(job.created_at)}</dd>
                  </div>
                </dl>
              </div>
              <div className="hire-manage__head-actions">
                <Link href={`/work/detail/${job.id}`} className="hire-page__post-btn hire-page__post-btn--ghost">
                  Xem tin công khai
                </Link>
                <Link href="/hire/quotes" className="hire-page__post-btn">
                  Tất cả báo giá
                </Link>
              </div>
            </header>

            <nav className="hire-manage__tabs" aria-label="Điều hướng quản lý tuyển dụng">
              {MANAGE_TABS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`hire-manage__tab${tab === item.value ? " is-active" : ""}`}
                  onClick={() => setTab(item.value)}
                >
                  {item.label}
                  {item.value === "proposals" ? (
                    <span className="hire-manage__tab-count">{quotes.length}</span>
                  ) : null}
                  {item.value === "contract" && contractId ? (
                    <span className="hire-manage__tab-dot" aria-label="Đã có hợp đồng" />
                  ) : null}
                </button>
              ))}
            </nav>

            {actionError ? (
              <p className="hire-quotes__action-error hire-manage__error" role="alert">
                {actionError}
              </p>
            ) : null}

            {tab === "proposals" ? (
              <section className="hire-manage__panel">
                <div className="hire-manage__panel-intro">
                  <h2 className="hire-manage__panel-title">Báo giá từ freelancer</h2>
                  <p className="hire-manage__panel-note">
                    Xem hồ sơ và chốt tuyển để tạo hợp đồng.
                  </p>
                </div>

                {quotes.length === 0 ? (
                  <div className="hire-manage__empty">
                    <p>Chưa có freelancer gửi báo giá cho công việc này.</p>
                    <Link href="/hire/search" className="hire-manage__empty-link">
                      Mời freelancer từ danh sách
                    </Link>
                  </div>
                ) : (
                  <ul className="hire-manage__quote-grid">
                    {sortedQuotes.map((quote) => {
                      const freelancerName = quote.freelancer_name?.trim() || "Freelancer";
                      const avatarSrc = resolveAvatarSrc(quote.freelancer_avatar_url);
                      const isBusy = busyQuoteId === quote.id;
                      const { canHire, canDecline } = quoteClientActions(
                        quote.status,
                      );
                      const ratingPct = quoteRatingPercent(quote);
                      const detailHref = `/hire/quotes/${quote.id}`;

                      return (
                        <li key={quote.id}>
                          <article className="hire-manage__quote-card">
                            <div className="hire-manage__quote-card-top">
                              <span className={`hire-favorites__badge ${quoteStatusBadgeClass(quote.status)}`}>
                                {quoteStatusLabel(quote.status)}
                              </span>
                              <FreelancerAvatarFrame
                                completedJobs={quote.completed_jobs}
                                size={48}
                                src={avatarSrc}
                                alt={freelancerName}
                                fallback={getUserInitials(freelancerName)}
                                imgClassName="hire-favorites__avatar-img"
                                className="hire-manage__quote-avatar"
                              />
                            </div>

                            <h3 className="hire-manage__quote-name">
                              <Link href={detailHref}>{freelancerName}</Link>
                            </h3>
                            <p className="hire-manage__quote-title">
                              {quote.freelancer_title?.trim() || "Freelancer"}
                            </p>
                            <p className="hire-manage__quote-price">
                              {formatQuoteAmount(quote)}
                              <span>
                                {" · "}
                                {quote.pricing_type === "hourly" ? "Theo giờ" : "Trọn gói"}
                              </span>
                            </p>
                            {ratingPct > 0 ? (
                              <p className="hire-manage__quote-rating">
                                {quote.rating_avg != null && quote.rating_avg > 0
                                  ? `${Number(quote.rating_avg).toFixed(1)}/5`
                                  : `${ratingPct}%`}
                                {quote.total_reviews > 0 ? ` · ${quote.total_reviews} đánh giá` : ""}
                                {quote.completed_jobs > 0 ? ` · ${quote.completed_jobs} việc` : ""}
                              </p>
                            ) : null}
                            <p className="hire-manage__quote-message">
                              {quote.message?.trim() || "Freelancer chưa gửi thư đề xuất."}
                            </p>

                            <div className="hire-manage__quote-actions">
                              <Link href={detailHref} className="hire-manage__quote-btn">
                                Xem chi tiết
                              </Link>
                              {canHire ? (
                                <button
                                  type="button"
                                  className="hire-manage__quote-btn hire-manage__quote-btn--primary"
                                  disabled={isBusy}
                                  onClick={() => void handleQuoteAction(quote.id, "accept")}
                                >
                                  {isBusy ? "Đang xử lý..." : "Chốt tuyển"}
                                </button>
                              ) : (
                                <span className="hire-manage__quote-btn hire-manage__quote-btn--placeholder" aria-hidden>
                                  —
                                </span>
                              )}
                              {canDecline ? (
                                <button
                                  type="button"
                                  className="hire-manage__quote-btn hire-manage__quote-btn--decline"
                                  disabled={isBusy}
                                  onClick={() => void handleQuoteAction(quote.id, "decline")}
                                >
                                  Từ chối
                                </button>
                              ) : (
                                <span className="hire-manage__quote-btn hire-manage__quote-btn--placeholder" aria-hidden>
                                  —
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              className="hire-manage__quote-chat"
                              onClick={() => setChatQuote(quote)}
                            >
                              <FaCommentDots aria-hidden />
                              Nhắn tin
                            </button>
                          </article>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ) : null}

            {tab === "contract" ? (
              <section className="hire-manage__panel">
                <h2 className="hire-manage__panel-title">Hợp đồng & triển khai</h2>
                {contractId ? (
                  <>
                    <p className="hire-manage__panel-note">
                      Đã chốt tuyển freelancer. Vào workspace để theo dõi tiến độ, ký quỹ và nghiệm thu.
                    </p>
                    <div className="hire-manage__contract-cta">
                      <FaCheckCircle aria-hidden />
                      <div>
                        <p className="hire-manage__contract-label">Mã hợp đồng</p>
                        <p className="hire-manage__contract-id">{contractId.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <button
                        type="button"
                        className="hire-manage__hire-btn"
                        onClick={() => router.push(`/hire/orders/${contractId}`)}
                      >
                        Mở workspace
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="hire-manage__empty">
                    <p>Chưa có hợp đồng. Hãy chọn báo giá phù hợp, gửi offer và chốt tuyển freelancer.</p>
                    <button
                      type="button"
                      className="hire-manage__empty-link"
                      onClick={() => setTab("proposals")}
                    >
                      Xem báo giá
                    </button>
                  </div>
                )}
              </section>
            ) : null}

            {tab === "job" ? (
              <section className="hire-manage__panel">
                <h2 className="hire-manage__panel-title">Mô tả công việc</h2>
                <dl className="hire-manage__job-stats">
                  <div>
                    <dt>Ngân sách</dt>
                    <dd>
                      {job.budget != null ? formatVnd(job.budget) : "Thỏa thuận"}
                      {job.budget_type === "hourly" ? "/giờ" : ""}
                      {job.budget_max != null ? ` – ${formatVnd(job.budget_max)}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Hạn hoàn thành</dt>
                    <dd>{job.due_at ? formatDate(job.due_at) : "Không giới hạn"}</dd>
                  </div>
                  <div>
                    <dt>Trạng thái</dt>
                    <dd>{jobStatusLabel(job.status)}</dd>
                  </div>
                  <div>
                    <dt>Vị trí</dt>
                    <dd>{job.location_label?.trim() || "—"}</dd>
                  </div>
                </dl>
                <div className="hire-manage__job-desc-block">
                  <h3 className="hire-manage__job-desc-title">
                    <FaBriefcase aria-hidden />
                    Nội dung chi tiết
                  </h3>
                  <p className="hire-manage__job-desc">{job.description?.trim() || "Chưa có mô tả chi tiết."}</p>
                </div>
                <div className="hire-manage__job-links">
                  <Link href={`/work/detail/${job.id}`} className="hire-joblist__link-btn">
                    Xem trang tuyển dụng công khai
                  </Link>
                  <Link href="/hire/joblist" className="hire-joblist__link-btn hire-joblist__link-btn--muted">
                    Quay lại danh sách việc
                  </Link>
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        {chatQuote ? (
          <FreelancerChatWidget
            key={chatQuote.id}
            freelancerId={chatQuote.freelancer_id}
            freelancerName={chatQuote.freelancer_name?.trim() || "Freelancer"}
            jobQuoteId={chatQuote.id}
            contextTitle={job?.title ?? chatQuote.job_title}
            initialOpen
            onClose={() => setChatQuote(null)}
          />
        ) : null}
      </div>
    </HireShell>
  );
}
