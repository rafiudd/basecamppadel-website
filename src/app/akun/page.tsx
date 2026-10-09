import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { DeleteAccount } from "@/components/account/DeleteAccount";
import { lightCard, primaryButton, sectionHeading } from "@/components/account/styles";
import { signOut } from "@/app/akun/actions";
import { requireAccount } from "@/lib/account";
import { formatWhatsapp } from "@/lib/accountRules";

export const metadata: Metadata = { title: "Akun — Basecamp Padel", robots: { index: false } };

const HAND = { R: "Tangan kanan", L: "Tangan kiri" } as const;
const POSITION = { right: "Posisi kanan", left: "Posisi kiri", both: "Posisi bebas" } as const;

function initials(name: string) {
  return name.trim().split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase() || "?";
}

export default async function AkunPage({ searchParams }: { searchParams: Promise<{ tersambung?: string }> }) {
  const { tersambung } = await searchParams;
  const { supabase, user, profile } = await requireAccount("/akun");

  const [{ data: player }, { data: history }, { data: claimed }] = await Promise.all([
    profile.player_id
      ? supabase.from("players").select("points, wins, losses, level").eq("id", profile.player_id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile.player_id
      ? supabase
          .from("match_history")
          .select("id, session_label, opponent_label, result, points_delta, created_at")
          .eq("player_id", profile.player_id)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: null }),
    profile.claim_player_id
      ? supabase.from("players").select("name").eq("id", profile.claim_player_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const chips = [
    profile.gender === "F" ? "Women" : "Men",
    profile.region,
    profile.dominant_hand && HAND[profile.dominant_hand],
    profile.position && POSITION[profile.position],
  ].filter(Boolean) as string[];
  const stats = [
    { label: "Poin", value: player?.points ?? 0 },
    { label: "Match W–L", value: player ? `${player.wins}–${player.losses}` : "0–0" },
    { label: "Level", value: player?.level ?? "—" },
  ];

  return (
    <PublicShell>
      <section className="bg-indigo text-snow px-4 md:px-12 py-8 md:py-10">
        <div className="max-w-276 mx-auto flex flex-col gap-5">
          <div className="flex items-center gap-4 md:gap-6">
            {profile.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- avatar from Supabase Storage
              <img src={profile.photo_url} alt="" className="w-18 h-18 md:w-24 md:h-24 rounded-full object-cover flex-none bg-volt" />
            ) : (
              <span aria-hidden className="w-18 h-18 md:w-24 md:h-24 rounded-full bg-volt text-ink font-display font-bold text-2xl md:text-3xl flex items-center justify-center flex-none">
                {initials(profile.nickname)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs tracking-[0.16em] font-bold text-volt">PROFIL SAYA</div>
              <h1 className="font-display font-bold text-[28px] md:text-[40px] leading-[1.05] m-0 mt-1 truncate">{profile.nickname}</h1>
            </div>
            <Link href="/akun/edit" className="hidden md:inline-flex no-underline items-center min-h-11 px-5 rounded-full bg-snow/12 text-snow font-semibold text-sm hover:bg-snow/20">
              Edit profil
            </Link>
          </div>
          <div className="flex gap-2 flex-wrap">
            {chips.map((c) => (
              <span key={c} className="rounded-full px-3 py-1.5 text-caption font-semibold bg-snow/12">{c}</span>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 md:gap-3 max-w-140">
            {stats.map((s) => (
              <div key={s.label} className="bg-snow/8 rounded-xl px-3 py-2.5 md:px-4 md:py-3">
                <div className="text-2xs md:text-xs text-snow/65 font-semibold">{s.label}</div>
                <div className="font-display font-bold text-xl md:text-2xl mt-0.5 truncate">{s.value}</div>
              </div>
            ))}
          </div>
          <Link href="/akun/edit" className="md:hidden no-underline inline-flex items-center justify-center min-h-11 rounded-full bg-snow/12 text-snow font-semibold text-sm">
            Edit profil
          </Link>
        </div>
      </section>

      <div className="px-4 md:px-12 py-8 md:py-10">
        <div className="max-w-276 mx-auto grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_340px] gap-5 md:gap-6 items-start text-ink">
          <div className="flex flex-col gap-5">
            {tersambung && profile.player_id && (
              <div role="status" className="rounded-xl bg-win/12 text-[#23794A] px-4 py-3 text-sm font-semibold">
                Akun kamu tersambung ke data pemain lama. Poin dan riwayatnya sudah muncul di sini.
              </div>
            )}
            {profile.claim_player_id && (
              <div role="status" className="rounded-xl bg-volt/30 px-4 py-3 text-sm leading-copy">
                <b>Menunggu verifikasi admin.</b> Kamu mengaku sebagai <b>{claimed?.name ?? "pemain lama"}</b>. Setelah
                disetujui, poin dan riwayatnya langsung muncul di akun ini.
              </div>
            )}

            <div className={`${lightCard} flex flex-col gap-4`}>
              <h2 className={sectionHeading}>Riwayat match</h2>
              {history && history.length > 0 ? (
                <ul className="list-none m-0 p-0 flex flex-col divide-y divide-ink/8">
                  {history.map((h) => (
                    <li key={h.id} className="flex items-center gap-3 py-3">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm flex-none ${
                          h.result === "W" ? "bg-win/15 text-[#23794A]" : "bg-loss/12 text-loss"
                        }`}
                      >
                        {h.result}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate">vs {h.opponent_label || "—"}</div>
                        <div className="text-xs text-ink/60 truncate">
                          {h.session_label || "Match"} · {new Date(h.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </div>
                      <span className="font-display font-bold text-sm flex-none">
                        {h.points_delta > 0 ? `+${h.points_delta}` : h.points_delta}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-start gap-3">
                  <p className="m-0 text-sm text-ink/65">Belum ada match yang tercatat. Ikut mabar atau event pertamamu!</p>
                  <Link href="/jadwal" className={primaryButton}>Lihat jadwal</Link>
                </div>
              )}
            </div>
          </div>

          <aside className={`${lightCard} flex flex-col gap-4`}>
            <h2 className={sectionHeading}>Akun</h2>
            <dl className="m-0 flex flex-col gap-3 text-sm">
              <div>
                <dt className="text-xs text-ink/55 font-semibold">Email (Google)</dt>
                <dd className="m-0 font-semibold break-all">{profile.email || user.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink/55 font-semibold">No. WhatsApp</dt>
                <dd className="m-0 font-semibold">{formatWhatsapp(profile.whatsapp)}</dd>
              </div>
            </dl>
            <div className="h-px bg-ink/10" />
            <ActionForm action={signOut} successText={false}>
              <button type="submit" className="w-full min-h-11 rounded-full border border-ink/18 bg-white text-ink font-semibold text-sm hover:border-indigo">
                Keluar
              </button>
            </ActionForm>
            <div className="text-center">
              <DeleteAccount />
            </div>
          </aside>
        </div>
      </div>
    </PublicShell>
  );
}
