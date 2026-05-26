"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { FaCheckCircle, FaListUl, FaMapMarkerAlt, FaStar } from "react-icons/fa";
import { acceptJob, type JobListing } from "@/lib/api/jobs";
import { getUserInitials, resolveAvatarSrc } from "@/lib/authSession";
import { formatDate, formatVnd } from "@/lib/format";
import {
  parseJobImages,
  parseJobTags,
  proposalCountLabel,
  relativePosted,
} from "@/lib/jobsDisplay";
import JobCardMedia from "./JobCardMedia";

type JobCardProps = {
  job: JobListing;
  onAccepted?: (jobId: string) => void;
};

export default function JobCard({ job, onAccepted }: JobCardProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const budgetText = job.budget != null ? formatVnd(job.budget) : "Thỏa thuận";
  const tags = parseJobTags(job.tags);
  const images = parseJobImages(job.images);
  const hasMedia = images.length > 0;
  const avatarSrc = resolveAvatarSrc(job.client_avatar_url);
  const clientLocation =
    job.client_district_city?.trim() || job.location_label?.trim() || "—";
  const categoryLabel = job.category?.trim() || null;

  async function handleAccept() {
    setSubmitError("");
    setSubmitting(true);
    try {
      await acceptJob(job.id);
      onAccepted?.(job.id);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể gửi yêu cầu báo giá.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article
      className={`fw-card-shadow fw-job-card mb-4 rounded border border-gray-200 bg-white p-5 transition-shadow${hasMedia ? " fw-job-card--has-media" : ""}`}
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
            <span className="font-semibold text-gray-700">{formatDate(job.due_at)}</span>
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
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt={job.client_name || "Khách hàng"}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full bg-gray-200 object-cover"
                unoptimized
              />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600"
                aria-hidden
              >
                {getUserInitials(job.client_name ?? undefined)}
              </div>
            )}
            <div>
              <div className="cursor-pointer text-sm font-bold text-blue-600 hover:underline">
                {job.client_name || "Khách hàng"}
              </div>
              <div className="flex items-center text-xs text-gray-500">
                {clientLocation}
                {job.client_email_verified ? (
                  <FaCheckCircle
                    className="ml-1 text-green-500"
                    title="Email đã xác minh"
                    aria-label="Email đã xác minh"
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {hasMedia ? <JobCardMedia images={images} title={job.title} /> : null}

        <div className="fw-card__aside flex flex-col items-end">
          <div className="mb-3 flex space-x-2">
            <button
              type="button"
              className="rounded border p-2 text-gray-400 hover:text-blue-600"
              aria-label="Lưu việc"
            >
              <FaStar />
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleAccept()}
              className="rounded bg-blue-300 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-400 disabled:opacity-60"
            >
              {submitting ? "Đang gửi..." : "Gửi yêu cầu báo giá"}
            </button>
          </div>
          {submitError ? (
            <p className="mb-2 max-w-[12rem] text-right text-[11px] text-red-600" role="alert">
              {submitError}
            </p>
          ) : null}
          <a href="#submit-help" className="text-[11px] text-blue-500 hover:underline">
            Tại sao tôi không thể nộp đơn?
          </a>
        </div>
      </div>

      {hasMedia ? (
        <p className="mt-4 line-clamp-3 border-t border-gray-100 pt-4 text-sm leading-relaxed text-gray-600">
          {job.description || "—"}
        </p>
      ) : null}
    </article>
  );
}
