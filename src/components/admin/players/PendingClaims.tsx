import { ActionForm } from "@/components/admin/ActionForm";
import { resolveClaim } from "@/app/admin/actions";
import { formatWhatsapp } from "@/lib/accountRules";

export type PendingClaim = {
  user_id: string;
  email: string;
  nickname: string;
  full_name: string;
  whatsapp: string;
  claimed: { id: string; name: string; points: number } | null;
};

/** Accounts that tapped "Ini saya" on a legacy player with the same name: the admin decides. */
export function PendingClaims({ claims }: { claims: PendingClaim[] }) {
  if (!claims.length) return null;
  return (
    <section className="bg-indigo rounded-2xl p-4 md:p-5 flex flex-col gap-3">
      <div>
        <div className="font-display font-bold text-lg">Klaim akun menunggu verifikasi ({claims.length})</div>
        <div className="text-xs text-snow/60 mt-0.5">
          Pemain mengaku sebagai data lama dengan nama yang sama. Setujui kalau memang orangnya; tolak = dibuatkan data pemain baru.
        </div>
      </div>
      {claims.map((c) => (
        <div key={c.user_id} className="bg-ink/40 rounded-xl px-3.5 py-3 flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1 min-w-0 text-sm">
            <div className="font-semibold truncate">
              {c.nickname}
              {c.full_name && c.full_name !== c.nickname ? <span className="text-snow/60 font-normal"> · {c.full_name}</span> : null}
            </div>
            <div className="text-xs text-snow/60 truncate">
              {c.email} · WA {formatWhatsapp(c.whatsapp)}
            </div>
            <div className="text-xs mt-1">
              Mengaku sebagai <b className="text-volt">{c.claimed?.name ?? "—"}</b>
              {c.claimed ? <span className="text-snow/60"> ({c.claimed.points} poin)</span> : null}
            </div>
          </div>
          <div className="flex gap-2">
            <ActionForm action={resolveClaim} successText="Klaim ditolak, pemain baru dibuat" confirmText={`Tolak klaim ${c.nickname}? Akun ini akan dibuatkan data pemain baru.`} confirmLabel="Ya, tolak">
              <input type="hidden" name="user_id" value={c.user_id} />
              <input type="hidden" name="approve" value="0" />
              <button type="submit" className="btn min-h-10">Tolak</button>
            </ActionForm>
            <ActionForm action={resolveClaim} successText="Akun tersambung">
              <input type="hidden" name="user_id" value={c.user_id} />
              <input type="hidden" name="approve" value="1" />
              <button type="submit" className="btn btn-volt min-h-10">Setujui</button>
            </ActionForm>
          </div>
        </div>
      ))}
    </section>
  );
}
