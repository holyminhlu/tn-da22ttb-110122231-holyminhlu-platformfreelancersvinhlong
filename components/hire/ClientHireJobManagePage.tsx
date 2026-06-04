"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaCheckCircle, FaEnvelope, FaPhone, FaVideo } from "react-icons/fa";
import { listMyContracts } from "@/lib/api/contracts";
import {
  listMyJobQuotes,
  patchJobQuote,
  type JobQuoteRow,
  type PatchJobQuoteAction,
} from "@/lib/api/jobQuotes";
import { getJob, type JobListing } from "@/lib/api/jobs";
import { formatDate, formatVnd } from "@/lib/format";
import { formatQuoteAmount, quoteStatusLabel } from "@/lib/hire/quoteDisplay";
import HireShell from "./HireShell";
import "./hire.css";

type ManageTab = "proposals" | "contract" | "job";

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
  const shortlist = sortedQuotes
    .filter((q) => ["shortlisted", "interviewing", "offered", "pending"].includes(q.status))
    .slice(0, 3);

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
      <div className="hire-page hire-manage">
        <Link href="/hire/joblist" className="hire-favorites__empty-link hire-manage__back">
          <FaArrowLeft aria-hidden />
          Quay lại danh sách công việc
        </Link>

        {loading ? (
          <p className="hire-page__state">Đang tải quản lý dự án...</p>
        ) : error ? (
          <p className="hire-page__state hire-page__state--error" role="alert">
            {error}
          </p>
        ) : job ? (
          <>
            <header className="hire-manage__head">
              <h1 className="hire-page__title">Quản lý tuyển dụng · {job.title}</h1>
              <p className="hire-page__lead">
                Theo dõi toàn bộ pipeline: nhận hồ sơ, phỏng vấn, gửi offer, hợp đồng và triển khai.
              </p>
            </header>

            <nav className="hire-manage__tabs" aria-label="Điều hướng quản lý dự án">
              <button
                type="button"
                className={`hire-manage__tab${tab === "proposals" ? " is-active" : ""}`}
                onClick={() => setTab("proposals")}
              >
                View Proposals ({quotes.length})
              </button>
              <button
                type="button"
                className={`hire-manage__tab${tab === "contract" ? " is-active" : ""}`}
                onClick={() => setTab("contract")}
              >
                Active Contract
              </button>
              <button
                type="button"
                className={`hire-manage__tab${tab === "job" ? " is-active" : ""}`}
                onClick={() => setTab("job")}
              >
                Job Description
              </button>
            </nav>

            {actionError ? (
              <p className="hire-quotes__action-error hire-manage__error" role="alert">
                {actionError}
              </p>
            ) : null}

            {tab === "proposals" ? (
              <section className="hire-manage__panel">
                <h2 className="hire-manage__panel-title">Screening & Interview</h2>
                <p className="hire-manage__panel-note">
                  Shortlist tự động dựa trên rating, số job hoàn thành và lịch sử review.
                </p>

                {shortlist.length > 0 ? (
                  <div className="hire-manage__shortlist">
                    <span>Shortlist đề xuất:</span>
                    <strong>{shortlist.map((q) => q.freelancer_name || "Freelancer").join(" · ")}</strong>
                  </div>
                ) : null}

                {quotes.length === 0 ? (
                  <p className="hire-page__state">Chưa có freelancer nộp hồ sơ cho công việc này.</p>
                ) : (
                  <div className="hire-manage__quote-list">
                    {sortedQuotes.map((quote) => {
                      const freelancerName = quote.freelancer_name?.trim() || "Freelancer";
                      const interviewSubject = encodeURIComponent(
                        `[Interview] ${job.title} - ${freelancerName}`,
                      );
                      const interviewBody = encodeURIComponent(
                        `Chào ${freelancerName},\n\nMình mời bạn phỏng vấn cho job: ${job.title}.\nBạn có thể chọn 1 khung giờ phù hợp nhé.`,
                      );
                      const isBusy = busyQuoteId === quote.id;
                      const canShortlist = ["pending", "interviewing", "offered"].includes(quote.status);
                      const canInterview = ["pending", "shortlisted", "offered"].includes(quote.status);
                      const canOffer = ["pending", "shortlisted", "interviewing"].includes(quote.status);
                      const canHire = quote.status === "offered";
                      const canDecline = ["pending", "shortlisted", "interviewing", "offered"].includes(
                        quote.status,
                      );
                      return (
                        <article key={quote.id} className="hire-manage__quote-item">
                          <div className="hire-manage__quote-main">
                            <h3>{freelancerName}</h3>
                            <p>
                              {formatQuoteAmount(quote)} · {quote.pricing_type === "hourly" ? "Theo giờ" : "Trọn gói"}{" "}
                              · {quoteStatusLabel(quote.status)}
                            </p>
                            <p className="hire-manage__quote-meta">
                              Rating: {quote.rating_avg ? quote.rating_avg.toFixed(1) : "N/A"} · Reviews:{" "}
                              {quote.total_reviews} · Completed: {quote.completed_jobs}
                            </p>
                            <p className="hire-manage__quote-message">
                              {quote.message?.trim() || "Freelancer chưa để lại thư đề xuất."}
                            </p>
                          </div>
                          <div className="hire-manage__quote-actions">
                            <Link href={`/hire/search/${quote.freelancer_id}`} className="hire-joblist__link-btn">
                              Portfolio
                            </Link>
                            {quote.freelancer_email ? (
                              <a
                                href={`mailto:${quote.freelancer_email}?subject=${interviewSubject}&body=${interviewBody}`}
                                className="hire-joblist__link-btn"
                              >
                                <FaEnvelope aria-hidden />
                                Chat
                              </a>
                            ) : null}
                            <a href={`tel:+84`} className="hire-joblist__link-btn">
                              <FaPhone aria-hidden />
                              Call
                            </a>
                            <a
                              href={`mailto:${quote.freelancer_email || ""}?subject=${interviewSubject}&body=${interviewBody}`}
                              className="hire-joblist__link-btn"
                            >
                              <FaVideo aria-hidden />
                              Video Invite
                            </a>
                            {canShortlist ? (
                              <button
                                type="button"
                                className="hire-joblist__link-btn"
                                disabled={isBusy}
                                onClick={() => void handleQuoteAction(quote.id, "shortlist")}
                              >
                                Shortlist
                              </button>
                            ) : null}
                            {canInterview ? (
                              <button
                                type="button"
                                className="hire-joblist__link-btn"
                                disabled={isBusy}
                                onClick={() => void handleQuoteAction(quote.id, "interview")}
                              >
                                Phỏng vấn
                              </button>
                            ) : null}
                            {canOffer ? (
                              <button
                                type="button"
                                className="hire-joblist__link-btn"
                                disabled={isBusy}
                                onClick={() => void handleQuoteAction(quote.id, "offer")}
                              >
                                Gửi Offer
                              </button>
                            ) : null}
                            {canDecline ? (
                              <button
                                type="button"
                                className="hire-joblist__link-btn"
                                disabled={isBusy}
                                onClick={() => void handleQuoteAction(quote.id, "decline")}
                              >
                                Từ chối
                              </button>
                            ) : null}
                            {canHire ? (
                              <button
                                type="button"
                                className="hire-joblist__link-btn hire-manage__hire-btn"
                                disabled={isBusy}
                                onClick={() => void handleQuoteAction(quote.id, "accept")}
                              >
                                {isBusy ? "Đang tạo hợp đồng..." : "Chốt tuyển (Hire)"}
                              </button>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            ) : null}

            {tab === "contract" ? (
              <section className="hire-manage__panel">
                <h2 className="hire-manage__panel-title">Offer & Escrow / Execution</h2>
                {contractId ? (
                  <>
                    <p className="hire-manage__panel-note">
                      Offer đã được chấp nhận và hợp đồng đã tạo. Vào workflow để quản lý escrow,
                      milestones, tiến độ và nghiệm thu.
                    </p>
                    <div className="hire-manage__contract-cta">
                      <FaCheckCircle aria-hidden />
                      <span>Contract ID: {contractId.slice(0, 8).toUpperCase()}</span>
                      <button
                        type="button"
                        className="hire-joblist__link-btn hire-manage__hire-btn"
                        onClick={() => router.push(`/hire/orders/${contractId}`)}
                      >
                        Mở Active Contract
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="hire-page__state">
                    Chưa có hợp đồng cho job này. Hãy chọn một proposal ở tab View Proposals để gửi offer.
                  </p>
                )}
              </section>
            ) : null}

            {tab === "job" ? (
              <section className="hire-manage__panel">
                <h2 className="hire-manage__panel-title">Job Description</h2>
                <div className="hire-manage__job-block">
                  <p>
                    <strong>Ngân sách:</strong>{" "}
                    {job.budget != null ? formatVnd(job.budget) : "Thỏa thuận"}
                    {job.budget_type === "hourly" ? "/giờ" : ""}
                    {job.budget_max != null ? ` - ${formatVnd(job.budget_max)}` : ""}
                  </p>
                  <p>
                    <strong>Hạn hoàn thành:</strong>{" "}
                    {job.due_at ? formatDate(job.due_at) : "Không giới hạn"}
                  </p>
                  <p>
                    <strong>Trạng thái:</strong> {job.status}
                  </p>
                </div>
                <p className="hire-manage__job-desc">{job.description?.trim() || "—"}</p>
                <div className="hire-manage__job-links">
                  <Link href={`/work/detail/${job.id}`} className="hire-joblist__link-btn">
                    Xem trang job public
                  </Link>
                  <Link href="/hire/joblist" className="hire-joblist__link-btn">
                    Quay lại joblist
                  </Link>
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </HireShell>
  );
}

