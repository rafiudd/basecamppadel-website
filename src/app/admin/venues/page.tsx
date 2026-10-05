import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { VenueForm } from "@/components/admin/venues/VenueForm";
import { InlineDelete } from "@/components/admin/InlineDelete";
import { MOBILE_CARD } from "@/components/admin/cardStyles";
import { Badge } from "@/components/ui/Badge";
import { deleteVenue } from "@/app/admin/actions";

export default async function VenuesAdmin({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string }> }) {
  const { edit, new: isNew } = await searchParams;
  const supabase = await createClient();
  const [{ data: venues }, { data: courts }] = await Promise.all([
    supabase.from("venues").select("*").order("name"),
    supabase.from("courts").select("id, venue_id"),
  ]);
  const editing = venues?.find((v) => v.id === edit);
  const showForm = !!editing || isNew === "1";
  const courtCount = (venueId: string) => (courts ?? []).filter((c) => c.venue_id === venueId).length;
  const active = (venues ?? []).filter((v) => v.active).length;

  return (
    <div className="flex flex-col gap-6">
      {showForm ? (
        <PageHeader title={editing ? editing.name : "Tambah Venue"} back={{ href: "/admin/venues", label: "Venue" }} />
      ) : (
        <PageHeader
          title="Venue"
          description={`${active} venue aktif. Venue nonaktif ditandai dan tidak muncul di form jadwal.`}
          actions={<Link href="/admin/venues?new=1" className="btn btn-coral text-ink no-underline tracking-button whitespace-nowrap">+ Tambah Venue</Link>}
        />
      )}

      {showForm ? (
        <VenueForm key={editing?.id ?? "new"} venue={editing} />
      ) : (
        <div>
          <table className="hidden md:table w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-snow/65 uppercase tracking-table">
                <th className="pb-2.5 pr-3 font-semibold">Nama</th>
                <th className="pb-2.5 pr-3 font-semibold">Court</th>
                <th className="pb-2.5" />
              </tr>
            </thead>
            <tbody>
              {(venues ?? []).map((v) => {
                const n = courtCount(v.id);
                return (
                  <tr key={v.id} className="border-t border-snow/10">
                    <td className="py-2.5 pr-3 font-display font-bold whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        <span className={v.active ? "" : "text-snow/60"}>{v.name}</span>
                        {!v.active && <Badge tone="faint">Nonaktif</Badge>}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      <Link href={`/admin/venues/${v.id}`} className={`no-underline text-sm hover:text-volt ${n ? "text-snow/80" : "text-snow/70"}`}>
                        {n ? `${n} court →` : "Belum ada court →"}
                      </Link>
                    </td>
                    <td className="py-2">
                      <InlineDelete action={deleteVenue} id={v.id} name={v.name} noun="venue">
                        <Link href={`/admin/venues?edit=${v.id}`} className="btn min-h-10 px-4.5 tracking-button no-underline text-snow">Edit</Link>
                      </InlineDelete>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="md:hidden flex flex-col gap-2">
            {(venues ?? []).map((v) => {
              const n = courtCount(v.id);
              return (
                <div key={v.id} className={`${MOBILE_CARD} relative`}>
                  <div className="flex-1 min-w-40 flex flex-col gap-1">
                    <div className="font-display font-bold text-base flex items-center gap-2">
                      <span className={v.active ? "" : "text-snow/60"}>{v.name}</span>
                      {!v.active && <Badge tone="faint">Nonaktif</Badge>}
                    </div>
                    {/* the ::after stretches the link over the whole card, so tapping anywhere opens the courts */}
                    <Link href={`/admin/venues/${v.id}`} className={`no-underline text-sm after:absolute after:inset-0 after:content-[''] ${n ? "text-volt" : "text-snow/70"}`}>
                      {n ? `${n} court →` : "Belum ada court →"}
                    </Link>
                  </div>
                  <div className="relative z-10">
                    <InlineDelete action={deleteVenue} id={v.id} name={v.name} noun="venue">
                      <Link href={`/admin/venues?edit=${v.id}`} className="btn min-h-10 px-4.5 tracking-button no-underline text-snow">Edit</Link>
                    </InlineDelete>
                  </div>
                </div>
              );
            })}
          </div>
          {venues?.length === 0 && <p className="text-sm text-snow/50 mt-3">Belum ada venue.</p>}
        </div>
      )}
    </div>
  );
}
