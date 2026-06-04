"use client";

type DashboardPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export default function DashboardPagination({
  page,
  totalPages,
  total,
  onPageChange,
  className = "",
}: DashboardPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      className={`dashboard-pagination${className ? ` ${className}` : ""}`}
      aria-label="Phân trang"
    >
      <button
        type="button"
        className="dashboard-pagination__btn"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Trước
      </button>
      <span className="dashboard-pagination__info">
        Trang {page}/{totalPages} · {total} mục
      </span>
      <button
        type="button"
        className="dashboard-pagination__btn"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Sau
      </button>
    </nav>
  );
}
