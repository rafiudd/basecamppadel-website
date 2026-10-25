import Link from "next/link";

const btnClass = "btn min-h-10 px-4 tracking-button disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap";

/** Prev/next pager for a client-side paginated table. Hidden when everything fits on one page. */
export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 pt-1">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className={btnClass}>
        ← Sebelumnya
      </button>
      <span className="text-sm text-snow/65 whitespace-nowrap">Halaman {page} dari {totalPages}</span>
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className={btnClass}>
        Selanjutnya →
      </button>
    </div>
  );
}

/** Prev/next pager for a server-rendered table paginated via `?page=` — same look as `Pagination`,
 *  but as links so the page stays server-driven (no client state). */
export function LinkPagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (page: number) => string }) {
  if (totalPages <= 1) return null;
  const linkClass = (disabled: boolean) => `${btnClass} no-underline text-center text-snow ${disabled ? "pointer-events-none" : ""}`;
  return (
    <div className="flex items-center justify-between gap-3 pt-1">
      <Link href={hrefFor(Math.max(1, page - 1))} aria-disabled={page <= 1} className={linkClass(page <= 1)}>
        ← Sebelumnya
      </Link>
      <span className="text-sm text-snow/65 whitespace-nowrap">Halaman {page} dari {totalPages}</span>
      <Link href={hrefFor(Math.min(totalPages, page + 1))} aria-disabled={page >= totalPages} className={linkClass(page >= totalPages)}>
        Selanjutnya →
      </Link>
    </div>
  );
}
