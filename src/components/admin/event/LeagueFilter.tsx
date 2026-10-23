"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** League picker shown under the "Liga" tab; narrows the event list to one league via `?league=`. */
export function LeagueFilter({ leagues, value }: { leagues: { id: string; name: string; count: number }[]; value: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2.5">
      <span className="text-2xs tracking-caps text-snow/65 uppercase font-medium whitespace-nowrap">Liga</span>
      <select
        value={value}
        onChange={(e) => {
          const id = e.target.value;
          startTransition(() => router.replace(id ? `/admin/events?type=liga&league=${id}` : "/admin/events?type=liga", { scroll: false }));
        }}
        aria-busy={pending}
        className={`field min-h-10 w-full md:w-72 ${pending ? "opacity-60" : ""}`}
      >
        <option value="">Semua liga</option>
        {leagues.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name} ({l.count})
          </option>
        ))}
      </select>
    </label>
  );
}
