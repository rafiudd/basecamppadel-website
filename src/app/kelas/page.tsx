import { getPublicClasses } from "@/lib/server/kelas";
import { ClassCatalogClient } from "@/components/kelas/ClassCatalogClient";

export const revalidate = 60;

export const metadata = {
  title: "Kelas Padel — Basecamp Padel",
  description:
    "Katalog kelas pelatihan padel step by step di Basecamp Padel bersama coach tersertifikasi, dari dasar hingga persiapan turnamen.",
};

export default async function PublicKelasPage() {
  const classes = await getPublicClasses();

  return (
    <div className="text-ink flex flex-col">
      {/* Main Catalog Content */}
      <section className="px-6 md:px-12 py-8 md:py-12 bg-snow">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-6">
          <h1 className="font-display font-bold text-2xl md:text-[28px] text-ink m-0">
            Belajar bareng coach, step by step
          </h1>
          <ClassCatalogClient initialClasses={classes} />
        </div>
      </section>
    </div>
  );
}
