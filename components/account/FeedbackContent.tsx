"use client";

import { formatDateUi, tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaStar } from "react-icons/fa";
import { listMyFeedback, type FeedbackReview } from "@/lib/api/users";
import { formatDate } from "@/lib/format";
import "./feedback.css";

type FeedbackTab = "reviews" | "testimonials";

const TESTIMONIAL_MIN_LENGTH = 30;

function StarRating({ rating }: { rating: number }) {
  const value = Math.min(5, Math.max(0, Math.round(Number(rating) || 0)));
  return (
    <div className="fb-stars" aria-label={`${value} trên 5 sao`}>
      {Array.from({ length: 5 }, (_, i) => (
        <FaStar
          key={i}
          className={`fb-star${i < value ? " fb-star--on" : ""}`}
          aria-hidden
        />
      ))}
    </div>
  );
}

function FeedbackCard({ item }: { item: FeedbackReview }) {
  const formatDate = formatDateUi;
  const hasComment = Boolean(item.comment?.trim());

  return (
    <article className="fb-card">
      <div className="fb-card__head">
        {item.job_id ? (
          <Link href={`/work/detail/${item.job_id}`} className="fb-card__job">
            {item.job_title || "Công việc"}
          </Link>
        ) : (
          <span className="fb-card__job" style={{ color: "#374151" }}>
            {item.job_title || "Công việc"}
          </span>
        )}
        <time className="fb-card__date" dateTime={item.created_at}>
          {formatDateUi(item.created_at)}
        </time>
      </div>
      <StarRating rating={item.rating} />
      {item.reviewer_name ? (
        <p className="fb-card__reviewer">Từ: {item.reviewer_name}</p>
      ) : null}
      {hasComment ? (
        <p className="fb-card__comment">{item.comment}</p>
      ) : (
        <p className="fb-card__no-comment">Không có nội dung nhận xét.</p>
      )}
    </article>
  );
}

export default function FeedbackContent() {
  const { t, formatDate } = useTranslation();

  const router = useRouter();
  const [tab, setTab] = useState<FeedbackTab>("reviews");
  const [reviews, setReviews] = useState<FeedbackReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listMyFeedback();
      setReviews(data.reviews ?? []);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải phản hồi.";
      setError(message);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("vlc_access_token") : null;
    if (!token) {
      router.replace("/dang-nhap");
      return;
    }
    void load();
  }, [load, router]);

  const testimonials = useMemo(
    () =>
      reviews.filter((r) => (r.comment?.trim().length ?? 0) >= TESTIMONIAL_MIN_LENGTH),
    [reviews],
  );

  const visible = tab === "testimonials" ? testimonials : reviews;

  return (
    <div className="fb-panel">
      <h1 className="fb-heading">Quản lý phản hồi</h1>

      <div className="fb-tabs" role="tablist" aria-label="Loại phản hồi">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "reviews"}
          className={`fb-tab${tab === "reviews" ? " fb-tab--active" : ""}`}
          onClick={() => setTab("reviews")}
        >
          Nhận xét
        </button>
        <span className="fb-tab-sep" aria-hidden>
          |
        </span>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "testimonials"}
          className={`fb-tab${tab === "testimonials" ? " fb-tab--active" : ""}`}
          onClick={() => setTab("testimonials")}
        >
          Lời chứng thực
        </button>
      </div>

      <p className="fb-desc">
        Quản lý những phản hồi bạn đã nhận được về các công việc trước đây.
      </p>

      {loading ? (
        <p className="fb-loading">Đang tải phản hồi...</p>
      ) : error ? (
        <p className="fb-error" role="alert">
          {error}
        </p>
      ) : visible.length === 0 ? (
        <p className="fb-empty">Không có phản hồi nào để hiển thị.</p>
      ) : (
        <div className="fb-list" role="tabpanel">
          {visible.map((item) => (
            <FeedbackCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
