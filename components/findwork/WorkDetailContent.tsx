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
  FaStar,
  FaUsers,
  FaVideo,
} from "react-icons/fa";
import { getJob, type JobListing } from "@/lib/api/jobs";
import { getUserInitials, resolveAvatarSrc } from "@/lib/authSession";
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
      <div className="wd-skeleton__hero" />
      <div className="wd-skeleton__stats">
        <span />
        <span />
        <span />
        <span />
      </div>
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
    <div className={`wd-stat${highlight ? " wd-stat--highlight" : ""}`}>
      <span className="wd-stat__icon" aria-hidden>
        {icon}
      </span>
      <div className="wd-stat__body">
        <span className="wd-stat__label">{label}</span>
        <span className="wd-stat__value">{value}</span>
      </div>
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
        <nav className="wd-breadcrumb" aria-label="Breadcrumb">
          <Link href="/findwork">Tìm việc làm</Link>
        </nav>
        <div className="wd-error" role="alert">
          {error || "Không tìm thấy công việc."}
        </div>
        <Link href="/findwork" className="wd-back-link">
          <FaArrowLeft aria-hidden />
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const budgetLine = formatJobBudgetLine(job);
  const budgetPrimary = job.budget != null ? formatVnd(job.budget) : "Thỏa thuận";
  const tags = parseJobTags(job.tags);
  const images = parseJobImages(job.images);
  const avatarSrc = resolveAvatarSrc(job.client_avatar_url);
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
      <header className="wd-hero">
        <nav className="wd-breadcrumb" aria-label="Breadcrumb">
          <Link href="/findwork">Tìm việc làm</Link>
          <span className="wd-breadcrumb__sep" aria-hidden>
            /
          </span>
          <span className="wd-breadcrumb__current" aria-current="page">
            Chi tiết
          </span>
        </nav>

        <div className="wd-hero__top">
          <div className="wd-hero__titles">
            <span className={`wd-status wd-status--${statusTone}`}>{jobStatusLabel(job.status)}</span>
            {quotePhase === "offered" ? (
              <div className="wd-offer-ribbon" role="status">
                <FaEnvelopeOpenText aria-hidden />
                Client đã gửi offer cho bạn
              </div>
            ) : null}
            {quotePhase === "interviewing" ? (
              <div className="wd-interview-ribbon" role="status">
                <FaVideo aria-hidden />
                Client mời phỏng vấn / trao đổi thêm
              </div>
            ) : null}
            <h1 className="wd-hero__title">{job.title}</h1>
            <p className="wd-hero__meta">
              <FaClock className="wd-hero__meta-icon" aria-hidden />
              Đăng {relativePosted(job.created_at)}
              <span className="wd-hero__meta-dot" aria-hidden>
                ·
              </span>
              <FaUsers className="wd-hero__meta-icon" aria-hidden />
              {proposalCountLabel(quoteCount)}
            </p>
          </div>
          <Link href="/findwork" className="wd-hero__back">
            <FaArrowLeft aria-hidden />
            <span>Danh sách</span>
          </Link>
        </div>
      </header>

      <div className="wd-stats">
        <StatCard
          icon={<FaMoneyBillWave />}
          label="Ngân sách"
          value={budgetPrimary}
          highlight
        />
        <StatCard
          icon={<FaMapMarkerAlt />}
          label="Vị trí"
          value={job.location_label?.trim() || clientLoc}
        />
        <StatCard
          icon={<FaBriefcase />}
          label="Loại ngân sách"
          value={budgetLine}
        />
        <StatCard
          icon={<FaCalendarAlt />}
          label="Hạn gửi"
          value={job.due_at ? formatDate(job.due_at) : "Không giới hạn"}
        />
      </div>

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
                ? "Offer từ client"
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
                {avatarSrc ? (
                  <Image
                    src={avatarSrc}
                    alt={clientName}
                    width={56}
                    height={56}
                    className="wd-client__avatar"
                    unoptimized
                  />
                ) : (
                  <div className="wd-client__avatar wd-client__avatar--placeholder" aria-hidden>
                    {getUserInitials(job.client_name ?? undefined)}
                  </div>
                )}
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
                    Mở workspace & làm việc
                  </Link>
                </>
              ) : quotePhase === "offered" ? (
                <>
                  <div className="wd-cta-offer" role="status">
                    <FaEnvelopeOpenText className="wd-cta-offer__icon" aria-hidden />
                    <div>
                      <p className="wd-cta-offer__title">Bạn nhận offer từ client</p>
                      <p className="wd-cta-offer__text">{quotePhaseDescription}</p>
                    </div>
                  </div>
                  <Link href="/findwork/quotes" className="wd-cta__btn wd-cta__btn--primary">
                    Xem báo giá & offer của tôi
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
                  Báo giá đã được chấp nhận — chờ client tạo hợp đồng hoặc kiểm tra workspace.
                </div>
              ) : quotePhase === "declined" ? (
                <>
                  <div className="wd-cta__error" role="status">
                    Client đã từ chối báo giá trước đó. Bạn có thể gửi báo giá mới nếu việc vẫn đang tuyển.
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
              {!isOwnJob ? <SaveJobButton jobId={job.id} variant="button" /> : null}
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
