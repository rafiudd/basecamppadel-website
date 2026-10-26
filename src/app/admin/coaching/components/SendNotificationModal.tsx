"use client";

import { useState } from "react";
import { toast } from "@/components/ui/Toast";
import {
  generateCoachingReportNotificationMessage,
  generateCoachingWhatsAppUrl,
  generateCoachingMailtoUrl,
  normalizeWhatsAppNumber,
} from "@/lib/coachingRules";
import {
  updatePlayerContactAction,
  sendCoachingReportWhatsAppAction,
  sendCoachingReportEmailAction,
} from "../actions";
import { unwrap } from "@/lib/actionState";

export interface SendNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: {
    id: string;
    name: string;
    photo_url?: string | null;
    whatsapp?: string | null;
  };
  initialEmail?: string | null;
  sessionId?: string;
  sessionTitle?: string;
  evaluation?: string;
  nextPractice?: string;
  onNextPlayer?: (() => void) | null;
  hasNext?: boolean;
}

export function SendNotificationModal({
  isOpen,
  onClose,
  player,
  initialEmail,
  sessionId,
  sessionTitle,
  evaluation,
  nextPractice,
  onNextPlayer,
  hasNext,
}: SendNotificationModalProps) {
  const [phone, setPhone] = useState(player.whatsapp || "");
  const [email, setEmail] = useState(initialEmail || "");
  const [copied, setCopied] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [isSendingWa, setIsSendingWa] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  if (!isOpen) return null;

  const message = generateCoachingReportNotificationMessage({
    evaluation,
    nextPractice,
  });

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Pesan notifikasi berhasil disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin pesan.");
    }
  };

  const handleSendKirimdev = async () => {
    if (!phone.trim()) {
      toast.error("Silakan isi nomor WhatsApp terlebih dahulu.");
      return;
    }
    setIsSendingWa(true);
    try {
      const res = await sendCoachingReportWhatsAppAction({
        playerId: player.id,
        whatsapp: phone.trim(),
        message,
        sessionId,
      });
      unwrap(res);
      toast.success(`Notifikasi WhatsApp berhasil dikirim ke ${phone.trim()} via Kirimdev!`);
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengirim WhatsApp via Kirimdev. Kamu bisa gunakan opsi Buka WA Manual.");
    } finally {
      setIsSendingWa(false);
    }
  };

  const handleSendWhatsAppManual = async () => {
    // If phone was typed/changed, optionally save in background
    if (phone.trim() && phone.trim() !== (player.whatsapp || "")) {
      try {
        await updatePlayerContactAction({ playerId: player.id, whatsapp: phone.trim() });
      } catch {
        // silent fallback, still open whatsapp
      }
    }
    const url = generateCoachingWhatsAppUrl(phone, message);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSendBrevo = async () => {
    if (!email.trim()) {
      toast.error("Silakan isi alamat email penerima terlebih dahulu.");
      return;
    }
    setIsSendingEmail(true);
    try {
      const res = await sendCoachingReportEmailAction({
        playerId: player.id,
        email: email.trim(),
        playerName: player.name,
        sessionTitle,
        evaluation,
        nextPractice,
        message,
        sessionId,
      });
      unwrap(res);
      toast.success(`Email rapor berhasil dikirim ke ${email.trim()} via Brevo!`);
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengirim email via Brevo. Kamu bisa gunakan opsi Buka Email Manual.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendEmailManual = () => {
    const url = generateCoachingMailtoUrl(email, message);
    window.location.href = url;
  };

  const handleSaveContact = async () => {
    if (!phone.trim()) return;
    setIsSavingContact(true);
    try {
      unwrap(await updatePlayerContactAction({ playerId: player.id, whatsapp: phone.trim() }));
      toast.success("Nomor WhatsApp pemain berhasil disimpan.");
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan nomor WhatsApp.");
    } finally {
      setIsSavingContact(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kirim Notifikasi Rapor"
      className="fixed inset-0 z-50 bg-[#0E0C15]/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#221F30] border border-[#FBF7F1]/12 rounded-2xl w-full max-w-[560px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#FBF7F1]/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2F9E5C] inline-block animate-pulse" />
              <h3 className="font-display font-bold text-lg text-[#FBF7F1] m-0">
                Kirim Notifikasi Rapor
              </h3>
            </div>
            <p className="text-xs text-[#FBF7F1]/65 m-0 mt-1">
              Untuk <span className="font-semibold text-[#FBF7F1]">{player.name}</span>
              {sessionTitle ? ` · ${sessionTitle}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="w-9 h-9 rounded-xl bg-[#FBF7F1]/8 hover:bg-[#FBF7F1]/16 text-[#FBF7F1]/80 hover:text-[#FBF7F1] flex items-center justify-center text-lg transition-colors cursor-pointer border-0"
          >
            ✕
          </button>
        </div>

        {/* Body content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-sm">
          {/* Action CTA Buttons */}
          <div className="space-y-2">
            {/* Primary: Kirim Otomatis via Kirimdev */}
            <button
              type="button"
              onClick={handleSendKirimdev}
              disabled={isSendingWa}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-[#0C1E14] font-bold text-sm shadow-md transition-all cursor-pointer border-0 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSendingWa ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#0C1E14] border-t-transparent rounded-full animate-spin inline-block" />
                  Mengirim via Kirimdev WhatsApp API...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.044-1.996-.499-1.294-.537-2.146-1.848-2.213-1.936-.065-.088-.538-.717-.538-1.368 0-.651.341-.971.462-1.104.122-.133.267-.166.356-.166.089 0 .178.002.256.006.082.004.193-.031.302.231.112.269.381.931.415 1 .033.069.055.15.011.239-.044.089-.067.144-.133.222-.067.078-.14.173-.2.232-.067.067-.137.14-.059.273.078.133.348.574.747.93.513.457.946.598 1.08.664.133.067.211.056.289-.033.078-.089.333-.389.422-.522.089-.133.178-.111.299-.067.122.044.773.364.907.431.133.067.222.1.256.155.033.056.033.322-.111.727zM12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.98-1.305A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.167c-1.603 0-3.097-.468-4.364-1.275l-.313-.198-2.946.772.786-2.871-.217-.346A8.128 8.128 0 013.833 12c0-4.503 3.664-8.167 8.167-8.167 4.503 0 8.167 3.664 8.167 8.167 0 4.503-3.664 8.167-8.167 8.167z"/>
                  </svg>
                  <span>Kirim WhatsApp Otomatis (Kirimdev)</span>
                  <span className="text-[10px] bg-[#0C1E14]/15 px-1.5 py-0.5 rounded font-mono uppercase">API</span>
                </>
              )}
            </button>

            {/* Secondary fallback buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSendWhatsAppManual}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#FBF7F1]/8 hover:bg-[#FBF7F1]/14 text-[#FBF7F1]/90 font-medium text-xs transition-colors cursor-pointer border border-[#FBF7F1]/10"
              >
                <span>🌐 Buka WA Web / App (Manual)</span>
              </button>

              <button
                type="button"
                onClick={handleSendBrevo}
                disabled={isSendingEmail}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-xs transition-colors cursor-pointer border-0 disabled:opacity-60 disabled:cursor-not-allowed shadow"
              >
                {isSendingEmail ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                    <span>Mengirim...</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    <span>Kirim Email (Brevo)</span>
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleSendEmailManual}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-[#FBF7F1]/4 hover:bg-[#FBF7F1]/8 text-[#FBF7F1]/60 hover:text-[#FBF7F1]/90 text-[11px] font-medium transition-colors cursor-pointer border border-[#FBF7F1]/6"
            >
              <span>✉️ Atau Buka Aplikasi Email Default (mailto)</span>
            </button>
          </div>

          {/* Contact Details (Editable) */}
          <div className="bg-[#17151F]/70 border border-[#FBF7F1]/8 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-[#FFD43B] block">
                Kontak Penerima
              </span>
              <div className="flex items-center gap-2 text-[10px] text-[#FBF7F1]/60">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] inline-block" />
                  WA: <strong>Kirimdev</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] inline-block" />
                  Email: <strong>Brevo</strong>
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#FBF7F1]/70 block mb-1">
                  No. WhatsApp (WA)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className="bg-[#FBF7F1]/10 border-0 rounded-lg px-3 py-2 text-sm text-[#FBF7F1] w-full focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                  />
                  {phone.trim() !== (player.whatsapp || "") && phone.trim() !== "" && (
                    <button
                      type="button"
                      onClick={handleSaveContact}
                      disabled={isSavingContact}
                      title="Simpan nomor WA ke profil pemain"
                      className="px-2.5 py-1 text-xs rounded-lg bg-[#FFD43B]/15 hover:bg-[#FFD43B]/25 text-[#FFD43B] font-semibold whitespace-nowrap cursor-pointer border-0"
                    >
                      {isSavingContact ? "…" : "Simpan"}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-[#FBF7F1]/70 block mb-1">
                  Alamat Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Contoh: pemain@email.com"
                  className="bg-[#FBF7F1]/10 border-0 rounded-lg px-3 py-2 text-sm text-[#FBF7F1] w-full focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                />
              </div>
            </div>
            {!phone && !email && (
              <p className="text-[11px] text-[#FF5A3C] m-0">
                ⚠️ Kontak belum terdaftar. Kamu bisa isi nomor/email di atas atau klik Salin Pesan untuk dikirim manual.
              </p>
            )}
          </div>

          {/* Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#FBF7F1]/80">
                Pratinjau Pesan:
              </span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-xs text-[#FFD43B] hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
              >
                {copied ? (
                  <>
                    <span>✓</span>
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>Salin Pesan</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-[#17151F] border border-[#FBF7F1]/10 rounded-xl p-3.5 text-xs text-[#FBF7F1]/85 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-sans select-all">
              {message}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#FBF7F1]/10 bg-[#17151F]/40 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#FBF7F1]/10 hover:bg-[#FBF7F1]/16 text-sm text-[#FBF7F1]/90 font-medium cursor-pointer border-0 transition-colors"
          >
            Tutup
          </button>

          {onNextPlayer && hasNext ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNextPlayer();
              }}
              className="px-4 py-2 rounded-lg bg-[#FFD43B] hover:bg-[#FFD43B]/90 text-sm text-[#17151F] font-bold cursor-pointer border-0 transition-colors flex items-center gap-1.5"
            >
              Lanjut ke Pemain Berikutnya →
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#2F9E5C] hover:bg-[#2F9E5C]/90 text-sm text-white font-bold cursor-pointer border-0 transition-colors"
            >
              Selesai
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
