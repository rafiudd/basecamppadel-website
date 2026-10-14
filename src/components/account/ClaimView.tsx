import { ActionForm } from "@/components/admin/ActionForm";
import { Avatar } from "@/components/ui/Avatar";
import type { ActionState } from "@/lib/actionState";
import type { Player } from "@/lib/database.types";
import { AccountPageLayout } from "./AccountPageLayout";
import { lightCard, primaryButton, secondaryButton } from "./styles";

/** A.3 "Ini kamu?": legacy players sharing the name; "Ini saya" files a claim, the other button skips. */
export function ClaimView({
  candidates,
  next,
  action,
}: {
  candidates: Pick<Player, "id" | "name" | "gender" | "region" | "points" | "photo_url">[];
  next: string;
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
}) {
  return (
    <AccountPageLayout
      title="Ini kamu?"
      narrow
      intro={
        candidates.length
          ? "Ada data pemain lama dengan nama yang sama. Kalau itu kamu, poin dan riwayatnya bakal nyambung ke akun ini setelah dicek admin."
          : "Profil kamu sudah tersimpan. Lanjut sebagai pemain baru."
      }
    >
      {candidates.length > 0 && (
        <div className={`${lightCard} flex flex-col gap-3 p-4!`}>
          {candidates.map((p) => (
            <div key={p.id} className="flex items-center gap-3 flex-wrap rounded-xl bg-snow px-3.5 py-3">
              <Avatar name={p.name} photoUrl={p.photo_url} size={44} />
              <div className="flex-1 min-w-40">
                <div className="font-bold text-input">{p.name}</div>
                <div className="text-caption text-ink/60">
                  {p.gender === "F" ? "Women" : "Men"}
                  {p.region ? ` · ${p.region}` : ""} · {p.points} poin
                </div>
              </div>
              <ActionForm action={action} successText="Klaim terkirim, tunggu verifikasi admin">
                <input type="hidden" name="player_id" value={p.id} />
                <input type="hidden" name="next" value={next} />
                <button type="submit" className={`${primaryButton} min-h-10`}>Ini saya</button>
              </ActionForm>
            </div>
          ))}
        </div>
      )}

      <ActionForm action={action} successText={false} className="flex justify-end">
        <input type="hidden" name="player_id" value="" />
        <input type="hidden" name="next" value={next} />
        <button type="submit" className={`${candidates.length ? secondaryButton : primaryButton} w-full md:w-auto`}>
          {candidates.length ? "Bukan saya, aku pemain baru" : "Lanjut"}
        </button>
      </ActionForm>
    </AccountPageLayout>
  );
}
