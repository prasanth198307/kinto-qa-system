import { useState, useMemo } from "react";

export function usePagination<T>(items: T[], pageSize = 20) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paged = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );

  // Reset to page 1 when items change (e.g. after filter)
  const reset = () => setPage(1);

  return { page: safePage, setPage, totalPages, paged, total: items.length, reset };
}
