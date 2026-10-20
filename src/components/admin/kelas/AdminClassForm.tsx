"use client";

import { useState } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { saveClass } from "@/app/admin/kelas/actions";
import { PIN_COLORS } from "@/lib/kelasRules";
import { ClassMediaUploader } from "./ClassMediaUploader";

interface CoachOption {
  id: string;
  name: string;
}

export function AdminClassForm({
  classData,
  coaches,
}: {
  classData?: any;
  coaches: CoachOption[];
}) {
  const [state, formAction, isPending] = useActionState(saveClass, null);

  // Form state
  const [learningPoints, setLearningPoints] = useState<string[]>(
    classData?.learning_points?.length ? classData.learning_points : [
      "Baca arah & tinggi pantulan dari kaca belakang",
      "Atur jarak: mundur dulu, baru maju ke bola",
      "Pukulan balik aman: lob tinggi & bola rendah"
    ]
  );

  const [totalSessions, setTotalSessions] = useState<number>(
    classData?.total_sessions || classData?.sessions_breakdown?.length || 2
  );

  const [sessionsBreakdown, setSessionsBreakdown] = useState<Array<{ title: string; desc: string }>>(() => {
    const count = classData?.total_sessions || classData?.sessions_breakdown?.length || 2;
    const existing = classData?.sessions_breakdown || [];
    if (existing.length >= count) {
      return existing.slice(0, count);
    }
    const extra = Array.from({ length: count - existing.length }, (_, i) => ({
      title: existing.length + i === 0 ? "Dasar & Adaptasi" : `Lanjutan & Simulasi ${existing.length + i + 1}`,
      desc: "Latihan teknik dan evaluasi drill.",
    }));
    return [...existing, ...extra];
  });

  const [selectedPins, setSelectedPins] = useState<string[]>(
    classData?.suitable_pins || ["Kuning", "Biru"]
  );

  const [published, setPublished] = useState<boolean>(
    classData ? !!classData.published : true
  );

  const togglePin = (pin: string) => {
    setSelectedPins((prev) =>
      prev.includes(pin) ? prev.filter((p) => p !== pin) : [...prev, pin]
    );
  };

  const addPoint = () => setLearningPoints((prev) => [...prev, ""]);
  const removePoint = (idx: number) =>
    setLearningPoints((prev) => prev.filter((_, i) => i !== idx));

  const updatePoint = (idx: number, val: string) => {
    const next = [...learningPoints];
    next[idx] = val;
    setLearningPoints(next);
  };

  const handleTotalSessionsChange = (val: number) => {
    const nextCount = Math.max(1, val);
    setTotalSessions(nextCount);
    setSessionsBreakdown((prev) => {
      if (prev.length < nextCount) {
        const extra = Array.from({ length: nextCount - prev.length }, (_, i) => ({
          title: `Sesi ${prev.length + i + 1}`,
          desc: "",
        }));
        return [...prev, ...extra];
      }
      return prev.slice(0, nextCount);
    });
  };

  const updateSession = (idx: number, field: "title" | "desc", val: string) => {
    const next = [...sessionsBreakdown];
    next[idx][field] = val;
    setSessionsBreakdown(next);
  };

  return (
    <form action={formAction} className="flex flex-col gap-6 w-full">
      <input type="hidden" name="id" value={classData?.id || ""} />
      {/* Hidden pins array for FormData */}
      {selectedPins.map((p) => (
        <input key={p} type="hidden" name="pins" value={p} />
      ))}
      <input type="hidden" name="published" value={published ? "true" : "false"} />

      {/* Breadcrumb / Back link */}
      <div>
        <Link
          href={classData ? `/admin/kelas/${classData.id}` : "/admin/kelas"}
          className="text-sm text-snow/70 hover:text-volt no-underline flex items-center gap-1.5"
        >
          ← {classData ? classData.title : "Kelas"}
        </Link>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="font-display font-bold text-2xl md:text-[26px] leading-tight m-0 text-snow">
          {classData ? "Edit kelas" : "Buat kelas baru"}
        </h1>
        <p className="text-sm text-snow/70 m-0 leading-normal">
          Jadwal & peserta diatur dari halaman detail setelah kelas disimpan.
        </p>
      </div>

      {state?.error && (
        <div className="p-3.5 bg-coral/15 border border-coral/30 rounded-xl text-coral text-sm">
          {state.error}
        </div>
      )}

      {/* Section 1: Info Kelas */}
      <section className="bg-[#221F30] rounded-2xl p-5 md:p-6 flex flex-col gap-4">
        <div className="flex gap-3 items-center">
          <span className="w-7 h-7 rounded-full bg-[#1B1650] text-volt flex items-center justify-center font-display font-bold text-sm">
            1
          </span>
          <div>
            <h2 className="font-display font-bold text-lg text-snow m-0">Info kelas</h2>
            <p className="text-xs text-snow/70 m-0">Tampil di kartu & halaman detail kelas.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wider text-snow/65">Nama kelas</span>
            <input
              name="title"
              required
              defaultValue={classData?.title || ""}
              placeholder="Contoh: Mastering Backglass"
              className="bg-snow/10 border-0 rounded-lg px-3 py-2.5 text-sm text-snow outline-none focus:ring-1 focus:ring-volt"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wider text-snow/65">Kategori</span>
            <select
              name="category"
              defaultValue={classData?.category || "teknik"}
              className="bg-snow/10 border-0 rounded-lg px-3 py-2.5 text-sm text-snow outline-none cursor-pointer"
            >
              <option value="dasar" className="bg-[#17151F]">Dasar</option>
              <option value="teknik" className="bg-[#17151F]">Teknik</option>
              <option value="taktik" className="bg-[#17151F]">Posisi & taktik</option>
              <option value="mf" className="bg-[#17151F]">Mental & fisik</option>
              <option value="khusus" className="bg-[#17151F]">Program khusus</option>
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wider text-snow/65">Deskripsi singkat</span>
          <textarea
            name="description"
            rows={2}
            defaultValue={classData?.description || ""}
            placeholder="Jelaskan ringkasan materi dan manfaat kelas..."
            className="bg-snow/10 border-0 rounded-lg px-3 py-2.5 text-sm text-snow outline-none focus:ring-1 focus:ring-volt resize-y"
          />
        </label>

        <div>
          <span className="text-xs uppercase tracking-wider text-snow/65 block mb-2">Cocok untuk pin</span>
          <div className="flex gap-2 flex-wrap">
            {["Putih", "Kuning", "Biru", "Merah", "Hitam"].map((pin) => {
              const active = selectedPins.includes(pin);
              return (
                <button
                  type="button"
                  key={pin}
                  onClick={() => togglePin(pin)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-colors ${
                    active
                      ? "border-volt bg-volt/10 text-snow"
                      : "border-snow/20 bg-transparent text-snow/70 hover:border-snow/40"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      background: PIN_COLORS[pin]?.bg || "#FFF",
                      border: PIN_COLORS[pin]?.border || "none",
                    }}
                  />
                  {pin}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 2: Foto & Video */}
      <ClassMediaUploader
        initialVideoUrl={classData?.video_url}
        initialCoverUrl={classData?.cover_image_url}
        initialGalleryUrls={classData?.gallery_urls}
      />

      {/* Section 3: Format & Harga */}
      <section className="bg-[#221F30] rounded-2xl p-5 md:p-6 flex flex-col gap-4">
        <div className="flex gap-3 items-center">
          <span className="w-7 h-7 rounded-full bg-[#1B1650] text-volt flex items-center justify-center font-display font-bold text-sm">
            3
          </span>
          <div>
            <h2 className="font-display font-bold text-lg text-snow m-0">Format & harga</h2>
            <p className="text-xs text-snow/70 m-0">Dipakai sebagai default tiap jadwal baru.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wider text-snow/65">Jumlah sesi</span>
            <input
              type="number"
              name="total_sessions"
              min="1"
              value={totalSessions}
              onChange={(e) => handleTotalSessionsChange(parseInt(e.target.value) || 1)}
              className="bg-snow/10 border-0 rounded-lg px-3 py-2.5 text-sm text-snow outline-none focus:ring-1 focus:ring-volt"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wider text-snow/65">Durasi / sesi</span>
            <select
              name="duration_per_session"
              defaultValue={classData?.duration_per_session || 90}
              className="bg-snow/10 border-0 rounded-lg px-3 py-2.5 text-sm text-snow outline-none cursor-pointer"
            >
              <option value="60" className="bg-[#17151F]">60 menit</option>
              <option value="90" className="bg-[#17151F]">90 menit</option>
              <option value="120" className="bg-[#17151F]">120 menit</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wider text-snow/65">Kapasitas</span>
            <input
              type="number"
              name="capacity"
              min="1"
              defaultValue={classData?.capacity || 4}
              className="bg-snow/10 border-0 rounded-lg px-3 py-2.5 text-sm text-snow outline-none focus:ring-1 focus:ring-volt"
            />
            <span className="text-[11px] text-snow/55">orang per jadwal</span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wider text-snow/65">Harga (Rp)</span>
            <input
              type="number"
              name="price"
              step="10000"
              defaultValue={classData?.price || 300000}
              className="bg-snow/10 border-0 rounded-lg px-3 py-2.5 text-sm text-snow outline-none focus:ring-1 focus:ring-volt"
            />
            <span className="text-[11px] text-snow/55">per orang</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wider text-snow/65">Coach default</span>
            <select
              name="default_coach_id"
              defaultValue={classData?.default_coach_id || ""}
              className="bg-snow/10 border-0 rounded-lg px-3 py-2.5 text-sm text-snow outline-none cursor-pointer"
            >
              <option value="" className="bg-[#17151F]">Pilih coach saat booking (private/opsional)</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#17151F]">
                  Coach {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wider text-snow/65">Minimal peserta</span>
            <input
              type="number"
              name="min_participants"
              defaultValue={classData?.min_participants || 2}
              className="bg-snow/10 border-0 rounded-lg px-3 py-2.5 text-sm text-snow outline-none focus:ring-1 focus:ring-volt"
            />
            <span className="text-[11px] text-snow/55">Di bawah ini jadwal bisa dibatalkan & refund</span>
          </label>
        </div>
      </section>

      {/* Section 4: Materi */}
      <section className="bg-[#221F30] rounded-2xl p-5 md:p-6 flex flex-col gap-4">
        <div className="flex gap-3 items-center">
          <span className="w-7 h-7 rounded-full bg-[#1B1650] text-volt flex items-center justify-center font-display font-bold text-sm">
            4
          </span>
          <div>
            <h2 className="font-display font-bold text-lg text-snow m-0">Materi</h2>
            <p className="text-xs text-snow/70 m-0">Isi "Yang kamu pelajari" & "Isi tiap sesi" di halaman publik.</p>
          </div>
        </div>

        {/* Yang dipelajari */}
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-snow/65">Yang dipelajari</span>
          <div className="flex flex-col gap-2">
            {learningPoints.map((point, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  name="learning_points"
                  value={point}
                  onChange={(e) => updatePoint(idx, e.target.value)}
                  placeholder="Misal: Baca pantulan kaca belakang..."
                  className="flex-1 bg-snow/10 border-0 rounded-lg px-3 py-2 text-sm text-snow outline-none focus:ring-1 focus:ring-volt"
                />
                <button
                  type="button"
                  onClick={() => removePoint(idx)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-snow/10 text-snow/60 hover:text-coral hover:bg-coral/10"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addPoint}
            className="self-start text-xs font-bold text-volt hover:underline mt-1 cursor-pointer"
          >
            + Tambah poin materi
          </button>
        </div>

        {/* Isi tiap sesi */}
        <div className="flex flex-col gap-2 pt-2 border-t border-snow/10">
          <div className="flex justify-between items-center">
            <span className="text-xs uppercase tracking-wider text-snow/65">
              Isi tiap sesi (Wajib {totalSessions} sesi)
            </span>
            <span className="text-xs text-volt font-bold">
              {sessionsBreakdown.length} dari {totalSessions} sesi
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {sessionsBreakdown.map((sb, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-snow/[0.02] p-2.5 rounded-xl">
                <span className="md:col-span-2 font-display font-bold text-sm text-snow">
                  Sesi {idx + 1}
                </span>
                <input
                  name="session_title"
                  value={sb.title}
                  required
                  onChange={(e) => updateSession(idx, "title", e.target.value)}
                  placeholder="Judul sesi..."
                  className="md:col-span-4 bg-snow/10 border-0 rounded-lg px-3 py-2 text-sm text-snow outline-none focus:ring-1 focus:ring-volt"
                />
                <input
                  name="session_desc"
                  value={sb.desc}
                  required
                  onChange={(e) => updateSession(idx, "desc", e.target.value)}
                  placeholder="Deskripsi drill..."
                  className="md:col-span-6 bg-snow/10 border-0 rounded-lg px-3 py-2 text-sm text-snow outline-none focus:ring-1 focus:ring-volt"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#221F30] p-4.5 rounded-2xl border border-snow/10">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="w-4.5 h-4.5 accent-volt"
          />
          <span className="text-sm font-semibold text-snow">
            Tampilkan di halaman Kelas publik
          </span>
        </label>

        <div className="flex gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => {
              setPublished(false);
              setTimeout(() => {
                const btn = document.getElementById("submit-btn");
                btn?.click();
              }, 50);
            }}
            disabled={isPending}
            className="btn px-4.5 py-2.5 rounded-lg bg-snow/12 hover:bg-snow/20 text-snow text-sm font-bold tracking-button"
          >
            Simpan draft
          </button>
          <button
            id="submit-btn"
            type="submit"
            disabled={isPending}
            className="btn btn-coral px-5 py-2.5 rounded-lg text-ink text-sm font-bold tracking-button whitespace-nowrap"
          >
            {isPending ? "Menyimpan..." : classData ? "Simpan perubahan" : "Simpan & aktifkan"}
          </button>
        </div>
      </div>
    </form>
  );
}
