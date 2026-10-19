"use client";

import { useState } from "react";
import Link from "next/link";
import {
  formatRupiah,
  PIN_COLORS,
  calculateRatingSummary,
  generateWhatsAppBookingUrl,
} from "@/lib/kelasRules";
import { bookClass, postClassComment } from "@/app/kelas/actions";

export function ClassDetailClient({ classData }: { classData: any }) {
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(
    classData.schedules[0]?.id || ""
  );

  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingName, setBookingName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentSent, setCommentSent] = useState(false);

  const [isPlayingVideo, setIsPlayingVideo] = useState(false);

  const ratingSummary = calculateRatingSummary(classData.reviews);

  const activeSchedule =
    classData.schedules.find((s: any) => s.id === selectedScheduleId) ||
    classData.schedules[0];

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingLoading(true);
    setBookingError(null);

    const fd = new FormData();
    fd.set("class_id", classData.id);
    fd.set("schedule_id", selectedScheduleId);
    fd.set("name", bookingName);
    fd.set("phone", bookingPhone);
    fd.set("slug", classData.slug);

    const res = await bookClass(null, fd);
    setBookingLoading(false);

    if (res?.error) {
      setBookingError(res.error);
    } else {
      setBookingSuccess(true);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const fd = new FormData();
    fd.set("class_id", classData.id);
    fd.set("author_name", commentName.trim() || "Pemain");
    fd.set("comment", commentText.trim());
    fd.set("slug", classData.slug);

    await postClassComment(null, fd);
    setCommentSent(true);
    setCommentText("");
  };

  return (
    <div className="flex flex-col">
      {/* Hero Header */}
      <section className="bg-[#1B1650] text-snow px-6 py-10 md:px-12 md:py-14 relative overflow-hidden">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 lg:gap-12 items-center">
          <div className="flex-1 flex flex-col gap-4">
            <Link
              href="/kelas"
              className="text-xs md:text-sm font-semibold text-snow/75 hover:text-volt no-underline self-start"
            >
              ← Semua kelas
            </Link>

            {/* Pin Badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-snow/15 text-xs font-bold text-snow">
                <span className="flex items-center gap-1">
                  {classData.suitablePins.map((pin: string) => (
                    <span
                      key={pin}
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{
                        background: PIN_COLORS[pin]?.bg || "#FFF",
                        border: PIN_COLORS[pin]?.border || "none",
                      }}
                    />
                  ))}
                </span>
                Cocok untuk pin {classData.suitablePins.join(" & ")}
              </span>
            </div>

            <h1 className="font-display font-bold text-3xl md:text-5xl text-snow m-0 leading-tight">
              {classData.title}
            </h1>

            <p className="text-sm md:text-base text-snow/80 m-0 leading-relaxed max-w-xl">
              {classData.description}
            </p>

            <div className="flex items-center gap-4 text-xs md:text-sm text-snow/90 pt-1 flex-wrap">
              <span className="flex items-center gap-1 font-bold text-snow">
                <span className="text-amber-400">★</span> {classData.averageRating}
                <span className="font-normal text-snow/70">({classData.totalReviews} ulasan)</span>
              </span>
              <span>·</span>
              <span>
                <b className="text-volt">{classData.totalParticipants} orang</b> udah ikut kelas ini
              </span>
            </div>

            {/* Spec summary pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-snow/10">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-snow/60 block">Durasi</span>
                <span className="font-bold text-sm text-snow block mt-0.5">
                  {classData.totalSessions} sesi × {classData.durationPerSession} menit
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-snow/60 block">Peserta</span>
                <span className="font-bold text-sm text-snow block mt-0.5">
                  Maks {classData.capacity} orang
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-snow/60 block">Coach</span>
                <span className="font-bold text-sm text-snow block mt-0.5">
                  {classData.coachName ? `Coach ${classData.coachName}` : "Pilih coach"}
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-snow/60 block">Venue</span>
                <span className="font-bold text-sm text-snow block mt-0.5">
                  {classData.schedules[0]?.venueName || "East Padel House"}
                </span>
              </div>
            </div>
          </div>

          {/* Media Player Box */}
          <div className="w-full md:w-96 lg:w-[440px] flex-none flex flex-col gap-2.5">
            <div className="relative aspect-video rounded-2xl bg-gradient-to-br from-[#2557D6] to-[#1B1650] overflow-hidden shadow-2xl flex items-center justify-center">
              {isPlayingVideo ? (
                <div className="w-full h-full flex items-center justify-center bg-black">
                  <iframe
                    className="w-full h-full"
                    src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1"
                    title="Video Preview"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPlayingVideo(true)}
                  className="w-full h-full flex flex-col items-center justify-center cursor-pointer group"
                >
                  <span className="w-16 h-16 rounded-full bg-coral flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-ink ml-1" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="7,4 20,12 7,20" />
                    </svg>
                  </span>
                  <span className="absolute left-3 bottom-3 inline-flex items-center gap-1.5 bg-white/95 text-ink text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    Video preview kelas
                  </span>
                  <span className="absolute right-3 bottom-3 bg-ink/80 text-snow text-xs font-bold px-2 py-0.5 rounded">
                    1:20
                  </span>
                </button>
              )}
            </div>

            {/* Gallery Thumbnails */}
            <div className="grid grid-cols-3 gap-2">
              <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center text-[11px] font-bold text-snow/90">
                Foto 1
              </div>
              <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-emerald-600 to-indigo-900 flex items-center justify-center text-[11px] font-bold text-snow/90">
                Foto 2
              </div>
              <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-amber-600 to-indigo-900 flex items-center justify-center text-[11px] font-bold text-snow/90">
                Foto 3
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content & Sticky Booking */}
      <main className="max-w-6xl w-full mx-auto px-4 md:px-12 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (8 Cols): Syllabus & Content */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Yang Kamu Pelajari */}
            <section className="bg-white border border-ink/10 rounded-2xl p-6 md:p-8 flex flex-col gap-4 shadow-sm">
              <h2 className="font-display font-bold text-xl md:text-2xl text-ink m-0">
                Yang kamu pelajari
              </h2>
              <div className="flex flex-col gap-3">
                {classData.learningPoints.map((point: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-emerald-600 flex-none mt-0.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-sm md:text-base text-ink leading-relaxed">
                      {point}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Coach Kamu */}
            <section className="bg-white border border-ink/10 rounded-2xl p-6 md:p-8 flex flex-col gap-4 shadow-sm">
              <h2 className="font-display font-bold text-xl md:text-2xl text-ink m-0">
                Coach kamu
              </h2>
              <div className="flex items-center gap-4">
                <span className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-600 to-[#1B1650] text-snow font-display font-bold text-2xl flex items-center justify-center shadow">
                  {classData.coachName ? classData.coachName.charAt(0) : "C"}
                </span>
                <div>
                  <h3 className="font-display font-bold text-lg text-ink m-0">
                    {classData.coachName ? `Coach ${classData.coachName}` : "Head Coach"}
                  </h3>
                  <p className="text-xs md:text-sm text-ink/70 m-0 mt-1">
                    Pelatih tersertifikasi dengan pengalaman membina pemain dari level dasar hingga kompetisi turnamen.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap text-xs font-semibold pt-1">
                <span className="px-3 py-1 rounded-full bg-ink/5 text-ink">
                  Spesialis teknik & defense
                </span>
                <span className="px-3 py-1 rounded-full bg-ink/5 text-ink">
                  Bahasa: Indonesia
                </span>
              </div>
            </section>

            {/* Isi Tiap Sesi */}
            <section className="bg-white border border-ink/10 rounded-2xl p-6 md:p-8 flex flex-col gap-4 shadow-sm">
              <h2 className="font-display font-bold text-xl md:text-2xl text-ink m-0">
                Isi tiap sesi
              </h2>
              <div className="flex flex-col divide-y divide-ink/10">
                {classData.sessionsBreakdown.map((sb: any) => (
                  <div key={sb.session} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                    <span className="w-16 flex-none font-display font-bold text-sm text-[#1B1650]">
                      Sesi {sb.session}
                    </span>
                    <div className="flex flex-col gap-1">
                      <h4 className="font-bold text-sm md:text-base text-ink m-0">
                        {sb.title}
                      </h4>
                      <p className="text-xs md:text-sm text-ink/70 m-0 leading-relaxed">
                        {sb.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Yang Perlu Dibawa */}
            <section className="bg-white border border-ink/10 rounded-2xl p-6 md:p-8 flex flex-col gap-3 shadow-sm">
              <h2 className="font-display font-bold text-xl md:text-2xl text-ink m-0">
                Yang perlu dibawa
              </h2>
              <ul className="m-0 pl-5 text-xs md:text-sm text-ink/80 leading-loose">
                {classData.requirements.map((req: string, idx: number) => (
                  <li key={idx}>{req}</li>
                ))}
              </ul>
            </section>

            {/* Ulasan Peserta */}
            <section className="bg-white border border-ink/10 rounded-2xl p-6 md:p-8 flex flex-col gap-5 shadow-sm">
              <div className="flex justify-between items-baseline flex-wrap gap-2">
                <h2 className="font-display font-bold text-xl md:text-2xl text-ink m-0">
                  Ulasan peserta
                </h2>
                <span className="text-xs text-ink/60">
                  Cuma peserta yang udah ikut kelas bisa kasih ulasan
                </span>
              </div>

              {/* Rating summary & histogram */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10 pb-4 border-b border-ink/10">
                <div className="flex flex-col gap-1">
                  <div className="font-display font-bold text-4xl md:text-5xl text-ink leading-none">
                    {classData.averageRating}
                  </div>
                  <div className="text-amber-500 text-sm">★★★★★</div>
                  <div className="text-xs text-ink/60 mt-1">
                    {classData.totalReviews} ulasan · {classData.totalParticipants} alumni
                  </div>
                </div>

                <div className="flex-1 w-full flex flex-col gap-1.5 text-xs text-ink/65">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="flex items-center gap-2.5">
                      <span className="w-3 text-right">{star}</span>
                      <div className="flex-1 h-2 rounded-full bg-ink/10 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${ratingSummary.percentages[star] || 0}%` }}
                        />
                      </div>
                      <span className="w-6 text-right font-medium">
                        {ratingSummary.counts[star] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews List */}
              <div className="flex flex-col divide-y divide-ink/10">
                {classData.reviews.map((r: any) => (
                  <div key={r.id} className="py-4 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-ink/10 text-ink font-bold flex items-center justify-center">
                          {r.authorName.charAt(0)}
                        </span>
                        <b className="text-ink">{r.authorName}</b>
                      </div>
                      <span className="text-amber-500">{"★".repeat(r.rating)}</span>
                    </div>
                    <p className="text-xs md:text-sm text-ink/85 m-0 leading-relaxed pl-9">
                      {r.content}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Tanya & Komentar */}
            <section className="bg-white border border-ink/10 rounded-2xl p-6 md:p-8 flex flex-col gap-5 shadow-sm">
              <div className="flex justify-between items-baseline">
                <h2 className="font-display font-bold text-xl md:text-2xl text-ink m-0">
                  Tanya & komentar
                </h2>
                <span className="text-xs text-ink/60">{classData.comments.length} komentar</span>
              </div>

              {/* Submit comment form */}
              <form onSubmit={handleComment} className="flex flex-col gap-2.5 bg-ink/[0.02] p-4 rounded-xl border border-ink/10">
                {commentSent ? (
                  <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-lg font-medium">
                    ✓ Pertanyaan kamu sudah terkirim! Coach kami akan segera membalas di sini.
                  </div>
                ) : (
                  <>
                    <input
                      placeholder="Nama kamu..."
                      value={commentName}
                      onChange={(e) => setCommentName(e.target.value)}
                      className="bg-white border border-ink/15 rounded-lg px-3 py-2 text-xs text-ink outline-none"
                    />
                    <textarea
                      rows={2}
                      placeholder="Tulis pertanyaan atau komentar seputar kelas ini..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="bg-white border border-ink/15 rounded-lg px-3 py-2 text-xs text-ink outline-none resize-y"
                    />
                    <button
                      type="submit"
                      className="btn btn-coral px-4 py-2 rounded-full text-xs font-bold text-ink self-end tracking-button"
                    >
                      Kirim pertanyaan
                    </button>
                  </>
                )}
              </form>

              {/* Comments Thread */}
              <div className="flex flex-col divide-y divide-ink/10">
                {classData.comments.map((cm: any) => (
                  <div key={cm.id} className="py-4 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-full bg-ink/10 text-ink font-bold text-xs flex items-center justify-center flex-none">
                        {cm.authorName.charAt(0)}
                      </span>
                      <div className="flex flex-col gap-1">
                        <b className="text-xs text-ink">{cm.authorName}</b>
                        <p className="text-xs md:text-sm text-ink/85 m-0 leading-relaxed">
                          {cm.comment}
                        </p>
                      </div>
                    </div>

                    {/* Replies */}
                    {cm.replies.map((rp: any) => (
                      <div
                        key={rp.id}
                        className="ml-10 p-3 rounded-xl bg-ink/5 border-l-2 border-[#1B1650] flex gap-2.5 items-start"
                      >
                        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-600 to-[#1B1650] text-snow text-[10px] font-bold flex items-center justify-center flex-none">
                          L
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-xs">
                            <b className="text-ink">{rp.authorName}</b>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#1B1650] text-volt">
                              Coach
                            </span>
                          </div>
                          <p className="text-xs text-ink/80 m-0 leading-relaxed">{rp.comment}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column (4 Cols): Sticky Booking Card */}
          <aside className="lg:col-span-4 sticky top-6 flex flex-col gap-4">
            <div className="bg-white border border-ink/10 rounded-2xl p-6 flex flex-col gap-5 shadow-lg">
              <div className="flex justify-between items-baseline gap-2">
                <h3 className="font-display font-bold text-xl text-ink m-0">Daftar kelas</h3>
                <span className="font-display font-bold text-2xl text-[#1B1650]">
                  {formatRupiah(classData.price)}
                </span>
              </div>

              <div className="text-xs text-ink/65 -mt-2">
                {classData.totalParticipants} orang udah ikut · per orang · {classData.totalSessions} sesi × {classData.durationPerSession} menit
              </div>

              {/* Schedule Radio Selection */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold tracking-wider uppercase text-ink/60">
                  Pilih jadwal
                </span>

                <div className="flex flex-col gap-2">
                  {classData.schedules.map((s: any) => {
                    const isSelected = s.id === selectedScheduleId;
                    const isFull = s.status === "full";
                    const rem = Math.max(0, s.capacity - s.registeredCount);

                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isFull
                            ? "opacity-60 bg-ink/5 border-ink/10 cursor-not-allowed"
                            : isSelected
                            ? "border-[#1B1650] bg-[#1B1650]/5 shadow-sm"
                            : "border-ink/15 hover:border-ink/30 bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="slot"
                          disabled={isFull}
                          checked={isSelected}
                          onChange={() => setSelectedScheduleId(s.id)}
                          className="w-4 h-4 accent-[#1B1650]"
                        />
                        <div className="flex-1">
                          <div className="font-bold text-sm text-ink">{s.datesLabel}</div>
                          <div className="text-xs text-ink/65 mt-0.5">{s.timeRange}</div>
                        </div>
                        <span
                          className={`text-xs font-bold whitespace-nowrap ${
                            isFull ? "text-ink/40" : rem <= 2 ? "text-coral" : "text-emerald-700"
                          }`}
                        >
                          {isFull ? "Penuh" : `${rem} slot tersisa`}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Booking Form */}
              {bookingSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col gap-2 text-center">
                  <div className="text-emerald-800 font-bold text-sm">
                    ✓ Pendaftaran Berhasil!
                  </div>
                  <p className="text-xs text-emerald-700 m-0">
                    Tim Basecamp Padel akan segera mengirimkan konfirmasi dan instruksi pembayaran ke WhatsApp kamu ({bookingPhone}).
                  </p>
                </div>
              ) : (
                <form onSubmit={handleBooking} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <input
                      required
                      placeholder="Nama lengkap..."
                      value={bookingName}
                      onChange={(e) => setBookingName(e.target.value)}
                      className="bg-ink/5 border border-ink/15 rounded-xl px-3.5 py-2.5 text-xs text-ink outline-none focus:border-ink"
                    />
                    <input
                      required
                      type="tel"
                      placeholder="Nomor WhatsApp (mis. 08123456789)..."
                      value={bookingPhone}
                      onChange={(e) => setBookingPhone(e.target.value)}
                      className="bg-ink/5 border border-ink/15 rounded-xl px-3.5 py-2.5 text-xs text-ink outline-none focus:border-ink"
                    />
                  </div>

                  {bookingError && (
                    <div className="text-xs text-coral font-medium">{bookingError}</div>
                  )}

                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className="btn btn-coral py-3.5 rounded-full text-ink font-bold text-sm tracking-button shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform text-center cursor-pointer"
                  >
                    {bookingLoading ? "Memproses..." : "Daftar & bayar"}
                  </button>

                  <a
                    href={generateWhatsAppBookingUrl(
                      "628123456789",
                      classData.title,
                      activeSchedule?.datesLabel
                    )}
                    target="_blank"
                    rel="noopener"
                    className="text-center text-xs font-bold text-[#1B1650] hover:underline py-1 no-underline"
                  >
                    Tanya dulu via WhatsApp
                  </a>
                </form>
              )}

              <div className="text-[11px] text-ink/60 leading-normal border-t border-ink/10 pt-3">
                Kelas jalan minimal 2 peserta. Kalau kurang, kamu bisa pindah jadwal atau refund penuh.
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
