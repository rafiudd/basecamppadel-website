import Link from "next/link";
import { courtLabel } from "@/lib/format";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { CourtForm } from "@/components/admin/venues/CourtForm";
import { InlineDelete } from "@/components/admin/InlineDelete";
import { MOBILE_CARD } from "@/components/admin/cardStyles";
import { ActiveBadge } from "@/components/ui/Badge";
import { deleteCourt } from "@/app/admin/actions";

export default async function VenueDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const supabase = await createClient();

  const [{ data: venue }, { data: courts }] = await Promise.all([
    supabase.from("venues").select("*").eq("id", id).maybeSingle(),
    supabase.from("courts").select("*").eq("venue_id", id).order("name"),
  ]);
  if (!venue) notFound();

  const list = courts ?? [];
  const editing = list.find((c) => c.id === edit);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={venue.name} back={{ href: "/admin/venues", label: "Venue" }} badge={<ActiveBadge active={venue.active} />} />

      <CourtForm key={editing?.id ?? "new"} court={editing} venueId={id} nextName={`Court ${list.length + 1}`} />

      <div className="flex flex-col gap-3">
        <div className="font-display font-bold text-lg">
          Court <span className="font-sans font-medium text-sm text-snow/70">· {list.length}</span>
        </div>
        {list.length ? (
          <>
          <table className="hidden md:table w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-snow/65 uppercase tracking-table">
                <th className="pb-2.5 pr-3 font-semibold">Nama</th>
                <th className="pb-2.5 pr-3 font-semibold">Status</th>
                <th className="pb-2.5" />
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-t border-snow/10">
                  <td className="py-2.5 pr-3 font-display font-bold whitespace-nowrap">{courtLabel(c.name)}</td>
                  <td className="py-2.5 pr-3"><ActiveBadge active={c.active} /></td>
                  <td className="py-2">
                    <InlineDelete action={deleteCourt} id={c.id} name={courtLabel(c.name)} noun="court">
                      <Link href={`/admin/venues/${id}?edit=${c.id}`} className="btn min-h-10 px-4.5 tracking-button no-underline text-snow">Edit</Link>
                    </InlineDelete>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="md:hidden flex flex-col gap-2">
            {list.map((c) => (
              <div key={c.id} className={MOBILE_CARD}>
                <div className="flex-1 min-w-40 flex flex-col items-start gap-1">
                  <div className="font-display font-bold text-base">{courtLabel(c.name)}</div>
                  <ActiveBadge active={c.active} />
                </div>
                <InlineDelete action={deleteCourt} id={c.id} name={courtLabel(c.name)} noun="court">
                  <Link href={`/admin/venues/${id}?edit=${c.id}`} className="btn min-h-10 px-4.5 tracking-button no-underline text-snow">Edit</Link>
                </InlineDelete>
              </div>
            ))}
          </div>
          </>
        ) : (
          <p className="text-sm text-snow/55 m-0">Belum ada court di venue ini.</p>
        )}
      </div>
    </div>
  );
}
