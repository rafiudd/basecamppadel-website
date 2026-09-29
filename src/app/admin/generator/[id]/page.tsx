import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  addFreeParticipants,
  addFixedTeam,
  removeParticipant,
  removeTeam,
  generateNextRound,
  saveMatchScore,
  finalizeEvent,
} from "@/app/admin/generator/actions";

const FORMAT_LABEL: Record<string, string> = {
  americano: "Americano",
  mexicano: "Mexicano",
  fixed_americano: "Fixed Partner Americano",
  fixed_mexicano: "Fixed Partner Mexicano",
};

export default async function GenEventDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase.from("gen_events").select("*").eq("id", id).single();
  if (!event) notFound();

  const isFixed = event.format === "fixed_americano" || event.format === "fixed_mexicano";

  const [{ data: participants }, { data: rounds }, { data: courts }, { data: players }] = await Promise.all([
    supabase.from("gen_participants").select("*").eq("event_id", id).order("total_points", { ascending: false }),
    supabase.from("gen_rounds").select("*").eq("event_id", id).order("round_no", { ascending: false }),
    supabase.from("courts").select("*"),
    supabase.from("players").select("id, name").eq("active", true).order("name"),
  ]);

  const participantList = participants ?? [];
  const roundList = rounds ?? [];
  const roundIds = roundList.map((r) => r.id);
  const { data: matches } = roundIds.length
    ? await supabase.from("gen_matches").select("*").in("round_id", roundIds)
    : { data: [] };
  const matchList = matches ?? [];

  const nameById = new Map(participantList.map((p) => [p.id, p.display_name]));
  const courtNameById = new Map((courts ?? []).map((c) => [c.id, c.name]));
  const teamName = (ids: string[]) => ids.map((pid) => nameById.get(pid) ?? "?").join(" / ");

  const latestRound = roundList[0];
  const latestMatches = latestRound ? matchList.filter((m) => m.round_id === latestRound.id) : [];
  const latestFullyScored = latestMatches.length > 0 && latestMatches.every((m) => m.team_a_points != null && m.team_b_points != null);
  const canGenerate = participantList.length >= 4 && (roundList.length === 0 || latestFullyScored);

  // group participants by team_no for fixed formats
  const teams = new Map<number, typeof participantList>();
  if (isFixed) {
    for (const p of participantList) {
      if (p.team_no == null) continue;
      teams.set(p.team_no, [...(teams.get(p.team_no) ?? []), p]);
    }
  }
  const soloParticipants = isFixed ? [] : participantList;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/admin/generator" className="text-sm text-snow/60 no-underline hover:text-volt">← Generator</Link>
          <h1 className="font-display font-bold text-[26px] mt-1">{event.title || "Mabar"}</h1>
          <div className="text-sm text-snow/60">{FORMAT_LABEL[event.format]} · {event.status}</div>
        </div>
        {event.status !== "finished" && participantList.length > 0 && (
          <form action={finalizeEvent}>
            <input type="hidden" name="event_id" value={event.id} />
            <button className="btn btn-volt" type="submit">Selesaikan Event</button>
          </form>
        )}
      </div>

      {/* participants */}
      <div className="bg-ink-3 rounded-2xl p-6 flex flex-col gap-4">
        <div className="font-display font-bold text-lg">Peserta</div>

        {isFixed ? (
          <>
            <div className="flex flex-col gap-2">
              {[...teams.entries()].map(([teamNo, members]) => (
                <div key={teamNo} className="flex items-center gap-3 bg-ink-2 rounded-lg px-3 py-2">
                  <div className="flex-1 text-sm font-semibold">Tim {teamNo}: {members.map((m) => m.display_name).join(" / ")}</div>
                  <div className="text-xs text-snow/50">{members[0]?.total_points ?? 0} + {members[1]?.total_points ?? 0} poin</div>
                  <form action={removeTeam}>
                    <input type="hidden" name="event_id" value={event.id} />
                    <input type="hidden" name="team_no" value={teamNo} />
                    <button className="btn btn-danger px-2.5 py-1 text-xs" type="submit">Hapus</button>
                  </form>
                </div>
              ))}
              {teams.size === 0 && <p className="text-sm text-snow/50">Belum ada tim.</p>}
            </div>
            <form action={addFixedTeam} className="flex items-center gap-2 flex-wrap">
              <input type="hidden" name="event_id" value={event.id} />
              <select className="field w-auto text-sm" name="player_a" required defaultValue="">
                <option value="" disabled>Pemain 1</option>
                {(players ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select className="field w-auto text-sm" name="player_b" required defaultValue="">
                <option value="" disabled>Pemain 2</option>
                {(players ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button className="btn btn-coral text-sm" type="submit">+ Tambah Tim</button>
            </form>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              {soloParticipants.map((p) => (
                <div key={p.id} className="flex items-center gap-3 bg-ink-2 rounded-lg px-3 py-2">
                  <div className="flex-1 text-sm font-semibold">{p.display_name}{!p.player_id && <span className="text-snow/40 font-normal"> (guest)</span>}</div>
                  <div className="text-xs text-snow/50">{p.total_points} poin</div>
                  <form action={removeParticipant}>
                    <input type="hidden" name="event_id" value={event.id} />
                    <input type="hidden" name="id" value={p.id} />
                    <button className="btn btn-danger px-2.5 py-1 text-xs" type="submit">Hapus</button>
                  </form>
                </div>
              ))}
              {soloParticipants.length === 0 && <p className="text-sm text-snow/50">Belum ada peserta.</p>}
            </div>
            <form action={addFreeParticipants} className="flex flex-col gap-3">
              <input type="hidden" name="event_id" value={event.id} />
              <div>
                <div className="label">Pemain terdaftar</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-[220px] overflow-y-auto bg-ink-2 rounded-lg p-2.5">
                  {(players ?? []).map((p) => (
                    <label key={p.id} className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" name="player_ids" value={p.id} /> {p.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="label">Tamu (opsional, satu nama per baris)</div>
                <textarea className="field" name="guests" rows={2} placeholder={"Contoh:\nBudi\nSiti"} />
              </div>
              <div className="flex justify-end">
                <button className="btn btn-coral text-sm" type="submit">+ Tambah Peserta</button>
              </div>
            </form>
          </>
        )}
      </div>

      {/* rounds / generate */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="font-display font-bold text-lg">Ronde</div>
        <form action={generateNextRound}>
          <input type="hidden" name="event_id" value={event.id} />
          <button className="btn btn-coral" type="submit" disabled={!canGenerate}>
            {roundList.length === 0 ? "Generate Ronde 1" : "Generate Ronde Berikutnya"}
          </button>
        </form>
      </div>
      {!canGenerate && participantList.length < 4 && (
        <p className="text-sm text-snow/50 -mt-3">Minimal 4 peserta (atau 2 tim) buat mulai generate.</p>
      )}
      {!canGenerate && participantList.length >= 4 && roundList.length > 0 && !latestFullyScored && (
        <p className="text-sm text-snow/50 -mt-3">Isi dulu semua skor di ronde terakhir sebelum generate ronde baru.</p>
      )}

      <div className="flex flex-col gap-4">
        {roundList.map((round) => {
          const roundMatches = matchList.filter((m) => m.round_id === round.id);
          return (
            <div key={round.id} className="bg-ink-3 rounded-2xl p-5 flex flex-col gap-3">
              <div className="font-display font-bold">Ronde {round.round_no}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {roundMatches.map((m) => (
                  <form
                    key={m.id}
                    action={saveMatchScore}
                    className="bg-ink-2 rounded-xl p-3.5 flex flex-col gap-2"
                  >
                    <input type="hidden" name="event_id" value={event.id} />
                    <input type="hidden" name="match_id" value={m.id} />
                    {courtNameById.get(m.court_id ?? "") && (
                      <div className="text-xs text-coral font-bold uppercase">{courtNameById.get(m.court_id ?? "")}</div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 text-sm font-semibold truncate">{teamName(m.team_a_participant_ids)}</div>
                      <input
                        className="field w-16 text-center"
                        type="number"
                        name="team_a_points"
                        defaultValue={m.team_a_points ?? ""}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 text-sm font-semibold truncate">{teamName(m.team_b_participant_ids)}</div>
                      <input
                        className="field w-16 text-center"
                        type="number"
                        name="team_b_points"
                        defaultValue={m.team_b_points ?? ""}
                      />
                    </div>
                    <button className="btn btn-volt text-xs self-end" type="submit">Simpan</button>
                  </form>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* standings */}
      <div className="overflow-x-auto">
        <div className="font-display font-bold text-lg mb-2">Standing</div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-snow/50 uppercase tracking-wide">
              <th className="pb-2 pr-3 font-semibold">#</th>
              <th className="pb-2 pr-3 font-semibold">Nama</th>
              <th className="pb-2 font-semibold">Poin</th>
            </tr>
          </thead>
          <tbody>
            {participantList.map((p, i) => (
              <tr key={p.id} className="border-t border-snow/10">
                <td className="py-2 pr-3 text-snow/50">{i + 1}</td>
                <td className="py-2 pr-3 font-semibold">{p.display_name}{isFixed && p.team_no != null && <span className="text-snow/40 font-normal"> (Tim {p.team_no})</span>}</td>
                <td className="py-2 font-display font-bold text-volt">{p.total_points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
