"use client";

import { useTransition } from "react";
import { unwrap } from "@/lib/actionState";
import { toast } from "@/components/ui/Toast";
import { finishAllActiveMabarAction } from "@/app/admin/events/mabar-actions";

/** Bulk "Selesaikan" for every mabar event still marked active — same per-event checks as the single-event button. */
export function FinishAllActiveMabarButton({ count }: { count: number }) {
  const [isPending, startTransition] = useTransition();
  if (count === 0) return null;

  const run = () => {
    if (!confirm(`Coba selesaikan ${count} mabar yang masih berjalan? Yang sudah lengkap skornya akan langsung dikunci, poin leaderboard-nya dihitung, dan statusnya jadi Selesai. Yang belum lengkap dilewati.`)) return;
    startTransition(async () => {
      try {
        const { finished, skipped } = unwrap(await finishAllActiveMabarAction());
        if (finished.length) toast.success(`Selesai: ${finished.join(", ")}`);
        if (skipped.length) {
          toast.error(`Dilewati (${skipped.length}): ${skipped.map((s) => `${s.title} — ${s.reason}`).join(" · ")}`);
        }
        if (!finished.length && !skipped.length) toast.success("Tidak ada yang berjalan.");
        if (finished.length) location.reload();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal.");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={isPending}
      data-loading={isPending || undefined}
      className="btn tracking-button text-sm whitespace-nowrap disabled:opacity-50"
    >
      Selesaikan semua berjalan ({count})
    </button>
  );
}
