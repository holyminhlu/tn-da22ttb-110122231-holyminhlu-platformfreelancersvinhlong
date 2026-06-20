"use client";

import { formatDateUi, tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import { useCallback, useEffect, useState } from "react";
import {
  listMyServiceReviews,
  replyServiceReview,
  type ServiceReviewRow,
} from "@/lib/api/services";
import ServicesShell from "./ServicesShell";

export default function ServiceReviewsPage() {  const { t, formatDate } = useTranslation();
  const [reviews, setReviews] = useState<ServiceReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReviews(await listMyServiceReviews());
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể tải đánh giá.";
      setError(message);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitReply(reviewId: string) {
  const t = tUi;
  const formatDate = formatDateUi;
    const reply = replyDraft[reviewId]?.trim();
    if (!reply) return;
    setBusyId(reviewId);
    try {
      await replyServiceReview(reviewId, reply);
      setReplyDraft((prev) => ({ ...prev, [reviewId]: "" }));
      await load();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Không thể gửi phản hồi.";
      alert(message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <ServicesShell>
      <header className="svc-hub__head">
        <div>
          <h1 className="svc-hub__title">{t("Đánh giá &amp; Phản hồi")}</h1>
          <p className="svc-hub__lead">
            {t("Xem đánh giá khách hàng sau khi hoàn thành đơn dịch vụ và phản hồi để tăng uy tín trên nền tảng.")}
          </p>
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-gray-500">{t("Đang tải...")}</p>
      ) : error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : reviews.length === 0 ? (
        <div className="svc-panel text-sm text-gray-600 text-center">
          {t("Chưa có đánh giá nào. Đánh giá xuất hiện sau khi khách hàng nghiệm thu đơn dịch vụ.")}
        </div>
      ) : (
        <div className="svc-review__list">
          {reviews.map((review) => (
            <article key={review.id} className="svc-review__item">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="svc-review__stars">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {review.clientName || "Khách hàng"} · {review.serviceTitle || "Dịch vụ"}
                  </p>
                  <p className="text-xs text-gray-500">{formatDateUi(review.createdAt)}</p>
                </div>
              </div>
              {review.comment ? (
                <p className="mt-2 text-sm text-gray-700 leading-relaxed">{review.comment}</p>
              ) : (
                <p className="mt-2 text-sm text-gray-400 italic">{t("Không có nhận xét văn bản.")}</p>
              )}
              {review.freelancerReply ? (
                <div className="mt-3 rounded bg-blue-50 border border-blue-100 p-3 text-sm text-gray-700">
                  <strong>{t("Phản hồi của bạn:")}</strong> {review.freelancerReply}
                  {review.freelancerReplyAt ? (
                    <span className="block text-xs text-gray-500 mt-1">
                      {formatDateUi(review.freelancerReplyAt)}
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="mt-3">
                  <textarea
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                    rows={2}
                    placeholder={t("Viết phản hồi lịch sự, chuyên nghiệp...")}
                    value={replyDraft[review.id] ?? ""}
                    onChange={(e) =>
                      setReplyDraft((prev) => ({ ...prev, [review.id]: e.target.value }))
                    }
                  />
                  <button
                    type="button"
                    className="svc-btn svc-btn--primary mt-2"
                    disabled={busyId === review.id}
                    onClick={() => void submitReply(review.id)}
                  >
                    {busyId === review.id ? "Đang gửi..." : "Gửi phản hồi"}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </ServicesShell>
  );
}
