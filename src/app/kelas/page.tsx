import { getPublicClasses } from "@/lib/server/kelas";
import { ClassCatalogClient } from "@/components/kelas/ClassCatalogClient";

export const metadata = {
  title: "Kelas Padel — Basecamp Padel",
  description:
    "Katalog kelas pelatihan padel step by step di Basecamp Padel bersama coach tersertifikasi, dari dasar hingga persiapan turnamen.",
};

export default async function PublicKelasPage() {
  const classes = await getPublicClasses();

  return (
    <div className="text-ink flex flex-col">
      {/* Hero Header */}
      <section className="bg-indigo text-snow px-6 md:px-12 py-12 md:py-16">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-2.5">
          <span className="font-bold text-xs md:text-sm tracking-widest text-volt uppercase">
            Kelas
          </span>
          <h1 className="font-display font-bold text-3xl md:text-5xl text-snow m-0 leading-tight">
            Belajar bareng coach, step by step
          </h1>
          <p className="text-sm md:text-base text-snow/75 m-0 leading-relaxed max-w-xl">
            29 kelas dari dasar sampai persiapan turnamen. Udah{" "}
            <b className="text-volt">1.846</b> pemain ikut kelas di Basecamp.
          </p>
        </div>
      </section>

      {/* Main Catalog Content */}
      <section className="px-6 md:px-12 py-8 md:py-12 bg-snow">
        <div className="w-full max-w-[1440px] mx-auto">
          <ClassCatalogClient initialClasses={classes} />
        </div>
      </section>
    </div>
  );
}
