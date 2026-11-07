"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/Toast";
import { compressImage, MAX_SOURCE_BYTES } from "@/lib/imageCompress";
import { initials } from "@/lib/format";

/** What the admin upload may send after compression (the server action body limit is ~1 MB). */
const MAX_UPLOAD_BYTES = 900 * 1024;

/** Coach profile photo (round, for /coach/[slug]): pick with the file input, a click, or drag & drop. */
export function CoachPhotoInput({ name, current }: { name: string; current: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

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
      const small = await compressImage(file, { maxSide: 800, quality: 0.85, keepAlpha: false });
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

  const shown = preview ?? current;

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragEnter={(e) => (e.preventDefault(), setDragging(true))}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDragging(false)}
        onDrop={onDrop}
        disabled={busy}
        aria-label="Pilih atau jatuhkan foto coach"
        className={`relative w-24 h-24 rounded-full overflow-hidden p-0 border-2 border-dashed flex-none transition-colors ${
          dragging ? "border-volt bg-volt/10" : "border-transparent bg-ink/40 hover:border-snow/25"
        }`}
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview or storage URL
          <img src={shown} alt="" className={`absolute inset-0 w-full h-full object-cover ${dragging ? "opacity-30" : ""}`} />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-snow/80 font-display font-bold text-xl bg-indigo/60">
            {initials(name || "C")}
          </span>
        )}
        {(dragging || busy) && (
          <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-2xs font-bold text-snow bg-ink/70">
            {busy ? "Mengompres…" : "Lepas di sini"}
          </span>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="label">Foto profil</div>
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
        <div className="text-2xs text-snow/50 mt-1">{note ? `Dikompres: ${note}` : "Atau seret & lepas foto ke lingkaran."}</div>
      </div>
    </div>
  );
}
