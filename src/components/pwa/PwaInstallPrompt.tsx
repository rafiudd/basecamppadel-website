"use client";

import { useEffect, useState } from "react";
import { MountainMark } from "@/components/Logo";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const STORAGE_KEY = "bcp_pwa_prompt_status";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Check if already installed / standalone mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Check storage: only trigger if visitor hasn't dismissed or installed before
    const status = localStorage.getItem(STORAGE_KEY);
    if (status === "installed" || status === "dismissed") {
      return;
    }

    // 3. Register service worker for PWA support
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // 4. Handle Chromium / Android / Desktop install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Trigger prompt modal on first visit with a brief delay for smooth appearance
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    };

    // 5. Handle post-install event
    const handleAppInstalled = () => {
      localStorage.setItem(STORAGE_KEY, "installed");
      setIsOpen(false);
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // 6. Detect iOS Safari (which doesn't support beforeinstallprompt)
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios|android/.test(ua);

    if (isIOSDevice && isSafari && !status) {
      setIsIOS(true);
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", handleAppInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        localStorage.setItem(STORAGE_KEY, "installed");
        setIsOpen(false);
      } else {
        localStorage.setItem(STORAGE_KEY, "dismissed");
        setIsOpen(false);
      }
    } catch {
      setIsOpen(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "dismissed");
    setIsOpen(false);
  };

  if (!isOpen || isInstalled) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="pwa-prompt-title"
      className="fixed z-50 bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="bg-ink/95 backdrop-blur-xl border border-snow/15 rounded-2xl p-4 shadow-2xl text-snow">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-ink border border-snow/10 flex items-center justify-center p-1.5 shadow-inner flex-none">
              <MountainMark size={28} />
            </div>
            <div>
              <h3 id="pwa-prompt-title" className="font-display font-bold text-sm leading-tight text-snow">
                Pasang Basecamp Padel
              </h3>
              <p className="text-2xs text-snow/60 font-medium">Aplikasi Komunitas Mabar</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Tutup"
            className="text-snow/50 hover:text-snow p-1 rounded-lg transition-colors -mr-1 -mt-1 active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        {isIOS ? (
          <div className="space-y-3">
            <p className="text-xs text-snow/80 leading-relaxed">
              Pasang di layar utama iPhone kamu untuk akses cepat tanpa browser:
            </p>
            <div className="bg-snow/5 rounded-xl p-3 border border-snow/10 space-y-2 text-2xs text-snow/80">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-coral/20 text-coral font-bold flex items-center justify-center flex-none">1</span>
                <span>
                  Ketuk tombol <strong className="text-snow">Bagikan (Share)</strong>
                  <svg className="inline-block ml-1 w-3.5 h-3.5 text-snow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                  {" "}di Safari.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-coral/20 text-coral font-bold flex items-center justify-center flex-none">2</span>
                <span>
                  Pilih <strong className="text-snow">Tambah ke Layar Utama</strong> (Add to Home Screen).
                </span>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="w-full py-2.5 px-4 rounded-xl bg-coral text-ink font-sans font-bold text-xs transition-transform hover:scale-[1.01] active:scale-[0.98] shadow-md"
            >
              Saya Mengerti
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-snow/80 leading-relaxed">
              Install aplikasi di layar utama untuk akses instan jadwal mabar, skor langsung, dan notifikasi!
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleInstallClick}
                className="flex-1 py-2.5 px-3 rounded-xl bg-coral text-ink font-sans font-bold text-xs flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.01] active:scale-[0.98] shadow-md"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Install Sekarang
              </button>
              <button
                onClick={handleDismiss}
                className="py-2.5 px-3 rounded-xl bg-snow/8 hover:bg-snow/12 text-snow/70 hover:text-snow font-sans font-semibold text-xs transition-colors"
              >
                Nanti
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
