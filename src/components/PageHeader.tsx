export function PageHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <section className="bg-indigo px-6 md:px-12 py-14 md:py-[72px] text-snow">
      <div className="max-w-[1200px] mx-auto">
        <div className="font-sans font-bold text-sm tracking-[0.1em] text-volt uppercase">{eyebrow}</div>
        <h1 className="font-display font-bold text-[32px] md:text-[42px] mt-2.5 leading-tight">{title}</h1>
      </div>
    </section>
  );
}
