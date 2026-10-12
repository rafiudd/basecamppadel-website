"use client";

import type { Venue } from "@/lib/database.types";

export function SessionDetailsEditor({
  title,
  sessionDate,
  status,
  venueId,
  venueName,
  selectedEventId,
  venues,
  events,
  onTitleChange,
  onSessionDateChange,
  onStatusChange,
  onVenueIdChange,
  onVenueNameChange,
  onEventSelect,
}: {
  title: string;
  sessionDate: string;
  status: "draft" | "active" | "finished";
  venueId: string;
  venueName: string;
  selectedEventId: string;
  venues: Venue[];
  events: Array<{ id: string; title: string; event_date?: string | null; venue_id?: string | null }>;
  onTitleChange: (v: string) => void;
  onSessionDateChange: (v: string) => void;
  onStatusChange: (v: "draft" | "active" | "finished") => void;
  onVenueIdChange: (v: string) => void;
  onVenueNameChange: (v: string) => void;
  onEventSelect: (v: string) => void;
}) {
  return (
    <div className="bg-[#221F30] rounded-2xl p-5 lg:p-6 border border-[#FBF7F1]/5 flex flex-col gap-4">
      <h2 className="font-display font-bold text-lg m-0 text-snow border-b border-[#FBF7F1]/10 pb-2">
        1. Detail Informasi Sesi
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block md:col-span-2">
          <span className="text-2xs uppercase tracking-wider text-[#FBF7F1]/70 block mb-1 font-semibold">
            Judul Sesi *
          </span>
          <input
            type="text"
            required
            placeholder="Contoh: Coaching Clinic · Weekend Beginner Class"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="w-full bg-[#FBF7F1]/10 border-0 rounded-lg px-3.5 py-2.5 text-[15px] text-snow focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
          />
        </label>

        <label className="block">
          <span className="text-2xs uppercase tracking-wider text-[#FBF7F1]/70 block mb-1 font-semibold">
            Tanggal Sesi *
          </span>
          <input
            type="date"
            required
            value={sessionDate}
            onChange={(e) => onSessionDateChange(e.target.value)}
            className="w-full bg-[#FBF7F1]/10 border-0 rounded-lg px-3.5 py-2.5 text-[15px] text-snow focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
          />
        </label>

        <label className="block">
          <span className="text-2xs uppercase tracking-wider text-[#FBF7F1]/70 block mb-1 font-semibold">
            Status Sesi
          </span>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as any)}
            className="w-full bg-[#FBF7F1]/10 border-0 rounded-lg px-3.5 py-2.5 text-[15px] text-snow appearance-auto focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
          >
            <option value="draft" className="bg-[#17151F]">Draft (Persiapan)</option>
            <option value="active" className="bg-[#17151F]">Aktif (Sedang Berjalan)</option>
            <option value="finished" className="bg-[#17151F]">Selesai</option>
          </select>
        </label>

        <label className="block">
          <span className="text-2xs uppercase tracking-wider text-[#FBF7F1]/70 block mb-1 font-semibold">
            Pilih Venue Terdaftar
          </span>
          <select
            value={venueId}
            onChange={(e) => {
              onVenueIdChange(e.target.value);
              const v = venues.find((x) => x.id === e.target.value);
              if (v) onVenueNameChange(v.name);
            }}
            className="w-full bg-[#FBF7F1]/10 border-0 rounded-lg px-3.5 py-2.5 text-[15px] text-snow appearance-auto focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
          >
            <option value="" className="bg-[#17151F]">Pilih Venue (Opsional)</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id} className="bg-[#17151F]">
                {v.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-2xs uppercase tracking-wider text-[#FBF7F1]/70 block mb-1 font-semibold">
            Nama Venue / Lapangan (Tampilan)
          </span>
          <input
            type="text"
            placeholder="Contoh: Padel Hubz Court 1 & 2"
            value={venueName}
            onChange={(e) => onVenueNameChange(e.target.value)}
            className="w-full bg-[#FBF7F1]/10 border-0 rounded-lg px-3.5 py-2.5 text-[15px] text-snow focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-2xs uppercase tracking-wider text-[#FBF7F1]/70 block mb-1 font-semibold">
            Hubungkan ke Event / Mabar (Opsional)
          </span>
          <select
            value={selectedEventId}
            onChange={(e) => onEventSelect(e.target.value)}
            className="w-full bg-[#FBF7F1]/10 border-0 rounded-lg px-3.5 py-2.5 text-[15px] text-snow appearance-auto focus:outline-none focus:ring-1 focus:ring-[#FFD43B]"
          >
            <option value="" className="bg-[#17151F]">Sesi Lepas (Tanpa Hubungan Event)</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id} className="bg-[#17151F]">
                {ev.title} {ev.event_date ? `· ${ev.event_date}` : ""}
              </option>
            ))}
          </select>
          <span className="text-2xs text-[#FBF7F1]/55 mt-1 block">
            Jika dihubungkan, pemain dari event mabar/kompetisi akan otomatis ditambahkan ke sesi.
          </span>
        </label>
      </div>
    </div>
  );
}
