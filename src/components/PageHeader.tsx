export function PageHeader({
  eyebrow,
  title,
  subtitle,
  rightElement,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
}) {
  return (
    <section className="bg-indigo px-6 md:px-12 py-10 md:py-14 text-snow">
      <div className="w-full max-w-[1440px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2.5 max-w-[580px]">
          <div className="font-sans font-bold text-sm tracking-[0.1em] text-volt uppercase">
            {eyebrow}
          </div>
          <h1 className="font-display font-bold text-[32px] sm:text-[38px] leading-[1.15] m-0">
            {title}
          </h1>
          {subtitle && (
            <p className="font-sans text-base text-snow/75 leading-relaxed m-0">
              {subtitle}
            </p>
          )}
        </div>
        {rightElement && <div className="w-full md:w-auto">{rightElement}</div>}
      </div>
    </section>
  );
}

