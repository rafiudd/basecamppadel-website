import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadLeagues } from "@/lib/leagues";
import { TrophyIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Admin · Liga — Basecamp Padel" };

export default async function AdminLigaPage() {
  const supabase = await createClient();
  const leagues = await loadLeagues(supabase);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Liga"
        description="Tiap volume = event Kompetisi biasa. Poinnya dijumlah otomatis ke klasemen liga."
        actions={
          <Link href="/admin/liga/new" className="btn btn-coral tracking-button text-ink min-h-11 inline-flex items-center gap-2 no-underline whitespace-nowrap">
            + Buat Liga
          </Link>
        }
      />

      {leagues.length === 0 ? (
        <div className="bg-ink-3 rounded-panel p-8 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo text-volt flex items-center justify-center">
            <TrophyIcon className="w-6 h-6" />
          </div>
          <div className="font-display font-bold text-lg text-snow">Belum ada liga</div>
          <p className="text-sm text-snow/70 max-w-sm m-0">
            Buat liga berseri pertamamu untuk mengelompokkan beberapa volume kompetisi dan menghitung klasemen otomatis.
          </p>
          <Link href="/admin/liga/new" className="btn btn-coral text-ink mt-2 no-underline">
            + Buat Liga Baru
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {leagues.map((l) => {
            const activeVol = l.volumes.find((v) => v.event?.status === "active")
              ?? l.volumes.find((v) => !v.event)
              ?? l.volumes[l.volumes.length - 1];
            const currentVolNum = activeVol?.volume_number ?? 1;

            return (
              <div
                key={l.id}
                className="bg-ink-3 rounded-card p-4 md:p-5 flex items-center justify-between gap-4 transition-colors hover:bg-ink-2"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-indigo text-volt flex items-center justify-center flex-none">
                    <TrophyIcon className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="font-display font-bold text-title-sm text-snow truncate">{l.name}</div>
                    <div className="text-caption text-snow/70 truncate">
                      {l.organizer ? `${l.organizer} · ` : ""}Vol. {currentVolNum} dari {l.total_volumes}
                    </div>
                  </div>
                </div>

                <Link
                  href={`/admin/liga/${l.id}`}
                  className="btn min-h-11 px-4 md:px-5 inline-flex items-center justify-center no-underline flex-none"
                >
                  Buka
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
