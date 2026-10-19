import { Nav } from "./Nav";
import { BottomNav } from "./BottomNav";
import { Footer } from "./Footer";
import { Toaster } from "./ui/Toast";
import { AccountChipProvider } from "./account/useAccountChip";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <AccountChipProvider>
      <div className="font-sans bg-snow text-ink min-h-screen flex flex-col selection:bg-coral selection:text-snow">
        <Nav />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <Footer />
        <BottomNav />
        <Toaster />
      </div>
    </AccountChipProvider>
  );
}

