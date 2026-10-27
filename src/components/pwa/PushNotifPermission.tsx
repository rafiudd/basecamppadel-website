"use client";

import { useEffect, useState } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const STORAGE_KEY = "bcp_push_notif_status";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

type Status = "idle" | "loading" | "granted" | "denied" | "unsupported";

export function PushNotifPermission() {
  const [status, setStatus] = useState<Status>("idle");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Don't show if push is unsupported
    if (!("PushManager" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }

    // Don't show again if already handled
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "granted" || saved === "denied") {
      setStatus(saved as Status);
      return;
    }

    // Ensure SW is registered (don't rely on PwaInstallPrompt)
    navigator.serviceWorker.register("/sw.js").catch(() => {});

    // Wait until the PWA install prompt is handled (dismissed/installed)
    // so both prompts don't overlap on screen.
    const PWA_INSTALL_KEY = "bcp_pwa_prompt_status";
    let attempts = 0;
    const maxAttempts = 60; // max ~30s
    let timer: ReturnType<typeof setTimeout>;

    const checkAndShow = () => {
      const installStatus = localStorage.getItem(PWA_INSTALL_KEY);
      const installHandled =
        installStatus === "dismissed" || installStatus === "installed";
      if (installHandled || attempts >= maxAttempts) {
        setIsVisible(true);
        return;
      }
      attempts++;
      timer = setTimeout(checkAndShow, 500);
    };

    // Start checking after 1.5s — give install prompt time to appear first
    timer = setTimeout(checkAndShow, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleAllow = async () => {
    setStatus("loading");
    try {
      // 0. Validate VAPID key is loaded
      if (!VAPID_PUBLIC_KEY) {
        console.error("[PushNotif] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set.");
        setStatus("denied");
        setIsVisible(false);
        return;
      }

      // 1. Request permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        localStorage.setItem(STORAGE_KEY, "denied");
        setIsVisible(false);
        return;
      }

      // 2. Ensure SW is registered & active (with 10s timeout)
      await navigator.serviceWorker.register("/sw.js");
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("SW ready timeout")), 10_000)
        ),
      ]);

      // 3. Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // 4. Send subscription to server
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });

      setStatus("granted");
      localStorage.setItem(STORAGE_KEY, "granted");
      setIsVisible(false);
    } catch (err) {
      console.error("[PushNotif] Subscribe error:", err);
      setStatus("denied");
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "denied");
    setStatus("denied");
    setIsVisible(false);
  };

  if (!isVisible || status === "unsupported" || status === "granted" || status === "denied") {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-labelledby="push-notif-title"
      className="fixed z-50 bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="bg-ink/95 backdrop-blur-xl border border-snow/15 rounded-2xl p-4 shadow-2xl text-snow">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-3">
            {/* Bell icon */}
            <div className="w-11 h-11 rounded-xl bg-coral/15 border border-coral/30 flex items-center justify-center flex-none">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-coral"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <div>
              <h3 id="push-notif-title" className="font-display font-bold text-sm leading-tight text-snow">
                Aktifkan Notifikasi
              </h3>
              <p className="text-2xs text-snow/60 font-medium">Jadwal & Live Match terbaru</p>
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

        {/* Body */}
        <p className="text-xs text-snow/75 leading-relaxed mb-3">
          Dapat notif otomatis saat ada event mabar baru atau pertandingan live dimulai.
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleAllow}
            disabled={status === "loading"}
            className="flex-1 py-2.5 px-3 rounded-xl bg-coral text-ink font-sans font-bold text-xs flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.01] active:scale-[0.98] shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === "loading" ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Memproses…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                Aktifkan
              </>
            )}
          </button>
          <button
            onClick={handleDismiss}
            className="py-2.5 px-3 rounded-xl bg-snow/8 hover:bg-snow/12 text-snow/70 hover:text-snow font-sans font-semibold text-xs transition-colors"
          >
            Nanti
          </button>
        </div>
      </div>
    </div>
  );
}
