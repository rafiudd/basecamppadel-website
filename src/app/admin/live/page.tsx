import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { courtNameOf, loadCompetition } from "@/lib/compData";
import { matchName } from "@/lib/compLabels";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PhoneIcon } from "@/components/ui/icons";
import { LiveControl } from "@/components/admin/live/LiveControl";
import { LiveEventBar } from "@/components/admin/live/LiveEventBar";
import { MatchQueue, pickCurrentMatch } from "@/components/admin/live/MatchQueue";
import { NoRunningEvent } from "@/components/admin/live/NoRunningEvent";
import { FinishedNotice } from "@/components/admin/live/FinishedNotice";
import type { CompEvent } from "@/lib/database.types";

export default async function LiveAdmin({ searchParams }: { searchParams: Promise<{ event?: string; match?: string; done?: string }> }) {
  const { event: eventParam, match: matchParam, done: doneParam } = await searchParams;
  const supabase = await createClient();
  const [{ data: events }, { data: liveRows }] = await Promise.all([
    supabase.from("events").select("*").neq("status", "finished").order("event_date", { nullsFirst: false }).order("created_at", { ascending: false }),
    supabase.from("matches").select("event_id").eq("is_live", true),
  ]);
  const all = (events ?? []) as CompEvent[];
  const running = all.filter((e) => e.status === "active");
  const onAir = new Set((liveRows ?? []).map((r) => r.event_id));
  const event = all.find((e) => e.id === eventParam) ?? running.find((e) => onAir.has(e.id)) ?? running[0] ?? null;

  if (!event) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Live" />
        <NoRunningEvent drafts={all.filter((e) => e.status === "draft")} />
      </div>
    );
  }

  const data = await loadCompetition(supabase, { id: event.id });
  if (!data) return null;
  const current = pickCurrentMatch(data.matches, matchParam);
  const done = data.matches.find((m) => m.id === doneParam && m.status === "finished") ?? null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Live"
        actions={
          current && (
            <Link href={`/admin/live/quick?match=${current.id}`} className="flex items-center gap-1.5 text-sm text-snow/80 no-underline hover:text-volt">
              <PhoneIcon />
              Mode HP
            </Link>
          )
        }
      />
      <LiveEventBar event={event} running={running} />
      {done && <FinishedNotice done={done} next={current} all={data.matches} dismissHref={`/admin/live?event=${event.id}${current ? `&match=${current.id}` : ""}`} />}
      <div className="grid grid-cols-1 lg:grid-main-aside gap-6 items-start">
        {current ? (
          <LiveControl
            key={current.id}
            initial={current}
            label={["Sedang dimainkan", matchName(current, data.matches), current.court_id ? courtNameOf(data.courts, current.court_id) : null].filter(Boolean).join(" · ")}
          />
        ) : (
          <EmptyState>Belum ada match yang siap. {data.matches.length ? "Tunggu babak sebelumnya selesai." : "Buat jadwal dulu di halaman event."}</EmptyState>
        )}
        <MatchQueue data={data} currentId={current?.id ?? null} />
      </div>
    </div>
  );
}
