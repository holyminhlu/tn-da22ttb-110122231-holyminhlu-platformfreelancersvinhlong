"use client";

import { formatDateUi, tUi, formatVndUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FaCheckCircle, FaListUl, FaMapMarkerAlt } from "react-icons/fa";
import { type JobListing } from "@/lib/api/jobs";
import UserAvatar from "@/components/ui/UserAvatar";
import {
  parseJobImages,
  parseJobTags,
  proposalCountLabel,
  relativePosted,
} from "@/lib/jobsDisplay";
import {
  blocksNewJobQuote,
  resolveFreelancerJobQuotePhase,
} from "@/lib/findwork/workDetailQuote";
import ClientCannotQuoteModal from "./ClientCannotQuoteModal";
import JobCardMedia from "./JobCardMedia";
import JobProposalFormModal from "./JobProposalFormModal";
import SaveJobButton from "./SaveJobButton";
import { useStoredUser } from "@/hooks/useStoredUser";

type JobCardProps = {
  job: JobListing;
  onAccepted?: (jobId: string) => void;
  onSavedChange?: (saved: boolean) => void;
  /** Khách chưa đăng nhập — chỉ xem, không gửi báo giá trực tiếp. */
  guestMode?: boolean;
};

export default function JobCard({
  job, onAccepted, onSavedChange, guestMode = false }: JobCardProps) {  const { t, formatVnd, formatDate } = useTranslation();

  const { user, isClient } = useStoredUser({ refreshFromApi: false });
  const [proposalOpen, setProposalOpen] = useState(false);
  const [clientNoticeOpen, setClientNoticeOpen] = useState(false);
  const isOwnJob = Boolean(user?.id && job.client_id && String(user.id) === String(job.client_id));
  const quotePhase = resolveFreelancerJobQuotePhase(job);
  const hasActiveQuote = blocksNewJobQuote(job);
  const canSubmit = String(job.status).toLowerCase() === "open" && !hasActiveQuote;

  const budgetText = job.budget != null ? formatVndUi(job.budget) : "Thỏa thuận";
  const tags = parseJobTags(job.tags);
  const images = parseJobImages(job.images);
  const hasMedia = images.length > 0;
  const clientLocation =
    job.client_district_city?.trim() || job.location_label?.trim() || "—";
  const categoryLabel = job.category?.trim() || null;

  function handleProposalSuccess() {
    onAccepted?.(job.id);
  }

  function quoteStatusChip() {
    if (quotePhase === "offered") {
      return (
        <span className="rounded border border-amber-300 bg-amber-50 px-4 py-1.5 text-sm font-semibold text-amber-800">
          Nhận offer
        </span>
      );
    }
    if (quotePhase === "interviewing") {
      return (
        <span className="rounded border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-semibold text-violet-800">
          Phỏng vấn
        </span>
      );
    }
    if (quotePhase === "pending") {
      return (
        <span className="rounded border border-green-200 bg-green-50 px-4 py-1.5 text-sm font-semibold text-green-700">
          Đã gửi báo giá
        </span>
      );
    }
    if (quotePhase === "accepted") {
      return (
        <span className="rounded border border-green-200 bg-green-50 px-4 py-1.5 text-sm font-semibold text-green-700">
          Đã được chọn
        </span>
      );
    }
    return null;
  }

  const quoteChip = quoteStatusChip();

  function openQuoteFlow() {
    if (isClient) {
      setClientNoticeOpen(true);
      return;
    }
    setProposalOpen(true);
  }

  return (
    <article
      className={`fw-card-shadow fw-job-card mb-4 border border-gray-200 bg-white p-5 transition-shadow${hasMedia ? " fw-job-card--has-media" : ""}`}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <input type="checkbox" className="mt-0.5" aria-label={`Chọn ${job.title}`} />
          <span>
            Đăng {relativePosted(job.created_at)} • {proposalCountLabel(job.proposal_count)}
          </span>
        </div>
        {job.due_at ? (
          <div className="text-right text-xs text-gray-500">
            Hạn gửi trước ngày:{" "}
            <span className="font-semibold text-gray-700">{formatDateUi(job.due_at)}</span>
          </div>
        ) : null}
      </div>

      <div className={`fw-card__body${hasMedia ? " fw-card__body--with-media" : ""}`}>
        <div className="fw-card__main min-w-0 flex-1">
          <h3 className="mb-1 text-xl font-bold">
            <Link
              href={`/work/detail/${job.id}`}
              className="fw-guru-blue hover:underline"
            >
              {job.title}
            </Link>
          </h3>
          <div className="mb-3 flex flex-wrap items-center gap-x-4 text-sm">
            <span className="font-bold text-gray-800">Ngân sách | {budgetText}</span>
            {job.location_label ? (
              <span className="text-gray-500">
                <FaMapMarkerAlt className="mr-1 inline" aria-hidden />
                {job.location_label}
              </span>
            ) : null}
          </div>

          {!hasMedia ? (
            <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-gray-600">
              {job.description || "—"}
            </p>
          ) : null}

          {categoryLabel || tags.length > 0 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {categoryLabel ? (
                <span className="flex items-center rounded border bg-gray-100 px-2 py-1 text-[11px] text-gray-600">
                  <FaListUl className="mr-1" aria-hidden />
                  {categoryLabel}
                </span>
              ) : null}
              {tags.map((skill) => (
                <span
                  key={skill}
                  className="rounded border bg-gray-50 px-2 py-1 text-[11px] text-gray-500"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex items-center space-x-3">
            <UserAvatar
              src={job.client_avatar_url}
              name={job.client_name}
              size={40}
              className="h-10 w-10"
              alt={job.client_name || t("Khách hàng")}
            />
            <div>
              <div className="cursor-pointer text-sm font-bold text-blue-600 hover:underline">
                {job.client_name || t("Khách hàng")}
              </div>
              <div className="flex items-center text-xs text-gray-500">
                {clientLocation}
                {job.client_email_verified ? (
                  <FaCheckCircle
                    className="ml-1 text-green-500"
                    title={t("Email đã xác minh")}
                    aria-label={t("Email đã xác minh")}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {hasMedia ? <JobCardMedia images={images} title={job.title} /> : null}

        <div className="fw-card__aside flex flex-col items-end">
          <div className="mb-3 flex flex-col items-end gap-2">
            {guestMode ? (
              <>
                <Link
                  href="/dang-nhap?next=/findwork"
                  className="fw-btn-primary whitespace-nowrap rounded px-4 py-1.5 text-sm font-semibold text-white"
                >
                  Đăng nhập để báo giá
                </Link>
                {!isOwnJob ? (
                  <SaveJobButton jobId={job.id} onToggled={onSavedChange} />
                ) : null}
              </>
            ) : (
              <div className="flex space-x-2">
                {!isOwnJob ? (
                  <SaveJobButton jobId={job.id} onToggled={onSavedChange} />
                ) : null}
                {quoteChip ? (
                  quoteChip
                ) : (
                  <button
                    type="button"
                    disabled={!canSubmit}
                    onClick={openQuoteFlow}
                    className="fw-btn-primary rounded px-4 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Gửi báo giá
                  </button>
                )}
              </div>
            )}
          </div>
          {guestMode ? (
            <Link href="/dang-ky" className="text-[11px] text-[#0066cc] hover:underline">
              Chưa có tài khoản? Đăng ký
            </Link>
          ) : (
            <a href="#submit-help" className="text-[11px] text-blue-500 hover:underline">
              Tại sao tôi không thể nộp đơn?
            </a>
          )}
        </div>
      </div>

      {hasMedia ? (
        <p className="mt-4 line-clamp-3 border-t border-gray-100 pt-4 text-sm leading-relaxed text-gray-600">
          {job.description || "—"}
        </p>
      ) : null}

      <JobProposalFormModal
        job={job}
        open={proposalOpen}
        onClose={() => setProposalOpen(false)}
        onSuccess={handleProposalSuccess}
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
    </article>
  );
}
