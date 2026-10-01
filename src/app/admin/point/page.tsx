import { PointSettings } from "@/components/admin/PointSettings";
import { getPointPresets } from "./actions";

export const metadata = {
  title: "Admin · Poin — Basecamp Padel",
};

export const dynamic = "force-dynamic";

export default async function AdminPointPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const { preset } = await searchParams;
  const presets = await getPointPresets();

  return <PointSettings initialPresets={presets} initialPresetId={preset} />;
}
