"use client";

import { useRef, useState } from "react";
import { toast } from "@/components/ui/Toast";
import { compressImage, MAX_SOURCE_BYTES } from "@/lib/imageCompress";

/** What the admin upload may send after compression (the server action body limit is ~1 MB). */
const MAX_UPLOAD_BYTES = 900 * 1024;

/**
 * Player photo file input for the admin form: the picked image is resized (longest side 1200px) and
 * re-encoded in the browser before the form posts it as `photo`; cutouts keep their transparency.
 */
export function PlayerPhotoInput() {
  const input = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setNote(null);
    if (!file) return;
    const clear = (message: string) => {
      e.target.value = "";
      toast.error(message);
    };
    if (!file.type.startsWith("image/")) return clear("File foto harus berupa gambar.");
    if (file.size > MAX_SOURCE_BYTES) return clear("Foto maksimal 20 MB.");
    setBusy(true);
    try {
      const small = await compressImage(file, { maxSide: 1200, quality: 0.85, keepAlpha: true });
      if (small.size > MAX_UPLOAD_BYTES) return clear("Foto masih terlalu besar setelah dikompres. Coba foto lain.");
      const dt = new DataTransfer();
      dt.items.add(small);
      input.current!.files = dt.files;
      setNote(`${Math.round(file.size / 1024)} KB → ${Math.round(small.size / 1024)} KB`);
    } catch {
      clear("Foto ini tidak bisa dibaca. Coba foto lain (JPG/PNG/WebP).");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={input}
        className="field text-xs"
        name="photo"
        type="file"
        accept="image/png,image/webp,image/jpeg"
        onChange={onChange}
        disabled={busy}
      />
      {(busy || note) && <div className="text-2xs text-snow/50 mt-1">{busy ? "Mengompres foto…" : `Dikompres: ${note}`}</div>}
    </>
  );
}
