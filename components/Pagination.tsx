interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (p: number) => void;
}

export default function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, totalItems);

  // 페이지 번호 목록 생성 (최대 7개 표시)
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3)             pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  const btnBase = "px-3 py-1.5 text-sm rounded-lg border transition select-none";
  const active  = `${btnBase} bg-indigo-600 text-white border-indigo-600 font-semibold`;
  const inactive = `${btnBase} border-gray-200 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 cursor-pointer`;
  const disabled = `${btnBase} border-gray-100 text-gray-300 cursor-not-allowed`;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1">
      <p className="text-xs text-gray-400">
        전체 <span className="font-semibold text-gray-600">{totalItems.toLocaleString()}</span>개 중{" "}
        <span className="font-semibold text-gray-600">{from}–{to}</span>번째
      </p>

      <div className="flex items-center gap-1.5">
        {/* 이전 */}
        <button
          className={page === 1 ? disabled : inactive}
          onClick={() => page > 1 && onPageChange(page - 1)}
          disabled={page === 1}
        >
          ‹ 이전
        </button>

        {/* 페이지 번호 */}
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm">…</span>
          ) : (
            <button
              key={p}
              className={p === page ? active : inactive}
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </button>
          )
        )}

        {/* 다음 */}
        <button
          className={page === totalPages ? disabled : inactive}
          onClick={() => page < totalPages && onPageChange(page + 1)}
          disabled={page === totalPages}
        >
          다음 ›
        </button>
      </div>
    </div>
  );
}
