import { PageHeader } from "./PageHeader";
import { PublicShell } from "./PublicShell";

export type LegalSection = { title: string; body: React.ReactNode };

/** Privacy policy / terms: indigo header, then numbered sections in a readable column. */
export function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  sections,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro: React.ReactNode;
  sections: LegalSection[];
  children?: React.ReactNode;
}) {
  return (
    <PublicShell>
      <PageHeader eyebrow={eyebrow} title={title} subtitle={`Terakhir diperbarui ${updated}`} />
      <article className="px-4 md:px-12 py-10 md:py-14 text-ink">
        <div className="max-w-190 mx-auto flex flex-col gap-8 text-input leading-prose [&_a]:text-indigo [&_a]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_li]:marker:text-ink/40 [&_li]:mt-1.5 [&_p]:my-2">
          <div className="text-base text-ink/80">{intro}</div>
          {sections.map((s, i) => (
            <section key={s.title}>
              <h2 className="font-display font-bold text-xl text-indigo m-0">
                {i + 1}. {s.title}
              </h2>
              <div className="text-ink/85">{s.body}</div>
            </section>
          ))}
          {children}
        </div>
      </article>
    </PublicShell>
  );
}
