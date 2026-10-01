import { Suspense } from "react";
import { PointPresetForm } from "@/components/admin/PointPresetForm";
import { getPointPresetById } from "../actions";

export const metadata = {
  title: "Admin · Preset Poin — Basecamp Padel",
};

export const dynamic = "force-dynamic";

export default async function AdminPointPresetPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const initialPreset = edit ? await getPointPresetById(edit) : null;

  return (
    <Suspense fallback={<div className="text-snow/50 p-6 text-center">Memuat formulir preset...</div>}>
      <PointPresetForm
        key={initialPreset?.id ?? edit ?? "new"}
        initialPreset={initialPreset ?? undefined}
      />
    </Suspense>
  );
}
