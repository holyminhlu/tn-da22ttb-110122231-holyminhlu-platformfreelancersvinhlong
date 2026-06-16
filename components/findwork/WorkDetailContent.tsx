"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  FaArrowLeft,
  FaBriefcase,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaCommentDots,
  FaEnvelopeOpenText,
  FaListUl,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaUsers,
  FaVideo,
} from "react-icons/fa";
import { getJob, type JobListing } from "@/lib/api/jobs";
import UserAvatar from "@/components/ui/UserAvatar";
import { formatDate, formatVnd } from "@/lib/format";
import { useStoredUser } from "@/hooks/useStoredUser";
import {
  clientDisplayName,
  clientLocationLabel,
  formatJobBudgetLine,
  jobStatusLabel,
  jobStatusTone,
  parseJobImages,
  parseJobTags,
  proposalCountLabel,
  relativePosted,
} from "@/lib/jobsDisplay";
import {
  blocksNewJobQuote,
  freelancerQuotePhaseDescription,
  freelancerQuotePhaseLabel,
  resolveFreelancerJobQuotePhase,
} from "@/lib/findwork/workDetailQuote";
import ClientCannotQuoteModal from "./ClientCannotQuoteModal";
import SaveJobButton from "./SaveJobButton";
import WorkDetailCommutePanel from "./WorkDetailCommutePanel";
import WorkDetailGallery from "./WorkDetailGallery";
import JobProposalFormModal from "./JobProposalFormModal";

function WorkDetailSkeleton() {
  return (
    <div className="wd-skeleton" aria-busy="true" aria-label="Đang tải">
      <div className="wd-skeleton__back" />
      <div className="wd-skeleton__hero" />
      <div className="wd-skeleton__grid">
        <div className="wd-skeleton__main" />
        <div className="wd-skeleton__aside" />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`wd-hero-stat${highlight ? " wd-hero-stat--highlight" : ""}`}>
      <span className="wd-hero-stat__icon" aria-hidden>
        {icon}
      </span>
      <span className="wd-hero-stat__label">{label}</span>
      <span className="wd-hero-stat__value">{value}</span>
    </div>
  );
}

