import Link from "next/link";

/** Page title row: optional "← Back" link, title (+ badge), description, and actions on the right. */
export function PageHeader({
  title,
  back,
  badge,
  description,
  actions,
  size = "lg",
}: {
  title: React.ReactNode;
  back?: { href: string; label: string };
  badge?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  size?: "lg" | "md";
}) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-3">
      <div className="flex flex-col gap-1.5 min-w-0">
        {back && <BackLink {...back} />}
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className={`font-display font-bold leading-heading m-0 ${size === "lg" ? "text-page" : "text-title"}`}>{title}</h1>
          {badge}
        </div>
        {description && <div className="text-sm leading-copy text-snow/70">{description}</div>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-none">{actions}</div>}
    </div>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-sm text-snow/70 no-underline hover:text-volt">
      ← {label}
    </Link>
  );
}
