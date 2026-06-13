"use client";

import { useEffect, useMemo, useState } from "react";

export function usePagedList<T>(items: T[], pageSize: number, resetKey?: string) {
  const [page, setPage] = useState(1);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [total, pageSize, resetKey]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const safePage = Math.min(Math.max(1, page), totalPages);

  const slice = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  return {
    page: safePage,
    totalPages,
    total,
    pageSize,
    items: slice,
    setPage,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
  };
}
