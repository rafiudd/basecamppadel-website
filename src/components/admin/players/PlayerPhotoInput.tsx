"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/Toast";
import { compressImage, MAX_SOURCE_BYTES } from "@/lib/imageCompress";

/** What the admin upload may send after compression (the server action body limit is ~1 MB). */
const MAX_UPLOAD_BYTES = 900 * 1024;

/**
 * Player photo for the admin form: shows the saved photo, or a preview of the newly picked one.
 * Pick with the file input, a click on the photo, or drag & drop onto it. The image is resized
 * (longest side 1200px) and re-encoded in the browser before the form posts it as `photo`; cutouts
 * keep their transparency.
 */
export function PlayerPhotoInput({ current }: { current: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  /** Compresses `file` and puts it in the posted input; a rejected file leaves the input empty. */
  async function takeFile(file: File | undefined) {
    setNote(null);
    setPreview(null);
    const reject = (message: string) => {
      if (input.current) input.current.files = new DataTransfer().files;
      toast.error(message);
    };
    if (!file) return reject("Tidak ada file.");
    if (!file.type.startsWith("image/")) return reject("File foto harus berupa gambar.");
    if (file.size > MAX_SOURCE_BYTES) return reject("Foto maksimal 20 MB.");
    setBusy(true);
    try {
      const small = await compressImage(file, { maxSide: 1200, quality: 0.85, keepAlpha: true });
      if (small.size > MAX_UPLOAD_BYTES) return reject("Foto masih terlalu besar setelah dikompres. Coba foto lain.");
      const dt = new DataTransfer();
      dt.items.add(small);
      input.current!.files = dt.files;
      setPreview(URL.createObjectURL(small));
      setNote(`${Math.round(file.size / 1024)} KB → ${Math.round(small.size / 1024)} KB`);
    } catch {
      reject("Foto ini tidak bisa dibaca. Coba foto lain (JPG/PNG/WebP).");
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (!busy) void takeFile(e.dataTransfer.files?.[0]);
  }

  const shown = preview ?? current ?? "/images/player-placeholder.svg";

  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragEnter={(e) => (e.preventDefault(), setDragging(true))}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDragging(false)}
        onDrop={onDrop}
        disabled={busy}
        aria-label="Pilih atau jatuhkan foto pemain"
        className={`relative w-40 h-50 rounded-xl overflow-hidden p-0 border-2 border-dashed transition-colors ${
          dragging ? "border-volt bg-volt/10" : "border-transparent bg-ink/40 hover:border-snow/25"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local preview, storage/worker URL or placeholder */}
        <img src={shown} alt="" className={`absolute inset-0 w-full h-full object-contain object-bottom ${dragging ? "opacity-30" : ""}`} />
        {preview && !dragging && (
          <span className="absolute top-2 left-2 rounded-full bg-volt text-ink text-2xs font-bold px-2 py-0.5">Belum disimpan</span>
        )}
        {(dragging || busy) && (
          <span className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs font-bold text-snow">
            {busy ? "Mengompres…" : "Lepas untuk pakai foto ini"}
          </span>
        )}
      </button>
      <div>
        <div className="label">Foto cutout (PNG/WebP)</div>
        <input
          ref={input}
          className="field text-xs"
          name="photo"
          type="file"
          accept="image/png,image/webp,image/jpeg"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void takeFile(file);
          }}
          disabled={busy}
        />
        <div className="text-2xs text-snow/50 mt-1">{note ? `Dikompres: ${note}` : "Atau seret & lepas foto ke kotak di atas."}</div>
      </div>
    </>
  );
}
