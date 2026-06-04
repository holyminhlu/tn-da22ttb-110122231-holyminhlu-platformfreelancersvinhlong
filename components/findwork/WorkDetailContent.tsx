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
  FaListUl,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaStar,
  FaUsers,
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
  const { user, ready } = useStoredUser({ refreshFromApi: false });
  const isGuest = ready && !user;
  const rawId = params?.id;
  const jobId = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";

  const [job, setJob] = useState<JobListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [proposalOpen, setProposalOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);

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

  useEffect(() => {
    if (!job) return;
    setAccepted(Boolean(job.has_my_pending_quote));
  }, [job]);

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
  const myQuoteStatus = job.my_quote_status ? String(job.my_quote_status).toLowerCase() : null;

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
            <h2 className="wd-card__title">Gửi báo giá</h2>
            <p className="wd-help-text">
              Nhấn <strong>Gửi yêu cầu báo giá</strong> để client nhận hồ sơ của bạn. Việc chỉ nhận đơn khi
              trạng thái là <em>Đang tuyển</em> và bạn chưa gửi đơn trước đó.
            </p>
            {!isOpen ? (
              <p className="wd-help-warn">Công việc này hiện không còn nhận báo giá mới.</p>
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

            <section className="wd-card wd-cta-card">
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
              ) : accepted || myQuoteStatus === "accepted" ? (
                <div className="wd-cta-success" role="status">
                  <FaCheckCircle aria-hidden />
                  {myQuoteStatus === "accepted"
                    ? "Báo giá của bạn đã được chấp nhận — chờ hợp đồng được tạo."
                    : "Đã gửi yêu cầu báo giá thành công."}
                </div>
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
                  disabled={!isOpen || accepted}
                  onClick={() => setProposalOpen(true)}
                  className="wd-cta__btn wd-cta__btn--primary"
                >
                  Gửi yêu cầu báo giá
                </button>
              )}
              <button type="button" className="wd-cta__btn wd-cta__btn--ghost" aria-label="Lưu việc">
                <FaStar aria-hidden />
                Lưu việc
              </button>
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
                ) : (
                  <a href="#submit-help">Tại sao tôi không thể nộp đơn?</a>
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
        onSuccess={() => setAccepted(true)}
      />
    </div>
  );
}
