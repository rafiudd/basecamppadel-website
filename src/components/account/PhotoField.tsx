"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { toast } from "@/components/ui/Toast";
import { PHOTO_MAX_BYTES } from "@/lib/accountRules";
import { secondaryButton } from "./styles";

const SIZE = 512;

/** Center-crops an image to a SIZE×SIZE JPEG. */
async function cropSquare(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  if (!blob) throw new Error("crop failed");
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

/**
 * Profile photo: max 2 MB, cropped square in the browser. The cropped file goes into a hidden
 * `name="photo"` input, so the form posts it like any file field; `remove_photo` clears it.
 */
export function PhotoField({ name, current }: { name: string; current: string | null }) {
  const picker = useRef<HTMLInputElement>(null);
  const posted = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast.error("File foto harus berupa gambar.");
    if (file.size > PHOTO_MAX_BYTES) return void toast.error("Foto maksimal 2 MB.");
    setBusy(true);
    try {
      const cropped = await cropSquare(file);
      const dt = new DataTransfer();
      dt.items.add(cropped);
      posted.current!.files = dt.files;
      setPreview(URL.createObjectURL(cropped));
      setRemoved(false);
    } catch {
      toast.error("Foto ini tidak bisa dibaca. Coba foto lain (JPG/PNG).");
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    if (posted.current) posted.current.files = new DataTransfer().files;
    setPreview(null);
    setRemoved(true);
  }

  const shown = preview ?? (removed ? null : current);

  return (
    <div className="flex items-center gap-4">
      {shown ? (
        // eslint-disable-next-line @next/next/no-img-element -- local preview / Supabase Storage avatar
        <img src={shown} alt="" className="w-20 h-20 rounded-full object-cover flex-none bg-indigo" />
      ) : (
        <Avatar name={name || "?"} size={80} />
      )}
      <div className="flex flex-col gap-2 items-start">
        <div className="flex gap-2 flex-wrap">
          <button type="button" className={`${secondaryButton} min-h-10 px-4`} onClick={() => picker.current?.click()} disabled={busy} data-loading={busy || undefined}>
            {shown ? "Ganti foto" : "Pilih foto"}
          </button>
          {shown && (
            <button type="button" className="min-h-10 px-3 bg-transparent border-none text-sm font-semibold text-loss" onClick={clear}>
              Hapus
            </button>
          )}
        </div>
        <div className="text-xs text-ink/60">JPG/PNG, maks 2 MB. Otomatis dipotong persegi.</div>
      </div>
      <input ref={picker} type="file" accept="image/*" className="hidden" onChange={onPick} aria-label="Pilih foto profil" />
      <input ref={posted} type="file" name="photo" className="hidden" tabIndex={-1} aria-hidden />
      {removed && <input type="hidden" name="remove_photo" value="on" />}
    </div>
  );
}
