// src/shared/types/pagination.ts

/** Sort direction accepted by every paginated repository query. */
export type SortDirection = "asc" | "desc";

/** Inbound pagination request (already coerced + defaulted by Zod). */
export interface PageRequest {
  page: number;
  limit: number;
  sortDir?: SortDirection;
}

/** Raw repository result: one page of rows plus the total match count. */
export interface Page<T> {
  items: T[];
  total: number;
}

/** Pagination envelope returned to HTTP clients. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
