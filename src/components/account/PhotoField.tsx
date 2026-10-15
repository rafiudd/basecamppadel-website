"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/Toast";
import { PHOTO_MAX_BYTES } from "@/lib/accountRules";
import { compressImage, MAX_SOURCE_BYTES } from "@/lib/imageCompress";
import { ProfileAvatar } from "./ProfileAvatar";
import { secondaryButton } from "./styles";

/**
 * Profile photo: pick a new one only (compressed and cropped square in the browser). The cropped file
 * goes into a hidden `name="photo"` input, so the form posts it like any file field. The Google
 * picture is a first-login default set on the server, not a choice here.
 */
export function PhotoField({ name, current }: { name: string; current: string | null }) {
  const picker = useRef<HTMLInputElement>(null);
  const posted = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast.error("File foto harus berupa gambar.");
    if (file.size > MAX_SOURCE_BYTES) return void toast.error("Foto maksimal 20 MB.");
    setBusy(true);
    try {
      const cropped = await compressImage(file, { maxSide: 512, square: true, quality: 0.88 });
      if (cropped.size > PHOTO_MAX_BYTES) return void toast.error("Foto terlalu besar setelah dikompres. Coba foto lain.");
      const dt = new DataTransfer();
      dt.items.add(cropped);
      posted.current!.files = dt.files;
      setPreview(URL.createObjectURL(cropped));
    } catch {
      toast.error("Foto ini tidak bisa dibaca. Coba foto lain (JPG/PNG).");
    } finally {
      setBusy(false);
    }
  }

  const shown = preview ?? current;

  return (
    <div className="flex items-center gap-4">
      <ProfileAvatar name={name} photoUrl={shown} className="w-20 h-20 text-2xl" />
      <div className="flex flex-col gap-2 items-start">
        <button type="button" className={`${secondaryButton} min-h-10 px-4`} onClick={() => picker.current?.click()} disabled={busy} data-loading={busy || undefined}>
          {shown ? "Ganti foto" : "Pilih foto"}
        </button>
        <div className="text-xs text-ink/60">JPG/PNG. Otomatis dikompres & dipotong persegi.</div>
      </div>
      <input ref={picker} type="file" accept="image/*" className="hidden" onChange={onPick} aria-label="Pilih foto profil" />
      <input ref={posted} type="file" name="photo" className="hidden" tabIndex={-1} aria-hidden />
    </div>
  );
}