export default function WorkDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user, ready, isClient } = useStoredUser({ refreshFromApi: false });
  const isGuest = ready && !user;
  const rawId = params?.id;
  const jobId = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";

  const [job, setJob] = useState<JobListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [proposalOpen, setProposalOpen] = useState(false);
  const [clientNoticeOpen, setClientNoticeOpen] = useState(false);

  const loadJob = useCallback(async () => {
    if (!jobId) {
      setError("Mã công việc không hợp lệ.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await getJob(jobId);
      setJob(data);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải chi tiết công việc.";
      setError(message);
      setJob(null);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void loadJob();
  }, [loadJob]);

  if (loading) {
    return <WorkDetailSkeleton />;
  }

  if (error || !job) {
    return (
      <div className="wd-empty-state">
        <Link href="/findwork" className="wd-back">
          <FaArrowLeft aria-hidden />
          Quay lại danh sách
        </Link>
        <div className="wd-error" role="alert">
          {error || "Không tìm thấy công việc."}
        </div>
      </div>
    );
  }

  const budgetLine = formatJobBudgetLine(job);
  const budgetPrimary = job.budget != null ? formatVnd(job.budget) : "Thỏa thuận";
  const tags = parseJobTags(job.tags);
  const images = parseJobImages(job.images);
  const clientName = clientDisplayName(job.client_name);
  const clientLoc = clientLocationLabel(job);
  const categoryLabel = job.category?.trim() || null;
  const statusTone = jobStatusTone(job.status);
  const quoteCount = job.quote_count ?? job.proposal_count;
  const isOpen = String(job.status).toLowerCase() === "open";
  const myContractId = job.my_contract_id ?? null;
  const isHired = Boolean(myContractId);
  const quotePhase = resolveFreelancerJobQuotePhase(job);
  const quotePhaseLabel = freelancerQuotePhaseLabel(quotePhase);
  const quotePhaseDescription = freelancerQuotePhaseDescription(quotePhase);
  const canSubmitQuote = isOpen && !blocksNewJobQuote(job);
  const isOwnJob = Boolean(user?.id && job.client_id && String(user.id) === String(job.client_id));

  function openQuoteFlow() {
    if (isClient) {
      setClientNoticeOpen(true);
      return;
    }
    setProposalOpen(true);
  }

  return (
    <div className="wd-page">
      <Link href="/findwork" className="wd-back">
        <FaArrowLeft aria-hidden />
        Quay lại danh sách
      </Link>

      <header className="wd-hero-card">
        <nav className="wd-breadcrumb" aria-label="Điều hướng">
          <Link href="/findwork">Tìm việc làm</Link>
          <span className="wd-breadcrumb__sep" aria-hidden>
            /
          </span>
          <span className="wd-breadcrumb__current" aria-current="page">
            Chi tiết công việc
          </span>
        </nav>

        <div className="wd-hero-card__head">
          <div className="wd-hero-card__main">
            <div className="wd-hero-card__badges">
              <span className={`wd-status wd-status--${statusTone}`}>{jobStatusLabel(job.status)}</span>
              {quotePhase === "offered" ? (
                <span className="wd-ribbon wd-ribbon--offer" role="status">
                  <FaEnvelopeOpenText aria-hidden />
                  Khách hàng đã gửi đề xuất
                </span>
              ) : null}
              {quotePhase === "interviewing" ? (
                <span className="wd-ribbon wd-ribbon--interview" role="status">
                  <FaVideo aria-hidden />
                  Mời phỏng vấn / trao đổi
                </span>
              ) : null}
            </div>
            <h1 className="wd-hero-card__title">{job.title}</h1>
            <p className="wd-hero-card__meta">
              <span className="wd-hero-card__meta-item">
                <FaClock aria-hidden />
                Đăng {relativePosted(job.created_at)}
              </span>
              <span className="wd-hero-card__meta-item">
                <FaUsers aria-hidden />
                {proposalCountLabel(quoteCount)}
              </span>
              {categoryLabel ? (
                <span className="wd-hero-card__meta-item">
                  <FaListUl aria-hidden />
                  {categoryLabel}
                </span>
              ) : null}
            </p>
          </div>
          {!isOwnJob ? (
            <div className="wd-hero-card__actions">
              <SaveJobButton jobId={job.id} variant="button" />
            </div>
          ) : null}
        </div>

        <div className="wd-hero-stats">
          <StatCard icon={<FaMoneyBillWave />} label="Ngân sách" value={budgetPrimary} highlight />
          <StatCard
            icon={<FaMapMarkerAlt />}
            label="Vị trí"
            value={job.location_label?.trim() || clientLoc}
          />
          <StatCard icon={<FaBriefcase />} label="Loại ngân sách" value={budgetLine} />
          <StatCard
            icon={<FaCalendarAlt />}
            label="Hạn gửi"
            value={job.due_at ? formatDate(job.due_at) : "Không giới hạn"}
          />
        </div>
      </header>

      <div className="wd-layout">
        <div className="wd-main-col">
          {images.length > 0 ? (
            <section className="wd-card wd-card--flush">
              <WorkDetailGallery images={images} title={job.title} />
            </section>
          ) : null}

          <section className="wd-card">
            <h2 className="wd-card__title">Mô tả công việc</h2>
            <div className="wd-prose">
              {job.description?.trim() || "Chưa có mô tả chi tiết."}
            </div>
          </section>

          {!isOwnJob ? (
            <WorkDetailCommutePanel job={job} isFreelancerViewer={!isClient} />
          ) : null}

          {categoryLabel || tags.length > 0 ? (
            <section className="wd-card">
              <h2 className="wd-card__title">Danh mục & kỹ năng</h2>
              <div className="wd-tags">
                {categoryLabel ? (
                  <span className="wd-tag wd-tag--category">
                    <FaListUl aria-hidden />
                    {categoryLabel}
                  </span>
                ) : null}
                {tags.map((skill) => (
                  <span key={skill} className="wd-tag">
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <section className="wd-card wd-card--muted" id="submit-help">
            <h2 className="wd-card__title">
              {quotePhase === "offered"
                ? "Đề xuất từ khách hàng"
                : quotePhase === "none" || quotePhase === "declined"
                  ? "Gửi báo giá"
                  : "Trạng thái hồ sơ của bạn"}
            </h2>
            {quotePhase === "none" || quotePhase === "declined" ? (
              <p className="wd-help-text">
                Nhấn <strong>Gửi yêu cầu báo giá</strong> để client nhận hồ sơ của bạn. Chỉ gửi được khi việc
                đang <em>Đang tuyển</em> và bạn chưa có báo giá đang xử lý.
              </p>
            ) : (
              <p className="wd-help-text">{quotePhaseDescription}</p>
            )}
            {!isOpen && quotePhase === "none" ? (
              <p className="wd-help-warn">Công việc này hiện không còn nhận báo giá mới.</p>
            ) : null}
            {blocksNewJobQuote(job) && quotePhase !== "accepted" ? (
              <p className="wd-help-warn">Bạn không thể gửi báo giá mới cho công việc này ở trạng thái hiện tại.</p>
            ) : null}
          </section>
        </div>

        <aside className="wd-aside">
          <div className="wd-aside__sticky">
            <section className="wd-card wd-client-card">
              <h2 className="wd-card__title wd-card__title--sm">Khách hàng</h2>
              <div className="wd-client">
                <UserAvatar
                  src={job.client_avatar_url}
                  name={job.client_name}
                  size={56}
                  className="wd-client__avatar"
                  alt={clientName}
                />
                <div className="wd-client__info">
                  <p className="wd-client__name">{clientName}</p>
                  <p className="wd-client__loc">
                    <FaMapMarkerAlt aria-hidden />
                    {clientLoc}
                    {job.client_email_verified ? (
                      <FaCheckCircle
                        className="wd-client__verified"
                        title="Email đã xác minh"
                        aria-label="Email đã xác minh"
                      />
                    ) : null}
                  </p>
                </div>
              </div>

              <dl className="wd-client-stats">
                {job.client_total_spent != null && job.client_total_spent > 0 ? (
                  <div className="wd-client-stats__row">
                    <dt>Đã chi tiêu</dt>
                    <dd>{formatVnd(job.client_total_spent)}</dd>
                  </div>
                ) : null}
                {job.client_satisfaction_score != null ? (
                  <div className="wd-client-stats__row">
                    <dt>Điểm hài lòng</dt>
                    <dd>{Number(job.client_satisfaction_score).toFixed(1)}/5</dd>
                  </div>
                ) : null}
                <div className="wd-client-stats__row">
                  <dt>Mã việc</dt>
                  <dd className="wd-client-stats__code">{job.id.slice(0, 8).toUpperCase()}</dd>
                </div>
              </dl>
            </section>

            <section
              className={`wd-card wd-cta-card${
                quotePhase === "offered"
                  ? " wd-cta-card--offer"
                  : quotePhase === "interviewing"
                    ? " wd-cta-card--interview"
                    : quotePhase === "pending"
                      ? " wd-cta-card--pending"
                      : ""
              }`}
            >
              {isHired && myContractId ? (
                <>
                  <div className="wd-cta-success" role="status">
                    <FaCheckCircle aria-hidden />
                    Bạn đã được client chọn cho công việc này.
                  </div>
                  <Link
                    href={`/findwork/orders/${myContractId}`}
                    className="wd-cta__btn wd-cta__btn--primary"
                  >
                    Mở không gian làm việc
                  </Link>
                </>
              ) : quotePhase === "offered" ? (
                <>
                  <div className="wd-cta-offer" role="status">
                    <FaEnvelopeOpenText className="wd-cta-offer__icon" aria-hidden />
                    <div>
                      <p className="wd-cta-offer__title">Bạn nhận đề xuất từ khách hàng</p>
                      <p className="wd-cta-offer__text">{quotePhaseDescription}</p>
                    </div>
                  </div>
                  <Link href="/findwork/quotes" className="wd-cta__btn wd-cta__btn--primary">
                    Xem báo giá & đề xuất của tôi
                  </Link>
                  <Link href="/findwork/messages" className="wd-cta__btn wd-cta__btn--ghost">
                    <FaCommentDots aria-hidden />
                    Nhắn tin client
                  </Link>
                </>
              ) : quotePhase === "interviewing" ? (
                <>
                  <div className="wd-cta-interview" role="status">
                    <FaVideo aria-hidden />
                    <div>
                      <p className="wd-cta-interview__title">{quotePhaseLabel}</p>
                      <p className="wd-cta-interview__text">{quotePhaseDescription}</p>
                    </div>
                  </div>
                  <Link href="/findwork/messages" className="wd-cta__btn wd-cta__btn--primary">
                    <FaCommentDots aria-hidden />
                    Trả lời client
                  </Link>
                  <Link href="/findwork/quotes" className="wd-cta__btn wd-cta__btn--ghost">
                    Xem báo giá của tôi
                  </Link>
                </>
              ) : quotePhase === "pending" ? (
                <>
                  <div className="wd-cta-pending" role="status">
                    <FaCheckCircle aria-hidden />
                    <div>
                      <p className="wd-cta-pending__title">Đã gửi báo giá</p>
                      <p className="wd-cta-pending__text">{quotePhaseDescription}</p>
                    </div>
                  </div>
                  <Link href="/findwork/quotes" className="wd-cta__btn wd-cta__btn--primary">
                    Theo dõi báo giá
                  </Link>
                </>
              ) : quotePhase === "accepted" ? (
                <div className="wd-cta-success" role="status">
                  <FaCheckCircle aria-hidden />
                  Báo giá đã được chấp nhận — chờ khách hàng tạo hợp đồng hoặc kiểm tra không gian làm việc.
                </div>
              ) : quotePhase === "declined" ? (
                <>
                  <div className="wd-cta__error" role="status">
                    Khách hàng đã từ chối báo giá trước đó. Bạn có thể gửi báo giá mới nếu việc vẫn đang tuyển.
                  </div>
                  {isGuest ? (
                    <Link
                      href={`/dang-nhap?next=/work/detail/${job.id}`}
                      className="wd-cta__btn wd-cta__btn--primary"
                    >
                      Đăng nhập để báo giá
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled={!canSubmitQuote}
                      onClick={openQuoteFlow}
                      className="wd-cta__btn wd-cta__btn--primary"
                    >
                      Gửi báo giá mới
                    </button>
                  )}
                </>
              ) : isGuest ? (
                <Link
                  href={`/dang-nhap?next=/work/detail/${job.id}`}
                  className="wd-cta__btn wd-cta__btn--primary"
                >
                  Đăng nhập để báo giá
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={!canSubmitQuote}
                  onClick={openQuoteFlow}
                  className="wd-cta__btn wd-cta__btn--primary"
                >
                  Gửi yêu cầu báo giá
                </button>
              )}
              <button
                type="button"
                className="wd-cta__btn wd-cta__btn--ghost"
                onClick={() => router.push("/findwork")}
              >
                <FaArrowLeft aria-hidden />
                Quay lại danh sách
              </button>
              <p className="wd-cta__hint">
                {isGuest ? (
                  <Link href="/dang-ky">Chưa có tài khoản? Đăng ký freelancer</Link>
                ) : blocksNewJobQuote(job) ? (
                  <a href="#submit-help">Tại sao tôi không thể gửi báo giá mới?</a>
                ) : (
                  <a href="#submit-help">Hướng dẫn gửi báo giá</a>
                )}
              </p>
            </section>
          </div>
        </aside>
      </div>

      <JobProposalFormModal
        job={job}
        open={proposalOpen}
        onClose={() => setProposalOpen(false)}
        onSuccess={() => void loadJob()}
        isOwnJob={isOwnJob}
        onClientBlocked={() => {
          setProposalOpen(false);
          setClientNoticeOpen(true);
        }}
      />

      <ClientCannotQuoteModal
        open={clientNoticeOpen}
        onClose={() => setClientNoticeOpen(false)}
        jobTitle={job.title}
        jobId={job.id}
        isOwnJob={isOwnJob}
      />
    </div>
  );
}
