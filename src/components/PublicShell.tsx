import { Nav } from "./Nav";
import { BottomNav } from "./BottomNav";
import { Footer } from "./Footer";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-sans bg-snow text-ink min-h-screen flex flex-col selection:bg-coral selection:text-snow">
      <Nav />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <Footer />
      <BottomNav />
    </div>
  );
}

