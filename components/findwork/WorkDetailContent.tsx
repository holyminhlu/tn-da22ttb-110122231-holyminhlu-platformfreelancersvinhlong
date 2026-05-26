"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaListUl,
  FaMapMarkerAlt,
  FaStar,
} from "react-icons/fa";
import { acceptJob, getJob, type JobListing } from "@/lib/api/jobs";
import { getUserInitials, resolveAvatarSrc } from "@/lib/authSession";
import { formatDate, formatVnd } from "@/lib/format";
import {
  parseJobImages,
  parseJobTags,
  proposalCountLabel,
  relativePosted,
} from "@/lib/jobsDisplay";
import WorkDetailGallery from "./WorkDetailGallery";

export default function WorkDetailContent() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const jobId = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";

  const [job, setJob] = useState<JobListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
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

  async function handleAccept() {
    if (!job) return;
    setSubmitError("");
    setSubmitting(true);
    try {
      await acceptJob(job.id);
      setAccepted(true);
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

  if (loading) {
    return <p className="wd-loading">Đang tải chi tiết công việc...</p>;
  }

  if (error || !job) {
    return (
      <div>
        <nav className="wd-breadcrumb" aria-label="Breadcrumb">
          <Link href="/findwork">Tìm việc làm</Link>
        </nav>
        <div className="wd-error" role="alert">
          {error || "Không tìm thấy công việc."}
        </div>
        <p className="mt-4">
          <Link href="/findwork" className="wd-guru-blue inline-flex items-center gap-2 text-sm font-semibold">
            <FaArrowLeft aria-hidden />
            Quay lại danh sách
          </Link>
        </p>
      </div>
    );
  }

  const budgetText = job.budget != null ? formatVnd(job.budget) : "Thỏa thuận";
  const tags = parseJobTags(job.tags);
  const images = parseJobImages(job.images);
  const avatarSrc = resolveAvatarSrc(job.client_avatar_url);
  const clientLocation =
    job.client_district_city?.trim() || job.location_label?.trim() || "—";
  const categoryLabel = job.category?.trim() || null;

  return (
    <>
      <nav className="wd-breadcrumb" aria-label="Breadcrumb">
        <Link href="/findwork">Tìm việc làm</Link>
        <span className="wd-breadcrumb__sep" aria-hidden>
          /
        </span>
        <span aria-current="page">{job.title}</span>
      </nav>

      <div className="wd-layout">
        <article className="wd-panel wd-panel--main">
          <h1 className="wd-title">{job.title}</h1>

          <div className="wd-meta">
            <span>
              Đăng <strong>{relativePosted(job.created_at)}</strong>
            </span>
            <span>{proposalCountLabel(job.proposal_count)}</span>
            {job.due_at ? (
              <span>
                Hạn gửi trước: <strong>{formatDate(job.due_at)}</strong>
              </span>
            ) : null}
          </div>

          <div className="wd-highlights">
            <div>
              <span className="wd-highlight__label">Ngân sách</span>
              <span className="wd-highlight__value wd-highlight__value--budget">{budgetText}</span>
            </div>
            {job.location_label ? (
              <div>
                <span className="wd-highlight__label">Vị trí</span>
                <span className="wd-highlight__value">
                  <FaMapMarkerAlt className="mr-1 inline text-gray-400" aria-hidden />
                  {job.location_label}
                </span>
              </div>
            ) : null}
            {categoryLabel ? (
              <div>
                <span className="wd-highlight__label">Danh mục</span>
                <span className="wd-highlight__value">{categoryLabel}</span>
              </div>
            ) : null}
          </div>

          {images.length > 0 ? <WorkDetailGallery images={images} title={job.title} /> : null}

          <h2 className="wd-section-title">Mô tả công việc</h2>
          <p className="wd-description">{job.description?.trim() || "Chưa có mô tả chi tiết."}</p>

          {categoryLabel || tags.length > 0 ? (
            <div className="wd-tags">
              {categoryLabel ? (
                <span className="wd-tag wd-tag--category">
                  <FaListUl className="mr-1 inline" aria-hidden />
                  {categoryLabel}
                </span>
              ) : null}
              {tags.map((skill) => (
                <span key={skill} className="wd-tag">
                  {skill}
                </span>
              ))}
            </div>
          ) : null}
        </article>

        <aside className="wd-panel wd-panel--aside">
          <div className="wd-client">
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt={job.client_name || "Khách hàng"}
                width={48}
                height={48}
                className="wd-client__avatar"
                unoptimized
              />
            ) : (
              <div className="wd-client__avatar wd-client__avatar--placeholder" aria-hidden>
                {getUserInitials(job.client_name ?? undefined)}
              </div>
            )}
            <div>
              <div className="wd-client__name">{job.client_name || "Khách hàng"}</div>
              <div className="wd-client__loc">
                {clientLocation}
                {job.client_email_verified ? (
                  <FaCheckCircle
                    className="ml-1 inline text-green-500"
                    title="Email đã xác minh"
                    aria-label="Email đã xác minh"
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div className="wd-cta">
            {accepted ? (
              <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-center text-sm text-green-800">
                Đã gửi yêu cầu báo giá thành công.
              </p>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleAccept()}
                className="wd-cta__btn wd-cta__btn--primary"
              >
                {submitting ? "Đang gửi..." : "Gửi yêu cầu báo giá"}
              </button>
            )}
            <button
              type="button"
              className="wd-cta__btn wd-cta__btn--ghost"
              aria-label="Lưu việc"
            >
              <FaStar className="mr-1 inline" aria-hidden />
              Lưu việc
            </button>
            <button
              type="button"
              className="wd-cta__btn wd-cta__btn--ghost"
              onClick={() => router.push("/findwork")}
            >
              <FaArrowLeft className="mr-1 inline" aria-hidden />
              Danh sách việc
            </button>
            {submitError ? (
              <p className="text-center text-xs text-red-600" role="alert">
                {submitError}
              </p>
            ) : null}
            <p className="wd-cta__hint">
              <a href="#submit-help">Tại sao tôi không thể nộp đơn?</a>
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
