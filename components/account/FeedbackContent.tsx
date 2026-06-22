"use client";

import { formatDateUi } from "@/lib/i18n/runtime";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaSearch, FaStar } from "react-icons/fa";
import DashboardPagination from "@/components/dashboard/DashboardPagination";
import { usePagedList } from "@/hooks/usePagedList";
import { listMyFeedback, type FeedbackReview } from "@/lib/api/users";
import "@/components/dashboard/dashboardPagination.css";
import "./feedback.css";

const PAGE_SIZE = 8;

type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";
type CommentFilter = "all" | "with" | "without";
type SortOption = "newest" | "oldest" | "rating_desc" | "rating_asc";

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
  const hasComment = Boolean(item.comment?.trim());

  return (
    <article className="fb-card">
      <div className="fb-card__head">
        {item.job_id ? (
          <Link href={`/work/detail/${item.job_id}`} className="fb-card__job">
            {item.job_title || "Công việc"}
          </Link>
        ) : (
          <span className="fb-card__job fb-card__job--plain">{item.job_title || "Công việc"}</span>
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

function sortReviews(items: FeedbackReview[], sort: SortOption) {
  const list = [...items];
  if (sort === "oldest") {
    return list.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }
  if (sort === "rating_desc") {
    return list.sort((a, b) => Number(b.rating) - Number(a.rating) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  if (sort === "rating_asc") {
    return list.sort((a, b) => Number(a.rating) - Number(b.rating) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  return list.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export default function FeedbackContent() {
  const router = useRouter();

  const [reviews, setReviews] = useState<FeedbackReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [commentFilter, setCommentFilter] = useState<CommentFilter>("all");
  const [sort, setSort] = useState<SortOption>("newest");

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

  const filteredReviews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = reviews;

    if (ratingFilter !== "all") {
      const stars = Number(ratingFilter);
      list = list.filter((item) => Math.round(Number(item.rating) || 0) === stars);
    }

    if (commentFilter === "with") {
      list = list.filter((item) => Boolean(item.comment?.trim()));
    } else if (commentFilter === "without") {
      list = list.filter((item) => !item.comment?.trim());
    }

    if (q) {
      list = list.filter((item) => {
        const haystack = [item.job_title, item.reviewer_name, item.comment]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    return sortReviews(list, sort);
  }, [reviews, searchQuery, ratingFilter, commentFilter, sort]);

  const filterKey = `${searchQuery}|${ratingFilter}|${commentFilter}|${sort}`;
  const { items: pagedReviews, page, totalPages, total, setPage } = usePagedList(
    filteredReviews,
    PAGE_SIZE,
    filterKey,
  );

  function applySearch() {
    setSearchQuery(searchInput.trim());
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      applySearch();
    }
  }

  return (
    <div className="fb-panel">
      <h1 className="fb-heading">Quản lý phản hồi</h1>
      <p className="fb-desc">
        Quản lý những nhận xét bạn đã nhận được về các công việc trước đây.
      </p>

      <div className="fb-toolbar">
        <div className="fb-search">
          <FaSearch className="fb-search__icon" aria-hidden />
          <input
            type="search"
            className="fb-search__input"
            placeholder="Tìm nhận xét..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            aria-label="Tìm nhận xét"
          />
          <button type="button" className="fb-search__btn" onClick={applySearch}>
            Tìm
          </button>
        </div>

        <div className="fb-filters">
          <label className="fb-filter">
            <span className="fb-filter__label">Số sao</span>
            <select
              className="fb-filter__select"
              value={ratingFilter}
              onChange={(event) => setRatingFilter(event.target.value as RatingFilter)}
            >
              <option value="all">Tất cả</option>
              <option value="5">5 sao</option>
              <option value="4">4 sao</option>
              <option value="3">3 sao</option>
              <option value="2">2 sao</option>
              <option value="1">1 sao</option>
            </select>
          </label>

          <label className="fb-filter">
            <span className="fb-filter__label">Nội dung</span>
            <select
              className="fb-filter__select"
              value={commentFilter}
              onChange={(event) => setCommentFilter(event.target.value as CommentFilter)}
            >
              <option value="all">Tất cả</option>
              <option value="with">Có nhận xét</option>
              <option value="without">Chỉ đánh giá sao</option>
            </select>
          </label>

          <label className="fb-filter">
            <span className="fb-filter__label">Sắp xếp</span>
            <select
              className="fb-filter__select"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="rating_desc">Sao cao → thấp</option>
              <option value="rating_asc">Sao thấp → cao</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <p className="fb-loading">Đang tải phản hồi...</p>
      ) : error ? (
        <p className="fb-error" role="alert">
          {error}
        </p>
      ) : filteredReviews.length === 0 ? (
        <p className="fb-empty">
          {reviews.length === 0
            ? "Không có nhận xét nào để hiển thị."
            : "Không có nhận xét nào khớp bộ lọc hiện tại."}
        </p>
      ) : (
        <>
          <p className="fb-summary">
            {total} nhận xét
            {searchQuery ? ` · kết quả cho "${searchQuery}"` : ""}
          </p>
          <div className="fb-list">
            {pagedReviews.map((item) => (
              <FeedbackCard key={item.id} item={item} />
            ))}
          </div>
          <DashboardPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            className="fb-pagination"
            alwaysShow={totalPages > 1}
          />
        </>
      )}
    </div>
  );
}
