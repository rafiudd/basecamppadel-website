import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminHome() {
  const supabase = await createClient();
  const [{ count: players }, { count: events }, { count: venues }, { data: live }] = await Promise.all([
    supabase.from("players").select("*", { count: "exact", head: true }),
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase.from("venues").select("*", { count: "exact", head: true }),
    supabase.from("matches").select("id, team_a_name, team_b_name").eq("is_live", true).limit(1).maybeSingle(),
  ]);

  const cards = [
    { href: "/admin/events", title: "Event", sub: `${events ?? 0} event` },
    { href: "/admin/live", title: "Live", sub: live ? `● LIVE — ${live.team_a_name} vs ${live.team_b_name}` : "Off air", accent: true },
    { href: "/admin/points", title: "Poin", sub: "Preset leaderboard" },
    { href: "/admin/players", title: "Pemain", sub: `${players ?? 0} pemain` },
    { href: "/admin/venues", title: "Venue", sub: `${venues ?? 0} venue` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display font-bold text-[26px]">Dashboard</h1>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={`no-underline text-snow rounded-2xl p-6 flex flex-col gap-2 ${c.accent && live ? "bg-coral" : "bg-indigo"}`}
          >
            <div className="font-display font-bold text-xl">{c.title}</div>
            <div className="text-sm text-snow/75">{c.sub}</div>
          </Link>
        ))}
      </div>
      <div className="bg-ink-3 rounded-2xl p-6 text-sm text-snow/70 flex flex-col gap-2">
        <div className="font-bold text-snow">OBS browser source</div>
        <div>Lower-third scoreboard: <code className="text-volt">/overlay</code> · Opening card: <code className="text-volt">/overlay/opening</code> — set 1920×1080.</div>
        <div>Tambahkan <code className="text-volt">?match=&lt;id&gt;</code> untuk mengunci ke match tertentu, atau biarkan kosong untuk mengikuti match yang sedang LIVE.</div>
      </div>
    </div>
  );
}
