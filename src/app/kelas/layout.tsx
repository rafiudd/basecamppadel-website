import { PublicShell } from "@/components/PublicShell";

export default function PublicKelasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicShell>{children}</PublicShell>;
}
