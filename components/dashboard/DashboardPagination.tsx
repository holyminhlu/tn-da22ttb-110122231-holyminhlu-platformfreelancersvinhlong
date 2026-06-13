"use client";

type DashboardPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
  /** Hiển thị cả khi chỉ có 1 trang (ví dụ bảng giao dịch). */
  alwaysShow?: boolean;
  pageSize?: number;
};

export default function DashboardPagination({
  page,
  totalPages,
  total,
  onPageChange,
  className = "",
  alwaysShow = false,
  pageSize,
}: DashboardPaginationProps) {
  if (total === 0) return null;
  if (totalPages <= 1 && !alwaysShow) return null;

  const rangeStart = total === 0 ? 0 : (page - 1) * (pageSize ?? 0) + 1;
  const rangeEnd =
    pageSize != null ? Math.min(page * pageSize, total) : total;

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
        {pageSize != null && total > 0
          ? `Hiển thị ${rangeStart}–${rangeEnd} / ${total} · Trang ${page}/${totalPages}`
          : `Trang ${page}/${totalPages} · ${total} mục`}
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
