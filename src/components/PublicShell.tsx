import { Nav, MobileNav } from "./Nav";
import { Footer } from "./Footer";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-sans bg-snow text-ink min-h-screen flex flex-col">
      <Nav />
      <MobileNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
